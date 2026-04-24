import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  SecurityEvent,
  SecurityEventType,
  SeverityLevel,
} from '../entities/security-event.entity';
import { AnomalyDetectorService } from '../detectors/anomaly.detector';
import { FraudDetectorService } from '../detectors/fraud.detector';

@Injectable()
export class SecurityMonitorService {
  private readonly logger = new Logger(SecurityMonitorService.name);

  constructor(
    @InjectRepository(SecurityEvent)
    private readonly securityEventRepo: Repository<SecurityEvent>,
    private readonly anomalyDetector: AnomalyDetectorService,
    private readonly fraudDetector: FraudDetectorService,
  ) {}

  async monitorTransaction(transactionData: any): Promise<void> {
    try {
      // Check for anomalies
      const anomalies =
        await this.anomalyDetector.detectAnomalies(transactionData);
      if (anomalies.length > 0) {
        await this.createSecurityEvent({
          eventType: SecurityEventType.ANOMALY_DETECTED,
          severity: anomalies[0].severity,
          description: `Anomaly detected: ${anomalies[0].type}`,
          metadata: { anomalies, transactionData },
          walletAddress: transactionData.walletAddress,
          transactionHash: transactionData.hash,
        });
      }

      // Check for fraud patterns
      const fraudIndicators =
        await this.fraudDetector.analyzeTransaction(transactionData);
      if (fraudIndicators.isSuspicious) {
        await this.createSecurityEvent({
          eventType: SecurityEventType.FRAUD_SUSPECTED,
          severity: fraudIndicators.severity,
          description: `Fraud pattern detected: ${fraudIndicators.patterns.join(', ')}`,
          metadata: { fraudIndicators, transactionData },
          walletAddress: transactionData.walletAddress,
          transactionHash: transactionData.hash,
        });
      }

      // Check for wash trading
      const washTradingResult =
        await this.fraudDetector.detectWashTrading(transactionData);
      if (washTradingResult.isWashTrading) {
        await this.createSecurityEvent({
          eventType: SecurityEventType.WASH_TRADING,
          severity: SeverityLevel.HIGH,
          description: 'Potential wash trading detected',
          metadata: { washTradingResult, transactionData },
          walletAddress: transactionData.walletAddress,
          transactionHash: transactionData.hash,
        });
      }
    } catch (error) {
      this.logger.error('Error monitoring transaction', error);
    }
  }

  async createSecurityEvent(
    eventData: Partial<SecurityEvent>,
  ): Promise<SecurityEvent> {
    const event = this.securityEventRepo.create(eventData);
    const saved = await this.securityEventRepo.save(event);

    this.logger.log(
      `Security event created: ${eventData.eventType} - ${eventData.description}`,
    );

    // Trigger alerts for high/critical severity
    if (
      [SeverityLevel.HIGH, SeverityLevel.CRITICAL].includes(eventData.severity)
    ) {
      await this.triggerAlert(saved);
    }

    return saved;
  }

  async triggerAlert(event: SecurityEvent): Promise<void> {
    // This will be handled by the SecurityAlertService
    this.logger.warn(
      `ALERT TRIGGERED: ${event.eventType} - ${event.description}`,
    );
    // In production, this would send to notification systems, webhooks, etc.
  }

  async getRecentEvents(limit: number = 50): Promise<SecurityEvent[]> {
    return this.securityEventRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getUnresolvedEvents(): Promise<SecurityEvent[]> {
    return this.securityEventRepo.find({
      where: { isResolved: false },
      order: { createdAt: 'DESC' },
    });
  }

  async resolveEvent(
    eventId: string,
    resolvedBy: string,
  ): Promise<SecurityEvent> {
    const event = await this.securityEventRepo.findOne({
      where: { id: eventId },
    });
    if (!event) {
      throw new Error('Security event not found');
    }

    event.isResolved = true;
    event.resolvedAt = new Date();
    event.resolvedBy = resolvedBy;

    return this.securityEventRepo.save(event);
  }

  async markAsFalsePositive(eventId: string): Promise<void> {
    const event = await this.securityEventRepo.findOne({
      where: { id: eventId },
    });
    if (event) {
      event.falsePositiveCount += 1;
      await this.securityEventRepo.save(event);
    }
  }

  async markAsTruePositive(eventId: string): Promise<void> {
    const event = await this.securityEventRepo.findOne({
      where: { id: eventId },
    });
    if (event) {
      event.truePositiveCount += 1;
      await this.securityEventRepo.save(event);
    }
  }

  async getSecurityMetrics(timeRange: {
    start: Date;
    end: Date;
  }): Promise<any> {
    const queryBuilder = this.securityEventRepo.createQueryBuilder('event');
    queryBuilder.where('event.createdAt BETWEEN :start AND :end', {
      start: timeRange.start,
      end: timeRange.end,
    });

    const events = await queryBuilder.getMany();

    return {
      totalEvents: events.length,
      byType: this.groupByEventType(events),
      bySeverity: this.groupBySeverity(events),
      unresolvedCount: events.filter((e) => !e.isResolved).length,
      averageConfidenceScore:
        events.reduce((acc, e) => acc + e.getConfidenceScore(), 0) /
          events.length || 0,
    };
  }

  private groupByEventType(events: SecurityEvent[]): Record<string, number> {
    return events.reduce(
      (acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupBySeverity(events: SecurityEvent[]): Record<string, number> {
    return events.reduce(
      (acc, event) => {
        acc[event.severity] = (acc[event.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }
}

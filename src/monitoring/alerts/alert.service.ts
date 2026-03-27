import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionStatusEntity, TransactionStatus, TransactionPriority } from '../entities/transaction-status.entity';

export interface AlertChannel {
  name: string;
  send(alert: Alert): Promise<void>;
  isEnabled(): boolean;
}

export interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  transactionHash: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class EmailAlertChannel implements AlertChannel {
  name = 'email';
  
  isEnabled(): boolean {
    return process.env.ALERT_EMAIL_ENABLED === 'true';
  }

  async send(alert: Alert): Promise<void> {
    if (!this.isEnabled()) return;
    
    this.logger.log(`Email alert sent: ${alert.message}`);
  }
}

export class SlackAlertChannel implements AlertChannel {
  name = 'slack';
  
  isEnabled(): boolean {
    return process.env.ALERT_SLACK_ENABLED === 'true';
  }

  async send(alert: Alert): Promise<void> {
    if (!this.isEnabled()) return;
    
    this.logger.log(`Slack alert sent: ${alert.message}`);
  }
}

export class WebhookAlertChannel implements AlertChannel {
  name = 'webhook';
  
  isEnabled(): boolean {
    return process.env.ALERT_WEBHOOK_ENABLED === 'true';
  }

  async send(alert: Alert): Promise<void> {
    if (!this.isEnabled()) return;
    
    this.logger.log(`Webhook alert sent: ${alert.message}`);
  }
}

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  private readonly channels: Map<string, AlertChannel> = new Map();
  private readonly alertHistory = new Map<string, Alert[]>();
  private readonly rateLimiter = new Map<string, number>();

  constructor(
    @InjectRepository(TransactionStatusEntity)
    private readonly transactionStatusRepository: Repository<TransactionStatusEntity>,
  ) {
    this.channels.set('email', new EmailAlertChannel());
    this.channels.set('slack', new SlackAlertChannel());
    this.channels.set('webhook', new WebhookAlertChannel());
  }

  async sendStatusChangeAlert(
    transaction: TransactionStatusEntity,
    oldStatus: TransactionStatus,
    newStatus: TransactionStatus,
  ): Promise<void> {
    const severity = this.getAlertSeverity(newStatus, transaction.priority);
    const message = `Transaction ${transaction.transactionHash} status changed from ${oldStatus} to ${newStatus}`;

    const alert: Alert = {
      type: 'status_change',
      severity,
      message,
      transactionHash: transaction.transactionHash,
      metadata: {
        oldStatus,
        newStatus,
        priority: transaction.priority,
        retryCount: transaction.retryCount,
      },
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
    await this.recordAlert(transaction, alert);
  }

  async sendCriticalAlert(message: string, metadata?: Record<string, any>): Promise<void> {
    const alert: Alert = {
      type: 'critical',
      severity: 'critical',
      message,
      transactionHash: metadata?.transactionHash || 'system',
      metadata,
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
  }

  async sendFailureAlert(
    transaction: TransactionStatusEntity,
    errorMessage: string,
  ): Promise<void> {
    const severity = transaction.priority === TransactionPriority.CRITICAL ? 'critical' : 'high';
    const message = `Transaction ${transaction.transactionHash} failed: ${errorMessage}`;

    const alert: Alert = {
      type: 'failure',
      severity,
      message,
      transactionHash: transaction.transactionHash,
      metadata: {
        errorMessage,
        retryCount: transaction.retryCount,
        maxRetries: transaction.maxRetries,
        priority: transaction.priority,
      },
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
    await this.recordAlert(transaction, alert);
  }

  async sendTimeoutAlert(transaction: TransactionStatusEntity): Promise<void> {
    const severity = transaction.priority === TransactionPriority.CRITICAL ? 'critical' : 'high';
    const message = `Transaction ${transaction.transactionHash} timed out after 5 minutes`;

    const alert: Alert = {
      type: 'timeout',
      severity,
      message,
      transactionHash: transaction.transactionHash,
      metadata: {
        timeoutDuration: 300000,
        priority: transaction.priority,
      },
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
    await this.recordAlert(transaction, alert);
  }

  async sendRetryAlert(transaction: TransactionStatusEntity, attempt: number): Promise<void> {
    const message = `Retrying transaction ${transaction.transactionHash} (attempt ${attempt}/${transaction.maxRetries})`;

    const alert: Alert = {
      type: 'retry',
      severity: 'medium',
      message,
      transactionHash: transaction.transactionHash,
      metadata: {
        attempt,
        maxRetries: transaction.maxRetries,
        priority: transaction.priority,
      },
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
    await this.recordAlert(transaction, alert);
  }

  async sendPerformanceAlert(
    metric: string,
    value: number,
    threshold: number,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const message = `Performance alert: ${metric} is ${value} (threshold: ${threshold})`;

    const alert: Alert = {
      type: 'performance',
      severity: value > threshold * 1.5 ? 'critical' : 'high',
      message,
      transactionHash: 'system',
      metadata: {
        metric,
        value,
        threshold,
        ...metadata,
      },
      timestamp: new Date(),
    };

    await this.sendAlert(alert);
  }

  private async sendAlert(alert: Alert): Promise<void> {
    if (this.isRateLimited(alert.type)) {
      this.logger.warn(`Alert type ${alert.type} is rate limited`);
      return;
    }

    const enabledChannels = Array.from(this.channels.values()).filter(channel => 
      channel.isEnabled() && this.shouldSendToChannel(alert.severity, channel.name)
    );

    const promises = enabledChannels.map(channel => 
      channel.send(alert).catch(error => 
        this.logger.error(`Failed to send alert via ${channel.name}:`, error)
      )
    );

    await Promise.allSettled(promises);
    
    this.updateRateLimiter(alert.type);
    this.logger.log(`Alert sent: ${alert.message} (${alert.severity})`);
  }

  private async recordAlert(
    transaction: TransactionStatusEntity,
    alert: Alert,
  ): Promise<void> {
    const alerts = this.alertHistory.get(transaction.transactionHash) || [];
    alerts.push(alert);
    
    if (alerts.length > 100) {
      alerts.shift();
    }
    
    this.alertHistory.set(transaction.transactionHash, alerts);

    const entityAlerts = transaction.alerts || [];
    entityAlerts.push({
      type: alert.type,
      message: alert.message,
      severity: alert.severity,
      sentAt: alert.timestamp,
    });

    await this.transactionStatusRepository.update(
      { transactionHash: transaction.transactionHash },
      { alerts: entityAlerts }
    );
  }

  private getAlertSeverity(
    status: TransactionStatus,
    priority: TransactionPriority,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (status === TransactionStatus.FAILED || status === TransactionStatus.TIMEOUT) {
      return priority === TransactionPriority.CRITICAL ? 'critical' : 'high';
    }
    
    if (status === TransactionStatus.RETRYING) {
      return priority === TransactionPriority.CRITICAL ? 'high' : 'medium';
    }
    
    return 'low';
  }

  private shouldSendToChannel(severity: string, channelName: string): boolean {
    const channelThresholds: Record<string, string[]> = {
      email: ['medium', 'high', 'critical'],
      slack: ['high', 'critical'],
      webhook: ['critical'],
    };

    const threshold = channelThresholds[channelName] || ['critical'];
    return threshold.includes(severity);
  }

  private isRateLimited(alertType: string): boolean {
    const now = Date.now();
    const lastSent = this.rateLimiter.get(alertType) || 0;
    const rateLimitWindow = 60000;

    return now - lastSent < rateLimitWindow;
  }

  private updateRateLimiter(alertType: string): void {
    this.rateLimiter.set(alertType, Date.now());
  }

  async getAlertHistory(transactionHash: string): Promise<Alert[]> {
    return this.alertHistory.get(transactionHash) || [];
  }

  async getSystemAlerts(limit: number = 100): Promise<Alert[]> {
    const allAlerts: Alert[] = [];
    
    for (const alerts of this.alertHistory.values()) {
      allAlerts.push(...alerts);
    }

    return allAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getAlertStats(): {
    totalAlerts: number;
    alertsByType: Record<string, number>;
    alertsBySeverity: Record<string, number>;
    rateLimitedTypes: string[];
  } {
    const allAlerts: Alert[] = [];
    
    for (const alerts of this.alertHistory.values()) {
      allAlerts.push(...alerts);
    }

    const alertsByType = allAlerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsBySeverity = allAlerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAlerts: allAlerts.length,
      alertsByType,
      alertsBySeverity,
      rateLimitedTypes: Array.from(this.rateLimiter.keys()),
    };
  }

  registerAlertChannel(channel: AlertChannel): void {
    this.channels.set(channel.name, channel);
    this.logger.log(`Registered alert channel: ${channel.name}`);
  }

  async testAlertChannels(): Promise<Record<string, boolean>> {
    const testAlert: Alert = {
      type: 'test',
      severity: 'low',
      message: 'Test alert from monitoring system',
      transactionHash: 'test',
      timestamp: new Date(),
    };

    const results: Record<string, boolean> = {};

    for (const [name, channel] of this.channels) {
      if (channel.isEnabled()) {
        try {
          await channel.send(testAlert);
          results[name] = true;
        } catch (error) {
          results[name] = false;
          this.logger.error(`Test failed for channel ${name}:`, error);
        }
      } else {
        results[name] = false;
      }
    }

    return results;
  }
}

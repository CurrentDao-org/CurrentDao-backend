import { Injectable, Logger } from '@nestjs/common';

export interface ComplianceAlert {
  transactionId: string;
  jurisdiction: string;
  reason: string;
  timestamp: string;
}

@Injectable()
export class ComplianceMonitorService {
  private readonly logger = new Logger(ComplianceMonitorService.name);
  private readonly alerts: ComplianceAlert[] = [];

  reportIssue(alert: Omit<ComplianceAlert, 'timestamp'>): void {
    const record = { ...alert, timestamp: new Date().toISOString() };
    this.alerts.push(record);
    this.logger.warn(`Compliance issue reported for ${alert.jurisdiction}: ${alert.reason}`);
  }

  getCurrentAlerts(): ComplianceAlert[] {
    return [...this.alerts].slice(-20);
  }

  detectIssuePatterns(): { jurisdiction: string; frequency: number }[] {
    const frequencyMap: Record<string, number> = {};
    this.alerts.forEach((alert) => {
      frequencyMap[alert.jurisdiction] = (frequencyMap[alert.jurisdiction] || 0) + 1;
    });
    return Object.entries(frequencyMap)
      .map(([jurisdiction, frequency]) => ({ jurisdiction, frequency }))
      .sort((a, b) => b.frequency - a.frequency);
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ComplianceAlert {
  id: string;
  transactionId: string;
  userId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  jurisdiction: string;
  ruleId: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface MonitoringStatus {
  active: boolean;
  startTime?: Date;
  totalChecks: number;
  totalAlerts: number;
  activeAlerts: number;
  lastCheck: Date;
  averageResponseTime: number;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  jurisdiction: string;
  riskLevel: string;
  parameters: Record<string, any>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ComplianceMonitorService implements OnModuleInit {
  private readonly logger = new Logger(ComplianceMonitorService.name);
  private readonly alerts: ComplianceAlert[] = [];
  private readonly rules = new Map<string, ComplianceRule>();
  private monitoringActive = false;
  private monitoringStartTime?: Date;
  private totalChecks = 0;
  private totalAlerts = 0;
  private averageResponseTime = 0;

  async onModuleInit() {
    this.logger.log('Compliance Monitor Service initialized');
  }

  async start(config?: any): Promise<void> {
    this.monitoringActive = true;
    this.monitoringStartTime = new Date();
    this.logger.log('Compliance monitoring started');
  }

  async stop(): Promise<void> {
    this.monitoringActive = false;
    this.logger.log('Compliance monitoring stopped');
  }

  async addRule(rule: ComplianceRule): Promise<void> {
    this.rules.set(rule.id, rule);
    this.logger.log(`Added compliance rule: ${rule.name}`);
  }

  async removeRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
    this.logger.log(`Removed compliance rule: ${ruleId}`);
  }

  async updateRule(rule: ComplianceRule): Promise<void> {
    this.rules.set(rule.id, rule);
    this.logger.log(`Updated compliance rule: ${rule.name}`);
  }

  async performScheduledChecks(): Promise<void> {
    if (!this.monitoringActive) return;

    try {
      // This would typically check all pending transactions
      this.totalChecks++;
      this.logger.debug(`Performed scheduled check #${this.totalChecks}`);
    } catch (error) {
      this.logger.error('Error in scheduled compliance check:', error);
    }
  }

  createAlert(alertData: Omit<ComplianceAlert, 'id' | 'timestamp' | 'resolved'>): ComplianceAlert {
    const alert: ComplianceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.alerts.push(alert);
    this.totalAlerts++;

    this.logger.warn(`Compliance alert created: ${alert.message}`);
    return alert;
  }

  async getAlerts(query: any): Promise<ComplianceAlert[]> {
    let filteredAlerts = [...this.alerts];

    if (query.severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === query.severity);
    }

    if (query.status === 'resolved') {
      filteredAlerts = filteredAlerts.filter(alert => alert.resolved);
    } else if (query.status === 'unresolved') {
      filteredAlerts = filteredAlerts.filter(alert => !alert.resolved);
    }

    if (query.jurisdiction) {
      filteredAlerts = filteredAlerts.filter(alert => alert.jurisdiction === query.jurisdiction);
    }

    if (query.type) {
      filteredAlerts = filteredAlerts.filter(alert => alert.type === query.type);
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return filteredAlerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  async getStatus(): Promise<MonitoringStatus> {
    return {
      active: this.monitoringActive,
      startTime: this.monitoringStartTime,
      totalChecks: this.totalChecks,
      totalAlerts: this.totalAlerts,
      activeAlerts: this.alerts.filter(alert => !alert.resolved).length,
      lastCheck: new Date(),
      averageResponseTime: this.averageResponseTime,
    };
  }

  async getAuditTrail(query: any): Promise<any[]> {
    // This would typically query a database for audit logs
    return [];
  }

  async getMetrics(): Promise<any> {
    const alertsBySeverity = this.alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsByJurisdiction = this.alerts.reduce((acc, alert) => {
      acc[alert.jurisdiction] = (acc[alert.jurisdiction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const alertsByType = this.alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAlerts: this.totalAlerts,
      activeAlerts: this.alerts.filter(alert => !alert.resolved).length,
      resolvedAlerts: this.alerts.filter(alert => alert.resolved).length,
      alertsBySeverity,
      alertsByJurisdiction,
      alertsByType,
      averageResolutionTime: this.calculateAverageResolutionTime(),
      monitoringUptime: this.calculateMonitoringUptime(),
    };
  }

  private calculateAverageResolutionTime(): number {
    const resolvedAlerts = this.alerts.filter(alert => alert.resolved && alert.resolvedAt);
    if (resolvedAlerts.length === 0) return 0;

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      return sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime());
    }, 0);

    return totalTime / resolvedAlerts.length / (1000 * 60); // minutes
  }

  private calculateMonitoringUptime(): number {
    if (!this.monitoringStartTime) return 0;
    return (Date.now() - this.monitoringStartTime.getTime()) / (1000 * 60 * 60); // hours
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async cleanupOldAlerts(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const oldAlertsCount = this.alerts.length;

      // Keep only alerts from the last 30 days
      this.alerts.splice(0, this.alerts.length, ...this.alerts.filter(alert => alert.timestamp > thirtyDaysAgo));

      const cleanedCount = oldAlertsCount - this.alerts.length;
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old compliance alerts`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old alerts:', error);
    }
  }

  reportIssue(alert: Omit<ComplianceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    this.createAlert(alert);
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

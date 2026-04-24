import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface IntegrationHealth {
  provider: string;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  details: {
    responseTime: number;
    statusCode: number;
    error?: string;
    lastCheck: Date;
  };
  metrics: {
    uptime: number;
    errorRate: number;
    averageResponseTime: number;
    requestCount: number;
    successCount: number;
    failureCount: number;
  };
}

export interface IntegrationAlert {
  id: string;
  provider: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface IntegrationMetrics {
  provider: string;
  timestamp: Date;
  metrics: {
    requestCount: number;
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    errorRate: number;
    throughput: number;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  interval: number;
  alertThresholds: {
    errorRate: number;
    responseTime: number;
    failureCount: number;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    sms: boolean;
  };
  retention: {
    metrics: number; // days
    alerts: number; // days
  };
}

@Injectable()
export class IntegrationMonitoringService {
  private readonly logger = new Logger(IntegrationMonitoringService.name);
  private readonly integrationHealth = new Map<string, IntegrationHealth>();
  private readonly integrationAlerts = new Map<string, IntegrationAlert[]>();
  private readonly integrationMetrics = new Map<string, IntegrationMetrics[]>();
  private readonly monitoringConfigs = new Map<string, MonitoringConfig>();
  private readonly alertHistory = new Map<string, IntegrationAlert[]>();

  constructor() {
    this.initializeDefaultConfigs();
  }

  async startMonitoring(): Promise<void> {
    this.logger.log('Starting integration monitoring service');

    // Start monitoring for all configured providers
    for (const [provider, config] of this.monitoringConfigs.entries()) {
      if (config.enabled) {
        await this.startProviderMonitoring(provider);
      }
    }

    this.logger.log('Integration monitoring service started');
  }

  async startProviderMonitoring(provider: string): Promise<void> {
    const config = this.monitoringConfigs.get(provider);
    if (!config || !config.enabled) {
      return;
    }

    this.logger.log(`Starting monitoring for provider: ${provider}`);

    // Initialize health check
    const health = await this.performHealthCheck(provider);
    this.integrationHealth.set(provider, health);

    // Initialize metrics
    this.integrationMetrics.set(provider, []);
  }

  async stopProviderMonitoring(provider: string): Promise<void> {
    this.logger.log(`Stopping monitoring for provider: ${provider}`);

    this.integrationHealth.delete(provider);
    this.integrationMetrics.delete(provider);
    this.monitoringConfigs.delete(provider);
  }

  async getIntegrationMonitoring(): Promise<{
    totalIntegrations: number;
    activeIntegrations: number;
    failedIntegrations: number;
    healthyIntegrations: number;
    topIssues: Array<{
      provider: string;
      issue: string;
      severity: string;
      count: number;
    }>;
    averageResponseTime: number;
    alerts: Array<{
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
      provider?: string;
    }>;
  }> {
    const totalIntegrations = this.monitoringConfigs.size;
    const healthChecks = Array.from(this.integrationHealth.values());
    
    const activeIntegrations = healthChecks.filter(h => h.status !== 'unknown').length;
    const failedIntegrations = healthChecks.filter(h => h.status === 'unhealthy').length;
    const healthyIntegrations = healthChecks.filter(h => h.status === 'healthy').length;

    // Collect top issues
    const issues = this.collectTopIssues(healthChecks);

    // Calculate average response time
    const averageResponseTime = healthChecks.reduce((sum, h) => sum + h.details.responseTime, 0) / healthChecks.length;

    // Get recent alerts
    const recentAlerts = this.getRecentAlerts(10);

    return {
      totalIntegrations,
      activeIntegrations,
      failedIntegrations,
      healthyIntegrations,
      topIssues: issues,
      averageResponseTime,
      alerts: recentAlerts,
    };
  }

  async getIntegrationStatus(provider: string): Promise<{
    status: string;
    details: any;
    metrics: any;
  }> {
    const health = this.integrationHealth.get(provider);
    if (!health) {
      return {
        status: 'unknown',
        details: { message: 'No monitoring data available' },
        metrics: {},
      };
    }

    const metrics = this.getProviderMetrics(provider);

    return {
      status: health.status,
      details: health.details,
      metrics,
    };
  }

  async getIntegrationAlerts(
    provider?: string,
    severity?: string,
    limit?: number,
  ): Promise<{
    alerts: Array<{
      type: string;
      severity: string;
      message: string;
      timestamp: Date;
      provider?: string;
    }>;
  }> {
    let alerts: IntegrationAlert[] = [];

    if (provider) {
      alerts = this.integrationAlerts.get(provider) || [];
    } else {
      // Get all alerts
      for (const [_, providerAlerts] of this.integrationAlerts.entries()) {
        alerts.push(...providerAlerts);
      }
    }

    // Filter by severity
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    // Sort by timestamp (most recent first)
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    if (limit) {
      alerts = alerts.slice(0, limit);
    }

    return {
      alerts: alerts.map(alert => ({
        type: alert.type,
        severity: alert.severity,
        message: alert.message,
        timestamp: alert.timestamp,
        provider: alert.provider,
      })),
    };
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    // Find and acknowledge the alert
    for (const [provider, alerts] of this.integrationAlerts.entries()) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        alert.acknowledged = true;
        this.logger.log(`Alert acknowledged: ${alertId}`);
        return;
      }
    }

    throw new Error(`Alert with id ${alertId} not found`);
  }

  async resolveAlert(alertId: string): Promise<void> {
    // Find and resolve the alert
    for (const [provider, alerts] of this.integrationAlerts.entries()) {
      const alertIndex = alerts.findIndex(a => a.id === alertId);
      if (alertIndex !== -1) {
        alerts[alertIndex].resolved = true;
        alerts[alertIndex].resolvedAt = new Date();
        this.logger.log(`Alert resolved: ${alertId}`);
        return;
      }
    }

    throw new Error(`Alert with id ${alertId} not found`);
  }

  async createAlert(
    provider: string,
    type: 'error' | 'warning' | 'info' | 'critical',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    details?: any,
  ): Promise<IntegrationAlert> {
    const alert: IntegrationAlert = {
      id: crypto.randomUUID(),
      provider,
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
    };

    // Add to provider alerts
    const providerAlerts = this.integrationAlerts.get(provider) || [];
    providerAlerts.push(alert);
    this.integrationAlerts.set(provider, providerAlerts);

    // Add to alert history
    const historyAlerts = this.alertHistory.get(provider) || [];
    historyAlerts.push(alert);
    this.alertHistory.set(provider, historyAlerts);

    // Send notifications
    await this.sendAlertNotifications(alert);

    this.logger.warn(`Alert created for provider ${provider}: ${message}`);

    return alert;
  }

  async recordMetrics(provider: string, metrics: {
    requestCount: number;
    successCount: number;
    failureCount: number;
    averageResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
  }): Promise<void> {
    const integrationMetrics = this.integrationMetrics.get(provider) || [];
    
    const newMetrics: IntegrationMetrics = {
      provider,
      timestamp: new Date(),
      metrics: {
        ...metrics,
        errorRate: metrics.requestCount > 0 ? metrics.failureCount / metrics.requestCount : 0,
        throughput: metrics.requestCount, // requests per interval
      },
    };

    integrationMetrics.push(newMetrics);

    // Keep only recent metrics (last 24 hours by default)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const cutoffTime = new Date(Date.now() - maxAge);
    
    const filteredMetrics = integrationMetrics.filter(m => m.timestamp > cutoffTime);
    this.integrationMetrics.set(provider, filteredMetrics);

    // Check for alert conditions
    await this.checkAlertConditions(provider, newMetrics);
  }

  async getProviderMetrics(provider: string): Promise<{
    status: string;
    metrics: any;
  }> {
    const health = this.integrationHealth.get(provider);
    const metrics = this.integrationMetrics.get(provider) || [];

    if (metrics.length === 0) {
      return {
        status: health?.status || 'unknown',
        metrics: {},
      };
    }

    // Calculate aggregate metrics
    const recentMetrics = metrics.slice(-10); // Last 10 data points
    const aggregateMetrics = recentMetrics.reduce(
      (acc, m) => ({
        requestCount: acc.requestCount + m.metrics.requestCount,
        successCount: acc.successCount + m.metrics.successCount,
        failureCount: acc.failureCount + m.metrics.failureCount,
        responseTimeSum: acc.responseTimeSum + m.metrics.averageResponseTime,
        minResponseTime: Math.min(acc.minResponseTime, m.metrics.minResponseTime),
        maxResponseTime: Math.max(acc.maxResponseTime, m.metrics.maxResponseTime),
      }),
      {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        responseTimeSum: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
      }
    );

    const averageResponseTime = aggregateMetrics.responseTimeSum / recentMetrics.length;
    const errorRate = aggregateMetrics.requestCount > 0 ? aggregateMetrics.failureCount / aggregateMetrics.requestCount : 0;

    return {
      status: health?.status || 'unknown',
      metrics: {
        totalRequests: aggregateMetrics.requestCount,
        successCount: aggregateMetrics.successCount,
        failureCount: aggregateMetrics.failureCount,
        averageResponseTime,
        minResponseTime: aggregateMetrics.minResponseTime,
        maxResponseTime: aggregateMetrics.maxResponseTime,
        errorRate,
        uptime: 1 - errorRate, // Simplified uptime calculation
      },
    };
  }

  async getMonitoringConfig(provider: string): Promise<MonitoringConfig | null> {
    return this.monitoringConfigs.get(provider) || null;
  }

  async updateMonitoringConfig(provider: string, config: Partial<MonitoringConfig>): Promise<void> {
    const existingConfig = this.monitoringConfigs.get(provider) || {
      enabled: true,
      interval: 60000, // 1 minute
      alertThresholds: {
        errorRate: 0.05,
        responseTime: 5000,
        failureCount: 10,
      },
      notifications: {
        email: true,
        slack: false,
        webhook: false,
        sms: false,
      },
      retention: {
        metrics: 7, // 7 days
        alerts: 30, // 30 days
      },
    };

    const updatedConfig = { ...existingConfig, ...config };
    this.monitoringConfigs.set(provider, updatedConfig);

    // Restart monitoring if enabled/disabled
    if (config.enabled !== undefined) {
      if (config.enabled) {
        await this.startProviderMonitoring(provider);
      } else {
        await this.stopProviderMonitoring(provider);
      }
    }

    this.logger.log(`Monitoring config updated for provider: ${provider}`);
  }

  private async performHealthCheck(provider: string): Promise<IntegrationHealth> {
    try {
      // Mock health check - in production would make actual API call
      const startTime = Date.now();
      
      // Simulate API call
      const responseTime = 100 + Math.random() * 900; // 100-1000ms
      const statusCode = Math.random() > 0.95 ? 500 : 200; // 5% chance of error
      const error = statusCode === 500 ? 'Internal Server Error' : undefined;

      const status = statusCode === 200 ? 'healthy' : statusCode >= 400 && statusCode < 500 ? 'degraded' : 'unhealthy';

      return {
        provider,
        status,
        details: {
          responseTime,
          statusCode,
          error,
          lastCheck: new Date(),
        },
        metrics: {
          uptime: 0.99, // Mock uptime
          errorRate: statusCode === 500 ? 0.05 : 0.01,
          averageResponseTime: responseTime,
          requestCount: 0,
          successCount: 0,
          failureCount: statusCode === 500 ? 1 : 0,
        },
      };
    } catch (error) {
      return {
        provider,
        status: 'unhealthy',
        details: {
          responseTime: 0,
          statusCode: 0,
          error: error.message,
          lastCheck: new Date(),
        },
        metrics: {
          uptime: 0,
          errorRate: 1,
          averageResponseTime: 0,
          requestCount: 0,
          successCount: 0,
          failureCount: 1,
        },
      };
    }
  }

  private async checkAlertConditions(provider: string, metrics: IntegrationMetrics): Promise<void> {
    const config = this.monitoringConfigs.get(provider);
    if (!config || !config.enabled) {
      return;
    }

    const thresholds = config.alertThresholds;

    // Check error rate threshold
    if (metrics.metrics.errorRate > thresholds.errorRate) {
      await this.createAlert(
        provider,
        'warning',
        metrics.metrics.errorRate > thresholds.errorRate * 2 ? 'critical' : 'medium',
        `Error rate (${(metrics.metrics.errorRate * 100).toFixed(2)}%) exceeds threshold (${(thresholds.errorRate * 100).toFixed(2)}%)`,
        { currentRate: metrics.metrics.errorRate, threshold: thresholds.errorRate },
      );
    }

    // Check response time threshold
    if (metrics.metrics.averageResponseTime > thresholds.responseTime) {
      await this.createAlert(
        provider,
        'warning',
        metrics.metrics.averageResponseTime > thresholds.responseTime * 2 ? 'critical' : 'medium',
        `Response time (${metrics.metrics.averageResponseTime}ms) exceeds threshold (${thresholds.responseTime}ms)`,
        { currentTime: metrics.metrics.averageResponseTime, threshold: thresholds.responseTime },
      );
    }

    // Check failure count threshold
    if (metrics.metrics.failureCount > thresholds.failureCount) {
      await this.createAlert(
        provider,
        'error',
        metrics.metrics.failureCount > thresholds.failureCount * 2 ? 'critical' : 'high',
        `Failure count (${metrics.metrics.failureCount}) exceeds threshold (${thresholds.failureCount})`,
        { currentCount: metrics.metrics.failureCount, threshold: thresholds.failureCount },
      );
    }
  }

  private async sendAlertNotifications(alert: IntegrationAlert): Promise<void> {
    const config = this.monitoringConfigs.get(alert.provider);
    if (!config) return;

    const notifications = config.notifications;

    // Send email notification
    if (notifications.email) {
      await this.sendEmailAlert(alert);
    }

    // Send Slack notification
    if (notifications.slack) {
      await this.sendSlackAlert(alert);
    }

    // Send webhook notification
    if (notifications.webhook) {
      await this.sendWebhookAlert(alert);
    }

    // Send SMS notification
    if (notifications.sms) {
      await this.sendSMSAlert(alert);
    }
  }

  private async sendEmailAlert(alert: IntegrationAlert): Promise<void> {
    // Mock email sending
    this.logger.log(`Email alert sent for ${alert.provider}: ${alert.message}`);
  }

  private async sendSlackAlert(alert: IntegrationAlert): Promise<void> {
    // Mock Slack notification
    this.logger.log(`Slack alert sent for ${alert.provider}: ${alert.message}`);
  }

  private async sendWebhookAlert(alert: IntegrationAlert): Promise<void> {
    // Mock webhook notification
    this.logger.log(`Webhook alert sent for ${alert.provider}: ${alert.message}`);
  }

  private async sendSMSAlert(alert: IntegrationAlert): Promise<void> {
    // Mock SMS notification
    this.logger.log(`SMS alert sent for ${alert.provider}: ${alert.message}`);
  }

  private collectTopIssues(healthChecks: IntegrationHealth[]): Array<{
    provider: string;
    issue: string;
    severity: string;
    count: number;
  }> {
    const issues = [];

    for (const health of healthChecks) {
      if (health.status === 'unhealthy') {
        issues.push({
          provider: health.provider,
          issue: 'Service unavailable',
          severity: 'critical',
          count: 1,
        });
      } else if (health.status === 'degraded') {
        issues.push({
          provider: health.provider,
          issue: 'Service degraded',
          severity: 'high',
          count: 1,
        });
      } else if (health.details.responseTime > 5000) {
        issues.push({
          provider: health.provider,
          issue: 'Slow response time',
          severity: 'medium',
          count: 1,
        });
      }
    }

    return issues.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  private getRecentAlerts(limit: number): Array<{
    type: string;
    severity: string;
    message: string;
    timestamp: Date;
    provider?: string;
  }> {
    const allAlerts: IntegrationAlert[] = [];

    for (const [_, alerts] of this.integrationAlerts.entries()) {
      allAlerts.push(...alerts);
    }

    // Sort by timestamp (most recent first)
    allAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Limit results
    return allAlerts.slice(0, limit).map(alert => ({
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp,
      provider: alert.provider,
    }));
  }

  private initializeDefaultConfigs(): void {
    const defaultConfigs: Array<{ provider: string; config: MonitoringConfig }> = [
      {
        provider: 'salesforce',
        config: {
          enabled: true,
          interval: 60000,
          alertThresholds: {
            errorRate: 0.05,
            responseTime: 5000,
            failureCount: 10,
          },
          notifications: {
            email: true,
            slack: true,
            webhook: false,
            sms: false,
          },
          retention: {
            metrics: 7,
            alerts: 30,
          },
        },
      },
      {
        provider: 'stripe',
        config: {
          enabled: true,
          interval: 30000,
          alertThresholds: {
            errorRate: 0.02,
            responseTime: 2000,
            failureCount: 5,
          },
          notifications: {
            email: true,
            slack: true,
            webhook: true,
            sms: false,
          },
          retention: {
            metrics: 14,
            alerts: 60,
          },
        },
      },
      {
        provider: 'netsuite',
        config: {
          enabled: true,
          interval: 90000,
          alertThresholds: {
            errorRate: 0.08,
            responseTime: 8000,
            failureCount: 15,
          },
          notifications: {
            email: true,
            slack: false,
            webhook: false,
            sms: false,
          },
          retention: {
            metrics: 30,
            alerts: 90,
          },
        },
      },
    ];

    for (const { provider, config } of defaultConfigs) {
      this.monitoringConfigs.set(provider, config);
    }

    this.logger.log(`Initialized monitoring configs for ${defaultConfigs.length} providers`);
  }

  @Cron('*/1 * * * *') // Every minute
  async performHealthChecks(): Promise<void> {
    this.logger.log('Performing health checks for all monitored providers');

    for (const [provider, config] of this.monitoringConfigs.entries()) {
      if (config.enabled) {
        try {
          const health = await this.performHealthCheck(provider);
          this.integrationHealth.set(provider, health);

          // Update status based on health check
          if (health.status === 'unhealthy') {
            await this.createAlert(
              provider,
              'critical',
              'critical',
              `Provider health check failed: ${health.details.error || 'Unknown error'}`,
              health.details,
            );
          } else if (health.status === 'degraded') {
            await this.createAlert(
              provider,
              'warning',
              'medium',
              `Provider performance degraded: Response time ${health.details.responseTime}ms`,
              health.details,
            );
          }
        } catch (error) {
          this.logger.error(`Health check failed for provider ${provider}:`, error);
        }
      }
    }
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async cleanupOldData(): Promise<void> {
    this.logger.log('Cleaning up old monitoring data');

    const now = Date.now();

    // Clean up old metrics
    for (const [provider, metrics] of this.integrationMetrics.entries()) {
      const config = this.monitoringConfigs.get(provider);
      const retentionDays = config?.retention?.metrics || 7;
      const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);

      const filteredMetrics = metrics.filter(m => m.timestamp.getTime() > cutoffTime);
      this.integrationMetrics.set(provider, filteredMetrics);
    }

    // Clean up old alerts
    for (const [provider, alerts] of this.integrationAlerts.entries()) {
      const config = this.monitoringConfigs.get(provider);
      const retentionDays = config?.retention?.alerts || 30;
      const cutoffTime = now - (retentionDays * 24 * 60 * 60 * 1000);

      const filteredAlerts = alerts.filter(a => a.timestamp.getTime() > cutoffTime);
      this.integrationAlerts.set(provider, filteredAlerts);
    }

    this.logger.log('Old monitoring data cleanup completed');
  }

  @Cron('0 0 * * * *') // Daily at midnight
  async generateDailyReport(): Promise<void> {
    this.logger.log('Generating daily monitoring report');

    const monitoring = await this.getIntegrationMonitoring();

    // In production, this would save to database and send notifications
    this.logger.log(`Daily Monitoring Report - Total: ${monitoring.totalIntegrations}, Active: ${monitoring.activeIntegrations}, Failed: ${monitoring.failedIntegrations}`);
  }
}

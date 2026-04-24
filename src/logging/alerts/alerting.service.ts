import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggingService } from '../logging.service';
import { CorrelationService } from '../utils/correlation-id';

export interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  title: string;
  message: string;
  source: {
    service: string;
    component?: string;
    userId?: string;
    correlationId?: string;
  };
  details: Record<string, any>;
  channels: AlertChannel[];
  status: 'pending' | 'sent' | 'failed' | 'acknowledged';
  sentAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  retryCount: number;
  maxRetries: number;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'pagerduty' | 'teams';
  enabled: boolean;
  config: Record<string, any>;
  lastSent?: Date;
  rateLimit?: {
    maxPerHour: number;
    currentCount: number;
    resetTime: Date;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'ne' | 'contains' | 'regex';
    value: any;
  }[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  cooldown: number; // seconds
  template?: string;
  metadata?: Record<string, any>;
}

export interface AlertMetrics {
  timestamp: Date;
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  alertsByChannel: Record<string, number>;
  sentAlerts: number;
  failedAlerts: number;
  averageResponseTime: number;
  topAlertSources: Array<{
    service: string;
    count: number;
  }>;
}

@Injectable()
export class AlertingService implements OnModuleInit {
  private readonly logger = new Logger(AlertingService.name);
  private readonly alerts: Alert[] = [];
  private readonly alertRules: AlertRule[] = [];
  private readonly channels: Map<string, AlertChannel> = new Map();
  private readonly maxAlertsHistory = 10000;
  private processingInterval: NodeJS.Timeout;
  private readonly processingIntervalMs = 5000; // 5 seconds

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly correlationService: CorrelationService,
  ) {
    this.initializeChannels();
    this.initializeAlertRules();
  }

  async onModuleInit() {
    this.logger.log('Initializing alerting service');
    this.startProcessing();
    this.logger.log('Alerting service initialized');
  }

  private initializeChannels(): void {
    // Email channel
    this.channels.set('email', {
      type: 'email',
      enabled: this.configService.get<boolean>('ALERT_EMAIL_ENABLED', false),
      config: {
        smtpHost: this.configService.get<string>('ALERT_EMAIL_SMTP_HOST'),
        smtpPort: this.configService.get<number>('ALERT_EMAIL_SMTP_PORT', 587),
        username: this.configService.get<string>('ALERT_EMAIL_USERNAME'),
        password: this.configService.get<string>('ALERT_EMAIL_PASSWORD'),
        from: this.configService.get<string>('ALERT_EMAIL_FROM', 'alerts@currentdao.com'),
        to: this.configService.get<string>('ALERT_EMAIL_TO', 'admin@currentdao.com').split(','),
      },
      rateLimit: {
        maxPerHour: this.configService.get<number>('ALERT_EMAIL_RATE_LIMIT', 50),
        currentCount: 0,
        resetTime: new Date(Date.now() + 3600000),
      },
    });

    // Slack channel
    this.channels.set('slack', {
      type: 'slack',
      enabled: this.configService.get<boolean>('ALERT_SLACK_ENABLED', false),
      config: {
        webhookUrl: this.configService.get<string>('ALERT_SLACK_WEBHOOK_URL'),
        channel: this.configService.get<string>('ALERT_SLACK_CHANNEL', '#alerts'),
        username: this.configService.get<string>('ALERT_SLACK_USERNAME', 'CurrentDAO Bot'),
      },
      rateLimit: {
        maxPerHour: this.configService.get<number>('ALERT_SLACK_RATE_LIMIT', 100),
        currentCount: 0,
        resetTime: new Date(Date.now() + 3600000),
      },
    });

    // Webhook channel
    this.channels.set('webhook', {
      type: 'webhook',
      enabled: this.configService.get<boolean>('ALERT_WEBHOOK_ENABLED', false),
      config: {
        url: this.configService.get<string>('ALERT_WEBHOOK_URL'),
        method: this.configService.get<string>('ALERT_WEBHOOK_METHOD', 'POST'),
        headers: this.configService.get('ALERT_WEBHOOK_HEADERS', {}),
      },
      rateLimit: {
        maxPerHour: this.configService.get<number>('ALERT_WEBHOOK_RATE_LIMIT', 200),
        currentCount: 0,
        resetTime: new Date(Date.now() + 3600000),
      },
    });

    // PagerDuty channel
    this.channels.set('pagerduty', {
      type: 'pagerduty',
      enabled: this.configService.get<boolean>('ALERT_PAGERDUTY_ENABLED', false),
      config: {
        integrationKey: this.configService.get<string>('ALERT_PAGERDUTY_INTEGRATION_KEY'),
        severity: 'critical',
      },
      rateLimit: {
        maxPerHour: this.configService.get<number>('ALERT_PAGERDUTY_RATE_LIMIT', 20),
        currentCount: 0,
        resetTime: new Date(Date.now() + 3600000),
      },
    });

    // Microsoft Teams channel
    this.channels.set('teams', {
      type: 'teams',
      enabled: this.configService.get<boolean>('ALERT_TEAMS_ENABLED', false),
      config: {
        webhookUrl: this.configService.get<string>('ALERT_TEAMS_WEBHOOK_URL'),
        title: 'CurrentDAO Alert',
      },
      rateLimit: {
        maxPerHour: this.configService.get<number>('ALERT_TEAMS_RATE_LIMIT', 100),
        currentCount: 0,
        resetTime: new Date(Date.now() + 3600000),
      },
    });
  }

  private initializeAlertRules(): void {
    // Critical system errors
    this.alertRules.push({
      id: 'critical-system-error',
      name: 'Critical System Error',
      description: 'Alert on critical system errors',
      enabled: true,
      conditions: [
        { field: 'level', operator: 'eq', value: 'error' },
        { field: 'tags', operator: 'contains', value: 'critical' },
      ],
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      cooldown: 300, // 5 minutes
    });

    // High CPU usage
    this.alertRules.push({
      id: 'high-cpu-usage',
      name: 'High CPU Usage',
      description: 'Alert when CPU usage exceeds threshold',
      enabled: true,
      conditions: [
        { field: 'metric', operator: 'eq', value: 'cpu_usage' },
        { field: 'value', operator: 'gt', value: 90 },
      ],
      severity: 'high',
      channels: ['email', 'slack'],
      cooldown: 600, // 10 minutes
    });

    // High memory usage
    this.alertRules.push({
      id: 'high-memory-usage',
      name: 'High Memory Usage',
      description: 'Alert when memory usage exceeds threshold',
      enabled: true,
      conditions: [
        { field: 'metric', operator: 'eq', value: 'memory_usage' },
        { field: 'value', operator: 'gt', value: 95 },
      ],
      severity: 'high',
      channels: ['email', 'slack'],
      cooldown: 600, // 10 minutes
    });

    // Security events
    this.alertRules.push({
      id: 'security-event',
      name: 'Security Event',
      description: 'Alert on high-severity security events',
      enabled: true,
      conditions: [
        { field: 'category', operator: 'eq', value: 'security' },
        { field: 'severity', operator: 'contains', value: 'high' },
      ],
      severity: 'high',
      channels: ['email', 'slack', 'pagerduty'],
      cooldown: 180, // 3 minutes
    });

    // Database connection issues
    this.alertRules.push({
      id: 'database-error',
      name: 'Database Connection Error',
      description: 'Alert on database connection failures',
      enabled: true,
      conditions: [
        { field: 'category', operator: 'eq', value: 'database' },
        { field: 'level', operator: 'eq', value: 'error' },
      ],
      severity: 'critical',
      channels: ['email', 'slack', 'pagerduty'],
      cooldown: 300, // 5 minutes
    });

    // API rate limiting
    this.alertRules.push({
      id: 'api-rate-limit',
      name: 'API Rate Limit Exceeded',
      description: 'Alert when API rate limits are exceeded',
      enabled: true,
      conditions: [
        { field: 'type', operator: 'eq', value: 'rate_limit_exceeded' },
      ],
      severity: 'medium',
      channels: ['slack'],
      cooldown: 900, // 15 minutes
    });
  }

  private startProcessing(): void {
    this.processingInterval = setInterval(async () => {
      try {
        await this.processPendingAlerts();
      } catch (error) {
        this.logger.error('Failed to process pending alerts', error);
      }
    }, this.processingIntervalMs);
  }

  async createAlert(
    type: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    title: string,
    message: string,
    details: Record<string, any> = {},
    source?: Partial<Alert['source']>,
  ): Promise<string> {
    const alert: Alert = {
      id: this.generateAlertId(),
      timestamp: new Date(),
      severity,
      type,
      title,
      message,
      source: {
        service: 'currentdao-backend',
        ...source,
      },
      details,
      channels: this.getChannelsForAlert(type, severity),
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    };

    this.alerts.push(alert);

    // Keep only recent alerts
    if (this.alerts.length > this.maxAlertsHistory) {
      this.alerts.shift();
    }

    // Log alert creation
    await this.loggingService.logSecurityEvent(
      `Alert created: ${title}`,
      severity,
      {
        alertId: alert.id,
        type,
        severity,
        title,
        message,
        channels: alert.channels.map(c => c.type),
      },
      {
        service_name: 'currentdao-backend',
        environment: process.env.NODE_ENV || 'development',
        component: 'alerting-service',
        function: 'createAlert',
        ...this.correlationService.getLogContext(),
      },
    );

    return alert.id;
  }

  async evaluateAlertRules(logData: any): Promise<void> {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      if (this.evaluateRuleConditions(rule, logData)) {
        // Check cooldown
        if (this.isInCooldown(rule.id, rule.cooldown)) {
          continue;
        }

        await this.createAlert(
          rule.id,
          rule.severity,
          rule.name,
          this.formatAlertMessage(rule, logData),
          {
            ruleId: rule.id,
            ruleName: rule.name,
            triggeredData: logData,
          },
          {
            component: logData.component,
            userId: logData.user_id,
            correlationId: logData.request_id,
          },
        );

        this.setCooldown(rule.id, rule.cooldown);
      }
    }
  }

  private evaluateRuleConditions(rule: AlertRule, data: any): boolean {
    return rule.conditions.every(condition => {
      const fieldValue = this.getNestedValue(data, condition.field);
      
      switch (condition.operator) {
        case 'eq':
          return fieldValue === condition.value;
        case 'ne':
          return fieldValue !== condition.value;
        case 'gt':
          return Number(fieldValue) > Number(condition.value);
        case 'lt':
          return Number(fieldValue) < Number(condition.value);
        case 'contains':
          return Array.isArray(fieldValue) 
            ? fieldValue.includes(condition.value)
            : String(fieldValue).includes(String(condition.value));
        case 'regex':
          return new RegExp(condition.value).test(String(fieldValue));
        default:
          return false;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private formatAlertMessage(rule: AlertRule, data: any): string {
    if (rule.template) {
      return rule.template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return this.getNestedValue(data, key) || match;
      });
    }

    return `Alert triggered: ${rule.name}. Conditions met for ${rule.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}`;
  }

  private getChannelsForAlert(type: string, severity: string): AlertChannel[] {
    const channels: AlertChannel[] = [];

    // Add channels based on severity
    if (severity === 'critical') {
      ['email', 'slack', 'pagerduty'].forEach(channelType => {
        const channel = this.channels.get(channelType);
        if (channel?.enabled) channels.push(channel);
      });
    } else if (severity === 'high') {
      ['email', 'slack'].forEach(channelType => {
        const channel = this.channels.get(channelType);
        if (channel?.enabled) channels.push(channel);
      });
    } else {
      ['slack'].forEach(channelType => {
        const channel = this.channels.get(channelType);
        if (channel?.enabled) channels.push(channel);
      });
    }

    return channels;
  }

  private isInCooldown(ruleId: string, cooldownSeconds: number): boolean {
    const cooldownKey = `cooldown_${ruleId}`;
    const lastSent = localStorage.getItem(cooldownKey);
    
    if (lastSent) {
      const lastSentTime = new Date(lastSent);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastSentTime.getTime()) / 1000;
      
      return diffSeconds < cooldownSeconds;
    }
    
    return false;
  }

  private setCooldown(ruleId: string, cooldownSeconds: number): void {
    const cooldownKey = `cooldown_${ruleId}`;
    localStorage.setItem(cooldownKey, new Date().toISOString());
  }

  private async processPendingAlerts(): Promise<void> {
    const pendingAlerts = this.alerts.filter(alert => alert.status === 'pending');
    
    for (const alert of pendingAlerts) {
      await this.sendAlert(alert);
    }
  }

  private async sendAlert(alert: Alert): Promise<void> {
    let success = true;
    
    for (const channel of alert.channels) {
      try {
        if (!this.checkRateLimit(channel)) {
          this.logger.warn(`Rate limit exceeded for channel ${channel.type}`);
          continue;
        }

        await this.sendToChannel(alert, channel);
        this.updateRateLimit(channel);
        
      } catch (error) {
        this.logger.error(`Failed to send alert to ${channel.type}`, error);
        success = false;
      }
    }

    // Update alert status
    if (success) {
      alert.status = 'sent';
      alert.sentAt = new Date();
    } else {
      alert.retryCount++;
      if (alert.retryCount >= alert.maxRetries) {
        alert.status = 'failed';
      }
    }
  }

  private checkRateLimit(channel: AlertChannel): boolean {
    if (!channel.rateLimit) return true;

    const now = new Date();
    
    // Reset counter if time window has passed
    if (now > channel.rateLimit.resetTime) {
      channel.rateLimit.currentCount = 0;
      channel.rateLimit.resetTime = new Date(now.getTime() + 3600000);
    }

    return channel.rateLimit.currentCount < channel.rateLimit.maxPerHour;
  }

  private updateRateLimit(channel: AlertChannel): void {
    if (channel.rateLimit) {
      channel.rateLimit.currentCount++;
    }
  }

  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmail(alert, channel);
        break;
      case 'slack':
        await this.sendSlack(alert, channel);
        break;
      case 'webhook':
        await this.sendWebhook(alert, channel);
        break;
      case 'pagerduty':
        await this.sendPagerDuty(alert, channel);
        break;
      case 'teams':
        await this.sendTeams(alert, channel);
        break;
      default:
        throw new Error(`Unknown channel type: ${channel.type}`);
    }
  }

  private async sendEmail(alert: Alert, channel: AlertChannel): Promise<void> {
    // Implementation would use nodemailer or similar
    this.logger.log(`Sending email alert: ${alert.title}`);
  }

  private async sendSlack(alert: Alert, channel: AlertChannel): Promise<void> {
    const payload = {
      channel: channel.config.channel,
      username: channel.config.username,
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
      attachments: [
        {
          color: this.getSeverityColor(alert.severity),
          fields: [
            { title: 'Message', value: alert.message, short: false },
            { title: 'Service', value: alert.source.service, short: true },
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Time', value: alert.timestamp.toISOString(), short: true },
          ],
        },
      ],
    };

    // Implementation would use fetch or axios to send to webhook
    this.logger.log(`Sending Slack alert: ${alert.title}`);
  }

  private async sendWebhook(alert: Alert, channel: AlertChannel): Promise<void> {
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
    };

    // Implementation would use fetch or axios
    this.logger.log(`Sending webhook alert: ${alert.title}`);
  }

  private async sendPagerDuty(alert: Alert, channel: AlertChannel): Promise<void> {
    const payload = {
      routing_key: channel.config.integrationKey,
      event_action: 'trigger',
      payload: {
        summary: alert.title,
        source: alert.source.service,
        severity: channel.config.severity,
        timestamp: alert.timestamp.toISOString(),
        custom_details: alert.details,
      },
    };

    // Implementation would use fetch or axios to PagerDuty API
    this.logger.log(`Sending PagerDuty alert: ${alert.title}`);
  }

  private async sendTeams(alert: Alert, channel: AlertChannel): Promise<void> {
    const payload = {
      title: `${channel.config.title} - ${alert.severity.toUpperCase()}`,
      text: alert.message,
      themeColor: this.getSeverityColor(alert.severity),
      sections: [
        {
          facts: [
            { name: 'Service', value: alert.source.service },
            { name: 'Severity', value: alert.severity },
            { name: 'Time', value: alert.timestamp.toISOString() },
          ],
        },
      ],
    };

    // Implementation would use fetch or axios to Teams webhook
    this.logger.log(`Sending Teams alert: ${alert.title}`);
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      case 'low': return '#00ff00';
      default: return '#808080';
    }
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  getAlerts(limit?: number, severity?: string, status?: string): Alert[] {
    let alerts = [...this.alerts];
    
    if (severity) {
      alerts = alerts.filter(a => a.severity === severity);
    }
    
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }
    
    alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return limit ? alerts.slice(0, limit) : alerts;
  }

  getAlertMetrics(timeRangeMs?: number): AlertMetrics {
    const cutoffTime = timeRangeMs ? new Date(Date.now() - timeRangeMs) : new Date(0);
    const recentAlerts = this.alerts.filter(a => a.timestamp >= cutoffTime);

    const alertsBySeverity: Record<string, number> = {};
    const alertsByType: Record<string, number> = {};
    const alertsByChannel: Record<string, number> = {};
    const serviceCounts = new Map<string, number>();

    let sentAlerts = 0;
    let failedAlerts = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    for (const alert of recentAlerts) {
      // Count by severity
      alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;

      // Count by type
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;

      // Count by channel
      for (const channel of alert.channels) {
        alertsByChannel[channel.type] = (alertsByChannel[channel.type] || 0) + 1;
      }

      // Count service sources
      serviceCounts.set(alert.source.service, (serviceCounts.get(alert.source.service) || 0) + 1);

      // Count status
      if (alert.status === 'sent') {
        sentAlerts++;
        if (alert.sentAt) {
          totalResponseTime += alert.sentAt.getTime() - alert.timestamp.getTime();
          responseTimeCount++;
        }
      } else if (alert.status === 'failed') {
        failedAlerts++;
      }
    }

    // Get top alert sources
    const topAlertSources = Array.from(serviceCounts.entries())
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      timestamp: new Date(),
      totalAlerts: recentAlerts.length,
      alertsBySeverity,
      alertsByType,
      alertsByChannel,
      sentAlerts,
      failedAlerts,
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      topAlertSources,
    };
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    await this.loggingService.logSecurityEvent(
      `Alert acknowledged: ${alert.title}`,
      'low',
      {
        alertId,
        acknowledgedBy,
        acknowledgedAt: alert.acknowledgedAt.toISOString(),
      },
      {
        service_name: 'currentdao-backend',
        environment: process.env.NODE_ENV || 'development',
        component: 'alerting-service',
        function: 'acknowledgeAlert',
        ...this.correlationService.getLogContext(),
      },
    );

    return true;
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId);
    if (!rule) return false;

    Object.assign(rule, updates);
    this.logger.log(`Updated alert rule: ${ruleId}`);
    return true;
  }

  getChannels(): Map<string, AlertChannel> {
    return new Map(this.channels);
  }

  updateChannel(channelId: string, updates: Partial<AlertChannel>): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    Object.assign(channel, updates);
    this.logger.log(`Updated alert channel: ${channelId}`);
    return true;
  }

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    metrics?: AlertMetrics;
  } {
    const metrics = this.getAlertMetrics(3600000); // Last hour
    const issues: string[] = [];

    const failedAlerts = metrics.failedAlerts;
    if (failedAlerts > 5) {
      issues.push(`High number of failed alerts: ${failedAlerts} in the last hour`);
    }

    const criticalAlerts = metrics.alertsBySeverity.critical || 0;
    if (criticalAlerts > 10) {
      issues.push(`High number of critical alerts: ${criticalAlerts} in the last hour`);
    }

    const avgResponseTime = metrics.averageResponseTime;
    if (avgResponseTime > 30000) { // 30 seconds
      issues.push(`Slow alert response time: ${avgResponseTime}ms average`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }
}

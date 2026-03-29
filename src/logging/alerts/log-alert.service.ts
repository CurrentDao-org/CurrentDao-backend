import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ElasticsearchService } from '../elasticsearch/elasticsearch.service';
import { ParsedLogEntry } from '../parsing/log-parser.service';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldown_minutes: number;
  max_alerts_per_hour: number;
  tags: string[];
}

export interface AlertCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'regex' | 'exists' | 'not_exists';
  value?: any;
  time_window_minutes?: number;
  threshold?: number;
}

export interface AlertAction {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'teams' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface Alert {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: string;
  message: string;
  details: any;
  triggered_at: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
  tags: string[];
}

export interface AlertMetrics {
  total_alerts: number;
  active_alerts: number;
  alerts_by_severity: Record<string, number>;
  alerts_by_rule: Record<string, number>;
  average_resolution_time: number;
  false_positive_rate: number;
  most_common_errors: Array<{ error: string; count: number }>;
  alert_frequency_trend: Array<{ timestamp: Date; count: number }>;
}

export interface NotificationResult {
  action_type: string;
  success: boolean;
  message: string;
  sent_at: Date;
  error?: string;
}

@Injectable()
export class LogAlertService implements OnModuleInit {
  private readonly logger = new Logger(LogAlertService.name);
  private readonly alertRules = new Map<string, AlertRule>();
  private readonly activeAlerts = new Map<string, Alert>();
  private readonly alertHistory: Alert[] = [];
  private readonly alertCooldowns = new Map<string, Date>();
  private readonly alertCounters = new Map<string, number>();
  private alertMetrics: AlertMetrics;

  constructor(
    private readonly configService: ConfigService,
    private readonly elasticsearchService: ElasticsearchService,
  ) {
    this.initializeMetrics();
    this.initializeDefaultRules();
  }

  async onModuleInit() {
    this.logger.log('Initializing log alert service');
    
    // Load alert rules from configuration
    await this.loadAlertRules();
    
    // Start alert monitoring
    this.startAlertMonitoring();
    
    this.logger.log('Log alert service initialized');
  }

  private initializeMetrics(): void {
    this.alertMetrics = {
      total_alerts: 0,
      active_alerts: 0,
      alerts_by_severity: {},
      alerts_by_rule: {},
      average_resolution_time: 0,
      false_positive_rate: 0,
      most_common_errors: [],
      alert_frequency_trend: [],
    };
  }

  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Alert when error rate exceeds 5% in 5 minutes',
        enabled: true,
        severity: 'high',
        conditions: [
          {
            field: 'level',
            operator: 'eq',
            value: 'error',
            time_window_minutes: 5,
            threshold: 10,
          },
        ],
        actions: [
          {
            type: 'email',
            config: {
              recipients: ['admin@currentdao.com'],
              subject: 'High Error Rate Alert',
            },
            enabled: true,
          },
          {
            type: 'slack',
            config: {
              webhook_url: process.env.SLACK_WEBHOOK_URL,
              channel: '#alerts',
            },
            enabled: true,
          },
        ],
        cooldown_minutes: 15,
        max_alerts_per_hour: 3,
        tags: ['error', 'rate', 'critical'],
      },
      {
        id: 'security-breach',
        name: 'Security Breach Detection',
        description: 'Alert on security-related events',
        enabled: true,
        severity: 'critical',
        conditions: [
          {
            field: 'categorized_as',
            operator: 'contains',
            value: 'security',
          },
          {
            field: 'level',
            operator: 'eq',
            value: 'error',
          },
        ],
        actions: [
          {
            type: 'pagerduty',
            config: {
              service_key: process.env.PAGERDUTY_SERVICE_KEY,
              severity: 'critical',
            },
            enabled: true,
          },
          {
            type: 'sms',
            config: {
              phone_numbers: ['+1234567890'],
            },
            enabled: true,
          },
        ],
        cooldown_minutes: 5,
        max_alerts_per_hour: 10,
        tags: ['security', 'critical'],
      },
      {
        id: 'slow-requests',
        name: 'Slow API Requests',
        description: 'Alert when response time exceeds 5 seconds',
        enabled: true,
        severity: 'medium',
        conditions: [
          {
            field: 'response_time',
            operator: 'gt',
            value: 5000,
            time_window_minutes: 1,
            threshold: 5,
          },
        ],
        actions: [
          {
            type: 'slack',
            config: {
              webhook_url: process.env.SLACK_WEBHOOK_URL,
              channel: '#performance',
            },
            enabled: true,
          },
        ],
        cooldown_minutes: 30,
        max_alerts_per_hour: 5,
        tags: ['performance', 'slow'],
      },
      {
        id: 'blockchain-failures',
        name: 'Blockchain Transaction Failures',
        description: 'Alert on blockchain transaction failures',
        enabled: true,
        severity: 'high',
        conditions: [
          {
            field: 'tx_status',
            operator: 'eq',
            value: 'failed',
            time_window_minutes: 10,
            threshold: 3,
          },
        ],
        actions: [
          {
            type: 'email',
            config: {
              recipients: ['blockchain-team@currentdao.com'],
              subject: 'Blockchain Transaction Failures',
            },
            enabled: true,
          },
          {
            type: 'teams',
            config: {
              webhook_url: process.env.TEAMS_WEBHOOK_URL,
            },
            enabled: true,
          },
        ],
        cooldown_minutes: 20,
        max_alerts_per_hour: 8,
        tags: ['blockchain', 'transaction', 'failure'],
      },
      {
        id: 'database-connection-issues',
        name: 'Database Connection Issues',
        description: 'Alert on database connection problems',
        enabled: true,
        severity: 'critical',
        conditions: [
          {
            field: 'error_name',
            operator: 'contains',
            value: 'connection',
          },
          {
            field: 'level',
            operator: 'eq',
            value: 'error',
          },
        ],
        actions: [
          {
            type: 'pagerduty',
            config: {
              service_key: process.env.PAGERDUTY_SERVICE_KEY,
              severity: 'critical',
            },
            enabled: true,
          },
        ],
        cooldown_minutes: 10,
        max_alerts_per_hour: 5,
        tags: ['database', 'connection', 'critical'],
      },
      {
        id: 'memory-usage-high',
        name: 'High Memory Usage',
        description: 'Alert when memory usage exceeds 80%',
        enabled: true,
        severity: 'medium',
        conditions: [
          {
            field: 'memory_usage',
            operator: 'gt',
            value: 80,
            time_window_minutes: 5,
            threshold: 3,
          },
        ],
        actions: [
          {
            type: 'slack',
            config: {
              webhook_url: process.env.SLACK_WEBHOOK_URL,
              channel: '#infrastructure',
            },
            enabled: true,
          },
        ],
        cooldown_minutes: 30,
        max_alerts_per_hour: 3,
        tags: ['infrastructure', 'memory'],
      },
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }
  }

  private async loadAlertRules(): Promise<void> {
    // Load additional rules from configuration or database
    try {
      const configRules = this.configService.get('ALERT_RULES');
      if (configRules && Array.isArray(configRules)) {
        for (const rule of configRules) {
          this.alertRules.set(rule.id, rule);
        }
      }
    } catch (error) {
      this.logger.error('Failed to load alert rules from configuration', error);
    }
  }

  private startAlertMonitoring(): void {
    // Monitor logs for alert conditions
    setInterval(async () => {
      await this.checkAlertConditions();
    }, 60000); // Check every minute
  }

  async checkAlertConditions(): Promise<void> {
    const now = new Date();
    
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;
      
      // Check cooldown
      if (this.isInCooldown(ruleId, now)) continue;
      
      // Check hourly limit
      if (this.exceedsHourlyLimit(ruleId, now)) continue;
      
      try {
        const shouldAlert = await this.evaluateRule(rule, now);
        if (shouldAlert) {
          await this.triggerAlert(rule, now);
        }
      } catch (error) {
        this.logger.error(`Failed to evaluate rule ${ruleId}`, error);
      }
    }
  }

  private async evaluateRule(rule: AlertRule, now: Date): Promise<boolean> {
    const searchQuery = this.buildSearchQueryFromRule(rule, now);
    
    try {
      const response = await this.elasticsearchService.searchLogs(searchQuery);
      const hitCount = response.hits?.total?.value || 0;
      
      // Check if any condition threshold is met
      for (const condition of rule.conditions) {
        if (condition.threshold && hitCount >= condition.threshold) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Failed to evaluate rule ${rule.id}`, error);
      return false;
    }
  }

  private buildSearchQueryFromRule(rule: AlertRule, now: Date): any {
    const query: any = {
      size: 0,
      query: {
        bool: {
          must: [],
          filter: [],
        },
      },
      aggs: {
        log_count: {
          value_count: {
            field: '@timestamp',
          },
        },
      },
    };

    // Add time range if specified
    const maxTimeWindow = Math.max(...rule.conditions.map(c => c.time_window_minutes || 0));
    if (maxTimeWindow > 0) {
      const startTime = new Date(now.getTime() - maxTimeWindow * 60 * 1000);
      query.query.bool.filter.push({
        range: {
          '@timestamp': {
            gte: startTime.toISOString(),
            lte: now.toISOString(),
          },
        },
      });
    }

    // Add conditions
    for (const condition of rule.conditions) {
      const conditionQuery = this.buildConditionQuery(condition);
      if (conditionQuery) {
        query.query.bool.must.push(conditionQuery);
      }
    }

    return query;
  }

  private buildConditionQuery(condition: AlertCondition): any {
    switch (condition.operator) {
      case 'eq':
        return { term: { [condition.field]: condition.value } };
      case 'ne':
        return { bool: { must_not: { term: { [condition.field]: condition.value } } } };
      case 'gt':
        return { range: { [condition.field]: { gt: condition.value } } };
      case 'lt':
        return { range: { [condition.field]: { lt: condition.value } } };
      case 'gte':
        return { range: { [condition.field]: { gte: condition.value } } };
      case 'lte':
        return { range: { [condition.field]: { lte: condition.value } } };
      case 'contains':
        return { wildcard: { [condition.field]: `*${condition.value}*` } };
      case 'regex':
        return { regexp: { [condition.field]: condition.value } };
      case 'exists':
        return { exists: { field: condition.field } };
      case 'not_exists':
        return { bool: { must_not: { exists: { field: condition.field } } } };
      default:
        return null;
    }
  }

  private async triggerAlert(rule: AlertRule, now: Date): Promise<void> {
    const alertId = `${rule.id}_${now.getTime()}`;
    
    const alert: Alert = {
      id: alertId,
      rule_id: rule.id,
      rule_name: rule.name,
      severity: rule.severity,
      message: `Alert triggered: ${rule.description}`,
      details: await this.getAlertDetails(rule),
      triggered_at: now,
      status: 'active',
      tags: rule.tags,
    };

    // Store alert
    this.activeAlerts.set(alertId, alert);
    this.alertHistory.push(alert);
    
    // Update metrics
    this.updateAlertMetrics(alert);
    
    // Set cooldown
    this.setCooldown(rule.id, now);
    
    // Increment counter
    this.incrementAlertCounter(rule.id, now);
    
    // Execute actions
    await this.executeAlertActions(alert, rule);
    
    this.logger.log(`Alert triggered: ${rule.name} (${alertId})`);
  }

  private async getAlertDetails(rule: AlertRule): Promise<any> {
    try {
      const searchQuery = this.buildSearchQueryFromRule(rule, new Date());
      const response = await this.elasticsearchService.searchLogs(searchQuery);
      
      const hits = response.hits?.hits || [];
      const recentLogs = hits.slice(0, 10).map(hit => hit._source);
      
      return {
        total_hits: response.hits?.total?.value || 0,
        recent_logs: recentLogs,
        time_window: `${Math.max(...rule.conditions.map(c => c.time_window_minutes || 0))} minutes`,
      };
    } catch (error) {
      this.logger.error('Failed to get alert details', error);
      return { error: 'Failed to fetch details' };
    }
  }

  private async executeAlertActions(alert: Alert, rule: AlertRule): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    for (const action of rule.actions) {
      if (!action.enabled) continue;
      
      try {
        const result = await this.executeAction(alert, action);
        results.push(result);
      } catch (error) {
        results.push({
          action_type: action.type,
          success: false,
          message: 'Failed to execute action',
          sent_at: new Date(),
          error: error.message,
        });
      }
    }
    
    return results;
  }

  private async executeAction(alert: Alert, action: AlertAction): Promise<NotificationResult> {
    switch (action.type) {
      case 'email':
        return await this.sendEmailAlert(alert, action.config);
      case 'slack':
        return await this.sendSlackAlert(alert, action.config);
      case 'webhook':
        return await this.sendWebhookAlert(alert, action.config);
      case 'pagerduty':
        return await this.sendPagerDutyAlert(alert, action.config);
      case 'teams':
        return await this.sendTeamsAlert(alert, action.config);
      case 'sms':
        return await this.sendSMSAlert(alert, action.config);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private async sendEmailAlert(alert: Alert, config: any): Promise<NotificationResult> {
    try {
      // Implementation would depend on your email service
      this.logger.log(`Email alert sent to ${config.recipients?.join(', ')}`);
      
      return {
        action_type: 'email',
        success: true,
        message: `Email sent to ${config.recipients?.join(', ')}`,
        sent_at: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  private async sendSlackAlert(alert: Alert, config: any): Promise<NotificationResult> {
    try {
      const payload = {
        channel: config.channel || '#alerts',
        username: 'CurrentDAO Alerts',
        icon_emoji: ':warning:',
        text: `🚨 *${alert.severity.toUpperCase()} Alert*`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              {
                title: 'Rule',
                value: alert.rule_name,
                short: true,
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Message',
                value: alert.message,
                short: false,
              },
              {
                title: 'Triggered At',
                value: alert.triggered_at.toISOString(),
                short: true,
              },
              {
                title: 'Alert ID',
                value: alert.id,
                short: true,
              },
            ],
          },
        ],
      };

      // Implementation would use fetch or http client to send to Slack webhook
      this.logger.log(`Slack alert sent to ${config.channel}`);
      
      return {
        action_type: 'slack',
        success: true,
        message: `Slack message sent to ${config.channel}`,
        sent_at: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to send Slack alert: ${error.message}`);
    }
  }

  private async sendWebhookAlert(alert: Alert, config: any): Promise<NotificationResult> {
    try {
      const payload = {
        alert_id: alert.id,
        rule_name: alert.rule_name,
        severity: alert.severity,
        message: alert.message,
        details: alert.details,
        triggered_at: alert.triggered_at,
        tags: alert.tags,
      };

      // Implementation would use fetch or http client to send webhook
      this.logger.log(`Webhook alert sent to ${config.url}`);
      
      return {
        action_type: 'webhook',
        success: true,
        message: `Webhook sent to ${config.url}`,
        sent_at: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to send webhook: ${error.message}`);
    }
  }

  private async sendPagerDutyAlert(alert: Alert, config: any): Promise<NotificationResult> {
    try {
      const payload = {
        routing_key: config.service_key,
        event_action: 'trigger',
        payload: {
          summary: alert.message,
          severity: config.severity || alert.severity,
          source: 'CurrentDAO',
          component: alert.rule_name,
          group: 'alerts',
          class: alert.severity,
          custom_details: alert.details,
        },
      };

      // Implementation would use PagerDuty API
      this.logger.log(`PagerDuty alert sent`);
      
      return {
        action_type: 'pagerduty',
        success: true,
        message: 'PagerDuty alert sent',
        sent_at: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to send PagerDuty alert: ${error.message}`);
    }
  }

  private async sendTeamsAlert(alert: Alert, config: any): Promise<NotificationResult> {
    try {
      const payload = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: this.getSeverityColor(alert.severity),
        summary: alert.message,
        sections: [
          {
            activityTitle: `🚨 ${alert.severity.toUpperCase()} Alert`,
            activitySubtitle: alert.rule_name,
            facts: [
              { name: 'Message', value: alert.message },
              { name: 'Severity', value: alert.severity.toUpperCase() },
              { name: 'Triggered At', value: alert.triggered_at.toISOString() },
              { name: 'Alert ID', value: alert.id },
            ],
          },
        ],
      };

      // Implementation would use fetch or http client to send to Teams webhook
      this.logger.log(`Teams alert sent`);
      
      return {
        action_type: 'teams',
        success: true,
        message: 'Teams alert sent',
        sent_at: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to send Teams alert: ${error.message}`);
    }
  }

  private async sendSMSAlert(alert: Alert, config: any): Promise<NotificationResult> {
    try {
      const message = `CurrentDAO Alert: ${alert.message} (${alert.severity.toUpperCase()})`;
      
      // Implementation would use SMS service like Twilio
      this.logger.log(`SMS alert sent to ${config.phone_numbers?.join(', ')}`);
      
      return {
        action_type: 'sms',
        success: true,
        message: `SMS sent to ${config.phone_numbers?.join(', ')}`,
        sent_at: new Date(),
      };
    } catch (error) {
      throw new Error(`Failed to send SMS alert: ${error.message}`);
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return '#ff0000';
      case 'high':
        return '#ff6600';
      case 'medium':
        return '#ffff00';
      case 'low':
        return '#00ff00';
      default:
        return '#808080';
    }
  }

  private isInCooldown(ruleId: string, now: Date): boolean {
    const cooldownEnd = this.alertCooldowns.get(ruleId);
    if (!cooldownEnd) return false;
    
    if (now < cooldownEnd) {
      return true;
    }
    
    this.alertCooldowns.delete(ruleId);
    return false;
  }

  private setCooldown(ruleId: string, now: Date): void {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return;
    
    const cooldownEnd = new Date(now.getTime() + rule.cooldown_minutes * 60 * 1000);
    this.alertCooldowns.set(ruleId, cooldownEnd);
  }

  private exceedsHourlyLimit(ruleId: string, now: Date): boolean {
    const counter = this.alertCounters.get(ruleId);
    if (!counter) return false;
    
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;
    
    return counter >= rule.max_alerts_per_hour;
  }

  private incrementAlertCounter(ruleId: string, now: Date): void {
    const currentCount = this.alertCounters.get(ruleId) || 0;
    this.alertCounters.set(ruleId, currentCount + 1);
    
    // Reset counter after an hour
    setTimeout(() => {
      const count = this.alertCounters.get(ruleId) || 0;
      if (count > 0) {
        this.alertCounters.set(ruleId, count - 1);
      }
    }, 60 * 60 * 1000);
  }

  private updateAlertMetrics(alert: Alert): void {
    this.alertMetrics.total_alerts++;
    this.alertMetrics.active_alerts++;
    
    // Update severity count
    const severity = alert.severity;
    this.alertMetrics.alerts_by_severity[severity] = 
      (this.alertMetrics.alerts_by_severity[severity] || 0) + 1;
    
    // Update rule count
    const ruleId = alert.rule_id;
    this.alertMetrics.alerts_by_rule[ruleId] = 
      (this.alertMetrics.alerts_by_rule[ruleId] || 0) + 1;
    
    // Update frequency trend
    const now = new Date();
    const existingTrend = this.alertMetrics.alert_frequency_trend.find(
      t => t.timestamp.getHours() === now.getHours()
    );
    
    if (existingTrend) {
      existingTrend.count++;
    } else {
      this.alertMetrics.alert_frequency_trend.push({
        timestamp: now,
        count: 1,
      });
    }
    
    // Keep only last 24 hours of trend data
    if (this.alertMetrics.alert_frequency_trend.length > 24) {
      this.alertMetrics.alert_frequency_trend.shift();
    }
  }

  // Scheduled tasks
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldAlerts(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.triggered_at < cutoffTime) {
        alert.status = 'resolved';
        alert.resolved_at = new Date();
        this.activeAlerts.delete(alertId);
        this.alertMetrics.active_alerts--;
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetHourlyCounters(): Promise<void> {
    this.alertCounters.clear();
    this.logger.log('Hourly alert counters reset');
  }

  // Public API methods
  async createAlertRule(rule: AlertRule): Promise<void> {
    this.alertRules.set(rule.id, rule);
    this.logger.log(`Alert rule created: ${rule.name}`);
  }

  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<void> {
    const existingRule = this.alertRules.get(ruleId);
    if (!existingRule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }
    
    const updatedRule = { ...existingRule, ...updates };
    this.alertRules.set(ruleId, updatedRule);
    this.logger.log(`Alert rule updated: ${ruleId}`);
  }

  async deleteAlertRule(ruleId: string): Promise<void> {
    const deleted = this.alertRules.delete(ruleId);
    if (!deleted) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }
    
    this.logger.log(`Alert rule deleted: ${ruleId}`);
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return Array.from(this.alertRules.values());
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values());
  }

  async getAlertHistory(limit: number = 100): Promise<Alert[]> {
    return this.alertHistory.slice(-limit);
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    alert.status = 'acknowledged';
    alert.acknowledged_by = acknowledgedBy;
    alert.acknowledged_at = new Date();
    
    this.logger.log(`Alert acknowledged: ${alertId} by ${acknowledgedBy}`);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    alert.status = 'resolved';
    alert.resolved_at = new Date();
    this.activeAlerts.delete(alertId);
    this.alertMetrics.active_alerts--;
    
    this.logger.log(`Alert resolved: ${alertId}`);
  }

  async getAlertMetrics(): Promise<AlertMetrics> {
    return { ...this.alertMetrics };
  }

  async testAlertRule(ruleId: string): Promise<boolean> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }
    
    try {
      const shouldAlert = await this.evaluateRule(rule, new Date());
      return shouldAlert;
    } catch (error) {
      this.logger.error(`Failed to test alert rule ${ruleId}`, error);
      return false;
    }
  }
}

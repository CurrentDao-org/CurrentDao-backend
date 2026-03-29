import { Injectable, Logger } from '@nestjs/common';
import {
  SecurityEvent,
  SeverityLevel,
} from '../entities/security-event.entity';

export interface AlertPayload {
  eventId: string;
  type: string;
  severity: SeverityLevel;
  description: string;
  timestamp: Date;
  metadata: any;
  recipients: AlertRecipient[];
}

export interface AlertRecipient {
  type: 'email' | 'webhook' | 'slack' | 'pagerduty';
  address: string;
}

@Injectable()
export class SecurityAlertService {
  private readonly logger = new Logger(SecurityAlertService.name);

  private alertQueue: AlertPayload[] = [];
  private isProcessing = false;

  async sendAlert(event: SecurityEvent): Promise<void> {
    const payload: AlertPayload = {
      eventId: event.id,
      type: event.eventType,
      severity: event.severity,
      description: event.description,
      timestamp: event.createdAt,
      metadata: event.metadata,
      recipients: await this.determineRecipients(event),
    };

    this.alertQueue.push(payload);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.alertQueue.length === 0) return;

    this.isProcessing = true;

    while (this.alertQueue.length > 0) {
      const alert = this.alertQueue.shift();
      try {
        await this.dispatchAlert(alert);
      } catch (error) {
        this.logger.error(`Failed to dispatch alert ${alert.eventId}`, error);
        // Re-queue for retry
        this.alertQueue.push(alert);
      }
    }

    this.isProcessing = false;
  }

  private async dispatchAlert(alert: AlertPayload): Promise<void> {
    this.logger.log(`Dispatching alert: ${alert.type} - ${alert.severity}`);

    // Send to all configured recipients
    for (const recipient of alert.recipients) {
      try {
        switch (recipient.type) {
          case 'email':
            await this.sendEmail(recipient.address, alert);
            break;
          case 'webhook':
            await this.sendWebhook(recipient.address, alert);
            break;
          case 'slack':
            await this.sendSlack(recipient.address, alert);
            break;
          case 'pagerduty':
            await this.sendPagerDuty(recipient.address, alert);
            break;
        }
      } catch (error) {
        this.logger.error(`Failed to send to ${recipient.type}`, error);
      }
    }
  }

  private async determineRecipients(
    event: SecurityEvent,
  ): Promise<AlertRecipient[]> {
    const recipients: AlertRecipient[] = [];

    // Configure based on severity
    if (event.severity === SeverityLevel.CRITICAL) {
      recipients.push(
        { type: 'pagerduty', address: process.env.PAGERDUTY_INTEGRATION_URL },
        { type: 'slack', address: process.env.SLACK_CRITICAL_WEBHOOK_URL },
      );
    } else if (event.severity === SeverityLevel.HIGH) {
      recipients.push(
        { type: 'slack', address: process.env.SLACK_HIGH_WEBHOOK_URL },
        { type: 'email', address: process.env.SECURITY_TEAM_EMAIL },
      );
    } else if (event.severity === SeverityLevel.MEDIUM) {
      recipients.push({
        type: 'email',
        address: process.env.SECURITY_TEAM_EMAIL,
      });
    }

    // Add webhooks for compliance monitoring
    if (process.env.COMPLIANCE_WEBHOOK_URL) {
      recipients.push({
        type: 'webhook',
        address: process.env.COMPLIANCE_WEBHOOK_URL,
      });
    }

    return recipients.filter((r) => r.address);
  }

  private async sendEmail(address: string, alert: AlertPayload): Promise<void> {
    this.logger.log(`Sending email alert to ${address}: ${alert.description}`);
    // Implement actual email sending with SES/SendGrid/etc.
  }

  private async sendWebhook(url: string, alert: AlertPayload): Promise<void> {
    this.logger.log(`Sending webhook alert to ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: alert.type,
        severity: alert.severity,
        description: alert.description,
        timestamp: alert.timestamp,
        metadata: alert.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }
  }

  private async sendSlack(
    webhookUrl: string,
    alert: AlertPayload,
  ): Promise<void> {
    this.logger.log(`Sending Slack alert`);

    const color = this.getSeverityColor(alert.severity);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `🚨 Security Alert: ${alert.type}`,
            fields: [
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              { title: 'Event ID', value: alert.eventId, short: true },
              { title: 'Description', value: alert.description, short: false },
              {
                title: 'Time',
                value: alert.timestamp.toISOString(),
                short: true,
              },
            ],
            footer: 'Security Monitoring System',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed with status ${response.status}`);
    }
  }

  private async sendPagerDuty(url: string, alert: AlertPayload): Promise<void> {
    this.logger.log(`Sending PagerDuty alert`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        dedup_key: alert.eventId,
        payload: {
          summary: alert.description,
          severity: this.mapToPagerDutySeverity(alert.severity),
          source: 'security-monitoring-system',
          component: alert.type,
          group: 'security',
          class: alert.severity,
          custom_details: alert.metadata,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty failed with status ${response.status}`);
    }
  }

  private getSeverityColor(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return 'danger';
      case SeverityLevel.HIGH:
        return 'warning';
      case SeverityLevel.MEDIUM:
        return '#ffcc00';
      case SeverityLevel.LOW:
        return 'good';
    }
  }

  private mapToPagerDutySeverity(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return 'critical';
      case SeverityLevel.HIGH:
        return 'error';
      case SeverityLevel.MEDIUM:
        return 'warning';
      case SeverityLevel.LOW:
        return 'info';
    }
  }

  async getPendingAlerts(): Promise<number> {
    return this.alertQueue.length;
  }

  async clearQueue(): Promise<void> {
    this.alertQueue = [];
  }
}

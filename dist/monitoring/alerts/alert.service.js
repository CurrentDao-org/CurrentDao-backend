"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AlertService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertService = exports.WebhookAlertChannel = exports.SlackAlertChannel = exports.EmailAlertChannel = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const transaction_status_entity_1 = require("../entities/transaction-status.entity");
class EmailAlertChannel {
    constructor() {
        this.name = 'email';
    }
    isEnabled() {
        return process.env.ALERT_EMAIL_ENABLED === 'true';
    }
    async send(alert) {
        if (!this.isEnabled())
            return;
        this.logger.log(`Email alert sent: ${alert.message}`);
    }
}
exports.EmailAlertChannel = EmailAlertChannel;
class SlackAlertChannel {
    constructor() {
        this.name = 'slack';
    }
    isEnabled() {
        return process.env.ALERT_SLACK_ENABLED === 'true';
    }
    async send(alert) {
        if (!this.isEnabled())
            return;
        this.logger.log(`Slack alert sent: ${alert.message}`);
    }
}
exports.SlackAlertChannel = SlackAlertChannel;
class WebhookAlertChannel {
    constructor() {
        this.name = 'webhook';
    }
    isEnabled() {
        return process.env.ALERT_WEBHOOK_ENABLED === 'true';
    }
    async send(alert) {
        if (!this.isEnabled())
            return;
        this.logger.log(`Webhook alert sent: ${alert.message}`);
    }
}
exports.WebhookAlertChannel = WebhookAlertChannel;
let AlertService = AlertService_1 = class AlertService {
    constructor(transactionStatusRepository) {
        this.transactionStatusRepository = transactionStatusRepository;
        this.logger = new common_1.Logger(AlertService_1.name);
        this.channels = new Map();
        this.alertHistory = new Map();
        this.rateLimiter = new Map();
        this.channels.set('email', new EmailAlertChannel());
        this.channels.set('slack', new SlackAlertChannel());
        this.channels.set('webhook', new WebhookAlertChannel());
    }
    async sendStatusChangeAlert(transaction, oldStatus, newStatus) {
        const severity = this.getAlertSeverity(newStatus, transaction.priority);
        const message = `Transaction ${transaction.transactionHash} status changed from ${oldStatus} to ${newStatus}`;
        const alert = {
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
    async sendCriticalAlert(message, metadata) {
        const alert = {
            type: 'critical',
            severity: 'critical',
            message,
            transactionHash: metadata?.transactionHash || 'system',
            metadata,
            timestamp: new Date(),
        };
        await this.sendAlert(alert);
    }
    async sendFailureAlert(transaction, errorMessage) {
        const severity = transaction.priority === transaction_status_entity_1.TransactionPriority.CRITICAL ? 'critical' : 'high';
        const message = `Transaction ${transaction.transactionHash} failed: ${errorMessage}`;
        const alert = {
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
    async sendTimeoutAlert(transaction) {
        const severity = transaction.priority === transaction_status_entity_1.TransactionPriority.CRITICAL ? 'critical' : 'high';
        const message = `Transaction ${transaction.transactionHash} timed out after 5 minutes`;
        const alert = {
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
    async sendRetryAlert(transaction, attempt) {
        const message = `Retrying transaction ${transaction.transactionHash} (attempt ${attempt}/${transaction.maxRetries})`;
        const alert = {
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
    async sendPerformanceAlert(metric, value, threshold, metadata) {
        const message = `Performance alert: ${metric} is ${value} (threshold: ${threshold})`;
        const alert = {
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
    async sendAlert(alert) {
        if (this.isRateLimited(alert.type)) {
            this.logger.warn(`Alert type ${alert.type} is rate limited`);
            return;
        }
        const enabledChannels = Array.from(this.channels.values()).filter(channel => channel.isEnabled() && this.shouldSendToChannel(alert.severity, channel.name));
        const promises = enabledChannels.map(channel => channel.send(alert).catch(error => this.logger.error(`Failed to send alert via ${channel.name}:`, error)));
        await Promise.allSettled(promises);
        this.updateRateLimiter(alert.type);
        this.logger.log(`Alert sent: ${alert.message} (${alert.severity})`);
    }
    async recordAlert(transaction, alert) {
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
        await this.transactionStatusRepository.update({ transactionHash: transaction.transactionHash }, { alerts: entityAlerts });
    }
    getAlertSeverity(status, priority) {
        if (status === transaction_status_entity_1.TransactionStatus.FAILED || status === transaction_status_entity_1.TransactionStatus.TIMEOUT) {
            return priority === transaction_status_entity_1.TransactionPriority.CRITICAL ? 'critical' : 'high';
        }
        if (status === transaction_status_entity_1.TransactionStatus.RETRYING) {
            return priority === transaction_status_entity_1.TransactionPriority.CRITICAL ? 'high' : 'medium';
        }
        return 'low';
    }
    shouldSendToChannel(severity, channelName) {
        const channelThresholds = {
            email: ['medium', 'high', 'critical'],
            slack: ['high', 'critical'],
            webhook: ['critical'],
        };
        const threshold = channelThresholds[channelName] || ['critical'];
        return threshold.includes(severity);
    }
    isRateLimited(alertType) {
        const now = Date.now();
        const lastSent = this.rateLimiter.get(alertType) || 0;
        const rateLimitWindow = 60000;
        return now - lastSent < rateLimitWindow;
    }
    updateRateLimiter(alertType) {
        this.rateLimiter.set(alertType, Date.now());
    }
    async getAlertHistory(transactionHash) {
        return this.alertHistory.get(transactionHash) || [];
    }
    async getSystemAlerts(limit = 100) {
        const allAlerts = [];
        for (const alerts of this.alertHistory.values()) {
            allAlerts.push(...alerts);
        }
        return allAlerts
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
    getAlertStats() {
        const allAlerts = [];
        for (const alerts of this.alertHistory.values()) {
            allAlerts.push(...alerts);
        }
        const alertsByType = allAlerts.reduce((acc, alert) => {
            acc[alert.type] = (acc[alert.type] || 0) + 1;
            return acc;
        }, {});
        const alertsBySeverity = allAlerts.reduce((acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1;
            return acc;
        }, {});
        return {
            totalAlerts: allAlerts.length,
            alertsByType,
            alertsBySeverity,
            rateLimitedTypes: Array.from(this.rateLimiter.keys()),
        };
    }
    registerAlertChannel(channel) {
        this.channels.set(channel.name, channel);
        this.logger.log(`Registered alert channel: ${channel.name}`);
    }
    async testAlertChannels() {
        const testAlert = {
            type: 'test',
            severity: 'low',
            message: 'Test alert from monitoring system',
            transactionHash: 'test',
            timestamp: new Date(),
        };
        const results = {};
        for (const [name, channel] of this.channels) {
            if (channel.isEnabled()) {
                try {
                    await channel.send(testAlert);
                    results[name] = true;
                }
                catch (error) {
                    results[name] = false;
                    this.logger.error(`Test failed for channel ${name}:`, error);
                }
            }
            else {
                results[name] = false;
            }
        }
        return results;
    }
};
exports.AlertService = AlertService;
exports.AlertService = AlertService = AlertService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(transaction_status_entity_1.TransactionStatusEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AlertService);
//# sourceMappingURL=alert.service.js.map
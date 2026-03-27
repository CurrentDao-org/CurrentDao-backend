import { Repository } from 'typeorm';
import { TransactionStatusEntity, TransactionStatus } from '../entities/transaction-status.entity';
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
export declare class EmailAlertChannel implements AlertChannel {
    name: string;
    isEnabled(): boolean;
    send(alert: Alert): Promise<void>;
}
export declare class SlackAlertChannel implements AlertChannel {
    name: string;
    isEnabled(): boolean;
    send(alert: Alert): Promise<void>;
}
export declare class WebhookAlertChannel implements AlertChannel {
    name: string;
    isEnabled(): boolean;
    send(alert: Alert): Promise<void>;
}
export declare class AlertService {
    private readonly transactionStatusRepository;
    private readonly logger;
    private readonly channels;
    private readonly alertHistory;
    private readonly rateLimiter;
    constructor(transactionStatusRepository: Repository<TransactionStatusEntity>);
    sendStatusChangeAlert(transaction: TransactionStatusEntity, oldStatus: TransactionStatus, newStatus: TransactionStatus): Promise<void>;
    sendCriticalAlert(message: string, metadata?: Record<string, any>): Promise<void>;
    sendFailureAlert(transaction: TransactionStatusEntity, errorMessage: string): Promise<void>;
    sendTimeoutAlert(transaction: TransactionStatusEntity): Promise<void>;
    sendRetryAlert(transaction: TransactionStatusEntity, attempt: number): Promise<void>;
    sendPerformanceAlert(metric: string, value: number, threshold: number, metadata?: Record<string, any>): Promise<void>;
    private sendAlert;
    private recordAlert;
    private getAlertSeverity;
    private shouldSendToChannel;
    private isRateLimited;
    private updateRateLimiter;
    getAlertHistory(transactionHash: string): Promise<Alert[]>;
    getSystemAlerts(limit?: number): Promise<Alert[]>;
    getAlertStats(): {
        totalAlerts: number;
        alertsByType: Record<string, number>;
        alertsBySeverity: Record<string, number>;
        rateLimitedTypes: string[];
    };
    registerAlertChannel(channel: AlertChannel): void;
    testAlertChannels(): Promise<Record<string, boolean>>;
}

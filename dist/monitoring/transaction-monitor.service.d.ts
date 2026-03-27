import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TransactionStatusEntity, TransactionStatus } from './entities/transaction-status.entity';
import { CreateTransactionStatusDto, TransactionStatusQueryDto, TransactionAnalyticsDto } from './dto/transaction-status.dto';
import { RetryService } from './retry/retry.service';
import { AlertService } from './alerts/alert.service';
export declare class TransactionMonitorService implements OnModuleInit {
    private readonly transactionStatusRepository;
    private readonly retryService;
    private readonly alertService;
    private readonly logger;
    private readonly server;
    private readonly monitoredTransactions;
    constructor(transactionStatusRepository: Repository<TransactionStatusEntity>, retryService: RetryService, alertService: AlertService);
    onModuleInit(): Promise<void>;
    createTransaction(createDto: CreateTransactionStatusDto): Promise<TransactionStatusEntity>;
    getTransaction(transactionHash: string): Promise<TransactionStatusEntity | null>;
    getTransactions(query: TransactionStatusQueryDto): Promise<{
        transactions: TransactionStatusEntity[];
        total: number;
    }>;
    updateTransactionStatus(transactionHash: string, status: TransactionStatus, errorMessage?: string): Promise<TransactionStatusEntity | null>;
    private loadPendingTransactions;
    private startMonitoring;
    private stopMonitoring;
    private checkTransactionStatus;
    handleTimeoutTransactions(): Promise<void>;
    getTransactionAnalytics(timeRange?: 'hour' | 'day' | 'week' | 'month'): Promise<TransactionAnalyticsDto>;
    private calculateHourlyStats;
    archiveOldTransactions(): Promise<void>;
    performDailyMaintenance(): Promise<void>;
    private cleanupExpiredTransactions;
    getMonitoringStats(): {
        activeMonitors: number;
        totalTransactions: number;
        pendingTransactions: number;
    };
}

import { Repository, DataSource } from 'typeorm';
import { ScheduledJob } from '../entities/scheduled-job.entity';
import { Trade } from '../../energy/entities/trade.entity';
export interface SettlementResult {
    success: boolean;
    settledTrades: string[];
    failedSettlements: Array<{
        tradeId: string;
        error: string;
        retryable: boolean;
        amount?: number;
    }>;
    totalAmount: number;
    processedCount: number;
    executionTime: number;
    details: {
        paymentsProcessed: number;
        deliveriesConfirmed: number;
        commissionsCollected: number;
        refundsProcessed: number;
    };
}
export declare class SettlementJob {
    private readonly scheduledJobRepository;
    private readonly tradeRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(scheduledJobRepository: Repository<ScheduledJob>, tradeRepository: Repository<Trade>, dataSource: DataSource);
    processScheduledSettlements(): Promise<void>;
    executeSettlementJob(job: ScheduledJob): Promise<SettlementResult>;
    private processSettlement;
    private processSingleSettlement;
    private processBatchSettlements;
    private getSettleableTrades;
    private isTradeSettleable;
    private performSettlement;
    private processPayment;
    private confirmDelivery;
    private calculateAndCollectCommission;
    private shouldProcessRefund;
    private processRefund;
    private triggerSettlementNotifications;
    private updateJobStatus;
    private updateJobCompletion;
    private handleJobFailure;
    private shouldRetry;
    private isRetryableError;
    private calculateNextRetryTime;
    private calculateNextRunTime;
    private isWithinMarketHours;
    private rescheduleForMarketHours;
    private getNextMarketOpen;
    private createResult;
    getPendingSettlements(): Promise<Trade[]>;
    getSettlementMetrics(jobId: string): Promise<any>;
}

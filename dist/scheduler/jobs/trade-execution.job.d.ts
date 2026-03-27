import { Repository, DataSource } from 'typeorm';
import { ScheduledJob } from '../entities/scheduled-job.entity';
import { Trade } from '../../energy/entities/trade.entity';
export interface TradeExecutionResult {
    success: boolean;
    processedTrades: string[];
    failedTrades: Array<{
        tradeId: string;
        error: string;
        retryable: boolean;
    }>;
    totalProcessed: number;
    executionTime: number;
    details: any;
}
export declare class TradeExecutionJob {
    private readonly scheduledJobRepository;
    private readonly tradeRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(scheduledJobRepository: Repository<ScheduledJob>, tradeRepository: Repository<Trade>, dataSource: DataSource);
    executeScheduledTrades(): Promise<void>;
    executeTradeJob(job: ScheduledJob): Promise<TradeExecutionResult>;
    private processTradeExecution;
    private executeSingleTrade;
    private executeBatchTrades;
    private performTradeExecution;
    private initializeDeliveryProcess;
    private triggerNotifications;
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
    getJobMetrics(jobId: string): Promise<any>;
    emergencyStop(jobId: string, reason: string): Promise<void>;
}

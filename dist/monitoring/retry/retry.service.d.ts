import { Repository } from 'typeorm';
import { TransactionStatusEntity, TransactionPriority } from '../entities/transaction-status.entity';
import { RetryTransactionDto } from '../dto/transaction-status.dto';
export interface RetryStrategy {
    calculateDelay(attempt: number, priority: TransactionPriority): number;
    shouldRetry(error: any, attempt: number, maxRetries: number): boolean;
}
export declare class ExponentialBackoffStrategy implements RetryStrategy {
    calculateDelay(attempt: number, priority: TransactionPriority): number;
    shouldRetry(error: any, attempt: number, maxRetries: number): boolean;
    private getBaseDelay;
}
export declare class LinearBackoffStrategy implements RetryStrategy {
    calculateDelay(attempt: number, priority: TransactionPriority): number;
    shouldRetry(error: any, attempt: number, maxRetries: number): boolean;
    private isTransientError;
    private getBaseDelay;
}
export declare class RetryService {
    private readonly transactionStatusRepository;
    private readonly logger;
    private readonly retryQueue;
    private readonly activeRetries;
    private readonly strategies;
    constructor(transactionStatusRepository: Repository<TransactionStatusEntity>);
    scheduleRetry(transaction: TransactionStatusEntity, strategy?: string): Promise<void>;
    manualRetry(retryDto: RetryTransactionDto): Promise<TransactionStatusEntity>;
    executeRetry(transaction: TransactionStatusEntity): Promise<void>;
    private checkTransactionOnNetwork;
    private updateTransactionForRetry;
    cancelRetry(transactionHash: string): Promise<void>;
    cancelAllRetries(): Promise<void>;
    getRetryStats(): {
        activeRetries: number;
        queuedRetries: number;
        retryStrategies: string[];
    };
    getRetryHistory(transactionHash: string): Promise<{
        transactionHash: string;
        retryCount: number;
        maxRetries: number;
        lastRetryAt?: Date;
        retryHistory: Array<{
            attempt: number;
            timestamp: Date;
            error?: string;
            delay: number;
        }>;
    }>;
    prioritizeRetries(): Promise<void>;
    registerRetryStrategy(name: string, strategy: RetryStrategy): void;
    getRetryStrategy(name: string): RetryStrategy | undefined;
    onModuleDestroy(): Promise<void>;
}

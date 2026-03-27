import { TransactionStatus, TransactionPriority } from '../entities/transaction-status.entity';
export declare class CreateTransactionStatusDto {
    transactionHash: string;
    priority?: TransactionPriority;
    sourceAccount?: string;
    destinationAccount?: string;
    amount?: number;
    assetCode?: string;
    assetIssuer?: string;
    memo?: string;
    metadata?: Record<string, any>;
    maxRetries?: number;
    timeoutAt?: string;
}
export declare class UpdateTransactionStatusDto {
    status?: TransactionStatus;
    errorMessage?: string;
    metadata?: Record<string, any>;
    retryCount?: number;
    ledgerSequence?: number;
    confirmedAt?: string;
    lastRetryAt?: string;
    timeoutAt?: string;
    expiresAt?: string;
    isArchived?: boolean;
}
export declare class TransactionStatusQueryDto {
    status?: TransactionStatus;
    priority?: TransactionPriority;
    sourceAccount?: string;
    destinationAccount?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export declare class TransactionAlertDto {
    type: string;
    message: string;
    severity: string;
    sentAt: string;
}
export declare class TransactionStatusResponseDto {
    id: string;
    transactionHash: string;
    status: TransactionStatus;
    priority: TransactionPriority;
    sourceAccount?: string;
    destinationAccount?: string;
    amount?: number;
    assetCode?: string;
    assetIssuer?: string;
    memo?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
    retryCount: number;
    maxRetries: number;
    ledgerSequence?: number;
    confirmedAt?: string;
    lastRetryAt?: string;
    timeoutAt?: string;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
    isArchived: boolean;
    alerts?: TransactionAlertDto[];
}
export declare class TransactionAnalyticsDto {
    totalTransactions: number;
    pendingTransactions: number;
    confirmedTransactions: number;
    failedTransactions: number;
    retryingTransactions: number;
    timeoutTransactions: number;
    successRate: number;
    averageConfirmationTime: number;
    averageRetryCount: number;
    statusBreakdown: Record<TransactionStatus, number>;
    priorityBreakdown: Record<TransactionPriority, number>;
    hourlyStats: Record<string, {
        count: number;
        successRate: number;
        averageTime: number;
    }>;
}
export declare class RetryTransactionDto {
    transactionId: string;
    priority?: TransactionPriority;
    maxRetries?: number;
    retryDelay?: number;
}

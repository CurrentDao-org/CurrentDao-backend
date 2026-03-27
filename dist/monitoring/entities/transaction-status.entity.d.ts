export declare enum TransactionStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    FAILED = "failed",
    RETRYING = "retrying",
    TIMEOUT = "timeout"
}
export declare enum TransactionPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare class TransactionStatusEntity {
    id: string;
    transactionHash: string;
    status: TransactionStatus;
    priority: TransactionPriority;
    sourceAccount: string;
    destinationAccount: string;
    amount: number;
    assetCode: string;
    assetIssuer: string;
    memo: string;
    errorMessage: string;
    metadata: Record<string, any>;
    retryCount: number;
    maxRetries: number;
    ledgerSequence: number;
    confirmedAt: Date;
    lastRetryAt: Date;
    timeoutAt: Date;
    createdAt: Date;
    updatedAt: Date;
    expiresAt: Date;
    isArchived: boolean;
    alerts: Array<{
        type: string;
        message: string;
        severity: string;
        sentAt: Date;
    }>;
}

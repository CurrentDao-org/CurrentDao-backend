export declare enum JobType {
    TRADE_EXECUTION = "trade_execution",
    SETTLEMENT = "settlement",
    MAINTENANCE = "maintenance",
    MARKET_OPEN = "market_open",
    MARKET_CLOSE = "market_close",
    DATA_CLEANUP = "data_cleanup",
    REPORT_GENERATION = "report_generation",
    NOTIFICATION = "notification"
}
export declare enum JobStatus {
    PENDING = "pending",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    RETRYING = "retrying"
}
export declare enum JobPriority {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4,
    EMERGENCY = 5
}
export declare enum RetryStrategy {
    IMMEDIATE = "immediate",
    EXPONENTIAL_BACKOFF = "exponential_backoff",
    LINEAR_BACKOFF = "linear_backoff",
    FIXED_INTERVAL = "fixed_interval"
}
export declare class ScheduledJob {
    id: string;
    name: string;
    description: string;
    type: JobType;
    status: JobStatus;
    priority: JobPriority;
    cronExpression: string;
    scheduledAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    nextRunAt?: Date;
    lastRunAt?: Date;
    parameters: {
        tradeId?: string;
        settlementId?: string;
        batchSize?: number;
        timeout?: number;
        retries?: number;
        customData?: Record<string, any>;
    };
    result: {
        success: boolean;
        data?: any;
        output?: string;
        processedCount?: number;
        errorCount?: number;
        duration?: number;
    };
    error: {
        message: string;
        stack?: string;
        code?: string;
        timestamp: Date;
        retryCount: number;
        maxRetries: number;
        nextRetryAt?: Date;
    };
    retryStrategy: RetryStrategy;
    maxRetries: number;
    retryCount: number;
    retryDelay?: number;
    timeoutSeconds: number;
    executionContext: {
        timeZone?: string;
        locale?: string;
        environment?: string;
        version?: string;
        nodeId?: string;
    };
    dependencies: {
        jobIds?: string[];
        conditions?: Array<{
            type: 'job_status' | 'time_based' | 'data_based';
            jobId?: string;
            status?: JobStatus;
            condition?: string;
            value?: any;
        }>;
    };
    notifications: {
        onSuccess?: {
            enabled: boolean;
            channels: string[];
            recipients: string[];
            template?: string;
        };
        onFailure?: {
            enabled: boolean;
            channels: string[];
            recipients: string[];
            template?: string;
            includeStackTrace?: boolean;
        };
        onRetry?: {
            enabled: boolean;
            channels: string[];
            recipients: string[];
            template?: string;
        };
    };
    metrics: {
        executionCount: number;
        successCount: number;
        failureCount: number;
        avgExecutionTime: number;
        minExecutionTime: number;
        maxExecutionTime: number;
        lastExecutionTime?: number;
        totalExecutionTime: number;
    };
    scheduling: {
        isActive: boolean;
        isRecurring: boolean;
        endDate?: Date;
        maxRuns?: number;
        runCount: number;
        skipIfRunning: boolean;
        concurrency: 'allow' | 'forbid' | 'replace';
    };
    resourceLimits: {
        maxMemory?: number;
        maxCpu?: number;
        maxConcurrentJobs?: number;
    };
    createdBy?: string;
    updatedBy?: string;
    executedBy?: string;
    isEmergencyStop: boolean;
    emergencyStopReason?: string;
    emergencyStoppedAt?: Date;
    auditTrail: Array<{
        timestamp: Date;
        action: string;
        userId?: string;
        reason?: string;
        previousStatus?: JobStatus;
        newStatus?: JobStatus;
        details?: any;
    }>;
    tags: string[];
    isActive: boolean;
    isSystemJob: boolean;
    marketHoursOnly: boolean;
    timeZone: string;
    createdAt: Date;
    updatedAt: Date;
}

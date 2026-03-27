import { JobType, JobPriority, RetryStrategy } from '../entities/scheduled-job.entity';
export declare class ExecutionContextDto {
    timeZone?: string;
    locale?: string;
    environment?: string;
    version?: string;
    nodeId?: string;
}
export declare class JobNotificationDto {
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
}
export declare class JobDependencyDto {
    jobIds?: string[];
    conditions?: Array<{
        type: 'job_status' | 'time_based' | 'data_based';
        jobId?: string;
        status?: string;
        condition?: string;
        value?: any;
    }>;
}
export declare class ResourceLimitsDto {
    maxMemory?: number;
    maxCpu?: number;
    maxConcurrentJobs?: number;
}
export declare class SchedulingDto {
    isActive?: boolean;
    isRecurring?: boolean;
    endDate?: string;
    maxRuns?: number;
    skipIfRunning?: boolean;
    concurrency?: 'allow' | 'forbid' | 'replace';
}
export declare class ScheduleTradeDto {
    name: string;
    description?: string;
    type: JobType;
    priority?: JobPriority;
    cronExpression: string;
    scheduledAt: string;
    parameters?: {
        tradeId?: string;
        settlementId?: string;
        batchSize?: number;
        timeout?: number;
        retries?: number;
        customData?: Record<string, any>;
    };
    retryStrategy?: RetryStrategy;
    maxRetries?: number;
    retryDelay?: number;
    timeoutSeconds?: number;
    executionContext?: ExecutionContextDto;
    dependencies?: JobDependencyDto;
    notifications?: JobNotificationDto;
    resourceLimits?: ResourceLimitsDto;
    scheduling?: SchedulingDto;
    tags?: string[];
    marketHoursOnly?: boolean;
    timeZone?: string;
}
export declare class UpdateScheduleDto {
    name?: string;
    description?: string;
    priority?: JobPriority;
    cronExpression?: string;
    scheduledAt?: string;
    parameters?: Record<string, any>;
    isActive?: boolean;
    maxRetries?: number;
    timeoutSeconds?: number;
}
export declare class BulkScheduleDto {
    jobs: ScheduleTradeDto[];
    batchName?: string;
    batchDescription?: string;
    executeSequentially?: boolean;
    delayBetweenJobs?: number;
}
export declare class EmergencyStopDto {
    reason: string;
    scope?: 'all' | 'type' | 'priority' | 'specific';
    jobTypes?: JobType[];
    priorities?: JobPriority[];
    jobIds?: string[];
    allowRestart?: boolean;
    restartAt?: string;
}
export declare class JobQueryDto {
    type?: JobType;
    status?: string;
    priority?: JobPriority;
    name?: string;
    createdBy?: string;
    tags?: string[];
    scheduledAfter?: string;
    scheduledBefore?: string;
    isActive?: boolean;
    isEmergencyStop?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

import { Repository, DataSource } from 'typeorm';
import { ScheduledJob } from '../entities/scheduled-job.entity';
import { Trade } from '../../energy/entities/trade.entity';
export interface MaintenanceResult {
    success: boolean;
    operations: Array<{
        type: string;
        success: boolean;
        processed: number;
        errors: string[];
        duration: number;
    }>;
    totalProcessed: number;
    totalErrors: number;
    executionTime: number;
    details: {
        dataCleanup: {
            recordsDeleted: number;
            spaceFreed: number;
        };
        systemOptimization: {
            indexesOptimized: number;
            cacheCleared: boolean;
        };
        healthChecks: {
            checksPassed: number;
            checksFailed: number;
        };
        reportGeneration: {
            reportsGenerated: number;
        };
    };
}
export declare class MaintenanceJob {
    private readonly scheduledJobRepository;
    private readonly tradeRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(scheduledJobRepository: Repository<ScheduledJob>, tradeRepository: Repository<Trade>, dataSource: DataSource);
    performSystemMaintenance(): Promise<void>;
    performDailyMaintenance(): Promise<void>;
    performWeeklyMaintenance(): Promise<void>;
    executeMaintenanceJob(job: ScheduledJob): Promise<MaintenanceResult>;
    private performDataCleanup;
    private performSystemOptimization;
    private performHealthChecks;
    private generateReports;
    private performRoutineMaintenance;
    private cleanupOldAuditTrails;
    private cleanupOldScheduledJobs;
    private cleanupTemporaryData;
    private optimizeDatabaseIndexes;
    private clearApplicationCache;
    private updateDatabaseStatistics;
    private checkDatabaseHealth;
    private checkSchedulerHealth;
    private checkMemoryUsage;
    private checkDiskSpace;
    private checkConnectivity;
    private generateSchedulerReport;
    private generateSystemReport;
    private generatePerformanceReport;
    private createDailyMaintenanceJob;
    private createWeeklyMaintenanceJob;
    private updateJobStatus;
    private updateJobCompletion;
    private handleJobFailure;
    private shouldRetry;
    private isRetryableError;
    private calculateNextRetryTime;
    private calculateNextRunTime;
    getMaintenanceMetrics(): Promise<any>;
    private getNextScheduledMaintenance;
}

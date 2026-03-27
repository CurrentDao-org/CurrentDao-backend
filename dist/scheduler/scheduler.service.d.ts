import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScheduledJob, JobType, JobPriority } from './entities/scheduled-job.entity';
import { ScheduleTradeDto, UpdateScheduleDto, BulkScheduleDto, EmergencyStopDto, JobQueryDto } from './dto/schedule-trade.dto';
import { TradeExecutionJob } from './jobs/trade-execution.job';
import { SettlementJob } from './jobs/settlement.job';
import { MaintenanceJob } from './jobs/maintenance.job';
export interface SchedulerMetrics {
    totalJobs: number;
    activeJobs: number;
    pendingJobs: number;
    runningJobs: number;
    completedJobs: number;
    failedJobs: number;
    avgExecutionTime: number;
    successRate: number;
    jobsByType: Record<JobType, number>;
    jobsByPriority: Record<JobPriority, number>;
    emergencyStoppedJobs: number;
}
export interface JobExecutionResult {
    success: boolean;
    jobId: string;
    executionTime: number;
    result?: any;
    error?: string;
    nextRunAt?: Date;
}
export declare class SchedulerService implements OnModuleInit {
    private readonly scheduledJobRepository;
    private readonly dataSource;
    private readonly schedulerRegistry;
    private readonly tradeExecutionJob;
    private readonly settlementJob;
    private readonly maintenanceJob;
    private readonly logger;
    private readonly jobExecutors;
    private isEmergencyMode;
    private emergencyReason;
    constructor(scheduledJobRepository: Repository<ScheduledJob>, dataSource: DataSource, schedulerRegistry: SchedulerRegistry, tradeExecutionJob: TradeExecutionJob, settlementJob: SettlementJob, maintenanceJob: MaintenanceJob);
    onModuleInit(): Promise<void>;
    scheduleTrade(scheduleTradeDto: ScheduleTradeDto, userId?: string): Promise<ScheduledJob>;
    updateSchedule(jobId: string, updateScheduleDto: UpdateScheduleDto, userId?: string): Promise<ScheduledJob>;
    bulkSchedule(bulkScheduleDto: BulkScheduleDto, userId?: string): Promise<ScheduledJob[]>;
    executeJob(jobId: string): Promise<JobExecutionResult>;
    cancelJob(jobId: string, userId?: string, reason?: string): Promise<ScheduledJob>;
    emergencyStop(emergencyStopDto: EmergencyStopDto, userId?: string): Promise<{
        stoppedJobs: number;
        affectedJobs: string[];
    }>;
    resumeEmergencyStops(userId?: string): Promise<{
        resumedJobs: number;
        affectedJobs: string[];
    }>;
    getJobs(query?: JobQueryDto): Promise<{
        jobs: ScheduledJob[];
        total: number;
        page: number;
        limit: number;
    }>;
    getJobById(jobId: string): Promise<ScheduledJob>;
    getJobMetrics(jobId: string): Promise<any>;
    getSchedulerMetrics(): Promise<SchedulerMetrics>;
    processPendingJobs(): Promise<void>;
    cleanupExpiredJobs(): Promise<void>;
    private initializeSystemJobs;
    private recoverPendingJobs;
    private checkJobDependencies;
    private getJobsByType;
    private getJobsByPriority;
    private calculateAverageExecutionTime;
    private getNextRunTime;
    isMarketOpen(timeZone?: string): Promise<boolean>;
    getMarketStatus(timeZone?: string): Promise<{
        isOpen: boolean;
        nextOpen: Date;
        nextClose: Date;
        currentSession: string;
    }>;
}

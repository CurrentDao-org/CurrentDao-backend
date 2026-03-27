import { SchedulerService } from '../scheduler.service';
import { MarketHoursService } from '../services/market-hours.service';
import { ScheduleTradeDto, UpdateScheduleDto, BulkScheduleDto, EmergencyStopDto, JobQueryDto } from '../dto/schedule-trade.dto';
import { ScheduledJob } from '../entities/scheduled-job.entity';
export declare class SchedulerController {
    private readonly schedulerService;
    private readonly marketHoursService;
    constructor(schedulerService: SchedulerService, marketHoursService: MarketHoursService);
    scheduleJob(scheduleTradeDto: ScheduleTradeDto, req: any): Promise<ScheduledJob>;
    bulkScheduleJobs(bulkScheduleDto: BulkScheduleDto, req: any): Promise<ScheduledJob[]>;
    getJobs(query: JobQueryDto): Promise<{
        jobs: ScheduledJob[];
        total: number;
        page: number;
        limit: number;
    }>;
    getJob(id: string): Promise<ScheduledJob>;
    updateJob(id: string, updateScheduleDto: UpdateScheduleDto, req: any): Promise<ScheduledJob>;
    executeJob(id: string): Promise<any>;
    cancelJob(id: string, body: {
        reason?: string;
    }, req: any): Promise<ScheduledJob>;
    getJobMetrics(id: string): Promise<any>;
    emergencyStop(emergencyStopDto: EmergencyStopDto, req: any): Promise<any>;
    resumeEmergencyStops(req: any): Promise<any>;
    getMetrics(): Promise<any>;
    getMarketHours(market: string): Promise<any>;
    getMarketStatus(market: string): Promise<any>;
    isMarketOpen(market: string): Promise<{
        isOpen: boolean;
    }>;
    getNextMarketOpen(market: string): Promise<{
        nextOpen: Date;
    }>;
    getNextMarketClose(market: string): Promise<{
        nextClose: Date;
    }>;
    getAllMarketStatuses(): Promise<Record<string, any>>;
    getActiveMarkets(): Promise<string[]>;
    isGloballyOpen(): Promise<{
        isOpen: boolean;
    }>;
    validateExecutionTime(market: string, body: {
        executionTime: string;
    }): Promise<any>;
    adjustForMarketHours(market: string, body: {
        executionTime: string;
    }): Promise<{
        adjustedTime: Date;
    }>;
    getHolidays(market: string, year?: string): Promise<string[]>;
    getTradingCalendar(market: string, year: string): Promise<any>;
    getHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        timestamp: Date;
        metrics: any;
        emergencyMode: boolean;
        activeJobs: number;
        lastExecution: Date | null;
    }>;
    getStatus(): Promise<{
        scheduler: {
            isRunning: boolean;
            uptime: number;
            metrics: any;
        };
        markets: Record<string, any>;
        jobs: {
            total: number;
            pending: number;
            running: number;
            completed: number;
            failed: number;
        };
        system: {
            memoryUsage: number;
            cpuUsage: number;
            diskSpace: number;
        };
    }>;
    triggerMaintenance(body: {
        type: string;
        parameters?: any;
    }): Promise<any>;
    getMaintenanceStatus(): Promise<any>;
}

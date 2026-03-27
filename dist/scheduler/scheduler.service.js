"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const scheduled_job_entity_1 = require("./entities/scheduled-job.entity");
const trade_execution_job_1 = require("./jobs/trade-execution.job");
const settlement_job_1 = require("./jobs/settlement.job");
const maintenance_job_1 = require("./jobs/maintenance.job");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    constructor(scheduledJobRepository, dataSource, schedulerRegistry, tradeExecutionJob, settlementJob, maintenanceJob) {
        this.scheduledJobRepository = scheduledJobRepository;
        this.dataSource = dataSource;
        this.schedulerRegistry = schedulerRegistry;
        this.tradeExecutionJob = tradeExecutionJob;
        this.settlementJob = settlementJob;
        this.maintenanceJob = maintenanceJob;
        this.logger = new common_1.Logger(SchedulerService_1.name);
        this.jobExecutors = new Map();
        this.isEmergencyMode = false;
        this.emergencyReason = '';
    }
    async onModuleInit() {
        this.logger.log('Initializing scheduler service...');
        this.jobExecutors.set(scheduled_job_entity_1.JobType.TRADE_EXECUTION, this.tradeExecutionJob);
        this.jobExecutors.set(scheduled_job_entity_1.JobType.SETTLEMENT, this.settlementJob);
        this.jobExecutors.set(scheduled_job_entity_1.JobType.MAINTENANCE, this.maintenanceJob);
        await this.initializeSystemJobs();
        await this.recoverPendingJobs();
        this.logger.log('Scheduler service initialized successfully');
    }
    async scheduleTrade(scheduleTradeDto, userId) {
        this.logger.log(`Scheduling trade execution: ${scheduleTradeDto.name}`);
        const job = this.scheduledJobRepository.create({
            ...scheduleTradeDto,
            status: scheduled_job_entity_1.JobStatus.PENDING,
            isActive: true,
            createdBy: userId,
            scheduling: {
                isActive: true,
                isRecurring: scheduleTradeDto.scheduling?.isRecurring || false,
                runCount: 0,
                skipIfRunning: scheduleTradeDto.scheduling?.skipIfRunning || false,
                concurrency: scheduleTradeDto.scheduling?.concurrency || 'forbid',
            },
            metrics: {
                executionCount: 0,
                successCount: 0,
                failureCount: 0,
                avgExecutionTime: 0,
                minExecutionTime: 0,
                maxExecutionTime: 0,
                totalExecutionTime: 0,
            },
        });
        if (scheduleTradeDto.scheduledAt) {
            job.scheduledAt = new Date(scheduleTradeDto.scheduledAt);
        }
        const savedJob = await this.scheduledJobRepository.save(job);
        this.logger.log(`Trade execution scheduled: ${savedJob.id}`);
        return savedJob;
    }
    async updateSchedule(jobId, updateScheduleDto, userId) {
        const job = await this.getJobById(jobId);
        if (job.status === scheduled_job_entity_1.JobStatus.RUNNING) {
            throw new Error('Cannot update a job that is currently running');
        }
        if (job.isEmergencyStop) {
            throw new Error('Cannot update a job that has been emergency stopped');
        }
        Object.assign(job, updateScheduleDto);
        job.updatedBy = userId;
        if (updateScheduleDto.scheduledAt) {
            job.scheduledAt = new Date(updateScheduleDto.scheduledAt);
        }
        const updatedJob = await this.scheduledJobRepository.save(job);
        this.logger.log(`Schedule updated: ${jobId}`);
        return updatedJob;
    }
    async bulkSchedule(bulkScheduleDto, userId) {
        this.logger.log(`Bulk scheduling ${bulkScheduleDto.jobs.length} jobs`);
        const jobs = [];
        for (let i = 0; i < bulkScheduleDto.jobs.length; i++) {
            const jobDto = bulkScheduleDto.jobs[i];
            if (bulkScheduleDto.executeSequentially && i > 0) {
                const delay = bulkScheduleDto.delayBetweenJobs || 30;
                const scheduledAt = new Date(Date.now() + (i * delay * 1000));
                jobDto.scheduledAt = scheduledAt.toISOString();
            }
            const job = await this.scheduleTrade(jobDto, userId);
            jobs.push(job);
            if (bulkScheduleDto.executeSequentially) {
                job.dependencies = {
                    jobIds: i > 0 ? [jobs[i - 1].id] : [],
                    conditions: [],
                };
                await this.scheduledJobRepository.save(job);
            }
        }
        this.logger.log(`Bulk scheduling completed: ${jobs.length} jobs created`);
        return jobs;
    }
    async executeJob(jobId) {
        const job = await this.getJobById(jobId);
        if (job.status !== scheduled_job_entity_1.JobStatus.PENDING) {
            throw new Error(`Job ${jobId} is not in pending status: ${job.status}`);
        }
        if (job.isEmergencyStop) {
            throw new Error(`Job ${jobId} has been emergency stopped`);
        }
        const executor = this.jobExecutors.get(job.type);
        if (!executor) {
            throw new Error(`No executor found for job type: ${job.type}`);
        }
        this.logger.log(`Executing job: ${jobId} - ${job.name}`);
        const startTime = Date.now();
        let result;
        try {
            const executionResult = await executor.executeTradeJob(job);
            result = {
                success: executionResult.success,
                jobId,
                executionTime: Date.now() - startTime,
                result: executionResult,
                nextRunAt: job.nextRunAt,
            };
            this.logger.log(`Job ${jobId} execution completed successfully`);
        }
        catch (error) {
            result = {
                success: false,
                jobId,
                executionTime: Date.now() - startTime,
                error: error.message,
            };
            this.logger.error(`Job ${jobId} execution failed`, error);
        }
        return result;
    }
    async cancelJob(jobId, userId, reason) {
        const job = await this.getJobById(jobId);
        if (job.status === scheduled_job_entity_1.JobStatus.RUNNING) {
            throw new Error('Cannot cancel a job that is currently running');
        }
        if (job.status === scheduled_job_entity_1.JobStatus.COMPLETED) {
            throw new Error('Cannot cancel a job that has already completed');
        }
        job.status = scheduled_job_entity_1.JobStatus.CANCELLED;
        job.updatedBy = userId;
        if (!job.auditTrail)
            job.auditTrail = [];
        job.auditTrail.push({
            timestamp: new Date(),
            action: 'cancelled',
            userId,
            reason: reason || 'Job cancelled by user',
        });
        const cancelledJob = await this.scheduledJobRepository.save(job);
        this.logger.log(`Job cancelled: ${jobId}${reason ? ` - ${reason}` : ''}`);
        return cancelledJob;
    }
    async emergencyStop(emergencyStopDto, userId) {
        this.logger.warn(`Emergency stop initiated: ${emergencyStopDto.reason}`);
        this.isEmergencyMode = true;
        this.emergencyReason = emergencyStopDto.reason;
        let queryBuilder = this.scheduledJobRepository.createQueryBuilder('job')
            .where('job.status IN (:...statuses)', { statuses: [scheduled_job_entity_1.JobStatus.PENDING, scheduled_job_entity_1.JobStatus.RETRYING] })
            .andWhere('job.isEmergencyStop = :isEmergencyStop', { isEmergencyStop: false });
        if (emergencyStopDto.scope === 'type' && emergencyStopDto.jobTypes) {
            queryBuilder.andWhere('job.type IN (:...jobTypes)', { jobTypes: emergencyStopDto.jobTypes });
        }
        if (emergencyStopDto.scope === 'priority' && emergencyStopDto.priorities) {
            queryBuilder.andWhere('job.priority IN (:...priorities)', { priorities: emergencyStopDto.priorities });
        }
        if (emergencyStopDto.scope === 'specific' && emergencyStopDto.jobIds) {
            queryBuilder.andWhere('job.id IN (:...jobIds)', { jobIds: emergencyStopDto.jobIds });
        }
        const jobsToStop = await queryBuilder.getMany();
        const stoppedJobs = [];
        const affectedJobs = [];
        for (const job of jobsToStop) {
            job.isEmergencyStop = true;
            job.emergencyStopReason = emergencyStopDto.reason;
            job.emergencyStoppedAt = new Date();
            job.status = scheduled_job_entity_1.JobStatus.CANCELLED;
            if (!job.auditTrail)
                job.auditTrail = [];
            job.auditTrail.push({
                timestamp: new Date(),
                action: 'emergency_stopped',
                userId,
                reason: emergencyStopDto.reason,
            });
            const updatedJob = await this.scheduledJobRepository.save(job);
            stoppedJobs.push(updatedJob);
            affectedJobs.push(updatedJob.id);
        }
        this.logger.warn(`Emergency stop completed: ${stoppedJobs.length} jobs stopped`);
        return {
            stoppedJobs: stoppedJobs.length,
            affectedJobs,
        };
    }
    async resumeEmergencyStops(userId) {
        if (!this.isEmergencyMode) {
            throw new Error('No emergency mode is currently active');
        }
        this.logger.log('Resuming emergency stopped jobs...');
        const stoppedJobs = await this.scheduledJobRepository.find({
            where: {
                isEmergencyStop: true,
                status: scheduled_job_entity_1.JobStatus.CANCELLED,
            },
        });
        const resumedJobs = [];
        const affectedJobs = [];
        for (const job of stoppedJobs) {
            if (job.emergencyStopReason === this.emergencyReason) {
                job.isEmergencyStop = false;
                job.emergencyStopReason = null;
                job.emergencyStoppedAt = null;
                job.status = scheduled_job_entity_1.JobStatus.PENDING;
                job.scheduledAt = new Date(Date.now() + 5 * 60 * 1000);
                if (!job.auditTrail)
                    job.auditTrail = [];
                job.auditTrail.push({
                    timestamp: new Date(),
                    action: 'emergency_resumed',
                    userId,
                    reason: 'Emergency stop lifted',
                });
                const updatedJob = await this.scheduledJobRepository.save(job);
                resumedJobs.push(updatedJob);
                affectedJobs.push(updatedJob.id);
            }
        }
        this.isEmergencyMode = false;
        this.emergencyReason = '';
        this.logger.log(`Emergency stop resumed: ${resumedJobs.length} jobs resumed`);
        return {
            resumedJobs: resumedJobs.length,
            affectedJobs,
        };
    }
    async getJobs(query = {}) {
        const queryBuilder = this.scheduledJobRepository.createQueryBuilder('job');
        if (query.type) {
            queryBuilder.andWhere('job.type = :type', { type: query.type });
        }
        if (query.status) {
            queryBuilder.andWhere('job.status = :status', { status: query.status });
        }
        if (query.priority) {
            queryBuilder.andWhere('job.priority = :priority', { priority: query.priority });
        }
        if (query.name) {
            queryBuilder.andWhere('job.name ILIKE :name', { name: `%${query.name}%` });
        }
        if (query.createdBy) {
            queryBuilder.andWhere('job.createdBy = :createdBy', { createdBy: query.createdBy });
        }
        if (query.tags && query.tags.length > 0) {
            queryBuilder.andWhere('job.tags && :tags', { tags: query.tags });
        }
        if (query.scheduledAfter) {
            queryBuilder.andWhere('job.scheduledAt >= :scheduledAfter', { scheduledAfter: new Date(query.scheduledAfter) });
        }
        if (query.scheduledBefore) {
            queryBuilder.andWhere('job.scheduledAt <= :scheduledBefore', { scheduledBefore: new Date(query.scheduledBefore) });
        }
        if (query.isActive !== undefined) {
            queryBuilder.andWhere('job.isActive = :isActive', { isActive: query.isActive });
        }
        if (query.isEmergencyStop !== undefined) {
            queryBuilder.andWhere('job.isEmergencyStop = :isEmergencyStop', { isEmergencyStop: query.isEmergencyStop });
        }
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'DESC';
        queryBuilder.orderBy(`job.${sortBy}`, sortOrder);
        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 100);
        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        const [jobs, total] = await queryBuilder.getManyAndCount();
        return {
            jobs,
            total,
            page,
            limit,
        };
    }
    async getJobById(jobId) {
        const job = await this.scheduledJobRepository.findOne({
            where: { id: jobId },
            relations: ['dependencies'],
        });
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        return job;
    }
    async getJobMetrics(jobId) {
        const job = await this.getJobById(jobId);
        const executor = this.jobExecutors.get(job.type);
        if (executor && typeof executor.getJobMetrics === 'function') {
            return await executor.getJobMetrics(jobId);
        }
        return {
            jobId: job.id,
            name: job.name,
            type: job.type,
            status: job.status,
            metrics: job.metrics,
            lastExecution: job.lastRunAt,
            nextExecution: job.nextRunAt,
            retryCount: job.retryCount,
            maxRetries: job.maxRetries,
        };
    }
    async getSchedulerMetrics() {
        const [totalJobs, activeJobs, pendingJobs, runningJobs, completedJobs, failedJobs, emergencyStoppedJobs,] = await Promise.all([
            this.scheduledJobRepository.count(),
            this.scheduledJobRepository.count({ where: { isActive: true } }),
            this.scheduledJobRepository.count({ where: { status: scheduled_job_entity_1.JobStatus.PENDING } }),
            this.scheduledJobRepository.count({ where: { status: scheduled_job_entity_1.JobStatus.RUNNING } }),
            this.scheduledJobRepository.count({ where: { status: scheduled_job_entity_1.JobStatus.COMPLETED } }),
            this.scheduledJobRepository.count({ where: { status: scheduled_job_entity_1.JobStatus.FAILED } }),
            this.scheduledJobRepository.count({ where: { isEmergencyStop: true } }),
        ]);
        const jobsByType = await this.getJobsByType();
        const jobsByPriority = await this.getJobsByPriority();
        const avgExecutionTime = await this.calculateAverageExecutionTime();
        const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
        return {
            totalJobs,
            activeJobs,
            pendingJobs,
            runningJobs,
            completedJobs,
            failedJobs,
            avgExecutionTime,
            successRate,
            jobsByType,
            jobsByPriority,
            emergencyStoppedJobs,
        };
    }
    async processPendingJobs() {
        if (this.isEmergencyMode) {
            return;
        }
        try {
            const pendingJobs = await this.scheduledJobRepository.find({
                where: {
                    status: scheduled_job_entity_1.JobStatus.PENDING,
                    isActive: true,
                    isEmergencyStop: false,
                    scheduledAt: (0, typeorm_2.LessThan)(new Date()),
                },
                order: { priority: 'DESC', scheduledAt: 'ASC' },
                take: 10,
            });
            for (const job of pendingJobs) {
                if (await this.checkJobDependencies(job)) {
                    await this.executeJob(job.id);
                }
            }
        }
        catch (error) {
            this.logger.error('Error processing pending jobs', error);
        }
    }
    async cleanupExpiredJobs() {
        try {
            const expiredJobs = await this.scheduledJobRepository.find({
                where: {
                    status: scheduled_job_entity_1.JobStatus.PENDING,
                    scheduledAt: (0, typeorm_2.LessThan)(new Date(Date.now() - 24 * 60 * 60 * 1000)),
                },
            });
            for (const job of expiredJobs) {
                job.status = scheduled_job_entity_1.JobStatus.FAILED;
                job.error = {
                    message: 'Job expired',
                    timestamp: new Date(),
                    retryCount: job.retryCount,
                    maxRetries: job.maxRetries,
                };
                await this.scheduledJobRepository.save(job);
            }
            if (expiredJobs.length > 0) {
                this.logger.log(`Cleaned up ${expiredJobs.length} expired jobs`);
            }
        }
        catch (error) {
            this.logger.error('Error cleaning up expired jobs', error);
        }
    }
    async initializeSystemJobs() {
        this.logger.log('Initializing system jobs...');
        const systemJobs = [
            {
                name: 'Market Open',
                description: 'Daily market opening procedures',
                type: scheduled_job_entity_1.JobType.MARKET_OPEN,
                cronExpression: '0 30 8 * * 1-5',
                priority: scheduled_job_entity_1.JobPriority.HIGH,
                marketHoursOnly: false,
                isSystemJob: true,
                parameters: { action: 'market_open' },
            },
            {
                name: 'Market Close',
                description: 'Daily market closing procedures',
                type: scheduled_job_entity_1.JobType.MARKET_CLOSE,
                cronExpression: '0 0 17 * * 1-5',
                priority: scheduled_job_entity_1.JobPriority.HIGH,
                marketHoursOnly: false,
                isSystemJob: true,
                parameters: { action: 'market_close' },
            },
        ];
        for (const jobConfig of systemJobs) {
            const existingJob = await this.scheduledJobRepository.findOne({
                where: { name: jobConfig.name, type: jobConfig.type },
            });
            if (!existingJob) {
                const job = this.scheduledJobRepository.create({
                    ...jobConfig,
                    status: scheduled_job_entity_1.JobStatus.PENDING,
                    isActive: true,
                    scheduledAt: this.getNextRunTime(jobConfig.cronExpression),
                    retryStrategy: scheduled_job_entity_1.RetryStrategy.EXPONENTIAL_BACKOFF,
                    maxRetries: 2,
                    timeoutSeconds: 300,
                    scheduling: {
                        isActive: true,
                        isRecurring: true,
                    },
                    metrics: {
                        executionCount: 0,
                        successCount: 0,
                        failureCount: 0,
                        avgExecutionTime: 0,
                        minExecutionTime: 0,
                        maxExecutionTime: 0,
                        totalExecutionTime: 0,
                    },
                });
                await this.scheduledJobRepository.save(job);
                this.logger.log(`System job initialized: ${jobConfig.name}`);
            }
        }
    }
    async recoverPendingJobs() {
        this.logger.log('Recovering pending jobs...');
        const runningJobs = await this.scheduledJobRepository.find({
            where: { status: scheduled_job_entity_1.JobStatus.RUNNING },
        });
        for (const job of runningJobs) {
            const timeSinceStart = Date.now() - job.startedAt.getTime();
            const timeoutMs = job.timeoutSeconds * 1000;
            if (timeSinceStart > timeoutMs) {
                job.status = scheduled_job_entity_1.JobStatus.FAILED;
                job.error = {
                    message: 'Job timeout during recovery',
                    timestamp: new Date(),
                    retryCount: job.retryCount,
                    maxRetries: job.maxRetries,
                };
                await this.scheduledJobRepository.save(job);
                this.logger.warn(`Job ${job.id} marked as failed due to timeout during recovery`);
            }
        }
    }
    async checkJobDependencies(job) {
        if (!job.dependencies?.jobIds || job.dependencies.jobIds.length === 0) {
            return true;
        }
        const dependencyJobs = await this.scheduledJobRepository.find({
            where: { id: In(job.dependencies.jobIds) },
        });
        for (const depJob of dependencyJobs) {
            if (depJob.status !== scheduled_job_entity_1.JobStatus.COMPLETED) {
                return false;
            }
        }
        return true;
    }
    async getJobsByType() {
        const result = {};
        for (const jobType of Object.values(scheduled_job_entity_1.JobType)) {
            result[jobType] = await this.scheduledJobRepository.count({
                where: { type: jobType },
            });
        }
        return result;
    }
    async getJobsByPriority() {
        const result = {};
        for (const priority of Object.values(scheduled_job_entity_1.JobPriority)) {
            result[priority] = await this.scheduledJobRepository.count({
                where: { priority },
            });
        }
        return result;
    }
    async calculateAverageExecutionTime() {
        const jobs = await this.scheduledJobRepository.find({
            where: { status: scheduled_job_entity_1.JobStatus.COMPLETED },
            select: ['metrics'],
        });
        if (jobs.length === 0)
            return 0;
        const totalTime = jobs.reduce((sum, job) => sum + (job.metrics?.avgExecutionTime || 0), 0);
        return totalTime / jobs.length;
    }
    getNextRunTime(cronExpression) {
        return new Date(Date.now() + 60 * 60 * 1000);
    }
    async isMarketOpen(timeZone = 'UTC') {
        const now = new Date();
        try {
            const options = {
                timeZone,
                hour: '2-digit',
                hour12: false,
                weekday: 'long',
            };
            const dateTimeString = now.toLocaleString('en-US', options);
            const [timeString, dayString] = dateTimeString.split(', ');
            const currentHour = parseInt(timeString.split(':')[0]);
            const isWeekday = !['Saturday', 'Sunday'].includes(dayString.trim());
            return isWeekday && currentHour >= 9 && currentHour < 17;
        }
        catch (error) {
            this.logger.warn(`Error checking market hours for timezone ${timeZone}`, error);
            return true;
        }
    }
    async getMarketStatus(timeZone = 'UTC') {
        const now = new Date();
        const isOpen = await this.isMarketOpen(timeZone);
        let nextOpen;
        let nextClose;
        if (isOpen) {
            nextClose = new Date(now);
            nextClose.setUTCHours(17, 0, 0, 0);
            nextOpen = new Date(now);
            nextOpen.setDate(nextOpen.getDate() + 1);
            nextOpen.setUTCHours(14, 0, 0, 0);
        }
        else {
            nextOpen = new Date(now);
            nextOpen.setUTCHours(14, 0, 0, 0);
            if (nextOpen <= now) {
                nextOpen.setDate(nextOpen.getDate() + 1);
            }
            nextClose = new Date(nextOpen);
            nextClose.setUTCHours(17, 0, 0, 0);
        }
        return {
            isOpen,
            nextOpen,
            nextClose,
            currentSession: isOpen ? 'open' : 'closed',
        };
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "processPendingJobs", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "cleanupExpiredJobs", null);
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scheduled_job_entity_1.ScheduledJob)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        schedule_1.SchedulerRegistry,
        trade_execution_job_1.TradeExecutionJob,
        settlement_job_1.SettlementJob,
        maintenance_job_1.MaintenanceJob])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map
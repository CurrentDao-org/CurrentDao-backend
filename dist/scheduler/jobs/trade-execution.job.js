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
var TradeExecutionJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeExecutionJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const scheduled_job_entity_1 = require("../entities/scheduled-job.entity");
const trade_entity_1 = require("../../energy/entities/trade.entity");
let TradeExecutionJob = TradeExecutionJob_1 = class TradeExecutionJob {
    constructor(scheduledJobRepository, tradeRepository, dataSource) {
        this.scheduledJobRepository = scheduledJobRepository;
        this.tradeRepository = tradeRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(TradeExecutionJob_1.name);
    }
    async executeScheduledTrades() {
        this.logger.log('Checking for scheduled trade executions...');
        try {
            const pendingJobs = await this.scheduledJobRepository.find({
                where: {
                    type: 'trade_execution',
                    status: scheduled_job_entity_1.JobStatus.PENDING,
                    isActive: true,
                    isEmergencyStop: false,
                    scheduledAt: LessThan(new Date()),
                },
                order: { priority: 'DESC', scheduledAt: 'ASC' },
            });
            if (pendingJobs.length === 0) {
                this.logger.debug('No pending trade execution jobs found');
                return;
            }
            this.logger.log(`Found ${pendingJobs.length} pending trade execution jobs`);
            for (const job of pendingJobs) {
                await this.executeTradeJob(job);
            }
        }
        catch (error) {
            this.logger.error('Error in trade execution scheduler', error);
        }
    }
    async executeTradeJob(job) {
        const startTime = Date.now();
        this.logger.log(`Executing trade job: ${job.id} - ${job.name}`);
        try {
            await this.updateJobStatus(job, scheduled_job_entity_1.JobStatus.RUNNING);
            if (job.marketHoursOnly && !this.isWithinMarketHours(job.timeZone)) {
                await this.rescheduleForMarketHours(job);
                return this.createResult(false, [], [], 0, Date.now() - startTime, { reason: 'Outside market hours' });
            }
            const result = await this.processTradeExecution(job);
            await this.updateJobCompletion(job, result);
            const executionTime = Date.now() - startTime;
            this.logger.log(`Trade job ${job.id} completed in ${executionTime}ms. Processed: ${result.totalProcessed}, Success: ${result.success}`);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`Trade job ${job.id} failed`, error);
            await this.handleJobFailure(job, error, executionTime);
            return this.createResult(false, [], [], 0, executionTime, { error: error.message });
        }
    }
    async processTradeExecution(job) {
        const parameters = job.parameters || {};
        const tradeId = parameters.tradeId;
        if (tradeId) {
            return await this.executeSingleTrade(tradeId, job);
        }
        else {
            return await this.executeBatchTrades(job);
        }
    }
    async executeSingleTrade(tradeId, job) {
        const startTime = Date.now();
        try {
            const trade = await this.tradeRepository.findOne({
                where: { id: tradeId },
                relations: ['listing', 'bid'],
            });
            if (!trade) {
                throw new Error(`Trade ${tradeId} not found`);
            }
            if (trade.status !== trade_entity_1.TradeStatus.PENDING && trade.status !== trade_entity_1.TradeStatus.CONFIRMED) {
                throw new Error(`Trade ${tradeId} is not in executable status: ${trade.status}`);
            }
            const result = await this.performTradeExecution(trade, job);
            return {
                success: true,
                processedTrades: [tradeId],
                failedTrades: [],
                totalProcessed: 1,
                executionTime: Date.now() - startTime,
                details: result,
            };
        }
        catch (error) {
            return {
                success: false,
                processedTrades: [],
                failedTrades: [{
                        tradeId,
                        error: error.message,
                        retryable: this.isRetryableError(error),
                    }],
                totalProcessed: 0,
                executionTime: Date.now() - startTime,
                details: { error: error.message },
            };
        }
    }
    async executeBatchTrades(job) {
        const startTime = Date.now();
        const batchSize = job.parameters?.batchSize || 10;
        const processedTrades = [];
        const failedTrades = [];
        try {
            const pendingTrades = await this.tradeRepository.find({
                where: {
                    status: trade_entity_1.TradeStatus.CONFIRMED,
                    paymentStatus: trade_entity_1.PaymentStatus.COMPLETED,
                },
                relations: ['listing', 'bid'],
                take: batchSize,
                order: { createdAt: 'ASC' },
            });
            this.logger.log(`Processing batch of ${pendingTrades.length} trades`);
            for (const trade of pendingTrades) {
                try {
                    const result = await this.performTradeExecution(trade, job);
                    processedTrades.push(trade.id);
                    this.logger.debug(`Successfully executed trade ${trade.id}`);
                }
                catch (error) {
                    failedTrades.push({
                        tradeId: trade.id,
                        error: error.message,
                        retryable: this.isRetryableError(error),
                    });
                    this.logger.error(`Failed to execute trade ${trade.id}`, error);
                }
            }
            const totalProcessed = processedTrades.length + failedTrades.length;
            const success = failedTrades.length === 0;
            return {
                success,
                processedTrades,
                failedTrades,
                totalProcessed,
                executionTime: Date.now() - startTime,
                details: {
                    batchSize,
                    successRate: processedTrades.length / totalProcessed,
                },
            };
        }
        catch (error) {
            return {
                success: false,
                processedTrades,
                failedTrades,
                totalProcessed: processedTrades.length + failedTrades.length,
                executionTime: Date.now() - startTime,
                details: { error: error.message },
            };
        }
    }
    async performTradeExecution(trade, job) {
        return await this.dataSource.transaction(async (manager) => {
            const executionDetails = {
                executedAt: new Date(),
                executedBy: job.id,
                previousStatus: trade.status,
            };
            trade.status = trade_entity_1.TradeStatus.IN_PROGRESS;
            trade.deliveryStatus = trade_entity_1.DeliveryStatus.SCHEDULED;
            if (!trade.auditTrail)
                trade.auditTrail = [];
            trade.auditTrail.push({
                timestamp: new Date(),
                action: 'trade_execution_started',
                userId: 'system',
                reason: `Scheduled execution by job ${job.id}`,
                details: executionDetails,
            });
            await manager.save(trade);
            await this.initializeDeliveryProcess(trade, manager);
            await this.triggerNotifications(trade, 'execution_started', manager);
            const result = {
                tradeId: trade.id,
                status: trade.status,
                deliveryStatus: trade.deliveryStatus,
                executedAt: trade.updatedAt,
                nextSteps: ['delivery_scheduled', 'payment_verified'],
            };
            this.logger.log(`Trade ${trade.id} execution initiated successfully`);
            return result;
        });
    }
    async initializeDeliveryProcess(trade, manager) {
        if (trade.deliveryDetails?.deliveryDate) {
            const deliveryDate = new Date(trade.deliveryDetails.deliveryDate);
            const now = new Date();
            if (deliveryDate <= now) {
                trade.deliveryStatus = trade_entity_1.DeliveryStatus.IN_TRANSIT;
                trade.deliveryConfirmedAt = new Date();
            }
            else {
                trade.deliveryStatus = trade_entity_1.DeliveryStatus.SCHEDULED;
            }
            await manager.save(trade);
        }
    }
    async triggerNotifications(trade, event, manager) {
        this.logger.log(`Triggering ${event} notifications for trade ${trade.id}`);
    }
    async updateJobStatus(job, status) {
        job.status = status;
        job.updatedAt = new Date();
        if (status === scheduled_job_entity_1.JobStatus.RUNNING) {
            job.startedAt = new Date();
        }
        await this.scheduledJobRepository.save(job);
    }
    async updateJobCompletion(job, result) {
        job.status = result.success ? scheduled_job_entity_1.JobStatus.COMPLETED : scheduled_job_entity_1.JobStatus.FAILED;
        job.completedAt = new Date();
        job.result = {
            success: result.success,
            data: result.details,
            processedCount: result.totalProcessed,
            errorCount: result.failedTrades.length,
            duration: result.executionTime,
        };
        if (!job.metrics)
            job.metrics = {
                executionCount: 0,
                successCount: 0,
                failureCount: 0,
                avgExecutionTime: 0,
                minExecutionTime: 0,
                maxExecutionTime: 0,
                totalExecutionTime: 0,
            };
        job.metrics.executionCount++;
        if (result.success) {
            job.metrics.successCount++;
        }
        else {
            job.metrics.failureCount++;
        }
        job.metrics.totalExecutionTime += result.executionTime;
        job.metrics.avgExecutionTime = job.metrics.totalExecutionTime / job.metrics.executionCount;
        if (job.metrics.minExecutionTime === 0 || result.executionTime < job.metrics.minExecutionTime) {
            job.metrics.minExecutionTime = result.executionTime;
        }
        if (result.executionTime > job.metrics.maxExecutionTime) {
            job.metrics.maxExecutionTime = result.executionTime;
        }
        if (job.scheduling?.isRecurring && job.scheduling.isActive) {
            job.nextRunAt = this.calculateNextRunTime(job);
            job.status = scheduled_job_entity_1.JobStatus.PENDING;
        }
        await this.scheduledJobRepository.save(job);
    }
    async handleJobFailure(job, error, executionTime) {
        job.retryCount++;
        job.status = scheduled_job_entity_1.JobStatus.FAILED;
        job.completedAt = new Date();
        job.error = {
            message: error.message,
            stack: error.stack,
            timestamp: new Date(),
            retryCount: job.retryCount,
            maxRetries: job.maxRetries,
        };
        if (this.shouldRetry(job)) {
            const nextRetryAt = this.calculateNextRetryTime(job);
            job.error.nextRetryAt = nextRetryAt;
            job.status = scheduled_job_entity_1.JobStatus.RETRYING;
            job.scheduledAt = nextRetryAt;
        }
        await this.scheduledJobRepository.save(job);
    }
    shouldRetry(job) {
        return job.retryCount < job.maxRetries && this.isRetryableError(job.error);
    }
    isRetryableError(error) {
        const retryableErrors = [
            'TIMEOUT',
            'CONNECTION_ERROR',
            'TEMPORARY_FAILURE',
            'RATE_LIMITED',
            'SERVICE_UNAVAILABLE',
        ];
        const errorMessage = error?.message?.toUpperCase() || '';
        return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
    }
    calculateNextRetryTime(job) {
        const baseDelay = job.retryDelay || 5;
        let delay;
        switch (job.retryStrategy) {
            case scheduled_job_entity_1.RetryStrategy.IMMEDIATE:
                delay = 0;
                break;
            case scheduled_job_entity_1.RetryStrategy.EXPONENTIAL_BACKOFF:
                delay = baseDelay * Math.pow(2, job.retryCount - 1);
                break;
            case scheduled_job_entity_1.RetryStrategy.LINEAR_BACKOFF:
                delay = baseDelay * job.retryCount;
                break;
            case scheduled_job_entity_1.RetryStrategy.FIXED_INTERVAL:
                delay = baseDelay;
                break;
            default:
                delay = baseDelay;
        }
        const maxDelay = 3600;
        delay = Math.min(delay, maxDelay);
        return new Date(Date.now() + delay * 1000);
    }
    calculateNextRunTime(job) {
        const now = new Date();
        const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        if (job.scheduling?.endDate && nextRun > job.scheduling.endDate) {
            job.scheduling.isActive = false;
        }
        return nextRun;
    }
    isWithinMarketHours(timeZone = 'UTC') {
        const now = new Date();
        try {
            const options = {
                timeZone,
                hour: '2-digit',
                hour12: false,
            };
            const timeString = now.toLocaleTimeString('en-US', options);
            const currentHour = parseInt(timeString);
            const dayOptions = {
                timeZone,
                weekday: 'long',
            };
            const dayString = now.toLocaleDateString('en-US', dayOptions);
            const isWeekday = !['Saturday', 'Sunday'].includes(dayString);
            return isWeekday && currentHour >= 9 && currentHour < 17;
        }
        catch (error) {
            this.logger.warn(`Error checking market hours for timezone ${timeZone}`, error);
            return true;
        }
    }
    async rescheduleForMarketHours(job) {
        const nextMarketOpen = this.getNextMarketOpen(job.timeZone);
        job.scheduledAt = nextMarketOpen;
        job.status = scheduled_job_entity_1.JobStatus.PENDING;
        await this.scheduledJobRepository.save(job);
        this.logger.log(`Job ${job.id} rescheduled for market open at ${nextMarketOpen.toISOString()}`);
    }
    getNextMarketOpen(timeZone = 'UTC') {
        const now = new Date();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        try {
            const marketOpen = new Date(tomorrow);
            marketOpen.setUTCHours(14, 0, 0, 0);
            const options = {
                timeZone,
                weekday: 'long',
            };
            const dayString = marketOpen.toLocaleDateString('en-US', options);
            if (['Saturday', 'Sunday'].includes(dayString)) {
                marketOpen.setDate(marketOpen.getDate() + (dayString === 'Saturday' ? 2 : 1));
            }
            return marketOpen;
        }
        catch (error) {
            this.logger.warn(`Error calculating next market open for timezone ${timeZone}`, error);
            return new Date(Date.now() + 60 * 60 * 1000);
        }
    }
    createResult(success, processedTrades, failedTrades, totalProcessed, executionTime, details) {
        return {
            success,
            processedTrades,
            failedTrades,
            totalProcessed,
            executionTime,
            details,
        };
    }
    async getJobMetrics(jobId) {
        const job = await this.scheduledJobRepository.findOne({
            where: { id: jobId },
        });
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
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
    async emergencyStop(jobId, reason) {
        const job = await this.scheduledJobRepository.findOne({
            where: { id: jobId },
        });
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        job.isEmergencyStop = true;
        job.emergencyStopReason = reason;
        job.emergencyStoppedAt = new Date();
        job.status = scheduled_job_entity_1.JobStatus.CANCELLED;
        await this.scheduledJobRepository.save(job);
        this.logger.warn(`Emergency stop triggered for job ${jobId}: ${reason}`);
    }
};
exports.TradeExecutionJob = TradeExecutionJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TradeExecutionJob.prototype, "executeScheduledTrades", null);
exports.TradeExecutionJob = TradeExecutionJob = TradeExecutionJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scheduled_job_entity_1.ScheduledJob)),
    __param(1, (0, typeorm_1.InjectRepository)(trade_entity_1.Trade)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], TradeExecutionJob);
//# sourceMappingURL=trade-execution.job.js.map
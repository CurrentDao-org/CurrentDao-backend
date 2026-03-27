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
var SettlementJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const scheduled_job_entity_1 = require("../entities/scheduled-job.entity");
const trade_entity_1 = require("../../energy/entities/trade.entity");
let SettlementJob = SettlementJob_1 = class SettlementJob {
    constructor(scheduledJobRepository, tradeRepository, dataSource) {
        this.scheduledJobRepository = scheduledJobRepository;
        this.tradeRepository = tradeRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SettlementJob_1.name);
    }
    async processScheduledSettlements() {
        this.logger.log('Checking for scheduled settlement processing...');
        try {
            const pendingJobs = await this.scheduledJobRepository.find({
                where: {
                    type: 'settlement',
                    status: scheduled_job_entity_1.JobStatus.PENDING,
                    isActive: true,
                    isEmergencyStop: false,
                    scheduledAt: (0, typeorm_2.LessThan)(new Date()),
                },
                order: { priority: 'DESC', scheduledAt: 'ASC' },
            });
            if (pendingJobs.length === 0) {
                this.logger.debug('No pending settlement jobs found');
                return;
            }
            this.logger.log(`Found ${pendingJobs.length} pending settlement jobs`);
            for (const job of pendingJobs) {
                await this.executeSettlementJob(job);
            }
        }
        catch (error) {
            this.logger.error('Error in settlement scheduler', error);
        }
    }
    async executeSettlementJob(job) {
        const startTime = Date.now();
        this.logger.log(`Executing settlement job: ${job.id} - ${job.name}`);
        try {
            await this.updateJobStatus(job, scheduled_job_entity_1.JobStatus.RUNNING);
            if (job.marketHoursOnly && !this.isWithinMarketHours(job.timeZone)) {
                await this.rescheduleForMarketHours(job);
                return this.createResult(false, [], [], 0, 0, {
                    paymentsProcessed: 0,
                    deliveriesConfirmed: 0,
                    commissionsCollected: 0,
                    refundsProcessed: 0,
                });
            }
            const result = await this.processSettlement(job);
            await this.updateJobCompletion(job, result);
            const executionTime = Date.now() - startTime;
            this.logger.log(`Settlement job ${job.id} completed in ${executionTime}ms. Settled: ${result.settledTrades.length}, Amount: ${result.totalAmount}`);
            return result;
        }
        catch (error) {
            const executionTime = Date.now() - startTime;
            this.logger.error(`Settlement job ${job.id} failed`, error);
            await this.handleJobFailure(job, error, executionTime);
            return this.createResult(false, [], [], 0, executionTime, {
                paymentsProcessed: 0,
                deliveriesConfirmed: 0,
                commissionsCollected: 0,
                refundsProcessed: 0,
            });
        }
    }
    async processSettlement(job) {
        const parameters = job.parameters || {};
        const settlementId = parameters.settlementId;
        if (settlementId) {
            return await this.processSingleSettlement(settlementId, job);
        }
        else {
            return await this.processBatchSettlements(job);
        }
    }
    async processSingleSettlement(settlementId, job) {
        const startTime = Date.now();
        try {
            const trade = await this.tradeRepository.findOne({
                where: { id: settlementId },
                relations: ['listing', 'bid'],
            });
            if (!trade) {
                throw new Error(`Trade ${settlementId} not found`);
            }
            if (!this.isTradeSettleable(trade)) {
                throw new Error(`Trade ${settlementId} is not ready for settlement: ${trade.status}/${trade.deliveryStatus}`);
            }
            const result = await this.performSettlement(trade, job);
            return {
                success: true,
                settledTrades: [settlementId],
                failedSettlements: [],
                totalAmount: trade.finalAmount || 0,
                processedCount: 1,
                executionTime: Date.now() - startTime,
                details: result,
            };
        }
        catch (error) {
            return {
                success: false,
                settledTrades: [],
                failedSettlements: [{
                        tradeId: settlementId,
                        error: error.message,
                        retryable: this.isRetryableError(error),
                    }],
                totalAmount: 0,
                processedCount: 0,
                executionTime: Date.now() - startTime,
                details: {
                    paymentsProcessed: 0,
                    deliveriesConfirmed: 0,
                    commissionsCollected: 0,
                    refundsProcessed: 0,
                },
            };
        }
    }
    async processBatchSettlements(job) {
        const startTime = Date.now();
        const batchSize = job.parameters?.batchSize || 20;
        const settledTrades = [];
        const failedSettlements = [];
        let totalAmount = 0;
        const details = {
            paymentsProcessed: 0,
            deliveriesConfirmed: 0,
            commissionsCollected: 0,
            refundsProcessed: 0,
        };
        try {
            const eligibleTrades = await this.getSettleableTrades(batchSize);
            this.logger.log(`Processing batch settlement of ${eligibleTrades.length} trades`);
            for (const trade of eligibleTrades) {
                try {
                    const result = await this.performSettlement(trade, job);
                    settledTrades.push(trade.id);
                    totalAmount += trade.finalAmount || 0;
                    details.paymentsProcessed += result.paymentsProcessed || 0;
                    details.deliveriesConfirmed += result.deliveriesConfirmed || 0;
                    details.commissionsCollected += result.commissionsCollected || 0;
                    details.refundsProcessed += result.refundsProcessed || 0;
                    this.logger.debug(`Successfully settled trade ${trade.id}`);
                }
                catch (error) {
                    failedSettlements.push({
                        tradeId: trade.id,
                        error: error.message,
                        retryable: this.isRetryableError(error),
                        amount: trade.finalAmount,
                    });
                    this.logger.error(`Failed to settle trade ${trade.id}`, error);
                }
            }
            const totalProcessed = settledTrades.length + failedSettlements.length;
            const success = failedSettlements.length === 0;
            return {
                success,
                settledTrades,
                failedSettlements,
                totalAmount,
                processedCount: totalProcessed,
                executionTime: Date.now() - startTime,
                details,
            };
        }
        catch (error) {
            return {
                success: false,
                settledTrades,
                failedSettlements,
                totalAmount,
                processedCount: settledTrades.length + failedSettlements.length,
                executionTime: Date.now() - startTime,
                details,
            };
        }
    }
    async getSettleableTrades(limit) {
        return await this.tradeRepository.find({
            where: [
                {
                    status: trade_entity_1.TradeStatus.IN_PROGRESS,
                    deliveryStatus: trade_entity_1.DeliveryStatus.DELIVERED,
                    paymentStatus: trade_entity_1.PaymentStatus.PENDING,
                },
                {
                    status: trade_entity_1.TradeStatus.IN_PROGRESS,
                    deliveryStatus: trade_entity_1.DeliveryStatus.DELIVERED,
                    paymentStatus: trade_entity_1.PaymentStatus.PROCESSING,
                },
            ],
            relations: ['listing', 'bid'],
            take: limit,
            order: { deliveryConfirmedAt: 'ASC' },
        });
    }
    isTradeSettleable(trade) {
        return ((trade.status === trade_entity_1.TradeStatus.IN_PROGRESS || trade.status === trade_entity_1.TradeStatus.CONFIRMED) &&
            (trade.deliveryStatus === trade_entity_1.DeliveryStatus.DELIVERED || trade.deliveryStatus === trade_entity_1.DeliveryStatus.CONFIRMED) &&
            (trade.paymentStatus === trade_entity_1.PaymentStatus.PENDING || trade.paymentStatus === trade_entity_1.PaymentStatus.PROCESSING));
    }
    async performSettlement(trade, job) {
        return await this.dataSource.transaction(async (manager) => {
            const settlementDetails = {
                settledAt: new Date(),
                settledBy: job.id,
                previousStatus: trade.status,
                previousPaymentStatus: trade.paymentStatus,
            };
            let paymentsProcessed = 0;
            let commissionsCollected = 0;
            let refundsProcessed = 0;
            if (trade.paymentStatus === trade_entity_1.PaymentStatus.PENDING) {
                await this.processPayment(trade, manager);
                paymentsProcessed = 1;
            }
            if (trade.deliveryStatus === trade_entity_1.DeliveryStatus.DELIVERED) {
                await this.confirmDelivery(trade, manager);
            }
            const commission = await this.calculateAndCollectCommission(trade, manager);
            commissionsCollected = commission > 0 ? 1 : 0;
            if (this.shouldProcessRefund(trade)) {
                await this.processRefund(trade, manager);
                refundsProcessed = 1;
            }
            trade.status = trade_entity_1.TradeStatus.COMPLETED;
            trade.paymentStatus = trade_entity_1.PaymentStatus.COMPLETED;
            trade.completedAt = new Date();
            trade.paymentCompletedAt = new Date();
            if (!trade.auditTrail)
                trade.auditTrail = [];
            trade.auditTrail.push({
                timestamp: new Date(),
                action: 'trade_settled',
                userId: 'system',
                reason: `Automated settlement by job ${job.id}`,
                details: settlementDetails,
            });
            await manager.save(trade);
            await this.triggerSettlementNotifications(trade, 'settlement_completed', manager);
            const result = {
                tradeId: trade.id,
                status: trade.status,
                paymentStatus: trade.paymentStatus,
                settledAt: trade.completedAt,
                totalAmount: trade.finalAmount,
                paymentsProcessed,
                commissionsCollected,
                refundsProcessed,
            };
            this.logger.log(`Trade ${trade.id} settlement completed successfully`);
            return result;
        });
    }
    async processPayment(trade, manager) {
        this.logger.log(`Processing payment for trade ${trade.id}`);
        if (trade.paymentDetails?.paymentSchedule) {
            for (const payment of trade.paymentDetails.paymentSchedule) {
                if (payment.status === 'pending') {
                    payment.status = 'completed';
                    payment.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                }
            }
        }
        trade.paymentStatus = trade_entity_1.PaymentStatus.PROCESSING;
        await manager.save(trade);
    }
    async confirmDelivery(trade, manager) {
        this.logger.log(`Confirming delivery for trade ${trade.id}`);
        trade.deliveryStatus = trade_entity_1.DeliveryStatus.CONFIRMED;
        trade.deliveryConfirmedAt = new Date();
        await manager.save(trade);
    }
    async calculateAndCollectCommission(trade, manager) {
        const commissionRate = 0.02;
        const commission = (trade.finalAmount || 0) * commissionRate;
        if (commission > 0) {
            this.logger.log(`Collecting commission of ${commission} for trade ${trade.id}`);
            if (!trade.paymentDetails)
                trade.paymentDetails = {};
            trade.paymentDetails.commission = commission;
            trade.paymentDetails.commissionCollected = true;
            trade.paymentDetails.commissionCollectedAt = new Date();
            await manager.save(trade);
        }
        return commission;
    }
    shouldProcessRefund(trade) {
        return (trade.isDisputed ||
            trade.refundAmount > 0 ||
            trade.penaltyAmount > 0);
    }
    async processRefund(trade, manager) {
        this.logger.log(`Processing refund for trade ${trade.id}`);
        const refundAmount = (trade.refundAmount || 0) + (trade.penaltyAmount || 0);
        if (refundAmount > 0) {
            trade.paymentStatus = trade_entity_1.PaymentStatus.REFUNDED;
            trade.refundedAt = new Date();
            if (!trade.paymentDetails)
                trade.paymentDetails = {};
            trade.paymentDetails.refundAmount = refundAmount;
            trade.paymentDetails.refundReason = trade.disputeReason || 'Settlement refund';
            trade.paymentDetails.refundTransactionId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await manager.save(trade);
        }
    }
    async triggerSettlementNotifications(trade, event, manager) {
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
            processedCount: result.processedCount,
            errorCount: result.failedSettlements.length,
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
            'PAYMENT_GATEWAY_ERROR',
        ];
        const errorMessage = error?.message?.toUpperCase() || '';
        return retryableErrors.some(retryableError => errorMessage.includes(retryableError));
    }
    calculateNextRetryTime(job) {
        const baseDelay = job.retryDelay || 10;
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
        const maxDelay = 7200;
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
        this.logger.log(`Settlement job ${job.id} rescheduled for market open at ${nextMarketOpen.toISOString()}`);
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
    createResult(success, settledTrades, failedSettlements, totalAmount, executionTime, details) {
        return {
            success,
            settledTrades,
            failedSettlements,
            totalAmount,
            processedCount: settledTrades.length + failedSettlements.length,
            executionTime,
            details,
        };
    }
    async getPendingSettlements() {
        return await this.getSettleableTrades(100);
    }
    async getSettlementMetrics(jobId) {
        const job = await this.scheduledJobRepository.findOne({
            where: { id: jobId },
        });
        if (!job) {
            throw new Error(`Settlement job ${jobId} not found`);
        }
        const recentTrades = await this.tradeRepository.find({
            where: { status: trade_entity_1.TradeStatus.COMPLETED },
            order: { completedAt: 'DESC' },
            take: 100,
        });
        const totalSettled = recentTrades.length;
        const totalAmount = recentTrades.reduce((sum, trade) => sum + (trade.finalAmount || 0), 0);
        const avgSettlementTime = recentTrades.reduce((sum, trade) => {
            if (trade.completedAt && trade.createdAt) {
                return sum + (trade.completedAt.getTime() - trade.createdAt.getTime());
            }
            return sum;
        }, 0) / totalSettled;
        return {
            jobId: job.id,
            name: job.name,
            status: job.status,
            metrics: job.metrics,
            lastExecution: job.lastRunAt,
            nextExecution: job.nextRunAt,
            recentSettlements: {
                totalSettled,
                totalAmount,
                avgSettlementTime: avgSettlementTime / (1000 * 60 * 60),
            },
        };
    }
};
exports.SettlementJob = SettlementJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_5_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SettlementJob.prototype, "processScheduledSettlements", null);
exports.SettlementJob = SettlementJob = SettlementJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scheduled_job_entity_1.ScheduledJob)),
    __param(1, (0, typeorm_1.InjectRepository)(trade_entity_1.Trade)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], SettlementJob);
//# sourceMappingURL=settlement.job.js.map
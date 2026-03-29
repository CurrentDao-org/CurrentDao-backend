import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import {
  ScheduledJob,
  JobStatus,
  RetryStrategy,
} from '../entities/scheduled-job.entity';
import {
  Trade,
  TradeStatus,
  PaymentStatus,
  DeliveryStatus,
} from '../../energy/entities/trade.entity';

export interface SettlementResult {
  success: boolean;
  settledTrades: string[];
  failedSettlements: Array<{
    tradeId: string;
    error: string;
    retryable: boolean;
    amount?: number;
  }>;
  totalAmount: number;
  processedCount: number;
  executionTime: number;
  details: {
    paymentsProcessed: number;
    deliveriesConfirmed: number;
    commissionsCollected: number;
    refundsProcessed: number;
  };
}

@Injectable()
export class SettlementJob {
  private readonly logger = new Logger(SettlementJob.name);

  constructor(
    @InjectRepository(ScheduledJob)
    private readonly scheduledJobRepository: Repository<ScheduledJob>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledSettlements(): Promise<void> {
    this.logger.log('Checking for scheduled settlement processing...');

    try {
      const pendingJobs = await this.scheduledJobRepository.find({
        where: {
          type: 'settlement' as any,
          status: JobStatus.PENDING,
          isActive: true,
          isEmergencyStop: false,
          scheduledAt: LessThan(new Date()),
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
    } catch (error) {
      this.logger.error('Error in settlement scheduler', error);
    }
  }

  async executeSettlementJob(job: ScheduledJob): Promise<SettlementResult> {
    const startTime = Date.now();

    this.logger.log(`Executing settlement job: ${job.id} - ${job.name}`);

    try {
      await this.updateJobStatus(job, JobStatus.RUNNING);

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
      this.logger.log(
        `Settlement job ${job.id} completed in ${executionTime}ms. Settled: ${result.settledTrades.length}, Amount: ${result.totalAmount}`,
      );

      return result;
    } catch (error) {
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

  private async processSettlement(
    job: ScheduledJob,
  ): Promise<SettlementResult> {
    const parameters = job.parameters || {};
    const settlementId = parameters.settlementId;

    if (settlementId) {
      return await this.processSingleSettlement(settlementId, job);
    } else {
      return await this.processBatchSettlements(job);
    }
  }

  private async processSingleSettlement(
    settlementId: string,
    job: ScheduledJob,
  ): Promise<SettlementResult> {
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
        throw new Error(
          `Trade ${settlementId} is not ready for settlement: ${trade.status}/${trade.deliveryStatus}`,
        );
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
    } catch (error) {
      return {
        success: false,
        settledTrades: [],
        failedSettlements: [
          {
            tradeId: settlementId,
            error: error.message,
            retryable: this.isRetryableError(error),
          },
        ],
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

  private async processBatchSettlements(
    job: ScheduledJob,
  ): Promise<SettlementResult> {
    const startTime = Date.now();
    const batchSize = job.parameters?.batchSize || 20;
    const settledTrades: string[] = [];
    const failedSettlements: Array<{
      tradeId: string;
      error: string;
      retryable: boolean;
      amount?: number;
    }> = [];
    let totalAmount = 0;

    const details = {
      paymentsProcessed: 0,
      deliveriesConfirmed: 0,
      commissionsCollected: 0,
      refundsProcessed: 0,
    };

    try {
      const eligibleTrades = await this.getSettleableTrades(batchSize);

      this.logger.log(
        `Processing batch settlement of ${eligibleTrades.length} trades`,
      );

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
        } catch (error) {
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
    } catch (error) {
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

  private async getSettleableTrades(limit: number): Promise<Trade[]> {
    return await this.tradeRepository.find({
      where: [
        {
          status: TradeStatus.IN_PROGRESS,
          deliveryStatus: DeliveryStatus.DELIVERED,
          paymentStatus: PaymentStatus.PENDING,
        },
        {
          status: TradeStatus.IN_PROGRESS,
          deliveryStatus: DeliveryStatus.DELIVERED,
          paymentStatus: PaymentStatus.PROCESSING,
        },
      ],
      relations: ['listing', 'bid'],
      take: limit,
      order: { deliveryConfirmedAt: 'ASC' },
    });
  }

  private isTradeSettleable(trade: Trade): boolean {
    return (
      (trade.status === TradeStatus.IN_PROGRESS ||
        trade.status === TradeStatus.CONFIRMED) &&
      (trade.deliveryStatus === DeliveryStatus.DELIVERED ||
        trade.deliveryStatus === DeliveryStatus.CONFIRMED) &&
      (trade.paymentStatus === PaymentStatus.PENDING ||
        trade.paymentStatus === PaymentStatus.PROCESSING)
    );
  }

  private async performSettlement(
    trade: Trade,
    job: ScheduledJob,
  ): Promise<any> {
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

      if (trade.paymentStatus === PaymentStatus.PENDING) {
        await this.processPayment(trade, manager);
        paymentsProcessed = 1;
      }

      if (trade.deliveryStatus === DeliveryStatus.DELIVERED) {
        await this.confirmDelivery(trade, manager);
      }

      const commission = await this.calculateAndCollectCommission(
        trade,
        manager,
      );
      commissionsCollected = commission > 0 ? 1 : 0;

      if (this.shouldProcessRefund(trade)) {
        await this.processRefund(trade, manager);
        refundsProcessed = 1;
      }

      trade.status = TradeStatus.COMPLETED;
      trade.paymentStatus = PaymentStatus.COMPLETED;
      trade.completedAt = new Date();
      trade.paymentCompletedAt = new Date();

      if (!trade.auditTrail) trade.auditTrail = [];
      trade.auditTrail.push({
        timestamp: new Date(),
        action: 'trade_settled',
        userId: 'system',
        reason: `Automated settlement by job ${job.id}`,
        details: settlementDetails,
      });

      await manager.save(trade);

      await this.triggerSettlementNotifications(
        trade,
        'settlement_completed',
        manager,
      );

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

  private async processPayment(trade: Trade, manager: any): Promise<void> {
    this.logger.log(`Processing payment for trade ${trade.id}`);

    if (trade.paymentDetails?.paymentSchedule) {
      for (const payment of trade.paymentDetails.paymentSchedule) {
        if (payment.status === 'pending') {
          payment.status = 'completed';
          payment.transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
      }
    }

    trade.paymentStatus = PaymentStatus.PROCESSING;
    await manager.save(trade);
  }

  private async confirmDelivery(trade: Trade, manager: any): Promise<void> {
    this.logger.log(`Confirming delivery for trade ${trade.id}`);

    trade.deliveryStatus = DeliveryStatus.CONFIRMED;
    trade.deliveryConfirmedAt = new Date();

    await manager.save(trade);
  }

  private async calculateAndCollectCommission(
    trade: Trade,
    manager: any,
  ): Promise<number> {
    const commissionRate = 0.02; // 2% commission
    const commission = (trade.finalAmount || 0) * commissionRate;

    if (commission > 0) {
      this.logger.log(
        `Collecting commission of ${commission} for trade ${trade.id}`,
      );

      if (!trade.paymentDetails) trade.paymentDetails = {};
      trade.paymentDetails.commission = commission;
      trade.paymentDetails.commissionCollected = true;
      trade.paymentDetails.commissionCollectedAt = new Date();

      await manager.save(trade);
    }

    return commission;
  }

  private shouldProcessRefund(trade: Trade): boolean {
    return (
      trade.isDisputed || trade.refundAmount > 0 || trade.penaltyAmount > 0
    );
  }

  private async processRefund(trade: Trade, manager: any): Promise<void> {
    this.logger.log(`Processing refund for trade ${trade.id}`);

    const refundAmount = (trade.refundAmount || 0) + (trade.penaltyAmount || 0);

    if (refundAmount > 0) {
      trade.paymentStatus = PaymentStatus.REFUNDED;
      trade.refundedAt = new Date();

      if (!trade.paymentDetails) trade.paymentDetails = {};
      trade.paymentDetails.refundAmount = refundAmount;
      trade.paymentDetails.refundReason =
        trade.disputeReason || 'Settlement refund';
      trade.paymentDetails.refundTransactionId = `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await manager.save(trade);
    }
  }

  private async triggerSettlementNotifications(
    trade: Trade,
    event: string,
    manager: any,
  ): Promise<void> {
    this.logger.log(`Triggering ${event} notifications for trade ${trade.id}`);
  }

  private async updateJobStatus(
    job: ScheduledJob,
    status: JobStatus,
  ): Promise<void> {
    job.status = status;
    job.updatedAt = new Date();

    if (status === JobStatus.RUNNING) {
      job.startedAt = new Date();
    }

    await this.scheduledJobRepository.save(job);
  }

  private async updateJobCompletion(
    job: ScheduledJob,
    result: SettlementResult,
  ): Promise<void> {
    job.status = result.success ? JobStatus.COMPLETED : JobStatus.FAILED;
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
    } else {
      job.metrics.failureCount++;
    }

    job.metrics.totalExecutionTime += result.executionTime;
    job.metrics.avgExecutionTime =
      job.metrics.totalExecutionTime / job.metrics.executionCount;

    if (
      job.metrics.minExecutionTime === 0 ||
      result.executionTime < job.metrics.minExecutionTime
    ) {
      job.metrics.minExecutionTime = result.executionTime;
    }

    if (result.executionTime > job.metrics.maxExecutionTime) {
      job.metrics.maxExecutionTime = result.executionTime;
    }

    if (job.scheduling?.isRecurring && job.scheduling.isActive) {
      job.nextRunAt = this.calculateNextRunTime(job);
      job.status = JobStatus.PENDING;
    }

    await this.scheduledJobRepository.save(job);
  }

  private async handleJobFailure(
    job: ScheduledJob,
    error: any,
    executionTime: number,
  ): Promise<void> {
    job.retryCount++;
    job.status = JobStatus.FAILED;
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
      job.status = JobStatus.RETRYING;
      job.scheduledAt = nextRetryAt;
    }

    await this.scheduledJobRepository.save(job);
  }

  private shouldRetry(job: ScheduledJob): boolean {
    return job.retryCount < job.maxRetries && this.isRetryableError(job.error);
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'TIMEOUT',
      'CONNECTION_ERROR',
      'TEMPORARY_FAILURE',
      'RATE_LIMITED',
      'SERVICE_UNAVAILABLE',
      'PAYMENT_GATEWAY_ERROR',
    ];

    const errorMessage = error?.message?.toUpperCase() || '';
    return retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError),
    );
  }

  private calculateNextRetryTime(job: ScheduledJob): Date {
    const baseDelay = job.retryDelay || 10; // Settlement jobs have longer delays
    let delay: number;

    switch (job.retryStrategy) {
      case RetryStrategy.IMMEDIATE:
        delay = 0;
        break;
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = baseDelay * Math.pow(2, job.retryCount - 1);
        break;
      case RetryStrategy.LINEAR_BACKOFF:
        delay = baseDelay * job.retryCount;
        break;
      case RetryStrategy.FIXED_INTERVAL:
        delay = baseDelay;
        break;
      default:
        delay = baseDelay;
    }

    const maxDelay = 7200; // 2 hours max for settlements
    delay = Math.min(delay, maxDelay);

    return new Date(Date.now() + delay * 1000);
  }

  private calculateNextRunTime(job: ScheduledJob): Date {
    const now = new Date();
    const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day by default

    if (job.scheduling?.endDate && nextRun > job.scheduling.endDate) {
      job.scheduling.isActive = false;
    }

    return nextRun;
  }

  private isWithinMarketHours(timeZone: string = 'UTC'): boolean {
    const now = new Date();

    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: '2-digit',
        hour12: false,
      };

      const timeString = now.toLocaleTimeString('en-US', options);
      const currentHour = parseInt(timeString);

      const dayOptions: Intl.DateTimeFormatOptions = {
        timeZone,
        weekday: 'long',
      };

      const dayString = now.toLocaleDateString('en-US', dayOptions);
      const isWeekday = !['Saturday', 'Sunday'].includes(dayString);

      return isWeekday && currentHour >= 9 && currentHour < 17;
    } catch (error) {
      this.logger.warn(
        `Error checking market hours for timezone ${timeZone}`,
        error,
      );
      return true; // Default to allowing execution
    }
  }

  private async rescheduleForMarketHours(job: ScheduledJob): Promise<void> {
    const nextMarketOpen = this.getNextMarketOpen(job.timeZone);
    job.scheduledAt = nextMarketOpen;
    job.status = JobStatus.PENDING;

    await this.scheduledJobRepository.save(job);

    this.logger.log(
      `Settlement job ${job.id} rescheduled for market open at ${nextMarketOpen.toISOString()}`,
    );
  }

  private getNextMarketOpen(timeZone: string = 'UTC'): Date {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      const marketOpen = new Date(tomorrow);
      marketOpen.setUTCHours(14, 0, 0, 0); // 9:00 AM EST (2:00 PM UTC)

      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        weekday: 'long',
      };

      const dayString = marketOpen.toLocaleDateString('en-US', options);

      if (['Saturday', 'Sunday'].includes(dayString)) {
        marketOpen.setDate(
          marketOpen.getDate() + (dayString === 'Saturday' ? 2 : 1),
        );
      }

      return marketOpen;
    } catch (error) {
      this.logger.warn(
        `Error calculating next market open for timezone ${timeZone}`,
        error,
      );
      return new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now as fallback
    }
  }

  private createResult(
    success: boolean,
    settledTrades: string[],
    failedSettlements: Array<{
      tradeId: string;
      error: string;
      retryable: boolean;
      amount?: number;
    }>,
    totalAmount: number,
    executionTime: number,
    details: any,
  ): SettlementResult {
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

  async getPendingSettlements(): Promise<Trade[]> {
    return await this.getSettleableTrades(100);
  }

  async getSettlementMetrics(jobId: string): Promise<any> {
    const job = await this.scheduledJobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Settlement job ${jobId} not found`);
    }

    const recentTrades = await this.tradeRepository.find({
      where: { status: TradeStatus.COMPLETED },
      order: { completedAt: 'DESC' },
      take: 100,
    });

    const totalSettled = recentTrades.length;
    const totalAmount = recentTrades.reduce(
      (sum, trade) => sum + (trade.finalAmount || 0),
      0,
    );
    const avgSettlementTime =
      recentTrades.reduce((sum, trade) => {
        if (trade.completedAt && trade.createdAt) {
          return (
            sum + (trade.completedAt.getTime() - trade.createdAt.getTime())
          );
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
        avgSettlementTime: avgSettlementTime / (1000 * 60 * 60), // Convert to hours
      },
    };
  }
}

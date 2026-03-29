import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
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

export interface TradeExecutionResult {
  success: boolean;
  processedTrades: string[];
  failedTrades: Array<{
    tradeId: string;
    error: string;
    retryable: boolean;
  }>;
  totalProcessed: number;
  executionTime: number;
  details: any;
}

@Injectable()
export class TradeExecutionJob {
  private readonly logger = new Logger(TradeExecutionJob.name);

  constructor(
    @InjectRepository(ScheduledJob)
    private readonly scheduledJobRepository: Repository<ScheduledJob>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async executeScheduledTrades(): Promise<void> {
    this.logger.log('Checking for scheduled trade executions...');

    try {
      const pendingJobs = await this.scheduledJobRepository.find({
        where: {
          type: 'trade_execution' as any,
          status: JobStatus.PENDING,
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

      this.logger.log(
        `Found ${pendingJobs.length} pending trade execution jobs`,
      );

      for (const job of pendingJobs) {
        await this.executeTradeJob(job);
      }
    } catch (error) {
      this.logger.error('Error in trade execution scheduler', error);
    }
  }

  async executeTradeJob(job: ScheduledJob): Promise<TradeExecutionResult> {
    const startTime = Date.now();

    this.logger.log(`Executing trade job: ${job.id} - ${job.name}`);

    try {
      await this.updateJobStatus(job, JobStatus.RUNNING);

      if (job.marketHoursOnly && !this.isWithinMarketHours(job.timeZone)) {
        await this.rescheduleForMarketHours(job);
        return this.createResult(false, [], [], 0, Date.now() - startTime, {
          reason: 'Outside market hours',
        });
      }

      const result = await this.processTradeExecution(job);

      await this.updateJobCompletion(job, result);

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Trade job ${job.id} completed in ${executionTime}ms. Processed: ${result.totalProcessed}, Success: ${result.success}`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Trade job ${job.id} failed`, error);

      await this.handleJobFailure(job, error, executionTime);

      return this.createResult(false, [], [], 0, executionTime, {
        error: error.message,
      });
    }
  }

  private async processTradeExecution(
    job: ScheduledJob,
  ): Promise<TradeExecutionResult> {
    const parameters = job.parameters || {};
    const tradeId = parameters.tradeId;

    if (tradeId) {
      return await this.executeSingleTrade(tradeId, job);
    } else {
      return await this.executeBatchTrades(job);
    }
  }

  private async executeSingleTrade(
    tradeId: string,
    job: ScheduledJob,
  ): Promise<TradeExecutionResult> {
    const startTime = Date.now();

    try {
      const trade = await this.tradeRepository.findOne({
        where: { id: tradeId },
        relations: ['listing', 'bid'],
      });

      if (!trade) {
        throw new Error(`Trade ${tradeId} not found`);
      }

      if (
        trade.status !== TradeStatus.PENDING &&
        trade.status !== TradeStatus.CONFIRMED
      ) {
        throw new Error(
          `Trade ${tradeId} is not in executable status: ${trade.status}`,
        );
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
    } catch (error) {
      return {
        success: false,
        processedTrades: [],
        failedTrades: [
          {
            tradeId,
            error: error.message,
            retryable: this.isRetryableError(error),
          },
        ],
        totalProcessed: 0,
        executionTime: Date.now() - startTime,
        details: { error: error.message },
      };
    }
  }

  private async executeBatchTrades(
    job: ScheduledJob,
  ): Promise<TradeExecutionResult> {
    const startTime = Date.now();
    const batchSize = job.parameters?.batchSize || 10;
    const processedTrades: string[] = [];
    const failedTrades: Array<{
      tradeId: string;
      error: string;
      retryable: boolean;
    }> = [];

    try {
      const pendingTrades = await this.tradeRepository.find({
        where: {
          status: TradeStatus.CONFIRMED,
          paymentStatus: PaymentStatus.COMPLETED,
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
        } catch (error) {
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
    } catch (error) {
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

  private async performTradeExecution(
    trade: Trade,
    job: ScheduledJob,
  ): Promise<any> {
    return await this.dataSource.transaction(async (manager) => {
      const executionDetails = {
        executedAt: new Date(),
        executedBy: job.id,
        previousStatus: trade.status,
      };

      trade.status = TradeStatus.IN_PROGRESS;
      trade.deliveryStatus = DeliveryStatus.SCHEDULED;

      if (!trade.auditTrail) trade.auditTrail = [];
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

  private async initializeDeliveryProcess(
    trade: Trade,
    manager: any,
  ): Promise<void> {
    if (trade.deliveryDetails?.deliveryDate) {
      const deliveryDate = new Date(trade.deliveryDetails.deliveryDate);
      const now = new Date();

      if (deliveryDate <= now) {
        trade.deliveryStatus = DeliveryStatus.IN_TRANSIT;
        trade.deliveryConfirmedAt = new Date();
      } else {
        trade.deliveryStatus = DeliveryStatus.SCHEDULED;
      }

      await manager.save(trade);
    }
  }

  private async triggerNotifications(
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
    result: TradeExecutionResult,
  ): Promise<void> {
    job.status = result.success ? JobStatus.COMPLETED : JobStatus.FAILED;
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
    ];

    const errorMessage = error?.message?.toUpperCase() || '';
    return retryableErrors.some((retryableError) =>
      errorMessage.includes(retryableError),
    );
  }

  private calculateNextRetryTime(job: ScheduledJob): Date {
    const baseDelay = job.retryDelay || 5;
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

    const maxDelay = 3600; // 1 hour max
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
      `Job ${job.id} rescheduled for market open at ${nextMarketOpen.toISOString()}`,
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
    processedTrades: string[],
    failedTrades: Array<{ tradeId: string; error: string; retryable: boolean }>,
    totalProcessed: number,
    executionTime: number,
    details: any,
  ): TradeExecutionResult {
    return {
      success,
      processedTrades,
      failedTrades,
      totalProcessed,
      executionTime,
      details,
    };
  }

  async getJobMetrics(jobId: string): Promise<any> {
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

  async emergencyStop(jobId: string, reason: string): Promise<void> {
    const job = await this.scheduledJobRepository.findOne({
      where: { id: jobId },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.isEmergencyStop = true;
    job.emergencyStopReason = reason;
    job.emergencyStoppedAt = new Date();
    job.status = JobStatus.CANCELLED;

    await this.scheduledJobRepository.save(job);

    this.logger.warn(`Emergency stop triggered for job ${jobId}: ${reason}`);
  }
}

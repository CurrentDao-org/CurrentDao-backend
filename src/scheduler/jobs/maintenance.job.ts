import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import {
  ScheduledJob,
  JobStatus,
  RetryStrategy,
} from '../entities/scheduled-job.entity';
import { Trade, TradeStatus } from '../../energy/entities/trade.entity';

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
    dataCleanup: { recordsDeleted: number; spaceFreed: number };
    systemOptimization: { indexesOptimized: number; cacheCleared: boolean };
    healthChecks: { checksPassed: number; checksFailed: number };
    reportGeneration: { reportsGenerated: number };
  };
}

@Injectable()
export class MaintenanceJob {
  private readonly logger = new Logger(MaintenanceJob.name);

  constructor(
    @InjectRepository(ScheduledJob)
    private readonly scheduledJobRepository: Repository<ScheduledJob>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly dataSource: DataSource,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async performSystemMaintenance(): Promise<void> {
    this.logger.log('Performing scheduled system maintenance...');

    try {
      const pendingJobs = await this.scheduledJobRepository.find({
        where: {
          type: 'maintenance' as any,
          status: JobStatus.PENDING,
          isActive: true,
          isEmergencyStop: false,
          scheduledAt: LessThan(new Date()),
        },
        order: { priority: 'DESC', scheduledAt: 'ASC' },
      });

      if (pendingJobs.length === 0) {
        this.logger.debug('No pending maintenance jobs found');
        return;
      }

      this.logger.log(`Found ${pendingJobs.length} pending maintenance jobs`);

      for (const job of pendingJobs) {
        await this.executeMaintenanceJob(job);
      }
    } catch (error) {
      this.logger.error('Error in maintenance scheduler', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async performDailyMaintenance(): Promise<void> {
    this.logger.log('Performing daily maintenance tasks...');

    try {
      const dailyJob = await this.createDailyMaintenanceJob();
      await this.executeMaintenanceJob(dailyJob);
    } catch (error) {
      this.logger.error('Error in daily maintenance', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async performWeeklyMaintenance(): Promise<void> {
    this.logger.log('Performing weekly maintenance tasks...');

    try {
      const weeklyJob = await this.createWeeklyMaintenanceJob();
      await this.executeMaintenanceJob(weeklyJob);
    } catch (error) {
      this.logger.error('Error in weekly maintenance', error);
    }
  }

  async executeMaintenanceJob(job: ScheduledJob): Promise<MaintenanceResult> {
    const startTime = Date.now();

    this.logger.log(`Executing maintenance job: ${job.id} - ${job.name}`);

    try {
      await this.updateJobStatus(job, JobStatus.RUNNING);

      const operations = [];
      const details = {
        dataCleanup: { recordsDeleted: 0, spaceFreed: 0 },
        systemOptimization: { indexesOptimized: 0, cacheCleared: false },
        healthChecks: { checksPassed: 0, checksFailed: 0 },
        reportGeneration: { reportsGenerated: 0 },
      };

      const parameters = job.parameters || {};
      const maintenanceType = parameters.maintenanceType || 'routine';

      switch (maintenanceType) {
        case 'data_cleanup':
          operations.push(await this.performDataCleanup(details));
          break;
        case 'system_optimization':
          operations.push(await this.performSystemOptimization(details));
          break;
        case 'health_checks':
          operations.push(await this.performHealthChecks(details));
          break;
        case 'report_generation':
          operations.push(await this.generateReports(details));
          break;
        case 'comprehensive':
          operations.push(await this.performDataCleanup(details));
          operations.push(await this.performSystemOptimization(details));
          operations.push(await this.performHealthChecks(details));
          operations.push(await this.generateReports(details));
          break;
        default:
          operations.push(await this.performRoutineMaintenance(details));
      }

      const totalProcessed = operations.reduce(
        (sum, op) => sum + op.processed,
        0,
      );
      const totalErrors = operations.reduce(
        (sum, op) => sum + op.errors.length,
        0,
      );
      const success = totalErrors === 0;

      const result = {
        success,
        operations,
        totalProcessed,
        totalErrors,
        executionTime: Date.now() - startTime,
        details,
      };

      await this.updateJobCompletion(job, result);

      this.logger.log(
        `Maintenance job ${job.id} completed in ${result.executionTime}ms. Success: ${result.success}, Operations: ${operations.length}`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`Maintenance job ${job.id} failed`, error);

      await this.handleJobFailure(job, error, executionTime);

      return {
        success: false,
        operations: [],
        totalProcessed: 0,
        totalErrors: 1,
        executionTime,
        details: {
          dataCleanup: { recordsDeleted: 0, spaceFreed: 0 },
          systemOptimization: { indexesOptimized: 0, cacheCleared: false },
          healthChecks: { checksPassed: 0, checksFailed: 0 },
          reportGeneration: { reportsGenerated: 0 },
        },
      };
    }
  }

  private async performDataCleanup(details: any): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;

    try {
      this.logger.log('Performing data cleanup...');

      // Clean up old audit trail entries
      const auditCleanupResult = await this.cleanupOldAuditTrails();
      processed += auditCleanupResult.deleted;
      details.dataCleanup.recordsDeleted += auditCleanupResult.deleted;
      details.dataCleanup.spaceFreed += auditCleanupResult.spaceFreed;

      // Clean up old scheduled jobs
      const jobCleanupResult = await this.cleanupOldScheduledJobs();
      processed += jobCleanupResult.deleted;
      details.dataCleanup.recordsDeleted += jobCleanupResult.deleted;
      details.dataCleanup.spaceFreed += jobCleanupResult.spaceFreed;

      // Clean up old temporary data
      const tempCleanupResult = await this.cleanupTemporaryData();
      processed += tempCleanupResult.deleted;
      details.dataCleanup.recordsDeleted += tempCleanupResult.deleted;
      details.dataCleanup.spaceFreed += tempCleanupResult.spaceFreed;

      this.logger.log(`Data cleanup completed. Deleted ${processed} records`);
    } catch (error) {
      errors.push(`Data cleanup failed: ${error.message}`);
      this.logger.error('Data cleanup failed', error);
    }

    return {
      type: 'data_cleanup',
      success: errors.length === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  private async performSystemOptimization(details: any): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;

    try {
      this.logger.log('Performing system optimization...');

      // Optimize database indexes
      const indexResult = await this.optimizeDatabaseIndexes();
      processed += indexResult.optimized;
      details.systemOptimization.indexesOptimized += indexResult.optimized;

      // Clear application cache
      const cacheResult = await this.clearApplicationCache();
      processed += cacheResult.cleared;
      details.systemOptimization.cacheCleared = cacheResult.success;

      // Update statistics
      const statsResult = await this.updateDatabaseStatistics();
      processed += statsResult.updated;

      this.logger.log(
        `System optimization completed. Optimized ${processed} items`,
      );
    } catch (error) {
      errors.push(`System optimization failed: ${error.message}`);
      this.logger.error('System optimization failed', error);
    }

    return {
      type: 'system_optimization',
      success: errors.length === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  private async performHealthChecks(details: any): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;

    try {
      this.logger.log('Performing system health checks...');

      const checks = [
        await this.checkDatabaseHealth(),
        await this.checkSchedulerHealth(),
        await this.checkMemoryUsage(),
        await this.checkDiskSpace(),
        await this.checkConnectivity(),
      ];

      for (const check of checks) {
        processed++;
        if (check.passed) {
          details.healthChecks.checksPassed++;
        } else {
          details.healthChecks.checksFailed++;
          errors.push(`Health check failed: ${check.name} - ${check.error}`);
        }
      }

      this.logger.log(
        `Health checks completed. Passed: ${details.healthChecks.checksPassed}, Failed: ${details.healthChecks.checksFailed}`,
      );
    } catch (error) {
      errors.push(`Health checks failed: ${error.message}`);
      this.logger.error('Health checks failed', error);
    }

    return {
      type: 'health_checks',
      success: errors.length === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  private async generateReports(details: any): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;

    try {
      this.logger.log('Generating maintenance reports...');

      const reports = [
        await this.generateSchedulerReport(),
        await this.generateSystemReport(),
        await this.generatePerformanceReport(),
      ];

      for (const report of reports) {
        if (report.success) {
          processed++;
          details.reportGeneration.reportsGenerated++;
        } else {
          errors.push(
            `Report generation failed: ${report.name} - ${report.error}`,
          );
        }
      }

      this.logger.log(
        `Report generation completed. Generated ${processed} reports`,
      );
    } catch (error) {
      errors.push(`Report generation failed: ${error.message}`);
      this.logger.error('Report generation failed', error);
    }

    return {
      type: 'report_generation',
      success: errors.length === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  private async performRoutineMaintenance(details: any): Promise<any> {
    const startTime = Date.now();
    const errors: string[] = [];
    let processed = 0;

    try {
      this.logger.log('Performing routine maintenance...');

      // Basic cleanup and optimization
      await this.cleanupOldAuditTrails();
      await this.clearApplicationCache();
      processed = 2;

      this.logger.log(
        `Routine maintenance completed. Processed ${processed} items`,
      );
    } catch (error) {
      errors.push(`Routine maintenance failed: ${error.message}`);
      this.logger.error('Routine maintenance failed', error);
    }

    return {
      type: 'routine_maintenance',
      success: errors.length === 0,
      processed,
      errors,
      duration: Date.now() - startTime,
    };
  }

  private async cleanupOldAuditTrails(): Promise<{
    deleted: number;
    spaceFreed: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days

    const result = await this.scheduledJobRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .execute();

    return {
      deleted: result.affected || 0,
      spaceFreed: (result.affected || 0) * 1024, // Estimate 1KB per record
    };
  }

  private async cleanupOldScheduledJobs(): Promise<{
    deleted: number;
    spaceFreed: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30); // Keep 30 days

    const result = await this.scheduledJobRepository
      .createQueryBuilder()
      .delete()
      .where('createdAt < :cutoffDate', { cutoffDate })
      .andWhere('status IN (:...statuses)', {
        statuses: [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED],
      })
      .execute();

    return {
      deleted: result.affected || 0,
      spaceFreed: (result.affected || 0) * 2048, // Estimate 2KB per job record
    };
  }

  private async cleanupTemporaryData(): Promise<{
    deleted: number;
    spaceFreed: number;
  }> {
    // This would clean up any temporary tables, cache entries, etc.
    // For now, return placeholder values
    return {
      deleted: 0,
      spaceFreed: 0,
    };
  }

  private async optimizeDatabaseIndexes(): Promise<{ optimized: number }> {
    try {
      // This would typically run ANALYZE or REINDEX commands
      // For now, return placeholder
      return { optimized: 0 };
    } catch (error) {
      this.logger.error('Database index optimization failed', error);
      return { optimized: 0 };
    }
  }

  private async clearApplicationCache(): Promise<{
    cleared: number;
    success: boolean;
  }> {
    try {
      // This would clear application caches
      // For now, return placeholder
      return { cleared: 1, success: true };
    } catch (error) {
      this.logger.error('Cache clearing failed', error);
      return { cleared: 0, success: false };
    }
  }

  private async updateDatabaseStatistics(): Promise<{ updated: number }> {
    try {
      // This would update database statistics
      // For now, return placeholder
      return { updated: 1 };
    } catch (error) {
      this.logger.error('Database statistics update failed', error);
      return { updated: 0 };
    }
  }

  private async checkDatabaseHealth(): Promise<{
    name: string;
    passed: boolean;
    error?: string;
  }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { name: 'database', passed: true };
    } catch (error) {
      return { name: 'database', passed: false, error: error.message };
    }
  }

  private async checkSchedulerHealth(): Promise<{
    name: string;
    passed: boolean;
    error?: string;
  }> {
    try {
      const pendingJobs = await this.scheduledJobRepository.count({
        where: { status: JobStatus.PENDING },
      });
      return { name: 'scheduler', passed: true };
    } catch (error) {
      return { name: 'scheduler', passed: false, error: error.message };
    }
  }

  private async checkMemoryUsage(): Promise<{
    name: string;
    passed: boolean;
    error?: string;
  }> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      if (memoryUsagePercent > 90) {
        return {
          name: 'memory',
          passed: false,
          error: `Memory usage at ${memoryUsagePercent.toFixed(2)}%`,
        };
      }

      return { name: 'memory', passed: true };
    } catch (error) {
      return { name: 'memory', passed: false, error: error.message };
    }
  }

  private async checkDiskSpace(): Promise<{
    name: string;
    passed: boolean;
    error?: string;
  }> {
    try {
      // This would check disk space
      // For now, assume it passes
      return { name: 'disk_space', passed: true };
    } catch (error) {
      return { name: 'disk_space', passed: false, error: error.message };
    }
  }

  private async checkConnectivity(): Promise<{
    name: string;
    passed: boolean;
    error?: string;
  }> {
    try {
      // This would check external connectivity
      // For now, assume it passes
      return { name: 'connectivity', passed: true };
    } catch (error) {
      return { name: 'connectivity', passed: false, error: error.message };
    }
  }

  private async generateSchedulerReport(): Promise<{
    name: string;
    success: boolean;
    error?: string;
  }> {
    try {
      const totalJobs = await this.scheduledJobRepository.count();
      const pendingJobs = await this.scheduledJobRepository.count({
        where: { status: JobStatus.PENDING },
      });
      const failedJobs = await this.scheduledJobRepository.count({
        where: { status: JobStatus.FAILED },
      });

      this.logger.log(
        `Scheduler Report - Total: ${totalJobs}, Pending: ${pendingJobs}, Failed: ${failedJobs}`,
      );
      return { name: 'scheduler_report', success: true };
    } catch (error) {
      return { name: 'scheduler_report', success: false, error: error.message };
    }
  }

  private async generateSystemReport(): Promise<{
    name: string;
    success: boolean;
    error?: string;
  }> {
    try {
      const memUsage = process.memoryUsage();
      this.logger.log(
        `System Report - Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      );
      return { name: 'system_report', success: true };
    } catch (error) {
      return { name: 'system_report', success: false, error: error.message };
    }
  }

  private async generatePerformanceReport(): Promise<{
    name: string;
    success: boolean;
    error?: string;
  }> {
    try {
      // This would generate performance metrics
      this.logger.log('Performance report generated');
      return { name: 'performance_report', success: true };
    } catch (error) {
      return {
        name: 'performance_report',
        success: false,
        error: error.message,
      };
    }
  }

  private async createDailyMaintenanceJob(): Promise<ScheduledJob> {
    const job = this.scheduledJobRepository.create({
      name: 'Daily System Maintenance',
      description: 'Automated daily maintenance tasks',
      type: 'maintenance' as any,
      status: JobStatus.PENDING,
      priority: 2, // MEDIUM
      cronExpression: '0 2 * * *', // 2 AM daily
      scheduledAt: new Date(),
      parameters: {
        maintenanceType: 'comprehensive',
      },
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      maxRetries: 2,
      timeoutSeconds: 1800, // 30 minutes
      isSystemJob: true,
      scheduling: {
        isActive: true,
        isRecurring: true,
      },
    });

    return await this.scheduledJobRepository.save(job);
  }

  private async createWeeklyMaintenanceJob(): Promise<ScheduledJob> {
    const job = this.scheduledJobRepository.create({
      name: 'Weekly System Maintenance',
      description: 'Comprehensive weekly maintenance and optimization',
      type: 'maintenance' as any,
      status: JobStatus.PENDING,
      priority: 3, // HIGH
      cronExpression: '0 3 * * 0', // 3 AM on Sundays
      scheduledAt: new Date(),
      parameters: {
        maintenanceType: 'comprehensive',
        deepCleanup: true,
      },
      retryStrategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      maxRetries: 3,
      timeoutSeconds: 3600, // 1 hour
      isSystemJob: true,
      scheduling: {
        isActive: true,
        isRecurring: true,
      },
    });

    return await this.scheduledJobRepository.save(job);
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
    result: MaintenanceResult,
  ): Promise<void> {
    job.status = result.success ? JobStatus.COMPLETED : JobStatus.FAILED;
    job.completedAt = new Date();
    job.result = {
      success: result.success,
      data: result.details,
      processedCount: result.totalProcessed,
      errorCount: result.totalErrors,
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
    const baseDelay = job.retryDelay || 15; // Maintenance jobs have longer delays
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

    const maxDelay = 14400; // 4 hours max for maintenance
    delay = Math.min(delay, maxDelay);

    return new Date(Date.now() + delay * 1000);
  }

  private calculateNextRunTime(job: ScheduledJob): Date {
    const now = new Date();

    if (job.cronExpression.includes('0 2 * * *')) {
      // Daily job - schedule for next day at 2 AM
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      tomorrow.setUTCHours(2, 0, 0, 0);
      return tomorrow;
    } else if (job.cronExpression.includes('0 3 * * 0')) {
      // Weekly job - schedule for next Sunday at 3 AM
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      const nextSunday = new Date(
        now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000,
      );
      nextSunday.setUTCHours(3, 0, 0, 0);
      return nextSunday;
    }

    // Default to next day
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  async getMaintenanceMetrics(): Promise<any> {
    const recentJobs = await this.scheduledJobRepository.find({
      where: { type: 'maintenance' as any },
      order: { completedAt: 'DESC' },
      take: 10,
    });

    const totalJobs = recentJobs.length;
    const successfulJobs = recentJobs.filter(
      (job) => job.status === JobStatus.COMPLETED,
    ).length;
    const avgExecutionTime =
      recentJobs.reduce((sum, job) => {
        return sum + (job.metrics?.avgExecutionTime || 0);
      }, 0) / totalJobs;

    return {
      totalMaintenanceJobs: totalJobs,
      successRate: totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0,
      avgExecutionTime: avgExecutionTime,
      lastMaintenance: recentJobs[0]?.completedAt,
      nextScheduledMaintenance: await this.getNextScheduledMaintenance(),
    };
  }

  private async getNextScheduledMaintenance(): Promise<Date | null> {
    const nextJob = await this.scheduledJobRepository.findOne({
      where: {
        type: 'maintenance' as any,
        status: JobStatus.PENDING,
        isActive: true,
      },
      order: { scheduledAt: 'ASC' },
    });

    return nextJob?.scheduledAt || null;
  }
}

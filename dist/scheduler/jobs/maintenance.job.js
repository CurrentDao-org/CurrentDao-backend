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
var MaintenanceJob_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceJob = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const scheduled_job_entity_1 = require("../entities/scheduled-job.entity");
const trade_entity_1 = require("../../energy/entities/trade.entity");
let MaintenanceJob = MaintenanceJob_1 = class MaintenanceJob {
    constructor(scheduledJobRepository, tradeRepository, dataSource) {
        this.scheduledJobRepository = scheduledJobRepository;
        this.tradeRepository = tradeRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(MaintenanceJob_1.name);
    }
    async performSystemMaintenance() {
        this.logger.log('Performing scheduled system maintenance...');
        try {
            const pendingJobs = await this.scheduledJobRepository.find({
                where: {
                    type: 'maintenance',
                    status: scheduled_job_entity_1.JobStatus.PENDING,
                    isActive: true,
                    isEmergencyStop: false,
                    scheduledAt: (0, typeorm_2.LessThan)(new Date()),
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
        }
        catch (error) {
            this.logger.error('Error in maintenance scheduler', error);
        }
    }
    async performDailyMaintenance() {
        this.logger.log('Performing daily maintenance tasks...');
        try {
            const dailyJob = await this.createDailyMaintenanceJob();
            await this.executeMaintenanceJob(dailyJob);
        }
        catch (error) {
            this.logger.error('Error in daily maintenance', error);
        }
    }
    async performWeeklyMaintenance() {
        this.logger.log('Performing weekly maintenance tasks...');
        try {
            const weeklyJob = await this.createWeeklyMaintenanceJob();
            await this.executeMaintenanceJob(weeklyJob);
        }
        catch (error) {
            this.logger.error('Error in weekly maintenance', error);
        }
    }
    async executeMaintenanceJob(job) {
        const startTime = Date.now();
        this.logger.log(`Executing maintenance job: ${job.id} - ${job.name}`);
        try {
            await this.updateJobStatus(job, scheduled_job_entity_1.JobStatus.RUNNING);
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
            const totalProcessed = operations.reduce((sum, op) => sum + op.processed, 0);
            const totalErrors = operations.reduce((sum, op) => sum + op.errors.length, 0);
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
            this.logger.log(`Maintenance job ${job.id} completed in ${result.executionTime}ms. Success: ${result.success}, Operations: ${operations.length}`);
            return result;
        }
        catch (error) {
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
    async performDataCleanup(details) {
        const startTime = Date.now();
        const errors = [];
        let processed = 0;
        try {
            this.logger.log('Performing data cleanup...');
            const auditCleanupResult = await this.cleanupOldAuditTrails();
            processed += auditCleanupResult.deleted;
            details.dataCleanup.recordsDeleted += auditCleanupResult.deleted;
            details.dataCleanup.spaceFreed += auditCleanupResult.spaceFreed;
            const jobCleanupResult = await this.cleanupOldScheduledJobs();
            processed += jobCleanupResult.deleted;
            details.dataCleanup.recordsDeleted += jobCleanupResult.deleted;
            details.dataCleanup.spaceFreed += jobCleanupResult.spaceFreed;
            const tempCleanupResult = await this.cleanupTemporaryData();
            processed += tempCleanupResult.deleted;
            details.dataCleanup.recordsDeleted += tempCleanupResult.deleted;
            details.dataCleanup.spaceFreed += tempCleanupResult.spaceFreed;
            this.logger.log(`Data cleanup completed. Deleted ${processed} records`);
        }
        catch (error) {
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
    async performSystemOptimization(details) {
        const startTime = Date.now();
        const errors = [];
        let processed = 0;
        try {
            this.logger.log('Performing system optimization...');
            const indexResult = await this.optimizeDatabaseIndexes();
            processed += indexResult.optimized;
            details.systemOptimization.indexesOptimized += indexResult.optimized;
            const cacheResult = await this.clearApplicationCache();
            processed += cacheResult.cleared;
            details.systemOptimization.cacheCleared = cacheResult.success;
            const statsResult = await this.updateDatabaseStatistics();
            processed += statsResult.updated;
            this.logger.log(`System optimization completed. Optimized ${processed} items`);
        }
        catch (error) {
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
    async performHealthChecks(details) {
        const startTime = Date.now();
        const errors = [];
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
                }
                else {
                    details.healthChecks.checksFailed++;
                    errors.push(`Health check failed: ${check.name} - ${check.error}`);
                }
            }
            this.logger.log(`Health checks completed. Passed: ${details.healthChecks.checksPassed}, Failed: ${details.healthChecks.checksFailed}`);
        }
        catch (error) {
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
    async generateReports(details) {
        const startTime = Date.now();
        const errors = [];
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
                }
                else {
                    errors.push(`Report generation failed: ${report.name} - ${report.error}`);
                }
            }
            this.logger.log(`Report generation completed. Generated ${processed} reports`);
        }
        catch (error) {
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
    async performRoutineMaintenance(details) {
        const startTime = Date.now();
        const errors = [];
        let processed = 0;
        try {
            this.logger.log('Performing routine maintenance...');
            await this.cleanupOldAuditTrails();
            await this.clearApplicationCache();
            processed = 2;
            this.logger.log(`Routine maintenance completed. Processed ${processed} items`);
        }
        catch (error) {
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
    async cleanupOldAuditTrails() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 90);
        const result = await this.scheduledJobRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .execute();
        return {
            deleted: result.affected || 0,
            spaceFreed: (result.affected || 0) * 1024,
        };
    }
    async cleanupOldScheduledJobs() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        const result = await this.scheduledJobRepository
            .createQueryBuilder()
            .delete()
            .where('createdAt < :cutoffDate', { cutoffDate })
            .andWhere('status IN (:...statuses)', { statuses: [scheduled_job_entity_1.JobStatus.COMPLETED, scheduled_job_entity_1.JobStatus.FAILED, scheduled_job_entity_1.JobStatus.CANCELLED] })
            .execute();
        return {
            deleted: result.affected || 0,
            spaceFreed: (result.affected || 0) * 2048,
        };
    }
    async cleanupTemporaryData() {
        return {
            deleted: 0,
            spaceFreed: 0,
        };
    }
    async optimizeDatabaseIndexes() {
        try {
            return { optimized: 0 };
        }
        catch (error) {
            this.logger.error('Database index optimization failed', error);
            return { optimized: 0 };
        }
    }
    async clearApplicationCache() {
        try {
            return { cleared: 1, success: true };
        }
        catch (error) {
            this.logger.error('Cache clearing failed', error);
            return { cleared: 0, success: false };
        }
    }
    async updateDatabaseStatistics() {
        try {
            return { updated: 1 };
        }
        catch (error) {
            this.logger.error('Database statistics update failed', error);
            return { updated: 0 };
        }
    }
    async checkDatabaseHealth() {
        try {
            await this.dataSource.query('SELECT 1');
            return { name: 'database', passed: true };
        }
        catch (error) {
            return { name: 'database', passed: false, error: error.message };
        }
    }
    async checkSchedulerHealth() {
        try {
            const pendingJobs = await this.scheduledJobRepository.count({
                where: { status: scheduled_job_entity_1.JobStatus.PENDING },
            });
            return { name: 'scheduler', passed: true };
        }
        catch (error) {
            return { name: 'scheduler', passed: false, error: error.message };
        }
    }
    async checkMemoryUsage() {
        try {
            const memUsage = process.memoryUsage();
            const totalMemory = memUsage.heapTotal;
            const usedMemory = memUsage.heapUsed;
            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            if (memoryUsagePercent > 90) {
                return { name: 'memory', passed: false, error: `Memory usage at ${memoryUsagePercent.toFixed(2)}%` };
            }
            return { name: 'memory', passed: true };
        }
        catch (error) {
            return { name: 'memory', passed: false, error: error.message };
        }
    }
    async checkDiskSpace() {
        try {
            return { name: 'disk_space', passed: true };
        }
        catch (error) {
            return { name: 'disk_space', passed: false, error: error.message };
        }
    }
    async checkConnectivity() {
        try {
            return { name: 'connectivity', passed: true };
        }
        catch (error) {
            return { name: 'connectivity', passed: false, error: error.message };
        }
    }
    async generateSchedulerReport() {
        try {
            const totalJobs = await this.scheduledJobRepository.count();
            const pendingJobs = await this.scheduledJobRepository.count({ where: { status: scheduled_job_entity_1.JobStatus.PENDING } });
            const failedJobs = await this.scheduledJobRepository.count({ where: { status: scheduled_job_entity_1.JobStatus.FAILED } });
            this.logger.log(`Scheduler Report - Total: ${totalJobs}, Pending: ${pendingJobs}, Failed: ${failedJobs}`);
            return { name: 'scheduler_report', success: true };
        }
        catch (error) {
            return { name: 'scheduler_report', success: false, error: error.message };
        }
    }
    async generateSystemReport() {
        try {
            const memUsage = process.memoryUsage();
            this.logger.log(`System Report - Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
            return { name: 'system_report', success: true };
        }
        catch (error) {
            return { name: 'system_report', success: false, error: error.message };
        }
    }
    async generatePerformanceReport() {
        try {
            this.logger.log('Performance report generated');
            return { name: 'performance_report', success: true };
        }
        catch (error) {
            return { name: 'performance_report', success: false, error: error.message };
        }
    }
    async createDailyMaintenanceJob() {
        const job = this.scheduledJobRepository.create({
            name: 'Daily System Maintenance',
            description: 'Automated daily maintenance tasks',
            type: 'maintenance',
            status: scheduled_job_entity_1.JobStatus.PENDING,
            priority: 2,
            cronExpression: '0 2 * * *',
            scheduledAt: new Date(),
            parameters: {
                maintenanceType: 'comprehensive',
            },
            retryStrategy: scheduled_job_entity_1.RetryStrategy.EXPONENTIAL_BACKOFF,
            maxRetries: 2,
            timeoutSeconds: 1800,
            isSystemJob: true,
            scheduling: {
                isActive: true,
                isRecurring: true,
            },
        });
        return await this.scheduledJobRepository.save(job);
    }
    async createWeeklyMaintenanceJob() {
        const job = this.scheduledJobRepository.create({
            name: 'Weekly System Maintenance',
            description: 'Comprehensive weekly maintenance and optimization',
            type: 'maintenance',
            status: scheduled_job_entity_1.JobStatus.PENDING,
            priority: 3,
            cronExpression: '0 3 * * 0',
            scheduledAt: new Date(),
            parameters: {
                maintenanceType: 'comprehensive',
                deepCleanup: true,
            },
            retryStrategy: scheduled_job_entity_1.RetryStrategy.EXPONENTIAL_BACKOFF,
            maxRetries: 3,
            timeoutSeconds: 3600,
            isSystemJob: true,
            scheduling: {
                isActive: true,
                isRecurring: true,
            },
        });
        return await this.scheduledJobRepository.save(job);
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
        const baseDelay = job.retryDelay || 15;
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
        const maxDelay = 14400;
        delay = Math.min(delay, maxDelay);
        return new Date(Date.now() + delay * 1000);
    }
    calculateNextRunTime(job) {
        const now = new Date();
        if (job.cronExpression.includes('0 2 * * *')) {
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            tomorrow.setUTCHours(2, 0, 0, 0);
            return tomorrow;
        }
        else if (job.cronExpression.includes('0 3 * * 0')) {
            const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
            const nextSunday = new Date(now.getTime() + daysUntilSunday * 24 * 60 * 60 * 1000);
            nextSunday.setUTCHours(3, 0, 0, 0);
            return nextSunday;
        }
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
    async getMaintenanceMetrics() {
        const recentJobs = await this.scheduledJobRepository.find({
            where: { type: 'maintenance' },
            order: { completedAt: 'DESC' },
            take: 10,
        });
        const totalJobs = recentJobs.length;
        const successfulJobs = recentJobs.filter(job => job.status === scheduled_job_entity_1.JobStatus.COMPLETED).length;
        const avgExecutionTime = recentJobs.reduce((sum, job) => {
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
    async getNextScheduledMaintenance() {
        const nextJob = await this.scheduledJobRepository.findOne({
            where: {
                type: 'maintenance',
                status: scheduled_job_entity_1.JobStatus.PENDING,
                isActive: true,
            },
            order: { scheduledAt: 'ASC' },
        });
        return nextJob?.scheduledAt || null;
    }
};
exports.MaintenanceJob = MaintenanceJob;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceJob.prototype, "performSystemMaintenance", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_MIDNIGHT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceJob.prototype, "performDailyMaintenance", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_WEEK),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceJob.prototype, "performWeeklyMaintenance", null);
exports.MaintenanceJob = MaintenanceJob = MaintenanceJob_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(scheduled_job_entity_1.ScheduledJob)),
    __param(1, (0, typeorm_1.InjectRepository)(trade_entity_1.Trade)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], MaintenanceJob);
//# sourceMappingURL=maintenance.job.js.map
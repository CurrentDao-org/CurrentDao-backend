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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const scheduler_service_1 = require("../scheduler.service");
const market_hours_service_1 = require("../services/market-hours.service");
const schedule_trade_dto_1 = require("../dto/schedule-trade.dto");
const scheduled_job_entity_1 = require("../entities/scheduled-job.entity");
let SchedulerController = class SchedulerController {
    constructor(schedulerService, marketHoursService) {
        this.schedulerService = schedulerService;
        this.marketHoursService = marketHoursService;
    }
    async scheduleJob(scheduleTradeDto, req) {
        return this.schedulerService.scheduleTrade(scheduleTradeDto, req.user?.id);
    }
    async bulkScheduleJobs(bulkScheduleDto, req) {
        return this.schedulerService.bulkSchedule(bulkScheduleDto, req.user?.id);
    }
    async getJobs(query) {
        return this.schedulerService.getJobs(query);
    }
    async getJob(id) {
        return this.schedulerService.getJobById(id);
    }
    async updateJob(id, updateScheduleDto, req) {
        return this.schedulerService.updateSchedule(id, updateScheduleDto, req.user?.id);
    }
    async executeJob(id) {
        return this.schedulerService.executeJob(id);
    }
    async cancelJob(id, body, req) {
        return this.schedulerService.cancelJob(id, req.user?.id, body.reason);
    }
    async getJobMetrics(id) {
        return this.schedulerService.getJobMetrics(id);
    }
    async emergencyStop(emergencyStopDto, req) {
        return this.schedulerService.emergencyStop(emergencyStopDto, req.user?.id);
    }
    async resumeEmergencyStops(req) {
        return this.schedulerService.resumeEmergencyStops(req.user?.id);
    }
    async getMetrics() {
        return this.schedulerService.getSchedulerMetrics();
    }
    async getMarketHours(market) {
        return this.marketHoursService.getMarketHours(market);
    }
    async getMarketStatus(market) {
        return this.marketHoursService.getMarketStatus(market);
    }
    async isMarketOpen(market) {
        const isOpen = await this.marketHoursService.isMarketOpen(market);
        return { isOpen };
    }
    async getNextMarketOpen(market) {
        const nextOpen = await this.marketHoursService.getNextMarketOpen(market);
        return { nextOpen };
    }
    async getNextMarketClose(market) {
        const nextClose = await this.marketHoursService.getNextMarketClose(market);
        return { nextClose };
    }
    async getAllMarketStatuses() {
        return this.marketHoursService.getAllMarketStatuses();
    }
    async getActiveMarkets() {
        return this.marketHoursService.getActiveMarkets();
    }
    async isGloballyOpen() {
        const isOpen = await this.marketHoursService.isGloballyOpen();
        return { isOpen };
    }
    async validateExecutionTime(market, body) {
        const executionTime = new Date(body.executionTime);
        return this.marketHoursService.validateExecutionTime(market, executionTime);
    }
    async adjustForMarketHours(market, body) {
        const executionTime = new Date(body.executionTime);
        const adjustedTime = await this.marketHoursService.adjustForMarketHours(market, executionTime);
        return { adjustedTime };
    }
    async getHolidays(market, year) {
        const yearNum = year ? parseInt(year) : undefined;
        return this.marketHoursService.getHolidays(market, yearNum);
    }
    async getTradingCalendar(market, year) {
        const yearNum = parseInt(year);
        return this.marketHoursService.getTradingCalendar(market, yearNum);
    }
    async getHealth() {
        const metrics = await this.schedulerService.getSchedulerMetrics();
        let status = 'healthy';
        if (metrics.failedJobs > metrics.completedJobs * 0.1) {
            status = 'degraded';
        }
        if (metrics.failedJobs > metrics.completedJobs * 0.5) {
            status = 'unhealthy';
        }
        return {
            status,
            timestamp: new Date(),
            metrics,
            emergencyMode: false,
            activeJobs: metrics.runningJobs,
            lastExecution: null,
        };
    }
    async getStatus() {
        const metrics = await this.schedulerService.getSchedulerMetrics();
        const marketStatuses = await this.marketHoursService.getAllMarketStatuses();
        const memUsage = process.memoryUsage();
        const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        return {
            scheduler: {
                isRunning: true,
                uptime: process.uptime(),
                metrics,
            },
            markets: marketStatuses,
            jobs: {
                total: metrics.totalJobs,
                pending: metrics.pendingJobs,
                running: metrics.runningJobs,
                completed: metrics.completedJobs,
                failed: metrics.failedJobs,
            },
            system: {
                memoryUsage: memoryUsagePercent,
                cpuUsage: 0,
                diskSpace: 0,
            },
        };
    }
    async triggerMaintenance(body) {
        return {
            success: true,
            jobId: 'maintenance-job-id',
            message: 'Maintenance job triggered successfully',
        };
    }
    async getMaintenanceStatus() {
        return {
            lastMaintenance: new Date(),
            nextMaintenance: new Date(),
            status: 'idle',
        };
    }
};
exports.SchedulerController = SchedulerController;
__decorate([
    (0, common_1.Post)('jobs/schedule'),
    (0, swagger_1.ApiOperation)({ summary: 'Schedule a new job' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Job scheduled successfully', type: scheduled_job_entity_1.ScheduledJob }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.BAD_REQUEST, description: 'Invalid job data' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_trade_dto_1.ScheduleTradeDto, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "scheduleJob", null);
__decorate([
    (0, common_1.Post)('jobs/bulk-schedule'),
    (0, swagger_1.ApiOperation)({ summary: 'Schedule multiple jobs' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.CREATED, description: 'Jobs scheduled successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_trade_dto_1.BulkScheduleDto, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "bulkScheduleJobs", null);
__decorate([
    (0, common_1.Get)('jobs'),
    (0, swagger_1.ApiOperation)({ summary: 'Get scheduled jobs with filtering' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Jobs retrieved successfully' }),
    (0, swagger_1.ApiQuery)({ name: 'type', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'priority', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_trade_dto_1.JobQueryDto]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getJobs", null);
__decorate([
    (0, common_1.Get)('jobs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get job by ID' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Job retrieved successfully', type: scheduled_job_entity_1.ScheduledJob }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Job not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getJob", null);
__decorate([
    (0, common_1.Put)('jobs/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update scheduled job' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Job updated successfully', type: scheduled_job_entity_1.ScheduledJob }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Job not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, schedule_trade_dto_1.UpdateScheduleDto, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "updateJob", null);
__decorate([
    (0, common_1.Post)('jobs/:id/execute'),
    (0, swagger_1.ApiOperation)({ summary: 'Execute a job immediately' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Job executed successfully' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Job not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "executeJob", null);
__decorate([
    (0, common_1.Delete)('jobs/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a scheduled job' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Job cancelled successfully' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Job not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "cancelJob", null);
__decorate([
    (0, common_1.Get)('jobs/:id/metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get job execution metrics' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Metrics retrieved successfully' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.NOT_FOUND, description: 'Job not found' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Job ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getJobMetrics", null);
__decorate([
    (0, common_1.Post)('emergency-stop'),
    (0, swagger_1.ApiOperation)({ summary: 'Emergency stop all or specific jobs' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Emergency stop executed successfully' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [schedule_trade_dto_1.EmergencyStopDto, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "emergencyStop", null);
__decorate([
    (0, common_1.Post)('emergency-resume'),
    (0, swagger_1.ApiOperation)({ summary: 'Resume emergency stopped jobs' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Jobs resumed successfully' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "resumeEmergencyStops", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get scheduler metrics' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Metrics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('market-hours/:market'),
    (0, swagger_1.ApiOperation)({ summary: 'Get market hours for a specific market' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Market hours retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getMarketHours", null);
__decorate([
    (0, common_1.Get)('market-hours/:market/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current market status' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Market status retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getMarketStatus", null);
__decorate([
    (0, common_1.Get)('market-hours/:market/is-open'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if market is open' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Market status retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "isMarketOpen", null);
__decorate([
    (0, common_1.Get)('market-hours/:market/next-open'),
    (0, swagger_1.ApiOperation)({ summary: 'Get next market opening time' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Next opening time retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getNextMarketOpen", null);
__decorate([
    (0, common_1.Get)('market-hours/:market/next-close'),
    (0, swagger_1.ApiOperation)({ summary: 'Get next market closing time' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Next closing time retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getNextMarketClose", null);
__decorate([
    (0, common_1.Get)('market-hours/all'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all market statuses' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'All market statuses retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getAllMarketStatuses", null);
__decorate([
    (0, common_1.Get)('market-hours/active'),
    (0, swagger_1.ApiOperation)({ summary: 'Get currently active markets' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Active markets retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getActiveMarkets", null);
__decorate([
    (0, common_1.Get)('market-hours/is-globally-open'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if any market is globally open' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Global market status retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "isGloballyOpen", null);
__decorate([
    (0, common_1.Post)('market-hours/:market/validate-time'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate execution time for market hours' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Time validation completed' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "validateExecutionTime", null);
__decorate([
    (0, common_1.Post)('market-hours/:market/adjust-time'),
    (0, swagger_1.ApiOperation)({ summary: 'Adjust execution time to market hours' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Time adjustment completed' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    __param(0, (0, common_1.Param)('market')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "adjustForMarketHours", null);
__decorate([
    (0, common_1.Get)('market-hours/:market/holidays/:year?'),
    (0, swagger_1.ApiOperation)({ summary: 'Get market holidays for a specific year' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Holidays retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    (0, swagger_1.ApiParam)({ name: 'year', description: 'Year (optional)', required: false }),
    __param(0, (0, common_1.Param)('market')),
    __param(1, (0, common_1.Param)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getHolidays", null);
__decorate([
    (0, common_1.Get)('market-hours/:market/calendar/:year'),
    (0, swagger_1.ApiOperation)({ summary: 'Get complete trading calendar for a year' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Trading calendar retrieved successfully' }),
    (0, swagger_1.ApiParam)({ name: 'market', description: 'Market code (US, EU, ASIA)' }),
    (0, swagger_1.ApiParam)({ name: 'year', description: 'Year' }),
    __param(0, (0, common_1.Param)('market')),
    __param(1, (0, common_1.Param)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getTradingCalendar", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Get scheduler health status' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Health status retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getHealth", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get comprehensive scheduler status' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Status retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('maintenance/trigger'),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger manual maintenance job' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Maintenance job triggered successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "triggerMaintenance", null);
__decorate([
    (0, common_1.Get)('maintenance/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Get maintenance status' }),
    (0, swagger_1.ApiResponse)({ status: common_1.HttpStatus.OK, description: 'Maintenance status retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "getMaintenanceStatus", null);
exports.SchedulerController = SchedulerController = __decorate([
    (0, swagger_1.ApiTags)('scheduler'),
    (0, common_1.Controller)('api/scheduler'),
    __metadata("design:paramtypes", [scheduler_service_1.SchedulerService,
        market_hours_service_1.MarketHoursService])
], SchedulerController);
//# sourceMappingURL=scheduler.controller.js.map
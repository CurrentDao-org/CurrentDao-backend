import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulerService } from '../scheduler.service';
import { MarketHoursService } from '../services/market-hours.service';
import {
  ScheduleTradeDto,
  UpdateScheduleDto,
  BulkScheduleDto,
  EmergencyStopDto,
  JobQueryDto,
} from '../dto/schedule-trade.dto';
import { ScheduledJob } from '../entities/scheduled-job.entity';

@ApiTags('scheduler')
@Controller('api/scheduler')
export class SchedulerController {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly marketHoursService: MarketHoursService,
  ) {}

  @Post('jobs/schedule')
  @ApiOperation({ summary: 'Schedule a new job' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Job scheduled successfully',
    type: ScheduledJob,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid job data',
  })
  async scheduleJob(
    @Body() scheduleTradeDto: ScheduleTradeDto,
    @Request() req,
  ): Promise<ScheduledJob> {
    return this.schedulerService.scheduleTrade(scheduleTradeDto, req.user?.id);
  }

  @Post('jobs/bulk-schedule')
  @ApiOperation({ summary: 'Schedule multiple jobs' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Jobs scheduled successfully',
  })
  async bulkScheduleJobs(
    @Body() bulkScheduleDto: BulkScheduleDto,
    @Request() req,
  ): Promise<ScheduledJob[]> {
    return this.schedulerService.bulkSchedule(bulkScheduleDto, req.user?.id);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get scheduled jobs with filtering' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs retrieved successfully',
  })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getJobs(@Query() query: JobQueryDto) {
    return this.schedulerService.getJobs(query);
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job retrieved successfully',
    type: ScheduledJob,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async getJob(@Param('id') id: string): Promise<ScheduledJob> {
    return this.schedulerService.getJobById(id);
  }

  @Put('jobs/:id')
  @ApiOperation({ summary: 'Update scheduled job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job updated successfully',
    type: ScheduledJob,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async updateJob(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Request() req,
  ): Promise<ScheduledJob> {
    return this.schedulerService.updateSchedule(
      id,
      updateScheduleDto,
      req.user?.id,
    );
  }

  @Post('jobs/:id/execute')
  @ApiOperation({ summary: 'Execute a job immediately' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job executed successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async executeJob(@Param('id') id: string): Promise<any> {
    return this.schedulerService.executeJob(id);
  }

  @Delete('jobs/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a scheduled job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job cancelled successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async cancelJob(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ): Promise<ScheduledJob> {
    return this.schedulerService.cancelJob(id, req.user?.id, body.reason);
  }

  @Get('jobs/:id/metrics')
  @ApiOperation({ summary: 'Get job execution metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  async getJobMetrics(@Param('id') id: string): Promise<any> {
    return this.schedulerService.getJobMetrics(id);
  }

  @Post('emergency-stop')
  @ApiOperation({ summary: 'Emergency stop all or specific jobs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Emergency stop executed successfully',
  })
  async emergencyStop(
    @Body() emergencyStopDto: EmergencyStopDto,
    @Request() req,
  ): Promise<any> {
    return this.schedulerService.emergencyStop(emergencyStopDto, req.user?.id);
  }

  @Post('emergency-resume')
  @ApiOperation({ summary: 'Resume emergency stopped jobs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Jobs resumed successfully',
  })
  async resumeEmergencyStops(@Request() req): Promise<any> {
    return this.schedulerService.resumeEmergencyStops(req.user?.id);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get scheduler metrics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Metrics retrieved successfully',
  })
  async getMetrics(): Promise<any> {
    return this.schedulerService.getSchedulerMetrics();
  }

  @Get('market-hours/:market')
  @ApiOperation({ summary: 'Get market hours for a specific market' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Market hours retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async getMarketHours(@Param('market') market: string): Promise<any> {
    return this.marketHoursService.getMarketHours(market);
  }

  @Get('market-hours/:market/status')
  @ApiOperation({ summary: 'Get current market status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Market status retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async getMarketStatus(@Param('market') market: string): Promise<any> {
    return this.marketHoursService.getMarketStatus(market);
  }

  @Get('market-hours/:market/is-open')
  @ApiOperation({ summary: 'Check if market is open' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Market status retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async isMarketOpen(
    @Param('market') market: string,
  ): Promise<{ isOpen: boolean }> {
    const isOpen = await this.marketHoursService.isMarketOpen(market);
    return { isOpen };
  }

  @Get('market-hours/:market/next-open')
  @ApiOperation({ summary: 'Get next market opening time' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next opening time retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async getNextMarketOpen(
    @Param('market') market: string,
  ): Promise<{ nextOpen: Date }> {
    const nextOpen = await this.marketHoursService.getNextMarketOpen(market);
    return { nextOpen };
  }

  @Get('market-hours/:market/next-close')
  @ApiOperation({ summary: 'Get next market closing time' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next closing time retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async getNextMarketClose(
    @Param('market') market: string,
  ): Promise<{ nextClose: Date }> {
    const nextClose = await this.marketHoursService.getNextMarketClose(market);
    return { nextClose };
  }

  @Get('market-hours/all')
  @ApiOperation({ summary: 'Get all market statuses' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All market statuses retrieved successfully',
  })
  async getAllMarketStatuses(): Promise<Record<string, any>> {
    return this.marketHoursService.getAllMarketStatuses();
  }

  @Get('market-hours/active')
  @ApiOperation({ summary: 'Get currently active markets' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active markets retrieved successfully',
  })
  async getActiveMarkets(): Promise<string[]> {
    return this.marketHoursService.getActiveMarkets();
  }

  @Get('market-hours/is-globally-open')
  @ApiOperation({ summary: 'Check if any market is globally open' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Global market status retrieved successfully',
  })
  async isGloballyOpen(): Promise<{ isOpen: boolean }> {
    const isOpen = await this.marketHoursService.isGloballyOpen();
    return { isOpen };
  }

  @Post('market-hours/:market/validate-time')
  @ApiOperation({ summary: 'Validate execution time for market hours' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time validation completed',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async validateExecutionTime(
    @Param('market') market: string,
    @Body() body: { executionTime: string },
  ): Promise<any> {
    const executionTime = new Date(body.executionTime);
    return this.marketHoursService.validateExecutionTime(market, executionTime);
  }

  @Post('market-hours/:market/adjust-time')
  @ApiOperation({ summary: 'Adjust execution time to market hours' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time adjustment completed',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  async adjustForMarketHours(
    @Param('market') market: string,
    @Body() body: { executionTime: string },
  ): Promise<{ adjustedTime: Date }> {
    const executionTime = new Date(body.executionTime);
    const adjustedTime = await this.marketHoursService.adjustForMarketHours(
      market,
      executionTime,
    );
    return { adjustedTime };
  }

  @Get('market-hours/:market/holidays/:year?')
  @ApiOperation({ summary: 'Get market holidays for a specific year' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Holidays retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  @ApiParam({ name: 'year', description: 'Year (optional)', required: false })
  async getHolidays(
    @Param('market') market: string,
    @Param('year') year?: string,
  ): Promise<string[]> {
    const yearNum = year ? parseInt(year) : undefined;
    return this.marketHoursService.getHolidays(market, yearNum);
  }

  @Get('market-hours/:market/calendar/:year')
  @ApiOperation({ summary: 'Get complete trading calendar for a year' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trading calendar retrieved successfully',
  })
  @ApiParam({ name: 'market', description: 'Market code (US, EU, ASIA)' })
  @ApiParam({ name: 'year', description: 'Year' })
  async getTradingCalendar(
    @Param('market') market: string,
    @Param('year') year: string,
  ): Promise<any> {
    const yearNum = parseInt(year);
    return this.marketHoursService.getTradingCalendar(market, yearNum);
  }

  @Get('health')
  @ApiOperation({ summary: 'Get scheduler health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully',
  })
  async getHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: Date;
    metrics: any;
    emergencyMode: boolean;
    activeJobs: number;
    lastExecution: Date | null;
  }> {
    const metrics = await this.schedulerService.getSchedulerMetrics();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

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
      emergencyMode: false, // This would be set from the scheduler service
      activeJobs: metrics.runningJobs,
      lastExecution: null, // This would be set from the scheduler service
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get comprehensive scheduler status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status retrieved successfully',
  })
  async getStatus(): Promise<{
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
  }> {
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
        cpuUsage: 0, // This would be calculated from system metrics
        diskSpace: 0, // This would be calculated from system metrics
      },
    };
  }

  @Post('maintenance/trigger')
  @ApiOperation({ summary: 'Trigger manual maintenance job' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance job triggered successfully',
  })
  async triggerMaintenance(
    @Body() body: { type: string; parameters?: any },
  ): Promise<any> {
    // This would trigger a maintenance job
    return {
      success: true,
      jobId: 'maintenance-job-id',
      message: 'Maintenance job triggered successfully',
    };
  }

  @Get('maintenance/status')
  @ApiOperation({ summary: 'Get maintenance status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Maintenance status retrieved successfully',
  })
  async getMaintenanceStatus(): Promise<any> {
    // This would get maintenance status from the maintenance job
    return {
      lastMaintenance: new Date(),
      nextMaintenance: new Date(),
      status: 'idle',
    };
  }
}

import { Controller, Get, Post, Put, Body, Query, Param, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PerformanceService } from './performance.service';

@ApiTags('performance')
@Controller('performance')
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get current performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getMetrics(@Res() res?: Response) {
    try {
      const metrics = await this.performanceService.getCurrentMetrics();
      return res?.status(HttpStatus.OK).json(metrics) || metrics;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('profiling')
  @ApiOperation({ summary: 'Get performance profiling data' })
  @ApiResponse({ status: 200, description: 'Profiling data retrieved successfully' })
  @ApiQuery({ name: 'duration', required: false, description: 'Profiling duration in minutes' })
  async getProfiling(@Query('duration') duration?: string, @Res() res?: Response) {
    try {
      const durationMinutes = duration ? parseInt(duration) : 5;
      const profiling = await this.performanceService.getProfilingData(durationMinutes);
      return res?.status(HttpStatus.OK).json(profiling) || profiling;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Identify performance bottlenecks' })
  @ApiResponse({ status: 200, description: 'Bottlenecks identified successfully' })
  async getBottlenecks(@Res() res?: Response) {
    try {
      const bottlenecks = await this.performanceService.identifyBottlenecks();
      return res?.status(HttpStatus.OK).json(bottlenecks) || bottlenecks;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('auto-scale')
  @ApiOperation({ summary: 'Trigger auto-scaling' })
  @ApiResponse({ status: 200, description: 'Auto-scaling triggered successfully' })
  async triggerAutoScaling(@Body() body: { action: 'scale-up' | 'scale-down'; target?: string }, @Res() res?: Response) {
    try {
      const result = await this.performanceService.triggerAutoScaling(body.action, body.target);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('optimize')
  @ApiOperation({ summary: 'Trigger performance optimization' })
  @ApiResponse({ status: 200, description: 'Optimization triggered successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Optimization type' })
  async triggerOptimization(
    @Body() body: { type?: string; force?: boolean },
    @Query('type') queryType?: string,
    @Res() res?: Response,
  ) {
    try {
      const optimizationType = body.type || queryType || 'all';
      const result = await this.performanceService.triggerOptimization(optimizationType, body.force);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('resources')
  @ApiOperation({ summary: 'Get resource usage analytics' })
  @ApiResponse({ status: 200, description: 'Resource analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, description: 'Analysis period in hours' })
  async getResourceAnalytics(@Query('period') period?: string, @Res() res?: Response) {
    try {
      const periodHours = period ? parseInt(period) : 24;
      const analytics = await this.performanceService.getResourceAnalytics(periodHours);
      return res?.status(HttpStatus.OK).json(analytics) || analytics;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('load-balancing')
  @ApiOperation({ summary: 'Get load balancing status' })
  @ApiResponse({ status: 200, description: 'Load balancing status retrieved successfully' })
  async getLoadBalancing(@Res() res?: Response) {
    try {
      const status = await this.performanceService.getLoadBalancingStatus();
      return res?.status(HttpStatus.OK).json(status) || status;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Put('load-balancing')
  @ApiOperation({ summary: 'Update load balancing configuration' })
  @ApiResponse({ status: 200, description: 'Load balancing configuration updated successfully' })
  async updateLoadBalancing(@Body() config: any, @Res() res?: Response) {
    try {
      const result = await this.performanceService.updateLoadBalancing(config);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('caching')
  @ApiOperation({ summary: 'Get caching performance metrics' })
  @ApiResponse({ status: 200, description: 'Caching metrics retrieved successfully' })
  async getCachingMetrics(@Res() res?: Response) {
    try {
      const metrics = await this.performanceService.getCachingMetrics();
      return res?.status(HttpStatus.OK).json(metrics) || metrics;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('caching/optimize')
  @ApiOperation({ summary: 'Optimize caching strategy' })
  @ApiResponse({ status: 200, description: 'Caching optimization completed successfully' })
  async optimizeCaching(@Body() body: { strategy?: string; force?: boolean }, @Res() res?: Response) {
    try {
      const result = await this.performanceService.optimizeCaching(body.strategy, body.force);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('queries')
  @ApiOperation({ summary: 'Get database query performance' })
  @ApiResponse({ status: 200, description: 'Query performance retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of queries to return' })
  async getQueryPerformance(@Query('limit') limit?: string, @Res() res?: Response) {
    try {
      const queryLimit = limit ? parseInt(limit) : 50;
      const performance = await this.performanceService.getQueryPerformance(queryLimit);
      return res?.status(HttpStatus.OK).json(performance) || performance;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('queries/optimize')
  @ApiOperation({ summary: 'Optimize database queries' })
  @ApiResponse({ status: 200, description: 'Query optimization completed successfully' })
  async optimizeQueries(@Body() body: { queries?: string[]; force?: boolean }, @Res() res?: Response) {
    try {
      const result = await this.performanceService.optimizeQueries(body.queries, body.force);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get performance alerts' })
  @ApiResponse({ status: 200, description: 'Performance alerts retrieved successfully' })
  @ApiQuery({ name: 'severity', required: false, description: 'Alert severity level' })
  async getAlerts(@Query('severity') severity?: string, @Res() res?: Response) {
    try {
      const alerts = await this.performanceService.getAlerts(severity);
      return res?.status(HttpStatus.OK).json(alerts) || alerts;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get performance dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Res() res?: Response) {
    try {
      const dashboard = await this.performanceService.getDashboardData();
      return res?.status(HttpStatus.OK).json(dashboard) || dashboard;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
}

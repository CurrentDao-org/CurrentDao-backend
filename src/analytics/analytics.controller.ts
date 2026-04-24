import { Controller, Get, Post, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { StreamProcessorService } from './streaming/stream-processor.service';
import { LiveAggregationService } from './aggregation/live-aggregation.service';
import { DashboardDataService } from './dashboard/dashboard-data.service';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { TradingIntegrationService } from './integration/trading-integration.service';

@ApiTags('Real-Time Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly streamProcessorService: StreamProcessorService,
    private readonly liveAggregationService: LiveAggregationService,
    private readonly dashboardDataService: DashboardDataService,
    private readonly performanceMonitorService: PerformanceMonitorService,
    private readonly tradingIntegrationService: TradingIntegrationService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get real-time analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Query() params: any) {
    return this.analyticsService.getRealtimeDashboard(params);
  }

  @Post('stream/process')
  @ApiOperation({ summary: 'Process real-time stream data' })
  async processStream(@Body() streamData: any) {
    return this.streamProcessorService.processStreamData(streamData);
  }

  @Get('stream/metrics')
  @ApiOperation({ summary: 'Get stream processing metrics' })
  async getStreamMetrics() {
    return this.streamProcessorService.getStreamMetrics();
  }

  @Get('stream/health')
  @ApiOperation({ summary: 'Check stream processor health' })
  async getStreamHealth() {
    return this.streamProcessorService.getHealthCheck();
  }

  @Post('aggregation/calculate')
  @ApiOperation({ summary: 'Calculate live aggregations' })
  async calculateAggregation(@Body() aggregationConfig: any) {
    return this.liveAggregationService.calculateAggregation(aggregationConfig);
  }

  @Get('aggregation/metrics')
  @ApiOperation({ summary: 'Get live aggregation metrics' })
  async getAggregationMetrics(@Query() params: any) {
    return this.liveAggregationService.getMetrics(params);
  }

  @Get('dashboard/data')
  @ApiOperation({ summary: 'Get dashboard data with real-time updates' })
  async getDashboardData(@Query() params: any) {
    return this.dashboardDataService.getDashboardData(params);
  }

  @Post('dashboard/refresh')
  @ApiOperation({ summary: 'Refresh dashboard data' })
  async refreshDashboard(@Body() refreshConfig: any) {
    return this.dashboardDataService.refreshData(refreshConfig);
  }

  @Get('monitoring/performance')
  @ApiOperation({ summary: 'Get performance monitoring data' })
  async getPerformanceMetrics(@Query() params: any) {
    return this.performanceMonitorService.getPerformanceMetrics(params);
  }

  @Post('monitoring/alerts')
  @ApiOperation({ summary: 'Create performance alert' })
  async createAlert(@Body() alertConfig: any) {
    return this.performanceMonitorService.createAlert(alertConfig);
  }

  @Get('monitoring/bottlenecks')
  @ApiOperation({ summary: 'Identify performance bottlenecks' })
  async identifyBottlenecks(@Query() params: any) {
    return this.performanceMonitorService.identifyBottlenecks(params);
  }

  @Post('integration/trading/sync')
  @ApiOperation({ summary: 'Sync trading data for analytics' })
  async syncTradingData(@Body() syncConfig: any) {
    return this.tradingIntegrationService.syncTradingData(syncConfig);
  }

  @Get('integration/trading/data')
  @ApiOperation({ summary: 'Get integrated trading analytics data' })
  async getTradingAnalytics(@Query() params: any) {
    return this.tradingIntegrationService.getTradingAnalytics(params);
  }

  @Get('integration/pricing/data')
  @ApiOperation({ summary: 'Get integrated pricing analytics data' })
  async getPricingAnalytics(@Query() params: any) {
    return this.tradingIntegrationService.getPricingAnalytics(params);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for real-time analytics' })
  @ApiResponse({ status: 200, description: 'Real-time analytics system is healthy' })
  async healthCheck() {
    return this.analyticsService.healthCheck();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get comprehensive analytics metrics' })
  async getMetrics() {
    return this.analyticsService.getSystemMetrics();
  }
}

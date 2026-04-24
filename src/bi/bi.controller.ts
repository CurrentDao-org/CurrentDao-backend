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
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { BIService } from './bi.service';
import { AdvancedAnalyticsService } from './analytics/advanced-analytics.service';
import { CustomReportsService } from './reports/custom-reports.service';
import { KPITrackingService } from './kpi/kpi-tracking.service';
import { ExecutiveInsightsService } from './insights/executive-insights.service';
import { DataVizService } from './visualization/data-viz.service';
import { JwtAuthGuard } from '../security/guards/jwt-auth.guard';
import { RolesGuard } from '../security/guards/roles.guard';
import { Roles } from '../security/decorators/roles.decorator';

@ApiTags('Business Intelligence')
@Controller('bi')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BIController {
  constructor(
    private readonly biService: BIService,
    private readonly analyticsService: AdvancedAnalyticsService,
    private readonly reportsService: CustomReportsService,
    private readonly kpiService: KPITrackingService,
    private readonly insightsService: ExecutiveInsightsService,
    private readonly vizService: DataVizService,
  ) {}

  // Dashboard endpoints
  @Post('dashboards')
  @ApiOperation({ summary: 'Create BI dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created successfully' })
  async createDashboard(
    @Body(ValidationPipe) request: any,
    @Request() req,
  ) {
    return this.biService.createDashboard(request, req.user.id);
  }

  @Get('dashboards')
  @ApiOperation({ summary: 'Get user dashboards' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of dashboards' })
  async getDashboards(
    @Request() req,
    @Query('category') category?: string,
  ) {
    return this.biService.getDashboards(req.user.id, category);
  }

  @Get('dashboards/:id')
  @ApiOperation({ summary: 'Get dashboard details' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard details' })
  async getDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.biService.getDashboardDetails(id, req.user.id);
  }

  @Put('dashboards/:id')
  @ApiOperation({ summary: 'Update dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: any,
    @Request() req,
  ) {
    return this.biService.updateDashboard(id, req.user.id, updates);
  }

  @Delete('dashboards/:id')
  @ApiOperation({ summary: 'Delete dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  async deleteDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    await this.biService.deleteDashboard(id, req.user.id);
    return { message: 'Dashboard deleted successfully' };
  }

  @Post('dashboards/:id/refresh')
  @ApiOperation({ summary: 'Refresh dashboard data' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard refreshed' })
  async refreshDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.biService.refreshDashboard(id, req.user.id);
  }

  // Analytics endpoints
  @Post('analytics/queries/:queryId/execute')
  @ApiOperation({ summary: 'Execute analytics query' })
  @ApiParam({ name: 'queryId', description: 'Query ID' })
  @ApiResponse({ status: 200, description: 'Query results' })
  async executeQuery(
    @Param('queryId') queryId: string,
    @Body() parameters?: any,
  ) {
    return this.analyticsService.executeQuery(queryId, parameters);
  }

  @Post('analytics/queries/custom')
  @ApiOperation({ summary: 'Execute custom SQL query' })
  @ApiResponse({ status: 200, description: 'Query results' })
  async executeCustomQuery(
    @Body() body: { sql: string; parameters?: any },
  ) {
    return this.analyticsService.executeCustomQuery(body.sql, body.parameters);
  }

  @Post('analytics/aggregate')
  @ApiOperation({ summary: 'Aggregate data' })
  @ApiResponse({ status: 200, description: 'Aggregated data' })
  async aggregateData(
    @Body() body: { tableName: string; aggregation: any },
  ) {
    return this.analyticsService.aggregateData(body.tableName, body.aggregation);
  }

  @Post('analytics/insights')
  @ApiOperation({ summary: 'Generate analytics insights' })
  @ApiResponse({ status: 200, description: 'Generated insights' })
  async generateInsights(
    @Body() body: { dataSource: string; timeRange: { start: Date; end: Date } },
  ) {
    return this.analyticsService.generateInsights(body.dataSource, body.timeRange);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get analytics performance metrics' })
  @ApiQuery({ name: 'start', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'end', required: true, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getPerformanceMetrics(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.analyticsService.getPerformanceMetrics({
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Post('analytics/optimize')
  @ApiOperation({ summary: 'Optimize SQL query' })
  @ApiResponse({ status: 200, description: 'Optimization suggestions' })
  async optimizeQuery(@Body() body: { sql: string }) {
    return this.analyticsService.optimizeQuery(body.sql);
  }

  @Post('analytics/validate')
  @ApiOperation({ summary: 'Validate SQL query' })
  @ApiResponse({ status: 200, description: 'Validation results' })
  async validateQuery(@Body() body: { sql: string }) {
    return this.analyticsService.validateQuery(body.sql);
  }

  // Reports endpoints
  @Post('reports')
  @ApiOperation({ summary: 'Create custom report' })
  @ApiResponse({ status: 201, description: 'Report created' })
  async createReport(
    @Body(ValidationPipe) request: any,
    @Request() req,
  ) {
    return this.reportsService.createReport(request, req.user.id);
  }

  @Post('reports/:id/generate')
  @ApiOperation({ summary: 'Generate report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiQuery({ name: 'format', required: false, description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Report generated' })
  async generateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Query('format') format?: string,
  ) {
    return this.reportsService.generateReport(id, req.user.id, format as any);
  }

  @Get('reports')
  @ApiOperation({ summary: 'Get user reports' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getReports(
    @Request() req,
    @Query('status') status?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset?: number,
  ) {
    return this.reportsService.getReports(req.user.id, { status, limit, offset });
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Get report details' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report details' })
  async getReportDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.reportsService.getReportDetails(id, req.user.id);
  }

  @Put('reports/:id')
  @ApiOperation({ summary: 'Update report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report updated' })
  async updateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: any,
    @Request() req,
  ) {
    return this.reportsService.updateReport(id, req.user.id, updates);
  }

  @Delete('reports/:id')
  @ApiOperation({ summary: 'Delete report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report deleted' })
  async deleteReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    await this.reportsService.deleteReport(id, req.user.id);
    return { message: 'Report deleted successfully' };
  }

  @Get('reports/templates')
  @ApiOperation({ summary: 'Get report templates' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'search', required: false, description: 'Search templates' })
  @ApiResponse({ status: 200, description: 'Report templates' })
  async getReportTemplates(
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getReportTemplates(category, search);
  }

  @Post('reports/templates')
  @ApiOperation({ summary: 'Create report template' })
  @ApiResponse({ status: 201, description: 'Template created' })
  async createReportTemplate(
    @Body(ValidationPipe) templateData: any,
    @Request() req,
  ) {
    return this.reportsService.createReportTemplate(templateData, req.user.id);
  }

  @Post('reports/:id/schedule')
  @ApiOperation({ summary: 'Schedule report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report scheduled' })
  async scheduleReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() schedule: any,
    @Request() req,
  ) {
    await this.reportsService.scheduleReport(id, req.user.id, schedule);
    return { message: 'Report scheduled successfully' };
  }

  @Delete('reports/:id/schedule')
  @ApiOperation({ summary: 'Unschedule report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report unscheduled' })
  async unscheduleReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    await this.reportsService.unscheduleReport(id, req.user.id);
    return { message: 'Report unscheduled successfully' };
  }

  @Post('reports/templates/:id/preview')
  @ApiOperation({ summary: 'Preview report template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template preview' })
  async previewReportTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() parameters?: any,
  ) {
    return this.reportsService.previewReport(id, parameters);
  }

  @Get('reports/:id/export')
  @ApiOperation({ summary: 'Export report data' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiQuery({ name: 'format', required: true, description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Exported data' })
  async exportReportData(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Query('format') format: string,
  ) {
    return this.reportsService.exportReportData(id, req.user.id, format as any);
  }

  // KPI endpoints
  @Post('kpis')
  @ApiOperation({ summary: 'Create KPI' })
  @ApiResponse({ status: 201, description: 'KPI created' })
  async createKPI(
    @Body(ValidationPipe) request: any,
    @Request() req,
  ) {
    return this.kpiService.createKPI(request, req.user.id);
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Get user KPIs' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'List of KPIs' })
  async getKPIs(
    @Request() req,
    @Query('category') category?: string,
  ) {
    return this.kpiService.getKPIs(req.user.id, category);
  }

  @Get('kpis/:id')
  @ApiOperation({ summary: 'Get KPI details' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI details' })
  async getKPIDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.kpiService.getKPIDetails(id, req.user.id);
  }

  @Put('kpis/:id')
  @ApiOperation({ summary: 'Update KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI updated' })
  async updateKPI(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updates: any,
    @Request() req,
  ) {
    return this.kpiService.updateKPI(id, req.user.id, updates);
  }

  @Delete('kpis/:id')
  @ApiOperation({ summary: 'Delete KPI' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI deleted' })
  async deleteKPI(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    await this.kpiService.deleteKPI(id, req.user.id);
    return { message: 'KPI deleted successfully' };
  }

  @Post('kpis/:id/calculate')
  @ApiOperation({ summary: 'Calculate KPI value' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI value calculated' })
  async calculateKPIValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.kpiService.calculateKPIValue(id);
  }

  @Get('kpis/:id/history')
  @ApiOperation({ summary: 'Get KPI history' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiQuery({ name: 'start', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'end', required: true, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'KPI history' })
  async getKPIHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.kpiService.getKPIHistory(id, {
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Get('kpis/alerts')
  @ApiOperation({ summary: 'Get KPI alerts' })
  @ApiQuery({ name: 'acknowledged', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'KPI alerts' })
  async getKPIAlerts(
    @Request() req,
    @Query('acknowledged') acknowledged?: boolean,
  ) {
    return this.kpiService.getKPIAlerts(req.user.id, acknowledged);
  }

  @Post('kpis/alerts/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge KPI alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body?: { feedback?: string },
  ) {
    await this.kpiService.acknowledgeAlert(id, req.user.id);
    return { message: 'Alert acknowledged successfully' };
  }

  @Get('kpis/dashboard')
  @ApiOperation({ summary: 'Get KPI dashboard' })
  @ApiResponse({ status: 200, description: 'KPI dashboard data' })
  async getKPIDashboard(@Request() req) {
    return this.kpiService.getKPIDashboard(req.user.id);
  }

  @Get('kpis/categories')
  @ApiOperation({ summary: 'Get KPI categories' })
  @ApiResponse({ status: 200, description: 'KPI categories' })
  async getKPICategories(@Request() req) {
    return this.kpiService.getKPICategories(req.user.id);
  }

  // Insights endpoints
  @Post('insights/generate')
  @ApiOperation({ summary: 'Generate executive insights' })
  @ApiResponse({ status: 200, description: 'Generated insights' })
  async generateInsights(
    @Body() request: any,
    @Request() req,
  ) {
    return this.insightsService.generateInsights(request, req.user.id);
  }

  @Get('insights/dashboard')
  @ApiOperation({ summary: 'Get executive dashboard' })
  @ApiResponse({ status: 200, description: 'Executive dashboard data' })
  async getExecutiveDashboard(@Request() req) {
    return this.insightsService.getExecutiveDashboard(req.user.id);
  }

  @Get('insights/:id')
  @ApiOperation({ summary: 'Get insight details' })
  @ApiParam({ name: 'id', description: 'Insight ID' })
  @ApiResponse({ status: 200, description: 'Insight details' })
  async getInsightDetails(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ) {
    return this.insightsService.getInsightDetails(id, req.user.id);
  }

  @Post('insights/:id/acknowledge')
  @ApiOperation({ summary: 'Acknowledge insight' })
  @ApiParam({ name: 'id', description: 'Insight ID' })
  @ApiResponse({ status: 200, description: 'Insight acknowledged' })
  async acknowledgeInsight(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() body?: { feedback?: string },
  ) {
    await this.insightsService.acknowledgeInsight(id, req.user.id, body?.feedback);
    return { message: 'Insight acknowledged successfully' };
  }

  @Get('insights/history')
  @ApiOperation({ summary: 'Get insight history' })
  @ApiQuery({ name: 'start', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'end', required: true, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Insight history' })
  async getInsightHistory(
    @Request() req,
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.insightsService.getInsightHistory(req.user.id, {
      start: new Date(start),
      end: new Date(end),
    });
  }

  // Visualization endpoints
  @Post('visualizations')
  @ApiOperation({ summary: 'Create visualization' })
  @ApiResponse({ status: 201, description: 'Visualization created' })
  async createVisualization(@Body(ValidationPipe) request: any) {
    return this.vizService.createVisualization(request);
  }

  @Post('visualizations/chart')
  @ApiOperation({ summary: 'Generate chart' })
  @ApiResponse({ status: 200, description: 'Chart generated' })
  async generateChart(@Body(ValidationPipe) request: any) {
    return this.vizService.generateChart(request);
  }

  @Get('visualizations/templates')
  @ApiOperation({ summary: 'Get chart templates' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Chart templates' })
  async getChartTemplates(@Query('category') category?: string) {
    return this.vizService.getChartTemplates(category);
  }

  @Get('visualizations/types')
  @ApiOperation({ summary: 'Get supported chart types' })
  @ApiResponse({ status: 200, description: 'Supported chart types' })
  async getSupportedChartTypes() {
    return this.vizService.getSupportedChartTypes();
  }

  @Post('visualizations/components')
  @ApiOperation({ summary: 'Create dashboard component' })
  @ApiResponse({ status: 201, description: 'Component created' })
  async createDashboardComponent(@Body(ValidationPipe) component: any) {
    return this.vizService.createDashboardComponent(component);
  }

  @Put('visualizations/:id/data')
  @ApiOperation({ summary: 'Update visualization data' })
  @ApiParam({ name: 'id', description: 'Visualization ID' })
  @ApiResponse({ status: 200, description: 'Visualization data updated' })
  async updateVisualizationData(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { data: any; metadata?: any },
  ) {
    return this.vizService.updateVisualizationData(id, body.data, body.metadata);
  }

  @Get('visualizations/:id/export')
  @ApiOperation({ summary: 'Export visualization' })
  @ApiParam({ name: 'id', description: 'Visualization ID' })
  @ApiQuery({ name: 'format', required: true, description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Visualization exported' })
  async exportVisualization(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string,
    @Res() res: Response,
  ) {
    const result = await this.vizService.exportVisualization(id, format as any);
    
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Type', result.mimeType);
    res.send(result.data);
  }

  @Get('visualizations/:id/insights')
  @ApiOperation({ summary: 'Get visualization insights' })
  @ApiParam({ name: 'id', description: 'Visualization ID' })
  @ApiResponse({ status: 200, description: 'Visualization insights' })
  async getVisualizationInsights(@Param('id', ParseUUIDPipe) id: string) {
    return this.vizService.getVisualizationInsights(id);
  }

  @Post('visualizations/:id/optimize')
  @ApiOperation({ summary: 'Optimize visualization' })
  @ApiParam({ name: 'id', description: 'Visualization ID' })
  @ApiResponse({ status: 200, description: 'Visualization optimized' })
  async optimizeVisualization(@Param('id', ParseUUIDPipe) id: string) {
    return this.vizService.optimizeVisualization(id);
  }

  @Get('visualizations/:id/performance')
  @ApiOperation({ summary: 'Get visualization performance' })
  @ApiParam({ name: 'id', description: 'Visualization ID' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getVisualizationPerformance(@Param('id', ParseUUIDPipe) id: string) {
    return this.vizService.getVisualizationPerformance(id);
  }

  // System endpoints
  @Get('system/health')
  @Roles('admin')
  @ApiOperation({ summary: 'Get BI system health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  async getSystemHealth() {
    return this.biService.getSystemHealth();
  }

  @Get('system/statistics')
  @Roles('admin')
  @ApiOperation({ summary: 'Get BI system statistics' })
  @ApiResponse({ status: 200, description: 'System statistics' })
  async getBIStatistics() {
    return this.biService.getBIStatistics();
  }

  @Get('system/overview')
  @ApiOperation({ summary: 'Get executive overview' })
  @ApiResponse({ status: 200, description: 'Executive overview' })
  async getExecutiveOverview(@Request() req) {
    return this.biService.getExecutiveOverview(req.user.id);
  }

  @Post('system/initialize')
  @Roles('admin')
  @ApiOperation({ summary: 'Initialize BI system' })
  @ApiResponse({ status: 200, description: 'BI system initialized' })
  async initializeSystem() {
    await this.biService.initializeSystem();
    return { message: 'BI system initialized successfully' };
  }

  // Search endpoints
  @Get('search')
  @ApiOperation({ summary: 'Search BI content' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'type', required: false, description: 'Content type' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchContent(
    @Query('q') query: string,
    @Request() req,
    @Query('type') type?: string,
    @Query('category') category?: string,
  ) {
    return this.biService.searchContent(query, req.user.id, {
      type: type as any,
      category,
    });
  }

  // Export endpoints
  @Get('export/:type/:id')
  @ApiOperation({ summary: 'Export BI content' })
  @ApiParam({ name: 'type', description: 'Content type' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiQuery({ name: 'format', required: true, description: 'Export format' })
  @ApiResponse({ status: 200, description: 'Content exported' })
  async exportData(
    @Param('type') type: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string,
    @Request() req,
    @Res() res: Response,
  ) {
    const result = await this.biService.exportData(type as any, id, format as any, req.user.id);
    
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.setHeader('Content-Type', result.mimeType);
    res.send(result.data);
  }

  // Usage analytics endpoints
  @Get('usage/analytics')
  @ApiOperation({ summary: 'Get usage analytics' })
  @ApiQuery({ name: 'start', required: true, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'end', required: true, description: 'End date (ISO string)' })
  @ApiResponse({ status: 200, description: 'Usage analytics' })
  async getUsageAnalytics(
    @Query('start') start: string,
    @Query('end') end: string,
    @Request() req,
  ) {
    return this.biService.getUsageAnalytics(req.user.id, {
      start: new Date(start),
      end: new Date(end),
    });
  }

  @Get('health')
  @ApiOperation({ summary: 'BI service health check' })
  @ApiResponse({ status: 200, description: 'Service healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date(),
      service: 'business-intelligence',
      version: '1.0.0',
    };
  }
}

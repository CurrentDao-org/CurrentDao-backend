import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dashboard } from './entities/dashboard.entity';
import { Report } from './entities/report.entity';
import { KPI } from './entities/kpi.entity';
import { ReportTemplate } from './entities/report-template.entity';
import { AdvancedAnalyticsService } from './analytics/advanced-analytics.service';
import { CustomReportsService } from './reports/custom-reports.service';
import { KPITrackingService } from './kpi/kpi-tracking.service';
import { ExecutiveInsightsService } from './insights/executive-insights.service';
import { DataVizService } from './visualization/data-viz.service';

export interface BIDashboardRequest {
  name: string;
  description: string;
  category: string;
  layout: any;
  filters?: any;
  isPublic?: boolean;
  sharing?: any;
  metadata?: any;
}

export interface BISystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  components: Array<{
    name: string;
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    lastCheck: Date;
    issues?: string[];
  }>;
  overallMetrics: {
    totalQueries: number;
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

export interface BIStatistics {
  dashboards: {
    total: number;
    public: number;
    private: number;
    categories: Record<string, number>;
  };
  reports: {
    total: number;
    scheduled: number;
    completed: number;
    failed: number;
  };
  kpis: {
    total: number;
    active: number;
    critical: number;
    categories: Record<string, number>;
  };
  insights: {
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
  performance: {
    avgQueryTime: number;
    cacheHitRate: number;
    systemLoad: number;
  };
}

@Injectable()
export class BIService {
  private readonly logger = new Logger(BIService.name);

  constructor(
    @InjectRepository(Dashboard)
    private readonly dashboardRepository: Repository<Dashboard>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(KPI)
    private readonly kpiRepository: Repository<KPI>,
    @InjectRepository(ReportTemplate)
    private readonly templateRepository: Repository<ReportTemplate>,
    private readonly analyticsService: AdvancedAnalyticsService,
    private readonly reportsService: CustomReportsService,
    private readonly kpiService: KPITrackingService,
    private readonly insightsService: ExecutiveInsightsService,
    private readonly vizService: DataVizService,
  ) {}

  async createDashboard(request: BIDashboardRequest, userId: string): Promise<Dashboard> {
    this.logger.log(`Creating BI dashboard: ${request.name}`);

    const dashboard = this.dashboardRepository.create({
      id: crypto.randomUUID(),
      userId,
      ...request,
      isActive: true,
      lastRefreshed: new Date(),
    });

    await this.dashboardRepository.save(dashboard);

    return dashboard;
  }

  async getDashboards(userId: string, category?: string): Promise<Dashboard[]> {
    this.logger.log(`Fetching dashboards for user: ${userId}`);

    const queryBuilder = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .where('dashboard.isActive = :isActive', { isActive: true })
      .andWhere('(dashboard.userId = :userId OR dashboard.isPublic = :isPublic)', { userId, isPublic: true });

    if (category) {
      queryBuilder.andWhere('dashboard.category = :category', { category });
    }

    return queryBuilder.orderBy('dashboard.updatedAt', 'DESC').getMany();
  }

  async getDashboardDetails(dashboardId: string, userId: string): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId, isActive: true },
    });

    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    // Check permissions
    if (dashboard.userId !== userId && !dashboard.isPublic) {
      throw new Error(`Access denied for dashboard ${dashboardId}`);
    }

    return dashboard;
  }

  async updateDashboard(dashboardId: string, userId: string, updates: Partial<Dashboard>): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId, userId },
    });

    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    Object.assign(dashboard, updates, {
      metadata: {
        ...dashboard.metadata,
        lastModifiedBy: userId,
        version: (dashboard.metadata?.version || 1) + 1,
      },
    });

    await this.dashboardRepository.save(dashboard);

    return dashboard;
  }

  async deleteDashboard(dashboardId: string, userId: string): Promise<void> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId, userId },
    });

    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    dashboard.isActive = false;
    await this.dashboardRepository.save(dashboard);

    this.logger.log(`Dashboard ${dashboardId} deleted`);
  }

  async refreshDashboard(dashboardId: string, userId: string): Promise<{
    dashboardId: string;
    refreshedAt: Date;
    componentsRefreshed: number;
    errors: string[];
  }> {
    const dashboard = await this.getDashboardDetails(dashboardId, userId);

    const errors: string[] = [];
    let componentsRefreshed = 0;

    // Refresh each component in the dashboard
    for (const component of dashboard.layout.components) {
      try {
        // In a real implementation, this would refresh the component data
        componentsRefreshed++;
      } catch (error) {
        errors.push(`Failed to refresh component ${component.id}: ${error.message}`);
      }
    }

    // Update dashboard refresh timestamp
    dashboard.lastRefreshed = new Date();
    await this.dashboardRepository.save(dashboard);

    return {
      dashboardId,
      refreshedAt: new Date(),
      componentsRefreshed,
      errors,
    };
  }

  async getSystemHealth(): Promise<BISystemHealth> {
    this.logger.log('Checking BI system health');

    const components = [];

    // Check analytics service
    try {
      const startTime = Date.now();
      await this.analyticsService.getPerformanceMetrics({ start: new Date(Date.now() - 3600000), end: new Date() });
      const responseTime = Date.now() - startTime;

      components.push({
        name: 'Analytics Engine',
        status: 'healthy' as const,
        responseTime,
        lastCheck: new Date(),
      });
    } catch (error) {
      components.push({
        name: 'Analytics Engine',
        status: 'critical' as const,
        responseTime: 0,
        lastCheck: new Date(),
        issues: [error.message],
      });
    }

    // Check KPI service
    try {
      const startTime = Date.now();
      await this.kpiService.getKPIs('system-check');
      const responseTime = Date.now() - startTime;

      components.push({
        name: 'KPI Tracking',
        status: 'healthy' as const,
        responseTime,
        lastCheck: new Date(),
      });
    } catch (error) {
      components.push({
        name: 'KPI Tracking',
        status: 'warning' as const,
        responseTime: 0,
        lastCheck: new Date(),
        issues: [error.message],
      });
    }

    // Check visualization service
    try {
      const startTime = Date.now();
      await this.vizService.getSupportedChartTypes();
      const responseTime = Date.now() - startTime;

      components.push({
        name: 'Data Visualization',
        status: 'healthy' as const,
        responseTime,
        lastCheck: new Date(),
      });
    } catch (error) {
      components.push({
        name: 'Data Visualization',
        status: 'warning' as const,
        responseTime: 0,
        lastCheck: new Date(),
        issues: [error.message],
      });
    }

    // Determine overall status
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const warningCount = components.filter(c => c.status === 'warning').length;
    const overallStatus = criticalCount > 0 ? 'critical' : warningCount > 0 ? 'warning' : 'healthy';

    // Get overall metrics
    const overallMetrics = await this.getOverallMetrics();

    return {
      status: overallStatus,
      components,
      overallMetrics,
    };
  }

  async getBIStatistics(): Promise<BIStatistics> {
    this.logger.log('Generating BI statistics');

    // Dashboard statistics
    const [totalDashboards, publicDashboards, privateDashboards] = await Promise.all([
      this.dashboardRepository.count({ where: { isActive: true } }),
      this.dashboardRepository.count({ where: { isActive: true, isPublic: true } }),
      this.dashboardRepository.count({ where: { isActive: true, isPublic: false } }),
    ]);

    const dashboardCategories = await this.dashboardRepository
      .createQueryBuilder('dashboard')
      .select('dashboard.category', 'category')
      .addSelect('COUNT(dashboard.id)', 'count')
      .where('dashboard.isActive = :isActive', { isActive: true })
      .groupBy('dashboard.category')
      .getRawMany();

    // Report statistics
    const [totalReports, scheduledReports, completedReports, failedReports] = await Promise.all([
      this.reportRepository.count(),
      this.reportRepository.count({ where: { 'schedule.enabled': true } }),
      this.reportRepository.count({ where: { status: 'completed' } }),
      this.reportRepository.count({ where: { status: 'failed' } }),
    ]);

    // KPI statistics
    const [totalKPIs, activeKPIs, criticalKPIs] = await Promise.all([
      this.kpiRepository.count({ where: { isActive: true } }),
      this.kpiRepository.count({ where: { isActive: true, isPublic: true } }),
      this.kpiRepository.count({ where: { isActive: true, 'targets.thresholds': { $exists: true, $ne: [] } } }),
    ]);

    const kpiCategories = await this.kpiRepository
      .createQueryBuilder('kpi')
      .select('kpi.category', 'category')
      .addSelect('COUNT(kpi.id)', 'count')
      .where('kpi.isActive = :isActive', { isActive: true })
      .groupBy('kpi.category')
      .getRawMany();

    // Performance metrics
    const performance = await this.getPerformanceMetrics();

    return {
      dashboards: {
        total: totalDashboards,
        public: publicDashboards,
        private: privateDashboards,
        categories: this.convertToObject(dashboardCategories, 'category', 'count'),
      },
      reports: {
        total: totalReports,
        scheduled: scheduledReports,
        completed: completedReports,
        failed: failedReports,
      },
      kpis: {
        total: totalKPIs,
        active: activeKPIs,
        critical: criticalKPIs,
        categories: this.convertToObject(kpiCategories, 'category', 'count'),
      },
      insights: {
        total: 0, // Would be calculated from insights table
        byCategory: {},
        byPriority: {},
      },
      performance,
    };
  }

  async getExecutiveOverview(userId: string): Promise<{
    summary: {
      totalDashboards: number;
      activeKPIs: number;
      pendingReports: number;
      criticalInsights: number;
    };
    kpiSummary: any;
    recentInsights: any[];
    systemHealth: BISystemHealth;
    performanceTrends: Array<{
      date: Date;
      queryTime: number;
      errorRate: number;
      cacheHitRate: number;
    }>;
  }> {
    this.logger.log(`Generating executive overview for user: ${userId}`);

    const [dashboards, kpis, reports, insights, systemHealth] = await Promise.all([
      this.getDashboards(userId),
      this.kpiService.getKPIs(userId),
      this.reportsService.getReports(userId, { status: 'pending' }),
      this.insightsService.generateInsights({ timeframe: 'week' }, userId),
      this.getSystemHealth(),
    ]);

    const summary = {
      totalDashboards: dashboards.length,
      activeKPIs: kpis.length,
      pendingReports: reports.total,
      criticalInsights: insights.filter(i => i.priority === 'critical').length,
    };

    const kpiSummary = await this.kpiService.getKPIDashboard(userId);

    // Mock performance trends
    const performanceTrends = Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
      queryTime: 1200 + Math.random() * 400,
      errorRate: 0.01 + Math.random() * 0.02,
      cacheHitRate: 0.85 + Math.random() * 0.1,
    }));

    return {
      summary,
      kpiSummary,
      recentInsights: insights.slice(0, 5),
      systemHealth,
      performanceTrends,
    };
  }

  async searchContent(query: string, userId: string, filters?: {
    type?: 'dashboard' | 'report' | 'kpi';
    category?: string;
    dateRange?: { start: Date; end: Date };
  }): Promise<{
    dashboards: Dashboard[];
    reports: Report[];
    kpis: KPI[];
    total: number;
  }> {
    this.logger.log(`Searching BI content: "${query}"`);

    const searchQuery = `%${query}%`;

    // Search dashboards
    const dashboardQuery = this.dashboardRepository
      .createQueryBuilder('dashboard')
      .where('dashboard.isActive = :isActive', { isActive: true })
      .andWhere('(dashboard.userId = :userId OR dashboard.isPublic = :isPublic)', { userId, isPublic: true })
      .andWhere('(dashboard.name ILIKE :query OR dashboard.description ILIKE :query)', { query: searchQuery });

    if (filters?.category) {
      dashboardQuery.andWhere('dashboard.category = :category', { category: filters.category });
    }

    const dashboards = await dashboardQuery.getMany();

    // Search reports
    const reportQuery = this.reportRepository
      .createQueryBuilder('report')
      .where('report.userId = :userId', { userId })
      .andWhere('(report.name ILIKE :query OR report.description ILIKE :query)', { query: searchQuery });

    if (filters?.category) {
      reportQuery.andWhere('report.template.category = :category', { category: filters.category });
    }

    const reports = await reportQuery.getMany();

    // Search KPIs
    const kpiQuery = this.kpiRepository
      .createQueryBuilder('kpi')
      .where('kpi.isActive = :isActive', { isActive: true })
      .andWhere('(kpi.userId = :userId OR kpi.isPublic = :isPublic)', { userId, isPublic: true })
      .andWhere('(kpi.name ILIKE :query OR kpi.description ILIKE :query)', { query: searchQuery });

    if (filters?.category) {
      kpiQuery.andWhere('kpi.category = :category', { category: filters.category });
    }

    const kpis = await kpiQuery.getMany();

    const total = dashboards.length + reports.length + kpis.length;

    return {
      dashboards,
      reports,
      kpis,
      total,
    };
  }

  async exportData(
    type: 'dashboard' | 'report' | 'kpi' | 'insight',
    id: string,
    format: 'JSON' | 'CSV' | 'Excel' | 'PDF',
    userId: string,
  ): Promise<{
    data: Buffer;
    filename: string;
    mimeType: string;
  }> {
    this.logger.log(`Exporting ${type} ${id} as ${format}`);

    let data: any;
    let filename: string;

    switch (type) {
      case 'dashboard':
        const dashboard = await this.getDashboardDetails(id, userId);
        data = dashboard;
        filename = `dashboard_${dashboard.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        break;

      case 'report':
        const report = await this.reportsService.getReportDetails(id, userId);
        data = report;
        filename = `report_${report.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        break;

      case 'kpi':
        const kpi = await this.kpiService.getKPIDetails(id, userId);
        data = kpi;
        filename = `kpi_${kpi.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        break;

      case 'insight':
        const insight = await this.insightsService.getInsightDetails(id, userId);
        data = insight;
        filename = `insight_${insight.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`;
        break;

      default:
        throw new Error(`Unsupported export type: ${type}`);
    }

    const buffer = Buffer.from(JSON.stringify(data, null, 2));
    const mimeType = this.getMimeType(format);

    return { data: buffer, filename, mimeType };
  }

  async getUsageAnalytics(userId: string, timeRange: { start: Date; end: Date }): Promise<{
    dashboardViews: Array<{ dashboardId: string; dashboardName: string; views: number; lastViewed: Date }>;
    kpiCalculations: Array<{ kpiId: string; kpiName: string; calculations: number; avgResponseTime: number }>;
    reportGenerations: Array<{ reportId: string; reportName: string; generations: number; avgExecutionTime: number }>;
    searchQueries: Array<{ query: string; count: number; lastSearched: Date }>;
  }> {
    this.logger.log(`Generating usage analytics for user: ${userId}`);

    // Mock implementation - in production would query usage logs
    return {
      dashboardViews: [
        { dashboardId: '1', dashboardName: 'Executive Dashboard', views: 45, lastViewed: new Date() },
        { dashboardId: '2', dashboardName: 'Financial Dashboard', views: 32, lastViewed: new Date() },
      ],
      kpiCalculations: [
        { kpiId: '1', kpiName: 'Daily Revenue', calculations: 1440, avgResponseTime: 120 },
        { kpiId: '2', kpiName: 'User Growth', calculations: 720, avgResponseTime: 85 },
      ],
      reportGenerations: [
        { reportId: '1', reportName: 'Monthly Financial Report', generations: 12, avgExecutionTime: 3500 },
        { reportId: '2', reportName: 'Weekly Performance Report', generations: 52, avgExecutionTime: 1200 },
      ],
      searchQueries: [
        { query: 'revenue', count: 23, lastSearched: new Date() },
        { query: 'users', count: 18, lastSearched: new Date() },
      ],
    };
  }

  private async getOverallMetrics(): Promise<{
    totalQueries: number;
    avgResponseTime: number;
    errorRate: number;
    cacheHitRate: number;
  }> {
    // Mock metrics - in production would query system logs
    return {
      totalQueries: 12500,
      avgResponseTime: 1500,
      errorRate: 0.015,
      cacheHitRate: 0.87,
    };
  }

  private async getPerformanceMetrics(): Promise<{
    avgQueryTime: number;
    cacheHitRate: number;
    systemLoad: number;
  }> {
    // Mock performance metrics
    return {
      avgQueryTime: 1450,
      cacheHitRate: 0.89,
      systemLoad: 0.65,
    };
  }

  private convertToObject(array: any[], keyField: string, valueField: string): Record<string, any> {
    return array.reduce((obj, item) => {
      obj[item[keyField]] = parseInt(item[valueField]);
      return obj;
    }, {});
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'JSON': 'application/json',
      'CSV': 'text/csv',
      'Excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'PDF': 'application/pdf',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  async initializeSystem(): Promise<void> {
    this.logger.log('Initializing BI system...');

    // Create default report templates
    await this.createDefaultTemplates();

    // Create sample KPIs for demonstration
    await this.createSampleKPIs();

    this.logger.log('BI system initialized successfully');
  }

  private async createDefaultTemplates(): Promise<void> {
    const templates = [
      {
        name: 'Financial Summary',
        description: 'Monthly financial performance report',
        category: 'financial',
        template: {
          sections: [
            {
              name: 'Revenue Summary',
              type: 'chart',
              configuration: { chartType: 'line', query: 'daily_revenue' },
              requiredData: ['revenue'],
            },
            {
              name: 'Transaction Volume',
              type: 'table',
              configuration: { query: 'transaction_volume' },
              requiredData: ['transactions'],
            },
          ],
          parameters: [
            { name: 'startDate', type: 'date', label: 'Start Date', required: true },
            { name: 'endDate', type: 'date', label: 'End Date', required: true },
          ],
          styling: { theme: 'professional', colors: ['#1f77b4', '#ff7f0e'] },
        },
        dataSourceMapping: {
          revenue: { table: 'transactions', fields: ['amount', 'created_at'] },
          transactions: { table: 'transactions', fields: ['id', 'amount', 'status', 'created_at'] },
        },
        isPublic: true,
        isActive: true,
      },
    ];

    for (const templateData of templates) {
      const existing = await this.templateRepository.findOne({
        where: { name: templateData.name },
      });

      if (!existing) {
        const template = this.templateRepository.create({
          id: crypto.randomUUID(),
          ...templateData,
          metadata: {
            version: '1.0',
            complexity: 'simple',
            estimatedTime: 30,
          },
        });
        await this.templateRepository.save(template);
      }
    }
  }

  private async createSampleKPIs(): Promise<void> {
    const sampleKPIs = [
      {
        name: 'Daily Revenue',
        description: 'Total revenue generated per day',
        category: 'financial',
        definition: {
          metric: 'amount',
          calculation: 'SELECT DATE(created_at) as date, SUM(amount) as value FROM transactions WHERE DATE(created_at) = CURRENT_DATE',
          dataSource: 'transactions',
          aggregation: 'sum',
          timeWindow: 'daily',
        },
        targets: {
          target: 100000,
          thresholds: [
            { type: 'warning', value: 80000, operator: 'lt' },
            { type: 'critical', value: 60000, operator: 'lt' },
          ],
        },
        formatting: {
          unit: '$',
          decimals: 2,
          formatType: 'currency',
        },
        alerts: {
          enabled: true,
          channels: ['email'],
          conditions: [
            { threshold: 80000, operator: 'lt', severity: 'medium', cooldown: 60 },
          ],
          recipients: [{ type: 'email', value: 'admin@currentdao.com' }],
        },
        isActive: true,
        isPublic: true,
      },
    ];

    for (const kpiData of sampleKPIs) {
      const existing = await this.kpiRepository.findOne({
        where: { name: kpiData.name },
      });

      if (!existing) {
        const kpi = this.kpiRepository.create({
          id: crypto.randomUUID(),
          userId: 'system',
          ...kpiData,
          metadata: {
            tags: ['financial', 'revenue'],
            sensitivity: 'internal',
            frequency: 'daily',
          },
        });
        await this.kpiRepository.save(kpi);
      }
    }
  }
}

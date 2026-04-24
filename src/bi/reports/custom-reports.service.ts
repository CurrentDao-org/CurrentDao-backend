import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Report } from '../entities/report.entity';
import { ReportTemplate } from '../entities/report-template.entity';
import { AdvancedAnalyticsService, QueryResult } from '../analytics/advanced-analytics.service';

export interface ReportGenerationRequest {
  name: string;
  description: string;
  templateId?: string;
  configuration: any;
  schedule?: any;
  parameters?: any;
}

export interface ReportGenerationResult {
  reportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  format: string;
  size?: number;
  generatedAt?: Date;
  error?: string;
}

export interface ReportTemplateData {
  id: string;
  name: string;
  description: string;
  category: string;
  template: any;
  parameters: any;
  preview?: any;
  isPublic: boolean;
  usageCount: number;
}

@Injectable()
export class CustomReportsService {
  private readonly logger = new Logger(CustomReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(ReportTemplate)
    private readonly templateRepository: Repository<ReportTemplate>,
    private readonly analyticsService: AdvancedAnalyticsService,
    private readonly dataSource: DataSource,
  ) {}

  async createReport(request: ReportGenerationRequest, userId: string): Promise<ReportGenerationResult> {
    this.logger.log(`Creating custom report: ${request.name}`);

    const report = this.reportRepository.create({
      id: crypto.randomUUID(),
      userId,
      name: request.name,
      description: request.description,
      templateId: request.templateId,
      configuration: request.configuration,
      status: 'draft',
      schedule: request.schedule,
      metadata: {
        tags: [],
        version: 1,
      },
    });

    await this.reportRepository.save(report);

    return {
      reportId: report.id,
      status: 'draft',
      format: 'PDF',
    };
  }

  async generateReport(reportId: string, userId: string, format: 'PDF' | 'Excel' | 'CSV' = 'PDF'): Promise<ReportGenerationResult> {
    this.logger.log(`Generating report ${reportId} in ${format} format`);

    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    // Update status to processing
    report.status = 'processing';
    await this.reportRepository.save(report);

    try {
      const startTime = Date.now();

      // Execute report queries
      const reportData = await this.executeReportQueries(report.configuration);

      // Generate report based on format
      let result: ReportGenerationResult;

      switch (format) {
        case 'PDF':
          result = await this.generatePDFReport(report, reportData);
          break;
        case 'Excel':
          result = await this.generateExcelReport(report, reportData);
          break;
        case 'CSV':
          result = await this.generateCSVReport(report, reportData);
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      // Update report with generation results
      const executionTime = Date.now() - startTime;
      report.status = 'completed';
      report.output = {
        format,
        path: result.downloadUrl,
        url: result.downloadUrl,
        size: result.size,
        generatedAt: new Date(),
      };
      report.metadata = {
        ...report.metadata,
        executionTime,
        recordCount: reportData.totalRows,
      };

      await this.reportRepository.save(report);

      this.logger.log(`Report ${reportId} generated successfully in ${executionTime}ms`);
      return result;

    } catch (error) {
      this.logger.error(`Report generation failed for ${reportId}:`, error);
      
      report.status = 'failed';
      await this.reportRepository.save(report);

      return {
        reportId,
        status: 'failed',
        format,
        error: error.message,
      };
    }
  }

  async getReportTemplates(category?: string, search?: string): Promise<ReportTemplateData[]> {
    this.logger.log('Fetching report templates');

    const queryBuilder = this.templateRepository
      .createQueryBuilder('template')
      .where('template.isActive = :isActive', { isActive: true })
      .andWhere('template.isPublic = :isPublic', { isPublic: true });

    if (category) {
      queryBuilder.andWhere('template.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(template.name ILIKE :search OR template.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const templates = await queryBuilder.getMany();

    return templates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      template: template.template,
      parameters: template.template.parameters || [],
      preview: template.preview,
      isPublic: template.isPublic,
      usageCount: template.usageCount,
    }));
  }

  async createReportTemplate(templateData: Partial<ReportTemplate>, userId: string): Promise<ReportTemplateData> {
    this.logger.log(`Creating report template: ${templateData.name}`);

    const template = this.templateRepository.create({
      id: crypto.randomUUID(),
      ...templateData,
      metadata: {
        ...templateData.metadata,
        author: userId,
        version: '1.0',
      },
    });

    await this.templateRepository.save(template);

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      template: template.template,
      parameters: template.template.parameters || [],
      isPublic: template.isPublic,
      usageCount: template.usageCount,
    };
  }

  async getReports(userId: string, options: {
    status?: string;
    category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    reports: Report[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.reportRepository
      .createQueryBuilder('report')
      .where('report.userId = :userId', { userId });

    if (options.status) {
      queryBuilder.andWhere('report.status = :status', { status: options.status });
    }

    const total = await queryBuilder.getCount();
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    const reports = await queryBuilder
      .orderBy('report.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return {
      reports,
      total,
      page,
      totalPages,
    };
  }

  async getReportDetails(reportId: string, userId: string): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    return report;
  }

  async updateReport(reportId: string, userId: string, updates: Partial<Report>): Promise<Report> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    Object.assign(report, updates, {
      metadata: {
        ...report.metadata,
        version: (report.metadata?.version || 1) + 1,
      },
    });

    await this.reportRepository.save(report);

    return report;
  }

  async deleteReport(reportId: string, userId: string): Promise<void> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    await this.reportRepository.remove(report);
    this.logger.log(`Report ${reportId} deleted`);
  }

  async scheduleReport(reportId: string, userId: string, schedule: any): Promise<void> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    report.schedule = {
      ...schedule,
      enabled: true,
      nextRun: this.calculateNextRun(schedule.frequency, schedule.timezone),
    };

    await this.reportRepository.save(report);

    this.logger.log(`Report ${reportId} scheduled with frequency: ${schedule.frequency}`);
  }

  async unscheduleReport(reportId: string, userId: string): Promise<void> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    report.schedule = {
      ...report.schedule,
      enabled: false,
    };

    await this.reportRepository.save(report);

    this.logger.log(`Report ${reportId} unscheduled`);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledReports(): Promise<void> {
    this.logger.log('Processing scheduled reports');

    const scheduledReports = await this.reportRepository
      .createQueryBuilder('report')
      .where('report.schedule.enabled = :enabled', { enabled: true })
      .andWhere('report.schedule.nextRun <= :now', { now: new Date() })
      .getMany();

    for (const report of scheduledReports) {
      try {
        this.logger.log(`Processing scheduled report: ${report.id}`);

        // Generate report for each recipient and format
        const recipients = report.schedule.recipients || [];
        
        for (const recipient of recipients) {
          await this.generateReport(report.id, report.userId, recipient.format);
          // In a real implementation, this would send the report via email
        }

        // Update next run time
        report.schedule.lastRun = new Date();
        report.schedule.nextRun = this.calculateNextRun(
          report.schedule.frequency,
          report.schedule.timezone,
        );

        await this.reportRepository.save(report);

      } catch (error) {
        this.logger.error(`Failed to process scheduled report ${report.id}:`, error);
      }
    }
  }

  async previewReport(templateId: string, parameters?: any): Promise<{
    data: any;
    metadata: any;
  }> {
    this.logger.log(`Generating preview for template: ${templateId}`);

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    try {
      // Execute sample queries with limited data
      const previewData = await this.executeTemplateQueries(template.template, parameters, true);

      return {
        data: previewData,
        metadata: {
          templateId,
          executionTime: previewData.executionTime,
          recordCount: previewData.totalRows,
        },
      };
    } catch (error) {
      this.logger.error(`Preview generation failed for template ${templateId}:`, error);
      throw new Error(`Preview generation failed: ${error.message}`);
    }
  }

  async exportReportData(reportId: string, userId: string, format: 'JSON' | 'CSV' | 'Excel'): Promise<{
    data: any;
    filename: string;
    mimeType: string;
  }> {
    const report = await this.reportRepository.findOne({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const reportData = await this.executeReportQueries(report.configuration);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${report.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${format.toLowerCase()}`;

    return {
      data: reportData,
      filename,
      mimeType: this.getMimeType(format),
    };
  }

  private async executeReportQueries(configuration: any): Promise<any> {
    const queries = configuration.queries || [];
    const results = {};
    let totalRows = 0;
    let executionTime = 0;

    for (const queryConfig of queries) {
      const startTime = Date.now();
      
      try {
        const result = await this.analyticsService.executeQuery(queryConfig.id, queryConfig.parameters);
        results[queryConfig.name] = result.data;
        totalRows += result.metadata.rowCount;
        executionTime += Date.now() - startTime;
      } catch (error) {
        this.logger.error(`Query execution failed: ${queryConfig.name}`, error);
        results[queryConfig.name] = { error: error.message };
      }
    }

    return {
      results,
      totalRows,
      executionTime,
    };
  }

  private async executeTemplateQueries(template: any, parameters?: any, preview: boolean = false): Promise<any> {
    const sections = template.sections || [];
    const results = {};
    let totalRows = 0;
    let executionTime = 0;

    for (const section of sections) {
      if (section.configuration?.query) {
        const startTime = Date.now();
        
        try {
          // Add LIMIT for preview
          let query = section.configuration.query;
          if (preview && !query.includes('LIMIT')) {
            query += ' LIMIT 100';
          }

          const result = await this.analyticsService.executeCustomQuery(query, parameters);
          results[section.name] = result.data;
          totalRows += result.metadata.rowCount;
          executionTime += Date.now() - startTime;
        } catch (error) {
          this.logger.error(`Template query execution failed: ${section.name}`, error);
          results[section.name] = { error: error.message };
        }
      }
    }

    return {
      results,
      totalRows,
      executionTime,
    };
  }

  private async generatePDFReport(report: Report, data: any): Promise<ReportGenerationResult> {
    // Simplified PDF generation - in production would use a PDF library
    const filename = `report_${report.id}.pdf`;
    const size = JSON.stringify(data).length; // Simplified size calculation

    return {
      reportId: report.id,
      status: 'completed',
      downloadUrl: `/api/bi/reports/${report.id}/download?format=PDF`,
      format: 'PDF',
      size,
      generatedAt: new Date(),
    };
  }

  private async generateExcelReport(report: Report, data: any): Promise<ReportGenerationResult> {
    // Simplified Excel generation - in production would use an Excel library
    const filename = `report_${report.id}.xlsx`;
    const size = JSON.stringify(data).length * 1.5; // Excel files are typically larger

    return {
      reportId: report.id,
      status: 'completed',
      downloadUrl: `/api/bi/reports/${report.id}/download?format=Excel`,
      format: 'Excel',
      size,
      generatedAt: new Date(),
    };
  }

  private async generateCSVReport(report: Report, data: any): Promise<ReportGenerationResult> {
    // Simplified CSV generation
    const filename = `report_${report.id}.csv`;
    const csvContent = this.convertToCSV(data);
    const size = csvContent.length;

    return {
      reportId: report.id,
      status: 'completed',
      downloadUrl: `/api/bi/reports/${report.id}/download?format=CSV`,
      format: 'CSV',
      size,
      generatedAt: new Date(),
    };
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    if (!data.results || Object.keys(data.results).length === 0) {
      return '';
    }

    const firstResult = Object.values(data.results)[0];
    if (!Array.isArray(firstResult) || firstResult.length === 0) {
      return '';
    }

    const headers = Object.keys(firstResult[0]);
    const csvRows = [headers.join(',')];

    firstResult.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  private calculateNextRun(frequency: string, timezone: string): Date {
    const now = new Date();
    const nextRun = new Date(now);

    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
      case 'quarterly':
        nextRun.setMonth(nextRun.getMonth() + 3);
        break;
      case 'yearly':
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        break;
      default:
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'PDF': 'application/pdf',
      'Excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'CSV': 'text/csv',
      'JSON': 'application/json',
    };
    return mimeTypes[format] || 'application/octet-stream';
  }

  async getReportStatistics(userId: string): Promise<{
    totalReports: number;
    completedReports: number;
    scheduledReports: number;
    averageExecutionTime: number;
    mostUsedTemplates: Array<{
      templateId: string;
      templateName: string;
      usageCount: number;
    }>;
  }> {
    const [totalReports, completedReports, scheduledReports] = await Promise.all([
      this.reportRepository.count({ where: { userId } }),
      this.reportRepository.count({ where: { userId, status: 'completed' } }),
      this.reportRepository.count({ where: { userId, 'schedule.enabled': true } }),
    ]);

    // Get average execution time from completed reports
    const completedReportData = await this.reportRepository
      .createQueryBuilder('report')
      .select('report.metadata.executionTime', 'executionTime')
      .where('report.userId = :userId', { userId })
      .andWhere('report.status = :status', { status: 'completed' })
      .andWhere('report.metadata.executionTime IS NOT NULL')
      .getRawMany();

    const averageExecutionTime = completedReportData.length > 0
      ? completedReportData.reduce((sum, report) => sum + report.executionTime, 0) / completedReportData.length
      : 0;

    // Get most used templates
    const mostUsedTemplates = await this.templateRepository
      .createQueryBuilder('template')
      .select(['template.id', 'template.name', 'template.usageCount'])
      .where('template.isPublic = :isPublic', { isPublic: true })
      .orderBy('template.usageCount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalReports,
      completedReports,
      scheduledReports,
      averageExecutionTime,
      mostUsedTemplates: mostUsedTemplates.map(template => ({
        templateId: template.template_id,
        templateName: template.template_name,
        usageCount: template.usageCount,
      })),
    };
  }
}

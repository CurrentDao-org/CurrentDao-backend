import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ComplianceReportDto } from '../dto/compliance-report.dto';

export interface ComplianceReport {
  id: string;
  title: string;
  type: string;
  category: string;
  startDate: Date;
  endDate: Date;
  format: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  content?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  format: string;
  sections: ReportSection[];
  parameters: Record<string, any>;
}

export interface ReportSection {
  id: string;
  name: string;
  type: string;
  order: number;
  configuration: Record<string, any>;
}

@Injectable()
export class IntelligentReportingService implements OnModuleInit {
  private readonly logger = new Logger(IntelligentReportingService.name);
  private readonly reports = new Map<string, ComplianceReport>();
  private readonly templates = new Map<string, ReportTemplate>();
  private readonly reportQueue: ComplianceReportDto[] = [];

  async onModuleInit() {
    this.logger.log('Intelligent Reporting Service initialized');
    await this.initializeDefaultTemplates();
  }

  private async initializeDefaultTemplates() {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'daily_compliance_report',
        name: 'Daily Compliance Report',
        description: 'Standard daily compliance summary',
        type: 'daily',
        category: 'transactions',
        format: 'pdf',
        sections: [
          {
            id: 'summary',
            name: 'Executive Summary',
            type: 'summary',
            order: 1,
            configuration: { includeCharts: true, includeMetrics: true },
          },
          {
            id: 'violations',
            name: 'Compliance Violations',
            type: 'violations',
            order: 2,
            configuration: { groupBy: 'severity', includeDetails: true },
          },
          {
            id: 'metrics',
            name: 'Performance Metrics',
            type: 'metrics',
            order: 3,
            configuration: { includeTrends: true, includeComparisons: true },
          },
        ],
        parameters: {
          includeCharts: true,
          includeAnalysis: true,
          includeRecommendations: true,
        },
      },
      {
        id: 'monthly_risk_assessment',
        name: 'Monthly Risk Assessment',
        description: 'Comprehensive monthly risk analysis',
        type: 'monthly',
        category: 'risk_assessment',
        format: 'excel',
        sections: [
          {
            id: 'risk_overview',
            name: 'Risk Overview',
            type: 'risk_overview',
            order: 1,
            configuration: { includeHeatmap: true, includeTrends: true },
          },
          {
            id: 'high_risk_transactions',
            name: 'High-Risk Transactions',
            type: 'transactions',
            order: 2,
            configuration: { riskThreshold: 0.7, includeDetails: true },
          },
          {
            id: 'recommendations',
            name: 'Recommendations',
            type: 'recommendations',
            order: 3,
            configuration: { includeActionItems: true, includePriorities: true },
          },
        ],
        parameters: {
          includeCharts: true,
          includeAnalysis: true,
          includeRecommendations: true,
        },
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });

    this.logger.log(`Initialized ${defaultTemplates.length} default report templates`);
  }

  async generateReport(reportConfig: ComplianceReportDto): Promise<ComplianceReport> {
    try {
      const report: ComplianceReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: reportConfig.title,
        type: reportConfig.type,
        category: reportConfig.category,
        startDate: new Date(reportConfig.startDate),
        endDate: new Date(reportConfig.endDate),
        format: reportConfig.format || 'pdf',
        status: 'pending',
        createdAt: new Date(),
        metadata: {
          jurisdictions: reportConfig.jurisdictions,
          categories: reportConfig.categories,
          riskLevels: reportConfig.riskLevels,
          includeCharts: reportConfig.includeCharts,
          includeAnalysis: reportConfig.includeAnalysis,
          includeRecommendations: reportConfig.includeRecommendations,
          recipients: reportConfig.recipients,
          filters: reportConfig.filters,
          template: reportConfig.template,
        },
      };

      this.reports.set(report.id, report);

      // Start report generation asynchronously
      this.generateReportContent(report);

      this.logger.log(`Started generating report: ${report.title}`);
      return report;
    } catch (error) {
      this.logger.error('Error generating report:', error);
      throw error;
    }
  }

  private async generateReportContent(report: ComplianceReport): Promise<void> {
    try {
      report.status = 'generating';
      
      const template = this.getTemplateForReport(report);
      const content = await this.buildReportContent(report, template);
      
      report.content = content;
      report.status = 'completed';
      report.completedAt = new Date();

      this.logger.log(`Report generation completed: ${report.title}`);
    } catch (error) {
      report.status = 'failed';
      report.error = error.message;
      this.logger.error(`Report generation failed: ${report.title}`, error);
    }
  }

  private getTemplateForReport(report: ComplianceReport): ReportTemplate {
    const templateId = report.metadata?.template || this.getDefaultTemplate(report.type, report.category);
    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    return template;
  }

  private getDefaultTemplate(type: string, category: string): string {
    const templateMap: Record<string, string> = {
      'daily_transactions': 'daily_compliance_report',
      'weekly_transactions': 'daily_compliance_report',
      'monthly_transactions': 'monthly_risk_assessment',
      'daily_violations': 'daily_compliance_report',
      'monthly_risk_assessment': 'monthly_risk_assessment',
    };

    return templateMap[`${type}_${category}`] || 'daily_compliance_report';
  }

  private async buildReportContent(report: ComplianceReport, template: ReportTemplate): Promise<string> {
    const sections = await Promise.all(
      template.sections
        .sort((a, b) => a.order - b.order)
        .map(section => this.buildReportSection(report, section))
    );

    return this.combineSections(sections, template, report);
  }

  private async buildReportSection(report: ComplianceReport, section: ReportSection): Promise<string> {
    switch (section.type) {
      case 'summary':
        return this.buildSummarySection(report, section.configuration);
      case 'violations':
        return this.buildViolationsSection(report, section.configuration);
      case 'metrics':
        return this.buildMetricsSection(report, section.configuration);
      case 'risk_overview':
        return this.buildRiskOverviewSection(report, section.configuration);
      case 'transactions':
        return this.buildTransactionsSection(report, section.configuration);
      case 'recommendations':
        return this.buildRecommendationsSection(report, section.configuration);
      default:
        return '';
    }
  }

  private async buildSummarySection(report: ComplianceReport, config: any): Promise<string> {
    // Mock implementation - in production, this would query actual data
    const summary = {
      totalTransactions: Math.floor(Math.random() * 10000) + 1000,
      totalViolations: Math.floor(Math.random() * 100) + 10,
      averageRiskScore: Math.random() * 0.5,
      complianceRate: 95 + Math.random() * 4,
    };

    return `
# Executive Summary

This report provides a comprehensive overview of compliance activities from ${report.startDate.toDateString()} to ${report.endDate.toDateString()}.

## Key Metrics
- Total Transactions: ${summary.totalTransactions.toLocaleString()}
- Total Violations: ${summary.totalViolations}
- Average Risk Score: ${(summary.averageRiskScore * 100).toFixed(2)}%
- Compliance Rate: ${summary.complianceRate.toFixed(2)}%

## Summary
The compliance system processed ${summary.totalTransactions.toLocaleString()} transactions during the reporting period, with ${summary.totalViolations} violations detected. The overall compliance rate of ${summary.complianceRate.toFixed(2)}% indicates strong adherence to regulatory requirements.
    `.trim();
  }

  private async buildViolationsSection(report: ComplianceReport, config: any): Promise<string> {
    // Mock implementation - in production, this would query actual violation data
    const violations = [
      { type: 'Transaction Limit', count: 25, severity: 'medium' },
      { type: 'Geographic Restriction', count: 12, severity: 'high' },
      { type: 'Document Verification', count: 8, severity: 'low' },
    ];

    let content = `
# Compliance Violations

## Violation Breakdown
| Type | Count | Severity |
|------|-------|----------|
`;

    violations.forEach(violation => {
      content += `| ${violation.type} | ${violation.count} | ${violation.severity} |\n`;
    });

    content += `
## Analysis
The most common violations were related to transaction limits, followed by geographic restrictions. The majority of violations were classified as medium severity.
    `.trim();

    return content;
  }

  private async buildMetricsSection(report: ComplianceReport, config: any): Promise<string> {
    // Mock implementation
    return `
# Performance Metrics

## Processing Metrics
- Average Processing Time: 45ms
- Peak Processing Time: 120ms
- System Uptime: 99.9%
- Error Rate: 0.1%

## Compliance Metrics
- False Positive Rate: 2.3%
- Detection Accuracy: 97.8%
- Manual Review Rate: 15.2%
- Average Review Time: 4.5 hours
    `.trim();
  }

  private async buildRiskOverviewSection(report: ComplianceReport, config: any): Promise<string> {
    // Mock implementation
    return `
# Risk Overview

## Risk Distribution
- Low Risk: 65% of transactions
- Medium Risk: 28% of transactions
- High Risk: 6% of transactions
- Critical Risk: 1% of transactions

## Risk Trends
Risk levels have remained relatively stable over the reporting period, with a slight increase in high-risk transactions due to seasonal factors.
    `.trim();
  }

  private async buildTransactionsSection(report: ComplianceReport, config: any): Promise<string> {
    // Mock implementation
    return `
# High-Risk Transactions

## Top Risk Transactions
1. Transaction ID: TXN_001 - Risk Score: 0.92 - Amount: $50,000
2. Transaction ID: TXN_002 - Risk Score: 0.88 - Amount: $35,000
3. Transaction ID: TXN_003 - Risk Score: 0.85 - Amount: $28,000

## Risk Factors
- Large transaction amounts
- Cross-border transfers
- High-risk jurisdictions
- Unusual transaction patterns
    `.trim();
  }

  private async buildRecommendationsSection(report: ComplianceReport, config: any): Promise<string> {
    // Mock implementation
    return `
# Recommendations

## Immediate Actions
1. Review and update transaction limit rules
2. Enhance geographic screening for high-risk jurisdictions
3. Implement additional verification for large transactions

## Long-term Improvements
1. Deploy machine learning models for better risk assessment
2. Integrate additional sanction list providers
3. Enhance real-time monitoring capabilities

## Compliance Training
- Schedule quarterly compliance training for all staff
- Update compliance handbook with new regulations
- Conduct annual compliance audits
    `.trim();
  }

  private combineSections(sections: string[], template: ReportTemplate, report: ComplianceReport): string {
    let content = `# ${report.title}\n\n`;
    content += `**Report Type:** ${report.type}\n`;
    content += `**Category:** ${report.category}\n`;
    content += `**Period:** ${report.startDate.toDateString()} - ${report.endDate.toDateString()}\n`;
    content += `**Generated:** ${new Date().toISOString()}\n\n`;
    content += `---\n\n`;

    sections.forEach(section => {
      content += section + '\n\n---\n\n';
    });

    content += `\n*End of Report*`;
    return content;
  }

  async getReports(query: any): Promise<ComplianceReport[]> {
    let reports = Array.from(this.reports.values());

    if (query.type) {
      reports = reports.filter(report => report.type === query.type);
    }

    if (query.category) {
      reports = reports.filter(report => report.category === query.category);
    }

    if (query.status) {
      reports = reports.filter(report => report.status === query.status);
    }

    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      reports = reports.filter(report => 
        report.startDate >= startDate && report.endDate <= endDate
      );
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return reports
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);
  }

  async getReport(id: string): Promise<ComplianceReport | undefined> {
    return this.reports.get(id);
  }

  async deleteReport(id: string): Promise<void> {
    const deleted = this.reports.delete(id);
    if (!deleted) {
      throw new Error('Report not found');
    }
  }

  async addTemplate(template: ReportTemplate): Promise<void> {
    this.templates.set(template.id, template);
    this.logger.log(`Added report template: ${template.name}`);
  }

  async removeTemplate(templateId: string): Promise<void> {
    const deleted = this.templates.delete(templateId);
    if (!deleted) {
      throw new Error('Template not found');
    }
    this.logger.log(`Removed report template: ${templateId}`);
  }

  async getTemplates(): Promise<ReportTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getTemplate(templateId: string): Promise<ReportTemplate | undefined> {
    return this.templates.get(templateId);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports(): Promise<void> {
    try {
      const dailyReportConfig: ComplianceReportDto = {
        title: `Daily Compliance Report - ${new Date().toDateString()}`,
        type: 'daily',
        category: 'transactions',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        format: 'pdf',
        includeCharts: true,
        includeAnalysis: true,
        includeRecommendations: true,
      };

      await this.generateReport(dailyReportConfig);
      this.logger.log('Daily compliance report generated');
    } catch (error) {
      this.logger.error('Error generating daily report:', error);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async generateMonthlyReports(): Promise<void> {
    try {
      const monthlyReportConfig: ComplianceReportDto = {
        title: `Monthly Risk Assessment - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        type: 'monthly',
        category: 'risk_assessment',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        format: 'excel',
        includeCharts: true,
        includeAnalysis: true,
        includeRecommendations: true,
      };

      await this.generateReport(monthlyReportConfig);
      this.logger.log('Monthly risk assessment report generated');
    } catch (error) {
      this.logger.error('Error generating monthly report:', error);
    }
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async cleanupOldReports(): Promise<void> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [id, report] of this.reports) {
        if (report.createdAt < ninetyDaysAgo && report.status === 'completed') {
          this.reports.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old compliance reports`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old reports:', error);
    }
  }

  async getReportStatistics(): Promise<any> {
    const reports = Array.from(this.reports.values());
    const completedReports = reports.filter(report => report.status === 'completed');
    const failedReports = reports.filter(report => report.status === 'failed');

    return {
      totalReports: reports.length,
      completedReports: completedReports.length,
      failedReports: failedReports.length,
      pendingReports: reports.filter(report => report.status === 'pending').length,
      generatingReports: reports.filter(report => report.status === 'generating').length,
      reportsByType: this.groupReportsByType(reports),
      reportsByCategory: this.groupReportsByCategory(reports),
      averageGenerationTime: this.calculateAverageGenerationTime(completedReports),
      successRate: reports.length > 0 ? (completedReports.length / reports.length) * 100 : 0,
    };
  }

  private groupReportsByType(reports: ComplianceReport[]): Record<string, number> {
    return reports.reduce((acc, report) => {
      acc[report.type] = (acc[report.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupReportsByCategory(reports: ComplianceReport[]): Record<string, number> {
    return reports.reduce((acc, report) => {
      acc[report.category] = (acc[report.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateAverageGenerationTime(completedReports: ComplianceReport[]): number {
    if (completedReports.length === 0) return 0;

    const totalTime = completedReports.reduce((sum, report) => {
      if (report.completedAt) {
        return sum + (report.completedAt.getTime() - report.createdAt.getTime());
      }
      return sum;
    }, 0);

    return totalTime / completedReports.length / (1000 * 60); // minutes
  }
}

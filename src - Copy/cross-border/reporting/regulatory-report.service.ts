import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CrossBorderTransaction,
  TransactionStatus,
  ComplianceStatus,
} from '../entities/cross-border-transaction.entity';
import { RegulationService } from '../compliance/regulation-service';

export interface RegulatoryReport {
  id: string;
  reportType: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  jurisdiction: string;
  summary: {
    totalTransactions: number;
    totalVolume: number;
    totalValue: number;
    complianceRate: number;
    violations: number;
    penalties: number;
  };
  transactions: TransactionReport[];
  complianceMetrics: ComplianceMetric[];
  generatedAt: Date;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submissionDate?: Date;
  approvalDate?: Date;
  rejectionReason?: string;
}

export interface TransactionReport {
  transactionId: string;
  date: Date;
  sourceCountry: string;
  targetCountry: string;
  energyType: string;
  volume: number;
  value: number;
  currency: string;
  complianceStatus: ComplianceStatus;
  violations: string[];
  penalties: number;
  regulations: string[];
}

export interface ComplianceMetric {
  regulationCode: string;
  regulationName: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  warningChecks: number;
  complianceRate: number;
  averageResolutionTime: number;
  openViolations: number;
  closedViolations: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  jurisdiction: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  requiredFields: string[];
  format: 'JSON' | 'XML' | 'CSV' | 'PDF';
  submissionEndpoint?: string;
  authentication: {
    type: 'api_key' | 'oauth' | 'certificate';
    credentials: Record<string, string>;
  };
}

export interface ReportSubmission {
  reportId: string;
  submissionId: string;
  endpoint: string;
  status: 'pending' | 'submitted' | 'acknowledged' | 'failed';
  submittedAt: Date;
  response?: any;
  error?: string;
}

@Injectable()
export class RegulatoryReportService {
  private readonly logger = new Logger(RegulatoryReportService.name);
  private readonly reportTemplates: Map<string, ReportTemplate> = new Map();
  private readonly submissions: Map<string, ReportSubmission> = new Map();

  constructor(
    @InjectRepository(CrossBorderTransaction)
    private readonly transactionRepository: Repository<CrossBorderTransaction>,
    private readonly regulationService: RegulationService,
    private readonly configService: ConfigService,
  ) {
    this.initializeReportTemplates();
  }

  private initializeReportTemplates(): void {
    const templates: ReportTemplate[] = [
      {
        id: 'EU_RENEWABLE_ENERGY_REPORT',
        name: 'EU Renewable Energy Trading Report',
        description: 'Monthly report for renewable energy trading within EU',
        jurisdiction: 'EU',
        frequency: 'monthly',
        requiredFields: [
          'transactionId',
          'energyType',
          'volume',
          'value',
          'complianceStatus',
        ],
        format: 'XML',
        submissionEndpoint: 'https://ec.europa.eu/energy/api/reports',
        authentication: {
          type: 'api_key',
          credentials: { api_key: 'EU_ENERGY_API_KEY' },
        },
      },
      {
        id: 'US_FERC_ENERGY_REPORT',
        name: 'US FERC Energy Trading Report',
        description: 'Daily report for US energy trading activities',
        jurisdiction: 'US',
        frequency: 'daily',
        requiredFields: [
          'transactionId',
          'sourceCountry',
          'targetCountry',
          'value',
          'complianceStatus',
        ],
        format: 'JSON',
        submissionEndpoint: 'https://www.ferc.gov/api/energy-reports',
        authentication: {
          type: 'oauth',
          credentials: {
            client_id: 'FERC_CLIENT_ID',
            client_secret: 'FERC_CLIENT_SECRET',
          },
        },
      },
      {
        id: 'ISO_50001_COMPLIANCE_REPORT',
        name: 'ISO 50001 Energy Management Report',
        description: 'Quarterly ISO 50001 compliance report',
        jurisdiction: 'International',
        frequency: 'quarterly',
        requiredFields: ['energyType', 'volume', 'consumption', 'efficiency'],
        format: 'PDF',
        authentication: {
          type: 'certificate',
          credentials: { certificate_path: '/certs/iso50001.pem' },
        },
      },
      {
        id: 'IEA_STATISTICS_REPORT',
        name: 'IEA Energy Statistics Report',
        description: 'Monthly energy trading statistics for IEA',
        jurisdiction: 'International',
        frequency: 'monthly',
        requiredFields: [
          'country',
          'energyType',
          'imports',
          'exports',
          'consumption',
        ],
        format: 'CSV',
        submissionEndpoint: 'https://api.iea.org/statistics',
        authentication: {
          type: 'api_key',
          credentials: { api_key: 'IEA_API_KEY' },
        },
      },
      {
        id: 'CROSS_BORDER_EU_REPORT',
        name: 'EU Cross-Border Electricity Report',
        description: 'Daily cross-border electricity trading report for EU',
        jurisdiction: 'EU',
        frequency: 'daily',
        requiredFields: [
          'transactionId',
          'sourceCountry',
          'targetCountry',
          'volume',
          'price',
        ],
        format: 'JSON',
        submissionEndpoint: 'https://www.entsoe.eu/api/cross-border',
        authentication: {
          type: 'certificate',
          credentials: { certificate_path: '/certs/entsoe.pem' },
        },
      },
    ];

    templates.forEach((template) => {
      this.reportTemplates.set(template.id, template);
    });

    this.logger.log(
      `Initialized ${templates.length} regulatory report templates`,
    );
  }

  async generateReport(
    reportType: string,
    startDate: Date,
    endDate: Date,
    jurisdiction?: string,
  ): Promise<RegulatoryReport> {
    this.logger.log(
      `Generating ${reportType} report for period ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    const template = this.reportTemplates.get(reportType);
    if (!template) {
      throw new Error(`Report template not found: ${reportType}`);
    }

    const transactions = await this.getTransactionsForPeriod(
      startDate,
      endDate,
      jurisdiction,
    );
    const transactionReports = await this.buildTransactionReports(transactions);
    const complianceMetrics =
      await this.calculateComplianceMetrics(transactions);
    const summary = this.calculateSummary(
      transactionReports,
      complianceMetrics,
    );

    const report: RegulatoryReport = {
      id: this.generateReportId(),
      reportType,
      period: { startDate, endDate },
      jurisdiction: jurisdiction || template.jurisdiction,
      summary,
      transactions: transactionReports,
      complianceMetrics,
      generatedAt: new Date(),
      status: 'draft',
    };

    this.logger.log(
      `Generated report ${report.id} with ${transactionReports.length} transactions`,
    );
    return report;
  }

  private async getTransactionsForPeriod(
    startDate: Date,
    endDate: Date,
    jurisdiction?: string,
  ): Promise<CrossBorderTransaction[]> {
    const whereCondition: any = {
      createdAt: {
        $gte: startDate,
        $lte: endDate,
      },
    };

    if (jurisdiction && jurisdiction !== 'International') {
      const countries = this.getCountriesByJurisdiction(jurisdiction);
      whereCondition.$or = [
        { sourceCountry: { $in: countries } },
        { targetCountry: { $in: countries } },
      ];
    }

    return this.transactionRepository.find({
      where: whereCondition,
      order: { createdAt: 'ASC' },
    });
  }

  private getCountriesByJurisdiction(jurisdiction: string): string[] {
    const jurisdictionCountries: Record<string, string[]> = {
      EU: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'GR'],
      US: ['US'],
      CN: ['CN'],
      International: ['*'],
    };

    return jurisdictionCountries[jurisdiction] || [];
  }

  private async buildTransactionReports(
    transactions: CrossBorderTransaction[],
  ): Promise<TransactionReport[]> {
    return transactions.map((transaction) => ({
      transactionId: transaction.transactionId,
      date: transaction.createdAt,
      sourceCountry: transaction.sourceCountry,
      targetCountry: transaction.targetCountry,
      energyType: this.extractEnergyType(transaction),
      volume: this.extractVolume(transaction),
      value: transaction.amount,
      currency: transaction.currency,
      complianceStatus: transaction.complianceStatus,
      violations: this.extractViolations(transaction),
      penalties: this.extractPenalties(transaction),
      regulations: this.extractApplicableRegulations(transaction),
    }));
  }

  private extractEnergyType(transaction: CrossBorderTransaction): string {
    if (transaction.regulatoryData && transaction.regulatoryData.energyType) {
      return transaction.regulatoryData.energyType;
    }
    return 'electricity'; // Default energy type
  }

  private extractVolume(transaction: CrossBorderTransaction): number {
    if (
      transaction.regulatoryData &&
      transaction.regulatoryData.energyQuantity
    ) {
      return transaction.regulatoryData.energyQuantity;
    }
    return transaction.amount; // Use amount as volume proxy
  }

  private extractViolations(transaction: CrossBorderTransaction): string[] {
    const violations: string[] = [];

    if (transaction.complianceChecks) {
      for (const [regulation, check] of Object.entries(
        transaction.complianceChecks,
      )) {
        if (check.status === 'fail') {
          violations.push(`${regulation}: ${check.details}`);
        }
      }
    }

    return violations;
  }

  private extractPenalties(transaction: CrossBorderTransaction): number {
    if (transaction.regulatoryFees) {
      return transaction.regulatoryFees;
    }
    return 0;
  }

  private extractApplicableRegulations(
    transaction: CrossBorderTransaction,
  ): string[] {
    const regulations: string[] = [];

    if (
      transaction.regulatoryData &&
      transaction.regulatoryData.applicableRegulations
    ) {
      regulations.push(...transaction.regulatoryData.applicableRegulations);
    }

    return regulations;
  }

  private async calculateComplianceMetrics(
    transactions: CrossBorderTransaction[],
  ): Promise<ComplianceMetric[]> {
    const regulations = this.regulationService.getAllRegulations();
    const metrics: ComplianceMetric[] = [];

    for (const regulation of regulations) {
      const applicableTransactions = transactions.filter((t) =>
        this.isRegulationApplicable(t, regulation),
      );

      const totalChecks = applicableTransactions.length;
      const passedChecks = applicableTransactions.filter(
        (t) => t.complianceStatus === ComplianceStatus.COMPLIANT,
      ).length;
      const failedChecks = applicableTransactions.filter(
        (t) => t.complianceStatus === ComplianceStatus.NON_COMPLIANT,
      ).length;
      const warningChecks = applicableTransactions.filter(
        (t) => t.complianceStatus === ComplianceStatus.PENDING_REVIEW,
      ).length;

      const complianceRate =
        totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;

      metrics.push({
        regulationCode: regulation.code,
        regulationName: regulation.name,
        totalChecks,
        passedChecks,
        failedChecks,
        warningChecks,
        complianceRate,
        averageResolutionTime: this.calculateAverageResolutionTime(
          applicableTransactions,
        ),
        openViolations: failedChecks,
        closedViolations: passedChecks,
      });
    }

    return metrics;
  }

  private isRegulationApplicable(
    transaction: CrossBorderTransaction,
    regulation: any,
  ): boolean {
    return (
      regulation.applicableCountries.includes('*') ||
      regulation.applicableCountries.includes(transaction.sourceCountry) ||
      regulation.applicableCountries.includes(transaction.targetCountry)
    );
  }

  private calculateAverageResolutionTime(
    transactions: CrossBorderTransaction[],
  ): number {
    const completedTransactions = transactions.filter(
      (t) => t.processedAt && t.createdAt,
    );

    if (completedTransactions.length === 0) {
      return 0;
    }

    const totalTime = completedTransactions.reduce((sum, t) => {
      return sum + (t.processedAt.getTime() - t.createdAt.getTime());
    }, 0);

    return totalTime / completedTransactions.length;
  }

  private calculateSummary(
    transactions: TransactionReport[],
    complianceMetrics: ComplianceMetric[],
  ): RegulatoryReport['summary'] {
    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, t) => sum + t.volume, 0);
    const totalValue = transactions.reduce((sum, t) => sum + t.value, 0);

    const compliantTransactions = transactions.filter(
      (t) => t.complianceStatus === ComplianceStatus.COMPLIANT,
    ).length;
    const complianceRate =
      totalTransactions > 0
        ? (compliantTransactions / totalTransactions) * 100
        : 0;

    const violations = transactions.reduce(
      (sum, t) => sum + t.violations.length,
      0,
    );
    const penalties = transactions.reduce((sum, t) => sum + t.penalties, 0);

    return {
      totalTransactions,
      totalVolume,
      totalValue,
      complianceRate,
      violations,
      penalties,
    };
  }

  private generateReportId(): string {
    return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  async submitReport(reportId: string): Promise<ReportSubmission> {
    const report = await this.getReportById(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    const template = this.reportTemplates.get(report.reportType);
    if (!template || !template.submissionEndpoint) {
      throw new Error(
        `No submission endpoint configured for report type: ${report.reportType}`,
      );
    }

    const submissionId = this.generateSubmissionId();
    const submission: ReportSubmission = {
      reportId,
      submissionId,
      endpoint: template.submissionEndpoint,
      status: 'pending',
      submittedAt: new Date(),
    };

    try {
      const formattedReport = this.formatReport(report, template.format);
      const response = await this.sendToRegulatoryBody(
        template,
        formattedReport,
      );

      submission.status = 'submitted';
      submission.response = response;

      report.status = 'submitted';
      report.submissionDate = new Date();

      this.logger.log(
        `Report ${reportId} submitted successfully with submission ID ${submissionId}`,
      );
    } catch (error) {
      submission.status = 'failed';
      submission.error = error.message;
      this.logger.error(`Failed to submit report ${reportId}:`, error);
      throw error;
    }

    this.submissions.set(submissionId, submission);
    return submission;
  }

  private formatReport(report: RegulatoryReport, format: string): any {
    switch (format) {
      case 'JSON':
        return JSON.stringify(report, null, 2);
      case 'XML':
        return this.convertToXML(report);
      case 'CSV':
        return this.convertToCSV(report);
      case 'PDF':
        return this.convertToPDF(report);
      default:
        return report;
    }
  }

  private convertToXML(report: RegulatoryReport): string {
    // Simplified XML conversion
    return `<?xml version="1.0" encoding="UTF-8"?>
<regulatory-report>
  <id>${report.id}</id>
  <type>${report.reportType}</type>
  <period>
    <start>${report.period.startDate.toISOString()}</start>
    <end>${report.period.endDate.toISOString()}</end>
  </period>
  <summary>
    <total-transactions>${report.summary.totalTransactions}</total-transactions>
    <total-value>${report.summary.totalValue}</total-value>
    <compliance-rate>${report.summary.complianceRate}</compliance-rate>
  </summary>
</regulatory-report>`;
  }

  private convertToCSV(report: RegulatoryReport): string {
    const headers = [
      'Transaction ID',
      'Date',
      'Source Country',
      'Target Country',
      'Energy Type',
      'Value',
      'Currency',
      'Compliance Status',
    ];
    const rows = report.transactions.map((t) => [
      t.transactionId,
      t.date.toISOString(),
      t.sourceCountry,
      t.targetCountry,
      t.energyType,
      t.value.toString(),
      t.currency,
      t.complianceStatus,
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private convertToPDF(report: RegulatoryReport): Buffer {
    // In a real implementation, this would generate a PDF
    // For now, return a placeholder
    return Buffer.from(`PDF Report: ${report.id}`);
  }

  private async sendToRegulatoryBody(
    template: ReportTemplate,
    data: any,
  ): Promise<any> {
    // Mock API call - in real implementation, this would make HTTP request
    return {
      status: 'success',
      messageId: `MSG-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  }

  private generateSubmissionId(): string {
    return `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  async getReportById(reportId: string): Promise<RegulatoryReport | null> {
    // In a real implementation, this would query the database
    return null;
  }

  async getReportsByStatus(
    status: RegulatoryReport['status'],
  ): Promise<RegulatoryReport[]> {
    // In a real implementation, this would query the database
    return [];
  }

  async getSubmissionStatus(
    submissionId: string,
  ): Promise<ReportSubmission | null> {
    return this.submissions.get(submissionId) || null;
  }

  getReportTemplates(): ReportTemplate[] {
    return Array.from(this.reportTemplates.values());
  }

  getReportTemplateById(templateId: string): ReportTemplate | undefined {
    return this.reportTemplates.get(templateId);
  }

  async scheduleAutomaticReports(): Promise<void> {
    const templates = Array.from(this.reportTemplates.values());

    for (const template of templates) {
      // Schedule reports based on template frequency
      this.scheduleReport(template);
    }
  }

  private scheduleReport(template: ReportTemplate): void {
    const now = new Date();
    let nextRun: Date;

    switch (template.frequency) {
      case 'daily':
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextRun = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarterly':
        nextRun = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        break;
      case 'annual':
        nextRun = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }

    setTimeout(() => {
      this.generateAndSubmitReport(template);
      this.scheduleReport(template); // Schedule next run
    }, nextRun.getTime() - now.getTime());

    this.logger.log(
      `Scheduled ${template.name} report for ${nextRun.toISOString()}`,
    );
  }

  private async generateAndSubmitReport(
    template: ReportTemplate,
  ): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = this.calculateStartDate(template.frequency, endDate);

      const report = await this.generateReport(
        template.id,
        startDate,
        endDate,
        template.jurisdiction,
      );
      await this.submitReport(report.id);

      this.logger.log(
        `Automatic report ${template.name} generated and submitted successfully`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate automatic report ${template.name}:`,
        error,
      );
    }
  }

  private calculateStartDate(frequency: string, endDate: Date): Date {
    switch (frequency) {
      case 'daily':
        return new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarterly':
        return new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'annual':
        return new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

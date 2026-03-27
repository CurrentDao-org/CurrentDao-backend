import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { CrossBorderTransaction, ComplianceStatus } from '../entities/cross-border-transaction.entity';
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
export declare class RegulatoryReportService {
    private readonly transactionRepository;
    private readonly regulationService;
    private readonly configService;
    private readonly logger;
    private readonly reportTemplates;
    private readonly submissions;
    constructor(transactionRepository: Repository<CrossBorderTransaction>, regulationService: RegulationService, configService: ConfigService);
    private initializeReportTemplates;
    generateReport(reportType: string, startDate: Date, endDate: Date, jurisdiction?: string): Promise<RegulatoryReport>;
    private getTransactionsForPeriod;
    private getCountriesByJurisdiction;
    private buildTransactionReports;
    private extractEnergyType;
    private extractVolume;
    private extractViolations;
    private extractPenalties;
    private extractApplicableRegulations;
    private calculateComplianceMetrics;
    private isRegulationApplicable;
    private calculateAverageResolutionTime;
    private calculateSummary;
    private generateReportId;
    submitReport(reportId: string): Promise<ReportSubmission>;
    private formatReport;
    private convertToXML;
    private convertToCSV;
    private convertToPDF;
    private sendToRegulatoryBody;
    private generateSubmissionId;
    getReportById(reportId: string): Promise<RegulatoryReport | null>;
    getReportsByStatus(status: RegulatoryReport['status']): Promise<RegulatoryReport[]>;
    getSubmissionStatus(submissionId: string): Promise<ReportSubmission | null>;
    getReportTemplates(): ReportTemplate[];
    getReportTemplateById(templateId: string): ReportTemplate | undefined;
    scheduleAutomaticReports(): Promise<void>;
    private scheduleReport;
    private generateAndSubmitReport;
    private calculateStartDate;
}

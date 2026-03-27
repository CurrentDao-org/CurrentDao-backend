import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { TransactionLog, TransactionStatus, TransactionType } from '../entities/transaction-log.entity';
export interface ComplianceReportData {
    reportId: string;
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    period: {
        startDate: Date;
        endDate: Date;
    };
    generatedAt: Date;
    status: 'active' | 'archived' | 'deleted';
    summary: {
        totalAuditLogs: number;
        totalTransactions: number;
        totalVolume: number;
        errorRate: number;
        complianceScore: number;
        riskScore: number;
        retentionCompliance: number;
    };
    auditMetrics: {
        logsByAction: Record<AuditAction, number>;
        logsByResource: Record<AuditResource, number>;
        logsBySeverity: Record<AuditSeverity, number>;
        avgExecutionTime: number;
        sensitiveDataLogs: number;
        encryptedLogs: number;
    };
    transactionMetrics: {
        transactionsByType: Record<TransactionType, number>;
        transactionsByStatus: Record<TransactionStatus, number>;
        avgAmount: number;
        totalFees: number;
        totalTaxes: number;
    };
    compliance: {
        regulations: Array<{
            name: string;
            jurisdiction: string;
            requirements: string[];
            compliant: boolean;
            violations: Array<{
                requirement: string;
                severity: string;
                description: string;
                count: number;
            }>;
        }>;
        overallScore: number;
        recommendations: string[];
    };
    privacy: {
        dataClassification: Record<string, number>;
        redactionApplied: number;
        consentRecords: number;
        retentionPolicies: Record<string, number>;
    };
    security: {
        authenticationEvents: number;
        accessDeniedEvents: number;
        securityViolations: number;
        threatDetections: number;
    };
    performance: {
        avgResponseTime: number;
        throughput: number;
        systemUptime: number;
        errorRate: number;
    };
    risk: {
        highRiskTransactions: number;
        suspiciousActivities: number;
        complianceViolations: number;
        riskScore: number;
    };
}
export interface ComplianceRegulation {
    id: string;
    name: string;
    jurisdiction: string;
    category: string;
    requirements: Array<{
        id: string;
        name: string;
        description: string;
        mandatory: boolean;
        validation: string;
    }>;
    lastUpdated: Date;
    isActive: boolean;
}
export interface ComplianceCheck {
    regulationId: string;
    requirementId: string;
    status: 'compliant' | 'non_compliant' | 'pending';
    score: number;
    details: string;
    evidence?: string;
    checkedAt: Date;
    checkedBy: string;
}
export interface ComplianceViolation {
    id: string;
    regulationId: string;
    requirementId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedRecords: number;
    detectedAt: Date;
    resolvedAt?: Date;
    resolution?: string;
}
export declare class ComplianceReport {
    private readonly auditLogRepository;
    private readonly transactionLogRepository;
    private readonly logger;
    constructor(auditLogRepository: Repository<AuditLog>, transactionLogRepository: Repository<TransactionLog>);
    generateReport(reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual', startDate: Date, endDate: Date): Promise<ComplianceReportData>;
    generateDailyReport(date?: Date): Promise<ComplianceReportData>;
    generateWeeklyReport(date?: Date): Promise<ComplianceReportData>;
    generateMonthlyReport(date?: Date): Promise<ComplianceReportData>;
    generateQuarterlyReport(date?: Date): Promise<ComplianceReportData>;
    generateAnnualReport(date?: Date): Promise<ComplianceReportData>;
    checkCompliance(regulationId: string, startDate: Date, endDate: Date): Promise<{
        regulation: ComplianceRegulation;
        checks: ComplianceCheck[];
        violations: ComplianceViolation[];
        overallScore: number;
    }>;
    generateComplianceDashboard(startDate: Date, endDate: Date): Promise<{
        overview: {
            totalRegulations: number;
            compliantRegulations: number;
            overallScore: number;
            violationsCount: number;
            lastUpdated: Date;
        };
        regulations: Array<{
            id: string;
            name: string;
            jurisdiction: string;
            score: number;
            violations: number;
            status: 'compliant' | 'non_compliant' | 'pending';
        }>;
        trends: {
            scores: Array<{
                date: Date;
                score: number;
            }>;
            violations: Array<{
                date: Date;
                count: number;
            }>;
        };
        alerts: Array<{
            type: string;
            severity: string;
            message: string;
            timestamp: Date;
        }>;
    }>;
    exportReport(reportId: string, format?: 'json' | 'pdf' | 'excel'): Promise<string>;
    archiveReport(reportId: string): Promise<void>;
    deleteReport(reportId: string): Promise<void>;
    private generateSummary;
    private generateAuditMetrics;
    private generateTransactionMetrics;
    private generateComplianceMetrics;
    private generatePrivacyMetrics;
    private generateSecurityMetrics;
    private generatePerformanceMetrics;
    private generateRiskMetrics;
    private generateReportId;
    private getRegulation;
    private validateRequirement;
    private countAffectedRecords;
    private getViolationSeverity;
    private generateViolationId;
    private getActiveRegulations;
    private generateComplianceTrends;
    private generateComplianceAlerts;
    private generatePDFReport;
    private generateExcelReport;
    private getReport;
    private generateRecommendations;
    private calculateErrorRate;
    private calculateComplianceScore;
    private calculateRiskScore;
    private calculateRetentionCompliance;
    private getLogsByAction;
    private getLogsByResource;
    private getLogsBySeverity;
    private calculateAverageExecutionTime;
    private countSensitiveDataLogs;
    private countEncryptedLogs;
    private getTransactionsByType;
    private getTransactionsByStatus;
    private calculateAverageAmount;
    private calculateTotalFees;
    private calculateTotalTaxes;
    private getDataClassificationMetrics;
    private countRedactionApplied;
    private countConsentRecords;
    private getRetentionPolicyMetrics;
    private countAuthenticationEvents;
    private countAccessDeniedEvents;
    private countSecurityViolations;
    private countThreatDetections;
    private countHighRiskTransactions;
    private countSuspiciousActivities;
    private countComplianceViolations;
}

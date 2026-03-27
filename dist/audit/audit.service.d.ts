import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { AuditLog, AuditStatus, AuditAction, AuditResource, AuditSeverity } from './entities/audit-log.entity';
import { TransactionLog, TransactionStatus, TransactionType, TransactionCategory } from './entities/transaction-log.entity';
import { ComplianceReport } from './reports/compliance.report';
export interface AuditQuery {
    action?: AuditAction;
    resource?: AuditResource;
    severity?: AuditSeverity;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    status?: AuditStatus;
    ipAddress?: string;
    correlationId?: string;
    batchId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export interface AuditMetrics {
    totalLogs: number;
    logsByAction: Record<AuditAction, number>;
    logsByResource: Record<AuditResource, number>;
    logsBySeverity: Record<AuditSeverity, number>;
    logsByStatus: Record<AuditStatus, number>;
    avgExecutionTime: number;
    errorRate: number;
    retentionCompliance: number;
    sensitiveDataLogs: number;
    encryptedLogs: number;
}
export interface TransactionQuery {
    type?: TransactionType;
    status?: TransactionStatus;
    category?: TransactionCategory;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    amountMin?: number;
    amountMax?: number;
    currency?: string;
    correlationId?: string;
    transactionId?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
export interface TransactionMetrics {
    totalTransactions: number;
    totalVolume: number;
    transactionsByType: Record<TransactionType, number>;
    transactionsByStatus: Record<TransactionStatus, number>;
    transactionsByCategory: Record<TransactionCategory, number>;
    avgAmount: number;
    totalFees: number;
    totalTaxes: number;
    complianceScore: number;
    riskScore: number;
    retentionCompliance: number;
}
export declare class AuditService implements OnModuleInit {
    private readonly auditLogRepository;
    private readonly transactionLogRepository;
    private readonly complianceReportRepository;
    private readonly dataSource;
    private readonly logger;
    constructor(auditLogRepository: Repository<AuditLog>, transactionLogRepository: Repository<TransactionLog>, complianceReportRepository: Repository<ComplianceReport>, dataSource: DataSource);
    onModuleInit(): Promise<void>;
    logEvent(action: AuditAction, resource: AuditResource, options?: {
        severity?: AuditSeverity;
        description?: string;
        userId?: string;
        sessionId?: string;
        ipAddress?: string;
        userAgent?: string;
        requestBody?: any;
        responseBody?: any;
        metadata?: any;
        customFields?: Record<string, any>;
    }): Promise<AuditLog>;
    logTransaction(transactionData: {
        type: TransactionType;
        status: TransactionStatus;
        amount: number;
        currency: string;
        participants?: any;
        energyDetails?: any;
        contractDetails?: any;
        compliance?: any;
        risk?: any;
        metadata?: any;
        customFields?: Record<string, any>;
    }, options?: {
        userId?: string;
        sessionId?: string;
        ipAddress?: string;
        userAgent?: string;
        correlationId?: string;
        batchId?: string;
    }): Promise<TransactionLog>;
    getAuditLogs(query?: AuditQuery): Promise<{
        logs: AuditLog[];
        total: number;
        page: number;
        limit: number;
    }>;
    getTransactionLogs(query?: TransactionQuery): Promise<{
        transactions: TransactionLog[];
        total: number;
        page: number;
        limit: number;
    }>;
    getAuditMetrics(startDate?: Date, endDate?: Date): Promise<AuditMetrics>;
    getTransactionMetrics(startDate?: Date, endDate?: Date): Promise<TransactionMetrics>;
    getAuditLogById(id: string): Promise<AuditLog>;
    getTransactionLogById(id: string): Promise<TransactionLog>;
    reconstructTransaction(transactionId: string): Promise<{
        transaction: TransactionLog;
        relatedLogs: AuditLog[];
        timeline: Array<{
            timestamp: Date;
            event: string;
            details: any;
            userId?: string;
        }>;
    }>;
    reconstructAuditTrail(correlationId: string, startDate?: Date, endDate?: Date): Promise<{
        events: Array<{
            timestamp: Date;
            action: AuditAction;
            resource: AuditResource;
            severity: AuditSeverity;
            userId?: string;
            details: any;
        }>;
    }>;
    exportAuditData(query?: AuditQuery, format?: 'json' | 'csv' | 'excel'): Promise<string>;
    exportTransactionData(query?: TransactionQuery, format?: 'json' | 'csv' | 'excel'): Promise<string>;
    applyDataRetention(startDate?: Date): Promise<{
        deletedLogs: number;
        deletedTransactions: number;
        retentionPeriod: string;
    }>;
    applyPrivacyControls(auditLog: AuditLog): Promise<void>;
    private applyTransactionPrivacyControls;
    private verifyDataIntegrity;
    private calculateChecksum;
    private calculateAverageExecutionTime;
    private calculateErrorRate;
    private calculateRetentionCompliance;
}

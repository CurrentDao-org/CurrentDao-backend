"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const transaction_log_entity_1 = require("./entities/transaction-log.entity");
const compliance_report_1 = require("./reports/compliance.report");
let AuditService = AuditService_1 = class AuditService {
    constructor(auditLogRepository, transactionLogRepository, complianceReportRepository, dataSource) {
        this.auditLogRepository = auditLogRepository;
        this.transactionLogRepository = transactionLogRepository;
        this.complianceReportRepository = complianceReportRepository;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async onModuleInit() {
        await this.initializeAuditSystem();
        this.logger.log('Audit service initialized successfully');
    }
    async logEvent(action, resource, options = {}) {
        const startTime = Date.now();
        const auditLog = this.auditLogRepository.create({
            action,
            resource,
            severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
            status: audit_log_entity_1.AuditStatus.ACTIVE,
            description: options.description || `${action} ${resource}`,
            userId: options.userId,
            sessionId: options.sessionId,
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            requestMethod: options.requestMethod,
            requestUrl: options.requestUrl,
            requestBody: options.requestBody ? this.sanitizeData(options.requestBody) : undefined,
            responseBody: options.responseBody ? this.sanitizeData(options.responseBody) : undefined,
            executionTime: Date.now() - startTime,
            memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
            description: options.description,
            metadata: {
                previousState: undefined,
                newState: undefined,
                changes: undefined,
                tags: [],
                category: resource,
                subcategory: action,
                privacy: {
                    dataClassification: 'internal',
                    redactionLevel: 0,
                    consentRequired: false,
                },
                risk: {
                    level: 'low',
                    factors: [],
                    score: 0,
                },
                compliance: {
                    regulations: [],
                    requirements: [],
                    compliant: false,
                },
                ...options.metadata,
            },
            correlationId: options.correlationId,
            batchId: options.batchId,
            performance: {
                cpuTime: undefined,
                memoryPeak: process.memoryUsage().heapPeak / 1024 / 1024,
            },
            security: {
                authenticationMethod: options.authenticationMethod || 'none',
                permissionsChecked: [],
                rolesChecked: [],
                violations: [],
                threats: [],
            },
            isSensitive: options.sensitive || false,
            isEncrypted: options.encrypted || false,
            checksum: '',
            signature: '',
            createdAt: new Date(startTime),
            updatedAt: new Date(startTime),
        });
        if (options.customFields) {
            Object.assign(auditLog.metadata, options.customFields);
        }
        auditLog.checksum = this.calculateChecksum(auditLog);
        await this.applyPrivacyControls(auditLog);
        const savedLog = await this.auditLogRepository.save(auditLog);
        this.emitAuditEvent('audit_logged', {
            auditId: savedLog.id,
            action: savedLog.action,
            resource: savedLog.resource,
            severity: savedLog.severity,
            userId: savedLog.userId,
            timestamp: savedLog.createdAt,
        });
        this.logger.debug(`Audit log created: ${savedLog.id} - ${savedLog.action} ${savedLog.resource}`);
        return savedLog;
    }
    async logTransaction(transactionData, options = {}) {
        const startTime = Date.now();
        const transactionId = this.generateTransactionId();
        const transactionLog = this.transactionLogRepository.create({
            type: transactionData.type,
            status: transactionData.status || transaction_log_entity_1.TransactionStatus.INITIATED,
            category: transactionData.category || transaction_log_entity_1.TransactionCategory.FINANCIAL,
            transactionId,
            correlationId: options.correlationId,
            batchId: options.batchId,
            amount: transactionData.amount,
            originalAmount: transactionData.originalAmount || transactionData.amount,
            feeAmount: transactionData.feeAmount || 0,
            taxAmount: transactionData.taxAmount || 0,
            exchangeRate: transactionData.exchangeRate || 1,
            currency: transactionData.currency || 'USD',
            paymentMethod: transactionData.paymentMethod,
            paymentReference: transactionData.paymentReference,
            participants: transactionData.participants,
            energyDetails: transactionData.energyDetails,
            contractDetails: transactionData.contractDetails,
            compliance: transactionData.compliance || {
                level: 'standard',
                regulations: [],
                amlCheck: { status: 'pending' },
                kycCheck: { status: 'pending' },
                sanctions: { screened: false },
            },
            risk: transactionData.risk || {
                score: 0,
                level: 'low',
                factors: [],
                mitigation: [],
            },
            timeline: {
                initiated: new Date(startTime),
            },
            state: {
                current: 'initiated',
                transitions: [],
                data: {},
            },
            metadata: {
                source: 'system',
                channel: 'api',
                tags: [],
                attributes: {},
                customFields: options.customFields || {},
            },
            audit: {
                created: {
                    by: options.userId,
                    at: new Date(startTime),
                    ip: options.ipAddress,
                    userAgent: options.userAgent,
                },
            },
            privacy: {
                dataClassification: 'internal',
                retention: {
                    policy: 'standard',
                    autoDelete: false,
                },
            },
            createdAt: new Date(startTime),
            updatedAt: new Date(startTime),
        });
        if (options.customFields) {
            Object.assign(transactionLog.metadata, options.customFields);
        }
        transactionLog.checksum = this.calculateChecksum(transactionLog);
        await this.applyTransactionPrivacyControls(transactionLog);
        const savedLog = await this.transactionLogRepository.save(transactionLog);
        this.emitTransactionEvent('transaction_logged', {
            transactionId: savedLog.id,
            type: savedLog.type,
            status: savedLog.status,
            amount: savedLog.amount,
            currency: savedLog.currency,
            userId: savedLog.audit?.created?.by,
            timestamp: savedLog.createdAt,
        });
        this.logger.debug(`Transaction log created: ${savedLog.id} - ${savedLog.type} - ${savedLog.amount} ${savedLog.currency}`);
        return savedLog;
    }
    async getAuditLogs(query = {}) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');
        if (query.action) {
            queryBuilder.andWhere('audit.action = :action', { action: query.action });
        }
        if (query.resource) {
            queryBuilder.andWhere('audit.resource = :resource', { resource: query.resource });
        }
        if (query.severity) {
            queryBuilder.andWhere('audit.severity = :severity', { severity: query.severity });
        }
        if (query.userId) {
            queryBuilder.andWhere('audit.userId = :userId', { userId: query.userId });
        }
        if (query.startDate) {
            queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate: query.startDate });
        }
        if (query.endDate) {
            queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate: query.endDate });
        }
        if (query.status) {
            queryBuilder.andWhere('audit.status = :status', { status: query.status });
        }
        if (query.ipAddress) {
            queryBuilder.andWhere('audit.ipAddress = :ipAddress', { ipAddress: query.ipAddress });
        }
        if (query.correlationId) {
            queryBuilder.andWhere('audit.correlationId = :correlationId', { correlationId: query.correlationId });
        }
        if (query.batchId) {
            queryBuilder.andWhere('audit.batchId = :batchId', { batchId: query.batchId });
        }
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'DESC';
        queryBuilder.orderBy(`audit.${sortBy}`, sortOrder);
        const limit = Math.min(query.limit || 100, 1000);
        const offset = query.offset || 0;
        queryBuilder.skip(offset).take(limit);
        const [logs, total] = await queryBuilder.getManyAndCount();
        return {
            logs,
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
        };
    }
    async getTransactionLogs(query = {}) {
        const queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction');
        if (query.type) {
            queryBuilder.andWhere('transaction.type = :type', { type: query.type });
        }
        if (query.status) {
            queryBuilder.andWhere('transaction.status = :status', { status: query.status });
        }
        if (query.category) {
            queryBuilder.andWhere('transaction.category = :category', { category: query.category });
        }
        if (query.userId) {
            queryBuilder.andWhere('audit.createdBy = :userId', { userId: query.userId });
        }
        if (query.startDate) {
            queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate: query.startDate });
        }
        if (query.endDate) {
            queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate: query.endDate });
        }
        if (query.amountMin) {
            queryBuilder.andWhere('transaction.amount >= :amountMin', { amount: query.amountMin });
        }
        if (query.amountMax) {
            queryBuilder.andWhere('transaction.amount <= :amountMax', { amount: query.amountMax });
        }
        if (query.currency) {
            queryBuilder.andWhere('transaction.currency = :currency', { currency: query.currency });
        }
        if (query.correlationId) {
            queryBuilder.andWhere('transaction.correlationId = :correlationId', { correlationId: query.correlationId });
        }
        if (query.transactionId) {
            queryBuilder.andWhere('transaction.transactionId = :transactionId', { transactionId: query.transactionId });
        }
        const sortBy = query.sortBy || 'createdAt';
        const sortOrder = query.sortOrder || 'DESC';
        queryBuilder.orderBy(`transaction.${sortBy}`, sortOrder);
        const limit = Math.min(query.limit || 100, 1000);
        const offset = query.offset || 0;
        queryBuilder.skip(offset).take(limit);
        const [transactions, total] = await queryBuilder.getManyAndCount();
        return {
            transactions,
            total,
            page: Math.floor(offset / limit) + 1,
            limit,
        };
    }
    async getAuditMetrics(startDate, endDate) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit');
        if (startDate) {
            queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
        }
        const [totalLogs, logsByAction, logsByResource, logsBySeverity, logsByStatus] = await Promise.all([
            queryBuilder.getCount(),
            this.getLogsByAction(startDate, endDate),
            this.getLogsByResource(startDate, endDate),
            this.getLogsBySeverity(startDate, endDate),
            this.getLogsByStatus(startDate, endDate),
        ]);
        const avgExecutionTime = await this.calculateAverageExecutionTime(startDate, endDate);
        const errorRate = await this.calculateErrorRate(startDate, endDate);
        const retentionCompliance = await this.calculateRetentionCompliance(startDate, endDate);
        const sensitiveDataLogs = await this.countSensitiveDataLogs(startDate, endDate);
        const encryptedLogs = await this.countEncryptedLogs(startDate, endDate);
        return {
            totalLogs,
            logsByAction,
            logsByResource,
            logsBySeverity,
            logsByStatus,
            avgExecutionTime,
            errorRate,
            retentionCompliance,
            sensitiveDataLogs,
            encryptedLogs,
        };
    }
    async getTransactionMetrics(startDate, endDate) {
        const queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction');
        if (startDate) {
            queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate });
        }
        const [totalTransactions, transactionsByType, transactionsByStatus, transactionsByCategory, avgAmount, totalVolume, totalFees, totalTaxes,] = await Promise.all([
            queryBuilder.getCount(),
            this.getTransactionsByType(startDate, endDate),
            this.getTransactionsByStatus(startDate, endDate),
            this.getTransactionsByCategory(startDate, endDate),
            this.calculateAverageAmount(startDate, endDate),
            this.calculateTotalVolume(startDate, endDate),
            this.calculateTotalFees(startDate, endDate),
            this.calculateTotalTaxes(startDate, endDate),
        ]);
        const complianceScore = await this.calculateComplianceScore(startDate, endDate);
        const riskScore = await this.calculateRiskScore(startDate, endDate);
        const retentionCompliance = await this.calculateTransactionRetentionCompliance(startDate, endDate);
        return {
            totalTransactions,
            totalVolume,
            transactionsByType,
            transactionsByStatus,
            transactionsByCategory,
            avgAmount,
            totalFees,
            totalTaxes,
            complianceScore,
            riskScore,
            retentionCompliance,
        };
    }
    async getAuditLogById(id) {
        const auditLog = await this.auditRepository.findOne({ where: { id } });
        if (!auditLog) {
            throw new Error(`Audit log with ID ${id} not found`);
        }
        return auditLog;
    }
    async getTransactionLogById(id) {
        const transactionLog = await this.transactionLogRepository.findOne({
            where: { id },
            relations: ['audit'],
        });
        if (!transactionLog) {
            throw new Error(`Transaction log with ID ${id} not found`);
        }
        return transactionLog;
    }
    async reconstructTransaction(transactionId) {
        const transaction = await this.getTransactionLogById(transactionId);
        const relatedLogs = await this.getRelatedAuditLogs(transactionId);
        const timeline = await this.buildTransactionTimeline(transaction, relatedLogs);
        return {
            transaction,
            relatedLogs,
            timeline,
        };
    }
    async reconstructAuditTrail(correlationId, startDate, endDate) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
            .where('audit.correlationId = :correlationId');
        if (startDate) {
            queryBuilder.andWhere('audit.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder.andWhere('audit.createdAt <= :endDate', { endDate });
        }
        queryBuilder.orderBy('audit.createdAt', 'ASC');
        const logs = await queryBuilder.getMany();
        return logs.map(log => ({
            timestamp: log.createdAt,
            action: log.action,
            resource: log.resource,
            severity: log.severity,
            userId: log.userId,
            details: log.metadata,
        }));
    }
    async exportAuditData(query = {}, format = 'json') {
        const { logs } = await this.getAuditLogs(query);
        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        }
        if (format === 'csv') {
            return this.convertToCSV(logs);
        }
        if (format === 'excel') {
            return this.convertToExcel(logs);
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
    async exportTransactionData(query = {}, format = 'json') {
        const { transactions } = await this.getTransactionLogs(query);
        if (format === 'json') {
            return JSON.stringify(transactions, null, 2);
        }
        if (format === 'csv') {
            return this.convertTransactionsToCSV(transactions);
        }
        if (format === 'excel') {
            return this.convertTransactionsToExcel(transactions);
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
    async applyDataRetention(startDate) {
        const retentionPeriod = this.getDefaultRetentionPeriod();
        const cutoffDate = new Date();
        switch (retentionPeriod) {
            case '1_year':
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
                break;
            case '2_years':
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
                break;
            case '5_years':
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
                break;
            case '7_years':
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 7);
                break;
            default:
                cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
        }
        const [deletedLogs] = await this.auditLogRepository.delete({
            where: {
                createdAt: (0, typeorm_2.LessThan)(cutoffDate),
                status: audit_log_entity_1.AuditStatus.ACTIVE,
            },
        });
        const [deletedTransactions] = await this.transactionLogRepository.delete({
            where: {
                createdAt: (0, typeorm_2.LessThan)(cutoffDate),
                status: transaction_log_entity_1.TransactionStatus.COMPLETED,
            },
        });
        return {
            deletedLogs,
            deletedTransactions,
            retentionPeriod,
        };
    }
    async applyPrivacyControls(auditLog) {
        if (auditLog.isSensitive) {
            if (auditLog.privacy?.redactionRules) {
                for (const redactionRule of auditLog.privacy.redactionRules) {
                    if (redactionRule.action === 'redact') {
                        auditLog.metadata[redactionRule.field] = '***REDACTED***';
                        redactionRule.applied = true;
                    }
                }
            }
        }
        const retentionPeriod = this.getRetentionPeriod(auditLog);
        const retentionUntil = this.calculateRetentionUntil(auditLog, retentionPeriod);
        auditLog.retentionUntil = retentionUntil;
        auditLog.privacy.retention.policy = retentionPeriod;
        auditLog.privacy.retention.autoDelete = true;
    }
    async applyTransactionPrivacyControls(transactionLog) {
        const sensitiveFields = ['ssn', 'bankAccount', 'routingNumber', 'creditCard'];
        for (const field of sensitiveFields) {
            if (transactionLog.participants?.buyer?.[field]) {
                transactionLog.participants.buyer[field] = '***REDACTED***';
            }
            if (transactionLog.participants?.seller?.[field]) {
                transactionLog.participants.seller[field] = '***REDACTED***';
            }
        }
        const retentionPeriod = this.getTransactionRetentionPeriod(transactionLog);
        const retentionUntil = this.calculateRetentionUntil(transactionLog, retentionPeriod);
        transactionLog.retentionUntil = retentionUntil;
        transactionLog.privacy.retention.policy = retentionPeriod;
        transactionLog.privacy.retention.autoDelete = true;
    }
    async verifyDataIntegrity() {
        const auditLogs = await this.auditLogRepository.find({
            take: 1000,
            order: { createdAt: 'ASC' },
        });
        const transactionLogs = await this.transactionLogRepository.find({
            take: 1000,
            order: { createdAt: 'ASC' },
        });
        const integrityIssues;
        let auditLogsVerified = 0;
        let transactionLogsVerified = 0;
        for (const auditLog of auditLogs) {
            const calculatedChecksum = this.calculateChecksum(auditLog);
            if (auditLog.checksum !== calculatedChecksum) {
                integrityIssues.push({
                    id: auditLog.id,
                    type: 'audit',
                    issue: 'Checksum mismatch detected',
                    detectedAt: new Date(),
                });
            }
            else {
                auditLogsVerified++;
            }
        }
        for (const transactionLog of transactionLogs) {
            const calculatedChecksum = this.calculateChecksum(transactionLog);
            if (transactionLog.checksum !== calculatedChecksum) {
                integrityIssues.push({
                    id: transactionLog.id,
                    type: 'transaction',
                    issue: 'Checksum mismatch detected',
                    detectedAt: new Date(),
                });
            }
            else {
                transactionLogsVerified++;
            }
        }
        return {
            auditLogsVerified,
            transactionLogsVerified,
            integrityIssues,
        };
    }
    calculateChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    calculateAverageExecutionTime(startDate, endDate) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
            .where('audit.executionTime IS NOT NULL')
            .andWhere('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
            .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() });
        const result = await queryBuilder.select(['audit.executionTime']).getRawMany();
        const executionTimes = result.map(row => parseFloat(row.executionTime));
        const totalTime = executionTimes.reduce((sum, time) => sum + time, 0);
        return totalTime / executionTimes.length || 1;
    }
    calculateErrorRate(startDate, endDate) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
            .where('audit.error IS NOT NULL')
            .andWhere('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
            .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() });
        const totalLogs = await queryBuilder.getCount();
        const errorLogs = await queryBuilder.count({
            where: 'audit.error IS NOT NULL',
        });
        return totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
    }
    calculateRetentionCompliance(startDate, endDate) {
        const queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
            .where('audit.retentionUntil IS NOT NULL')
            .andWhere('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
            .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() });
        const totalLogs = await queryBuilder.getCount();
        const compliantLogs = await queryBuilder.count({
            where: 'audit.retentionUntil >= :now',
        }, { now: new Date() });
    }
    ;
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(1, (0, typeorm_1.InjectRepository)(transaction_log_entity_1.TransactionLog)),
    __param(2, (0, typeorm_1.InjectRepository)(compliance_report_1.ComplianceReport)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], AuditService);
return totalLogs > 0 ? (compliantLogs / totalLogs) * 100 : 0;
countSensitiveDataLogs(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
        .where('audit.isSensitive = :isSensitive', { isSensitive: true })
        .andWhere('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() }),
    return: await queryBuilder.getCount()
};
countEncryptedLogs(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
        .where('audit.isEncrypted = :isEncrypted', { isEncrypted: true })
        .andWhere('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() }),
    return: await queryBuilder.getCount()
};
getLogsByAction(startDate ?  : Date, endDate ?  : Date);
Promise < Record < audit_log_entity_1.AuditAction, number >> {
    const: queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
        .where('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = await queryBuilder
        .select(['audit.action'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.audit_action] = parseInt(result.count);
}
return counts;
getLogsByResource(startDate ?  : Date, endDate ?  : Date);
Promise < Record < audit_log_entity_1.AuditResource, number >> {
    const: queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
        .where('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = await queryBuilder
        .select(['audit.resource'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.audit_resource] = parseInt(result.count);
}
return counts;
getLogsBySeverity(startDate ?  : Date, endDate ?  : Date);
Promise < Record < audit_log_entity_1.AuditSeverity, number >> {
    const: queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
        .where('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = await queryBuilder
        .select(['audit.severity'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.audit_severity] = parseInt(result.count);
}
return counts;
getLogsByStatus(startDate ?  : Date, endDate ?  : Date);
Promise < Record < audit_log_entity_1.AuditStatus, number >> {
    const: queryBuilder = this.auditLogRepository.createQueryBuilder('audit')
        .where('audit.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('audit.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = await queryBuilder
        .select(['audit.status'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.audit_status] = parseInt(result.count);
}
return counts;
getTransactionsByType(startDate ?  : Date, endDate ?  : Date);
Promise < Record < transaction_log_entity_1.TransactionType, number >> {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = await queryBuilder
        .select(['transaction.type'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.transaction_type] = parseInt(result.count);
}
return counts;
getTransactionsByStatus(startDate ?  : Date, endDate ?  : Date);
Promise < Record < transaction_log_entity_1.TransactionStatus, number >> {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = await queryBuilder
        .select(['transaction.status'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.transaction_status] = parseInt(result.count);
}
return counts;
getTransactionsByCategory(startDate ?  : Date, endDate ?  : Date);
Promise < Record < transaction_log_entity_1.TransactionCategory, number >> {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .andWhere('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: results = queryBuilder
        .select(['transaction.category'])
        .distinct(true)
        .getRawMany(),
    const: counts
};
{ }
;
for (const result of results) {
    counts[result.transaction_category] = parseInt(result.count);
}
return counts;
calculateAverageAmount(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .where('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: result = await queryBuilder
        .select(['transaction.amount'])
        .getRawMany(),
    const: amounts = result.map(row => parseFloat(row.transaction_amount)),
    const: totalAmount = amounts.reduce((sum, amount) => sum + amount, 0),
    return: totalAmount / amounts.length
};
calculateTotalVolume(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .where('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: result = queryBuilder
        .select(['transaction.amount'])
        .getRawMany(),
    const: volumes = result.map(row => parseFloat(row.transaction_amount)),
    const: totalVolume = volumes.reduce((sum, volume) => sum + volume, 0),
    return: totalVolume
};
calculateTotalFees(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .where('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: result = queryBuilder
        .select(['transaction.feeAmount'])
        .getRawMany(),
    const: fees = result.map(row => parseFloat(row.transaction_fee_amount)),
    const: totalFees = fees.reduce((sum, fee) => sum + fee, 0),
    return: totalFees
};
calculateTotalTaxes(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .where('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: result = queryBuilder
        .select(['transaction.taxAmount'])
        .getRawMany(),
    const: taxes = result.map(row => parseFloat(row.transaction_tax_amount)),
    const: totalTaxes = taxes.reduce((sum, tax) => sum + tax, 0),
    return: totalTaxes
};
calculateComplianceScore(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .where('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: transactions = await queryBuilder.getMany(),
    let, totalScore = 0,
    let, count = 0,
    for(, transaction, of, transactions) {
        let transactionScore = 0;
        if (transaction.compliance?.amlCheck?.status === 'passed')
            transactionScore += 25;
        if (transaction.compliance?.kycCheck?.status === 'verified')
            transactionScore += 25;
        if (transaction.compliance?.sanctions?.screened)
            transactionScore += 20;
        const riskScore = transaction.risk?.score || 0;
        transactionScore += Math.max(0, 100 - (riskScore * 20));
        totalScore += transactionScore;
        count++;
    },
    return: count > 0 ? totalScore / count : 0
};
calculateRiskScore(startDate ?  : Date, endDate ?  : Date);
Promise < number > {
    const: queryBuilder = this.transactionLogRepository.createQueryBuilder('transaction')
        .where('transaction.createdAt >= :startDate', { startDate: startDate || new Date(0) })
        .where('transaction.createdAt <= :endDate', { endDate: endDate || new Date() }),
    const: transactions = await queryBuilder.getMany(),
    let, totalRiskScore = 0,
    let, count = 0,
    for(, transaction, of, transactions) {
        const riskScore = transaction.risk?.score || 0;
        totalRiskScore += riskScore;
        count++;
    },
    return: count > 0 ? totalRiskScore / count : 0
};
calculateTransactionRetentionPeriod(transaction, transaction_log_entity_1.TransactionLog);
string;
{
    const amount = transaction.amount || 0;
    if (amount > 100000)
        return '7_years';
    if (amount > 10000)
        return '5_years';
    if (amount > 1000)
        return '3_years';
    if (amount > 100)
        return '2_years';
    return '1_year';
}
calculateRetentionUntil(auditLog, audit_log_entity_1.AuditLog, retentionPeriod, string);
Date;
{
    const now = new Date();
    switch (retentionPeriod) {
        case '1_year':
            return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        case '2_years':
            return new Date(now.getFullYear() + 2, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        case '5_years':
            return new Date(now.getFullYear() + 5, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        case '7_years':
            return new Date(now.getFullYear() + 7, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        default:
            return new Date(now.getFullYear() + 3, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    }
}
getRetentionPeriod(auditLog ?  : audit_log_entity_1.AuditLog);
string;
{
    if (auditLog?.severity === audit_log_entity_1.AuditSeverity.CRITICAL)
        return '10_years';
    if (auditLog?.severity === audit_log_entity_1.AuditSeverity.HIGH)
        return '7_years';
    if (auditLog?.isSensitive)
        return '5_years';
    return '3_years';
}
getTransactionRetentionPeriod(transactionLog ?  : transaction_log_entity_1.TransactionLog);
string;
{
    const amount = transactionLog?.amount || 0;
    if (amount > 100000)
        return '10_years';
    if (amount > 10000)
        return '7_years';
    if (amount > 1000)
        return '5_years';
    if (amount > 100)
        return '3_years';
    return '1_year';
}
calculateRetentionUntil(transactionLog, transaction_log_entity_1.TransactionLog, retentionPeriod, string);
Date;
{
    const now = new Date();
    switch (retentionPeriod) {
        case '1_year':
            return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        case '2_years':
            return new Date(now.getFullYear() + 2, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        case '5_years':
            return new Date(now.getFullYear() + 5, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        case '7_years':
            return new Date(now.getFullYear() + 7, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
        default:
            return new Date(now.getFullYear() + 3, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
    }
}
async;
buildTransactionTimeline(transaction, transaction_log_entity_1.TransactionLog, relatedLogs, audit_log_entity_1.AuditLog[]);
Promise < Array < {
    timestamp: Date,
    event: string,
    details: any,
    userId: string
} >> {
    const: timeline, Array() {
        timestamp: Date;
        event: string;
        details: any;
        userId ?  : string;
    }
} > ;
[];
timeline.push({
    timestamp: transaction.createdAt,
    event: 'transaction_created',
    details: {
        transactionId: transaction.transactionId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
    },
    userId: transaction.audit?.created?.by,
});
for (const transition of transaction.state?.transitions || []) {
    timeline.push({
        timestamp: transition.timestamp,
        event: 'state_change',
        details: {
            from: transition.from,
            to: transition.to,
            reason: transition.reason,
        },
        userId: transition.userId,
    });
}
for (const auditLog of relatedLogs) {
    timeline.push({
        timestamp: auditLog.createdAt,
        event: auditLog.action,
        details: auditLog.description,
        userId: auditLog.userId,
    });
}
timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
return timeline;
convertToCSV(logs, any[]);
string;
{
    if (logs.length === 0)
        return '';
    const headers = [
        'ID',
        'Action',
        'Resource',
        'Severity',
        'User ID',
        'IP Address',
        'Timestamp',
        'Execution Time (ms)',
        'Status',
        'Description',
    ];
    const rows = logs.map(log => [
        log.id,
        log.audit_action,
        log.audit_resource,
        log.audit_severity,
        log.user_id,
        log.ip_address,
        log.audit_created_at,
        log.audit_execution_time,
        log.audit_status,
        log.audit_description,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(','));
    return csvContent.join('\n');
}
convertTransactionsToCSV(transactions, any[]);
string;
{
    if (transactions.length === 0)
        return '';
    const headers = [
        'Transaction ID',
        'Type',
        'Status',
        'Amount',
        'Currency',
        'Buyer ID',
        'Seller ID',
        'Created At',
        'Status',
        'Payment Method',
        'Risk Score',
    ];
    const rows = transactions.map(transaction => [
        transaction.transaction_id,
        transaction.type,
        transaction.status,
        transaction.amount,
        transaction.currency,
        transaction.participants?.buyer?.id || '',
        transaction.participants?.seller?.id || '',
        transaction.transaction_created_at,
        transaction.status,
        transaction.payment_method,
        transaction.risk?.score || 0,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(','));
    return csvContent.join('\n');
}
convertToExcel(transactions, any[]);
string;
{
    if (transactions.length === 0)
        return '';
    const headers = [
        'Transaction ID',
        'Type',
        'Status',
        'Amount',
        'Currency',
        'Buyer ID',
        'Seller ID',
        'Created At',
        'Status',
        'Payment Method',
        'Risk Score',
    ];
    const rows = transactions.map(transaction => [
        transaction.transaction_id,
        transaction.type,
        transaction.status,
        transaction.amount,
        transaction.currency,
        transaction.participants?.buyer?.id || '',
        transaction.participants?.seller?.id || '',
        transaction.transaction_created_at,
        transaction.status,
        transaction.payment_method,
        transaction.risk?.score || 0,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(field => `"${field}"`).join(','));
    return csvContent.join('\n');
}
emitAuditEvent(event, string, data, any);
void {
    this: .logger.debug(`Audit event: ${event}`, data)
};
async;
cleanupExpiredAuditLogs();
Promise < number > {
    const: cutoffDate = new Date(),
    cutoffDate, : .setFullYear(cutoffDate.getFullYear() - 3),
    const: result = await this.auditLogRepository.delete({
        where: {
            createdAt: (0, typeorm_2.LessThan)(cutoffDate),
            status: audit_log_entity_1.AuditStatus.ACTIVE,
        },
    }),
    this: .logger.log(`Cleaned up ${result.affected} expired audit logs older than 3 years`),
    return: result.affected
};
async;
cleanupExpiredTransactionLogs();
Promise < number > {
    const: cutoffDate = new Date(),
    cutoffDate, : .setFullYear(cutoffDate.getFullYear() - 7),
    const: result = await this.transactionLogRepository.delete({
        where: {
            createdAt: (0, typeorm_2.LessThan)(cutoffDate),
            status: transaction_log_entity_1.TransactionStatus.COMPLETED,
        },
    }),
    this: .logger.log(`Cleaned up ${result.affected} expired transaction logs older than 7 years`),
    return: result.affected
};
performDataCleanup();
Promise < void  > {
    await, this: .cleanupExpiredAuditLogs(),
    await, this: .cleanupExpiredTransactionLogs(),
    this: .logger.log('Data cleanup completed')
};
performIntegrityVerification();
Promise < void  > {
    const: integrityResult = await this.verifyDataIntegrity(),
    if(integrityResult) { }, : .integrityIssues.length > 0
};
{
    this.logger.error(`Data integrity issues detected: ${integrityResult.integrityIssues.length}`);
}
{
    this.logger.log('Data integrity verified successfully');
}
generateComplianceReports();
Promise < void  > {
    const: endDate = new Date(),
    const: startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate()),
    const: report = await this.complianceReportRepository.create({
        reportId: `compliance_${Date.getTime()}`,
        reportType: 'monthly',
        period: startDate.toISOString().substring(0, 7),
        generatedAt: new Date(),
        status: 'active',
        data: await this.generateComplianceData(startDate, endDate),
    }),
    await, this: .complianceReportRepository.save(report),
    this: .logger.log(`Compliance report generated for period: ${startDate.toISOString()}`)
};
async;
generateComplianceData(startDate, Date, endDate, Date);
Promise < any > {
    const: [auditMetrics, transactionMetrics] = await Promise.all([
        this.getAuditMetrics(startDate, endDate),
        this.getTransactionMetrics(startDate, endDate),
    ]),
    return: {
        period: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
        },
        audit: {
            totalLogs: auditMetrics.totalLogs,
            errorRate: auditMetrics.errorRate,
            avgExecutionTime: auditMetrics.avgExecutionTime,
            sensitiveDataLogs: auditMetrics.sensitiveDataLogs,
            encryptedLogs: auditMetrics.encryptedLogs,
            retentionCompliance: auditMetrics.retentionCompliance,
        },
        transactions: {
            totalTransactions: transactionMetrics.totalTransactions,
            totalVolume: transactionMetrics.totalVolume,
            totalFees: transactionMetrics.totalFees,
            totalTaxes: transactionMetrics.totalTaxes,
            complianceScore: transactionMetrics.complianceScore,
            riskScore: transactionMetrics.riskScore,
        },
        performance: {
            avgExecutionTime: auditMetrics.avgExecutionTime,
            errorRate: auditMetrics.errorRate,
            throughput: auditMetrics.totalLogs / (auditMetrics.totalLogs || 1),
        },
        compliance: {
            regulations: await this.getActiveRegulations(),
            complianceScore: transactionMetrics.complianceScore,
            riskScore: transactionMetrics.riskScore,
            retentionCompliance: auditMetrics.retentionCompliance,
        },
    }
};
async;
getActiveRegulations();
Promise < Array < {
    name: string,
    jurisdiction: string,
    requirements: string[],
    lastUpdated: Date
} >> {
    return: [
        {
            name: 'SOX',
            jurisdiction: 'US',
            requirements: [
                'Transaction monitoring',
                'AML compliance',
                'Data retention',
                'Privacy protection',
            ],
            lastUpdated: new Date(),
        },
        {
            name: 'GDPR',
            jurisdiction: 'EU',
            requirements: [
                'Data protection',
                'Privacy rights',
                'Consent management',
                'Data portability',
            ],
            lastUpdated: new Date(),
        },
    ]
};
async;
getActiveRegulations();
Promise < Array < {
    name: string,
    jurisdiction: string,
    requirements: string[],
    lastUpdated: Date
} >> {
    return: this.getActiveRegulations()
};
//# sourceMappingURL=audit.service.js.map
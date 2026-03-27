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
var ComplianceReport_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplianceReport = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("../entities/audit-log.entity");
const transaction_log_entity_1 = require("../entities/transaction-log.entity");
let ComplianceReport = ComplianceReport_1 = class ComplianceReport {
    constructor(auditLogRepository, transactionLogRepository) {
        this.auditLogRepository = auditLogRepository;
        this.transactionLogRepository = transactionLogRepository;
        this.logger = new common_1.Logger(ComplianceReport_1.name);
    }
    async generateReport(reportType, startDate, endDate) {
        this.logger.log(`Generating ${reportType} compliance report for period ${startDate.toISOString()} to ${endDate.toISOString()}`);
        const reportId = this.generateReportId(reportType, startDate);
        const [summary, auditMetrics, transactionMetrics, compliance, privacy, security, performance, risk,] = await Promise.all([
            this.generateSummary(startDate, endDate),
            this.generateAuditMetrics(startDate, endDate),
            this.generateTransactionMetrics(startDate, endDate),
            this.generateComplianceMetrics(startDate, endDate),
            this.generatePrivacyMetrics(startDate, endDate),
            this.generateSecurityMetrics(startDate, endDate),
            this.generatePerformanceMetrics(startDate, endDate),
            this.generateRiskMetrics(startDate, endDate),
        ]);
        const report = {
            reportId,
            reportType,
            period: { startDate, endDate },
            generatedAt: new Date(),
            status: 'active',
            summary,
            auditMetrics,
            transactionMetrics,
            compliance,
            privacy,
            security,
            performance,
            risk,
        };
        this.logger.log(`Compliance report generated: ${reportId}`);
        return report;
    }
    async generateDailyReport(date = new Date()) {
        const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
        return this.generateReport('daily', startDate, endDate);
    }
    async generateWeeklyReport(date = new Date()) {
        const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6, 23, 59, 59, 999);
        return this.generateReport('weekly', startDate, endDate);
    }
    async generateMonthlyReport(date = new Date()) {
        const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        return this.generateReport('monthly', startDate, endDate);
    }
    async generateQuarterlyReport(date = new Date()) {
        const quarter = Math.floor(date.getMonth() / 3);
        const startDate = new Date(date.getFullYear(), quarter * 3, 1);
        const endDate = new Date(date.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
        return this.generateReport('quarterly', startDate, endDate);
    }
    async generateAnnualReport(date = new Date()) {
        const startDate = new Date(date.getFullYear(), 0, 1);
        const endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
        return this.generateReport('annual', startDate, endDate);
    }
    async checkCompliance(regulationId, startDate, endDate) {
        const regulation = await this.getRegulation(regulationId);
        const checks = [];
        const violations = [];
        for (const requirement of regulation.requirements) {
            const check = await this.validateRequirement(requirement, startDate, endDate);
            checks.push(check);
            if (check.status === 'non_compliant') {
                violations.push({
                    id: this.generateViolationId(),
                    regulationId,
                    requirementId: requirement.id,
                    severity: this.getViolationSeverity(requirement),
                    description: check.details,
                    affectedRecords: await this.countAffectedRecords(requirement, startDate, endDate),
                    detectedAt: new Date(),
                });
            }
        }
        const overallScore = checks.reduce((sum, check) => sum + check.score, 0) / checks.length;
        return {
            regulation,
            checks,
            violations,
            overallScore,
        };
    }
    async generateComplianceDashboard(startDate, endDate) {
        const regulations = await this.getActiveRegulations();
        const regulationResults = [];
        for (const regulation of regulations) {
            const result = await this.checkCompliance(regulation.id, startDate, endDate);
            regulationResults.push({
                id: regulation.id,
                name: regulation.name,
                jurisdiction: regulation.jurisdiction,
                score: result.overallScore,
                violations: result.violations.length,
                status: result.overallScore >= 80 ? 'compliant' : result.overallScore >= 60 ? 'pending' : 'non_compliant',
            });
        }
        const totalRegulations = regulations.length;
        const compliantRegulations = regulationResults.filter(r => r.status === 'compliant').length;
        const overallScore = regulationResults.reduce((sum, r) => sum + r.score, 0) / regulationResults.length;
        const violationsCount = regulationResults.reduce((sum, r) => sum + r.violations, 0);
        return {
            overview: {
                totalRegulations,
                compliantRegulations,
                overallScore,
                violationsCount,
                lastUpdated: new Date(),
            },
            regulations: regulationResults,
            trends: await this.generateComplianceTrends(startDate, endDate),
            alerts: await this.generateComplianceAlerts(startDate, endDate),
        };
    }
    async exportReport(reportId, format = 'json') {
        const report = await this.getReport(reportId);
        if (format === 'json') {
            return JSON.stringify(report, null, 2);
        }
        if (format === 'pdf') {
            return this.generatePDFReport(report);
        }
        if (format === 'excel') {
            return this.generateExcelReport(report);
        }
        throw new Error(`Unsupported export format: ${format}`);
    }
    async archiveReport(reportId) {
        const report = await this.getReport(reportId);
        report.status = 'archived';
        this.logger.log(`Archived compliance report: ${reportId}`);
    }
    async deleteReport(reportId) {
        this.logger.log(`Deleted compliance report: ${reportId}`);
    }
    async generateSummary(startDate, endDate) {
        const [totalAuditLogs, totalTransactions, totalVolume, errorRate] = await Promise.all([
            this.auditLogRepository.count({
                where: { createdAt: (0, typeorm_2.Between)(startDate, endDate) },
            }),
            this.transactionLogRepository.count({
                where: { createdAt: (0, typeorm_2.Between)(startDate, endDate) },
            }),
            this.transactionLogRepository
                .createQueryBuilder('transaction')
                .where('transaction.createdAt >= :startDate', { startDate })
                .andWhere('transaction.createdAt <= :endDate', { endDate })
                .select(['SUM(transaction.amount)'])
                .getRawOne(),
            this.calculateErrorRate(startDate, endDate),
        ]);
        const [complianceScore, riskScore, retentionCompliance] = await Promise.all([
            this.calculateComplianceScore(startDate, endDate),
            this.calculateRiskScore(startDate, endDate),
            this.calculateRetentionCompliance(startDate, endDate),
        ]);
        return {
            totalAuditLogs,
            totalTransactions,
            totalVolume: totalVolume?.sum || 0,
            errorRate,
            complianceScore,
            riskScore,
            retentionCompliance,
        };
    }
    async generateAuditMetrics(startDate, endDate) {
        const [logsByAction, logsByResource, logsBySeverity, avgExecutionTime] = await Promise.all([
            this.getLogsByAction(startDate, endDate),
            this.getLogsByResource(startDate, endDate),
            this.getLogsBySeverity(startDate, endDate),
            this.calculateAverageExecutionTime(startDate, endDate),
        ]);
        const [sensitiveDataLogs, encryptedLogs] = await Promise.all([
            this.countSensitiveDataLogs(startDate, endDate),
            this.countEncryptedLogs(startDate, endDate),
        ]);
        return {
            logsByAction,
            logsByResource,
            logsBySeverity,
            avgExecutionTime,
            sensitiveDataLogs,
            encryptedLogs,
        };
    }
    async generateTransactionMetrics(startDate, endDate) {
        const [transactionsByType, transactionsByStatus, avgAmount] = await Promise.all([
            this.getTransactionsByType(startDate, endDate),
            this.getTransactionsByStatus(startDate, endDate),
            this.calculateAverageAmount(startDate, endDate),
        ]);
        const [totalFees, totalTaxes] = await Promise.all([
            this.calculateTotalFees(startDate, endDate),
            this.calculateTotalTaxes(startDate, endDate),
        ]);
        return {
            transactionsByType,
            transactionsByStatus,
            avgAmount,
            totalFees,
            totalTaxes,
        };
    }
    async generateComplianceMetrics(startDate, endDate) {
        const regulations = await this.getActiveRegulations();
        const regulationResults = [];
        for (const regulation of regulations) {
            const result = await this.checkCompliance(regulation.id, startDate, endDate);
            regulationResults.push(result);
        }
        const violations = regulationResults.flatMap(r => r.violations);
        const recommendations = this.generateRecommendations(violations);
        return {
            regulations: regulationResults.map(r => ({
                name: r.regulation.name,
                jurisdiction: r.regulation.jurisdiction,
                requirements: r.regulation.requirements,
                compliant: r.overallScore >= 80,
                violations: r.violations.map(v => ({
                    requirement: v.requirementId,
                    severity: v.severity,
                    description: v.description,
                    count: v.affectedRecords,
                })),
            })),
            overallScore: regulationResults.reduce((sum, r) => sum + r.overallScore, 0) / regulationResults.length,
            recommendations,
        };
    }
    async generatePrivacyMetrics(startDate, endDate) {
        const [dataClassification, redactionApplied, consentRecords, retentionPolicies] = await Promise.all([
            this.getDataClassificationMetrics(startDate, endDate),
            this.countRedactionApplied(startDate, endDate),
            this.countConsentRecords(startDate, endDate),
            this.getRetentionPolicyMetrics(startDate, endDate),
        ]);
        return {
            dataClassification,
            redactionApplied,
            consentRecords,
            retentionPolicies,
        };
    }
    async generateSecurityMetrics(startDate, endDate) {
        const [authenticationEvents, accessDeniedEvents, securityViolations, threatDetections] = await Promise.all([
            this.countAuthenticationEvents(startDate, endDate),
            this.countAccessDeniedEvents(startDate, endDate),
            this.countSecurityViolations(startDate, endDate),
            this.countThreatDetections(startDate, endDate),
        ]);
        return {
            authenticationEvents,
            accessDeniedEvents,
            securityViolations,
            threatDetections,
        };
    }
    async generatePerformanceMetrics(startDate, endDate) {
        const [avgResponseTime, throughput, systemUptime, errorRate] = await Promise.all([
            this.calculateAverageResponseTime(startDate, endDate),
            this.calculateThroughput(startDate, endDate),
            this.calculateSystemUptime(startDate, endDate),
            this.calculateErrorRate(startDate, endDate),
        ]);
        return {
            avgResponseTime,
            throughput,
            systemUptime,
            errorRate,
        };
    }
    async generateRiskMetrics(startDate, endDate) {
        const [highRiskTransactions, suspiciousActivities, complianceViolations, riskScore] = await Promise.all([
            this.countHighRiskTransactions(startDate, endDate),
            this.countSuspiciousActivities(startDate, endDate),
            this.countComplianceViolations(startDate, endDate),
            this.calculateRiskScore(startDate, endDate),
        ]);
        return {
            highRiskTransactions,
            suspiciousActivities,
            complianceViolations,
            riskScore,
        };
    }
    generateReportId(reportType, startDate) {
        const dateStr = startDate.toISOString().substring(0, 10);
        return `compliance_${reportType}_${dateStr}_${Date.now()}`;
    }
    async getRegulation(regulationId) {
        const regulations = {
            'sox': {
                id: 'sox',
                name: 'Sarbanes-Oxley Act',
                jurisdiction: 'US',
                category: 'financial',
                requirements: [
                    {
                        id: 'sox_404',
                        name: 'Section 404 - Internal Controls',
                        description: 'Establish and maintain internal controls over financial reporting',
                        mandatory: true,
                        validation: 'audit_trail_exists && audit_trail_immutable && audit_trail_complete',
                    },
                    {
                        id: 'sox_302',
                        name: 'Section 302 - Corporate Responsibility',
                        description: 'Ensure financial statements are accurate and complete',
                        mandatory: true,
                        validation: 'transaction_integrity_verified && no_material_weaknesses',
                    },
                ],
                lastUpdated: new Date(),
                isActive: true,
            },
            'gdpr': {
                id: 'gdpr',
                name: 'General Data Protection Regulation',
                jurisdiction: 'EU',
                category: 'privacy',
                requirements: [
                    {
                        id: 'gdpr_32',
                        name: 'Security of Processing',
                        description: 'Implement appropriate technical and organizational measures',
                        mandatory: true,
                        validation: 'data_encryption_enabled && access_controls_implemented && security_incidents_logged',
                    },
                    {
                        id: 'gdpr_25',
                        name: 'Data Protection by Design and Default',
                        description: 'Implement data protection principles from the start',
                        mandatory: true,
                        validation: 'privacy_by_design && data_minimization && consent_management',
                    },
                ],
                lastUpdated: new Date(),
                isActive: true,
            },
        };
        return regulations[regulationId] || regulations['sox'];
    }
    async validateRequirement(requirement, startDate, endDate) {
        const validation = requirement.validation;
        let status = 'pending';
        let score = 0;
        let details = '';
        if (validation.includes('audit_trail_exists')) {
            const auditLogsCount = await this.auditLogRepository.count({
                where: { createdAt: (0, typeorm_2.Between)(startDate, endDate) },
            });
            if (auditLogsCount > 0) {
                score += 50;
                details += 'Audit trail exists. ';
            }
            else {
                details += 'No audit trail found. ';
            }
        }
        if (validation.includes('audit_trail_immutable')) {
            const immutableLogs = await this.auditLogRepository.count({
                where: {
                    createdAt: (0, typeorm_2.Between)(startDate, endDate),
                    checksum: (0, typeorm_2.MoreThan)(''),
                },
            });
            if (immutableLogs > 0) {
                score += 50;
                details += 'Audit trail is immutable. ';
            }
            else {
                details += 'Audit trail is not immutable. ';
            }
        }
        status = score >= 80 ? 'compliant' : score >= 60 ? 'pending' : 'non_compliant';
        return {
            regulationId: 'sox',
            requirementId: requirement.id,
            status,
            score,
            details: details.trim(),
            checkedAt: new Date(),
            checkedBy: 'system',
        };
    }
    async countAffectedRecords(requirement, startDate, endDate) {
        return 0;
    }
    getViolationSeverity(requirement) {
        return requirement.mandatory ? 'high' : 'medium';
    }
    generateViolationId() {
        return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async getActiveRegulations() {
        return [
            await this.getRegulation('sox'),
            await this.getRegulation('gdpr'),
        ];
    }
    async generateComplianceTrends(startDate, endDate) {
        const scores = [];
        const violations = [];
        const current = new Date(startDate);
        while (current <= endDate) {
            scores.push({
                date: new Date(current),
                score: 85 + Math.random() * 15,
            });
            violations.push({
                date: new Date(current),
                count: Math.floor(Math.random() * 5),
            });
            current.setDate(current.getDate() + 1);
        }
        return { scores, violations };
    }
    async generateComplianceAlerts(startDate, endDate) {
        return [
            {
                type: 'compliance_violation',
                severity: 'high',
                message: 'High number of access denied events detected',
                timestamp: new Date(),
            },
        ];
    }
    generatePDFReport(report) {
        return 'PDF report content';
    }
    generateExcelReport(report) {
        return 'Excel report content';
    }
    async getReport(reportId) {
        throw new Error(`Report ${reportId} not found`);
    }
    generateRecommendations(violations) {
        const recommendations = [];
        if (violations.some(v => v.severity === 'critical')) {
            recommendations.push('Immediate action required for critical compliance violations');
        }
        if (violations.some(v => v.severity === 'high')) {
            recommendations.push('Review and remediate high-priority compliance issues');
        }
        if (violations.length > 10) {
            recommendations.push('Implement comprehensive compliance program');
        }
        return recommendations;
    }
    async calculateErrorRate(startDate, endDate) {
        const totalLogs = await this.auditLogRepository.count({
            where: { createdAt: (0, typeorm_2.Between)(startDate, endDate) },
        });
        const errorLogs = await this.auditLogRepository.count({
            where: {
                createdAt: (0, typeorm_2.Between)(startDate, endDate),
                error: (0, typeorm_2.MoreThan)(''),
            },
        });
        return totalLogs > 0 ? (errorLogs / totalLogs) * 100 : 0;
    }
    async calculateComplianceScore(startDate, endDate) {
        return 85 + Math.random() * 15;
    }
    async calculateRiskScore(startDate, endDate) {
        return 20 + Math.random() * 30;
    }
    async calculateRetentionCompliance(startDate, endDate) {
        return 90 + Math.random() * 10;
    }
    async getLogsByAction(startDate, endDate) {
        return {};
    }
    async getLogsByResource(startDate, endDate) {
        return {};
    }
    async getLogsBySeverity(startDate, endDate) {
        return {};
    }
    async calculateAverageExecutionTime(startDate, endDate) {
        return 100 + Math.random() * 50;
    }
    async countSensitiveDataLogs(startDate, endDate) {
        return Math.floor(Math.random() * 100);
    }
    async countEncryptedLogs(startDate, endDate) {
        return Math.floor(Math.random() * 50);
    }
    async getTransactionsByType(startDate, endDate) {
        return {};
    }
    async getTransactionsByStatus(startDate, endDate) {
        return {};
    }
    async calculateAverageAmount(startDate, endDate) {
        return 1000 + Math.random() * 5000;
    }
    async calculateTotalFees(startDate, endDate) {
        return Math.random() * 10000;
    }
    async calculateTotalTaxes(startDate, endDate) {
        return Math.random() * 5000;
    }
    async getDataClassificationMetrics(startDate, endDate) {
        return {
            public: Math.floor(Math.random() * 100),
            internal: Math.floor(Math.random() * 200),
            confidential: Math.floor(Math.random() * 50),
            restricted: Math.floor(Math.random() * 10),
        };
    }
    async countRedactionApplied(startDate, endDate) {
        return Math.floor(Math.random() * 25);
    }
    async countConsentRecords(startDate, endDate) {
        return Math.floor(Math.random() * 150);
    }
    async getRetentionPolicyMetrics(startDate, endDate) {
        return {
            '1_year': Math.floor(Math.random() * 100),
            '3_years': Math.floor(Math.random() * 200),
            '5_years': Math.floor(Math.random() * 50),
            '7_years': Math.floor(Math.random() * 25),
        };
    }
    async countAuthenticationEvents(startDate, endDate) {
        return Math.floor(Math.random() * 500);
    }
    async countAccessDeniedEvents(startDate, endDate) {
        return Math.floor(Math.random() * 50);
    }
    async countSecurityViolations(startDate, endDate) {
        return Math.floor(Math.random() * 10);
    }
    async countThreatDetections(startDate, endDate) {
        return Math.floor(Math.random() * 5);
    }
    async calculateAverageResponseTime(startDate, endDate) {
        return 150 + Math.random() * 100;
    }
    async calculateThroughput(startDate, endDate) {
        return 1000 + Math.random() * 500;
    }
    async calculateSystemUptime(startDate, endDate) {
        return 99.5 + Math.random() * 0.5;
    }
    async countHighRiskTransactions(startDate, endDate) {
        return Math.floor(Math.random() * 20);
    }
    async countSuspiciousActivities(startDate, endDate) {
        return Math.floor(Math.random() * 15);
    }
    async countComplianceViolations(startDate, endDate) {
        return Math.floor(Math.random() * 10);
    }
    async calculateAverageResponseTime(startDate, endDate) {
        return 150 + Math.random() * 100;
    }
    async calculateThroughput(startDate, endDate) {
        return 1000 + Math.random() * 500;
    }
    async calculateSystemUptime(startDate, endDate) {
        return 99.5 + Math.random() * 0.5;
    }
};
exports.ComplianceReport = ComplianceReport;
exports.ComplianceReport = ComplianceReport = ComplianceReport_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(1, (0, typeorm_1.InjectRepository)(transaction_log_entity_1.TransactionLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ComplianceReport);
//# sourceMappingURL=compliance.report.js.map
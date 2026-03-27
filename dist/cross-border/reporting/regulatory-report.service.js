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
var RegulatoryReportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegulatoryReportService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cross_border_transaction_entity_1 = require("../entities/cross-border-transaction.entity");
const regulation_service_1 = require("../compliance/regulation-service");
let RegulatoryReportService = RegulatoryReportService_1 = class RegulatoryReportService {
    constructor(transactionRepository, regulationService, configService) {
        this.transactionRepository = transactionRepository;
        this.regulationService = regulationService;
        this.configService = configService;
        this.logger = new common_1.Logger(RegulatoryReportService_1.name);
        this.reportTemplates = new Map();
        this.submissions = new Map();
        this.initializeReportTemplates();
    }
    initializeReportTemplates() {
        const templates = [
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
        this.logger.log(`Initialized ${templates.length} regulatory report templates`);
    }
    async generateReport(reportType, startDate, endDate, jurisdiction) {
        this.logger.log(`Generating ${reportType} report for period ${startDate.toISOString()} to ${endDate.toISOString()}`);
        const template = this.reportTemplates.get(reportType);
        if (!template) {
            throw new Error(`Report template not found: ${reportType}`);
        }
        const transactions = await this.getTransactionsForPeriod(startDate, endDate, jurisdiction);
        const transactionReports = await this.buildTransactionReports(transactions);
        const complianceMetrics = await this.calculateComplianceMetrics(transactions);
        const summary = this.calculateSummary(transactionReports, complianceMetrics);
        const report = {
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
        this.logger.log(`Generated report ${report.id} with ${transactionReports.length} transactions`);
        return report;
    }
    async getTransactionsForPeriod(startDate, endDate, jurisdiction) {
        const whereCondition = {
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
    getCountriesByJurisdiction(jurisdiction) {
        const jurisdictionCountries = {
            EU: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'GR'],
            US: ['US'],
            CN: ['CN'],
            International: ['*'],
        };
        return jurisdictionCountries[jurisdiction] || [];
    }
    async buildTransactionReports(transactions) {
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
    extractEnergyType(transaction) {
        if (transaction.regulatoryData && transaction.regulatoryData.energyType) {
            return transaction.regulatoryData.energyType;
        }
        return 'electricity';
    }
    extractVolume(transaction) {
        if (transaction.regulatoryData &&
            transaction.regulatoryData.energyQuantity) {
            return transaction.regulatoryData.energyQuantity;
        }
        return transaction.amount;
    }
    extractViolations(transaction) {
        const violations = [];
        if (transaction.complianceChecks) {
            for (const [regulation, check] of Object.entries(transaction.complianceChecks)) {
                if (check.status === 'fail') {
                    violations.push(`${regulation}: ${check.details}`);
                }
            }
        }
        return violations;
    }
    extractPenalties(transaction) {
        if (transaction.regulatoryFees) {
            return transaction.regulatoryFees;
        }
        return 0;
    }
    extractApplicableRegulations(transaction) {
        const regulations = [];
        if (transaction.regulatoryData &&
            transaction.regulatoryData.applicableRegulations) {
            regulations.push(...transaction.regulatoryData.applicableRegulations);
        }
        return regulations;
    }
    async calculateComplianceMetrics(transactions) {
        const regulations = this.regulationService.getAllRegulations();
        const metrics = [];
        for (const regulation of regulations) {
            const applicableTransactions = transactions.filter((t) => this.isRegulationApplicable(t, regulation));
            const totalChecks = applicableTransactions.length;
            const passedChecks = applicableTransactions.filter((t) => t.complianceStatus === cross_border_transaction_entity_1.ComplianceStatus.COMPLIANT).length;
            const failedChecks = applicableTransactions.filter((t) => t.complianceStatus === cross_border_transaction_entity_1.ComplianceStatus.NON_COMPLIANT).length;
            const warningChecks = applicableTransactions.filter((t) => t.complianceStatus === cross_border_transaction_entity_1.ComplianceStatus.PENDING_REVIEW).length;
            const complianceRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 0;
            metrics.push({
                regulationCode: regulation.code,
                regulationName: regulation.name,
                totalChecks,
                passedChecks,
                failedChecks,
                warningChecks,
                complianceRate,
                averageResolutionTime: this.calculateAverageResolutionTime(applicableTransactions),
                openViolations: failedChecks,
                closedViolations: passedChecks,
            });
        }
        return metrics;
    }
    isRegulationApplicable(transaction, regulation) {
        return (regulation.applicableCountries.includes('*') ||
            regulation.applicableCountries.includes(transaction.sourceCountry) ||
            regulation.applicableCountries.includes(transaction.targetCountry));
    }
    calculateAverageResolutionTime(transactions) {
        const completedTransactions = transactions.filter((t) => t.processedAt && t.createdAt);
        if (completedTransactions.length === 0) {
            return 0;
        }
        const totalTime = completedTransactions.reduce((sum, t) => {
            return sum + (t.processedAt.getTime() - t.createdAt.getTime());
        }, 0);
        return totalTime / completedTransactions.length;
    }
    calculateSummary(transactions, complianceMetrics) {
        const totalTransactions = transactions.length;
        const totalVolume = transactions.reduce((sum, t) => sum + t.volume, 0);
        const totalValue = transactions.reduce((sum, t) => sum + t.value, 0);
        const compliantTransactions = transactions.filter((t) => t.complianceStatus === cross_border_transaction_entity_1.ComplianceStatus.COMPLIANT).length;
        const complianceRate = totalTransactions > 0
            ? (compliantTransactions / totalTransactions) * 100
            : 0;
        const violations = transactions.reduce((sum, t) => sum + t.violations.length, 0);
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
    generateReportId() {
        return `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    async submitReport(reportId) {
        const report = await this.getReportById(reportId);
        if (!report) {
            throw new Error(`Report not found: ${reportId}`);
        }
        const template = this.reportTemplates.get(report.reportType);
        if (!template || !template.submissionEndpoint) {
            throw new Error(`No submission endpoint configured for report type: ${report.reportType}`);
        }
        const submissionId = this.generateSubmissionId();
        const submission = {
            reportId,
            submissionId,
            endpoint: template.submissionEndpoint,
            status: 'pending',
            submittedAt: new Date(),
        };
        try {
            const formattedReport = this.formatReport(report, template.format);
            const response = await this.sendToRegulatoryBody(template, formattedReport);
            submission.status = 'submitted';
            submission.response = response;
            report.status = 'submitted';
            report.submissionDate = new Date();
            this.logger.log(`Report ${reportId} submitted successfully with submission ID ${submissionId}`);
        }
        catch (error) {
            submission.status = 'failed';
            submission.error = error.message;
            this.logger.error(`Failed to submit report ${reportId}:`, error);
            throw error;
        }
        this.submissions.set(submissionId, submission);
        return submission;
    }
    formatReport(report, format) {
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
    convertToXML(report) {
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
    convertToCSV(report) {
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
    convertToPDF(report) {
        return Buffer.from(`PDF Report: ${report.id}`);
    }
    async sendToRegulatoryBody(template, data) {
        return {
            status: 'success',
            messageId: `MSG-${Date.now()}`,
            timestamp: new Date().toISOString(),
        };
    }
    generateSubmissionId() {
        return `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }
    async getReportById(reportId) {
        return null;
    }
    async getReportsByStatus(status) {
        return [];
    }
    async getSubmissionStatus(submissionId) {
        return this.submissions.get(submissionId) || null;
    }
    getReportTemplates() {
        return Array.from(this.reportTemplates.values());
    }
    getReportTemplateById(templateId) {
        return this.reportTemplates.get(templateId);
    }
    async scheduleAutomaticReports() {
        const templates = Array.from(this.reportTemplates.values());
        for (const template of templates) {
            this.scheduleReport(template);
        }
    }
    scheduleReport(template) {
        const now = new Date();
        let nextRun;
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
            this.scheduleReport(template);
        }, nextRun.getTime() - now.getTime());
        this.logger.log(`Scheduled ${template.name} report for ${nextRun.toISOString()}`);
    }
    async generateAndSubmitReport(template) {
        try {
            const endDate = new Date();
            const startDate = this.calculateStartDate(template.frequency, endDate);
            const report = await this.generateReport(template.id, startDate, endDate, template.jurisdiction);
            await this.submitReport(report.id);
            this.logger.log(`Automatic report ${template.name} generated and submitted successfully`);
        }
        catch (error) {
            this.logger.error(`Failed to generate automatic report ${template.name}:`, error);
        }
    }
    calculateStartDate(frequency, endDate) {
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
};
exports.RegulatoryReportService = RegulatoryReportService;
exports.RegulatoryReportService = RegulatoryReportService = RegulatoryReportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cross_border_transaction_entity_1.CrossBorderTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        regulation_service_1.RegulationService,
        config_1.ConfigService])
], RegulatoryReportService);
//# sourceMappingURL=regulatory-report.service.js.map
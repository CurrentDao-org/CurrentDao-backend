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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrossBorderController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const transaction_processor_service_1 = require("../transactions/transaction-processor.service");
const regulation_service_1 = require("../compliance/regulation-service");
const currency_service_1 = require("../currency/currency-service");
const customs_service_1 = require("../tariffs/customs-service");
const regulatory_report_service_1 = require("../reporting/regulatory-report.service");
const international_trade_dto_1 = require("../dto/international-trade.dto");
let CrossBorderController = class CrossBorderController {
    constructor(transactionProcessor, regulationService, currencyService, customsService, reportService) {
        this.transactionProcessor = transactionProcessor;
        this.regulationService = regulationService;
        this.currencyService = currencyService;
        this.customsService = customsService;
        this.reportService = reportService;
    }
    async createTransaction(transactionData) {
        return this.transactionProcessor.processTransaction(transactionData);
    }
    async processBatchTransactions(transactions) {
        return this.transactionProcessor.processBatchTransactions(transactions);
    }
    async getTransaction(transactionId) {
        return this.transactionProcessor.getTransactionById(transactionId);
    }
    async getTransactions(filters) {
        if (filters.sourceCountry && filters.targetCountry) {
            return this.transactionProcessor.getTransactionsByCountries(filters.sourceCountry, filters.targetCountry);
        }
        return this.transactionProcessor.getTransactionsByStatus(filters.status);
    }
    async updateTransaction(transactionId, updateData) {
        return { message: 'Transaction updated successfully', transactionId };
    }
    async retryTransaction(transactionId) {
        return this.transactionProcessor.retryFailedTransaction(transactionId);
    }
    async cancelTransaction(transactionId, reason) {
        return this.transactionProcessor.cancelTransaction(transactionId, reason);
    }
    async checkCompliance(sourceCountry, targetCountry, energyType, amount, transactionType) {
        return this.regulationService.checkCompliance(sourceCountry, targetCountry, energyType, amount, transactionType);
    }
    async getRegulations() {
        return this.regulationService.getAllRegulations();
    }
    async getRegulationsByCountry(country) {
        return this.regulationService.getRegulationsByCountry(country);
    }
    async convertCurrency(amount, fromCurrency, toCurrency) {
        return this.currencyService.convertCurrency(amount, fromCurrency, toCurrency);
    }
    async getSupportedCurrencies() {
        return this.currencyService.getSupportedCurrencies();
    }
    async getExchangeRateHistory(fromCurrency, toCurrency) {
        return this.currencyService.getExchangeRateHistory(fromCurrency, toCurrency);
    }
    async calculateCustoms(sourceCountry, targetCountry, amount, currency, energyType, customsData) {
        return this.customsService.calculateCustomsAndTariffs(sourceCountry, targetCountry, amount, currency, energyType, customsData);
    }
    async getTariffRates(energyType) {
        return this.customsService.getTariffRatesByEnergyType(energyType);
    }
    async getCustomsRules(sourceCountry, targetCountry) {
        return this.customsService.getCustomsRulesByCountryPair(sourceCountry, targetCountry);
    }
    async generateReport(reportType, startDate, endDate, jurisdiction) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        return this.reportService.generateReport(reportType, start, end, jurisdiction);
    }
    async submitReport(reportId) {
        return this.reportService.submitReport(reportId);
    }
    async getReports(status) {
        if (status) {
            return this.reportService.getReportsByStatus(status);
        }
        return this.reportService.getReportTemplates();
    }
    async getSubmissionStatus(submissionId) {
        return this.reportService.getSubmissionStatus(submissionId);
    }
    async getMetrics() {
        return this.transactionProcessor.getTransactionMetrics();
    }
    async healthCheck() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                transactionProcessor: 'active',
                regulationService: 'active',
                currencyService: 'active',
                customsService: 'active',
                reportService: 'active',
            },
        };
    }
};
exports.CrossBorderController = CrossBorderController;
__decorate([
    (0, common_1.Post)('transactions'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new cross-border energy transaction' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Transaction created successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid transaction data' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Internal server error' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [international_trade_dto_1.CreateInternationalTradeDto]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/batch'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Process multiple transactions in batch' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Batch processed successfully' }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "processBatchTransactions", null);
__decorate([
    (0, common_1.Get)('transactions/:transactionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction by ID' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Transaction not found' }),
    __param(0, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getTransaction", null);
__decorate([
    (0, common_1.Get)('transactions'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transactions with filters' }),
    (0, swagger_1.ApiQuery)({ name: 'sourceCountry', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'targetCountry', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'energyType', required: false }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transactions retrieved successfully',
    }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [international_trade_dto_1.FilterInternationalTradeDto]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Put)('transactions/:transactionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Update transaction' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction updated successfully' }),
    __param(0, (0, common_1.Param)('transactionId')),
    __param(1, (0, common_1.Body)(common_1.ValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, international_trade_dto_1.UpdateInternationalTradeDto]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "updateTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/:transactionId/retry'),
    (0, swagger_1.ApiOperation)({ summary: 'Retry failed transaction' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Transaction retry initiated' }),
    __param(0, (0, common_1.Param)('transactionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "retryTransaction", null);
__decorate([
    (0, common_1.Post)('transactions/:transactionId/cancel'),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel transaction' }),
    (0, swagger_1.ApiParam)({ name: 'transactionId', description: 'Transaction ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Transaction cancelled successfully',
    }),
    __param(0, (0, common_1.Param)('transactionId')),
    __param(1, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "cancelTransaction", null);
__decorate([
    (0, common_1.Get)('compliance/check'),
    (0, swagger_1.ApiOperation)({ summary: 'Check compliance for a potential transaction' }),
    (0, swagger_1.ApiQuery)({ name: 'sourceCountry', description: 'Source country code' }),
    (0, swagger_1.ApiQuery)({ name: 'targetCountry', description: 'Target country code' }),
    (0, swagger_1.ApiQuery)({ name: 'energyType', description: 'Type of energy' }),
    (0, swagger_1.ApiQuery)({ name: 'amount', description: 'Transaction amount' }),
    (0, swagger_1.ApiQuery)({ name: 'transactionType', description: 'Type of transaction' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Compliance check completed' }),
    __param(0, (0, common_1.Query)('sourceCountry')),
    __param(1, (0, common_1.Query)('targetCountry')),
    __param(2, (0, common_1.Query)('energyType')),
    __param(3, (0, common_1.Query)('amount')),
    __param(4, (0, common_1.Query)('transactionType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Number, String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "checkCompliance", null);
__decorate([
    (0, common_1.Get)('compliance/regulations'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all available regulations' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Regulations retrieved successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getRegulations", null);
__decorate([
    (0, common_1.Get)('compliance/regulations/:country'),
    (0, swagger_1.ApiOperation)({ summary: 'Get regulations by country' }),
    (0, swagger_1.ApiParam)({ name: 'country', description: 'Country code' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Country regulations retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('country')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getRegulationsByCountry", null);
__decorate([
    (0, common_1.Post)('currency/convert'),
    (0, swagger_1.ApiOperation)({ summary: 'Convert currency' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Currency converted successfully' }),
    __param(0, (0, common_1.Body)('amount')),
    __param(1, (0, common_1.Body)('fromCurrency')),
    __param(2, (0, common_1.Body)('toCurrency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, String, String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "convertCurrency", null);
__decorate([
    (0, common_1.Get)('currency/supported'),
    (0, swagger_1.ApiOperation)({ summary: 'Get supported currencies' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Supported currencies retrieved successfully',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getSupportedCurrencies", null);
__decorate([
    (0, common_1.Get)('currency/rates/:fromCurrency/:toCurrency'),
    (0, swagger_1.ApiOperation)({ summary: 'Get exchange rate history' }),
    (0, swagger_1.ApiParam)({ name: 'fromCurrency', description: 'Source currency' }),
    (0, swagger_1.ApiParam)({ name: 'toCurrency', description: 'Target currency' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Exchange rate history retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('fromCurrency')),
    __param(1, (0, common_1.Param)('toCurrency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getExchangeRateHistory", null);
__decorate([
    (0, common_1.Post)('customs/calculate'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate customs and tariffs' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Customs calculation completed' }),
    __param(0, (0, common_1.Body)('sourceCountry')),
    __param(1, (0, common_1.Body)('targetCountry')),
    __param(2, (0, common_1.Body)('amount')),
    __param(3, (0, common_1.Body)('currency')),
    __param(4, (0, common_1.Body)('energyType')),
    __param(5, (0, common_1.Body)('customsData')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, String, String, Object]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "calculateCustoms", null);
__decorate([
    (0, common_1.Get)('customs/tariffs/:energyType'),
    (0, swagger_1.ApiOperation)({ summary: 'Get tariff rates by energy type' }),
    (0, swagger_1.ApiParam)({ name: 'energyType', description: 'Energy type' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Tariff rates retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('energyType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getTariffRates", null);
__decorate([
    (0, common_1.Get)('customs/rules/:sourceCountry/:targetCountry'),
    (0, swagger_1.ApiOperation)({ summary: 'Get customs rules for country pair' }),
    (0, swagger_1.ApiParam)({ name: 'sourceCountry', description: 'Source country' }),
    (0, swagger_1.ApiParam)({ name: 'targetCountry', description: 'Target country' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Customs rules retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('sourceCountry')),
    __param(1, (0, common_1.Param)('targetCountry')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getCustomsRules", null);
__decorate([
    (0, common_1.Post)('reports/generate'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate regulatory report' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Report generated successfully' }),
    __param(0, (0, common_1.Body)('reportType')),
    __param(1, (0, common_1.Body)('startDate')),
    __param(2, (0, common_1.Body)('endDate')),
    __param(3, (0, common_1.Body)('jurisdiction')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "generateReport", null);
__decorate([
    (0, common_1.Post)('reports/:reportId/submit'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit regulatory report' }),
    (0, swagger_1.ApiParam)({ name: 'reportId', description: 'Report ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Report submitted successfully' }),
    __param(0, (0, common_1.Param)('reportId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "submitReport", null);
__decorate([
    (0, common_1.Get)('reports'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reports by status' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Reports retrieved successfully' }),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('reports/submissions/:submissionId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get submission status' }),
    (0, swagger_1.ApiParam)({ name: 'submissionId', description: 'Submission ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Submission status retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('submissionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getSubmissionStatus", null);
__decorate([
    (0, common_1.Get)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get transaction metrics' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Metrics retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "getMetrics", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({ summary: 'Health check endpoint' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is healthy' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CrossBorderController.prototype, "healthCheck", null);
exports.CrossBorderController = CrossBorderController = __decorate([
    (0, swagger_1.ApiTags)('Cross-Border Energy Trading'),
    (0, common_1.Controller)('cross-border'),
    __metadata("design:paramtypes", [transaction_processor_service_1.TransactionProcessorService,
        regulation_service_1.RegulationService,
        currency_service_1.CurrencyService,
        customs_service_1.CustomsService,
        regulatory_report_service_1.RegulatoryReportService])
], CrossBorderController);
//# sourceMappingURL=cross-border.controller.js.map
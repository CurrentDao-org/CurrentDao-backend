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
var TransactionProcessorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionProcessorService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cross_border_transaction_entity_1 = require("../entities/cross-border-transaction.entity");
const regulation_service_1 = require("../compliance/regulation-service");
const currency_service_1 = require("../currency/currency-service");
const customs_service_1 = require("../tariffs/customs-service");
let TransactionProcessorService = TransactionProcessorService_1 = class TransactionProcessorService {
    constructor(transactionRepository, regulationService, currencyService, customsService) {
        this.transactionRepository = transactionRepository;
        this.regulationService = regulationService;
        this.currencyService = currencyService;
        this.customsService = customsService;
        this.logger = new common_1.Logger(TransactionProcessorService_1.name);
        this.processingMetrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            averageProcessingTime: 0,
            complianceRate: 0,
            currencyConversions: 0,
            customsClearances: 0,
        };
    }
    async processTransaction(transactionData) {
        const startTime = Date.now();
        this.logger.log(`Processing cross-border transaction: ${transactionData.transactionId}`);
        try {
            const transaction = this.createTransactionEntity(transactionData);
            transaction.status = cross_border_transaction_entity_1.TransactionStatus.PROCESSING;
            const savedTransaction = await this.transactionRepository.save(transaction);
            const [complianceResult, conversionResult, customsResult] = await Promise.all([
                this.performComplianceCheck(transactionData),
                this.performCurrencyConversion(transactionData),
                this.performCustomsClearance(transactionData),
            ]);
            const errors = [];
            if (complianceResult.overallStatus === 'non_compliant') {
                errors.push('Transaction failed compliance check');
            }
            if (customsResult && !customsResult.approved) {
                errors.push('Customs clearance failed');
            }
            savedTransaction.complianceStatus = this.mapComplianceStatus(complianceResult.overallStatus);
            savedTransaction.regulatoryData = complianceResult;
            savedTransaction.convertedAmount = conversionResult?.convertedAmount;
            savedTransaction.targetCurrency = conversionResult?.targetCurrency;
            savedTransaction.exchangeRate = conversionResult?.exchangeRate;
            savedTransaction.customsData = customsResult;
            savedTransaction.customsTariff = customsResult?.tariff;
            savedTransaction.regulatoryFees = customsResult?.regulatoryFees;
            savedTransaction.totalAmount = this.calculateTotalAmount(transactionData, conversionResult, customsResult);
            if (errors.length > 0) {
                savedTransaction.status = cross_border_transaction_entity_1.TransactionStatus.FAILED;
                savedTransaction.failureReason = errors.join('; ');
                this.processingMetrics.failedTransactions++;
            }
            else {
                savedTransaction.status = cross_border_transaction_entity_1.TransactionStatus.COMPLETED;
                savedTransaction.processedAt = new Date();
                savedTransaction.completedAt = new Date();
                this.processingMetrics.successfulTransactions++;
            }
            const finalTransaction = await this.transactionRepository.save(savedTransaction);
            const processingTime = Date.now() - startTime;
            this.updateMetrics(processingTime, errors.length === 0);
            return {
                success: errors.length === 0,
                transaction: finalTransaction,
                complianceResult,
                conversionResult,
                customsResult,
                errors: errors.length > 0 ? errors : undefined,
                processingTime,
            };
        }
        catch (error) {
            this.logger.error(`Failed to process transaction ${transactionData.transactionId}:`, error);
            this.processingMetrics.failedTransactions++;
            return {
                success: false,
                transaction: null,
                errors: [error.message],
                processingTime: Date.now() - startTime,
            };
        }
    }
    createTransactionEntity(data) {
        const transaction = new cross_border_transaction_entity_1.CrossBorderTransaction();
        transaction.transactionId = data.transactionId;
        transaction.transactionType = data.transactionType;
        transaction.sourceCountry = data.sourceCountry;
        transaction.targetCountry = data.targetCountry;
        transaction.amount = data.amount;
        transaction.currency = data.currency;
        transaction.notes = data.notes;
        return transaction;
    }
    async performComplianceCheck(data) {
        return this.regulationService.checkCompliance(data.sourceCountry, data.targetCountry, data.energyType || 'electricity', data.amount, data.transactionType);
    }
    async performCurrencyConversion(data) {
        if (!data.currencyConversion ||
            data.currency === data.currencyConversion.targetCurrency) {
            return null;
        }
        return this.currencyService.convertCurrency(data.amount, data.currency, data.currencyConversion.targetCurrency);
    }
    async performCustomsClearance(data) {
        return this.customsService.calculateCustomsAndTariffs(data.sourceCountry, data.targetCountry, data.amount, data.currency, data.energyType || 'electricity', data.customsTariff);
    }
    calculateTotalAmount(transactionData, conversionResult, customsResult) {
        let total = conversionResult?.totalAmount || transactionData.amount;
        if (customsResult) {
            total += customsResult.tariff || 0;
            total += customsResult.regulatoryFees || 0;
        }
        return total;
    }
    mapComplianceStatus(complianceStatus) {
        switch (complianceStatus) {
            case 'compliant':
                return cross_border_transaction_entity_1.ComplianceStatus.COMPLIANT;
            case 'non_compliant':
                return cross_border_transaction_entity_1.ComplianceStatus.NON_COMPLIANT;
            case 'pending_review':
                return cross_border_transaction_entity_1.ComplianceStatus.PENDING_REVIEW;
            default:
                return cross_border_transaction_entity_1.ComplianceStatus.PENDING_REVIEW;
        }
    }
    updateMetrics(processingTime, success) {
        this.processingMetrics.totalTransactions++;
        const totalTime = this.processingMetrics.averageProcessingTime *
            (this.processingMetrics.totalTransactions - 1) +
            processingTime;
        this.processingMetrics.averageProcessingTime =
            totalTime / this.processingMetrics.totalTransactions;
        this.processingMetrics.complianceRate =
            (this.processingMetrics.successfulTransactions /
                this.processingMetrics.totalTransactions) *
                100;
    }
    async getTransactionById(transactionId) {
        return this.transactionRepository.findOne({ where: { transactionId } });
    }
    async getTransactionsByStatus(status) {
        return this.transactionRepository.find({ where: { status } });
    }
    async getTransactionsByCountries(sourceCountry, targetCountry) {
        return this.transactionRepository.find({
            where: { sourceCountry, targetCountry },
            order: { createdAt: 'DESC' },
        });
    }
    async getTransactionMetrics() {
        return { ...this.processingMetrics };
    }
    async retryFailedTransaction(transactionId) {
        const transaction = await this.getTransactionById(transactionId);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }
        if (transaction.status !== cross_border_transaction_entity_1.TransactionStatus.FAILED) {
            throw new Error(`Transaction ${transactionId} is not in failed status`);
        }
        const retryData = {
            transactionId: transaction.transactionId,
            transactionType: transaction.transactionType,
            sourceCountry: transaction.sourceCountry,
            targetCountry: transaction.targetCountry,
            amount: transaction.amount,
            currency: transaction.currency,
            notes: transaction.notes,
        };
        return this.processTransaction(retryData);
    }
    async cancelTransaction(transactionId, reason) {
        const transaction = await this.getTransactionById(transactionId);
        if (!transaction) {
            throw new Error(`Transaction ${transactionId} not found`);
        }
        if ([cross_border_transaction_entity_1.TransactionStatus.COMPLETED, cross_border_transaction_entity_1.TransactionStatus.CANCELLED].includes(transaction.status)) {
            throw new Error(`Cannot cancel transaction in ${transaction.status} status`);
        }
        transaction.status = cross_border_transaction_entity_1.TransactionStatus.CANCELLED;
        transaction.notes = reason
            ? `${transaction.notes || ''} - Cancelled: ${reason}`
            : transaction.notes;
        return this.transactionRepository.save(transaction);
    }
    async getTransactionsByDateRange(startDate, endDate) {
        return this.transactionRepository.find({
            where: {
                createdAt: (0, typeorm_2.Between)(startDate, endDate),
            },
            order: { createdAt: 'DESC' },
        });
    }
    async getHighValueTransactions(threshold) {
        return this.transactionRepository.find({
            where: {
                amount: (0, typeorm_2.MoreThanOrEqual)(threshold),
            },
            order: { amount: 'DESC' },
        });
    }
    async getPendingComplianceTransactions() {
        return this.transactionRepository.find({
            where: {
                complianceStatus: cross_border_transaction_entity_1.ComplianceStatus.PENDING_REVIEW,
            },
        });
    }
    async processBatchTransactions(transactions) {
        this.logger.log(`Processing batch of ${transactions.length} transactions`);
        const results = await Promise.allSettled(transactions.map((transaction) => this.processTransaction(transaction)));
        return results.map((result) => result.status === 'fulfilled'
            ? result.value
            : {
                success: false,
                transaction: null,
                errors: [result.reason.message],
                processingTime: 0,
            });
    }
};
exports.TransactionProcessorService = TransactionProcessorService;
exports.TransactionProcessorService = TransactionProcessorService = TransactionProcessorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cross_border_transaction_entity_1.CrossBorderTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        regulation_service_1.RegulationService,
        currency_service_1.CurrencyService,
        customs_service_1.CustomsService])
], TransactionProcessorService);
//# sourceMappingURL=transaction-processor.service.js.map
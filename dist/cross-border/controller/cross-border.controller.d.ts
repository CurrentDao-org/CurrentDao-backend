import { TransactionProcessorService, ProcessingResult } from '../transactions/transaction-processor.service';
import { RegulationService } from '../compliance/regulation-service';
import { CurrencyService } from '../currency/currency-service';
import { CustomsService } from '../tariffs/customs-service';
import { RegulatoryReportService } from '../reporting/regulatory-report.service';
import { CreateInternationalTradeDto, UpdateInternationalTradeDto, FilterInternationalTradeDto } from '../dto/international-trade.dto';
export declare class CrossBorderController {
    private readonly transactionProcessor;
    private readonly regulationService;
    private readonly currencyService;
    private readonly customsService;
    private readonly reportService;
    constructor(transactionProcessor: TransactionProcessorService, regulationService: RegulationService, currencyService: CurrencyService, customsService: CustomsService, reportService: RegulatoryReportService);
    createTransaction(transactionData: CreateInternationalTradeDto): Promise<ProcessingResult>;
    processBatchTransactions(transactions: CreateInternationalTradeDto[]): Promise<ProcessingResult[]>;
    getTransaction(transactionId: string): Promise<import("../entities/cross-border-transaction.entity").CrossBorderTransaction>;
    getTransactions(filters: FilterInternationalTradeDto): Promise<import("../entities/cross-border-transaction.entity").CrossBorderTransaction[]>;
    updateTransaction(transactionId: string, updateData: UpdateInternationalTradeDto): Promise<{
        message: string;
        transactionId: string;
    }>;
    retryTransaction(transactionId: string): Promise<ProcessingResult>;
    cancelTransaction(transactionId: string, reason?: string): Promise<import("../entities/cross-border-transaction.entity").CrossBorderTransaction>;
    checkCompliance(sourceCountry: string, targetCountry: string, energyType: string, amount: number, transactionType: string): Promise<import("../compliance/regulation-service").ComplianceResult>;
    getRegulations(): Promise<import("../compliance/regulation-service").RegulationRule[]>;
    getRegulationsByCountry(country: string): Promise<import("../compliance/regulation-service").RegulationRule[]>;
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<import("../currency/currency-service").ConversionResult>;
    getSupportedCurrencies(): Promise<import("../currency/currency-service").SupportedCurrency[]>;
    getExchangeRateHistory(fromCurrency: string, toCurrency: string): Promise<import("../currency/currency-service").CurrencyRate[]>;
    calculateCustoms(sourceCountry: string, targetCountry: string, amount: number, currency: string, energyType: string, customsData?: any): Promise<import("../tariffs/customs-service").CustomsCalculation>;
    getTariffRates(energyType: string): Promise<import("../tariffs/customs-service").TariffRate[]>;
    getCustomsRules(sourceCountry: string, targetCountry: string): Promise<import("../tariffs/customs-service").CustomsRule[]>;
    generateReport(reportType: string, startDate: string, endDate: string, jurisdiction?: string): Promise<import("../reporting/regulatory-report.service").RegulatoryReport>;
    submitReport(reportId: string): Promise<import("../reporting/regulatory-report.service").ReportSubmission>;
    getReports(status?: string): Promise<import("../reporting/regulatory-report.service").ReportTemplate[] | import("../reporting/regulatory-report.service").RegulatoryReport[]>;
    getSubmissionStatus(submissionId: string): Promise<import("../reporting/regulatory-report.service").ReportSubmission>;
    getMetrics(): Promise<import("../transactions/transaction-processor.service").TransactionMetrics>;
    healthCheck(): Promise<{
        status: string;
        timestamp: string;
        services: {
            transactionProcessor: string;
            regulationService: string;
            currencyService: string;
            customsService: string;
            reportService: string;
        };
    }>;
}

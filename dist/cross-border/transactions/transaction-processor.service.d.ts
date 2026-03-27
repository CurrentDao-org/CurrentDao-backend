import { Repository } from 'typeorm';
import { CrossBorderTransaction, TransactionStatus } from '../entities/cross-border-transaction.entity';
import { RegulationService, ComplianceResult } from '../compliance/regulation-service';
import { CurrencyService, ConversionResult } from '../currency/currency-service';
import { CustomsService } from '../tariffs/customs-service';
import { CreateInternationalTradeDto } from '../dto/international-trade.dto';
export interface ProcessingResult {
    success: boolean;
    transaction: CrossBorderTransaction;
    complianceResult?: ComplianceResult;
    conversionResult?: ConversionResult | null;
    customsResult?: any;
    errors?: string[];
    processingTime: number;
}
export interface TransactionMetrics {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageProcessingTime: number;
    complianceRate: number;
    currencyConversions: number;
    customsClearances: number;
}
export declare class TransactionProcessorService {
    private readonly transactionRepository;
    private readonly regulationService;
    private readonly currencyService;
    private readonly customsService;
    private readonly logger;
    private readonly processingMetrics;
    constructor(transactionRepository: Repository<CrossBorderTransaction>, regulationService: RegulationService, currencyService: CurrencyService, customsService: CustomsService);
    processTransaction(transactionData: CreateInternationalTradeDto): Promise<ProcessingResult>;
    private createTransactionEntity;
    private performComplianceCheck;
    private performCurrencyConversion;
    private performCustomsClearance;
    private calculateTotalAmount;
    private mapComplianceStatus;
    private updateMetrics;
    getTransactionById(transactionId: string): Promise<CrossBorderTransaction | null>;
    getTransactionsByStatus(status: TransactionStatus): Promise<CrossBorderTransaction[]>;
    getTransactionsByCountries(sourceCountry: string, targetCountry: string): Promise<CrossBorderTransaction[]>;
    getTransactionMetrics(): Promise<TransactionMetrics>;
    retryFailedTransaction(transactionId: string): Promise<ProcessingResult>;
    cancelTransaction(transactionId: string, reason?: string): Promise<CrossBorderTransaction>;
    getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<CrossBorderTransaction[]>;
    getHighValueTransactions(threshold: number): Promise<CrossBorderTransaction[]>;
    getPendingComplianceTransactions(): Promise<CrossBorderTransaction[]>;
    processBatchTransactions(transactions: CreateInternationalTradeDto[]): Promise<ProcessingResult[]>;
}

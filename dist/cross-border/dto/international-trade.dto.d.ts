import { TransactionType, ComplianceStatus } from '../entities/cross-border-transaction.entity';
export declare class CurrencyConversionDto {
    sourceCurrency: string;
    targetCurrency: string;
    amount: number;
    exchangeRate: number;
}
export declare class RegulatoryComplianceDto {
    regulationCode: string;
    complianceLevel: string;
    requiredDocuments: string[];
    complianceChecks: string[];
}
export declare class CustomsTariffDto {
    hsCode: string;
    productCategory: string;
    tariffRate: number;
    customsValue: number;
    applicableTaxes: string[];
}
export declare class CreateInternationalTradeDto {
    transactionId: string;
    transactionType: TransactionType;
    sourceCountry: string;
    targetCountry: string;
    amount: number;
    currency: string;
    currencyConversion?: CurrencyConversionDto;
    regulatoryCompliance?: RegulatoryComplianceDto;
    customsTariff?: CustomsTariffDto;
    energyType?: string;
    energyQuantity?: number;
    energyUnit?: string;
    supplierId?: string;
    buyerId?: string;
    contractId?: string;
    transactionDate?: string;
    deliveryDate?: string;
    paymentTerms?: string;
    incoterms?: string;
    documents?: string[];
    notes?: string;
}
export declare class UpdateInternationalTradeDto {
    transactionType?: TransactionType;
    amount?: number;
    currency?: string;
    currencyConversion?: CurrencyConversionDto;
    regulatoryCompliance?: RegulatoryComplianceDto;
    customsTariff?: CustomsTariffDto;
    notes?: string;
}
export declare class FilterInternationalTradeDto {
    sourceCountry?: string;
    targetCountry?: string;
    transactionType?: TransactionType;
    currency?: string;
    status?: string;
    complianceStatus?: ComplianceStatus;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
    energyType?: string;
    supplierId?: string;
    buyerId?: string;
}

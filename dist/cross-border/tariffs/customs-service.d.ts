import { ConfigService } from '@nestjs/config';
export interface TariffRate {
    hsCode: string;
    description: string;
    rate: number;
    unit: 'percentage' | 'fixed';
    minAmount?: number;
    maxAmount?: number;
    effectiveDate: Date;
    expiryDate?: Date;
}
export interface CustomsCalculation {
    hsCode: string;
    productCategory: string;
    customsValue: number;
    tariffRate: number;
    tariff: number;
    taxes: TaxCalculation[];
    totalFees: number;
    regulatoryFees: number;
    approved: boolean;
    restrictions: string[];
    requiredDocuments: string[];
    processingTime: number;
}
export interface TaxCalculation {
    type: string;
    rate: number;
    amount: number;
    description: string;
}
export interface CustomsRule {
    sourceCountry: string;
    targetCountry: string;
    productCategory: string;
    hsCode: string;
    tariffRate: number;
    additionalTaxes: TaxRate[];
    restrictions: string[];
    requiredDocuments: string[];
    specialConditions: string[];
}
export interface TaxRate {
    type: string;
    rate: number;
    description: string;
    applicableRange?: {
        min: number;
        max: number;
    };
}
export declare class CustomsService {
    private configService;
    private readonly logger;
    private readonly tariffRates;
    private readonly customsRules;
    private readonly supportedEnergyTypes;
    constructor(configService: ConfigService);
    private initializeTariffRates;
    private initializeCustomsRules;
    calculateCustomsAndTariffs(sourceCountry: string, targetCountry: string, amount: number, currency: string, energyType: string, customsData?: any): Promise<CustomsCalculation>;
    private getDefaultHSCode;
    private convertToUSD;
    private getTariffRate;
    private calculateTaxes;
    private getDefaultTaxes;
    private calculateRegulatoryFees;
    private checkRestrictions;
    private getRequiredDocuments;
    getTariffRatesByEnergyType(energyType: string): TariffRate[];
    getCustomsRulesByCountryPair(sourceCountry: string, targetCountry: string): CustomsRule[];
    validateCustomsData(customsData: any): Promise<boolean>;
    getSupportedEnergyTypes(): string[];
    estimateProcessingTime(sourceCountry: string, targetCountry: string, energyType: string): Promise<number>;
}

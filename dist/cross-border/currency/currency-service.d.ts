import { ConfigService } from '@nestjs/config';
export interface CurrencyRate {
    from: string;
    to: string;
    rate: number;
    timestamp: Date;
    source: string;
}
export interface ConversionResult {
    originalAmount: number;
    originalCurrency: string;
    convertedAmount: number;
    targetCurrency: string;
    exchangeRate: number;
    fee: number;
    totalAmount: number;
    timestamp: Date;
}
export interface SupportedCurrency {
    code: string;
    name: string;
    symbol: string;
    decimalPlaces: number;
    isActive: boolean;
    region: string[];
}
export declare class CurrencyService {
    private configService;
    private readonly logger;
    private readonly exchangeRates;
    private readonly supportedCurrencies;
    private readonly cacheTimeout;
    constructor(configService: ConfigService);
    private initializeSupportedCurrencies;
    private startExchangeRateUpdates;
    private updateExchangeRates;
    private generateMockExchangeRates;
    convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<ConversionResult>;
    private getExchangeRate;
    private calculateConversionFee;
    getSupportedCurrencies(): SupportedCurrency[];
    getCurrencyByCode(code: string): SupportedCurrency | undefined;
    getExchangeRateHistory(fromCurrency: string, toCurrency: string): CurrencyRate[];
    calculateCrossBorderFee(amount: number, fromCurrency: string, toCurrency: string): number;
    formatCurrency(amount: number, currency: string): string;
    validateCurrencyCode(code: string): boolean;
    getCurrenciesByRegion(region: string): SupportedCurrency[];
}

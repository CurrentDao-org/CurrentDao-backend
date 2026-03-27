import { HttpService } from '@nestjs/axios';
export interface EconomicIndicator {
    name: string;
    value: number;
    unit: string;
    timestamp: Date;
    source: string;
    region: string;
}
export interface EconomicData {
    gdp: number;
    inflation: number;
    unemployment: number;
    interestRate: number;
    industrialProduction: number;
    consumerConfidence: number;
    manufacturingIndex: number;
    retailSales: number;
    energyPrices: number;
    currencyExchange: number;
}
export interface MarketImpact {
    indicator: string;
    correlation: number;
    impact: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    significance: 'high' | 'medium' | 'low';
}
export declare class EconomicIndicatorService {
    private readonly httpService;
    private readonly logger;
    private readonly fredApiKey;
    private readonly alphaVantageApiKey;
    constructor(httpService: HttpService);
    getGDPData(region: string, startDate: Date, endDate: Date): Promise<EconomicIndicator[]>;
    getInflationData(region: string, startDate: Date, endDate: Date): Promise<EconomicIndicator[]>;
    getUnemploymentData(region: string, startDate: Date, endDate: Date): Promise<EconomicIndicator[]>;
    getInterestRateData(region: string, startDate: Date, endDate: Date): Promise<EconomicIndicator[]>;
    getEnergyPrices(region: string, startDate: Date, endDate: Date): Promise<EconomicIndicator[]>;
    getEconomicSnapshot(region?: string): Promise<EconomicData>;
    analyzeEconomicImpact(economicData: EconomicData, historicalEnergyData: {
        timestamp: Date;
        price: number;
        demand: number;
    }[]): Promise<MarketImpact[]>;
    predictEconomicTrends(economicData: EconomicData[]): Promise<Record<string, number>>;
    private getGDPSeriesId;
    private getInflationSeriesId;
    private getUnemploymentSeriesId;
    private getInterestRateSeriesId;
    private getEnergySymbol;
    private getLatestValue;
    private calculateCorrelation;
    private calculateGDPImpact;
    private calculateInflationImpact;
    private calculateInterestRateImpact;
    private calculateUnemploymentImpact;
    private calculateEnergyPriceImpact;
    private getTrend;
    private predictNextValue;
    private getMockGDPData;
    private getMockInflationData;
    private getMockUnemploymentData;
    private getMockInterestRateData;
    private getMockEnergyPrices;
    private getMockIndustrialProduction;
    private getMockConsumerConfidence;
    private getMockManufacturingIndex;
    private getMockRetailSales;
    private getMockCurrencyExchange;
}

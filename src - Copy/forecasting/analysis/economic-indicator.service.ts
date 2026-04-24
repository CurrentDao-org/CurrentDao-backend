import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class EconomicIndicatorService {
  private readonly logger = new Logger(EconomicIndicatorService.name);
  private readonly fredApiKey = process.env.FRED_API_KEY;
  private readonly alphaVantageApiKey = process.env.ALPHA_VANTAGE_API_KEY;

  constructor(private readonly httpService: HttpService) {}

  async getGDPData(
    region: string = 'US',
    startDate: Date,
    endDate: Date,
  ): Promise<EconomicIndicator[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://api.stlouisfed.org/fred/series/observations',
          {
            params: {
              series_id: this.getGDPSeriesId(region),
              api_key: this.fredApiKey,
              observation_start: startDate.toISOString().split('T')[0],
              observation_end: endDate.toISOString().split('T')[0],
              file_type: 'json',
            },
          },
        ),
      );

      return response.data.observations.map((obs: any) => ({
        name: 'GDP',
        value: parseFloat(obs.value) || 0,
        unit: 'Billions USD',
        timestamp: new Date(obs.date),
        source: 'FRED',
        region,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch GDP data', error);
      return this.getMockGDPData(region, startDate, endDate);
    }
  }

  async getInflationData(
    region: string = 'US',
    startDate: Date,
    endDate: Date,
  ): Promise<EconomicIndicator[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://api.stlouisfed.org/fred/series/observations',
          {
            params: {
              series_id: this.getInflationSeriesId(region),
              api_key: this.fredApiKey,
              observation_start: startDate.toISOString().split('T')[0],
              observation_end: endDate.toISOString().split('T')[0],
              file_type: 'json',
            },
          },
        ),
      );

      return response.data.observations.map((obs: any) => ({
        name: 'Inflation',
        value: parseFloat(obs.value) || 0,
        unit: 'Percent',
        timestamp: new Date(obs.date),
        source: 'FRED',
        region,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch inflation data', error);
      return this.getMockInflationData(region, startDate, endDate);
    }
  }

  async getUnemploymentData(
    region: string = 'US',
    startDate: Date,
    endDate: Date,
  ): Promise<EconomicIndicator[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://api.stlouisfed.org/fred/series/observations',
          {
            params: {
              series_id: this.getUnemploymentSeriesId(region),
              api_key: this.fredApiKey,
              observation_start: startDate.toISOString().split('T')[0],
              observation_end: endDate.toISOString().split('T')[0],
              file_type: 'json',
            },
          },
        ),
      );

      return response.data.observations.map((obs: any) => ({
        name: 'Unemployment',
        value: parseFloat(obs.value) || 0,
        unit: 'Percent',
        timestamp: new Date(obs.date),
        source: 'FRED',
        region,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch unemployment data', error);
      return this.getMockUnemploymentData(region, startDate, endDate);
    }
  }

  async getInterestRateData(
    region: string = 'US',
    startDate: Date,
    endDate: Date,
  ): Promise<EconomicIndicator[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          'https://api.stlouisfed.org/fred/series/observations',
          {
            params: {
              series_id: this.getInterestRateSeriesId(region),
              api_key: this.fredApiKey,
              observation_start: startDate.toISOString().split('T')[0],
              observation_end: endDate.toISOString().split('T')[0],
              file_type: 'json',
            },
          },
        ),
      );

      return response.data.observations.map((obs: any) => ({
        name: 'Interest Rate',
        value: parseFloat(obs.value) || 0,
        unit: 'Percent',
        timestamp: new Date(obs.date),
        source: 'FRED',
        region,
      }));
    } catch (error) {
      this.logger.error('Failed to fetch interest rate data', error);
      return this.getMockInterestRateData(region, startDate, endDate);
    }
  }

  async getEnergyPrices(
    region: string = 'US',
    startDate: Date,
    endDate: Date,
  ): Promise<EconomicIndicator[]> {
    try {
      // Use Alpha Vantage for energy prices
      const response = await firstValueFrom(
        this.httpService.get('https://www.alphavantage.co/query', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: this.getEnergySymbol(region),
            apikey: this.alphaVantageApiKey,
          },
        }),
      );

      const data = response.data['Global Quote'];

      return [
        {
          name: 'Energy Prices',
          value: parseFloat(data['05. price']) || 0,
          unit: 'USD',
          timestamp: new Date(),
          source: 'Alpha Vantage',
          region,
        },
      ];
    } catch (error) {
      this.logger.error('Failed to fetch energy prices', error);
      return this.getMockEnergyPrices(region, startDate, endDate);
    }
  }

  async getEconomicSnapshot(region: string = 'US'): Promise<EconomicData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const [
      gdpData,
      inflationData,
      unemploymentData,
      interestRateData,
      energyPricesData,
    ] = await Promise.all([
      this.getGDPData(region, startDate, endDate),
      this.getInflationData(region, startDate, endDate),
      this.getUnemploymentData(region, startDate, endDate),
      this.getInterestRateData(region, startDate, endDate),
      this.getEnergyPrices(region, startDate, endDate),
    ]);

    return {
      gdp: this.getLatestValue(gdpData),
      inflation: this.getLatestValue(inflationData),
      unemployment: this.getLatestValue(unemploymentData),
      interestRate: this.getLatestValue(interestRateData),
      industrialProduction: this.getMockIndustrialProduction(),
      consumerConfidence: this.getMockConsumerConfidence(),
      manufacturingIndex: this.getMockManufacturingIndex(),
      retailSales: this.getMockRetailSales(),
      energyPrices: this.getLatestValue(energyPricesData),
      currencyExchange: this.getMockCurrencyExchange(),
    };
  }

  async analyzeEconomicImpact(
    economicData: EconomicData,
    historicalEnergyData: { timestamp: Date; price: number; demand: number }[],
  ): Promise<MarketImpact[]> {
    const impacts: MarketImpact[] = [];

    // GDP Impact
    impacts.push({
      indicator: 'GDP',
      correlation: this.calculateCorrelation(
        historicalEnergyData.map((d) => d.demand),
        [economicData.gdp],
      ),
      impact: this.calculateGDPImpact(economicData.gdp),
      trend: this.getTrend(economicData.gdp, 20000), // Base GDP of 20T
      significance: 'high',
    });

    // Inflation Impact
    impacts.push({
      indicator: 'Inflation',
      correlation: this.calculateCorrelation(
        historicalEnergyData.map((d) => d.price),
        [economicData.inflation],
      ),
      impact: this.calculateInflationImpact(economicData.inflation),
      trend: this.getTrend(economicData.inflation, 2), // 2% target inflation
      significance: 'medium',
    });

    // Interest Rate Impact
    impacts.push({
      indicator: 'Interest Rate',
      correlation: this.calculateCorrelation(
        historicalEnergyData.map((d) => d.price),
        [economicData.interestRate],
      ),
      impact: this.calculateInterestRateImpact(economicData.interestRate),
      trend: this.getTrend(economicData.interestRate, 3), // 3% baseline
      significance: 'medium',
    });

    // Unemployment Impact
    impacts.push({
      indicator: 'Unemployment',
      correlation: this.calculateCorrelation(
        historicalEnergyData.map((d) => d.demand),
        [economicData.unemployment],
      ),
      impact: this.calculateUnemploymentImpact(economicData.unemployment),
      trend: this.getTrend(economicData.unemployment, 5), // 5% natural rate
      significance: 'medium',
    });

    // Energy Prices Impact
    impacts.push({
      indicator: 'Energy Prices',
      correlation: this.calculateCorrelation(
        historicalEnergyData.map((d) => d.price),
        [economicData.energyPrices],
      ),
      impact: this.calculateEnergyPriceImpact(economicData.energyPrices),
      trend: this.getTrend(economicData.energyPrices, 100), // $100 baseline
      significance: 'high',
    });

    return impacts;
  }

  async predictEconomicTrends(
    economicData: EconomicData[],
  ): Promise<Record<string, number>> {
    const trends: Record<string, number> = {};

    // Simple linear trend prediction for each indicator
    const indicators = [
      'gdp',
      'inflation',
      'unemployment',
      'interestRate',
      'industrialProduction',
      'consumerConfidence',
      'manufacturingIndex',
      'retailSales',
      'energyPrices',
      'currencyExchange',
    ];

    indicators.forEach((indicator) => {
      const values = economicData.map(
        (d) => d[indicator as keyof EconomicData],
      );
      trends[indicator] = this.predictNextValue(values);
    });

    return trends;
  }

  private getGDPSeriesId(region: string): string {
    const seriesMap: Record<string, string> = {
      US: 'GDP',
      EU: 'CLVMNACSCAB1GQEU',
      UK: 'UKNGDP',
      JP: 'JPNRGDPEXP',
      CN: 'NGDP_CN',
    };
    return seriesMap[region] || 'GDP';
  }

  private getInflationSeriesId(region: string): string {
    const seriesMap: Record<string, string> = {
      US: 'CPIAUCSL',
      EU: 'CP0000EZ19M086NEST',
      UK: 'GBRCPIALLMINMEI',
      JP: 'JPNCPIALLMINMEI',
      CN: 'CHNCPIALLMINMEI',
    };
    return seriesMap[region] || 'CPIAUCSL';
  }

  private getUnemploymentSeriesId(region: string): string {
    const seriesMap: Record<string, string> = {
      US: 'UNRATE',
      EU: 'LRUN64TTZQEU',
      UK: 'LRUN64TTGBM',
      JP: 'LRUN64TTJPQ156S',
      CN: 'LMUNRRTTCHM156S',
    };
    return seriesMap[region] || 'UNRATE';
  }

  private getInterestRateSeriesId(region: string): string {
    const seriesMap: Record<string, string> = {
      US: 'FEDFUNDS',
      EU: 'ESTBC',
      UK: 'BOEBGCR',
      JP: 'INTSRJPM193N',
      CN: 'INTSRJPM193N',
    };
    return seriesMap[region] || 'FEDFUNDS';
  }

  private getEnergySymbol(region: string): string {
    const symbolMap: Record<string, string> = {
      US: 'CL=F', // Crude Oil
      EU: 'BZ=F', // Brent Crude
      UK: 'BZ=F',
      JP: 'CL=F',
      CN: 'CL=F',
    };
    return symbolMap[region] || 'CL=F';
  }

  private getLatestValue(indicators: EconomicIndicator[]): number {
    return indicators.length > 0 ? indicators[indicators.length - 1].value : 0;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateGDPImpact(gdp: number): number {
    // Higher GDP generally increases energy demand
    const baseline = 20000; // 20 trillion USD
    return ((gdp - baseline) / baseline) * 0.3; // 30% elasticity
  }

  private calculateInflationImpact(inflation: number): number {
    // Higher inflation can reduce energy demand but increase prices
    const target = 2; // 2% target
    return (inflation - target) * 0.05;
  }

  private calculateInterestRateImpact(rate: number): number {
    // Higher interest rates can reduce economic activity and energy demand
    const baseline = 3; // 3% baseline
    return (rate - baseline) * -0.02;
  }

  private calculateUnemploymentImpact(unemployment: number): number {
    // Higher unemployment reduces energy demand
    const naturalRate = 5; // 5% natural rate
    return (unemployment - naturalRate) * -0.03;
  }

  private calculateEnergyPriceImpact(price: number): number {
    // Energy prices directly affect market prices
    const baseline = 100; // $100 baseline
    return (price - baseline) / baseline;
  }

  private getTrend(
    current: number,
    baseline: number,
  ): 'increasing' | 'decreasing' | 'stable' {
    const diff = (current - baseline) / baseline;
    if (diff > 0.05) return 'increasing';
    if (diff < -0.05) return 'decreasing';
    return 'stable';
  }

  private predictNextValue(values: number[]): number {
    if (values.length < 2) return values[0] || 0;

    // Simple linear regression
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return slope * n + intercept;
  }

  // Mock data methods for fallback
  private getMockGDPData(
    region: string,
    startDate: Date,
    endDate: Date,
  ): EconomicIndicator[] {
    const data: EconomicIndicator[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      data.push({
        name: 'GDP',
        value: 20000 + Math.random() * 2000,
        unit: 'Billions USD',
        timestamp: new Date(current),
        source: 'Mock',
        region,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  }

  private getMockInflationData(
    region: string,
    startDate: Date,
    endDate: Date,
  ): EconomicIndicator[] {
    const data: EconomicIndicator[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      data.push({
        name: 'Inflation',
        value: 2 + Math.random() * 3,
        unit: 'Percent',
        timestamp: new Date(current),
        source: 'Mock',
        region,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  }

  private getMockUnemploymentData(
    region: string,
    startDate: Date,
    endDate: Date,
  ): EconomicIndicator[] {
    const data: EconomicIndicator[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      data.push({
        name: 'Unemployment',
        value: 3 + Math.random() * 4,
        unit: 'Percent',
        timestamp: new Date(current),
        source: 'Mock',
        region,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  }

  private getMockInterestRateData(
    region: string,
    startDate: Date,
    endDate: Date,
  ): EconomicIndicator[] {
    const data: EconomicIndicator[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      data.push({
        name: 'Interest Rate',
        value: 2 + Math.random() * 4,
        unit: 'Percent',
        timestamp: new Date(current),
        source: 'Mock',
        region,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  }

  private getMockEnergyPrices(
    region: string,
    startDate: Date,
    endDate: Date,
  ): EconomicIndicator[] {
    const data: EconomicIndicator[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      data.push({
        name: 'Energy Prices',
        value: 80 + Math.random() * 40,
        unit: 'USD',
        timestamp: new Date(current),
        source: 'Mock',
        region,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return data;
  }

  private getMockIndustrialProduction(): number {
    return 100 + Math.random() * 20;
  }

  private getMockConsumerConfidence(): number {
    return 80 + Math.random() * 40;
  }

  private getMockManufacturingIndex(): number {
    return 50 + Math.random() * 20;
  }

  private getMockRetailSales(): number {
    return 500000 + Math.random() * 100000;
  }

  private getMockCurrencyExchange(): number {
    return 1 + Math.random() * 0.2;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateMarketDataDto } from '../dto/create-market-data.dto';

export interface DataSourceConfig {
  name: string;
  url: string;
  apiKey?: string;
  rateLimit: number;
  timeout: number;
  enabled: boolean;
}

export interface DataSourceStatus {
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate: Date;
  latency: number;
  errorCount: number;
}

@Injectable()
export class DataSourceService {
  private readonly logger = new Logger(DataSourceService.name);
  private readonly dataSources = new Map<string, DataSourceConfig>();
  private readonly sourceStatus = new Map<string, DataSourceStatus>();
  private readonly activeConnections = new Map<string, any>();

  constructor(private readonly httpService: HttpService) {
    this.initializeDefaultSources();
  }

  private initializeDefaultSources() {
    const defaultSources: DataSourceConfig[] = [
      {
        name: 'binance',
        url: 'https://api.binance.com/api/v3',
        rateLimit: 1200,
        timeout: 5000,
        enabled: true,
      },
      {
        name: 'coinbase',
        url: 'https://api.coinbase.com/v2',
        rateLimit: 10000,
        timeout: 5000,
        enabled: true,
      },
      {
        name: 'kraken',
        url: 'https://api.kraken.com/0/public',
        rateLimit: 3000,
        timeout: 5000,
        enabled: true,
      },
      {
        name: 'huobi',
        url: 'https://api.huobi.pro',
        rateLimit: 1000,
        timeout: 5000,
        enabled: true,
      },
      {
        name: 'okex',
        url: 'https://www.okex.com/api',
        rateLimit: 600,
        timeout: 5000,
        enabled: true,
      },
    ];

    defaultSources.forEach(source => {
      this.dataSources.set(source.name, source);
      this.sourceStatus.set(source.name, {
        name: source.name,
        status: 'inactive',
        lastUpdate: new Date(),
        latency: 0,
        errorCount: 0,
      });
    });
  }

  async initializeAllSources(): Promise<void> {
    const initPromises = Array.from(this.dataSources.entries())
      .filter(([_, config]) => config.enabled)
      .map(async ([name, config]) => {
        try {
          await this.testConnection(name);
          this.updateSourceStatus(name, 'active', 0);
          this.logger.log(`Data source ${name} initialized successfully`);
        } catch (error) {
          this.updateSourceStatus(name, 'error', 0);
          this.logger.error(`Failed to initialize data source ${name}:`, error);
        }
      });

    await Promise.allSettled(initPromises);
  }

  async testConnection(sourceName: string): Promise<boolean> {
    const config = this.dataSources.get(sourceName);
    if (!config || !config.enabled) {
      throw new Error(`Data source ${sourceName} not configured or disabled`);
    }

    const startTime = Date.now();
    try {
      const testUrl = this.getTestEndpoint(sourceName);
      const response = await firstValueFrom(
        this.httpService.get(testUrl, { timeout: config.timeout })
      );
      
      const latency = Date.now() - startTime;
      this.updateSourceStatus(sourceName, 'active', latency);
      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateSourceStatus(sourceName, 'error', latency);
      throw error;
    }
  }

  private getTestEndpoint(sourceName: string): string {
    const testEndpoints = {
      binance: 'https://api.binance.com/api/v3/ping',
      coinbase: 'https://api.coinbase.com/v2/time',
      kraken: 'https://api.kraken.com/0/public/Time',
      huobi: 'https://api.huobi.pro/v1/common/timestamp',
      okex: 'https://www.okex.com/api/v5/public/time',
    };

    return testEndpoints[sourceName] || testEndpoints.binance;
  }

  async fetchFromSource(sourceName: string, symbol: string): Promise<CreateMarketDataDto[]> {
    const config = this.dataSources.get(sourceName);
    if (!config || !config.enabled) {
      throw new Error(`Data source ${sourceName} not available`);
    }

    const startTime = Date.now();
    try {
      let data: CreateMarketDataDto[] = [];

      switch (sourceName) {
        case 'binance':
          data = await this.fetchFromBinance(symbol);
          break;
        case 'coinbase':
          data = await this.fetchFromCoinbase(symbol);
          break;
        case 'kraken':
          data = await this.fetchFromKraken(symbol);
          break;
        case 'huobi':
          data = await this.fetchFromHuobi(symbol);
          break;
        case 'okex':
          data = await this.fetchFromOkex(symbol);
          break;
        default:
          throw new Error(`Unsupported data source: ${sourceName}`);
      }

      const latency = Date.now() - startTime;
      this.updateSourceStatus(sourceName, 'active', latency);

      return data.map(item => ({
        ...item,
        source: sourceName,
      }));
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateSourceStatus(sourceName, 'error', latency);
      throw error;
    }
  }

  private async fetchFromBinance(symbol: string): Promise<CreateMarketDataDto[]> {
    const binanceSymbol = this.convertToBinanceSymbol(symbol);
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

    return [{
      symbol,
      price: parseFloat(data.lastPrice),
      volume: parseFloat(data.volume),
      high: parseFloat(data.highPrice),
      low: parseFloat(data.lowPrice),
      open: parseFloat(data.openPrice),
      sourceTimestamp: new Date(data.closeTime).toISOString(),
    }];
  }

  private async fetchFromCoinbase(symbol: string): Promise<CreateMarketDataDto[]> {
    const coinbaseSymbol = this.convertToCoinbaseSymbol(symbol);
    const url = `https://api.coinbase.com/v2/prices/${coinbaseSymbol}/spot`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

    return [{
      symbol,
      price: parseFloat(data.amount),
      sourceTimestamp: new Date().toISOString(),
    }];
  }

  private async fetchFromKraken(symbol: string): Promise<CreateMarketDataDto[]> {
    const krakenSymbol = this.convertToKrakenSymbol(symbol);
    const url = `https://api.kraken.com/0/public/Ticker?pair=${krakenSymbol}`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data;

    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const pairName = Object.keys(data.result)[0];
    const ticker = data.result[pairName];

    return [{
      symbol,
      price: parseFloat(ticker.c[0]),
      volume: parseFloat(ticker.v[1]),
      high: parseFloat(ticker.h[1]),
      low: parseFloat(ticker.l[1]),
      open: parseFloat(ticker.o),
      sourceTimestamp: new Date().toISOString(),
    }];
  }

  private async fetchFromHuobi(symbol: string): Promise<CreateMarketDataDto[]> {
    const huobiSymbol = this.convertToHuobiSymbol(symbol);
    const url = `https://api.huobi.pro/market/detail?symbol=${huobiSymbol}`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data.tick;

    return [{
      symbol,
      price: parseFloat(data.close),
      volume: parseFloat(data.vol),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      open: parseFloat(data.open),
      sourceTimestamp: new Date(data.ts).toISOString(),
    }];
  }

  private async fetchFromOkex(symbol: string): Promise<CreateMarketDataDto[]> {
    const okexSymbol = this.convertToOkexSymbol(symbol);
    const url = `https://www.okex.com/api/v5/market/ticker?instId=${okexSymbol}`;
    
    const response = await firstValueFrom(this.httpService.get(url));
    const data = response.data.data[0];

    return [{
      symbol,
      price: parseFloat(data.last),
      volume: parseFloat(data.vol24h),
      high: parseFloat(data.high24h),
      low: parseFloat(data.low24h),
      open: parseFloat(data.open24h),
      sourceTimestamp: new Date(parseInt(data.ts)).toISOString(),
    }];
  }

  async aggregateFromMultipleSources(symbols: string[]): Promise<CreateMarketDataDto[]> {
    const aggregatedData: CreateMarketDataDto[] = [];
    
    for (const symbol of symbols) {
      const sourcePromises = Array.from(this.dataSources.entries())
        .filter(([_, config]) => config.enabled)
        .map(([name, _]) => 
          this.fetchFromSource(name, symbol).catch(error => {
            this.logger.warn(`Failed to fetch from ${name} for ${symbol}:`, error.message);
            return [];
          })
        );

      const results = await Promise.allSettled(sourcePromises);
      const symbolData = results
        .filter((result): result is PromiseFulfilledResult<CreateMarketDataDto[]> => 
          result.status === 'fulfilled'
        )
        .flatMap(result => result.value);

      if (symbolData.length > 0) {
        // Aggregate by calculating weighted average based on source reliability
        const aggregated = this.aggregateSymbolData(symbol, symbolData);
        aggregatedData.push(aggregated);
      }
    }

    return aggregatedData;
  }

  private aggregateSymbolData(symbol: string, data: CreateMarketDataDto[]): CreateMarketDataDto {
    const totalVolume = data.reduce((sum, item) => sum + (item.volume || 0), 0);
    const weightedPrice = data.reduce((sum, item) => {
      const weight = (item.volume || 1) / totalVolume;
      return sum + (item.price * weight);
    }, 0);

    return {
      symbol,
      price: weightedPrice,
      volume: totalVolume,
      high: Math.max(...data.map(item => item.high || item.price)),
      low: Math.min(...data.map(item => item.low || item.price)),
      open: data[0]?.open,
      sourceTimestamp: new Date().toISOString(),
    };
  }

  async fetchRealTimeData(symbols: string[]): Promise<CreateMarketDataDto[]> {
    const realTimeData: CreateMarketDataDto[] = [];
    
    for (const symbol of symbols) {
      try {
        // Use the most reliable source for real-time data
        const data = await this.fetchFromSource('binance', symbol);
        realTimeData.push(...data);
      } catch (error) {
        this.logger.warn(`Failed to fetch real-time data for ${symbol}:`, error.message);
      }
    }

    return realTimeData;
  }

  getAllSourcesStatus(): DataSourceStatus[] {
    return Array.from(this.sourceStatus.values());
  }

  getSourceStatus(sourceName: string): DataSourceStatus | undefined {
    return this.sourceStatus.get(sourceName);
  }

  private updateSourceStatus(sourceName: string, status: 'active' | 'inactive' | 'error', latency: number) {
    const currentStatus = this.sourceStatus.get(sourceName);
    if (currentStatus) {
      currentStatus.status = status;
      currentStatus.lastUpdate = new Date();
      currentStatus.latency = latency;
      
      if (status === 'error') {
        currentStatus.errorCount++;
      } else if (status === 'active') {
        currentStatus.errorCount = 0;
      }
    }
  }

  private convertToBinanceSymbol(symbol: string): string {
    return symbol.replace('/', '').toUpperCase();
  }

  private convertToCoinbaseSymbol(symbol: string): string {
    return symbol.replace('/', '-').toUpperCase();
  }

  private convertToKrakenSymbol(symbol: string): string {
    const krakenPairs: Record<string, string> = {
      'BTC/USD': 'XBTUSD',
      'ETH/USD': 'ETHUSD',
      'LTC/USD': 'LTCUSD',
    };
    return krakenPairs[symbol] || symbol.replace('/', '');
  }

  private convertToHuobiSymbol(symbol: string): string {
    return symbol.replace('/', '').toLowerCase();
  }

  private convertToOkexSymbol(symbol: string): string {
    return symbol.replace('/', '-').toLowerCase();
  }

  async addDataSource(config: DataSourceConfig): Promise<void> {
    this.dataSources.set(config.name, config);
    this.sourceStatus.set(config.name, {
      name: config.name,
      status: 'inactive',
      lastUpdate: new Date(),
      latency: 0,
      errorCount: 0,
    });

    if (config.enabled) {
      await this.testConnection(config.name);
    }
  }

  async removeDataSource(sourceName: string): Promise<void> {
    this.dataSources.delete(sourceName);
    this.sourceStatus.delete(sourceName);
  }

  async enableDataSource(sourceName: string): Promise<void> {
    const config = this.dataSources.get(sourceName);
    if (config) {
      config.enabled = true;
      await this.testConnection(sourceName);
    }
  }

  async disableDataSource(sourceName: string): Promise<void> {
    const config = this.dataSources.get(sourceName);
    if (config) {
      config.enabled = false;
      this.updateSourceStatus(sourceName, 'inactive', 0);
    }
  }
}

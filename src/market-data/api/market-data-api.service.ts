import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateMarketDataDto } from '../dto/create-market-data.dto';

export interface ApiEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  rateLimit?: number;
  timeout?: number;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
  responseTime: number;
}

export interface RealTimeSyncConfig {
  enabled: boolean;
  interval: number; // milliseconds
  symbols: string[];
  endpoints: string[];
}

@Injectable()
export class MarketDataApiService {
  private readonly logger = new Logger(MarketDataApiService.name);
  private readonly apiEndpoints = new Map<string, ApiEndpoint>();
  private readonly syncConfigurations = new Map<string, RealTimeSyncConfig>();
  private readonly activeSyncs = new Map<string, NodeJS.Timeout>();

  constructor(private readonly httpService: HttpService) {
    this.initializeDefaultEndpoints();
  }

  private initializeDefaultEndpoints() {
    const defaultEndpoints: ApiEndpoint[] = [
      {
        name: 'binance-ticker',
        url: 'https://api.binance.com/api/v3/ticker/24hr',
        method: 'GET',
        rateLimit: 1200,
        timeout: 5000,
      },
      {
        name: 'coinbase-price',
        url: 'https://api.coinbase.com/v2/prices',
        method: 'GET',
        rateLimit: 10000,
        timeout: 5000,
      },
      {
        name: 'kraken-ticker',
        url: 'https://api.kraken.com/0/public/Ticker',
        method: 'GET',
        rateLimit: 3000,
        timeout: 5000,
      },
    ];

    defaultEndpoints.forEach(endpoint => {
      this.apiEndpoints.set(endpoint.name, endpoint);
    });
  }

  async triggerRealTimeSync(symbols: string[]): Promise<ApiResponse> {
    try {
      const syncId = `sync_${Date.now()}`;
      const config: RealTimeSyncConfig = {
        enabled: true,
        interval: 10000, // 10 seconds
        symbols,
        endpoints: ['binance-ticker', 'coinbase-price', 'kraken-ticker'],
      };

      this.syncConfigurations.set(syncId, config);
      
      // Start the sync process
      await this.startRealTimeSync(syncId);

      return {
        success: true,
        data: { syncId, symbols, status: 'started' },
        timestamp: new Date(),
        responseTime: 0,
      };
    } catch (error) {
      this.logger.error('Error triggering real-time sync:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        responseTime: 0,
      };
    }
  }

  private async startRealTimeSync(syncId: string): Promise<void> {
    const config = this.syncConfigurations.get(syncId);
    if (!config || !config.enabled) {
      return;
    }

    const syncInterval = setInterval(async () => {
      try {
        await this.performSync(syncId, config);
      } catch (error) {
        this.logger.error(`Error in sync ${syncId}:`, error);
      }
    }, config.interval);

    this.activeSyncs.set(syncId, syncInterval);
    this.logger.log(`Started real-time sync ${syncId} for symbols: ${config.symbols.join(', ')}`);
  }

  private async performSync(syncId: string, config: RealTimeSyncConfig): Promise<void> {
    const promises = config.endpoints.map(endpointName => 
      this.fetchFromEndpoint(endpointName, config.symbols)
    );

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        this.logger.warn(`Failed to sync from ${config.endpoints[index]}:`, result.reason);
      }
    });
  }

  async fetchFromEndpoint(endpointName: string, symbols: string[]): Promise<CreateMarketDataDto[]> {
    const endpoint = this.apiEndpoints.get(endpointName);
    if (!endpoint) {
      throw new Error(`Endpoint ${endpointName} not found`);
    }

    const startTime = Date.now();
    try {
      let data: CreateMarketDataDto[] = [];

      switch (endpointName) {
        case 'binance-ticker':
          data = await this.fetchFromBinanceTicker(symbols);
          break;
        case 'coinbase-price':
          data = await this.fetchFromCoinbasePrice(symbols);
          break;
        case 'kraken-ticker':
          data = await this.fetchFromKrakenTicker(symbols);
          break;
        default:
          throw new Error(`Unsupported endpoint: ${endpointName}`);
      }

      const responseTime = Date.now() - startTime;
      this.logger.debug(`Fetched ${data.length} items from ${endpointName} in ${responseTime}ms`);

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Error fetching from ${endpointName}:`, error);
      throw error;
    }
  }

  private async fetchFromBinanceTicker(symbols: string[]): Promise<CreateMarketDataDto[]> {
    const promises = symbols.map(async (symbol) => {
      const binanceSymbol = symbol.replace('/', '').toUpperCase();
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 })
      );
      const data = response.data;

      return {
        symbol,
        price: parseFloat(data.lastPrice),
        volume: parseFloat(data.volume),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        open: parseFloat(data.openPrice),
        sourceTimestamp: new Date(data.closeTime).toISOString(),
        source: 'binance',
      };
    });

    return Promise.all(promises);
  }

  private async fetchFromCoinbasePrice(symbols: string[]): Promise<CreateMarketDataDto[]> {
    const promises = symbols.map(async (symbol) => {
      const coinbaseSymbol = symbol.replace('/', '-').toUpperCase();
      const url = `https://api.coinbase.com/v2/prices/${coinbaseSymbol}/spot`;
      
      const response = await firstValueFrom(
        this.httpService.get(url, { timeout: 5000 })
      );
      const data = response.data;

      return {
        symbol,
        price: parseFloat(data.amount),
        sourceTimestamp: new Date().toISOString(),
        source: 'coinbase',
      };
    });

    return Promise.all(promises);
  }

  private async fetchFromKrakenTicker(symbols: string[]): Promise<CreateMarketDataDto[]> {
    const krakenSymbols = symbols.map(symbol => {
      const krakenPairs: Record<string, string> = {
        'BTC/USD': 'XBTUSD',
        'ETH/USD': 'ETHUSD',
        'LTC/USD': 'LTCUSD',
      };
      return krakenPairs[symbol] || symbol.replace('/', '');
    });

    const url = `https://api.kraken.com/0/public/Ticker?pair=${krakenSymbols.join(',')}`;
    
    const response = await firstValueFrom(
      this.httpService.get(url, { timeout: 5000 })
    );
    const data = response.data;

    if (data.error && data.error.length > 0) {
      throw new Error(`Kraken API error: ${data.error.join(', ')}`);
    }

    const results: CreateMarketDataDto[] = [];
    const pairNames = Object.keys(data.result);

    pairNames.forEach((pairName, index) => {
      const ticker = data.result[pairName];
      const originalSymbol = symbols[index];

      results.push({
        symbol: originalSymbol,
        price: parseFloat(ticker.c[0]),
        volume: parseFloat(ticker.v[1]),
        high: parseFloat(ticker.h[1]),
        low: parseFloat(ticker.l[1]),
        open: parseFloat(ticker.o),
        sourceTimestamp: new Date().toISOString(),
        source: 'kraken',
      });
    });

    return results;
  }

  async stopRealTimeSync(syncId: string): Promise<ApiResponse> {
    try {
      const syncInterval = this.activeSyncs.get(syncId);
      if (syncInterval) {
        clearInterval(syncInterval);
        this.activeSyncs.delete(syncId);
        this.syncConfigurations.delete(syncId);

        return {
          success: true,
          data: { syncId, status: 'stopped' },
          timestamp: new Date(),
          responseTime: 0,
        };
      }

      return {
        success: false,
        error: `Sync ${syncId} not found or already stopped`,
        timestamp: new Date(),
        responseTime: 0,
      };
    } catch (error) {
      this.logger.error('Error stopping real-time sync:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        responseTime: 0,
      };
    }
  }

  async getSyncStatus(): Promise<any> {
    const activeSyncs = Array.from(this.syncConfigurations.entries()).map(([syncId, config]) => ({
      syncId,
      symbols: config.symbols,
      enabled: config.enabled,
      interval: config.interval,
      endpoints: config.endpoints,
      active: this.activeSyncs.has(syncId),
    }));

    return {
      activeSyncs: activeSyncs.length,
      syncs: activeSyncs,
    };
  }

  async addApiEndpoint(endpoint: ApiEndpoint): Promise<void> {
    this.apiEndpoints.set(endpoint.name, endpoint);
    this.logger.log(`Added API endpoint: ${endpoint.name}`);
  }

  async removeApiEndpoint(endpointName: string): Promise<void> {
    this.apiEndpoints.delete(endpointName);
    this.logger.log(`Removed API endpoint: ${endpointName}`);
  }

  async testEndpoint(endpointName: string): Promise<ApiResponse> {
    const endpoint = this.apiEndpoints.get(endpointName);
    if (!endpoint) {
      return {
        success: false,
        error: `Endpoint ${endpointName} not found`,
        timestamp: new Date(),
        responseTime: 0,
      };
    }

    const startTime = Date.now();
    try {
      const response = await firstValueFrom(
        this.httpService.get(endpoint.url, { 
          timeout: endpoint.timeout || 5000,
          headers: endpoint.headers,
        })
      );

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          endpoint: endpointName,
          status: response.status,
          responseTime,
        },
        timestamp: new Date(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        responseTime,
      };
    }
  }

  async getEndpointStatus(): Promise<any> {
    const endpoints = Array.from(this.apiEndpoints.entries()).map(([name, endpoint]) => ({
      name,
      url: endpoint.url,
      method: endpoint.method,
      rateLimit: endpoint.rateLimit,
      timeout: endpoint.timeout,
    }));

    return { endpoints };
  }

  async configureRealTimeSync(config: RealTimeSyncConfig): Promise<string> {
    const syncId = `sync_${Date.now()}`;
    this.syncConfigurations.set(syncId, config);

    if (config.enabled) {
      await this.startRealTimeSync(syncId);
    }

    return syncId;
  }

  async updateSyncConfig(syncId: string, config: Partial<RealTimeSyncConfig>): Promise<void> {
    const existingConfig = this.syncConfigurations.get(syncId);
    if (!existingConfig) {
      throw new Error(`Sync configuration ${syncId} not found`);
    }

    const updatedConfig = { ...existingConfig, ...config };
    this.syncConfigurations.set(syncId, updatedConfig);

    // Restart sync if it's currently active
    if (this.activeSyncs.has(syncId)) {
      await this.stopRealTimeSync(syncId);
      if (updatedConfig.enabled) {
        await this.startRealTimeSync(syncId);
      }
    }
  }

  async getApiMetrics(): Promise<any> {
    const metrics = {
      totalEndpoints: this.apiEndpoints.size,
      activeSyncs: this.activeSyncs.size,
      totalSyncs: this.syncConfigurations.size,
      endpoints: [],
    };

    // Add endpoint-specific metrics
    for (const [name, endpoint] of this.apiEndpoints) {
      metrics.endpoints.push({
        name,
        url: endpoint.url,
        method: endpoint.method,
        rateLimit: endpoint.rateLimit,
        timeout: endpoint.timeout,
      });
    }

    return metrics;
  }

  async cleanup(): Promise<void> {
    // Stop all active syncs
    for (const syncId of this.activeSyncs.keys()) {
      await this.stopRealTimeSync(syncId);
    }

    this.logger.log('Market Data API Service cleaned up');
  }
}

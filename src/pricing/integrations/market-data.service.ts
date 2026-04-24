import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PriceHistory } from '../entities/price-history.entity';

export interface MarketDataSource {
  id: string;
  name: string;
  type: 'api' | 'websocket' | 'file' | 'database';
  endpoint?: string;
  apiKey?: string;
  priority: number;
  isActive: boolean;
  lastUpdate?: Date;
  reliability: number; // 0-1 score
  dataTypes: string[];
}

export interface MarketDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  spread: number;
  liquidity: number;
  source: string;
  energyType: string;
  location: string;
  quality: 'high' | 'medium' | 'low';
}

export interface IntegratedMarketData {
  primaryData: MarketDataPoint;
  secondaryData: MarketDataPoint[];
  aggregatedMetrics: {
    weightedPrice: number;
    totalVolume: number;
    avgLiquidity: number;
    confidence: number;
    dataSources: string[];
  };
  timestamp: number;
}

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly MIN_DATA_SOURCES = 10;
  private dataSources: Map<string, MarketDataSource> = new Map();
  private dataBuffer: MarketDataPoint[] = [];
  private readonly BUFFER_SIZE = 5000;

  constructor(
    private readonly httpService: HttpService,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {
    this.initializeDataSources();
  }

  private initializeDataSources(): void {
    // Initialize 10+ market data sources
    const sources: MarketDataSource[] = [
      {
        id: 'eia',
        name: 'U.S. Energy Information Administration',
        type: 'api',
        endpoint: 'https://api.eia.gov/v2',
        priority: 1,
        isActive: true,
        reliability: 0.95,
        dataTypes: ['price', 'volume', 'demand'],
      },
      {
        id: 'entsoe',
        name: 'European Network of Transmission System Operators',
        type: 'api',
        endpoint: 'https://transparency.entsoe.eu/api',
        priority: 2,
        isActive: true,
        reliability: 0.92,
        dataTypes: ['price', 'volume', 'generation'],
      },
      {
        id: 'ice',
        name: 'Intercontinental Exchange',
        type: 'api',
        endpoint: 'https://www.theice.com/marketdata',
        priority: 3,
        isActive: true,
        reliability: 0.94,
        dataTypes: ['price', 'volume', 'futures'],
      },
      {
        id: 'nordpool',
        name: 'Nord Pool Energy Market',
        type: 'api',
        endpoint: 'https://www.nordpoolgroup.com/api',
        priority: 4,
        isActive: true,
        reliability: 0.91,
        dataTypes: ['price', 'volume'],
      },
      {
        id: 'epex',
        name: 'European Power Exchange',
        type: 'api',
        endpoint: 'https://www.epexspot.com/api',
        priority: 5,
        isActive: true,
        reliability: 0.90,
        dataTypes: ['price', 'volume'],
      },
      {
        id: 'cme',
        name: 'CME Group Energy Markets',
        type: 'api',
        endpoint: 'https://www.cmegroup.com/market-data',
        priority: 6,
        isActive: true,
        reliability: 0.93,
        dataTypes: ['price', 'volume', 'futures'],
      },
      {
        id: 'platts',
        name: 'S&P Global Platts',
        type: 'api',
        endpoint: 'https://www.platts.com/api',
        priority: 7,
        isActive: true,
        reliability: 0.89,
        dataTypes: ['price', 'news', 'analysis'],
      },
      {
        id: 'argus',
        name: 'Argus Media',
        type: 'api',
        endpoint: 'https://www.argusmedia.com/api',
        priority: 8,
        isActive: true,
        reliability: 0.88,
        dataTypes: ['price', 'analysis'],
      },
      {
        id: 'reuters',
        name: 'Reuters Market Data',
        type: 'api',
        endpoint: 'https://www.reuters.com/api/markets',
        priority: 9,
        isActive: true,
        reliability: 0.91,
        dataTypes: ['price', 'news'],
      },
      {
        id: 'bloomberg',
        name: 'Bloomberg Energy Data',
        type: 'api',
        endpoint: 'https://www.bloomberg.com/api/energy',
        priority: 10,
        isActive: true,
        reliability: 0.96,
        dataTypes: ['price', 'volume', 'analysis'],
      },
      {
        id: 'internal',
        name: 'Internal Trading Data',
        type: 'database',
        priority: 11,
        isActive: true,
        reliability: 0.85,
        dataTypes: ['price', 'volume', 'trades'],
      },
      {
        id: 'weather',
        name: 'Weather Impact Data',
        type: 'api',
        endpoint: 'https://api.weather.com/v1',
        priority: 12,
        isActive: true,
        reliability: 0.87,
        dataTypes: ['weather', 'impact'],
      },
    ];

    sources.forEach(source => {
      this.dataSources.set(source.id, source);
    });

    this.logger.log(`Initialized ${sources.length} market data sources`);
  }

  async fetchMarketData(
    energyType: string,
    location: string,
  ): Promise<IntegratedMarketData> {
    const startTime = Date.now();
    const activeSources = Array.from(this.dataSources.values())
      .filter(source => source.isActive && source.dataTypes.includes('price'))
      .sort((a, b) => a.priority - b.priority);

    if (activeSources.length < this.MIN_DATA_SOURCES) {
      this.logger.warn(`Insufficient active data sources: ${activeSources.length}`);
    }

    const dataPromises = activeSources.map(source => 
      this.fetchFromSource(source, energyType, location)
    );

    const results = await Promise.allSettled(dataPromises);
    const validData = results
      .filter((result): result is PromiseFulfilledResult<MarketDataPoint> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value)
      .sort((a, b) => {
        const aReliability = this.dataSources.get(a.source)?.reliability || 0;
        const bReliability = this.dataSources.get(b.source)?.reliability || 0;
        return bReliability - aReliability;
      });

    if (validData.length === 0) {
      throw new Error('No valid market data available from any source');
    }

    const integratedData = this.integrateMarketData(validData);
    
    const fetchTime = Date.now() - startTime;
    this.logger.log(
      `Fetched market data from ${validData.length} sources in ${fetchTime}ms for ${energyType} in ${location}`,
    );

    return integratedData;
  }

  private async fetchFromSource(
    source: MarketDataSource,
    energyType: string,
    location: string,
  ): Promise<MarketDataPoint> {
    try {
      switch (source.type) {
        case 'api':
          return await this.fetchFromAPI(source, energyType, location);
        case 'database':
          return await this.fetchFromDatabase(source, energyType, location);
        case 'websocket':
          return await this.fetchFromWebSocket(source, energyType, location);
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch from ${source.name}: ${error.message}`);
      source.isActive = false; // Temporarily disable failing source
      throw error;
    }
  }

  private async fetchFromAPI(
    source: MarketDataSource,
    energyType: string,
    location: string,
  ): Promise<MarketDataPoint> {
    // Simulate API call with mock data for demonstration
    // In real implementation, this would make actual API calls
    await this.delay(Math.random() * 100 + 50); // Simulate network latency

    const mockData = this.generateMockMarketData(energyType, location, source.id);
    
    // Update source metadata
    source.lastUpdate = new Date();
    source.reliability = Math.min(1.0, source.reliability + 0.001);

    return mockData;
  }

  private async fetchFromDatabase(
    source: MarketDataSource,
    energyType: string,
    location: string,
  ): Promise<MarketDataPoint> {
    const latestRecord = await this.priceHistoryRepository.findOne({
      where: { energyType, location },
      order: { timestamp: 'DESC' },
    });

    if (!latestRecord) {
      throw new Error(`No historical data found for ${energyType} in ${location}`);
    }

    return {
      timestamp: latestRecord.timestamp.getTime(),
      price: latestRecord.finalPrice,
      volume: latestRecord.supply + latestRecord.demand,
      bid: latestRecord.finalPrice * 0.998,
      ask: latestRecord.finalPrice * 1.002,
      spread: latestRecord.finalPrice * 0.004,
      liquidity: Math.random() * 100,
      source: source.id,
      energyType,
      location,
      quality: 'medium',
    };
  }

  private async fetchFromWebSocket(
    source: MarketDataSource,
    energyType: string,
    location: string,
  ): Promise<MarketDataPoint> {
    // Simulate WebSocket data
    await this.delay(Math.random() * 20 + 10); // WebSocket is typically faster
    
    return this.generateMockMarketData(energyType, location, source.id);
  }

  private generateMockMarketData(
    energyType: string,
    location: string,
    sourceId: string,
  ): MarketDataPoint {
    const basePrice = this.getBasePriceForEnergyType(energyType);
    const locationMultiplier = this.getLocationMultiplier(location);
    const sourceVariation = this.getSourceVariation(sourceId);
    
    const price = basePrice * locationMultiplier * sourceVariation;
    const volume = Math.random() * 10000 + 1000;
    const spread = price * (Math.random() * 0.01 + 0.001);
    
    return {
      timestamp: Date.now(),
      price,
      volume,
      bid: price - spread / 2,
      ask: price + spread / 2,
      spread,
      liquidity: Math.random() * 100,
      source: sourceId,
      energyType,
      location,
      quality: this.determineDataQuality(sourceId),
    };
  }

  private getBasePriceForEnergyType(energyType: string): number {
    const basePrices = {
      solar: 50,
      wind: 45,
      hydro: 40,
      nuclear: 35,
      fossil: 60,
      geothermal: 55,
    };
    return basePrices[energyType.toLowerCase()] || 50;
  }

  private getLocationMultiplier(location: string): number {
    const multipliers = {
      'US': 1.0,
      'EU': 1.2,
      'Asia': 0.9,
      'UK': 1.3,
      'Germany': 1.4,
      'France': 1.2,
      'Spain': 1.1,
      'Italy': 1.25,
      'Nordics': 0.95,
      'China': 0.85,
    };
    return multipliers[location] || 1.0;
  }

  private getSourceVariation(sourceId: string): number {
    const variations = {
      'eia': 1.0,
      'entsoe': 0.98,
      'ice': 1.02,
      'nordpool': 0.97,
      'epex': 1.01,
      'cme': 1.03,
      'platts': 0.99,
      'argus': 1.00,
      'reuters': 1.01,
      'bloomberg': 1.02,
      'internal': 0.95,
      'weather': 1.00,
    };
    return variations[sourceId] || 1.0;
  }

  private determineDataQuality(sourceId: string): 'high' | 'medium' | 'low' {
    const source = this.dataSources.get(sourceId);
    if (!source) return 'low';
    
    if (source.reliability > 0.9) return 'high';
    if (source.reliability > 0.8) return 'medium';
    return 'low';
  }

  private integrateMarketData(dataPoints: MarketDataPoint[]): IntegratedMarketData {
    const primaryData = dataPoints[0];
    const secondaryData = dataPoints.slice(1, 5); // Top 5 secondary sources
    
    // Calculate weighted average based on source reliability
    let totalWeight = 0;
    let weightedPrice = 0;
    let totalVolume = 0;
    let totalLiquidity = 0;
    
    for (const point of dataPoints) {
      const source = this.dataSources.get(point.source);
      const weight = source?.reliability || 0.5;
      
      totalWeight += weight;
      weightedPrice += point.price * weight;
      totalVolume += point.volume;
      totalLiquidity += point.liquidity;
    }
    
    const aggregatedMetrics = {
      weightedPrice: weightedPrice / totalWeight,
      totalVolume,
      avgLiquidity: totalLiquidity / dataPoints.length,
      confidence: Math.min(95, (totalWeight / dataPoints.length) * 100),
      dataSources: dataPoints.map(p => p.source),
    };
    
    return {
      primaryData,
      secondaryData,
      aggregatedMetrics,
      timestamp: Date.now(),
    };
  }

  async getRealTimeDataStream(
    energyType: string,
    location: string,
  ): Promise<AsyncIterable<MarketDataPoint>> {
    // Implement real-time streaming
    const stream = this.createRealTimeStream(energyType, location);
    return stream;
  }

  private async *createRealTimeStream(
    energyType: string,
    location: string,
  ): AsyncIterable<MarketDataPoint> {
    while (true) {
      try {
        const data = await this.fetchMarketData(energyType, location);
        yield data.primaryData;
        
        // Wait before next update
        await this.delay(1000); // 1 second updates
      } catch (error) {
        this.logger.error(`Real-time stream error: ${error.message}`);
        await this.delay(5000); // Wait longer on error
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateDataSourceHealth(): Promise<void> {
    for (const [id, source] of this.dataSources.entries()) {
      try {
        // Test each source with a lightweight request
        const testData = await this.fetchFromSource(source, 'solar', 'US');
        source.isActive = true;
        source.lastUpdate = new Date();
      } catch (error) {
        source.isActive = false;
        source.reliability = Math.max(0.1, source.reliability - 0.05);
        this.logger.warn(`Data source ${source.name} health check failed`);
      }
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupOldData(): Promise<void> {
    if (this.dataBuffer.length > this.BUFFER_SIZE) {
      this.dataBuffer = this.dataBuffer.slice(-this.BUFFER_SIZE);
      this.logger.log('Cleaned up old market data buffer');
    }
  }

  getDataSourcesStatus(): {
    total: number;
    active: number;
    inactive: number;
    sources: MarketDataSource[];
  } {
    const sources = Array.from(this.dataSources.values());
    const active = sources.filter(s => s.isActive).length;
    const inactive = sources.length - active;
    
    return {
      total: sources.length,
      active,
      inactive,
      sources,
    };
  }

  getDataQualityMetrics(): {
    avgReliability: number;
    highQualitySources: number;
    mediumQualitySources: number;
    lowQualitySources: number;
    dataPointsInBuffer: number;
  } {
    const sources = Array.from(this.dataSources.values());
    const avgReliability = sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length;
    
    const highQuality = sources.filter(s => s.reliability > 0.9).length;
    const mediumQuality = sources.filter(s => s.reliability > 0.8 && s.reliability <= 0.9).length;
    const lowQuality = sources.filter(s => s.reliability <= 0.8).length;
    
    return {
      avgReliability,
      highQualitySources: highQuality,
      mediumQualitySources: mediumQuality,
      lowQualitySources: lowQuality,
      dataPointsInBuffer: this.dataBuffer.length,
    };
  }
}

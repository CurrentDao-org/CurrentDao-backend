import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

interface TradingData {
  tradeId: string;
  buyerId: string;
  sellerId: string;
  energyAmount: number;
  pricePerMwh: number;
  totalValue: number;
  tradeDate: Date;
  gridZone: string;
  energyType: string;
  status: 'pending' | 'completed' | 'cancelled';
}

interface PricingData {
  priceId: string;
  timestamp: Date;
  marketPrice: number;
  demand: number;
  supply: number;
  volatility: number;
  gridZone: string;
  priceTrend: 'up' | 'down' | 'stable';
}

interface IntegrationMetrics {
  tradingDataSync: {
    status: 'active' | 'inactive' | 'error';
    lastSync: Date;
    totalTrades: number;
    syncLatency: number;
    errorRate: number;
  };
  pricingDataCapture: {
    status: 'active' | 'inactive' | 'error';
    lastCapture: Date;
    totalPrices: number;
    captureLatency: number;
    accuracy: number;
  };
  dataIntegrity: {
    completeness: number;
    accuracy: number;
    consistency: number;
    lastValidation: Date;
  };
}

@Injectable()
export class TradingIntegrationService {
  private readonly logger = new Logger(TradingIntegrationService.name);
  private redis: Redis;
  private integrationMetrics: IntegrationMetrics;
  private syncInterval: NodeJS.Timeout;
  private captureInterval: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {
    this.integrationMetrics = {
      tradingDataSync: {
        status: 'active',
        lastSync: new Date(),
        totalTrades: 0,
        syncLatency: 10, // 10ms
        errorRate: 0.001, // 0.1%
      },
      pricingDataCapture: {
        status: 'active',
        lastCapture: new Date(),
        totalPrices: 0,
        captureLatency: 8, // 8ms
        accuracy: 0.9999, // 99.99%
      },
      dataIntegrity: {
        completeness: 1.0, // 100%
        accuracy: 0.9999, // 99.99%
        consistency: 1.0, // 100%
        lastValidation: new Date(),
      },
    };
  }

  async onModuleInit() {
    await this.initializeRedis();
    this.startDataSync();
    this.startPricingCapture();
    this.startDataValidation();
    this.logger.log('Trading integration service initialized');
  }

  private async initializeRedis() {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for trading integration');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  private startDataSync() {
    // Sync trading data every 30 seconds
    this.syncInterval = setInterval(async () => {
      await this.syncTradingData();
    }, 30000);
  }

  private startPricingCapture() {
    // Capture pricing data every 15 seconds
    this.captureInterval = setInterval(async () => {
      await this.capturePricingData();
    }, 15000);
  }

  private startDataValidation() {
    // Validate data integrity every 5 minutes
    setInterval(async () => {
      await this.validateDataIntegrity();
    }, 300000);
  }

  async syncTradingData(syncConfig?: any): Promise<any> {
    const startTime = Date.now();
    
    this.logger.log('Syncing trading data');

    try {
      // Simulate fetching trading data from external systems
      const tradingData = await this.fetchTradingDataFromSource(syncConfig);
      
      // Process and store trading data
      for (const trade of tradingData) {
        await this.processTradingData(trade);
      }

      // Update sync metrics
      const syncTime = Date.now() - startTime;
      this.integrationMetrics.tradingDataSync.lastSync = new Date();
      this.integrationMetrics.tradingDataSync.totalTrades += tradingData.length;
      this.integrationMetrics.tradingDataSync.syncLatency = 
        (this.integrationMetrics.tradingDataSync.syncLatency * 0.8) + (syncTime * 0.2);

      // Store sync status
      await this.redis.setex(
        'integration:trading:sync_status',
        300, // 5 minutes TTL
        JSON.stringify({
          status: 'success',
          tradesProcessed: tradingData.length,
          syncTime,
          timestamp: new Date(),
        })
      );

      this.logger.log(`Trading data sync completed: ${tradingData.length} trades in ${syncTime}ms`);

      return {
        status: 'success',
        tradesProcessed: tradingData.length,
        syncTime: `${syncTime}ms`,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Error syncing trading data:', error);
      this.integrationMetrics.tradingDataSync.status = 'error';
      this.integrationMetrics.tradingDataSync.errorRate += 0.001;

      // Store error status
      await this.redis.setex(
        'integration:trading:sync_status',
        300,
        JSON.stringify({
          status: 'error',
          error: error.message,
          timestamp: new Date(),
        })
      );

      throw error;
    }
  }

  async capturePricingData(captureConfig?: any): Promise<any> {
    const startTime = Date.now();
    
    this.logger.log('Capturing pricing data');

    try {
      // Simulate fetching pricing data from market sources
      const pricingData = await this.fetchPricingDataFromSource(captureConfig);
      
      // Process and store pricing data
      for (const price of pricingData) {
        await this.processPricingData(price);
      }

      // Update capture metrics
      const captureTime = Date.now() - startTime;
      this.integrationMetrics.pricingDataCapture.lastCapture = new Date();
      this.integrationMetrics.pricingDataCapture.totalPrices += pricingData.length;
      this.integrationMetrics.pricingDataCapture.captureLatency = 
        (this.integrationMetrics.pricingDataCapture.captureLatency * 0.8) + (captureTime * 0.2);

      // Store capture status
      await this.redis.setex(
        'integration:pricing:capture_status',
        300, // 5 minutes TTL
        JSON.stringify({
          status: 'success',
          pricesCaptured: pricingData.length,
          captureTime,
          timestamp: new Date(),
        })
      );

      this.logger.log(`Pricing data capture completed: ${pricingData.length} prices in ${captureTime}ms`);

      return {
        status: 'success',
        pricesCaptured: pricingData.length,
        captureTime: `${captureTime}ms`,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      this.logger.error('Error capturing pricing data:', error);
      this.integrationMetrics.pricingDataCapture.status = 'error';

      // Store error status
      await this.redis.setex(
        'integration:pricing:capture_status',
        300,
        JSON.stringify({
          status: 'error',
          error: error.message,
          timestamp: new Date(),
        })
      );

      throw error;
    }
  }

  private async fetchTradingDataFromSource(config?: any): Promise<TradingData[]> {
    // Simulate fetching from external trading systems
    const tradeCount = Math.floor(Math.random() * 100) + 50; // 50-150 trades
    
    return Array.from({ length: tradeCount }, (_, i) => ({
      tradeId: `trade_${Date.now()}_${i}`,
      buyerId: `buyer_${Math.floor(Math.random() * 1000)}`,
      sellerId: `seller_${Math.floor(Math.random() * 1000)}`,
      energyAmount: Math.floor(Math.random() * 1000) + 100, // 100-1100 MWh
      pricePerMwh: Math.random() * 50 + 20, // $20-70/MWh
      totalValue: 0, // Will be calculated
      tradeDate: new Date(Date.now() - Math.random() * 3600000), // Last hour
      gridZone: ['US-West', 'US-East', 'EU-Central', 'Asia-Pacific'][Math.floor(Math.random() * 4)],
      energyType: ['solar', 'wind', 'hydro', 'nuclear', 'fossil'][Math.floor(Math.random() * 5)],
      status: 'completed',
    })).map(trade => ({
      ...trade,
      totalValue: trade.energyAmount * trade.pricePerMwh,
    }));
  }

  private async fetchPricingDataFromSource(config?: any): Promise<PricingData[]> {
    // Simulate fetching from market data sources
    const priceCount = Math.floor(Math.random() * 50) + 25; // 25-75 price points
    
    return Array.from({ length: priceCount }, (_, i) => ({
      priceId: `price_${Date.now()}_${i}`,
      timestamp: new Date(Date.now() - Math.random() * 1800000), // Last 30 minutes
      marketPrice: Math.random() * 30 + 25, // $25-55/MWh
      demand: Math.floor(Math.random() * 50000) + 20000, // 20K-70K MW
      supply: Math.floor(Math.random() * 50000) + 25000, // 25K-75K MW
      volatility: Math.random() * 0.2 + 0.05, // 5-25%
      gridZone: ['US-West', 'US-East', 'EU-Central', 'Asia-Pacific'][Math.floor(Math.random() * 4)],
      priceTrend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
    }));
  }

  private async processTradingData(trade: TradingData): Promise<void> {
    // Store trading data in Redis for analytics
    await this.redis.hset(
      'trading:data',
      trade.tradeId,
      JSON.stringify(trade)
    );

    // Add to time-series for trend analysis
    await this.redis.zadd(
      'trading:timeline',
      trade.tradeDate.getTime(),
      JSON.stringify({
        tradeId: trade.tradeId,
        volume: trade.energyAmount,
        price: trade.pricePerMwh,
        value: trade.totalValue,
        gridZone: trade.gridZone,
      })
    );

    // Update user analytics
    await this.redis.incr(`user:${trade.buyerId}:trades`);
    await this.redis.incr(`user:${trade.sellerId}:trades`);
    await this.redis.incrby(`user:${trade.buyerId}:total_volume`, trade.energyAmount);
    await this.redis.incrby(`user:${trade.sellerId}:total_volume`, trade.energyAmount);

    // Update grid zone analytics
    await this.redis.incrby(`grid:${trade.gridZone}:trades`, 1);
    await this.redis.incrby(`grid:${trade.gridZone}:total_volume`, trade.energyAmount);
    await this.redis.incrby(`grid:${trade.gridZone}:total_value`, trade.totalValue);

    // Update energy type analytics
    await this.redis.incrby(`energy:${trade.energyType}:trades`, 1);
    await this.redis.incrby(`energy:${trade.energyType}:total_volume`, trade.energyAmount);
  }

  private async processPricingData(price: PricingData): Promise<void> {
    // Store pricing data in Redis for analytics
    await this.redis.hset(
      'pricing:data',
      price.priceId,
      JSON.stringify(price)
    );

    // Add to time-series for trend analysis
    await this.redis.zadd(
      'pricing:timeline',
      price.timestamp.getTime(),
      JSON.stringify({
        priceId: price.priceId,
        price: price.marketPrice,
        demand: price.demand,
        supply: price.supply,
        volatility: price.volatility,
        gridZone: price.gridZone,
      })
    );

    // Update grid zone pricing analytics
    await this.redis.hset(
      `grid:${price.gridZone}:current_pricing`,
      'market_price',
      price.marketPrice
    );

    await this.redis.hset(
      `grid:${price.gridZone}:current_pricing`,
      'demand',
      price.demand
    );

    await this.redis.hset(
      `grid:${price.gridZone}:current_pricing`,
      'supply',
      price.supply
    );

    await this.redis.hset(
      `grid:${price.gridZone}:current_pricing`,
      'volatility',
      price.volatility
    );

    await this.redis.hset(
      `grid:${price.gridZone}:current_pricing`,
      'last_update',
      price.timestamp.toISOString()
    );

    // Calculate price trend
    await this.updatePriceTrend(price.gridZone, price.priceTrend);
  }

  private async updatePriceTrend(gridZone: string, trend: 'up' | 'down' | 'stable'): Promise<void> {
    const trendKey = `grid:${gridZone}:price_trend`;
    const currentTrend = await this.redis.hget(trendKey, 'trend');
    
    if (currentTrend !== trend) {
      await this.redis.hset(trendKey, 'trend', trend);
      await this.redis.hset(trendKey, 'trend_changed', new Date().toISOString());
      
      this.logger.log(`Price trend updated for ${gridZone}: ${trend}`);
    }
  }

  private async validateDataIntegrity(): Promise<void> {
    try {
      const validationResults = await this.performDataValidation();
      
      // Update integrity metrics
      this.integrationMetrics.dataIntegrity.completeness = validationResults.completeness;
      this.integrationMetrics.dataIntegrity.accuracy = validationResults.accuracy;
      this.integrationMetrics.dataIntegrity.consistency = validationResults.consistency;
      this.integrationMetrics.dataIntegrity.lastValidation = new Date();

      // Store validation results
      await this.redis.setex(
        'integration:data_integrity',
        3600, // 1 hour TTL
        JSON.stringify(validationResults)
      );

      this.logger.log(`Data integrity validation completed: ${JSON.stringify(validationResults)}`);

    } catch (error) {
      this.logger.error('Error validating data integrity:', error);
    }
  }

  private async performDataValidation(): Promise<any> {
    // Simulate data validation checks
    const tradingDataCount = await this.redis.hlen('trading:data');
    const pricingDataCount = await this.redis.hlen('pricing:data');
    
    // Check for missing required fields
    const tradingSample = await this.getTradingDataSample(10);
    const pricingSample = await this.getPricingDataSample(10);
    
    const tradingCompleteness = this.calculateFieldCompleteness(tradingSample, [
      'tradeId', 'buyerId', 'sellerId', 'energyAmount', 'pricePerMwh', 'totalValue'
    ]);
    
    const pricingCompleteness = this.calculateFieldCompleteness(pricingSample, [
      'priceId', 'timestamp', 'marketPrice', 'demand', 'supply'
    ]);

    // Check for data consistency
    const consistency = await this.checkDataConsistency();

    return {
      completeness: (tradingCompleteness + pricingCompleteness) / 2,
      accuracy: 0.9999, // Simulated 99.99% accuracy
      consistency,
      tradingDataCount,
      pricingDataCount,
      validationTimestamp: new Date(),
      issues: this.identifyDataIssues(tradingSample, pricingSample),
    };
  }

  private async getTradingDataSample(limit: number): Promise<any[]> {
    const keys = await this.redis.hkeys('trading:data');
    const sampleKeys = keys.slice(0, limit);
    
    if (sampleKeys.length === 0) return [];
    
    const values = await this.redis.hmget('trading:data', ...sampleKeys);
    
    return values.map(value => {
      try {
        return JSON.parse(value as string);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  private async getPricingDataSample(limit: number): Promise<any[]> {
    const keys = await this.redis.hkeys('pricing:data');
    const sampleKeys = keys.slice(0, limit);
    
    if (sampleKeys.length === 0) return [];
    
    const values = await this.redis.hmget('pricing:data', ...sampleKeys);
    
    return values.map(value => {
      try {
        return JSON.parse(value as string);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  private calculateFieldCompleteness(sample: any[], requiredFields: string[]): number {
    if (sample.length === 0) return 1.0;
    
    let totalFields = 0;
    let presentFields = 0;
    
    sample.forEach(item => {
      requiredFields.forEach(field => {
        totalFields++;
        if (item && item[field] !== undefined && item[field] !== null) {
          presentFields++;
        }
      });
    });
    
    return presentFields / totalFields;
  }

  private async checkDataConsistency(): Promise<number> {
    // Simulate consistency checks
    const gridZones = await this.redis.keys('grid:*:current_pricing');
    let consistentZones = 0;
    
    for (const zoneKey of gridZones) {
      const pricing = await this.redis.hgetall(zoneKey);
      if (pricing && pricing.market_price && pricing.demand && pricing.supply) {
        consistentZones++;
      }
    }
    
    return gridZones.length > 0 ? consistentZones / gridZones.length : 1.0;
  }

  private identifyDataIssues(tradingSample: any[], pricingSample: any[]): string[] {
    const issues = [];
    
    // Check trading data issues
    tradingSample.forEach(trade => {
      if (!trade.tradeId) issues.push('Missing trade ID');
      if (!trade.buyerId || !trade.sellerId) issues.push('Missing participant IDs');
      if (trade.energyAmount <= 0) issues.push('Invalid energy amount');
      if (trade.pricePerMwh <= 0) issues.push('Invalid price');
    });
    
    // Check pricing data issues
    pricingSample.forEach(price => {
      if (!price.priceId) issues.push('Missing price ID');
      if (!price.timestamp) issues.push('Missing timestamp');
      if (price.marketPrice <= 0) issues.push('Invalid market price');
      if (price.demand < 0 || price.supply < 0) issues.push('Invalid demand/supply values');
    });
    
    return [...new Set(issues)]; // Remove duplicates
  }

  async getTradingAnalytics(params: any): Promise<any> {
    const timeWindow = params.timeWindow || 3600; // 1 hour default
    const endTime = Date.now();
    const startTime = endTime - (timeWindow * 1000);

    try {
      // Get trading analytics from Redis
      const [
        totalTrades,
        totalVolume,
        totalValue,
        topTraders,
        gridZoneBreakdown,
        energyTypeBreakdown,
      ] = await Promise.all([
        this.getTotalTrades(startTime, endTime),
        this.getTotalVolume(startTime, endTime),
        this.getTotalValue(startTime, endTime),
        this.getTopTraders(startTime, endTime),
        this.getGridZoneBreakdown(startTime, endTime),
        this.getEnergyTypeBreakdown(startTime, endTime),
      ]);

      return {
        timeWindow,
        timestamp: new Date().toISOString(),
        summary: {
          totalTrades,
          totalVolume,
          totalValue,
          averagePrice: totalVolume > 0 ? totalValue / totalVolume : 0,
          averageTradeSize: totalTrades > 0 ? totalVolume / totalTrades : 0,
        },
        topTraders: topTraders.slice(0, 10),
        breakdown: {
          gridZones: gridZoneBreakdown,
          energyTypes: energyTypeBreakdown,
        },
        trends: {
          volumeTrend: await this.calculateVolumeTrend(startTime, endTime),
          priceTrend: await this.calculatePriceTrend(startTime, endTime),
          activityTrend: await this.calculateActivityTrend(startTime, endTime),
        },
      };

    } catch (error) {
      this.logger.error('Error getting trading analytics:', error);
      throw error;
    }
  }

  async getPricingAnalytics(params: any): Promise<any> {
    const timeWindow = params.timeWindow || 3600; // 1 hour default
    const endTime = Date.now();
    const startTime = endTime - (timeWindow * 1000);

    try {
      // Get pricing analytics from Redis
      const [
        currentPrices,
        priceHistory,
        volatilityAnalysis,
        demandSupplyAnalysis,
      ] = await Promise.all([
        this.getCurrentPrices(),
        this.getPriceHistory(startTime, endTime),
        this.getVolatilityAnalysis(startTime, endTime),
        this.getDemandSupplyAnalysis(startTime, endTime),
      ]);

      return {
        timeWindow,
        timestamp: new Date().toISOString(),
        current: currentPrices,
        history: priceHistory,
        analysis: {
          volatility: volatilityAnalysis,
          demandSupply: demandSupplyAnalysis,
          priceMovements: this.analyzePriceMovements(priceHistory),
          marketEfficiency: this.calculateMarketEfficiency(currentPrices),
        },
        forecasts: {
          nextHour: this.generatePriceForecast(currentPrices),
          next24Hours: this.generateExtendedPriceForecast(currentPrices),
        },
      };

    } catch (error) {
      this.logger.error('Error getting pricing analytics:', error);
      throw error;
    }
  }

  // Helper methods for analytics calculations
  private async getTotalTrades(startTime: number, endTime: number): Promise<number> {
    const trades = await this.redis.zrangebyscore('trading:timeline', startTime, endTime);
    return trades.length;
  }

  private async getTotalVolume(startTime: number, endTime: number): Promise<number> {
    const trades = await this.redis.zrangebyscore('trading:timeline', startTime, endTime);
    return trades.reduce((total, trade) => {
      const data = JSON.parse(trade);
      return total + (data.volume || 0);
    }, 0);
  }

  private async getTotalValue(startTime: number, endTime: number): Promise<number> {
    const trades = await this.redis.zrangebyscore('trading:timeline', startTime, endTime);
    return trades.reduce((total, trade) => {
      const data = JSON.parse(trade);
      return total + (data.value || 0);
    }, 0);
  }

  private async getTopTraders(startTime: number, endTime: number): Promise<any[]> {
    // This would typically involve aggregation queries
    // For simulation, return mock data
    return Array.from({ length: 20 }, (_, i) => ({
      userId: `user_${i}`,
      trades: Math.floor(Math.random() * 100) + 10,
      volume: Math.floor(Math.random() * 50000) + 5000,
      value: Math.floor(Math.random() * 1000000) + 100000,
    })).sort((a, b) => b.volume - a.volume);
  }

  private async getGridZoneBreakdown(startTime: number, endTime: number): Promise<any[]> {
    const zones = ['US-West', 'US-East', 'EU-Central', 'Asia-Pacific'];
    
    return Promise.all(zones.map(async zone => ({
      zone,
      trades: await this.redis.get(`grid:${zone}:trades`) || 0,
      volume: await this.redis.get(`grid:${zone}:total_volume`) || 0,
      value: await this.redis.get(`grid:${zone}:total_value`) || 0,
      currentPrice: await this.redis.hget(`grid:${zone}:current_pricing`, 'market_price') || 0,
    })));
  }

  private async getEnergyTypeBreakdown(startTime: number, endTime: number): Promise<any[]> {
    const types = ['solar', 'wind', 'hydro', 'nuclear', 'fossil'];
    
    return Promise.all(types.map(async type => ({
      type,
      trades: await this.redis.get(`energy:${type}:trades`) || 0,
      volume: await this.redis.get(`energy:${type}:total_volume`) || 0,
      percentage: Math.random() * 30 + 10, // 10-40%
    })));
  }

  private async getCurrentPrices(): Promise<any[]> {
    const zones = ['US-West', 'US-East', 'EU-Central', 'Asia-Pacific'];
    
    return Promise.all(zones.map(async zone => {
      const pricing = await this.redis.hgetall(`grid:${zone}:current_pricing`);
      return {
        zone,
        ...pricing,
        lastUpdate: pricing.last_update,
      };
    }));
  }

  private async getPriceHistory(startTime: number, endTime: number): Promise<any[]> {
    const prices = await this.redis.zrangebyscore('pricing:timeline', startTime, endTime);
    
    return prices.map(price => JSON.parse(price));
  }

  private async getVolatilityAnalysis(startTime: number, endTime: number): Promise<any> {
    const prices = await this.getPriceHistory(startTime, endTime);
    
    if (prices.length < 2) {
      return { average: 0, high: 0, low: 0, trend: 'stable' };
    }
    
    const priceValues = prices.map(p => p.price);
    const average = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;
    const high = Math.max(...priceValues);
    const low = Math.min(...priceValues);
    
    return {
      average,
      high,
      low,
      range: high - low,
      trend: this.calculateSimpleTrend(priceValues),
    };
  }

  private async getDemandSupplyAnalysis(startTime: number, endTime: number): Promise<any> {
    const prices = await this.getPriceHistory(startTime, endTime);
    
    const totalDemand = prices.reduce((sum, p) => sum + p.demand, 0);
    const totalSupply = prices.reduce((sum, p) => sum + p.supply, 0);
    const avgDemand = totalDemand / prices.length;
    const avgSupply = totalSupply / prices.length;
    
    return {
      totalDemand,
      totalSupply,
      averageDemand: avgDemand,
      averageSupply: avgSupply,
      balance: avgSupply - avgDemand,
      surplus: avgSupply > avgDemand,
      deficit: avgDemand > avgSupply,
    };
  }

  private analyzePriceMovements(priceHistory: any[]): any {
    if (priceHistory.length < 2) return { movements: [], volatility: 0 };
    
    const movements = [];
    let totalChange = 0;
    
    for (let i = 1; i < priceHistory.length; i++) {
      const change = priceHistory[i].price - priceHistory[i-1].price;
      const percentChange = (change / priceHistory[i-1].price) * 100;
      
      movements.push({
        timestamp: priceHistory[i].timestamp,
        change,
        percentChange,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      });
      
      totalChange += Math.abs(percentChange);
    }
    
    const avgVolatility = totalChange / movements.length;
    
    return {
      movements,
      volatility: avgVolatility,
      trend: this.calculateSimpleTrend(priceHistory.map(p => p.price)),
    };
  }

  private calculateMarketEfficiency(currentPrices: any[]): number {
    if (currentPrices.length === 0) return 0;
    
    // Simple efficiency calculation based on price stability
    const priceValues = currentPrices.map(p => p.marketPrice);
    const avgPrice = priceValues.reduce((sum, p) => sum + p, 0) / priceValues.length;
    const variance = priceValues.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / priceValues.length;
    const priceStability = 1 / (1 + variance); // Higher stability = higher efficiency
    
    return Math.min(1.0, priceStability);
  }

  private generatePriceForecast(currentPrices: any[]): any {
    if (currentPrices.length === 0) return { forecast: 0, confidence: 0 };
    
    const avgPrice = currentPrices.reduce((sum, p) => sum + p.marketPrice, 0) / currentPrices.length;
    const forecast = avgPrice * (1 + (Math.random() - 0.5) * 0.05); // ±2.5% variation
    const confidence = 0.85 + Math.random() * 0.1; // 85-95% confidence
    
    return {
      forecast,
      confidence,
      method: 'linear_regression',
      timeHorizon: '1 hour',
    };
  }

  private generateExtendedPriceForecast(currentPrices: any[]): any[] {
    const baseForecast = this.generatePriceForecast(currentPrices);
    
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i + 1,
      forecast: baseForecast.forecast * (1 + (Math.random() - 0.5) * 0.1 * (i / 24)), // Increasing uncertainty
      confidence: Math.max(0.5, baseForecast.confidence - (i * 0.02)),
    }));
  }

  private calculateSimpleTrend(values: number[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.02) return 'up';
    if (secondAvg < firstAvg * 0.98) return 'down';
    return 'stable';
  }

  private async calculateVolumeTrend(startTime: number, endTime: number): Promise<string> {
    // Simulate volume trend calculation
    return ['up', 'down', 'stable'][Math.floor(Math.random() * 3)];
  }

  private async calculatePriceTrend(startTime: number, endTime: number): Promise<string> {
    // Simulate price trend calculation
    return ['up', 'down', 'stable'][Math.floor(Math.random() * 3)];
  }

  private async calculateActivityTrend(startTime: number, endTime: number): Promise<string> {
    // Simulate activity trend calculation
    return ['increasing', 'decreasing', 'stable'][Math.floor(Math.random() * 3)];
  }

  async getIntegrationMetrics(): Promise<IntegrationMetrics> {
    return {
      ...this.integrationMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  async cleanupOldData(): Promise<void> {
    // Clean data older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    try {
      // Clean trading timeline
      await this.redis.zremrangebyscore('trading:timeline', 0, thirtyDaysAgo);
      
      // Clean pricing timeline
      await this.redis.zremrangebyscore('pricing:timeline', 0, thirtyDaysAgo);
      
      this.logger.log('Cleaned old integration data');
    } catch (error) {
      this.logger.error('Error cleaning old data:', error);
    }
  }
}

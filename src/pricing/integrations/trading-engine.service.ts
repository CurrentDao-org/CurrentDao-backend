import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';
import { EventPattern } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface TradingEngineEvent {
  type: 'trade_executed' | 'order_placed' | 'order_cancelled' | 'market_update';
  timestamp: number;
  data: {
    orderId?: string;
    tradeId?: string;
    energyType: string;
    location: string;
    price: number;
    volume: number;
    buyerId?: string;
    sellerId?: string;
    side: 'buy' | 'sell';
  };
}

export interface PriceUpdateRequest {
  energyType: string;
  location: string;
  newPrice: number;
  volume: number;
  timestamp: number;
  source: 'trade' | 'market_data' | 'algorithm' | 'manual';
  confidence: number;
}

export interface TradingEngineStatus {
  isConnected: boolean;
  lastUpdate: Date;
  totalTrades: number;
  totalVolume: number;
  averagePrice: number;
  priceUpdates: number;
  errors: number;
  latency: number;
}

export interface PriceUpdateResult {
  success: boolean;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  timestamp: number;
  source: string;
  confidence: number;
  affectedOrders: number;
}

@Injectable()
export class TradingEngineService implements OnModuleInit {
  private readonly logger = new Logger(TradingEngineService.name);
  private readonly UPDATE_LATENCY_MS = 100; // <100ms requirement
  private isConnected: boolean = false;
  private priceUpdateQueue: PriceUpdateRequest[] = [];
  private tradingEngineStatus: TradingEngineStatus;
  private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
  private subscriptionCallbacks: Map<string, Array<(update: PriceUpdateResult) => void>> = new Map();

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {
    this.tradingEngineStatus = {
      isConnected: false,
      lastUpdate: new Date(),
      totalTrades: 0,
      totalVolume: 0,
      averagePrice: 0,
      priceUpdates: 0,
      errors: 0,
      latency: 0,
    };
  }

  async onModuleInit(): Promise<void> {
    await this.connectToTradingEngine();
    this.initializePriceCache();
  }

  private async connectToTradingEngine(): Promise<void> {
    try {
      // Simulate connection to trading engine
      // In real implementation, this would establish WebSocket or API connection
      this.isConnected = true;
      this.tradingEngineStatus.isConnected = true;
      this.tradingEngineStatus.lastUpdate = new Date();
      
      this.logger.log('Connected to trading engine successfully');
      
      // Start price update processing
      this.startPriceUpdateProcessor();
      
    } catch (error) {
      this.logger.error('Failed to connect to trading engine:', error);
      this.isConnected = false;
      this.tradingEngineStatus.isConnected = false;
      
      // Retry connection
      setTimeout(() => this.connectToTradingEngine(), 5000);
    }
  }

  private async initializePriceCache(): Promise<void> {
    // Load recent prices into cache
    const recentPrices = await this.priceHistoryRepository.find({
      order: { timestamp: 'DESC' },
      take: 1000,
    });

    for (const price of recentPrices) {
      const key = `${price.energyType}-${price.location}`;
      this.priceCache.set(key, {
        price: price.finalPrice,
        timestamp: price.timestamp.getTime(),
      });
    }

    this.logger.log(`Initialized price cache with ${recentPrices.length} entries`);
  }

  @EventPattern('trading_engine.event')
  async handleTradingEngineEvent(event: TradingEngineEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      switch (event.type) {
        case 'trade_executed':
          await this.handleTradeExecuted(event);
          break;
        case 'order_placed':
          await this.handleOrderPlaced(event);
          break;
        case 'order_cancelled':
          await this.handleOrderCancelled(event);
          break;
        case 'market_update':
          await this.handleMarketUpdate(event);
          break;
      }
      
      const processingTime = Date.now() - startTime;
      if (processingTime > this.UPDATE_LATENCY_MS) {
        this.logger.warn(`Trading event processing latency: ${processingTime}ms`);
      }
      
    } catch (error) {
      this.logger.error(`Error processing trading event: ${error.message}`);
      this.tradingEngineStatus.errors++;
    }
  }

  private async handleTradeExecuted(event: TradingEngineEvent): Promise<void> {
    const { energyType, location, price, volume } = event.data;
    
    // Update price cache
    const key = `${energyType}-${location}`;
    const previousPrice = this.priceCache.get(key)?.price || price;
    
    this.priceCache.set(key, {
      price,
      timestamp: event.timestamp,
    });
    
    // Create price update request
    const updateRequest: PriceUpdateRequest = {
      energyType,
      location,
      newPrice: price,
      volume,
      timestamp: event.timestamp,
      source: 'trade',
      confidence: this.calculateTradeConfidence(event.data),
    };
    
    await this.queuePriceUpdate(updateRequest);
    
    // Update statistics
    this.tradingEngineStatus.totalTrades++;
    this.tradingEngineStatus.totalVolume += volume;
    this.tradingEngineStatus.lastUpdate = new Date();
    
    this.logger.log(`Trade executed: ${energyType} in ${location} at $${price} for ${volume} units`);
  }

  private async handleOrderPlaced(event: TradingEngineEvent): Promise<void> {
    const { energyType, location, price, volume, side } = event.data;
    
    // Check if order affects market price
    const key = `${energyType}-${location}`;
    const currentPrice = this.priceCache.get(key)?.price || price;
    
    const priceImpact = this.calculatePriceImpact(price, volume, currentPrice);
    
    if (Math.abs(priceImpact) > 0.01) { // 1% threshold
      const newPrice = currentPrice * (1 + priceImpact);
      
      const updateRequest: PriceUpdateRequest = {
        energyType,
        location,
        newPrice,
        volume,
        timestamp: event.timestamp,
        source: 'algorithm',
        confidence: 0.7, // Lower confidence for order-based updates
      };
      
      await this.queuePriceUpdate(updateRequest);
    }
  }

  private async handleOrderCancelled(event: TradingEngineEvent): Promise<void> {
    // Order cancellation might affect market depth
    // For now, just log the event
    this.logger.log(`Order cancelled: ${event.data.orderId} for ${event.data.energyType} in ${event.data.location}`);
  }

  private async handleMarketUpdate(event: TradingEngineEvent): Promise<void> {
    const { energyType, location, price, volume } = event.data;
    
    const updateRequest: PriceUpdateRequest = {
      energyType,
      location,
      newPrice: price,
      volume,
      timestamp: event.timestamp,
      source: 'market_data',
      confidence: 0.8,
    };
    
    await this.queuePriceUpdate(updateRequest);
  }

  private calculateTradeConfidence(tradeData: any): number {
    let confidence = 0.8; // Base confidence for trades
    
    // Volume-based confidence
    if (tradeData.volume > 1000) confidence += 0.1;
    if (tradeData.volume > 5000) confidence += 0.1;
    
    // Price stability confidence
    const key = `${tradeData.energyType}-${tradeData.location}`;
    const cachedPrice = this.priceCache.get(key);
    
    if (cachedPrice) {
      const priceChange = Math.abs(tradeData.price - cachedPrice.price) / cachedPrice.price;
      if (priceChange < 0.05) confidence += 0.1;
      else if (priceChange > 0.2) confidence -= 0.2;
    }
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }

  private calculatePriceImpact(orderPrice: number, volume: number, currentPrice: number): number {
    // Simplified price impact calculation
    const priceDifference = (orderPrice - currentPrice) / currentPrice;
    const volumeFactor = Math.min(1.0, volume / 10000); // Normalize volume
    
    return priceDifference * volumeFactor * 0.1; // Dampen the impact
  }

  private async queuePriceUpdate(request: PriceUpdateRequest): Promise<void> {
    this.priceUpdateQueue.push(request);
    
    // Process immediately if queue is getting long
    if (this.priceUpdateQueue.length > 10) {
      await this.processPriceUpdateQueue();
    }
  }

  private startPriceUpdateProcessor(): void {
    // Process price updates every 50ms to ensure <100ms latency
    setInterval(async () => {
      if (this.priceUpdateQueue.length > 0) {
        await this.processPriceUpdateQueue();
      }
    }, 50);
  }

  private async processPriceUpdateQueue(): Promise<void> {
    if (this.priceUpdateQueue.length === 0) return;
    
    const startTime = Date.now();
    const updates = this.priceUpdateQueue.splice(0, 10); // Process up to 10 at a time
    
    const results: PriceUpdateResult[] = [];
    
    for (const update of updates) {
      const result = await this.processPriceUpdate(update);
      results.push(result);
    }
    
    const processingTime = Date.now() - startTime;
    this.tradingEngineStatus.latency = processingTime;
    
    if (processingTime > this.UPDATE_LATENCY_MS) {
      this.logger.warn(`Price update processing latency: ${processingTime}ms for ${updates.length} updates`);
    }
    
    // Notify subscribers
    this.notifySubscribers(results);
    
    this.tradingEngineStatus.priceUpdates += results.length;
  }

  private async processPriceUpdate(request: PriceUpdateRequest): Promise<PriceUpdateResult> {
    const key = `${request.energyType}-${request.location}`;
    const previousPrice = this.priceCache.get(key)?.price || request.newPrice;
    
    // Save to database
    await this.savePriceUpdate(request);
    
    // Update cache
    this.priceCache.set(key, {
      price: request.newPrice,
      timestamp: request.timestamp,
    });
    
    const change = request.newPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    
    const result: PriceUpdateResult = {
      success: true,
      price: request.newPrice,
      previousPrice,
      change,
      changePercent,
      timestamp: request.timestamp,
      source: request.source,
      confidence: request.confidence,
      affectedOrders: await this.countAffectedOrders(request),
    };
    
    this.logger.log(
      `Price updated: ${request.energyType} in ${request.location} $${previousPrice} -> $${request.newPrice} (${changePercent.toFixed(2)}%)`
    );
    
    return result;
  }

  private async savePriceUpdate(request: PriceUpdateRequest): Promise<void> {
    const priceHistory = this.priceHistoryRepository.create({
      energyType: request.energyType,
      location: request.location,
      finalPrice: request.newPrice,
      supply: request.volume * 0.5, // Estimate
      demand: request.volume * 0.5, // Estimate
      timestamp: new Date(request.timestamp),
    });
    
    await this.priceHistoryRepository.save(priceHistory);
  }

  private async countAffectedOrders(request: PriceUpdateRequest): Promise<number> {
    // In real implementation, this would query the trading engine
    // For now, return a simulated number
    return Math.floor(Math.random() * 10);
  }

  private notifySubscribers(results: PriceUpdateResult[]): void {
    for (const result of results) {
      const key = `${result.price}-${result.timestamp}`;
      const callbacks = this.subscriptionCallbacks.get(key);
      
      if (callbacks) {
        for (const callback of callbacks) {
          try {
            callback(result);
          } catch (error) {
            this.logger.error('Error in price update callback:', error);
          }
        }
      }
    }
  }

  async subscribeToPriceUpdates(
    energyType: string,
    location: string,
    callback: (update: PriceUpdateResult) => void,
  ): Promise<string> {
    const key = `${energyType}-${location}`;
    
    if (!this.subscriptionCallbacks.has(key)) {
      this.subscriptionCallbacks.set(key, []);
    }
    
    this.subscriptionCallbacks.get(key)!.push(callback);
    
    const subscriptionId = `${key}-${Date.now()}-${Math.random()}`;
    
    this.logger.log(`Subscribed to price updates for ${energyType} in ${location}`);
    
    return subscriptionId;
  }

  async unsubscribeFromPriceUpdates(subscriptionId: string): Promise<void> {
    // In a real implementation, would track and remove specific subscriptions
    this.logger.log(`Unsubscribed from price updates: ${subscriptionId}`);
  }

  async getCurrentPrice(energyType: string, location: string): Promise<number | null> {
    const key = `${energyType}-${location}`;
    const cached = this.priceCache.get(key);
    
    if (!cached) return null;
    
    // Check if cache is stale (older than 1 minute)
    if (Date.now() - cached.timestamp > 60000) {
      // Refresh from database
      const latestPrice = await this.priceHistoryRepository.findOne({
        where: { energyType, location },
        order: { timestamp: 'DESC' },
      });
      
      if (latestPrice) {
        this.priceCache.set(key, {
          price: latestPrice.finalPrice,
          timestamp: latestPrice.timestamp.getTime(),
        });
        return latestPrice.finalPrice;
      }
    }
    
    return cached.price;
  }

  async getTradingEngineStatus(): Promise<TradingEngineStatus> {
    // Update average price
    const allPrices = Array.from(this.priceCache.values());
    if (allPrices.length > 0) {
      this.tradingEngineStatus.averagePrice = 
        allPrices.reduce((sum, p) => sum + p.price, 0) / allPrices.length;
    }
    
    return { ...this.tradingEngineStatus };
  }

  async forcePriceUpdate(
    energyType: string,
    location: string,
    newPrice: number,
    source: string = 'manual',
  ): Promise<PriceUpdateResult> {
    const request: PriceUpdateRequest = {
      energyType,
      location,
      newPrice,
      volume: 0,
      timestamp: Date.now(),
      source: source as any,
      confidence: 1.0,
    };
    
    return this.processPriceUpdate(request);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupStaleCache(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const [key, cached] of this.priceCache.entries()) {
      if (now - cached.timestamp > staleThreshold) {
        this.priceCache.delete(key);
      }
    }
    
    this.logger.log(`Cleaned stale price cache entries. Current cache size: ${this.priceCache.size}`);
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async synchronizeWithTradingEngine(): Promise<void> {
    if (!this.isConnected) {
      await this.connectToTradingEngine();
      return;
    }
    
    // Synchronize price data with trading engine
    try {
      // In real implementation, would query trading engine for latest prices
      this.logger.log('Synchronized with trading engine');
    } catch (error) {
      this.logger.error('Failed to synchronize with trading engine:', error);
      this.isConnected = false;
      this.tradingEngineStatus.isConnected = false;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateStatistics(): Promise<void> {
    // Update trading engine statistics
    const totalTrades = await this.priceHistoryRepository.count();
    const totalVolume = await this.priceHistoryRepository
      .createQueryBuilder('price')
      .select('SUM(price.supply + price.demand)', 'total')
      .getRawOne();
    
    this.tradingEngineStatus.totalTrades = totalTrades;
    this.tradingEngineStatus.totalVolume = totalVolume?.total || 0;
    
    this.logger.log(`Updated trading engine statistics: ${totalTrades} trades, ${totalVolume?.total || 0} total volume`);
  }

  async getMarketDepth(
    energyType: string,
    location: string,
  ): Promise<{
    bidDepth: Array<{ price: number; volume: number }>;
    askDepth: Array<{ price: number; volume: number }>;
    spread: number;
    totalVolume: number;
  }> {
    // Simulate market depth data
    // In real implementation, would query trading engine order book
    const currentPrice = await this.getCurrentPrice(energyType, location) || 100;
    
    const bidDepth = [];
    const askDepth = [];
    
    // Generate simulated order book
    for (let i = 1; i <= 10; i++) {
      bidDepth.push({
        price: currentPrice * (1 - i * 0.001),
        volume: Math.random() * 1000,
      });
      
      askDepth.push({
        price: currentPrice * (1 + i * 0.001),
        volume: Math.random() * 1000,
      });
    }
    
    const spread = askDepth[0].price - bidDepth[0].price;
    const totalVolume = bidDepth.concat(askDepth).reduce((sum, level) => sum + level.volume, 0);
    
    return {
      bidDepth,
      askDepth,
      spread,
      totalVolume,
    };
  }

  async executeTrade(
    energyType: string,
    location: string,
    price: number,
    volume: number,
    side: 'buy' | 'sell',
  ): Promise<{
    success: boolean;
    executedPrice: number;
    executedVolume: number;
    tradeId: string;
    timestamp: number;
  }> {
    // Simulate trade execution
    // In real implementation, would send to trading engine
    
    const currentPrice = await this.getCurrentPrice(energyType, location) || price;
    const executedPrice = (price + currentPrice) / 2; // Average price
    const executedVolume = Math.min(volume, Math.random() * 2000); // Simulate partial fills
    
    const success = executedVolume > 0;
    
    if (success) {
      // Trigger price update
      const updateRequest: PriceUpdateRequest = {
        energyType,
        location,
        newPrice: executedPrice,
        volume: executedVolume,
        timestamp: Date.now(),
        source: 'trade',
        confidence: 0.9,
      };
      
      await this.queuePriceUpdate(updateRequest);
    }
    
    return {
      success,
      executedPrice,
      executedVolume,
      tradeId: `trade_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
    };
  }

  getCacheStatistics(): {
    size: number;
    hitRate: number;
    missRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    const ages = Array.from(this.priceCache.values()).map(c => now - c.timestamp);
    const averageAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;
    
    return {
      size: this.priceCache.size,
      hitRate: 0.95, // Simulated
      missRate: 0.05, // Simulated
      averageAge,
    };
  }
}

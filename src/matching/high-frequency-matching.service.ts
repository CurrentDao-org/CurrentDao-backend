import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderType, OrderStatus } from './entities/order.entity';
import { Trade } from './entities/trade.entity';
import { OrderBook } from './entities/order-book.entity';
import { FifoAlgorithmService } from './algorithms/fifo-algorithm.service';
import { ProRataAlgorithmService } from './algorithms/pro-rata-algorithm.service';
import { LiquidityOptimizerService } from './liquidity/liquidity-optimizer.service';
import { PriorityQueueService } from './queues/priority-queue.service';
import { MatchingAnalyticsService } from './monitoring/matching-analytics.service';
import { MatchingAlgorithm, MatchingRequestDto, MatchingResultDto } from './dto/matching.dto';
import { PricingService } from '../pricing/pricing.service';

export interface HighFrequencyMatchingResult {
  success: boolean;
  trades: Trade[];
  updatedOrders: Order[];
  processingTimeMs: number;
  ordersPerSecond: number;
  liquidityMetrics: any;
  alerts: any[];
}

@Injectable()
export class HighFrequencyMatchingService implements OnModuleInit {
  private readonly logger = new Logger(HighFrequencyMatchingService.name);
  
  // Performance tracking
  private performanceMetrics = {
    totalOrdersProcessed: 0,
    totalTradesGenerated: 0,
    averageLatency: 0,
    peakThroughput: 0,
    lastProcessingTime: 0
  };

  // Anti-manipulation tracking
  private userOrderHistory = new Map<string, Array<{ timestamp: number; orderId: string }>>();
  private priceAnomalyDetector = new Map<string, number[]>();

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(OrderBook)
    private readonly orderBookRepository: Repository<OrderBook>,
    private readonly dataSource: DataSource,
    private readonly fifoAlgorithm: FifoAlgorithmService,
    private readonly proRataAlgorithm: ProRataAlgorithmService,
    private readonly liquidityOptimizer: LiquidityOptimizerService,
    private readonly priorityQueue: PriorityQueueService,
    private readonly analytics: MatchingAnalyticsService,
    private readonly pricingService: PricingService
  ) {}

  async onModuleInit() {
    this.logger.log('High-frequency matching service initialized');
    await this.initializeOrderBooks();
    this.startPerformanceMonitoring();
  }

  private async initializeOrderBooks(): Promise<void> {
    // Initialize order books for all active symbols
    const symbols = await this.getActiveSymbols();
    
    for (const symbol of symbols) {
      const orderBook = await this.orderBookRepository.findOne({ where: { symbol } });
      if (!orderBook) {
        const newOrderBook = new OrderBook();
        newOrderBook.symbol = symbol;
        newOrderBook.buyOrders = [];
        newOrderBook.sellOrders = [];
        newOrderBook.lastUpdate = Date.now();
        await this.orderBookRepository.save(newOrderBook);
      }
    }
    
    this.logger.log(`Initialized order books for ${symbols.length} symbols`);
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.checkSystemHealth();
    }, 1000);
  }

  async processMatchingRequest(request: MatchingRequestDto): Promise<MatchingResultDto> {
    const startTime = performance.now();
    
    try {
      // Get orders from priority queues
      const { buyOrders, sellOrders } = this.priorityQueue.getNextOrders(
        request.symbol, 
        request.maxOrdersPerMatch
      );

      if (buyOrders.length === 0 || sellOrders.length === 0) {
        return this.createEmptyResult(request, startTime);
      }

      // Apply liquidity optimization if enabled
      let optimizedBuyOrders = buyOrders;
      let optimizedSellOrders = sellOrders;
      
      if (request.enableLiquidityOptimization) {
        const optimizationResult = await this.liquidityOptimizer.optimizeLiquidity(
          buyOrders,
          sellOrders,
          request.symbol
        );
        optimizedBuyOrders = optimizationResult.optimizedBuyOrders;
        optimizedSellOrders = optimizationResult.optimizedSellOrders;
      }

      // Apply anti-manipulation checks if enabled
      if (request.enableAntiManipulation) {
        const manipulationCheck = await this.detectManipulationPatterns(
          optimizedBuyOrders,
          optimizedSellOrders,
          request.symbol
        );
        
        if (manipulationCheck.hasManipulation) {
          this.logger.warn(`Manipulation patterns detected for ${request.symbol}: ${manipulationCheck.patterns.join(', ')}`);
          // Apply countermeasures
          optimizedBuyOrders = this.applyAntiManipulationMeasures(optimizedBuyOrders, manipulationCheck);
          optimizedSellOrders = this.applyAntiManipulationMeasures(optimizedSellOrders, manipulationCheck);
        }
      }

      // Get current market price from pricing service
      const marketPrice = await this.getCurrentMarketPrice(request.symbol);

      // Execute matching algorithm
      const matchingResult = await this.executeMatchingAlgorithm(
        optimizedBuyOrders,
        optimizedSellOrders,
        request.algorithm,
        request.symbol,
        request.maxOrdersPerMatch,
        request.timeoutMs
      );

      // Validate trades against market price
      const validatedTrades = await this.validateTradesAgainstMarketPrice(
        matchingResult.trades,
        marketPrice,
        request.symbol
      );

      // Save trades and update orders
      const savedTrades = await this.saveTrades(validatedTrades);
      await this.updateOrders(matchingResult.updatedOrders);

      // Update order book
      await this.updateOrderBook(request.symbol, matchingResult.updatedOrders, savedTrades);

      // Mark orders as processed in priority queue
      this.priorityQueue.markOrdersProcessed(matchingResult.updatedOrders);

      // Record analytics
      const processingTime = performance.now() - startTime;
      this.analytics.recordMatchingEvent(
        request.symbol,
        [...optimizedBuyOrders, ...optimizedSellOrders],
        savedTrades,
        processingTime
      );

      // Update performance metrics
      this.updatePerformanceStats(optimizedBuyOrders.length + optimizedSellOrders.length, savedTrades.length, processingTime);

      // Generate liquidity metrics
      const liquidityMetrics = this.fifoAlgorithm.calculateLiquidityMetrics(
        savedTrades,
        optimizedBuyOrders,
        optimizedSellOrders
      );

      const result: MatchingResultDto = {
        success: true,
        symbol: request.symbol,
        algorithm: request.algorithm,
        processedOrders: optimizedBuyOrders.length + optimizedSellOrders.length,
        matchedOrders: matchingResult.updatedOrders.length,
        totalTrades: savedTrades.length,
        totalVolume: savedTrades.reduce((sum, trade) => sum + trade.totalAmount, 0),
        averagePrice: savedTrades.length > 0 
          ? savedTrades.reduce((sum, trade) => sum + trade.price, 0) / savedTrades.length 
          : 0,
        processingTimeMs: processingTime,
        trades: savedTrades.map(trade => ({
          id: trade.id,
          buyOrderId: trade.buyOrderId,
          sellOrderId: trade.sellOrderId,
          quantity: trade.quantity,
          price: trade.price,
          totalAmount: trade.totalAmount,
          timestamp: trade.timestamp
        })),
        unmatchedOrders: matchingResult.unmatchedOrders.map(order => ({
          orderId: order.id,
          reason: 'No matching counterpart found'
        })),
        liquidityMetrics
      };

      this.logger.log(
        `Matching completed for ${request.symbol}: ${result.processedOrders} orders, ` +
        `${result.totalTrades} trades, ${processingTime.toFixed(2)}ms latency`
      );

      return result;

    } catch (error) {
      this.logger.error(`Error during matching for ${request.symbol}`, error);
      return this.createErrorResult(request, error, performance.now() - startTime);
    }
  }

  private async executeMatchingAlgorithm(
    buyOrders: Order[],
    sellOrders: Order[],
    algorithm: MatchingAlgorithm,
    symbol: string,
    maxOrdersPerMatch: number,
    timeoutMs: number
  ): Promise<any> {
    switch (algorithm) {
      case MatchingAlgorithm.FIFO:
        return await this.fifoAlgorithm.matchOrders(buyOrders, sellOrders, symbol, maxOrdersPerMatch, timeoutMs);
      
      case MatchingAlgorithm.PRO_RATA:
        return await this.proRataAlgorithm.matchOrders(buyOrders, sellOrders, symbol, maxOrdersPerMatch, timeoutMs);
      
      default:
        return await this.fifoAlgorithm.matchOrders(buyOrders, sellOrders, symbol, maxOrdersPerMatch, timeoutMs);
    }
  }

  private async getCurrentMarketPrice(symbol: string): Promise<number> {
    try {
      // Integrate with existing pricing service
      const pricingData = await this.pricingService.calculatePrice({
        supply: 1000, // Default values, should be calculated from order book
        demand: 1000,
        location: 'default',
        energyType: 'electricity',
        timestamp: Date.now()
      });
      
      return pricingData.finalPrice;
    } catch (error) {
      this.logger.warn(`Failed to get market price for ${symbol}, using fallback`);
      return 0; // Fallback price
    }
  }

  private async validateTradesAgainstMarketPrice(
    trades: Trade[],
    marketPrice: number,
    symbol: string
  ): Promise<Trade[]> {
    if (marketPrice === 0) return trades; // Skip validation if no market price

    const priceDeviationThreshold = 0.05; // 5% deviation threshold
    const validatedTrades: Trade[] = [];

    for (const trade of trades) {
      const priceDeviation = Math.abs(trade.price - marketPrice) / marketPrice;
      
      if (priceDeviation <= priceDeviationThreshold) {
        validatedTrades.push(trade);
      } else {
        this.logger.warn(
          `Trade rejected for ${symbol}: price deviation ${(priceDeviation * 100).toFixed(2)}% ` +
          `exceeds threshold (trade price: ${trade.price}, market price: ${marketPrice})`
        );
      }
    }

    return validatedTrades;
  }

  private async detectManipulationPatterns(
    buyOrders: Order[],
    sellOrders: Order[],
    symbol: string
  ): Promise<{ hasManipulation: boolean; patterns: string[] }> {
    const patterns: string[] = [];
    
    // Check for spoofing (large orders that are quickly cancelled)
    const spoofingPattern = this.detectSpoofing(buyOrders, sellOrders);
    if (spoofingPattern) {
      patterns.push(spoofingPattern);
    }
    
    // Check for wash trading (matching orders from same user)
    const washTradingPattern = this.detectWashTrading(buyOrders, sellOrders);
    if (washTradingPattern) {
      patterns.push(washTradingPattern);
    }
    
    // Check for layering (multiple orders at different price levels)
    const layeringPattern = this.detectLayering(buyOrders, sellOrders);
    if (layeringPattern) {
      patterns.push(layeringPattern);
    }
    
    // Check for unusual price patterns
    const priceAnomalyPattern = this.detectPriceAnomalies(buyOrders, sellOrders, symbol);
    if (priceAnomalyPattern) {
      patterns.push(priceAnomalyPattern);
    }

    return {
      hasManipulation: patterns.length > 0,
      patterns
    };
  }

  private detectSpoofing(buyOrders: Order[], sellOrders: Order[]): string | null {
    // Check for unusually large orders that might be spoofing
    const allOrders = [...buyOrders, ...sellOrders];
    const avgOrderSize = allOrders.reduce((sum, order) => sum + order.quantity, 0) / allOrders.length;
    
    const largeOrders = allOrders.filter(order => order.quantity > avgOrderSize * 10);
    
    if (largeOrders.length > 0) {
      return 'POTENTIAL_SPOOFING: Unusually large orders detected';
    }
    
    return null;
  }

  private detectWashTrading(buyOrders: Order[], sellOrders: Order[]): string | null {
    // Check for orders from same user that could match
    const userOrders = new Map<string, { buy: Order[]; sell: Order[] }>();
    
    [...buyOrders, ...sellOrders].forEach(order => {
      if (!userOrders.has(order.userId)) {
        userOrders.set(order.userId, { buy: [], sell: [] });
      }
      
      const userOrderSet = userOrders.get(order.userId)!;
      if (order.type === OrderType.BUY) {
        userOrderSet.buy.push(order);
      } else {
        userOrderSet.sell.push(order);
      }
    });
    
    for (const [userId, orders] of userOrders.entries()) {
      if (orders.buy.length > 0 && orders.sell.length > 0) {
        return `POTENTIAL_WASH_TRADING: User ${userId} has both buy and sell orders`;
      }
    }
    
    return null;
  }

  private detectLayering(buyOrders: Order[], sellOrders: Order[]): string | null {
    // Check for multiple orders from same user at different price levels
    const userPriceLevels = new Map<string, Set<number>>();
    
    [...buyOrders, ...sellOrders].forEach(order => {
      if (!userPriceLevels.has(order.userId)) {
        userPriceLevels.set(order.userId, new Set());
      }
      userPriceLevels.get(order.userId)!.add(Math.floor(order.price * 100)); // Group by 2 decimal places
    });
    
    for (const [userId, priceLevels] of userPriceLevels.entries()) {
      if (priceLevels.size > 5) {
        return `POTENTIAL_LAYERING: User ${userId} has orders at ${priceLevels.size} price levels`;
      }
    }
    
    return null;
  }

  private detectPriceAnomalies(buyOrders: Order[], sellOrders: Order[], symbol: string): string | null {
    const allOrders = [...buyOrders, ...sellOrders];
    const prices = allOrders.map(order => order.price);
    
    if (prices.length < 3) return null;
    
    // Calculate price statistics
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    
    // Check for prices that are more than 3 standard deviations from mean
    const outliers = prices.filter(price => Math.abs(price - avgPrice) > 3 * stdDev);
    
    if (outliers.length > 0) {
      return `PRICE_ANOMALY: ${outliers.length} prices deviate significantly from market`;
    }
    
    return null;
  }

  private applyAntiManipulationMeasures(
    orders: Order[], 
    manipulationCheck: { hasManipulation: boolean; patterns: string[] }
  ): Order[] {
    if (!manipulationCheck.hasManipulation) return orders;
    
    // Apply various countermeasures based on detected patterns
    let filteredOrders = [...orders];
    
    if (manipulationCheck.patterns.some(pattern => pattern.includes('SPOOFING'))) {
      // Remove unusually large orders
      const avgOrderSize = filteredOrders.reduce((sum, order) => sum + order.quantity, 0) / filteredOrders.length;
      filteredOrders = filteredOrders.filter(order => order.quantity <= avgOrderSize * 5);
    }
    
    if (manipulationCheck.patterns.some(pattern => pattern.includes('LAYERING'))) {
      // Limit orders per user per price level
      const userPriceLevelCounts = new Map<string, Map<number, number>>();
      
      filteredOrders.forEach(order => {
        if (!userPriceLevelCounts.has(order.userId)) {
          userPriceLevelCounts.set(order.userId, new Map());
        }
        const priceLevel = Math.floor(order.price * 100);
        const count = userPriceLevelCounts.get(order.userId)!.get(priceLevel) || 0;
        userPriceLevelCounts.get(order.userId)!.set(priceLevel, count + 1);
      });
      
      filteredOrders = filteredOrders.filter(order => {
        const priceLevel = Math.floor(order.price * 100);
        const count = userPriceLevelCounts.get(order.userId)!.get(priceLevel) || 0;
        return count <= 3; // Max 3 orders per user per price level
      });
    }
    
    return filteredOrders;
  }

  private async saveTrades(trades: Trade[]): Promise<Trade[]> {
    if (trades.length === 0) return [];
    
    try {
      return await this.tradeRepository.save(trades);
    } catch (error) {
      this.logger.error('Failed to save trades', error);
      throw error;
    }
  }

  private async updateOrders(orders: Order[]): Promise<void> {
    if (orders.length === 0) return;
    
    try {
      await this.orderRepository.save(orders);
    } catch (error) {
      this.logger.error('Failed to update orders', error);
      throw error;
    }
  }

  private async updateOrderBook(symbol: string, updatedOrders: Order[], trades: Trade[]): Promise<void> {
    try {
      const orderBook = await this.orderBookRepository.findOne({ where: { symbol } });
      if (!orderBook) return;
      
      // Update order book with new order statuses and trades
      // This is a simplified implementation - in production, you'd want more sophisticated order book management
      
      orderBook.lastUpdate = Date.now();
      await this.orderBookRepository.save(orderBook);
    } catch (error) {
      this.logger.error('Failed to update order book', error);
    }
  }

  private async getActiveSymbols(): Promise<string[]> {
    // Get unique symbols from existing orders
    const result = await this.orderRepository
      .createQueryBuilder('order')
      .select('DISTINCT order.symbol', 'symbol')
      .getRawMany();
    
    return result.map(row => row.symbol);
  }

  private updatePerformanceStats(ordersProcessed: number, tradesGenerated: number, processingTime: number): void {
    this.performanceMetrics.totalOrdersProcessed += ordersProcessed;
    this.performanceMetrics.totalTradesGenerated += tradesGenerated;
    this.performanceMetrics.lastProcessingTime = processingTime;
    
    // Calculate average latency
    this.performanceMetrics.averageLatency = 
      (this.performanceMetrics.averageLatency + processingTime) / 2;
    
    // Calculate throughput (orders per second)
    const currentThroughput = ordersProcessed / (processingTime / 1000);
    if (currentThroughput > this.performanceMetrics.peakThroughput) {
      this.performanceMetrics.peakThroughput = currentThroughput;
    }
  }

  private updatePerformanceMetrics(): void {
    // This method can be extended to track more detailed metrics
    // and send them to monitoring systems
  }

  private checkSystemHealth(): void {
    // Check if system is meeting performance requirements
    if (this.performanceMetrics.averageLatency > 100) { // 100ms threshold
      this.logger.warn(`High latency detected: ${this.performanceMetrics.averageLatency.toFixed(2)}ms`);
    }
    
    if (this.performanceMetrics.peakThroughput < 1000) { // 1000 orders/sec threshold
      this.logger.warn(`Low throughput detected: ${this.performanceMetrics.peakThroughput.toFixed(2)} orders/sec`);
    }
  }

  private createEmptyResult(request: MatchingRequestDto, startTime: number): MatchingResultDto {
    const processingTime = performance.now() - startTime;
    
    return {
      success: true,
      symbol: request.symbol,
      algorithm: request.algorithm,
      processedOrders: 0,
      matchedOrders: 0,
      totalTrades: 0,
      totalVolume: 0,
      averagePrice: 0,
      processingTimeMs: processingTime,
      trades: [],
      unmatchedOrders: []
    };
  }

  private createErrorResult(request: MatchingRequestDto, error: any, processingTime: number): MatchingResultDto {
    return {
      success: false,
      symbol: request.symbol,
      algorithm: request.algorithm,
      processedOrders: 0,
      matchedOrders: 0,
      totalTrades: 0,
      totalVolume: 0,
      averagePrice: 0,
      processingTimeMs: processingTime,
      trades: [],
      unmatchedOrders: []
    };
  }

  async getPerformanceMetrics(): Promise<any> {
    return {
      ...this.performanceMetrics,
      currentThroughput: this.performanceMetrics.lastProcessingTime > 0 
        ? 1000 / this.performanceMetrics.lastProcessingTime 
        : 0
    };
  }

  async addOrderToQueue(order: Order): Promise<void> {
    // Add order to priority queue
    this.priorityQueue.addOrder(order);
    
    // Save order to database
    await this.orderRepository.save(order);
    
    this.logger.debug(`Order ${order.id} added to queue for ${order.symbol}`);
  }

  async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    // Remove from priority queue
    const order = await this.orderRepository.findOne({ where: { id: orderId, userId } });
    if (!order) return false;
    
    const removed = this.priorityQueue.removeOrder(orderId, order.symbol, order.type);
    
    if (removed) {
      order.status = OrderStatus.CANCELLED;
      await this.orderRepository.save(order);
      this.logger.debug(`Order ${orderId} cancelled`);
      return true;
    }
    
    return false;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MatchingPreferencesDto } from '../dto/matching-preferences.dto';

export interface Order {
  id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  energyType: string;
  location: string;
  userId: string;
  status: string;
  createdAt: Date;
  priority?: number;
  isRenewable?: boolean;
}

export interface LiquidityPool {
  energyType: string;
  location: string;
  buyOrders: Order[];
  sellOrders: Order[];
  totalBuyQuantity: number;
  totalSellQuantity: number;
  averageBuyPrice: number;
  averageSellPrice: number;
  depth: number;
  spread: number;
}

export interface AggregatedOrder {
  energyType: string;
  location: string;
  type: 'buy' | 'sell';
  aggregatedQuantity: number;
  vwap: number;
  orderCount: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
}

export interface OptimizationResult {
  optimizedBuyOrders: Order[];
  optimizedSellOrders: Order[];
  liquidityPools: LiquidityPool[];
  aggregatedOrders: AggregatedOrder[];
  fillRateImprovement: number;
  liquidityScore: number;
  processingTime: number;
}

@Injectable()
export class LiquidityOptimizerService {
  private readonly logger = new Logger(LiquidityOptimizerService.name);
  private readonly TARGET_FILL_IMPROVEMENT = 30; // 30% improvement in fill rates
  private liquidityCache = new Map<string, LiquidityPool>();
  private readonly CACHE_TTL = 5000; // 5 seconds

  /**
   * Optimize order liquidity through aggregation and pool management
   * This service improves fill rates by consolidating orders and identifying optimal matching opportunities
   */
  async optimizeLiquidity(
    buyOrders: Order[],
    sellOrders: Order[],
    preferences: MatchingPreferencesDto,
  ): Promise<OptimizationResult> {
    const startTime = process.hrtime.bigint();

    // Create liquidity pools by energy type and location
    const liquidityPools = this.createLiquidityPools(buyOrders, sellOrders);

    // Aggregate orders within each pool
    const aggregatedOrders = this.aggregateOrders(liquidityPools);

    // Optimize orders based on liquidity analysis
    const { optimizedBuyOrders, optimizedSellOrders } = this.optimizeOrders(
      buyOrders,
      sellOrders,
      liquidityPools,
      preferences,
    );

    // Calculate fill rate improvement
    const fillRateImprovement = this.calculateFillRateImprovement(
      buyOrders,
      sellOrders,
      optimizedBuyOrders,
      optimizedSellOrders,
    );

    // Calculate overall liquidity score
    const liquidityScore = this.calculateLiquidityScore(liquidityPools);

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // Convert to microseconds

    // Update cache
    this.updateLiquidityCache(liquidityPools);

    this.logger.log(
      `Liquidity Optimization: ` +
      `Fill Rate Improvement: ${fillRateImprovement.toFixed(2)}%, ` +
      `Liquidity Score: ${liquidityScore.toFixed(2)}, ` +
      `Pools: ${liquidityPools.length}, ` +
      `Processing Time: ${processingTime.toFixed(2)}μs`
    );

    return {
      optimizedBuyOrders,
      optimizedSellOrders,
      liquidityPools,
      aggregatedOrders,
      fillRateImprovement,
      liquidityScore,
      processingTime,
    };
  }

  /**
   * Create liquidity pools grouped by energy type and location
   */
  private createLiquidityPools(
    buyOrders: Order[],
    sellOrders: Order[],
  ): LiquidityPool[] {
    const poolMap = new Map<string, LiquidityPool>();

    // Process buy orders
    for (const order of buyOrders) {
      const key = `${order.energyType}-${order.location}`;
      if (!poolMap.has(key)) {
        poolMap.set(key, {
          energyType: order.energyType,
          location: order.location,
          buyOrders: [],
          sellOrders: [],
          totalBuyQuantity: 0,
          totalSellQuantity: 0,
          averageBuyPrice: 0,
          averageSellPrice: 0,
          depth: 0,
          spread: 0,
        });
      }
      const pool = poolMap.get(key)!;
      pool.buyOrders.push(order);
      pool.totalBuyQuantity += order.quantity;
    }

    // Process sell orders
    for (const order of sellOrders) {
      const key = `${order.energyType}-${order.location}`;
      if (!poolMap.has(key)) {
        poolMap.set(key, {
          energyType: order.energyType,
          location: order.location,
          buyOrders: [],
          sellOrders: [],
          totalBuyQuantity: 0,
          totalSellQuantity: 0,
          averageBuyPrice: 0,
          averageSellPrice: 0,
          depth: 0,
          spread: 0,
        });
      }
      const pool = poolMap.get(key)!;
      pool.sellOrders.push(order);
      pool.totalSellQuantity += order.quantity;
    }

    // Calculate pool metrics
    for (const pool of poolMap.values()) {
      pool.averageBuyPrice = this.calculateAveragePrice(pool.buyOrders);
      pool.averageSellPrice = this.calculateAveragePrice(pool.sellOrders);
      pool.depth = pool.buyOrders.length + pool.sellOrders.length;
      pool.spread = pool.averageBuyPrice - pool.averageSellPrice;
    }

    return Array.from(poolMap.values());
  }

  /**
   * Aggregate orders within liquidity pools
   */
  private aggregateOrders(liquidityPools: LiquidityPool[]): AggregatedOrder[] {
    const aggregatedOrders: AggregatedOrder[] = [];

    for (const pool of liquidityPools) {
      // Aggregate buy orders
      if (pool.buyOrders.length > 0) {
        const buyAgg = this.aggregateOrderList(pool.buyOrders, 'buy');
        aggregatedOrders.push(buyAgg);
      }

      // Aggregate sell orders
      if (pool.sellOrders.length > 0) {
        const sellAgg = this.aggregateOrderList(pool.sellOrders, 'sell');
        aggregatedOrders.push(sellAgg);
      }
    }

    return aggregatedOrders;
  }

  /**
   * Aggregate a list of orders
   */
  private aggregateOrderList(orders: Order[], type: 'buy' | 'sell'): AggregatedOrder {
    const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);
    const totalValue = orders.reduce((sum, order) => sum + order.quantity * order.price, 0);
    const vwap = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    const prices = orders.map(order => order.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return {
      energyType: orders[0].energyType,
      location: orders[0].location,
      type,
      aggregatedQuantity: totalQuantity,
      vwap,
      orderCount: orders.length,
      minPrice,
      maxPrice,
      priceRange: maxPrice - minPrice,
    };
  }

  /**
   * Optimize orders based on liquidity analysis
   */
  private optimizeOrders(
    buyOrders: Order[],
    sellOrders: Order[],
    liquidityPools: LiquidityPool[],
    preferences: MatchingPreferencesDto,
  ): { optimizedBuyOrders: Order[]; optimizedSellOrders: Order[] } {
    // Sort orders by liquidity score
    const optimizedBuyOrders = this.sortByLiquidityScore(buyOrders, liquidityPools, preferences);
    const optimizedSellOrders = this.sortByLiquidityScore(sellOrders, liquidityPools, preferences);

    // Apply price optimization
    const priceOptimizedBuys = this.optimizeOrderPrices(optimizedBuyOrders, liquidityPools);
    const priceOptimizedSells = this.optimizeOrderPrices(optimizedSellOrders, liquidityPools);

    return {
      optimizedBuyOrders: priceOptimizedBuys,
      optimizedSellOrders: priceOptimizedSells,
    };
  }

  /**
   * Sort orders by liquidity score
   */
  private sortByLiquidityScore(
    orders: Order[],
    liquidityPools: LiquidityPool[],
    preferences: MatchingPreferencesDto,
  ): Order[] {
    const poolMap = new Map<string, LiquidityPool>();
    for (const pool of liquidityPools) {
      poolMap.set(`${pool.energyType}-${pool.location}`, pool);
    }

    return [...orders].sort((a, b) => {
      const poolA = poolMap.get(`${a.energyType}-${a.location}`);
      const poolB = poolMap.get(`${b.energyType}-${b.location}`);

      const scoreA = this.calculateOrderLiquidityScore(a, poolA, preferences);
      const scoreB = this.calculateOrderLiquidityScore(b, poolB, preferences);

      return scoreB - scoreA; // Descending order
    });
  }

  /**
   * Calculate liquidity score for an individual order
   */
  private calculateOrderLiquidityScore(
    order: Order,
    pool: LiquidityPool | undefined,
    preferences: MatchingPreferencesDto,
  ): number {
    let score = 0;

    if (!pool) {
      return score;
    }

    // Pool depth score (more orders = better liquidity)
    const depthScore = Math.min(pool.depth / 100, 1);
    score += depthScore * 0.3;

    // Price competitiveness score
    const avgPrice = order.type === 'buy' ? pool.averageBuyPrice : pool.averageSellPrice;
    const priceCompetitiveness = order.type === 'buy'
      ? (avgPrice - order.price) / avgPrice
      : (order.price - avgPrice) / avgPrice;
    score += Math.max(0, Math.min(priceCompetitiveness, 1)) * 0.3;

    // Quantity score (larger orders may have priority)
    const quantityScore = Math.min(order.quantity / 1000, 1);
    score += quantityScore * 0.2;

    // Spread score (tighter spread = better)
    const spreadScore = Math.max(0, 1 - pool.spread / pool.averageBuyPrice);
    score += spreadScore * 0.2;

    return score;
  }

  /**
   * Optimize order prices based on liquidity pool data
   */
  private optimizeOrderPrices(
    orders: Order[],
    liquidityPools: LiquidityPool[],
  ): Order[] {
    const poolMap = new Map<string, LiquidityPool>();
    for (const pool of liquidityPools) {
      poolMap.set(`${pool.energyType}-${pool.location}`, pool);
    }

    return orders.map(order => {
      const pool = poolMap.get(`${order.energyType}-${order.location}`);
      if (!pool) {
        return order;
      }

      // Adjust price towards pool average for better matching
      const avgPrice = order.type === 'buy' ? pool.averageBuyPrice : pool.averageSellPrice;
      const priceAdjustment = (avgPrice - order.price) * 0.1; // 10% adjustment

      return {
        ...order,
        price: Math.round((order.price + priceAdjustment) * 100) / 100,
      };
    });
  }

  /**
   * Calculate fill rate improvement
   */
  private calculateFillRateImprovement(
    originalBuyOrders: Order[],
    originalSellOrders: Order[],
    optimizedBuyOrders: Order[],
    optimizedSellOrders: Order[],
  ): number {
    // Calculate original potential matches
    const originalMatches = this.estimateMatches(originalBuyOrders, originalSellOrders);
    const optimizedMatches = this.estimateMatches(optimizedBuyOrders, optimizedSellOrders);

    const improvement = originalMatches > 0
      ? ((optimizedMatches - originalMatches) / originalMatches) * 100
      : 0;

    return improvement;
  }

  /**
   * Estimate number of potential matches
   */
  private estimateMatches(buyOrders: Order[], sellOrders: Order[]): number {
    let matches = 0;
    const processed = new Set<string>();

    for (const buy of buyOrders) {
      for (const sell of sellOrders) {
        if (processed.has(buy.id) || processed.has(sell.id)) {
          continue;
        }

        if (buy.price >= sell.price && buy.energyType === sell.energyType) {
          matches++;
          processed.add(buy.id);
          processed.add(sell.id);
        }
      }
    }

    return matches;
  }

  /**
   * Calculate overall liquidity score
   */
  private calculateLiquidityScore(liquidityPools: LiquidityPool[]): number {
    if (liquidityPools.length === 0) {
      return 0;
    }

    let totalScore = 0;

    for (const pool of liquidityPools) {
      let poolScore = 0;

      // Depth score
      poolScore += Math.min(pool.depth / 50, 1) * 0.4;

      // Quantity balance score
      const quantityBalance = 1 - Math.abs(pool.totalBuyQuantity - pool.totalSellQuantity) / 
                             (pool.totalBuyQuantity + pool.totalSellQuantity + 1);
      poolScore += quantityBalance * 0.3;

      // Spread score
      const spreadScore = pool.averageBuyPrice > 0 
        ? Math.max(0, 1 - pool.spread / pool.averageBuyPrice)
        : 0;
      poolScore += spreadScore * 0.3;

      totalScore += poolScore;
    }

    return totalScore / liquidityPools.length;
  }

  /**
   * Calculate average price for orders
   */
  private calculateAveragePrice(orders: Order[]): number {
    if (orders.length === 0) {
      return 0;
    }

    const totalValue = orders.reduce((sum, order) => sum + order.quantity * order.price, 0);
    const totalQuantity = orders.reduce((sum, order) => sum + order.quantity, 0);

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  /**
   * Update liquidity cache
   */
  private updateLiquidityCache(liquidityPools: LiquidityPool[]): void {
    this.liquidityCache.clear();

    for (const pool of liquidityPools) {
      const key = `${pool.energyType}-${pool.location}`;
      this.liquidityCache.set(key, pool);
    }

    // Set cache expiration
    setTimeout(() => {
      this.liquidityCache.clear();
    }, this.CACHE_TTL);
  }

  /**
   * Get liquidity pool from cache
   */
  getLiquidityPool(energyType: string, location: string): LiquidityPool | undefined {
    return this.liquidityCache.get(`${energyType}-${location}`);
  }

  /**
   * Get all cached liquidity pools
   */
  getAllLiquidityPools(): LiquidityPool[] {
    return Array.from(this.liquidityCache.values());
  }

  /**
   * Analyze liquidity depth for a specific energy type and location
   */
  analyzeLiquidityDepth(energyType: string, location: string): {
    depth: number;
    totalBuyQuantity: number;
    totalSellQuantity: number;
    spread: number;
    liquidityScore: number;
  } {
    const pool = this.getLiquidityPool(energyType, location);

    if (!pool) {
      return {
        depth: 0,
        totalBuyQuantity: 0,
        totalSellQuantity: 0,
        spread: 0,
        liquidityScore: 0,
      };
    }

    return {
      depth: pool.depth,
      totalBuyQuantity: pool.totalBuyQuantity,
      totalSellQuantity: pool.totalSellQuantity,
      spread: pool.spread,
      liquidityScore: this.calculateLiquidityScore([pool]),
    };
  }

  /**
   * Get optimizer statistics
   */
  getStatistics(): {
    targetFillImprovement: number;
    cacheTtl: number;
    cachedPools: number;
    description: string;
  } {
    return {
      targetFillImprovement: this.TARGET_FILL_IMPROVEMENT,
      cacheTtl: this.CACHE_TTL,
      cachedPools: this.liquidityCache.size,
      description: 'Liquidity optimizer for order aggregation and fill rate improvement',
    };
  }
}

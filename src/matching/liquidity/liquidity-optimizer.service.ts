import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderType, OrderStatus } from '../entities/order.entity';
import { OrderBook } from '../entities/order-book.entity';

export interface LiquidityOptimizationResult {
  optimizedBuyOrders: Order[];
  optimizedSellOrders: Order[];
  liquidityMetrics: {
    totalLiquidity: number;
    effectiveSpread: number;
    marketDepth: number;
    orderBookImbalance: number;
    priceImprovement: number;
  };
  recommendations: string[];
}

export interface LiquidityPool {
  price: number;
  buyQuantity: number;
  sellQuantity: number;
  netQuantity: number;
  liquidityScore: number;
}

@Injectable()
export class LiquidityOptimizerService {
  private readonly logger = new Logger(LiquidityOptimizerService.name);

  async optimizeLiquidity(
    buyOrders: Order[],
    sellOrders: Order[],
    symbol: string,
    targetSpread: number = 0.001, // 0.1% target spread
    minLiquidityThreshold: number = 1000
  ): Promise<LiquidityOptimizationResult> {
    const startTime = performance.now();
    
    // Filter active orders
    const activeBuyOrders = buyOrders.filter(order => 
      order.status === OrderStatus.PENDING && order.type === OrderType.BUY
    );
    const activeSellOrders = sellOrders.filter(order => 
      order.status === OrderStatus.PENDING && order.type === OrderType.SELL
    );

    // Analyze current liquidity
    const currentLiquidity = this.analyzeLiquidity(activeBuyOrders, activeSellOrders);
    
    // Generate optimization recommendations
    const recommendations = this.generateRecommendations(currentLiquidity, targetSpread, minLiquidityThreshold);
    
    // Apply optimizations
    const { optimizedBuyOrders, optimizedSellOrders } = this.applyOptimizations(
      activeBuyOrders,
      activeSellOrders,
      recommendations
    );

    // Calculate optimized metrics
    const optimizedMetrics = this.analyzeLiquidity(optimizedBuyOrders, optimizedSellOrders);

    const processingTime = performance.now() - startTime;

    this.logger.log(
      `Liquidity optimization completed for ${symbol}: ` +
      `${processingTime.toFixed(2)}ms, ${recommendations.length} recommendations applied`
    );

    return {
      optimizedBuyOrders,
      optimizedSellOrders,
      liquidityMetrics: optimizedMetrics,
      recommendations
    };
  }

  private analyzeLiquidity(buyOrders: Order[], sellOrders: Order[]): {
    totalLiquidity: number;
    effectiveSpread: number;
    marketDepth: number;
    orderBookImbalance: number;
    priceImprovement: number;
  } {
    const totalBuyVolume = buyOrders.reduce((sum, order) => sum + order.remainingQuantity, 0);
    const totalSellVolume = sellOrders.reduce((sum, order) => sum + order.remainingQuantity, 0);
    const totalLiquidity = totalBuyVolume + totalSellVolume;

    // Calculate effective spread
    const bestBid = buyOrders.length > 0 ? Math.max(...buyOrders.map(o => o.price)) : 0;
    const bestAsk = sellOrders.length > 0 ? Math.min(...sellOrders.map(o => o.price)) : 0;
    const midPrice = (bestBid + bestAsk) / 2;
    const effectiveSpread = midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;

    // Calculate market depth (sum of quantities within 10 price levels)
    const marketDepth = this.calculateMarketDepth(buyOrders, sellOrders, 10);

    // Calculate order book imbalance
    const orderBookImbalance = totalLiquidity > 0 
      ? ((totalBuyVolume - totalSellVolume) / totalLiquidity) * 100 
      : 0;

    // Calculate potential price improvement
    const priceImprovement = this.calculatePriceImprovement(buyOrders, sellOrders);

    return {
      totalLiquidity,
      effectiveSpread,
      marketDepth,
      orderBookImbalance,
      priceImprovement
    };
  }

  private calculateMarketDepth(buyOrders: Order[], sellOrders: Order[], levels: number): number {
    // Group orders by price levels
    const buyLevels = this.groupOrdersByPriceLevel(buyOrders, levels, true);
    const sellLevels = this.groupOrdersByPriceLevel(sellOrders, levels, false);
    
    let depth = 0;
    buyLevels.forEach(level => {
      depth += level.totalQuantity;
    });
    sellLevels.forEach(level => {
      depth += level.totalQuantity;
    });
    
    return depth;
  }

  private groupOrdersByPriceLevel(
    orders: Order[], 
    maxLevels: number, 
    isBuy: boolean
  ): Array<{ price: number; totalQuantity: number; orderCount: number }> {
    const sortedOrders = [...orders].sort((a, b) => {
      if (isBuy) {
        return b.price - a.price; // Highest to lowest for buys
      } else {
        return a.price - b.price; // Lowest to highest for sells
      }
    });

    const levels: Array<{ price: number; totalQuantity: number; orderCount: number }> = [];
    const priceMap = new Map<number, { quantity: number; count: number }>();

    sortedOrders.forEach(order => {
      const priceKey = Math.floor(order.price * 100); // Group by 2 decimal places
      const existing = priceMap.get(priceKey) || { quantity: 0, count: 0 };
      existing.quantity += order.remainingQuantity;
      existing.count += 1;
      priceMap.set(priceKey, existing);
    });

    let levelCount = 0;
    for (const [price, data] of priceMap.entries()) {
      if (levelCount >= maxLevels) break;
      levels.push({
        price: price / 100,
        totalQuantity: data.quantity,
        orderCount: data.count
      });
      levelCount++;
    }

    return levels;
  }

  private calculatePriceImprovement(buyOrders: Order[], sellOrders: Order[]): number {
    if (buyOrders.length === 0 || sellOrders.length === 0) return 0;

    const bestBid = Math.max(...buyOrders.map(o => o.price));
    const bestAsk = Math.min(...sellOrders.map(o => o.price));
    const midPrice = (bestBid + bestAsk) / 2;

    // Calculate average price improvement from mid price
    const buyImprovements = buyOrders.map(order => (midPrice - order.price) / midPrice * 100);
    const sellImprovements = sellOrders.map(order => (order.price - midPrice) / midPrice * 100);

    const avgBuyImprovement = buyImprovements.reduce((sum, imp) => sum + imp, 0) / buyImprovements.length;
    const avgSellImprovement = sellImprovements.reduce((sum, imp) => sum + imp, 0) / sellImprovements.length;

    return (avgBuyImprovement + avgSellImprovement) / 2;
  }

  private generateRecommendations(
    currentLiquidity: any,
    targetSpread: number,
    minLiquidityThreshold: number
  ): string[] {
    const recommendations: string[] = [];

    // Check liquidity threshold
    if (currentLiquidity.totalLiquidity < minLiquidityThreshold) {
      recommendations.push('INSUFFICIENT_LIQUIDITY: Add market maker orders to increase total liquidity');
    }

    // Check spread
    if (currentLiquidity.effectiveSpread > targetSpread * 100) {
      recommendations.push('WIDE_SPREAD: Tighten bid-ask spread by adding orders near mid price');
    }

    // Check order book imbalance
    if (Math.abs(currentLiquidity.orderBookImbalance) > 20) {
      if (currentLiquidity.orderBookImbalance > 0) {
        recommendations.push('BUY_SIDE_HEAVY: Add more sell orders to balance the book');
      } else {
        recommendations.push('SELL_SIDE_HEAVY: Add more buy orders to balance the book');
      }
    }

    // Check market depth
    if (currentLiquidity.marketDepth < minLiquidityThreshold * 0.5) {
      recommendations.push('SHALLOW_DEPTH: Add orders at multiple price levels to increase depth');
    }

    // Check price improvement opportunities
    if (currentLiquidity.priceImprovement < 0.1) {
      recommendations.push('LOW_IMPROVEMENT: Consider adding orders with better pricing');
    }

    return recommendations;
  }

  private applyOptimizations(
    buyOrders: Order[],
    sellOrders: Order[],
    recommendations: string[]
  ): { optimizedBuyOrders: Order[]; optimizedSellOrders: Order[] } {
    let optimizedBuyOrders = [...buyOrders];
    let optimizedSellOrders = [...sellOrders];

    recommendations.forEach(recommendation => {
      if (recommendation.includes('INSUFFICIENT_LIQUIDITY')) {
        // Add synthetic liquidity orders (in real implementation, this would trigger market maker)
        const syntheticOrders = this.generateSyntheticLiquidity(optimizedBuyOrders, optimizedSellOrders);
        optimizedBuyOrders.push(...syntheticOrders.buy);
        optimizedSellOrders.push(...syntheticOrders.sell);
      } else if (recommendation.includes('WIDE_SPREAD')) {
        // Add orders to tighten spread
        const spreadTighteningOrders = this.generateSpreadTighteningOrders(optimizedBuyOrders, optimizedSellOrders);
        optimizedBuyOrders.push(...spreadTighteningOrders.buy);
        optimizedSellOrders.push(...spreadTighteningOrders.sell);
      } else if (recommendation.includes('BUY_SIDE_HEAVY')) {
        // Add more sell orders
        const balancingOrders = this.generateBalancingOrders(optimizedBuyOrders, optimizedSellOrders, 'sell');
        optimizedSellOrders.push(...balancingOrders);
      } else if (recommendation.includes('SELL_SIDE_HEAVY')) {
        // Add more buy orders
        const balancingOrders = this.generateBalancingOrders(optimizedBuyOrders, optimizedSellOrders, 'buy');
        optimizedBuyOrders.push(...balancingOrders);
      } else if (recommendation.includes('SHALLOW_DEPTH')) {
        // Add orders at multiple price levels
        const depthOrders = this.generateDepthOrders(optimizedBuyOrders, optimizedSellOrders);
        optimizedBuyOrders.push(...depthOrders.buy);
        optimizedSellOrders.push(...depthOrders.sell);
      }
    });

    return { optimizedBuyOrders, optimizedSellOrders };
  }

  private generateSyntheticLiquidity(buyOrders: Order[], sellOrders: Order[]): {
    buy: Order[];
    sell: Order[];
  } {
    // In a real implementation, this would interface with market makers
    // For now, return empty arrays as placeholder
    return { buy: [], sell: [] };
  }

  private generateSpreadTighteningOrders(buyOrders: Order[], sellOrders: Order[]): {
    buy: Order[];
    sell: Order[];
  } {
    const orders = { buy: [] as Order[], sell: [] as Order[] };
    
    if (buyOrders.length > 0 && sellOrders.length > 0) {
      const bestBid = Math.max(...buyOrders.map(o => o.price));
      const bestAsk = Math.min(...sellOrders.map(o => o.price));
      const midPrice = (bestBid + bestAsk) / 2;
      
      // Add orders at tighter spread
      const newBid = midPrice * 0.9995; // 0.05% below mid
      const newAsk = midPrice * 1.0005; // 0.05% above mid
      
      // Create synthetic orders (in real implementation, these would be actual orders)
      // Placeholder for demonstration
    }
    
    return orders;
  }

  private generateBalancingOrders(
    buyOrders: Order[], 
    sellOrders: Order[], 
    side: 'buy' | 'sell'
  ): Order[] {
    // Generate orders to balance the book
    // In real implementation, this would create actual balancing orders
    return [];
  }

  private generateDepthOrders(buyOrders: Order[], sellOrders: Order[]): {
    buy: Order[];
    sell: Order[];
  } {
    // Generate orders at multiple price levels to increase depth
    // In real implementation, this would create actual depth orders
    return { buy: [], sell: [] };
  }

  async aggregateLiquidityPools(
    orderBooks: OrderBook[],
    symbols: string[]
  ): Promise<Map<string, LiquidityPool[]>> {
    const liquidityMap = new Map<string, LiquidityPool[]>();

    for (const symbol of symbols) {
      const orderBook = orderBooks.find(ob => ob.symbol === symbol);
      if (!orderBook) continue;

      const pools: LiquidityPool[] = [];
      
      // Create liquidity pools from order book data
      const buyLevels = orderBook.buyOrders || [];
      const sellLevels = orderBook.sellOrders || [];

      // Combine buy and sell levels into pools
      const allPrices = new Set<number>();
      
      buyLevels.forEach(level => allPrices.add(level.price));
      sellLevels.forEach(level => allPrices.add(level.price));

      allPrices.forEach(price => {
        const buyLevel = buyLevels.find(l => l.price === price);
        const sellLevel = sellLevels.find(l => l.price === price);
        
        const buyQuantity = buyLevel ? buyLevel.quantity : 0;
        const sellQuantity = sellLevel ? sellLevel.quantity : 0;
        const netQuantity = buyQuantity - sellQuantity;
        
        // Calculate liquidity score based on volume and balance
        const totalVolume = buyQuantity + sellQuantity;
        const balance = totalVolume > 0 ? Math.min(buyQuantity, sellQuantity) / totalVolume : 0;
        const liquidityScore = totalVolume * balance;

        pools.push({
          price,
          buyQuantity,
          sellQuantity,
          netQuantity,
          liquidityScore
        });
      });

      // Sort pools by liquidity score
      pools.sort((a, b) => b.liquidityScore - a.liquidityScore);
      
      liquidityMap.set(symbol, pools);
    }

    return liquidityMap;
  }

  calculateLiquidityScore(liquidityPool: LiquidityPool): number {
    const { buyQuantity, sellQuantity, netQuantity } = liquidityPool;
    const totalVolume = buyQuantity + sellQuantity;
    
    if (totalVolume === 0) return 0;
    
    // Balance factor: higher score for balanced buy/sell quantities
    const balance = Math.min(buyQuantity, sellQuantity) / totalVolume;
    
    // Volume factor: higher volume increases score
    const volume = Math.log(totalVolume + 1) / Math.log(10000 + 1); // Normalize to 0-1
    
    // Net quantity factor: penalize extreme imbalances
    const imbalance = Math.abs(netQuantity) / totalVolume;
    const imbalancePenalty = 1 - imbalance;
    
    return balance * volume * imbalancePenalty * 100;
  }
}

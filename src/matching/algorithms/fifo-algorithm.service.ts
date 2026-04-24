import { Injectable, Logger } from '@nestjs/common';
import { MatchingRule } from '../entities/matching-rule.entity';
import { MatchingPreferencesDto } from '../dto/matching-preferences.dto';
import { Match, MatchType, MatchStatus } from '../entities/match.entity';

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

export interface FIFOMatchResult {
  matches: Match[];
  rejectedOrders: string[];
  processingTime: number;
  totalOrdersProcessed: number;
  matchRate: number;
}

@Injectable()
export class FIFOAlgorithmService {
  private readonly logger = new Logger(FIFOAlgorithmService.name);
  private readonly TARGET_LATENCY_US = 100; // 100 microseconds
  private readonly TARGET_THROUGHPUT = 100000; // 100,000 orders/second

  /**
   * Execute FIFO matching algorithm with microsecond latency
   * Orders are matched strictly by arrival time (First-In-First-Out)
   */
  async findMatches(
    buyOrders: Order[],
    sellOrders: Order[],
    rules: MatchingRule[],
    preferences: MatchingPreferencesDto,
  ): Promise<FIFOMatchResult> {
    const startTime = process.hrtime.bigint();
    
    // Sort orders by creation time (FIFO principle)
    const sortedBuyOrders = this.sortOrdersByTime(buyOrders);
    const sortedSellOrders = this.sortOrdersByTime(sellOrders);

    const matches: Match[] = [];
    const rejectedOrders: string[] = [];
    const processedOrderIds = new Set<string>();

    // Use two-pointer technique for O(n) matching
    let buyIndex = 0;
    let sellIndex = 0;

    while (buyIndex < sortedBuyOrders.length && sellIndex < sortedSellOrders.length) {
      const buyOrder = sortedBuyOrders[buyIndex];
      const sellOrder = sortedSellOrders[sellIndex];

      // Skip already processed orders
      if (processedOrderIds.has(buyOrder.id)) {
        buyIndex++;
        continue;
      }
      if (processedOrderIds.has(sellOrder.id)) {
        sellIndex++;
        continue;
      }

      // Check if orders can be matched
      if (this.canMatch(buyOrder, sellOrder, preferences, rules)) {
        const match = this.createMatch(buyOrder, sellOrder, preferences);
        matches.push(match);
        
        processedOrderIds.add(buyOrder.id);
        processedOrderIds.add(sellOrder.id);
        
        buyIndex++;
        sellIndex++;
      } else {
        // Move forward based on which order is older (FIFO)
        if (buyOrder.createdAt < sellOrder.createdAt) {
          rejectedOrders.push(buyOrder.id);
          processedOrderIds.add(buyOrder.id);
          buyIndex++;
        } else {
          rejectedOrders.push(sellOrder.id);
          processedOrderIds.add(sellOrder.id);
          sellIndex++;
        }
      }
    }

    // Add remaining orders to rejected
    while (buyIndex < sortedBuyOrders.length) {
      if (!processedOrderIds.has(sortedBuyOrders[buyIndex].id)) {
        rejectedOrders.push(sortedBuyOrders[buyIndex].id);
      }
      buyIndex++;
    }

    while (sellIndex < sortedSellOrders.length) {
      if (!processedOrderIds.has(sortedSellOrders[sellIndex].id)) {
        rejectedOrders.push(sortedSellOrders[sellIndex].id);
      }
      sellIndex++;
    }

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // Convert to microseconds

    const totalOrdersProcessed = sortedBuyOrders.length + sortedSellOrders.length;
    const matchRate = matches.length / (totalOrdersProcessed || 1);

    // Log performance metrics
    this.logPerformanceMetrics(processingTime, totalOrdersProcessed, matchRate);

    return {
      matches,
      rejectedOrders,
      processingTime,
      totalOrdersProcessed,
      matchRate,
    };
  }

  /**
   * Sort orders by creation time for FIFO processing
   */
  private sortOrdersByTime(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Check if two orders can be matched based on preferences and rules
   */
  private canMatch(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
    rules: MatchingRule[],
  ): boolean {
    // Price compatibility check
    if (!this.isPriceCompatible(buyOrder, sellOrder, preferences)) {
      return false;
    }

    // Quantity compatibility check
    if (!this.isQuantityCompatible(buyOrder, sellOrder, preferences)) {
      return false;
    }

    // Energy type compatibility
    if (!this.isEnergyTypeCompatible(buyOrder, sellOrder, preferences)) {
      return false;
    }

    // Location compatibility
    if (!this.isLocationCompatible(buyOrder, sellOrder, preferences)) {
      return false;
    }

    // Apply matching rules
    for (const rule of rules) {
      if (!this.evaluateRule(rule, buyOrder, sellOrder)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check price compatibility with tolerance
   */
  private isPriceCompatible(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): boolean {
    const priceTolerance = preferences.price?.priceTolerance || 10;
    const priceDiff = Math.abs(buyOrder.price - sellOrder.price);
    const avgPrice = (buyOrder.price + sellOrder.price) / 2;
    const priceDiffPercent = (priceDiff / avgPrice) * 100;

    return priceDiffPercent <= priceTolerance;
  }

  /**
   * Check quantity compatibility
   */
  private isQuantityCompatible(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): boolean {
    const minQuantity = preferences.quantity?.minimumQuantity || 0;
    const maxQuantity = preferences.quantity?.maximumQuantity || Infinity;
    const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);

    return matchedQuantity >= minQuantity && matchedQuantity <= maxQuantity;
  }

  /**
   * Check energy type compatibility
   */
  private isEnergyTypeCompatible(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): boolean {
    if (preferences.renewable?.preferRenewable) {
      if (buyOrder.isRenewable !== sellOrder.isRenewable) {
        return preferences.renewable.allowMixed !== false;
      }
    }

    return buyOrder.energyType === sellOrder.energyType;
  }

  /**
   * Check location compatibility
   */
  private isLocationCompatible(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): boolean {
    if (!preferences.geographic) {
      return true;
    }

    const maxDistance = preferences.geographic.maxDistance || Infinity;
    const distance = this.calculateDistance(buyOrder.location, sellOrder.location);

    return distance <= maxDistance;
  }

  /**
   * Calculate distance between two locations (simplified)
   */
  private calculateDistance(location1: string, location2: string): number {
    // In a real implementation, this would use geospatial calculations
    // For now, return a mock distance
    return location1 === location2 ? 0 : 100;
  }

  /**
   * Evaluate a matching rule
   */
  private evaluateRule(
    rule: MatchingRule,
    buyOrder: Order,
    sellOrder: Order,
  ): boolean {
    // Implement rule evaluation logic based on rule type
    // This is a placeholder for actual rule evaluation
    return true;
  }

  /**
   * Create a match object
   */
  private createMatch(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): Match {
    const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    const matchedPrice = (buyOrder.price + sellOrder.price) / 2;

    const match = new Match();
    match.buyerOrderId = buyOrder.id;
    match.sellerOrderId = sellOrder.id;
    match.matchedQuantity = matchedQuantity;
    match.matchedPrice = matchedPrice;
    match.remainingQuantity = Math.max(buyOrder.quantity, sellOrder.quantity) - matchedQuantity;
    match.status = MatchStatus.PENDING;
    match.type = matchedQuantity < buyOrder.quantity || matchedQuantity < sellOrder.quantity
      ? MatchType.PARTIAL
      : MatchType.FULL;
    match.matchingScore = this.calculateMatchingScore(buyOrder, sellOrder, preferences);
    match.distance = this.calculateDistance(buyOrder.location, sellOrder.location);
    match.metadata = {
      algorithm: 'FIFO',
      priority: buyOrder.priority,
      renewablePreference: buyOrder.isRenewable,
    };
    match.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return match;
  }

  /**
   * Calculate matching score based on various factors
   */
  private calculateMatchingScore(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): number {
    let score = 0;

    // Price alignment score
    const priceAlignment = 1 - Math.abs(buyOrder.price - sellOrder.price) / ((buyOrder.price + sellOrder.price) / 2);
    score += priceAlignment * 0.3;

    // Quantity alignment score
    const quantityAlignment = 1 - Math.abs(buyOrder.quantity - sellOrder.quantity) / Math.max(buyOrder.quantity, sellOrder.quantity);
    score += quantityAlignment * 0.2;

    // Time priority score (earlier orders get higher score)
    const timeScore = 1 - (Date.now() - buyOrder.createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000); // Decay over a week
    score += Math.max(0, timeScore) * 0.3;

    // Location proximity score
    const distance = this.calculateDistance(buyOrder.location, sellOrder.location);
    const locationScore = 1 - Math.min(distance / 500, 1); // Normalize to 500km
    score += locationScore * 0.2;

    return Math.min(score, 1);
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(
    processingTime: number,
    totalOrdersProcessed: number,
    matchRate: number,
  ): void {
    const latencyMet = processingTime <= this.TARGET_LATENCY_US;
    const throughput = (totalOrdersProcessed / (processingTime / 1000000)) || 0;
    const throughputMet = throughput >= this.TARGET_THROUGHPUT;

    this.logger.log(
      `FIFO Algorithm Performance: ` +
      `Latency: ${processingTime.toFixed(2)}μs ${latencyMet ? '✓' : '✗'}, ` +
      `Throughput: ${throughput.toFixed(0)} orders/s ${throughputMet ? '✓' : '✗'}, ` +
      `Match Rate: ${(matchRate * 100).toFixed(2)}%, ` +
      `Orders Processed: ${totalOrdersProcessed}`
    );

    if (!latencyMet || !throughputMet) {
      this.logger.warn(
        `Performance targets not met. Target: ${this.TARGET_LATENCY_US}μs, ${this.TARGET_THROUGHPUT} orders/s`
      );
    }
  }

  /**
   * Get algorithm statistics
   */
  getStatistics(): {
    algorithm: string;
    targetLatencyUs: number;
    targetThroughput: number;
    description: string;
  } {
    return {
      algorithm: 'FIFO',
      targetLatencyUs: this.TARGET_LATENCY_US,
      targetThroughput: this.TARGET_THROUGHPUT,
      description: 'First-In-First-Out matching algorithm with strict time-based ordering',
    };
  }
}

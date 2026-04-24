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

export interface ProRataMatchResult {
  matches: Match[];
  rejectedOrders: string[];
  processingTime: number;
  totalOrdersProcessed: number;
  matchRate: number;
  allocationDetails: Array<{
    orderId: string;
    allocatedQuantity: number;
    allocationPercentage: number;
  }>;
}

@Injectable()
export class ProRataAlgorithmService {
  private readonly logger = new Logger(ProRataAlgorithmService.name);
  private readonly TARGET_LATENCY_US = 100; // 100 microseconds
  private readonly TARGET_THROUGHPUT = 100000; // 100,000 orders/second

  /**
   * Execute Pro-Rata matching algorithm
   * Orders are matched proportionally based on their size and priority
   * This ensures fair distribution of liquidity among participants
   */
  async findMatches(
    buyOrders: Order[],
    sellOrders: Order[],
    rules: MatchingRule[],
    preferences: MatchingPreferencesDto,
  ): Promise<ProRataMatchResult> {
    const startTime = process.hrtime.bigint();

    // Group orders by price level for pro-rata allocation
    const buyLevels = this.groupOrdersByPrice(buyOrders);
    const sellLevels = this.groupOrdersByPrice(sellOrders);

    const matches: Match[] = [];
    const rejectedOrders: string[] = [];
    const allocationDetails: ProRataMatchResult['allocationDetails'] = [];
    const processedOrderIds = new Set<string>();

    // Match orders at each price level
    for (const [buyPrice, buyOrdersAtLevel] of buyLevels) {
      for (const [sellPrice, sellOrdersAtLevel] of sellLevels) {
        if (this.canMatchAtPrice(buyPrice, sellPrice, preferences)) {
          const levelMatches = this.matchAtPriceLevel(
            buyOrdersAtLevel,
            sellOrdersAtLevel,
            buyPrice,
            sellPrice,
            preferences,
            rules,
            processedOrderIds,
          );

          matches.push(...levelMatches.matches);
          allocationDetails.push(...levelMatches.allocations);
          rejectedOrders.push(...levelMatches.rejected);
        }
      }
    }

    // Add unmatched orders to rejected
    const allOrders = [...buyOrders, ...sellOrders];
    for (const order of allOrders) {
      if (!processedOrderIds.has(order.id)) {
        rejectedOrders.push(order.id);
      }
    }

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // Convert to microseconds

    const totalOrdersProcessed = allOrders.length;
    const matchRate = matches.length / (totalOrdersProcessed || 1);

    // Log performance metrics
    this.logPerformanceMetrics(processingTime, totalOrdersProcessed, matchRate);

    return {
      matches,
      rejectedOrders,
      processingTime,
      totalOrdersProcessed,
      matchRate,
      allocationDetails,
    };
  }

  /**
   * Group orders by price level for pro-rata allocation
   */
  private groupOrdersByPrice(orders: Order[]): Map<number, Order[]> {
    const priceLevels = new Map<number, Order[]>();

    for (const order of orders) {
      const priceKey = Math.round(order.price * 100) / 100; // Round to 2 decimal places
      if (!priceLevels.has(priceKey)) {
        priceLevels.set(priceKey, []);
      }
      priceLevels.get(priceKey)!.push(order);
    }

    return priceLevels;
  }

  /**
   * Check if orders at two price levels can be matched
   */
  private canMatchAtPrice(
    buyPrice: number,
    sellPrice: number,
    preferences: MatchingPreferencesDto,
  ): boolean {
    const priceTolerance = preferences.price?.priceTolerance || 10;
    const priceDiff = Math.abs(buyPrice - sellPrice);
    const avgPrice = (buyPrice + sellPrice) / 2;
    const priceDiffPercent = (priceDiff / avgPrice) * 100;

    return priceDiffPercent <= priceTolerance && buyPrice >= sellPrice;
  }

  /**
   * Match orders at a specific price level using pro-rata allocation
   */
  private matchAtPriceLevel(
    buyOrders: Order[],
    sellOrders: Order[],
    buyPrice: number,
    sellPrice: number,
    preferences: MatchingPreferencesDto,
    rules: MatchingRule[],
    processedOrderIds: Set<string>,
  ): {
    matches: Match[];
    allocations: ProRataMatchResult['allocationDetails'];
    rejected: string[];
  } {
    const matches: Match[] = [];
    const allocations: ProRataMatchResult['allocationDetails'] = [];
    const rejected: string[] = [];

    // Calculate total buy and sell quantities
    const totalBuyQuantity = buyOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalSellQuantity = sellOrders.reduce((sum, order) => sum + order.quantity, 0);
    const totalMatchQuantity = Math.min(totalBuyQuantity, totalSellQuantity);

    // Calculate pro-rata allocation for each order
    const buyAllocations = this.calculateProRataAllocation(buyOrders, totalMatchQuantity, totalBuyQuantity);
    const sellAllocations = this.calculateProRataAllocation(sellOrders, totalMatchQuantity, totalSellQuantity);

    // Create matches based on allocations
    let buyIndex = 0;
    let sellIndex = 0;

    while (buyIndex < buyOrders.length && sellIndex < sellOrders.length) {
      const buyOrder = buyOrders[buyIndex];
      const sellOrder = sellOrders[sellIndex];

      if (processedOrderIds.has(buyOrder.id) || processedOrderIds.has(sellOrder.id)) {
        if (processedOrderIds.has(buyOrder.id)) buyIndex++;
        if (processedOrderIds.has(sellOrder.id)) sellIndex++;
        continue;
      }

      // Check compatibility
      if (this.isOrderCompatible(buyOrder, sellOrder, preferences, rules)) {
        const buyAllocation = buyAllocations.get(buyOrder.id) || 0;
        const sellAllocation = sellAllocations.get(sellOrder.id) || 0;
        const matchedQuantity = Math.min(buyAllocation, sellAllocation);

        if (matchedQuantity > 0) {
          const match = this.createMatch(
            buyOrder,
            sellOrder,
            matchedQuantity,
            buyPrice,
            sellPrice,
            preferences,
          );
          matches.push(match);

          allocations.push({
            orderId: buyOrder.id,
            allocatedQuantity: matchedQuantity,
            allocationPercentage: (matchedQuantity / buyOrder.quantity) * 100,
          });

          allocations.push({
            orderId: sellOrder.id,
            allocatedQuantity: matchedQuantity,
            allocationPercentage: (matchedQuantity / sellOrder.quantity) * 100,
          });

          processedOrderIds.add(buyOrder.id);
          processedOrderIds.add(sellOrder.id);

          buyIndex++;
          sellIndex++;
        } else {
          // No allocation available for this pair
          rejected.push(buyOrder.id);
          rejected.push(sellOrder.id);
          processedOrderIds.add(buyOrder.id);
          processedOrderIds.add(sellOrder.id);
          buyIndex++;
          sellIndex++;
        }
      } else {
        // Orders not compatible, move to next
        rejected.push(buyOrder.id);
        processedOrderIds.add(buyOrder.id);
        buyIndex++;
      }
    }

    return { matches, allocations, rejected };
  }

  /**
   * Calculate pro-rata allocation for orders
   */
  private calculateProRataAllocation(
    orders: Order[],
    totalMatchQuantity: number,
    totalQuantity: number,
  ): Map<string, number> {
    const allocations = new Map<string, number>();

    if (totalQuantity === 0) {
      return allocations;
    }

    for (const order of orders) {
      const allocation = (order.quantity / totalQuantity) * totalMatchQuantity;
      allocations.set(order.id, Math.floor(allocation * 100) / 100); // Round to 2 decimal places
    }

    return allocations;
  }

  /**
   * Check if two orders are compatible
   */
  private isOrderCompatible(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
    rules: MatchingRule[],
  ): boolean {
    // Energy type compatibility
    if (!this.isEnergyTypeCompatible(buyOrder, sellOrder, preferences)) {
      return false;
    }

    // Location compatibility
    if (!this.isLocationCompatible(buyOrder, sellOrder, preferences)) {
      return false;
    }

    // Quantity compatibility
    if (!this.isQuantityCompatible(buyOrder, sellOrder, preferences)) {
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
   * Calculate distance between two locations (simplified)
   */
  private calculateDistance(location1: string, location2: string): number {
    // In a real implementation, this would use geospatial calculations
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
    return true;
  }

  /**
   * Create a match object
   */
  private createMatch(
    buyOrder: Order,
    sellOrder: Order,
    matchedQuantity: number,
    buyPrice: number,
    sellPrice: number,
    preferences: MatchingPreferencesDto,
  ): Match {
    const matchedPrice = (buyPrice + sellPrice) / 2;

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
      algorithm: 'PRO_RATA',
      priority: buyOrder.priority,
      renewablePreference: buyOrder.isRenewable,
    };
    match.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return match;
  }

  /**
   * Calculate matching score
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

    // Fairness score (pro-rata favors balanced allocations)
    const fairnessScore = 1 - Math.abs(buyOrder.quantity - sellOrder.quantity) / (buyOrder.quantity + sellOrder.quantity);
    score += fairnessScore * 0.3;

    // Location proximity score
    const distance = this.calculateDistance(buyOrder.location, sellOrder.location);
    const locationScore = 1 - Math.min(distance / 500, 1);
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
      `Pro-Rata Algorithm Performance: ` +
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
      algorithm: 'PRO_RATA',
      targetLatencyUs: this.TARGET_LATENCY_US,
      targetThroughput: this.TARGET_THROUGHPUT,
      description: 'Pro-Rata matching algorithm with fair proportional distribution based on order size',
    };
  }
}

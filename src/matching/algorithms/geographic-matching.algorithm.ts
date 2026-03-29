import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../modules/energy/entities/order.entity';
import { Match, MatchStatus, MatchType } from '../entities/match.entity';
import { MatchingRule, RuleType } from '../entities/matching-rule.entity';
import {
  MatchingPreferencesDto,
  GeographicScope,
} from '../dto/matching-preferences.dto';

export interface GeographicMatchResult {
  matches: Match[];
  rejectedOrders: string[];
  processingTime: number;
  algorithm: 'geographic';
}

export interface GeographicCluster {
  id: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  orders: Order[];
  totalBuyQuantity: number;
  totalSellQuantity: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  region?: string;
  country?: string;
}

@Injectable()
export class GeographicMatchingAlgorithm {
  private readonly logger = new Logger(GeographicMatchingAlgorithm.name);

  async findMatches(
    buyOrders: Order[],
    sellOrders: Order[],
    rules: MatchingRule[],
    preferences: MatchingPreferencesDto,
  ): Promise<GeographicMatchResult> {
    const startTime = Date.now();

    this.logger.log(
      `Starting geographic matching with ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`,
    );

    const filteredBuyOrders = this.filterOrdersByGeography(
      buyOrders,
      preferences,
    );
    const filteredSellOrders = this.filterOrdersByGeography(
      sellOrders,
      preferences,
    );

    const clusters = this.createGeographicClusters(
      filteredBuyOrders,
      filteredSellOrders,
      preferences,
    );
    const matches: Match[] = [];
    const rejectedOrders: string[] = [];

    for (const cluster of clusters) {
      const clusterMatches = this.matchWithinCluster(
        cluster,
        rules,
        preferences,
      );
      matches.push(...clusterMatches.matches);
      rejectedOrders.push(...clusterMatches.rejectedOrders);
    }

    const processingTime = Date.now() - startTime;

    this.logger.log(
      `Geographic matching completed in ${processingTime}ms. Matches: ${matches.length}, Rejected: ${rejectedOrders.length}`,
    );

    return {
      matches,
      rejectedOrders,
      processingTime,
      algorithm: 'geographic',
    };
  }

  private filterOrdersByGeography(
    orders: Order[],
    preferences: MatchingPreferencesDto,
  ): Order[] {
    if (!preferences.geographic) return orders;

    return orders.filter((order) => {
      if (!order.location) return false;

      if (preferences.geographic.preferredRegions?.length > 0) {
        const orderRegion = this.getRegionFromLocation(order.location);
        if (!preferences.geographic.preferredRegions.includes(orderRegion)) {
          return false;
        }
      }

      if (preferences.geographic.excludedRegions?.length > 0) {
        const orderRegion = this.getRegionFromLocation(order.location);
        if (preferences.geographic.excludedRegions.includes(orderRegion)) {
          return false;
        }
      }

      return true;
    });
  }

  private createGeographicClusters(
    buyOrders: Order[],
    sellOrders: Order[],
    preferences: MatchingPreferencesDto,
  ): GeographicCluster[] {
    const allOrders = [...buyOrders, ...sellOrders];
    const maxDistance = preferences.geographic?.maxDistance || 100;

    const clusters: GeographicCluster[] = [];
    const processedOrderIds = new Set<string>();

    for (const order of allOrders) {
      if (processedOrderIds.has(order.id) || !order.location) continue;

      const nearbyOrders = this.findNearbyOrders(order, allOrders, maxDistance);
      const cluster = this.createCluster(order, nearbyOrders);

      clusters.push(cluster);
      nearbyOrders.forEach((nearbyOrder) =>
        processedOrderIds.add(nearbyOrder.id),
      );
    }

    return clusters;
  }

  private findNearbyOrders(
    centerOrder: Order,
    allOrders: Order[],
    maxDistance: number,
  ): Order[] {
    if (!centerOrder.location) return [];

    return allOrders.filter((order) => {
      if (order.id === centerOrder.id || !order.location) return false;

      const distance = this.calculateDistance(
        centerOrder.location,
        order.location,
      );
      return distance <= maxDistance;
    });
  }

  private createCluster(
    centerOrder: Order,
    orders: Order[],
  ): GeographicCluster {
    const buyOrders = orders.filter((order) => order.type === 'buy');
    const sellOrders = orders.filter((order) => order.type === 'sell');

    const totalBuyQuantity = buyOrders.reduce(
      (sum, order) => sum + (order.quantity || 0),
      0,
    );
    const totalSellQuantity = sellOrders.reduce(
      (sum, order) => sum + (order.quantity || 0),
      0,
    );

    const center = this.calculateClusterCenter(orders);

    return {
      id: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      center,
      radius: this.calculateClusterRadius(orders, center),
      orders,
      totalBuyQuantity,
      totalSellQuantity,
    };
  }

  private calculateClusterCenter(orders: Order[]): LocationPoint {
    const validLocations = orders
      .filter((order) => order.location)
      .map((order) => order.location);

    if (validLocations.length === 0) {
      return { latitude: 0, longitude: 0 };
    }

    const sumLat = validLocations.reduce((sum, loc) => sum + loc.latitude, 0);
    const sumLon = validLocations.reduce((sum, loc) => sum + loc.longitude, 0);

    return {
      latitude: sumLat / validLocations.length,
      longitude: sumLon / validLocations.length,
    };
  }

  private calculateClusterRadius(
    orders: Order[],
    center: LocationPoint,
  ): number {
    let maxDistance = 0;

    for (const order of orders) {
      if (!order.location) continue;

      const distance = this.calculateDistance(center, order.location);
      maxDistance = Math.max(maxDistance, distance);
    }

    return maxDistance;
  }

  private matchWithinCluster(
    cluster: GeographicCluster,
    rules: MatchingRule[],
    preferences: MatchingPreferencesDto,
  ): { matches: Match[]; rejectedOrders: string[] } {
    const buyOrders = cluster.orders.filter((order) => order.type === 'buy');
    const sellOrders = cluster.orders.filter((order) => order.type === 'sell');

    const matches: Match[] = [];
    const rejectedOrders: string[] = [];
    const usedOrderIds = new Set<string>();

    for (const buyOrder of buyOrders) {
      if (usedOrderIds.has(buyOrder.id)) continue;

      const bestSellOrder = this.findBestGeographicMatch(
        buyOrder,
        sellOrders,
        usedOrderIds,
        rules,
        preferences,
      );

      if (bestSellOrder) {
        const match = this.createGeographicMatch(
          buyOrder,
          bestSellOrder,
          cluster,
          preferences,
        );
        matches.push(match);
        usedOrderIds.add(buyOrder.id);
        usedOrderIds.add(bestSellOrder.id);

        this.logger.log(
          `Created geographic match: Buy ${buyOrder.id} -> Sell ${bestSellOrder.id} in cluster ${cluster.id}`,
        );
      } else {
        rejectedOrders.push(buyOrder.id);
      }
    }

    return { matches, rejectedOrders };
  }

  private findBestGeographicMatch(
    buyOrder: Order,
    sellOrders: Order[],
    usedOrderIds: Set<string>,
    rules: MatchingRule[],
    preferences: MatchingPreferencesDto,
  ): Order | null {
    let bestMatch: Order | null = null;
    let bestScore = -1;

    for (const sellOrder of sellOrders) {
      if (usedOrderIds.has(sellOrder.id)) continue;

      const geographicScore = this.calculateGeographicScore(
        buyOrder,
        sellOrder,
        preferences,
      );
      const priceScore = this.calculatePriceScore(
        buyOrder,
        sellOrder,
        preferences,
      );
      const quantityScore = this.calculateQuantityScore(
        buyOrder,
        sellOrder,
        preferences,
      );

      const combinedScore = this.calculateCombinedGeographicScore(
        geographicScore,
        priceScore,
        quantityScore,
        rules,
      );

      if (
        combinedScore > bestScore &&
        this.isPriceCompatible(buyOrder, sellOrder, preferences)
      ) {
        bestScore = combinedScore;
        bestMatch = sellOrder;
      }
    }

    return bestMatch;
  }

  private calculateGeographicScore(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): number {
    if (!buyOrder.location || !sellOrder.location) return 0.5;

    const distance = this.calculateDistance(
      buyOrder.location,
      sellOrder.location,
    );
    const maxDistance = preferences.geographic?.maxDistance || 100;

    let score = Math.max(0, 1 - distance / maxDistance);

    const buyRegion = this.getRegionFromLocation(buyOrder.location);
    const sellRegion = this.getRegionFromLocation(sellOrder.location);

    if (buyRegion === sellRegion) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  private calculatePriceScore(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): number {
    const buyPrice = buyOrder.price || 0;
    const sellPrice = sellOrder.price || 0;

    if (buyPrice < sellPrice) return 0;

    const priceDifference = buyPrice - sellPrice;
    const tolerance = preferences.price?.priceTolerance || 15;

    return Math.max(0, 1 - priceDifference / tolerance);
  }

  private calculateQuantityScore(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): number {
    const buyQuantity = buyOrder.quantity || 0;
    const sellQuantity = sellOrder.quantity || 0;

    if (preferences.quantity?.allowPartialFulfillment) {
      return Math.min(sellQuantity / buyQuantity, 1);
    }

    return buyQuantity === sellQuantity ? 1 : 0;
  }

  private calculateCombinedGeographicScore(
    geographicScore: number,
    priceScore: number,
    quantityScore: number,
    rules: MatchingRule[],
  ): number {
    let geographicWeight = 0.5;
    let priceWeight = 0.3;
    let quantityWeight = 0.2;

    for (const rule of rules.filter((r) => r.status === 'active')) {
      switch (rule.type) {
        case RuleType.GEOGRAPHIC_PROXIMITY:
          geographicWeight += rule.weight || 0;
          break;
        case RuleType.PRICE_PRIORITY:
          priceWeight += rule.weight || 0;
          break;
        case RuleType.QUANTITY_MATCH:
          quantityWeight += rule.weight || 0;
          break;
      }
    }

    const totalWeight = geographicWeight + priceWeight + quantityWeight;

    return (
      (geographicScore * geographicWeight +
        priceScore * priceWeight +
        quantityScore * quantityWeight) /
      totalWeight
    );
  }

  private isPriceCompatible(
    buyOrder: Order,
    sellOrder: Order,
    preferences: MatchingPreferencesDto,
  ): boolean {
    const buyPrice = buyOrder.price || 0;
    const sellPrice = sellOrder.price || 0;

    if (buyPrice < sellPrice) return false;

    if (preferences.price?.maxPrice && sellPrice > preferences.price.maxPrice)
      return false;
    if (preferences.price?.minPrice && sellPrice < preferences.price.minPrice)
      return false;

    const priceDifference = buyPrice - sellPrice;
    const tolerance = preferences.price?.priceTolerance || 15;

    return priceDifference <= tolerance;
  }

  private createGeographicMatch(
    buyOrder: Order,
    sellOrder: Order,
    cluster: GeographicCluster,
    preferences: MatchingPreferencesDto,
  ): Match {
    const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
    const matchedPrice = (buyOrder.price + sellOrder.price) / 2;
    const distance = this.calculateDistance(
      buyOrder.location,
      sellOrder.location,
    );

    const match = new Match();
    match.buyerOrderId = buyOrder.id;
    match.sellerOrderId = sellOrder.id;
    match.matchedQuantity = matchedQuantity;
    match.matchedPrice = matchedPrice;
    match.matchingScore = this.calculateGeographicScore(
      buyOrder,
      sellOrder,
      preferences,
    );
    match.status = MatchStatus.PENDING;
    match.type =
      matchedQuantity < buyOrder.quantity ? MatchType.PARTIAL : MatchType.FULL;
    match.remainingQuantity =
      matchedQuantity < buyOrder.quantity
        ? buyOrder.quantity - matchedQuantity
        : null;
    match.distance = distance;
    match.metadata = {
      algorithm: 'geographic',
      priority: match.matchingScore,
      renewablePreference: preferences.renewable?.preferRenewable,
      clusterId: cluster.id,
      auditTrail: [
        {
          timestamp: new Date(),
          action: 'match_created',
          reason: `Geographic matching in cluster ${cluster.id}, distance: ${distance.toFixed(2)}km`,
        },
      ],
    };
    match.expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    return match;
  }

  private calculateDistance(
    location1: LocationPoint,
    location2: LocationPoint,
  ): number {
    const lat1 = location1.latitude || 0;
    const lon1 = location1.longitude || 0;
    const lat2 = location2.latitude || 0;
    const lon2 = location2.longitude || 0;

    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private getRegionFromLocation(location: LocationPoint): string {
    if (location.region) return location.region;
    if (location.country) return location.country;

    return 'unknown';
  }

  async findOptimalDeliveryRoutes(matches: Match[]): Promise<{
    matches: Match[];
    routes: Array<{
      matchId: string;
      route: LocationPoint[];
      estimatedDistance: number;
      estimatedTime: number;
    }>;
  }> {
    const routes = [];

    for (const match of matches) {
      const route = await this.calculateOptimalRoute(match);
      routes.push(route);
    }

    return { matches, routes };
  }

  private async calculateOptimalRoute(match: Match): Promise<{
    matchId: string;
    route: LocationPoint[];
    estimatedDistance: number;
    estimatedTime: number;
  }> {
    const route: LocationPoint[] = [];
    let totalDistance = 0;

    if (match.buyerOrder?.location) {
      route.push(match.buyerOrder.location);
    }

    if (match.sellerOrder?.location) {
      route.push(match.sellerOrder.location);
      if (route.length > 1) {
        totalDistance = this.calculateDistance(route[0], route[1]);
      }
    }

    const estimatedTime = totalDistance * 2;

    return {
      matchId: match.id,
      route,
      estimatedDistance: totalDistance,
      estimatedTime,
    };
  }
}

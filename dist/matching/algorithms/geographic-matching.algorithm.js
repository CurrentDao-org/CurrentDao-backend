"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GeographicMatchingAlgorithm_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeographicMatchingAlgorithm = void 0;
const common_1 = require("@nestjs/common");
const match_entity_1 = require("../entities/match.entity");
const matching_rule_entity_1 = require("../entities/matching-rule.entity");
let GeographicMatchingAlgorithm = GeographicMatchingAlgorithm_1 = class GeographicMatchingAlgorithm {
    constructor() {
        this.logger = new common_1.Logger(GeographicMatchingAlgorithm_1.name);
    }
    async findMatches(buyOrders, sellOrders, rules, preferences) {
        const startTime = Date.now();
        this.logger.log(`Starting geographic matching with ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`);
        const filteredBuyOrders = this.filterOrdersByGeography(buyOrders, preferences);
        const filteredSellOrders = this.filterOrdersByGeography(sellOrders, preferences);
        const clusters = this.createGeographicClusters(filteredBuyOrders, filteredSellOrders, preferences);
        const matches = [];
        const rejectedOrders = [];
        for (const cluster of clusters) {
            const clusterMatches = this.matchWithinCluster(cluster, rules, preferences);
            matches.push(...clusterMatches.matches);
            rejectedOrders.push(...clusterMatches.rejectedOrders);
        }
        const processingTime = Date.now() - startTime;
        this.logger.log(`Geographic matching completed in ${processingTime}ms. Matches: ${matches.length}, Rejected: ${rejectedOrders.length}`);
        return {
            matches,
            rejectedOrders,
            processingTime,
            algorithm: 'geographic',
        };
    }
    filterOrdersByGeography(orders, preferences) {
        if (!preferences.geographic)
            return orders;
        return orders.filter(order => {
            if (!order.location)
                return false;
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
    createGeographicClusters(buyOrders, sellOrders, preferences) {
        const allOrders = [...buyOrders, ...sellOrders];
        const maxDistance = preferences.geographic?.maxDistance || 100;
        const clusters = [];
        const processedOrderIds = new Set();
        for (const order of allOrders) {
            if (processedOrderIds.has(order.id) || !order.location)
                continue;
            const nearbyOrders = this.findNearbyOrders(order, allOrders, maxDistance);
            const cluster = this.createCluster(order, nearbyOrders);
            clusters.push(cluster);
            nearbyOrders.forEach(nearbyOrder => processedOrderIds.add(nearbyOrder.id));
        }
        return clusters;
    }
    findNearbyOrders(centerOrder, allOrders, maxDistance) {
        if (!centerOrder.location)
            return [];
        return allOrders.filter(order => {
            if (order.id === centerOrder.id || !order.location)
                return false;
            const distance = this.calculateDistance(centerOrder.location, order.location);
            return distance <= maxDistance;
        });
    }
    createCluster(centerOrder, orders) {
        const buyOrders = orders.filter(order => order.type === 'buy');
        const sellOrders = orders.filter(order => order.type === 'sell');
        const totalBuyQuantity = buyOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
        const totalSellQuantity = sellOrders.reduce((sum, order) => sum + (order.quantity || 0), 0);
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
    calculateClusterCenter(orders) {
        const validLocations = orders.filter(order => order.location).map(order => order.location);
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
    calculateClusterRadius(orders, center) {
        let maxDistance = 0;
        for (const order of orders) {
            if (!order.location)
                continue;
            const distance = this.calculateDistance(center, order.location);
            maxDistance = Math.max(maxDistance, distance);
        }
        return maxDistance;
    }
    matchWithinCluster(cluster, rules, preferences) {
        const buyOrders = cluster.orders.filter(order => order.type === 'buy');
        const sellOrders = cluster.orders.filter(order => order.type === 'sell');
        const matches = [];
        const rejectedOrders = [];
        const usedOrderIds = new Set();
        for (const buyOrder of buyOrders) {
            if (usedOrderIds.has(buyOrder.id))
                continue;
            const bestSellOrder = this.findBestGeographicMatch(buyOrder, sellOrders, usedOrderIds, rules, preferences);
            if (bestSellOrder) {
                const match = this.createGeographicMatch(buyOrder, bestSellOrder, cluster, preferences);
                matches.push(match);
                usedOrderIds.add(buyOrder.id);
                usedOrderIds.add(bestSellOrder.id);
                this.logger.log(`Created geographic match: Buy ${buyOrder.id} -> Sell ${bestSellOrder.id} in cluster ${cluster.id}`);
            }
            else {
                rejectedOrders.push(buyOrder.id);
            }
        }
        return { matches, rejectedOrders };
    }
    findBestGeographicMatch(buyOrder, sellOrders, usedOrderIds, rules, preferences) {
        let bestMatch = null;
        let bestScore = -1;
        for (const sellOrder of sellOrders) {
            if (usedOrderIds.has(sellOrder.id))
                continue;
            const geographicScore = this.calculateGeographicScore(buyOrder, sellOrder, preferences);
            const priceScore = this.calculatePriceScore(buyOrder, sellOrder, preferences);
            const quantityScore = this.calculateQuantityScore(buyOrder, sellOrder, preferences);
            const combinedScore = this.calculateCombinedGeographicScore(geographicScore, priceScore, quantityScore, rules);
            if (combinedScore > bestScore && this.isPriceCompatible(buyOrder, sellOrder, preferences)) {
                bestScore = combinedScore;
                bestMatch = sellOrder;
            }
        }
        return bestMatch;
    }
    calculateGeographicScore(buyOrder, sellOrder, preferences) {
        if (!buyOrder.location || !sellOrder.location)
            return 0.5;
        const distance = this.calculateDistance(buyOrder.location, sellOrder.location);
        const maxDistance = preferences.geographic?.maxDistance || 100;
        let score = Math.max(0, 1 - (distance / maxDistance));
        const buyRegion = this.getRegionFromLocation(buyOrder.location);
        const sellRegion = this.getRegionFromLocation(sellOrder.location);
        if (buyRegion === sellRegion) {
            score += 0.2;
        }
        return Math.min(score, 1);
    }
    calculatePriceScore(buyOrder, sellOrder, preferences) {
        const buyPrice = buyOrder.price || 0;
        const sellPrice = sellOrder.price || 0;
        if (buyPrice < sellPrice)
            return 0;
        const priceDifference = buyPrice - sellPrice;
        const tolerance = preferences.price?.priceTolerance || 15;
        return Math.max(0, 1 - (priceDifference / tolerance));
    }
    calculateQuantityScore(buyOrder, sellOrder, preferences) {
        const buyQuantity = buyOrder.quantity || 0;
        const sellQuantity = sellOrder.quantity || 0;
        if (preferences.quantity?.allowPartialFulfillment) {
            return Math.min(sellQuantity / buyQuantity, 1);
        }
        return buyQuantity === sellQuantity ? 1 : 0;
    }
    calculateCombinedGeographicScore(geographicScore, priceScore, quantityScore, rules) {
        let geographicWeight = 0.5;
        let priceWeight = 0.3;
        let quantityWeight = 0.2;
        for (const rule of rules.filter(r => r.status === 'active')) {
            switch (rule.type) {
                case matching_rule_entity_1.RuleType.GEOGRAPHIC_PROXIMITY:
                    geographicWeight += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.PRICE_PRIORITY:
                    priceWeight += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.QUANTITY_MATCH:
                    quantityWeight += rule.weight || 0;
                    break;
            }
        }
        const totalWeight = geographicWeight + priceWeight + quantityWeight;
        return ((geographicScore * geographicWeight) +
            (priceScore * priceWeight) +
            (quantityScore * quantityWeight)) / totalWeight;
    }
    isPriceCompatible(buyOrder, sellOrder, preferences) {
        const buyPrice = buyOrder.price || 0;
        const sellPrice = sellOrder.price || 0;
        if (buyPrice < sellPrice)
            return false;
        if (preferences.price?.maxPrice && sellPrice > preferences.price.maxPrice)
            return false;
        if (preferences.price?.minPrice && sellPrice < preferences.price.minPrice)
            return false;
        const priceDifference = buyPrice - sellPrice;
        const tolerance = preferences.price?.priceTolerance || 15;
        return priceDifference <= tolerance;
    }
    createGeographicMatch(buyOrder, sellOrder, cluster, preferences) {
        const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
        const matchedPrice = (buyOrder.price + sellOrder.price) / 2;
        const distance = this.calculateDistance(buyOrder.location, sellOrder.location);
        const match = new match_entity_1.Match();
        match.buyerOrderId = buyOrder.id;
        match.sellerOrderId = sellOrder.id;
        match.matchedQuantity = matchedQuantity;
        match.matchedPrice = matchedPrice;
        match.matchingScore = this.calculateGeographicScore(buyOrder, sellOrder, preferences);
        match.status = match_entity_1.MatchStatus.PENDING;
        match.type = matchedQuantity < buyOrder.quantity ? match_entity_1.MatchType.PARTIAL : match_entity_1.MatchType.FULL;
        match.remainingQuantity = matchedQuantity < buyOrder.quantity ? buyOrder.quantity - matchedQuantity : null;
        match.distance = distance;
        match.metadata = {
            algorithm: 'geographic',
            priority: match.matchingScore,
            renewablePreference: preferences.renewable?.preferRenewable,
            clusterId: cluster.id,
            auditTrail: [{
                    timestamp: new Date(),
                    action: 'match_created',
                    reason: `Geographic matching in cluster ${cluster.id}, distance: ${distance.toFixed(2)}km`,
                }],
        };
        match.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        return match;
    }
    calculateDistance(location1, location2) {
        const lat1 = location1.latitude || 0;
        const lon1 = location1.longitude || 0;
        const lat2 = location2.latitude || 0;
        const lon2 = location2.longitude || 0;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    getRegionFromLocation(location) {
        if (location.region)
            return location.region;
        if (location.country)
            return location.country;
        return 'unknown';
    }
    async findOptimalDeliveryRoutes(matches) {
        const routes = [];
        for (const match of matches) {
            const route = await this.calculateOptimalRoute(match);
            routes.push(route);
        }
        return { matches, routes };
    }
    async calculateOptimalRoute(match) {
        const route = [];
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
};
exports.GeographicMatchingAlgorithm = GeographicMatchingAlgorithm;
exports.GeographicMatchingAlgorithm = GeographicMatchingAlgorithm = GeographicMatchingAlgorithm_1 = __decorate([
    (0, common_1.Injectable)()
], GeographicMatchingAlgorithm);
//# sourceMappingURL=geographic-matching.algorithm.js.map
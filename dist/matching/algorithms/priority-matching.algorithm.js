"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PriorityMatchingAlgorithm_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriorityMatchingAlgorithm = void 0;
const common_1 = require("@nestjs/common");
const match_entity_1 = require("../entities/match.entity");
const matching_rule_entity_1 = require("../entities/matching-rule.entity");
let PriorityMatchingAlgorithm = PriorityMatchingAlgorithm_1 = class PriorityMatchingAlgorithm {
    constructor() {
        this.logger = new common_1.Logger(PriorityMatchingAlgorithm_1.name);
    }
    async findMatches(buyOrders, sellOrders, rules, preferences) {
        const startTime = Date.now();
        this.logger.log(`Starting priority matching with ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`);
        const prioritizedBuyOrders = this.calculateOrderPriorities(buyOrders, rules, 'buyer');
        const prioritizedSellOrders = this.calculateOrderPriorities(sellOrders, rules, 'seller');
        const matches = [];
        const rejectedOrders = [];
        const availableSellOrders = [...prioritizedSellOrders];
        const usedSellOrderIds = new Set();
        for (const buyOrder of prioritizedBuyOrders) {
            let bestMatch = null;
            let bestScore = -1;
            for (const sellOrder of availableSellOrders) {
                if (usedSellOrderIds.has(sellOrder.id))
                    continue;
                const compatibilityScore = this.calculateCompatibilityScore(buyOrder, sellOrder, rules, preferences);
                if (compatibilityScore > bestScore && this.isPriceCompatible(buyOrder, sellOrder, preferences)) {
                    bestScore = compatibilityScore;
                    bestMatch = sellOrder;
                }
            }
            if (bestMatch && bestScore > 0.5) {
                const match = this.createMatch(buyOrder, bestMatch, bestScore, preferences);
                matches.push(match);
                usedSellOrderIds.add(bestMatch.id);
                this.logger.log(`Created match: Buy ${buyOrder.id} -> Sell ${bestMatch.id} (Score: ${bestScore.toFixed(3)})`);
            }
            else {
                rejectedOrders.push(buyOrder.id);
            }
        }
        const processingTime = Date.now() - startTime;
        this.logger.log(`Priority matching completed in ${processingTime}ms. Matches: ${matches.length}, Rejected: ${rejectedOrders.length}`);
        return {
            matches,
            rejectedOrders,
            processingTime,
            algorithm: 'priority',
        };
    }
    calculateOrderPriorities(orders, rules, orderType) {
        return orders
            .map(order => ({
            order,
            priority: this.calculateOrderPriority(order, rules, orderType),
        }))
            .sort((a, b) => b.priority - a.priority)
            .map(item => item.order);
    }
    calculateOrderPriority(order, rules, orderType) {
        let priority = 0;
        const applicableRules = rules.filter(rule => {
            if (orderType === 'buyer' && !rule.appliesToBuyer)
                return false;
            if (orderType === 'seller' && !rule.appliesToSeller)
                return false;
            if (rule.status !== 'active')
                return false;
            return true;
        });
        for (const rule of applicableRules) {
            switch (rule.type) {
                case matching_rule_entity_1.RuleType.PRICE_PRIORITY:
                    if (orderType === 'buyer') {
                        priority += rule.weight * (1 / (order.price || 1));
                    }
                    else {
                        priority += rule.weight * (order.price || 1);
                    }
                    break;
                case matching_rule_entity_1.RuleType.TIME_PRIORITY:
                    const hoursSinceCreation = (Date.now() - order.createdAt.getTime()) / (1000 * 60 * 60);
                    priority += rule.weight * Math.min(hoursSinceCreation / 24, 1);
                    break;
                case matching_rule_entity_1.RuleType.SUPPLIER_RELIABILITY:
                    const reliabilityScore = order.supplier?.reliabilityScore || 0.5;
                    priority += rule.weight * reliabilityScore;
                    break;
                case matching_rule_entity_1.RuleType.MINIMUM_ORDER_SIZE:
                    if (order.quantity >= (rule.parameters?.minOrderSize || 0)) {
                        priority += rule.weight;
                    }
                    break;
                case matching_rule_entity_1.RuleType.MARKET_SEGMENT:
                    if (rule.parameters?.marketSegment === order.marketSegment) {
                        priority += rule.weight;
                    }
                    break;
            }
        }
        return priority;
    }
    calculateCompatibilityScore(buyOrder, sellOrder, rules, preferences) {
        let score = 0;
        let totalWeight = 0;
        const priceScore = this.calculatePriceScore(buyOrder, sellOrder, preferences);
        const quantityScore = this.calculateQuantityScore(buyOrder, sellOrder, preferences);
        const timeScore = this.calculateTimeScore(buyOrder, sellOrder);
        const reliabilityScore = this.calculateReliabilityScore(buyOrder, sellOrder);
        const weights = this.getRuleWeights(rules);
        score += priceScore * weights.price;
        totalWeight += weights.price;
        score += quantityScore * weights.quantity;
        totalWeight += weights.quantity;
        score += timeScore * weights.time;
        totalWeight += weights.time;
        score += reliabilityScore * weights.reliability;
        totalWeight += weights.reliability;
        if (preferences.geographic) {
            const geographicScore = this.calculateGeographicScore(buyOrder, sellOrder, preferences);
            score += geographicScore * weights.geographic;
            totalWeight += weights.geographic;
        }
        if (preferences.renewable?.preferRenewable) {
            const renewableScore = this.calculateRenewableScore(buyOrder, sellOrder, preferences);
            score += renewableScore * weights.renewable;
            totalWeight += weights.renewable;
        }
        return totalWeight > 0 ? score / totalWeight : 0;
    }
    calculatePriceScore(buyOrder, sellOrder, preferences) {
        const buyPrice = buyOrder.price || 0;
        const sellPrice = sellOrder.price || 0;
        if (buyPrice < sellPrice)
            return 0;
        const priceDifference = buyPrice - sellPrice;
        const tolerance = preferences.price?.priceTolerance || 10;
        return Math.max(0, 1 - (priceDifference / tolerance));
    }
    calculateQuantityScore(buyOrder, sellOrder, preferences) {
        const buyQuantity = buyOrder.quantity || 0;
        const sellQuantity = sellOrder.quantity || 0;
        if (preferences.quantity?.allowPartialFulfillment) {
            const minQuantity = preferences.quantity.minimumQuantity || 0;
            const maxQuantity = preferences.quantity.maximumQuantity || Infinity;
            if (sellQuantity >= minQuantity && sellQuantity <= maxQuantity) {
                return Math.min(sellQuantity / buyQuantity, 1);
            }
            return 0;
        }
        return buyQuantity === sellQuantity ? 1 : 0;
    }
    calculateTimeScore(buyOrder, sellOrder) {
        const timeDiff = Math.abs(buyOrder.createdAt.getTime() - sellOrder.createdAt.getTime());
        const maxTimeDiff = 24 * 60 * 60 * 1000;
        return Math.max(0, 1 - (timeDiff / maxTimeDiff));
    }
    calculateReliabilityScore(buyOrder, sellOrder) {
        const buyReliability = buyOrder.supplier?.reliabilityScore || 0.5;
        const sellReliability = sellOrder.supplier?.reliabilityScore || 0.5;
        return (buyReliability + sellReliability) / 2;
    }
    calculateGeographicScore(buyOrder, sellOrder, preferences) {
        if (!buyOrder.location || !sellOrder.location)
            return 0.5;
        const distance = this.calculateDistance(buyOrder.location, sellOrder.location);
        const maxDistance = preferences.geographic?.maxDistance || 1000;
        return Math.max(0, 1 - (distance / maxDistance));
    }
    calculateRenewableScore(buyOrder, sellOrder, preferences) {
        const buyRenewable = buyOrder.energyType?.isRenewable || false;
        const sellRenewable = sellOrder.energyType?.isRenewable || false;
        if (!preferences.renewable?.preferRenewable)
            return 0.5;
        if (buyRenewable && sellRenewable)
            return 1;
        if (buyRenewable || sellRenewable)
            return 0.5;
        return 0.2;
    }
    getRuleWeights(rules) {
        const defaultWeights = {
            price: 0.3,
            quantity: 0.2,
            time: 0.2,
            reliability: 0.15,
            geographic: 0.1,
            renewable: 0.05,
        };
        const customWeights = { ...defaultWeights };
        for (const rule of rules.filter(r => r.status === 'active')) {
            switch (rule.type) {
                case matching_rule_entity_1.RuleType.PRICE_PRIORITY:
                    customWeights.price += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.QUANTITY_MATCH:
                    customWeights.quantity += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.TIME_PRIORITY:
                    customWeights.time += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.SUPPLIER_RELIABILITY:
                    customWeights.reliability += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.GEOGRAPHIC_PROXIMITY:
                    customWeights.geographic += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.RENEWABLE_PREFERENCE:
                    customWeights.renewable += rule.weight || 0;
                    break;
            }
        }
        const total = Object.values(customWeights).reduce((sum, weight) => sum + weight, 0);
        return Object.fromEntries(Object.entries(customWeights).map(([key, value]) => [key, value / total]));
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
        const tolerance = preferences.price?.priceTolerance || 10;
        return priceDifference <= tolerance;
    }
    createMatch(buyOrder, sellOrder, score, preferences) {
        const matchedQuantity = Math.min(buyOrder.quantity, sellOrder.quantity);
        const matchedPrice = (buyOrder.price + sellOrder.price) / 2;
        const match = new match_entity_1.Match();
        match.buyerOrderId = buyOrder.id;
        match.sellerOrderId = sellOrder.id;
        match.matchedQuantity = matchedQuantity;
        match.matchedPrice = matchedPrice;
        match.matchingScore = score;
        match.status = match_entity_1.MatchStatus.PENDING;
        match.type = matchedQuantity < buyOrder.quantity ? match_entity_1.MatchType.PARTIAL : match_entity_1.MatchType.FULL;
        match.remainingQuantity = matchedQuantity < buyOrder.quantity ? buyOrder.quantity - matchedQuantity : null;
        match.distance = this.calculateDistance(buyOrder.location, sellOrder.location);
        match.metadata = {
            algorithm: 'priority',
            priority: score,
            renewablePreference: preferences.renewable?.preferRenewable,
            auditTrail: [{
                    timestamp: new Date(),
                    action: 'match_created',
                    reason: `Priority matching with score ${score.toFixed(3)}`,
                }],
        };
        match.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        return match;
    }
    calculateDistance(location1, location2) {
        if (!location1 || !location2)
            return 0;
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
};
exports.PriorityMatchingAlgorithm = PriorityMatchingAlgorithm;
exports.PriorityMatchingAlgorithm = PriorityMatchingAlgorithm = PriorityMatchingAlgorithm_1 = __decorate([
    (0, common_1.Injectable)()
], PriorityMatchingAlgorithm);
//# sourceMappingURL=priority-matching.algorithm.js.map
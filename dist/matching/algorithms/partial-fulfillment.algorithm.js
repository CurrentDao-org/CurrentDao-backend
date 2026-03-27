"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PartialFulfillmentAlgorithm_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartialFulfillmentAlgorithm = void 0;
const common_1 = require("@nestjs/common");
const match_entity_1 = require("../entities/match.entity");
const matching_rule_entity_1 = require("../entities/matching-rule.entity");
let PartialFulfillmentAlgorithm = PartialFulfillmentAlgorithm_1 = class PartialFulfillmentAlgorithm {
    constructor() {
        this.logger = new common_1.Logger(PartialFulfillmentAlgorithm_1.name);
    }
    async findMatches(buyOrders, sellOrders, rules, preferences) {
        const startTime = Date.now();
        this.logger.log(`Starting partial fulfillment matching with ${buyOrders.length} buy orders and ${sellOrders.length} sell orders`);
        const fulfillmentPlans = this.createFulfillmentPlans(buyOrders, sellOrders, rules, preferences);
        const optimizedPlans = this.optimizeFulfillmentPlans(fulfillmentPlans, preferences);
        const matches = this.executeFulfillmentPlans(optimizedPlans, preferences);
        const partiallyFulfilledOrders = this.calculatePartialFulfillmentStats(optimizedPlans, matches);
        const rejectedOrders = this.identifyRejectedOrders(optimizedPlans);
        const processingTime = Date.now() - startTime;
        this.logger.log(`Partial fulfillment matching completed in ${processingTime}ms. Matches: ${matches.length}, Partially fulfilled: ${partiallyFulfilledOrders.length}`);
        return {
            matches,
            partiallyFulfilledOrders,
            rejectedOrders,
            processingTime,
            algorithm: 'partial_fulfillment',
        };
    }
    createFulfillmentPlans(buyOrders, sellOrders, rules, preferences) {
        const plans = [];
        for (const buyOrder of buyOrders) {
            const plan = this.createFulfillmentPlan(buyOrder, sellOrders, rules, preferences, 'buyer');
            if (plan)
                plans.push(plan);
        }
        for (const sellOrder of sellOrders) {
            const plan = this.createFulfillmentPlan(sellOrder, buyOrders, rules, preferences, 'seller');
            if (plan)
                plans.push(plan);
        }
        return plans;
    }
    createFulfillmentPlan(order, potentialPartners, rules, preferences, orderType) {
        const compatiblePartners = potentialPartners.filter(partner => this.isCompatibleForPartialFulfillment(order, partner, preferences));
        if (compatiblePartners.length === 0)
            return null;
        const scoredPartners = compatiblePartners.map(partner => ({
            partnerOrderId: partner.id,
            quantity: Math.min(order.quantity, partner.quantity),
            price: orderType === 'buyer' ? partner.price : order.price,
            score: this.calculatePartialFulfillmentScore(order, partner, rules, preferences),
        })).sort((a, b) => b.score - a.score);
        const fulfillmentStrategy = this.determineFulfillmentStrategy(order, scoredPartners, preferences);
        const selectedMatches = this.selectMatchesForStrategy(order, scoredPartners, fulfillmentStrategy, preferences);
        const totalFulfilledQuantity = selectedMatches.reduce((sum, match) => sum + match.quantity, 0);
        const remainingQuantity = order.quantity - totalFulfilledQuantity;
        const efficiency = totalFulfilledQuantity / order.quantity;
        return {
            orderId: order.id,
            order,
            fulfillmentStrategy,
            matches: selectedMatches,
            totalFulfilledQuantity,
            remainingQuantity,
            efficiency,
        };
    }
    isCompatibleForPartialFulfillment(order, partner, preferences) {
        if (!preferences.quantity?.allowPartialFulfillment) {
            return order.quantity === partner.quantity;
        }
        const minQuantity = preferences.quantity.minimumQuantity || 0;
        const maxQuantity = preferences.quantity.maximumQuantity || Infinity;
        if (partner.quantity < minQuantity || partner.quantity > maxQuantity) {
            return false;
        }
        if (!this.isPriceCompatible(order, partner, preferences)) {
            return false;
        }
        const threshold = preferences.quantity.partialFulfillmentThreshold || 50;
        const fulfillmentPercentage = (Math.min(order.quantity, partner.quantity) / order.quantity) * 100;
        return fulfillmentPercentage >= threshold;
    }
    calculatePartialFulfillmentScore(order, partner, rules, preferences) {
        const quantityScore = this.calculateQuantityScore(order, partner, preferences);
        const priceScore = this.calculatePriceScore(order, partner, preferences);
        const efficiencyScore = this.calculateEfficiencyScore(order, partner);
        const reliabilityScore = this.calculateReliabilityScore(order, partner);
        let quantityWeight = 0.3;
        let priceWeight = 0.3;
        let efficiencyWeight = 0.2;
        let reliabilityWeight = 0.2;
        for (const rule of rules.filter(r => r.status === 'active')) {
            switch (rule.type) {
                case matching_rule_entity_1.RuleType.QUANTITY_MATCH:
                    quantityWeight += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.PRICE_PRIORITY:
                    priceWeight += rule.weight || 0;
                    break;
                case matching_rule_entity_1.RuleType.SUPPLIER_RELIABILITY:
                    reliabilityWeight += rule.weight || 0;
                    break;
            }
        }
        const totalWeight = quantityWeight + priceWeight + efficiencyWeight + reliabilityWeight;
        return ((quantityScore * quantityWeight) +
            (priceScore * priceWeight) +
            (efficiencyScore * efficiencyWeight) +
            (reliabilityScore * reliabilityWeight)) / totalWeight;
    }
    calculateQuantityScore(order, partner, preferences) {
        const orderQuantity = order.quantity || 0;
        const partnerQuantity = partner.quantity || 0;
        const fulfillmentQuantity = Math.min(orderQuantity, partnerQuantity);
        const fulfillmentRatio = fulfillmentQuantity / orderQuantity;
        return fulfillmentRatio;
    }
    calculatePriceScore(order, partner, preferences) {
        const orderPrice = order.price || 0;
        const partnerPrice = partner.price || 0;
        if (order.type === 'buy') {
            if (orderPrice < partnerPrice)
                return 0;
            const priceDifference = orderPrice - partnerPrice;
            const tolerance = preferences.price?.priceTolerance || 10;
            return Math.max(0, 1 - (priceDifference / tolerance));
        }
        else {
            if (partnerPrice < orderPrice)
                return 0;
            const priceDifference = partnerPrice - orderPrice;
            const tolerance = preferences.price?.priceTolerance || 10;
            return Math.max(0, 1 - (priceDifference / tolerance));
        }
    }
    calculateEfficiencyScore(order, partner) {
        const orderQuantity = order.quantity || 0;
        const partnerQuantity = partner.quantity || 0;
        const waste = Math.abs(orderQuantity - partnerQuantity);
        const totalQuantity = orderQuantity + partnerQuantity;
        return Math.max(0, 1 - (waste / totalQuantity));
    }
    calculateReliabilityScore(order, partner) {
        const orderReliability = order.supplier?.reliabilityScore || 0.5;
        const partnerReliability = partner.supplier?.reliabilityScore || 0.5;
        return (orderReliability + partnerReliability) / 2;
    }
    determineFulfillmentStrategy(order, scoredPartners, preferences) {
        if (scoredPartners.length === 0)
            return 'single';
        const bestPartner = scoredPartners[0];
        const fulfillmentRatio = bestPartner.quantity / order.quantity;
        if (fulfillmentRatio >= 0.95) {
            return 'single';
        }
        const totalAvailableQuantity = scoredPartners.reduce((sum, partner) => sum + partner.quantity, 0);
        if (totalAvailableQuantity >= order.quantity * 0.9) {
            return 'multiple';
        }
        return 'split';
    }
    selectMatchesForStrategy(order, scoredPartners, strategy, preferences) {
        switch (strategy) {
            case 'single':
                return scoredPartners.slice(0, 1);
            case 'multiple':
                return this.selectMultipleMatches(order, scoredPartners, preferences);
            case 'split':
                return this.selectSplitMatches(order, scoredPartners, preferences);
            default:
                return [];
        }
    }
    selectMultipleMatches(order, scoredPartners, preferences) {
        const selectedMatches = [];
        let remainingQuantity = order.quantity;
        for (const partner of scoredPartners) {
            if (remainingQuantity <= 0)
                break;
            const matchQuantity = Math.min(partner.quantity, remainingQuantity);
            selectedMatches.push({
                ...partner,
                quantity: matchQuantity,
            });
            remainingQuantity -= matchQuantity;
        }
        return selectedMatches;
    }
    selectSplitMatches(order, scoredPartners, preferences) {
        const selectedMatches = [];
        let remainingQuantity = order.quantity;
        for (const partner of scoredPartners) {
            if (remainingQuantity <= 0)
                break;
            const maxSplitQuantity = partner.quantity * 0.8;
            const matchQuantity = Math.min(maxSplitQuantity, remainingQuantity);
            if (matchQuantity > 0) {
                selectedMatches.push({
                    ...partner,
                    quantity: matchQuantity,
                });
                remainingQuantity -= matchQuantity;
            }
        }
        return selectedMatches;
    }
    optimizeFulfillmentPlans(plans, preferences) {
        return plans
            .filter(plan => plan.efficiency >= (preferences.quantity?.partialFulfillmentThreshold || 50) / 100)
            .sort((a, b) => b.efficiency - a.efficiency);
    }
    executeFulfillmentPlans(plans, preferences) {
        const matches = [];
        const usedOrderIds = new Set();
        for (const plan of plans) {
            if (usedOrderIds.has(plan.orderId))
                continue;
            for (const matchInfo of plan.matches) {
                if (usedOrderIds.has(matchInfo.partnerOrderId))
                    continue;
                const match = this.createPartialMatch(plan.order, matchInfo, plan.fulfillmentStrategy, preferences);
                matches.push(match);
                usedOrderIds.add(plan.orderId);
                usedOrderIds.add(matchInfo.partnerOrderId);
            }
        }
        return matches;
    }
    createPartialMatch(order, matchInfo, strategy, preferences) {
        const isBuyOrder = order.type === 'buy';
        const matchedPrice = matchInfo.price;
        const match = new match_entity_1.Match();
        match.buyerOrderId = isBuyOrder ? order.id : matchInfo.partnerOrderId;
        match.sellerOrderId = isBuyOrder ? matchInfo.partnerOrderId : order.id;
        match.matchedQuantity = matchInfo.quantity;
        match.matchedPrice = matchedPrice;
        match.matchingScore = matchInfo.score;
        match.status = match_entity_1.MatchStatus.PENDING;
        match.type = strategy === 'split' ? match_entity_1.MatchType.SPLIT : match_entity_1.MatchType.PARTIAL;
        match.remainingQuantity = order.quantity - matchInfo.quantity;
        match.metadata = {
            algorithm: 'partial_fulfillment',
            priority: matchInfo.score,
            fulfillmentStrategy: strategy,
            renewablePreference: preferences.renewable?.preferRenewable,
            auditTrail: [{
                    timestamp: new Date(),
                    action: 'partial_match_created',
                    reason: `Partial fulfillment using ${strategy} strategy, quantity: ${matchInfo.quantity}`,
                }],
        };
        match.expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        return match;
    }
    calculatePartialFulfillmentStats(plans, matches) {
        const stats = new Map();
        for (const plan of plans) {
            const orderMatches = matches.filter(match => match.buyerOrderId === plan.orderId || match.sellerOrderId === plan.orderId);
            const fulfilledQuantity = orderMatches.reduce((sum, match) => sum + match.matchedQuantity, 0);
            stats.set(plan.orderId, {
                orderId: plan.orderId,
                originalQuantity: plan.order.quantity,
                fulfilledQuantity,
                remainingQuantity: plan.order.quantity - fulfilledQuantity,
                matches: orderMatches.map(match => match.id),
            });
        }
        return Array.from(stats.values());
    }
    identifyRejectedOrders(plans) {
        return plans
            .filter(plan => plan.efficiency < 0.5)
            .map(plan => plan.orderId);
    }
    isPriceCompatible(order, partner, preferences) {
        const orderPrice = order.price || 0;
        const partnerPrice = partner.price || 0;
        if (order.type === 'buy') {
            if (orderPrice < partnerPrice)
                return false;
        }
        else {
            if (partnerPrice < orderPrice)
                return false;
        }
        if (preferences.price?.maxPrice && partnerPrice > preferences.price.maxPrice)
            return false;
        if (preferences.price?.minPrice && partnerPrice < preferences.price.minPrice)
            return false;
        const priceDifference = Math.abs(orderPrice - partnerPrice);
        const tolerance = preferences.price?.priceTolerance || 10;
        return priceDifference <= tolerance;
    }
    async optimizePartialFulfillment(matches) {
        const optimizationGain = this.calculateOptimizationGain(matches);
        const recommendations = this.generateOptimizationRecommendations(matches);
        const optimizedMatches = this.applyOptimizations(matches);
        return {
            optimizedMatches,
            optimizationGain,
            recommendations,
        };
    }
    calculateOptimizationGain(matches) {
        const totalEfficiency = matches.reduce((sum, match) => {
            const efficiency = match.matchedQuantity / (match.matchedQuantity + (match.remainingQuantity || 0));
            return sum + efficiency;
        }, 0);
        return (totalEfficiency / matches.length) * 100;
    }
    generateOptimizationRecommendations(matches) {
        const recommendations = [];
        const partialMatches = matches.filter(match => match.type === match_entity_1.MatchType.PARTIAL);
        if (partialMatches.length > matches.length * 0.5) {
            recommendations.push('Consider adjusting partial fulfillment threshold to reduce fragmentation');
        }
        const lowScoreMatches = matches.filter(match => (match.matchingScore || 0) < 0.6);
        if (lowScoreMatches.length > 0) {
            recommendations.push('Review matching rules to improve quality of partial matches');
        }
        return recommendations;
    }
    applyOptimizations(matches) {
        return matches.map(match => {
            if (match.matchingScore && match.matchingScore < 0.5) {
                match.status = match_entity_1.MatchStatus.REJECTED;
                match.metadata = {
                    ...match.metadata,
                    auditTrail: [
                        ...(match.metadata?.auditTrail || []),
                        {
                            timestamp: new Date(),
                            action: 'optimized_out',
                            reason: 'Low matching score below optimization threshold',
                        },
                    ],
                };
            }
            return match;
        });
    }
};
exports.PartialFulfillmentAlgorithm = PartialFulfillmentAlgorithm;
exports.PartialFulfillmentAlgorithm = PartialFulfillmentAlgorithm = PartialFulfillmentAlgorithm_1 = __decorate([
    (0, common_1.Injectable)()
], PartialFulfillmentAlgorithm);
//# sourceMappingURL=partial-fulfillment.algorithm.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MatchingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const schedule_1 = require("@nestjs/schedule");
const order_entity_1 = require("../modules/energy/entities/order.entity");
const match_entity_1 = require("./entities/match.entity");
const matching_rule_entity_1 = require("./entities/matching-rule.entity");
const matching_preferences_dto_1 = require("./dto/matching-preferences.dto");
const priority_matching_algorithm_1 = require("./algorithms/priority-matching.algorithm");
const geographic_matching_algorithm_1 = require("./algorithms/geographic-matching.algorithm");
const partial_fulfillment_algorithm_1 = require("./algorithms/partial-fulfillment.algorithm");
let MatchingService = MatchingService_1 = class MatchingService {
    constructor(matchRepository, matchingRuleRepository, orderRepository, dataSource, priorityAlgorithm, geographicAlgorithm, partialFulfillmentAlgorithm) {
        this.matchRepository = matchRepository;
        this.matchingRuleRepository = matchingRuleRepository;
        this.orderRepository = orderRepository;
        this.dataSource = dataSource;
        this.priorityAlgorithm = priorityAlgorithm;
        this.geographicAlgorithm = geographicAlgorithm;
        this.partialFulfillmentAlgorithm = partialFulfillmentAlgorithm;
        this.logger = new common_1.Logger(MatchingService_1.name);
        this.eventEmitter = new common_1.EventEmitter();
        this.matchingInProgress = false;
        this.orderQueue = [];
        this.activeRules = [];
        this.metrics = {
            totalOrders: 0,
            totalMatches: 0,
            successRate: 0,
            averageProcessingTime: 0,
            matchesByType: {},
            matchesByStatus: {},
            algorithmPerformance: {},
        };
    }
    async onModuleInit() {
        await this.loadActiveRules();
        await this.initializeMetrics();
        this.startRealTimeMatching();
        this.logger.log('Matching service initialized successfully');
    }
    async loadActiveRules() {
        this.activeRules = await this.matchingRuleRepository.find({
            where: { status: matching_rule_entity_1.RuleStatus.ACTIVE },
            order: { priority: 'DESC' },
        });
        this.logger.log(`Loaded ${this.activeRules.length} active matching rules`);
    }
    async initializeMetrics() {
        const totalOrders = await this.orderRepository.count();
        const totalMatches = await this.matchRepository.count();
        this.metrics.totalOrders = totalOrders;
        this.metrics.totalMatches = totalMatches;
        const matchesByType = await this.matchRepository
            .createQueryBuilder('match')
            .select('match.type', 'type')
            .addSelect('COUNT(*)', 'count')
            .groupBy('match.type')
            .getRawMany();
        matchesByType.forEach(item => {
            this.metrics.matchesByType[item.type] = parseInt(item.count);
        });
        const matchesByStatus = await this.matchRepository
            .createQueryBuilder('match')
            .select('match.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('match.status')
            .getRawMany();
        matchesByStatus.forEach(item => {
            this.metrics.matchesByStatus[item.status] = parseInt(item.count);
        });
    }
    startRealTimeMatching() {
        setInterval(() => {
            if (!this.matchingInProgress) {
                this.processOrderQueue();
            }
        }, 5000);
    }
    async addOrderToQueue(order) {
        this.orderQueue.push(order);
        this.logger.log(`Order ${order.id} added to matching queue`);
        if (!this.matchingInProgress) {
            setImmediate(() => this.processOrderQueue());
        }
    }
    async processOrderQueue() {
        if (this.matchingInProgress || this.orderQueue.length === 0) {
            return;
        }
        this.matchingInProgress = true;
        const startTime = Date.now();
        try {
            const ordersToProcess = [...this.orderQueue];
            this.orderQueue = [];
            const buyOrders = ordersToProcess.filter(order => order.type === 'buy');
            const sellOrders = ordersToProcess.filter(order => order.type === 'sell');
            const pendingOrders = await this.getPendingOrders();
            const allBuyOrders = [...buyOrders, ...pendingOrders.filter(order => order.type === 'buy')];
            const allSellOrders = [...sellOrders, ...pendingOrders.filter(order => order.type === 'sell')];
            const preferences = this.getDefaultPreferences();
            const results = await this.runMatchingAlgorithms(allBuyOrders, allSellOrders, preferences);
            const conflicts = await this.detectConflicts(results.matches);
            if (conflicts.length > 0) {
                const resolvedMatches = await this.resolveConflicts(conflicts);
                results.matches = resolvedMatches;
            }
            await this.saveMatches(results.matches);
            await this.updateOrderStatuses(results.matches);
            await this.emitMatchingEvents(results.matches);
            const processingTime = Date.now() - startTime;
            await this.updateMetrics(results, processingTime);
            this.logger.log(`Processed ${ordersToProcess.length} orders in ${processingTime}ms. Created ${results.matches.length} matches`);
        }
        catch (error) {
            this.logger.error('Error during order processing', error);
        }
        finally {
            this.matchingInProgress = false;
        }
    }
    async getPendingOrders() {
        return this.orderRepository.find({
            where: { status: 'pending' },
            order: { createdAt: 'ASC' },
        });
    }
    async runMatchingAlgorithms(buyOrders, sellOrders, preferences) {
        const allMatches = [];
        const allRejectedOrders = [];
        let totalProcessingTime = 0;
        if (preferences.strategy === matching_preferences_dto_1.MatchingStrategy.PRIORITY || preferences.strategy === matching_preferences_dto_1.MatchingStrategy.BALANCED) {
            const priorityResult = await this.priorityAlgorithm.findMatches(buyOrders, sellOrders, this.activeRules, preferences);
            allMatches.push(...priorityResult.matches);
            allRejectedOrders.push(...priorityResult.rejectedOrders);
            totalProcessingTime += priorityResult.processingTime;
        }
        if (preferences.strategy === matching_preferences_dto_1.MatchingStrategy.PROXIMITY_FIRST || preferences.strategy === matching_preferences_dto_1.MatchingStrategy.BALANCED) {
            const geoResult = await this.geographicAlgorithm.findMatches(buyOrders, sellOrders, this.activeRules, preferences);
            allMatches.push(...geoResult.matches);
            allRejectedOrders.push(...geoResult.rejectedOrders);
            totalProcessingTime += geoResult.processingTime;
        }
        if (preferences.quantity?.allowPartialFulfillment) {
            const partialResult = await this.partialFulfillmentAlgorithm.findMatches(buyOrders, sellOrders, this.activeRules, preferences);
            allMatches.push(...partialResult.matches);
            allRejectedOrders.push(...partialResult.rejectedOrders);
            totalProcessingTime += partialResult.processingTime;
        }
        const deduplicatedMatches = this.deduplicateMatches(allMatches);
        const finalMatches = this.selectBestMatches(deduplicatedMatches, buyOrders.length + sellOrders.length);
        return {
            matches: finalMatches,
            rejectedOrders: allRejectedOrders,
            processingTime: totalProcessingTime,
        };
    }
    deduplicateMatches(matches) {
        const uniqueKeys = new Set();
        const deduplicated = [];
        for (const match of matches) {
            const key = `${match.buyerOrderId}-${match.sellerOrderId}`;
            if (!uniqueKeys.has(key)) {
                uniqueKeys.add(key);
                deduplicated.push(match);
            }
        }
        return deduplicated;
    }
    selectBestMatches(matches, totalOrders) {
        const maxMatches = Math.min(matches.length, Math.floor(totalOrders * 0.8));
        return matches
            .sort((a, b) => (b.matchingScore || 0) - (a.matchingScore || 0))
            .slice(0, maxMatches);
    }
    async detectConflicts(matches) {
        const conflicts = [];
        const orderMatches = new Map();
        for (const match of matches) {
            if (!orderMatches.has(match.buyerOrderId)) {
                orderMatches.set(match.buyerOrderId, []);
            }
            orderMatches.get(match.buyerOrderId).push(match);
            if (!orderMatches.has(match.sellerOrderId)) {
                orderMatches.set(match.sellerOrderId, []);
            }
            orderMatches.get(match.sellerOrderId).push(match);
        }
        for (const [orderId, orderMatches] of orderMatches) {
            if (orderMatches.length > 1) {
                conflicts.push({
                    matches: orderMatches,
                    conflictType: 'multiple_matches_same_order',
                });
            }
        }
        return conflicts;
    }
    async resolveConflicts(conflicts) {
        const resolvedMatches = [];
        const rejectedMatchIds = new Set();
        for (const conflict of conflicts) {
            const resolution = await this.resolveConflict(conflict);
            resolvedMatches.push(...resolution.resolvedMatches);
            resolution.rejectedMatches.forEach(match => rejectedMatchIds.add(match.id));
        }
        return resolvedMatches.filter(match => !rejectedMatchIds.has(match.id));
    }
    async resolveConflict(conflict) {
        const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sortedMatches = conflict.matches.sort((a, b) => (b.matchingScore || 0) - (a.matchingScore || 0));
        const bestMatch = sortedMatches[0];
        const resolvedMatches = [bestMatch];
        const rejectedMatches = sortedMatches.slice(1);
        const resolution = {
            conflictId,
            conflictingMatches: conflict.matches,
            resolution: 'keep_best',
            resolvedMatches,
            rejectedMatches,
            reason: `Kept best match with score ${(bestMatch.matchingScore || 0).toFixed(3)}`,
        };
        await this.logConflictResolution(resolution);
        return resolution;
    }
    async logConflictResolution(resolution) {
        this.logger.warn(`Conflict resolved: ${resolution.conflictId} - ${resolution.reason}`);
        for (const match of resolution.resolvedMatches) {
            if (!match.metadata)
                match.metadata = {};
            if (!match.metadata.auditTrail)
                match.metadata.auditTrail = [];
            match.metadata.auditTrail.push({
                timestamp: new Date(),
                action: 'conflict_resolved',
                reason: resolution.reason,
                conflictId: resolution.conflictId,
            });
        }
    }
    async saveMatches(matches) {
        if (matches.length === 0)
            return [];
        const savedMatches = await this.matchRepository.save(matches);
        for (const match of savedMatches) {
            this.emitEvent('match_created', {
                matchId: match.id,
                buyerOrderId: match.buyerOrderId,
                sellerOrderId: match.sellerOrderId,
                quantity: match.matchedQuantity,
                price: match.matchedPrice,
                score: match.matchingScore,
            });
        }
        return savedMatches;
    }
    async updateOrderStatuses(matches) {
        for (const match of matches) {
            await this.updateOrderStatus(match.buyerOrderId, 'matched');
            await this.updateOrderStatus(match.sellerOrderId, 'matched');
        }
    }
    async updateOrderStatus(orderId, status) {
        await this.orderRepository.update(orderId, { status: status });
    }
    async emitMatchingEvents(matches) {
        for (const match of matches) {
            this.emitEvent('match_created', {
                matchId: match.id,
                buyerOrderId: match.buyerOrderId,
                sellerOrderId: match.sellerOrderId,
                quantity: match.matchedQuantity,
                price: match.matchedPrice,
                algorithm: match.metadata?.algorithm,
                score: match.matchingScore,
            });
        }
    }
    emitEvent(type, data) {
        const event = {
            type: type,
            data,
            timestamp: new Date(),
        };
        this.eventEmitter.emit('matching', event);
    }
    async updateMetrics(results, processingTime) {
        this.metrics.totalOrders += results.rejectedOrders.length;
        this.metrics.totalMatches += results.matches.length;
        this.metrics.successRate = this.metrics.totalMatches / (this.metrics.totalOrders || 1);
        this.metrics.averageProcessingTime =
            (this.metrics.averageProcessingTime + processingTime) / 2;
        for (const match of results.matches) {
            this.metrics.matchesByType[match.type] = (this.metrics.matchesByType[match.type] || 0) + 1;
            this.metrics.matchesByStatus[match.status] = (this.metrics.matchesByStatus[match.status] || 0) + 1;
        }
    }
    getDefaultPreferences() {
        return {
            strategy: matching_preferences_dto_1.MatchingStrategy.BALANCED,
            price: {
                priceTolerance: 10,
                preferFixedPrice: false,
            },
            geographic: {
                scope: 'regional',
                maxDistance: 500,
            },
            renewable: {
                preferRenewable: true,
                minimumRenewablePercentage: 50,
                allowMixed: true,
            },
            quantity: {
                allowPartialFulfillment: true,
                partialFulfillmentThreshold: 30,
            },
            time: {
                matchingWindowHours: 24,
                allowImmediateMatching: true,
            },
            quality: {
                minimumReliabilityScore: 0.7,
                prioritizeVerifiedSuppliers: true,
            },
        };
    }
    async confirmMatch(matchId, userId) {
        const match = await this.matchRepository.findOne({ where: { id: matchId } });
        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }
        if (match.status !== match_entity_1.MatchStatus.PENDING) {
            throw new Error(`Match ${matchId} is not in pending status`);
        }
        match.status = match_entity_1.MatchStatus.CONFIRMED;
        if (!match.metadata)
            match.metadata = {};
        if (!match.metadata.auditTrail)
            match.metadata.auditTrail = [];
        match.metadata.auditTrail.push({
            timestamp: new Date(),
            action: 'match_confirmed',
            reason: `Match confirmed by user ${userId}`,
            userId,
        });
        const savedMatch = await this.matchRepository.save(match);
        this.emitEvent('match_confirmed', {
            matchId: savedMatch.id,
            confirmedBy: userId,
        });
        return savedMatch;
    }
    async rejectMatch(matchId, userId, reason) {
        const match = await this.matchRepository.findOne({ where: { id: matchId } });
        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }
        match.status = match_entity_1.MatchStatus.REJECTED;
        if (!match.metadata)
            match.metadata = {};
        if (!match.metadata.auditTrail)
            match.metadata.auditTrail = [];
        match.metadata.auditTrail.push({
            timestamp: new Date(),
            action: 'match_rejected',
            reason: reason || `Match rejected by user ${userId}`,
            userId,
        });
        const savedMatch = await this.matchRepository.save(match);
        this.emitEvent('match_rejected', {
            matchId: savedMatch.id,
            rejectedBy: userId,
            reason,
        });
        await this.updateOrderStatus(match.buyerOrderId, 'pending');
        await this.updateOrderStatus(match.sellerOrderId, 'pending');
        return savedMatch;
    }
    async getMetrics() {
        return { ...this.metrics };
    }
    async getMatchesByOrder(orderId) {
        return this.matchRepository.find({
            where: [
                { buyerOrderId: orderId },
                { sellerOrderId: orderId },
            ],
            order: { createdAt: 'DESC' },
        });
    }
    async getActiveMatches() {
        return this.matchRepository.find({
            where: { status: match_entity_1.MatchStatus.PENDING },
            order: { createdAt: 'ASC' },
        });
    }
    async cleanupExpiredMatches() {
        const expiredMatches = await this.matchRepository.find({
            where: {
                expiresAt: (0, typeorm_2.LessThan)(new Date()),
                status: match_entity_1.MatchStatus.PENDING,
            },
        });
        if (expiredMatches.length > 0) {
            for (const match of expiredMatches) {
                match.status = match_entity_1.MatchStatus.CANCELLED;
                if (!match.metadata)
                    match.metadata = {};
                if (!match.metadata.auditTrail)
                    match.metadata.auditTrail = [];
                match.metadata.auditTrail.push({
                    timestamp: new Date(),
                    action: 'match_expired',
                    reason: 'Match expired due to timeout',
                });
                await this.matchRepository.save(match);
                await this.updateOrderStatus(match.buyerOrderId, 'pending');
                await this.updateOrderStatus(match.sellerOrderId, 'pending');
                this.emitEvent('match_expired', {
                    matchId: match.id,
                    expiredAt: new Date(),
                });
            }
            this.logger.log(`Cleaned up ${expiredMatches.length} expired matches`);
        }
    }
    onMatchingEvent(callback) {
        this.eventEmitter.on('matching', callback);
    }
    async forceMatching(preferences) {
        const allOrders = await this.orderRepository.find({
            where: { status: 'pending' },
        });
        if (allOrders.length === 0)
            return [];
        const buyOrders = allOrders.filter(order => order.type === 'buy');
        const sellOrders = allOrders.filter(order => order.type === 'sell');
        const matchingPreferences = preferences || this.getDefaultPreferences();
        const results = await this.runMatchingAlgorithms(buyOrders, sellOrders, matchingPreferences);
        const conflicts = await this.detectConflicts(results.matches);
        if (conflicts.length > 0) {
            const resolvedMatches = await this.resolveConflicts(conflicts);
            results.matches = resolvedMatches;
        }
        return await this.saveMatches(results.matches);
    }
};
exports.MatchingService = MatchingService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MatchingService.prototype, "cleanupExpiredMatches", null);
exports.MatchingService = MatchingService = MatchingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(match_entity_1.Match)),
    __param(1, (0, typeorm_1.InjectRepository)(matching_rule_entity_1.MatchingRule)),
    __param(2, (0, typeorm_1.InjectRepository)(order_entity_1.Order)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        priority_matching_algorithm_1.PriorityMatchingAlgorithm,
        geographic_matching_algorithm_1.GeographicMatchingAlgorithm,
        partial_fulfillment_algorithm_1.PartialFulfillmentAlgorithm])
], MatchingService);
//# sourceMappingURL=matching.service.js.map
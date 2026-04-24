import { Injectable, Logger, OnModuleInit, EventEmitter } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Order } from '../modules/energy/entities/order.entity';
import { Match, MatchStatus, MatchType } from './entities/match.entity';
import {
  MatchingRule,
  RuleStatus,
  RuleType,
} from './entities/matching-rule.entity';
import {
  MatchingPreferencesDto,
  MatchingStrategy,
} from './dto/matching-preferences.dto';
import {
  PriorityMatchingAlgorithm,
  PriorityMatchResult,
} from './algorithms/priority-matching.algorithm';
import {
  GeographicMatchingAlgorithm,
  GeographicMatchResult,
} from './algorithms/geographic-matching.algorithm';
import {
  PartialFulfillmentAlgorithm,
  PartialFulfillmentResult,
} from './algorithms/partial-fulfillment.algorithm';
import { FIFOAlgorithmService } from './algorithms/fifo-algorithm.service';
import { ProRataAlgorithmService } from './algorithms/pro-rata-algorithm.service';
import { LiquidityOptimizerService } from './liquidity/liquidity-optimizer.service';
import { PriorityQueueService } from './queues/priority-queue.service';
import { MatchingAnalyticsService } from './monitoring/matching-analytics.service';

export interface MatchingEvent {
  type:
    | 'match_created'
    | 'match_confirmed'
    | 'match_rejected'
    | 'match_expired'
    | 'conflict_resolved';
  data: any;
  timestamp: Date;
}

export interface MatchingMetrics {
  totalOrders: number;
  totalMatches: number;
  successRate: number;
  averageProcessingTime: number;
  matchesByType: Record<MatchType, number>;
  matchesByStatus: Record<MatchStatus, number>;
  algorithmPerformance: Record<string, number>;
}

export interface ConflictResolution {
  conflictId: string;
  conflictingMatches: Match[];
  resolution: 'keep_all' | 'keep_best' | 'keep_first' | 'reject_all';
  resolvedMatches: Match[];
  rejectedMatches: Match[];
  reason: string;
}

@Injectable()
export class MatchingService implements OnModuleInit {
  private readonly logger = new Logger(MatchingService.name);
  private readonly eventEmitter = new EventEmitter();
  private matchingInProgress = false;
  private orderQueue: Order[] = [];
  private activeRules: MatchingRule[] = [];
  private metrics: MatchingMetrics = {
    totalOrders: 0,
    totalMatches: 0,
    successRate: 0,
    averageProcessingTime: 0,
    matchesByType: {} as Record<MatchType, number>,
    matchesByStatus: {} as Record<MatchStatus, number>,
    algorithmPerformance: {},
  };

  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchingRule)
    private readonly matchingRuleRepository: Repository<MatchingRule>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly priorityAlgorithm: PriorityMatchingAlgorithm,
    private readonly geographicAlgorithm: GeographicMatchingAlgorithm,
    private readonly partialFulfillmentAlgorithm: PartialFulfillmentAlgorithm,
    private readonly fifoAlgorithm: FIFOAlgorithmService,
    private readonly proRataAlgorithm: ProRataAlgorithmService,
    private readonly liquidityOptimizer: LiquidityOptimizerService,
    private readonly priorityQueue: PriorityQueueService,
    private readonly analyticsService: MatchingAnalyticsService,
  ) {}

  async onModuleInit() {
    await this.loadActiveRules();
    await this.initializeMetrics();
    this.startRealTimeMatching();
    this.logger.log('Matching service initialized successfully');
  }

  async loadActiveRules() {
    this.activeRules = await this.matchingRuleRepository.find({
      where: { status: RuleStatus.ACTIVE },
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

    matchesByType.forEach((item) => {
      this.metrics.matchesByType[item.type as MatchType] = parseInt(item.count);
    });

    const matchesByStatus = await this.matchRepository
      .createQueryBuilder('match')
      .select('match.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('match.status')
      .getRawMany();

    matchesByStatus.forEach((item) => {
      this.metrics.matchesByStatus[item.status as MatchStatus] = parseInt(
        item.count,
      );
    });
  }

  startRealTimeMatching() {
    setInterval(() => {
      if (!this.matchingInProgress) {
        this.processOrderQueue();
      }
    }, 5000);
  }

  async addOrderToQueue(order: Order) {
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

      const buyOrders = ordersToProcess.filter((order) => order.type === 'buy');
      const sellOrders = ordersToProcess.filter(
        (order) => order.type === 'sell',
      );

      const pendingOrders = await this.getPendingOrders();
      const allBuyOrders = [
        ...buyOrders,
        ...pendingOrders.filter((order) => order.type === 'buy'),
      ];
      const allSellOrders = [
        ...sellOrders,
        ...pendingOrders.filter((order) => order.type === 'sell'),
      ];

      const preferences = this.getDefaultPreferences();
      const results = await this.runMatchingAlgorithms(
        allBuyOrders,
        allSellOrders,
        preferences,
      );

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

      this.logger.log(
        `Processed ${ordersToProcess.length} orders in ${processingTime}ms. Created ${results.matches.length} matches`,
      );
    } catch (error) {
      this.logger.error('Error during order processing', error);
    } finally {
      this.matchingInProgress = false;
    }
  }

  async getPendingOrders(): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status: 'pending' as any },
      order: { createdAt: 'ASC' },
    });
  }

  async runMatchingAlgorithms(
    buyOrders: Order[],
    sellOrders: Order[],
    preferences: MatchingPreferencesDto,
  ) {
    const allMatches: Match[] = [];
    const allRejectedOrders: string[] = [];
    let totalProcessingTime = 0;

    if (
      preferences.strategy === MatchingStrategy.PRIORITY ||
      preferences.strategy === MatchingStrategy.BALANCED
    ) {
      const priorityResult = await this.priorityAlgorithm.findMatches(
        buyOrders,
        sellOrders,
        this.activeRules,
        preferences,
      );
      allMatches.push(...priorityResult.matches);
      allRejectedOrders.push(...priorityResult.rejectedOrders);
      totalProcessingTime += priorityResult.processingTime;
    }

    if (
      preferences.strategy === MatchingStrategy.PROXIMITY_FIRST ||
      preferences.strategy === MatchingStrategy.BALANCED
    ) {
      const geoResult = await this.geographicAlgorithm.findMatches(
        buyOrders,
        sellOrders,
        this.activeRules,
        preferences,
      );
      allMatches.push(...geoResult.matches);
      allRejectedOrders.push(...geoResult.rejectedOrders);
      totalProcessingTime += geoResult.processingTime;
    }

    if (preferences.quantity?.allowPartialFulfillment) {
      const partialResult = await this.partialFulfillmentAlgorithm.findMatches(
        buyOrders,
        sellOrders,
        this.activeRules,
        preferences,
      );
      allMatches.push(...partialResult.matches);
      allRejectedOrders.push(...partialResult.rejectedOrders);
      totalProcessingTime += partialResult.processingTime;
    }

    const deduplicatedMatches = this.deduplicateMatches(allMatches);
    const finalMatches = this.selectBestMatches(
      deduplicatedMatches,
      buyOrders.length + sellOrders.length,
    );

    return {
      matches: finalMatches,
      rejectedOrders: allRejectedOrders,
      processingTime: totalProcessingTime,
    };
  }

  deduplicateMatches(matches: Match[]): Match[] {
    const uniqueKeys = new Set<string>();
    const deduplicated: Match[] = [];

    for (const match of matches) {
      const key = `${match.buyerOrderId}-${match.sellerOrderId}`;
      if (!uniqueKeys.has(key)) {
        uniqueKeys.add(key);
        deduplicated.push(match);
      }
    }

    return deduplicated;
  }

  selectBestMatches(matches: Match[], totalOrders: number): Match[] {
    const maxMatches = Math.min(matches.length, Math.floor(totalOrders * 0.8));

    return matches
      .sort((a, b) => (b.matchingScore || 0) - (a.matchingScore || 0))
      .slice(0, maxMatches);
  }

  async detectConflicts(
    matches: Match[],
  ): Promise<Array<{ matches: Match[]; conflictType: string }>> {
    const conflicts: Array<{ matches: Match[]; conflictType: string }> = [];
    const orderMatches = new Map<string, Match[]>();

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

  async resolveConflicts(
    conflicts: Array<{ matches: Match[]; conflictType: string }>,
  ): Promise<Match[]> {
    const resolvedMatches: Match[] = [];
    const rejectedMatchIds = new Set<string>();

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict);

      resolvedMatches.push(...resolution.resolvedMatches);
      resolution.rejectedMatches.forEach((match) =>
        rejectedMatchIds.add(match.id),
      );
    }

    return resolvedMatches.filter((match) => !rejectedMatchIds.has(match.id));
  }

  async resolveConflict(conflict: {
    matches: Match[];
    conflictType: string;
  }): Promise<ConflictResolution> {
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const sortedMatches = conflict.matches.sort(
      (a, b) => (b.matchingScore || 0) - (a.matchingScore || 0),
    );

    const bestMatch = sortedMatches[0];
    const resolvedMatches = [bestMatch];
    const rejectedMatches = sortedMatches.slice(1);

    const resolution: ConflictResolution = {
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

  async logConflictResolution(resolution: ConflictResolution) {
    this.logger.warn(
      `Conflict resolved: ${resolution.conflictId} - ${resolution.reason}`,
    );

    for (const match of resolution.resolvedMatches) {
      if (!match.metadata) match.metadata = {};
      if (!match.metadata.auditTrail) match.metadata.auditTrail = [];

      match.metadata.auditTrail.push({
        timestamp: new Date(),
        action: 'conflict_resolved',
        reason: resolution.reason,
        conflictId: resolution.conflictId,
      } as any);
    }
  }

  async saveMatches(matches: Match[]): Promise<Match[]> {
    if (matches.length === 0) return [];

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

  async updateOrderStatuses(matches: Match[]) {
    for (const match of matches) {
      await this.updateOrderStatus(match.buyerOrderId, 'matched');
      await this.updateOrderStatus(match.sellerOrderId, 'matched');
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    await this.orderRepository.update(orderId, { status: status as any });
  }

  async emitMatchingEvents(matches: Match[]) {
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

  emitEvent(type: string, data: any) {
    const event: MatchingEvent = {
      type: type as any,
      data,
      timestamp: new Date(),
    };

    this.eventEmitter.emit('matching', event);
  }

  async updateMetrics(results: any, processingTime: number) {
    this.metrics.totalOrders += results.rejectedOrders.length;
    this.metrics.totalMatches += results.matches.length;
    this.metrics.successRate =
      this.metrics.totalMatches / (this.metrics.totalOrders || 1);
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime + processingTime) / 2;

    for (const match of results.matches) {
      this.metrics.matchesByType[match.type] =
        (this.metrics.matchesByType[match.type] || 0) + 1;
      this.metrics.matchesByStatus[match.status] =
        (this.metrics.matchesByStatus[match.status] || 0) + 1;
    }
  }

  getDefaultPreferences(): MatchingPreferencesDto {
    return {
      strategy: MatchingStrategy.BALANCED,
      price: {
        priceTolerance: 10,
        preferFixedPrice: false,
      },
      geographic: {
        scope: 'regional' as any,
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

  async confirmMatch(matchId: string, userId: string): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.status !== MatchStatus.PENDING) {
      throw new Error(`Match ${matchId} is not in pending status`);
    }

    match.status = MatchStatus.CONFIRMED;

    if (!match.metadata) match.metadata = {};
    if (!match.metadata.auditTrail) match.metadata.auditTrail = [];

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

  async rejectMatch(
    matchId: string,
    userId: string,
    reason?: string,
  ): Promise<Match> {
    const match = await this.matchRepository.findOne({
      where: { id: matchId },
    });
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    match.status = MatchStatus.REJECTED;

    if (!match.metadata) match.metadata = {};
    if (!match.metadata.auditTrail) match.metadata.auditTrail = [];

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

  async getMetrics(): Promise<MatchingMetrics> {
    return { ...this.metrics };
  }

  async getMatchesByOrder(orderId: string): Promise<Match[]> {
    return this.matchRepository.find({
      where: [{ buyerOrderId: orderId }, { sellerOrderId: orderId }],
      order: { createdAt: 'DESC' },
    });
  }

  async getActiveMatches(): Promise<Match[]> {
    return this.matchRepository.find({
      where: { status: MatchStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupExpiredMatches() {
    const expiredMatches = await this.matchRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
        status: MatchStatus.PENDING,
      },
    });

    if (expiredMatches.length > 0) {
      for (const match of expiredMatches) {
        match.status = MatchStatus.CANCELLED;

        if (!match.metadata) match.metadata = {};
        if (!match.metadata.auditTrail) match.metadata.auditTrail = [];

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

  onMatchingEvent(callback: (event: MatchingEvent) => void) {
    this.eventEmitter.on('matching', callback);
  }

  async forceMatching(preferences?: MatchingPreferencesDto): Promise<Match[]> {
    const allOrders = await this.orderRepository.find({
      where: { status: 'pending' as any },
    });

    if (allOrders.length === 0) return [];

    const buyOrders = allOrders.filter((order) => order.type === 'buy');
    const sellOrders = allOrders.filter((order) => order.type === 'sell');

    const matchingPreferences = preferences || this.getDefaultPreferences();
    const results = await this.runMatchingAlgorithms(
      buyOrders,
      sellOrders,
      matchingPreferences,
    );

    const conflicts = await this.detectConflicts(results.matches);
    if (conflicts.length > 0) {
      const resolvedMatches = await this.resolveConflicts(conflicts);
      results.matches = resolvedMatches;
    }

    return await this.saveMatches(results.matches);
  }

  /**
   * High-frequency matching using FIFO algorithm
   * Processes orders with microsecond latency
   */
  async highFrequencyFIFOMatching(
    buyOrders: Order[],
    sellOrders: Order[],
    preferences?: MatchingPreferencesDto,
  ): Promise<{ matches: Match[]; processingTime: number }> {
    const startTime = process.hrtime.bigint();
    const matchingPreferences = preferences || this.getDefaultPreferences();

    // Optimize liquidity first
    const optimizationResult = await this.liquidityOptimizer.optimizeLiquidity(
      buyOrders,
      sellOrders,
      matchingPreferences,
    );

    // Run FIFO matching on optimized orders
    const fifoResult = await this.fifoAlgorithm.findMatches(
      optimizationResult.optimizedBuyOrders,
      optimizationResult.optimizedSellOrders,
      this.activeRules,
      matchingPreferences,
    );

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // microseconds

    // Record analytics
    this.analyticsService.recordMatching(
      fifoResult.totalOrdersProcessed,
      fifoResult.matches.length,
      processingTime,
      'FIFO',
      fifoResult.matches,
    );

    // Save matches
    const savedMatches = await this.saveMatches(fifoResult.matches);
    await this.updateOrderStatuses(savedMatches);
    await this.emitMatchingEvents(savedMatches);

    this.logger.log(
      `High-frequency FIFO matching: ${fifoResult.matches.length} matches in ${processingTime.toFixed(2)}μs`
    );

    return { matches: savedMatches, processingTime };
  }

  /**
   * High-frequency matching using Pro-Rata algorithm
   * Ensures fair distribution with low latency
   */
  async highFrequencyProRataMatching(
    buyOrders: Order[],
    sellOrders: Order[],
    preferences?: MatchingPreferencesDto,
  ): Promise<{ matches: Match[]; processingTime: number; allocationDetails: any[] }> {
    const startTime = process.hrtime.bigint();
    const matchingPreferences = preferences || this.getDefaultPreferences();

    // Optimize liquidity first
    const optimizationResult = await this.liquidityOptimizer.optimizeLiquidity(
      buyOrders,
      sellOrders,
      matchingPreferences,
    );

    // Run Pro-Rata matching on optimized orders
    const proRataResult = await this.proRataAlgorithm.findMatches(
      optimizationResult.optimizedBuyOrders,
      optimizationResult.optimizedSellOrders,
      this.activeRules,
      matchingPreferences,
    );

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // microseconds

    // Record analytics
    this.analyticsService.recordMatching(
      proRataResult.totalOrdersProcessed,
      proRataResult.matches.length,
      processingTime,
      'PRO_RATA',
      proRataResult.matches,
    );

    // Save matches
    const savedMatches = await this.saveMatches(proRataResult.matches);
    await this.updateOrderStatuses(savedMatches);
    await this.emitMatchingEvents(savedMatches);

    this.logger.log(
      `High-frequency Pro-Rata matching: ${proRataResult.matches.length} matches in ${processingTime.toFixed(2)}μs`
    );

    return {
      matches: savedMatches,
      processingTime,
      allocationDetails: proRataResult.allocationDetails,
    };
  }

  /**
   * Process orders through priority queue for high-frequency matching
   */
  async processPriorityQueue(algorithm: 'FIFO' | 'PRO_RATA' = 'FIFO'): Promise<Match[]> {
    const startTime = process.hrtime.bigint();
    const allMatches: Match[] = [];

    // Dequeue orders in batches
    const batchSize = 100;
    let processedCount = 0;

    while (!this.priorityQueue.isEmpty()) {
      const buyOrders = this.priorityQueue.dequeueBatch(batchSize, 'buy');
      const sellOrders = this.priorityQueue.dequeueBatch(batchSize, 'sell');

      if (buyOrders.length === 0 && sellOrders.length === 0) {
        break;
      }

      let result;
      if (algorithm === 'FIFO') {
        result = await this.highFrequencyFIFOMatching(buyOrders, sellOrders);
      } else {
        result = await this.highFrequencyProRataMatching(buyOrders, sellOrders);
      }

      allMatches.push(...result.matches);
      processedCount += buyOrders.length + sellOrders.length;

      // Check for manipulation
      for (const order of [...buyOrders, ...sellOrders]) {
        const detection = this.priorityQueue.detectManipulation(order.userId);
        if (detection.isSuspicious) {
          this.logger.warn(
            `Suspicious activity detected for user ${order.userId}: ${detection.reasons.join(', ')}`
          );
        }
      }
    }

    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // microseconds

    this.logger.log(
      `Priority queue processing: ${allMatches.length} matches from ${processedCount} orders in ${processingTime.toFixed(2)}μs`
    );

    return allMatches;
  }

  /**
   * Add order to priority queue for high-frequency processing
   */
  addToPriorityQueue(order: Order, priority: number = 0): boolean {
    const success = this.priorityQueue.enqueue(order, priority);
    
    if (success) {
      this.analyticsService.recordOrder(order);
      
      // Trigger immediate processing if queue depth is high
      if (this.priorityQueue.getCurrentDepth() > 1000) {
        setImmediate(() => this.processPriorityQueue());
      }
    }

    return success;
  }

  /**
   * Get real-time matching performance metrics
   */
  async getRealTimeMetrics(): Promise<{
    currentMetrics: any;
    efficiency: any;
    queueMetrics: any;
    algorithmPerformance: any;
  }> {
    const currentMetrics = this.analyticsService.getCurrentMetrics();
    const efficiency = this.analyticsService.getEfficiencyMetrics();
    const queueMetrics = this.priorityQueue.getMetrics();
    const algorithmPerformance = {
      fifo: this.fifoAlgorithm.getStatistics(),
      proRata: this.proRataAlgorithm.getStatistics(),
    };

    return {
      currentMetrics,
      efficiency,
      queueMetrics,
      algorithmPerformance,
    };
  }

  /**
   * Get comprehensive matching report
   */
  async getMatchingReport(startTime: number, endTime: number): Promise<any> {
    return this.analyticsService.generateReport(startTime, endTime);
  }

  /**
   * Check system health and performance
   */
  async checkSystemHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    metrics: any;
  }> {
    const issues: string[] = [];
    const metrics = await this.getRealTimeMetrics();

    // Check latency
    if (metrics.currentMetrics.p95Latency > 100) {
      issues.push(`P95 latency exceeds 100μs: ${metrics.currentMetrics.p95Latency.toFixed(2)}μs`);
    }

    // Check throughput
    if (metrics.currentMetrics.throughput < 50000) {
      issues.push(`Throughput below 50,000 orders/s: ${metrics.currentMetrics.throughput.toFixed(0)} orders/s`);
    }

    // Check fill rate
    if (metrics.currentMetrics.fillRate < 0.5) {
      issues.push(`Fill rate below 50%: ${(metrics.currentMetrics.fillRate * 100).toFixed(2)}%`);
    }

    // Check queue depth
    if (metrics.queueMetrics.queueDepth > 50000) {
      issues.push(`Queue depth too high: ${metrics.queueMetrics.queueDepth} orders`);
    }

    // Check error rate
    if (metrics.currentMetrics.algorithmPerformance) {
      const avgSuccessRate = Object.values(metrics.currentMetrics.algorithmPerformance)
        .reduce((sum: number, alg: any) => sum + (alg.successRate || 0), 0) / 
        Object.keys(metrics.currentMetrics.algorithmPerformance).length;
      
      if (avgSuccessRate < 0.8) {
        issues.push(`Average algorithm success rate below 80%: ${(avgSuccessRate * 100).toFixed(2)}%`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }
}

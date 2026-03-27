import { OnModuleInit } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../modules/energy/entities/order.entity';
import { Match, MatchStatus, MatchType } from './entities/match.entity';
import { MatchingRule } from './entities/matching-rule.entity';
import { MatchingPreferencesDto } from './dto/matching-preferences.dto';
import { PriorityMatchingAlgorithm } from './algorithms/priority-matching.algorithm';
import { GeographicMatchingAlgorithm } from './algorithms/geographic-matching.algorithm';
import { PartialFulfillmentAlgorithm } from './algorithms/partial-fulfillment.algorithm';
export interface MatchingEvent {
    type: 'match_created' | 'match_confirmed' | 'match_rejected' | 'match_expired' | 'conflict_resolved';
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
export declare class MatchingService implements OnModuleInit {
    private readonly matchRepository;
    private readonly matchingRuleRepository;
    private readonly orderRepository;
    private readonly dataSource;
    private readonly priorityAlgorithm;
    private readonly geographicAlgorithm;
    private readonly partialFulfillmentAlgorithm;
    private readonly logger;
    private readonly eventEmitter;
    private matchingInProgress;
    private orderQueue;
    private activeRules;
    private metrics;
    constructor(matchRepository: Repository<Match>, matchingRuleRepository: Repository<MatchingRule>, orderRepository: Repository<Order>, dataSource: DataSource, priorityAlgorithm: PriorityMatchingAlgorithm, geographicAlgorithm: GeographicMatchingAlgorithm, partialFulfillmentAlgorithm: PartialFulfillmentAlgorithm);
    onModuleInit(): Promise<void>;
    loadActiveRules(): Promise<void>;
    initializeMetrics(): Promise<void>;
    startRealTimeMatching(): void;
    addOrderToQueue(order: Order): Promise<void>;
    processOrderQueue(): Promise<void>;
    getPendingOrders(): Promise<Order[]>;
    runMatchingAlgorithms(buyOrders: Order[], sellOrders: Order[], preferences: MatchingPreferencesDto): Promise<{
        matches: Match[];
        rejectedOrders: string[];
        processingTime: number;
    }>;
    deduplicateMatches(matches: Match[]): Match[];
    selectBestMatches(matches: Match[], totalOrders: number): Match[];
    detectConflicts(matches: Match[]): Promise<Array<{
        matches: Match[];
        conflictType: string;
    }>>;
    resolveConflicts(conflicts: Array<{
        matches: Match[];
        conflictType: string;
    }>): Promise<Match[]>;
    resolveConflict(conflict: {
        matches: Match[];
        conflictType: string;
    }): Promise<ConflictResolution>;
    logConflictResolution(resolution: ConflictResolution): Promise<void>;
    saveMatches(matches: Match[]): Promise<Match[]>;
    updateOrderStatuses(matches: Match[]): Promise<void>;
    updateOrderStatus(orderId: string, status: string): Promise<void>;
    emitMatchingEvents(matches: Match[]): Promise<void>;
    emitEvent(type: string, data: any): void;
    updateMetrics(results: any, processingTime: number): Promise<void>;
    getDefaultPreferences(): MatchingPreferencesDto;
    confirmMatch(matchId: string, userId: string): Promise<Match>;
    rejectMatch(matchId: string, userId: string, reason?: string): Promise<Match>;
    getMetrics(): Promise<MatchingMetrics>;
    getMatchesByOrder(orderId: string): Promise<Match[]>;
    getActiveMatches(): Promise<Match[]>;
    cleanupExpiredMatches(): Promise<void>;
    onMatchingEvent(callback: (event: MatchingEvent) => void): void;
    forceMatching(preferences?: MatchingPreferencesDto): Promise<Match[]>;
}

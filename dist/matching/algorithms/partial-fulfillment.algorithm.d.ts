import { Order } from '../../modules/energy/entities/order.entity';
import { Match } from '../entities/match.entity';
import { MatchingRule } from '../entities/matching-rule.entity';
import { MatchingPreferencesDto } from '../dto/matching-preferences.dto';
export interface PartialFulfillmentResult {
    matches: Match[];
    partiallyFulfilledOrders: Array<{
        orderId: string;
        originalQuantity: number;
        fulfilledQuantity: number;
        remainingQuantity: number;
        matches: string[];
    }>;
    rejectedOrders: string[];
    processingTime: number;
    algorithm: 'partial_fulfillment';
}
export interface FulfillmentPlan {
    orderId: string;
    order: Order;
    fulfillmentStrategy: 'single' | 'multiple' | 'split';
    matches: Array<{
        partnerOrderId: string;
        quantity: number;
        price: number;
        score: number;
    }>;
    totalFulfilledQuantity: number;
    remainingQuantity: number;
    efficiency: number;
}
export interface SplitOrder {
    originalOrderId: string;
    splits: Array<{
        splitId: string;
        quantity: number;
        price: number;
        matchedWith: string[];
    }>;
}
export declare class PartialFulfillmentAlgorithm {
    private readonly logger;
    findMatches(buyOrders: Order[], sellOrders: Order[], rules: MatchingRule[], preferences: MatchingPreferencesDto): Promise<PartialFulfillmentResult>;
    private createFulfillmentPlans;
    private createFulfillmentPlan;
    private isCompatibleForPartialFulfillment;
    private calculatePartialFulfillmentScore;
    private calculateQuantityScore;
    private calculatePriceScore;
    private calculateEfficiencyScore;
    private calculateReliabilityScore;
    private determineFulfillmentStrategy;
    private selectMatchesForStrategy;
    private selectMultipleMatches;
    private selectSplitMatches;
    private optimizeFulfillmentPlans;
    private executeFulfillmentPlans;
    private createPartialMatch;
    private calculatePartialFulfillmentStats;
    private identifyRejectedOrders;
    private isPriceCompatible;
    optimizePartialFulfillment(matches: Match[]): Promise<{
        optimizedMatches: Match[];
        optimizationGain: number;
        recommendations: string[];
    }>;
    private calculateOptimizationGain;
    private generateOptimizationRecommendations;
    private applyOptimizations;
}

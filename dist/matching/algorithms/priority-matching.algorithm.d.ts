import { Order } from '../../modules/energy/entities/order.entity';
import { Match } from '../entities/match.entity';
import { MatchingRule } from '../entities/matching-rule.entity';
import { MatchingPreferencesDto } from '../dto/matching-preferences.dto';
export interface PriorityMatchResult {
    matches: Match[];
    rejectedOrders: string[];
    processingTime: number;
    algorithm: 'priority';
}
export interface OrderPriority {
    orderId: string;
    priority: number;
    score: number;
    factors: {
        priceScore: number;
        timeScore: number;
        quantityScore: number;
        reliabilityScore: number;
    };
}
export declare class PriorityMatchingAlgorithm {
    private readonly logger;
    findMatches(buyOrders: Order[], sellOrders: Order[], rules: MatchingRule[], preferences: MatchingPreferencesDto): Promise<PriorityMatchResult>;
    private calculateOrderPriorities;
    private calculateOrderPriority;
    private calculateCompatibilityScore;
    private calculatePriceScore;
    private calculateQuantityScore;
    private calculateTimeScore;
    private calculateReliabilityScore;
    private calculateGeographicScore;
    private calculateRenewableScore;
    private getRuleWeights;
    private isPriceCompatible;
    private createMatch;
    private calculateDistance;
}

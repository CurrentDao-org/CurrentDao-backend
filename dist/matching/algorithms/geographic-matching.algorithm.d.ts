import { Order } from '../../modules/energy/entities/order.entity';
import { Match } from '../entities/match.entity';
import { MatchingRule } from '../entities/matching-rule.entity';
import { MatchingPreferencesDto } from '../dto/matching-preferences.dto';
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
export declare class GeographicMatchingAlgorithm {
    private readonly logger;
    findMatches(buyOrders: Order[], sellOrders: Order[], rules: MatchingRule[], preferences: MatchingPreferencesDto): Promise<GeographicMatchResult>;
    private filterOrdersByGeography;
    private createGeographicClusters;
    private findNearbyOrders;
    private createCluster;
    private calculateClusterCenter;
    private calculateClusterRadius;
    private matchWithinCluster;
    private findBestGeographicMatch;
    private calculateGeographicScore;
    private calculatePriceScore;
    private calculateQuantityScore;
    private calculateCombinedGeographicScore;
    private isPriceCompatible;
    private createGeographicMatch;
    private calculateDistance;
    private getRegionFromLocation;
    findOptimalDeliveryRoutes(matches: Match[]): Promise<{
        matches: Match[];
        routes: Array<{
            matchId: string;
            route: LocationPoint[];
            estimatedDistance: number;
            estimatedTime: number;
        }>;
    }>;
    private calculateOptimalRoute;
}

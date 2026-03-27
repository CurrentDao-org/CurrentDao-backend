import { Order } from '../../modules/energy/entities/order.entity';
export declare enum MatchStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    REJECTED = "rejected",
    PARTIALLY_FULFILLED = "partially_fulfilled",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum MatchType {
    FULL = "full",
    PARTIAL = "partial",
    SPLIT = "split"
}
export declare class Match {
    id: string;
    buyerOrderId: string;
    sellerOrderId: string;
    matchedQuantity: number;
    matchedPrice: number;
    remainingQuantity: number;
    status: MatchStatus;
    type: MatchType;
    distance: number;
    matchingScore: number;
    metadata: {
        algorithm?: string;
        priority?: number;
        renewablePreference?: boolean;
        conflictResolution?: string;
        auditTrail?: Array<{
            timestamp: Date;
            action: string;
            reason: string;
            userId?: string;
        }>;
    };
    buyerConfirmedAt: Date;
    sellerConfirmedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    buyerOrder: Order;
    sellerOrder: Order;
}

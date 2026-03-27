import { EnergyListing } from './energy-listing.entity';
export declare enum BidStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REJECTED = "rejected",
    WITHDRAWN = "withdrawn",
    EXPIRED = "expired"
}
export declare enum BidType {
    STANDARD = "standard",
    PREMIUM = "premium",
    EMERGENCY = "emergency"
}
export declare class Bid {
    id: string;
    listingId: string;
    bidderId: string;
    quantity: number;
    price: number;
    totalPrice?: number;
    status: BidStatus;
    type: BidType;
    message?: string;
    deliveryTerms: {
        deliveryDate?: Date;
        deliveryLocation?: {
            latitude: number;
            longitude: number;
            address?: string;
        };
        deliveryMethod?: string;
        deliveryCost?: number;
        flexibility?: number;
    };
    paymentTerms: {
        method?: string;
        schedule?: string[];
        advancePayment?: number;
        escrowRequired?: boolean;
        paymentDays?: number;
    };
    qualityRequirements: {
        minimumQuality?: number;
        certifications?: string[];
        testingRequired?: boolean;
        inspectionRequired?: boolean;
    };
    additionalTerms: {
        warrantyPeriod?: number;
        supportLevel?: string;
        penaltyClauses?: string[];
        bonusConditions?: string[];
    };
    metadata: {
        source?: string;
        urgency?: 'low' | 'medium' | 'high' | 'critical';
        confidence?: number;
        riskAssessment?: {
            financial: number;
            operational: number;
            regulatory: number;
        };
        competitiveAdvantage?: string[];
    };
    matchScore?: number;
    competitivenessScore?: number;
    reliabilityScore?: number;
    overallScore?: number;
    isCounterOffer: boolean;
    originalBidId?: string;
    counterBidId?: string;
    negotiationRound: number;
    autoAccept: boolean;
    autoRejectThreshold?: number;
    expiresAt?: Date;
    respondedAt?: Date;
    acceptedAt?: Date;
    rejectedAt?: Date;
    withdrawnAt?: Date;
    createdBy: string;
    updatedBy?: string;
    respondedBy?: string;
    auditTrail: Array<{
        timestamp: Date;
        action: string;
        userId?: string;
        reason?: string;
        previousStatus?: BidStatus;
        newStatus?: BidStatus;
    }>;
    analytics: {
        viewCount?: number;
        responseTime?: number;
        negotiationDuration?: number;
        priceHistory?: Array<{
            timestamp: Date;
            price: number;
            changeReason: string;
        }>;
        competitorBids?: Array<{
            price: number;
            quantity: number;
            timestamp: Date;
        }>;
    };
    createdAt: Date;
    updatedAt: Date;
    listing: EnergyListing;
    originalBid?: Bid;
    counterBid?: Bid;
}

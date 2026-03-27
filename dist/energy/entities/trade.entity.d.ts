import { EnergyListing } from './energy-listing.entity';
import { Bid } from './bid.entity';
export declare enum TradeStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    DISPUTED = "disputed",
    REFUNDED = "refunded"
}
export declare enum TradeType {
    STANDARD = "standard",
    PREMIUM = "premium",
    EMERGENCY = "emergency",
    BULK = "bulk"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
    PARTIALLY_REFUNDED = "partially_refunded"
}
export declare enum DeliveryStatus {
    PENDING = "pending",
    SCHEDULED = "scheduled",
    IN_TRANSIT = "in_transit",
    DELIVERED = "delivered",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare class Trade {
    id: string;
    listingId: string;
    bidId: string;
    buyerId: string;
    sellerId: string;
    quantity: number;
    price: number;
    totalAmount: number;
    finalPrice?: number;
    finalAmount?: number;
    status: TradeStatus;
    type: TradeType;
    paymentStatus: PaymentStatus;
    deliveryStatus: DeliveryStatus;
    negotiatedDiscount?: number;
    serviceFee?: number;
    taxAmount?: number;
    deliveryCost?: number;
    deliveryDetails: {
        deliveryAddress: {
            latitude: number;
            longitude: number;
            address: string;
            city: string;
            region: string;
            country: string;
            postalCode: string;
        };
        deliveryDate: Date;
        deliveryWindow: {
            start: Date;
            end: Date;
        };
        deliveryMethod: string;
        trackingNumber?: string;
        carrier?: string;
        specialInstructions?: string;
    };
    paymentDetails: {
        method: string;
        currency: string;
        paymentSchedule: Array<{
            dueDate: Date;
            amount: number;
            status: PaymentStatus;
            transactionId?: string;
        }>;
        escrowReleased?: boolean;
        refundAmount?: number;
        refundReason?: string;
    };
    contractTerms: {
        contractId?: string;
        contractUrl?: string;
        termsAccepted: boolean;
        termsAcceptedAt?: Date;
        terminationClause?: string;
        warrantyPeriod?: number;
        supportLevel?: string;
        penaltyClauses?: string[];
    };
    qualityAssurance: {
        inspectionRequired: boolean;
        inspectionCompleted?: boolean;
        inspectionDate?: Date;
        inspectionResult?: 'pass' | 'fail' | 'conditional';
        qualityScore?: number;
        deficiencies?: string[];
        correctiveActions?: string[];
    };
    compliance: {
        certifications: string[];
        regulatoryApproved: boolean;
        environmentalCompliance: boolean;
        safetyCompliance: boolean;
        complianceDocuments: Array<{
            type: string;
            url: string;
            verified: boolean;
            verifiedAt?: Date;
        }>;
    };
    milestones: Array<{
        id: string;
        name: string;
        description: string;
        dueDate: Date;
        completedDate?: Date;
        status: 'pending' | 'in_progress' | 'completed' | 'failed';
        assignedTo?: string;
        dependencies?: string[];
    }>;
    riskManagement: {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        riskFactors: string[];
        mitigationStrategies: string[];
        insuranceRequired: boolean;
        insurancePolicy?: string;
        contingencyPlans: string[];
    };
    metadata: {
        source?: string;
        urgency?: 'low' | 'medium' | 'high' | 'critical';
        priority?: number;
        tags?: string[];
        notes?: string[];
        attachments?: Array<{
            type: string;
            url: string;
            name: string;
            uploadedAt: Date;
        }>;
    };
    confirmedAt?: Date;
    completedAt?: Date;
    cancelledAt?: Date;
    disputedAt?: Date;
    refundedAt?: Date;
    deliveryConfirmedAt?: Date;
    paymentCompletedAt?: Date;
    createdBy: string;
    updatedBy?: string;
    confirmedBy?: string;
    cancelledBy?: string;
    disputedBy?: string;
    auditTrail: Array<{
        timestamp: Date;
        action: string;
        userId?: string;
        reason?: string;
        previousStatus?: TradeStatus;
        newStatus?: TradeStatus;
        details?: any;
    }>;
    analytics: {
        totalDuration?: number;
        paymentProcessingTime?: number;
        deliveryTime?: number;
        customerSatisfaction?: number;
        issues?: Array<{
            type: string;
            description: string;
            resolved: boolean;
            resolvedAt?: Date;
        }>;
        performanceMetrics?: {
            onTimeDelivery: boolean;
            qualityScore: number;
            communicationScore: number;
            overallRating: number;
        };
    };
    isDisputed: boolean;
    disputeReason?: string;
    disputeResolution?: string;
    refundAmount?: number;
    penaltyAmount?: number;
    bonusAmount?: number;
    createdAt: Date;
    updatedAt: Date;
    listing: EnergyListing;
    bid: Bid;
}

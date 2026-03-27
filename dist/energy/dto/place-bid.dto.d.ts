import { BidType } from '../entities/bid.entity';
export declare class DeliveryTermsDto {
    deliveryDate?: string;
    deliveryLocation?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    deliveryMethod?: string;
    deliveryCost?: number;
    flexibility?: number;
}
export declare class PaymentTermsDto {
    method?: string;
    schedule?: string[];
    advancePayment?: number;
    escrowRequired?: boolean;
    paymentDays?: number;
}
export declare class QualityRequirementsDto {
    minimumQuality?: number;
    certifications?: string[];
    testingRequired?: boolean;
    inspectionRequired?: boolean;
}
export declare class AdditionalTermsDto {
    warrantyPeriod?: number;
    supportLevel?: string;
    penaltyClauses?: string[];
    bonusConditions?: string[];
}
export declare class MetadataDto {
    source?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    riskAssessment?: {
        financial: number;
        operational: number;
        regulatory: number;
    };
    competitiveAdvantage?: string[];
}
export declare class PlaceBidDto {
    listingId: string;
    quantity: number;
    price: number;
    type?: BidType;
    message?: string;
    deliveryTerms?: DeliveryTermsDto;
    paymentTerms?: PaymentTermsDto;
    qualityRequirements?: QualityRequirementsDto;
    additionalTerms?: AdditionalTermsDto;
    metadata?: MetadataDto;
    expiresAt?: string;
    autoAccept?: boolean;
    autoRejectThreshold?: number;
}

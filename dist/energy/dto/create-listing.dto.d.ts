import { ListingType, EnergyType, DeliveryType } from '../entities/energy-listing.entity';
export declare class LocationDto {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
}
export declare class QualitySpecificationsDto {
    voltage?: number;
    frequency?: number;
    certification?: string[];
    qualityScore?: number;
    renewablePercentage?: number;
    carbonFootprint?: number;
}
export declare class PaymentTermsDto {
    method?: string;
    dueDays?: number;
    escrowRequired?: boolean;
    partialPayment?: boolean;
}
export declare class ContractTermsDto {
    duration?: number;
    terminationNotice?: number;
    penaltyClauses?: string[];
    forceMajeure?: boolean;
}
export declare class RequirementsDto {
    minimumBidQuantity?: number;
    maximumBidQuantity?: number;
    bidIncrement?: number;
    preferredBuyers?: string[];
    excludedBuyers?: string[];
    verificationRequired?: boolean;
}
export declare class MetadataDto {
    source?: string;
    gridConnection?: string;
    storageCapacity?: number;
    peakCapacity?: number;
    efficiency?: number;
    maintenanceSchedule?: string[];
    certifications?: string[];
    tags?: string[];
}
export declare class CreateListingDto {
    title: string;
    description?: string;
    type: ListingType;
    energyType: EnergyType;
    quantity: number;
    price: number;
    minPrice?: number;
    maxPrice?: number;
    deliveryType?: DeliveryType;
    deliveryDate?: string;
    deliveryStartDate?: string;
    deliveryEndDate?: string;
    location?: LocationDto;
    maxDeliveryDistance?: number;
    qualitySpecifications?: QualitySpecificationsDto;
    paymentTerms?: PaymentTermsDto;
    contractTerms?: ContractTermsDto;
    requirements?: RequirementsDto;
    metadata?: MetadataDto;
    expiresAt?: string;
    isFeatured?: boolean;
    isPremium?: boolean;
}

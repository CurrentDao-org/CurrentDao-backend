export declare enum ListingType {
    BUY = "buy",
    SELL = "sell"
}
export declare enum EnergyType {
    SOLAR = "solar",
    WIND = "wind",
    HYDRO = "hydro",
    NUCLEAR = "nuclear",
    FOSSIL = "fossil",
    BIOMASS = "biomass",
    GEOTHERMAL = "geothermal"
}
export declare enum ListingStatus {
    ACTIVE = "active",
    PENDING = "pending",
    FILLED = "filled",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export declare enum DeliveryType {
    IMMEDIATE = "immediate",
    SCHEDULED = "scheduled",
    FLEXIBLE = "flexible"
}
export declare class EnergyListing {
    id: string;
    title: string;
    description: string;
    type: ListingType;
    energyType: EnergyType;
    quantity: number;
    price: number;
    minPrice?: number;
    maxPrice?: number;
    status: ListingStatus;
    deliveryType: DeliveryType;
    deliveryDate?: Date;
    deliveryStartDate?: Date;
    deliveryEndDate?: Date;
    location: {
        latitude: number;
        longitude: number;
        address?: string;
        city?: string;
        region?: string;
        country?: string;
        postalCode?: string;
    };
    maxDeliveryDistance?: number;
    qualitySpecifications: {
        voltage?: number;
        frequency?: number;
        certification?: string[];
        qualityScore?: number;
        renewablePercentage?: number;
        carbonFootprint?: number;
    };
    paymentTerms: {
        method?: string;
        dueDays?: number;
        escrowRequired?: boolean;
        partialPayment?: boolean;
    };
    contractTerms: {
        duration?: number;
        terminationNotice?: number;
        penaltyClauses?: string[];
        forceMajeure?: boolean;
    };
    requirements: {
        minimumBidQuantity?: number;
        maximumBidQuantity?: number;
        bidIncrement?: number;
        preferredBuyers?: string[];
        excludedBuyers?: string[];
        verificationRequired?: boolean;
    };
    metadata: {
        source?: string;
        gridConnection?: string;
        storageCapacity?: number;
        peakCapacity?: number;
        efficiency?: number;
        maintenanceSchedule?: string[];
        certifications?: string[];
        tags?: string[];
    };
    sellerId?: string;
    buyerId?: string;
    createdBy: string;
    updatedBy?: string;
    expiresAt?: Date;
    filledAt?: Date;
    cancelledAt?: Date;
    viewCount: number;
    bidCount: number;
    isFeatured: boolean;
    isVerified: boolean;
    isPremium: boolean;
    visibilityScore: number;
    matchScore?: number;
    analytics: {
        views?: number;
        clicks?: number;
        saves?: number;
        shares?: number;
        conversionRate?: number;
        avgBidPrice?: number;
        priceRange?: {
            min: number;
            max: number;
            avg: number;
        };
    };
    createdAt: Date;
    updatedAt: Date;
    bids: Bid[];
    trades: Trade[];
}

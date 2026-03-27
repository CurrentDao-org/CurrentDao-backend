export declare enum EnergyType {
    SOLAR = "solar",
    WIND = "wind",
    HYDRO = "hydro",
    NUCLEAR = "nuclear",
    FOSSIL = "fossil",
    BIOMASS = "biomass",
    GEOTHERMAL = "geothermal"
}
export declare enum MatchingStrategy {
    PRICE_FIRST = "price_first",
    PROXIMITY_FIRST = "proximity_first",
    RENEWABLE_FIRST = "renewable_first",
    BALANCED = "balanced",
    CUSTOM = "custom"
}
export declare enum GeographicScope {
    LOCAL = "local",
    REGIONAL = "regional",
    NATIONAL = "national",
    INTERNATIONAL = "international"
}
export declare class PricePreferences {
    priceTolerance: number;
    maxPrice?: number;
    minPrice?: number;
    preferFixedPrice?: boolean;
}
export declare class GeographicPreferences {
    scope: GeographicScope;
    maxDistance?: number;
    preferredRegions?: string[];
    excludedRegions?: string[];
}
export declare class RenewablePreferences {
    preferRenewable: boolean;
    minimumRenewablePercentage?: number;
    preferredRenewableTypes?: EnergyType[];
    allowMixed?: boolean;
}
export declare class QuantityPreferences {
    minimumQuantity?: number;
    maximumQuantity?: number;
    allowPartialFulfillment?: boolean;
    partialFulfillmentThreshold?: number;
}
export declare class TimePreferences {
    matchingWindowHours?: number;
    preferredHours?: number[];
    preferredDays?: number[];
    allowImmediateMatching?: boolean;
}
export declare class QualityPreferences {
    minimumReliabilityScore?: number;
    preferredSuppliers?: string[];
    excludedSuppliers?: string[];
    prioritizeVerifiedSuppliers?: boolean;
}
export declare class MatchingPreferencesDto {
    strategy: MatchingStrategy;
    price?: PricePreferences;
    geographic?: GeographicPreferences;
    renewable?: RenewablePreferences;
    quantity?: QuantityPreferences;
    time?: TimePreferences;
    quality?: QualityPreferences;
    customRules?: string[];
    priorityScore?: number;
}

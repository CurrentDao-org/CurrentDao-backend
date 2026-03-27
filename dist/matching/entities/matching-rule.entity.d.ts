export declare enum RuleType {
    PRICE_PRIORITY = "price_priority",
    TIME_PRIORITY = "time_priority",
    GEOGRAPHIC_PROXIMITY = "geographic_proximity",
    RENEWABLE_PREFERENCE = "renewable_preference",
    QUANTITY_MATCH = "quantity_match",
    MINIMUM_ORDER_SIZE = "minimum_order_size",
    MAXIMUM_DISTANCE = "maximum_distance",
    PRICE_TOLERANCE = "price_tolerance",
    SUPPLIER_RELIABILITY = "supplier_reliability",
    MARKET_SEGMENT = "market_segment"
}
export declare enum RulePriority {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    CRITICAL = 4
}
export declare enum RuleStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare class MatchingRule {
    id: string;
    name: string;
    description: string;
    type: RuleType;
    priority: RulePriority;
    status: RuleStatus;
    weight: number;
    parameters: {
        minPrice?: number;
        maxPrice?: number;
        priceTolerance?: number;
        maxDistance?: number;
        minOrderSize?: number;
        maxOrderSize?: number;
        renewablePreference?: boolean;
        renewablePercentage?: number;
        timeWindow?: number;
        reliabilityThreshold?: number;
        marketSegment?: string;
        customRules?: Array<{
            condition: string;
            value: any;
            weight: number;
        }>;
    };
    conditions: {
        buyerType?: string[];
        sellerType?: string[];
        energyType?: string[];
        geographicRegion?: string[];
        timeRestrictions?: {
            startHour?: number;
            endHour?: number;
            daysOfWeek?: number[];
        };
    };
    isDefault: boolean;
    isSystemRule: boolean;
    appliesToBuyer: boolean;
    appliesToSeller: boolean;
    effectiveFrom: Date;
    effectiveTo: Date;
    createdBy: string;
    updatedBy: string;
    createdAt: Date;
    updatedAt: Date;
}

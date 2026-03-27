import { EnergyCategory } from './energy-category.entity';
export declare enum QualityRating {
    PREMIUM = "premium",
    STANDARD = "standard",
    BASIC = "basic"
}
export declare enum QualityTier {
    A = "A",
    B = "B",
    C = "C",
    D = "D"
}
export declare class EnergyQuality {
    id: string;
    rating: QualityRating;
    name: string;
    description: string;
    tier: QualityTier;
    categoryId: string;
    category: EnergyCategory;
    priceMultiplier: number;
    efficiencyMin: number;
    efficiencyMax: number;
    minPurity: number;
    isVerified: boolean;
    verificationStandard: string;
    isActive: boolean;
    sortOrder: number;
    tags: string[];
    requirements: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const DEFAULT_QUALITY_RATINGS: {
    rating: QualityRating;
    name: string;
    description: string;
    tier: QualityTier;
    priceMultiplier: number;
    efficiencyMin: number;
    efficiencyMax: number;
    minPurity: number;
    isVerified: boolean;
    verificationStandard: string;
    sortOrder: number;
    tags: string[];
    requirements: {
        minEfficiency: number;
        requiresCertification: boolean;
        inspectionFrequency: string;
    };
}[];
export declare const getQualityByRating: (rating: QualityRating) => (typeof DEFAULT_QUALITY_RATINGS)[0] | undefined;
export declare const calculateAdjustedPrice: (basePrice: number, qualityRating: QualityRating) => number;
export declare const meetsQualityRequirements: (efficiency: number, purity: number, rating: QualityRating) => boolean;

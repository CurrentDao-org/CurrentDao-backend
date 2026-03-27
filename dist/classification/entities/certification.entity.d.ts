import { EnergyCategory } from './energy-category.entity';
export declare enum CertificationType {
    GREEN_ENERGY = "green_energy",
    CARBON_NEUTRAL = "carbon_neutral",
    ORGANIC = "organic",
    FAIR_TRADE = "fair_trade",
    RENEWABLE_ENERGY = "renewable_energy",
    LOW_CARBON = "low_carbon",
    SUSTAINABLE = "sustainable",
    ECO_FRIENDLY = "eco_friendly"
}
export declare enum CertificationStatus {
    ACTIVE = "active",
    PENDING = "pending",
    EXPIRED = "expired",
    REVOKED = "revoked"
}
export declare class Certification {
    id: string;
    type: CertificationType;
    name: string;
    description: string;
    categoryId: string;
    category: EnergyCategory;
    issuingAuthority: string;
    certificationCode: string;
    status: CertificationStatus;
    validFrom: Date;
    validUntil: Date;
    isRecurring: boolean;
    renewalPeriodDays: number;
    priceAdjustment: number;
    isVerified: boolean;
    verificationMethod: string;
    logoUrl: string;
    tags: string[];
    requirements: Record<string, any>;
    metadata: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
export declare const DEFAULT_CERTIFICATIONS: ({
    type: CertificationType;
    name: string;
    description: string;
    issuingAuthority: string;
    certificationCode: string;
    status: CertificationStatus;
    priceAdjustment: number;
    isVerified: boolean;
    verificationMethod: string;
    tags: string[];
    requirements: {
        renewablePercentage: number;
        emissionThreshold: number;
        auditFrequency: string;
        carbonOffsetRequired?: undefined;
        netEmissions?: undefined;
        offsetVerification?: undefined;
        sourceVerification?: undefined;
        maxCarbonIntensity?: undefined;
        emissionReductionTarget?: undefined;
        sustainabilityScore?: undefined;
        environmentalImpact?: undefined;
    };
} | {
    type: CertificationType;
    name: string;
    description: string;
    issuingAuthority: string;
    certificationCode: string;
    status: CertificationStatus;
    priceAdjustment: number;
    isVerified: boolean;
    verificationMethod: string;
    tags: string[];
    requirements: {
        carbonOffsetRequired: boolean;
        netEmissions: number;
        offsetVerification: string;
        renewablePercentage?: undefined;
        emissionThreshold?: undefined;
        auditFrequency?: undefined;
        sourceVerification?: undefined;
        maxCarbonIntensity?: undefined;
        emissionReductionTarget?: undefined;
        sustainabilityScore?: undefined;
        environmentalImpact?: undefined;
    };
} | {
    type: CertificationType;
    name: string;
    description: string;
    issuingAuthority: string;
    certificationCode: string;
    status: CertificationStatus;
    priceAdjustment: number;
    isVerified: boolean;
    verificationMethod: string;
    tags: string[];
    requirements: {
        renewablePercentage: number;
        sourceVerification: string;
        emissionThreshold?: undefined;
        auditFrequency?: undefined;
        carbonOffsetRequired?: undefined;
        netEmissions?: undefined;
        offsetVerification?: undefined;
        maxCarbonIntensity?: undefined;
        emissionReductionTarget?: undefined;
        sustainabilityScore?: undefined;
        environmentalImpact?: undefined;
    };
} | {
    type: CertificationType;
    name: string;
    description: string;
    issuingAuthority: string;
    certificationCode: string;
    status: CertificationStatus;
    priceAdjustment: number;
    isVerified: boolean;
    verificationMethod: string;
    tags: string[];
    requirements: {
        maxCarbonIntensity: number;
        emissionReductionTarget: number;
        renewablePercentage?: undefined;
        emissionThreshold?: undefined;
        auditFrequency?: undefined;
        carbonOffsetRequired?: undefined;
        netEmissions?: undefined;
        offsetVerification?: undefined;
        sourceVerification?: undefined;
        sustainabilityScore?: undefined;
        environmentalImpact?: undefined;
    };
} | {
    type: CertificationType;
    name: string;
    description: string;
    issuingAuthority: string;
    certificationCode: string;
    status: CertificationStatus;
    priceAdjustment: number;
    isVerified: boolean;
    verificationMethod: string;
    tags: string[];
    requirements: {
        sustainabilityScore: number;
        environmentalImpact: string;
        renewablePercentage?: undefined;
        emissionThreshold?: undefined;
        auditFrequency?: undefined;
        carbonOffsetRequired?: undefined;
        netEmissions?: undefined;
        offsetVerification?: undefined;
        sourceVerification?: undefined;
        maxCarbonIntensity?: undefined;
        emissionReductionTarget?: undefined;
    };
})[];
export declare const isCertificationValid: (certification: Certification) => boolean;
export declare const needsRenewal: (certification: Certification) => boolean;
export declare const calculatePriceWithCertification: (basePrice: number, certifications: Certification[]) => number;

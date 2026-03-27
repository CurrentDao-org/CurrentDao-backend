import { QualityRating, QualityTier } from '../entities/energy-quality.entity';
import { CertificationType, CertificationStatus } from '../entities/certification.entity';
import { CategoryResponseDto } from './category.dto';
export declare class CreateQualityRatingDto {
    rating: QualityRating;
    name: string;
    description?: string;
    tier: QualityTier;
    categoryId: string;
    priceMultiplier?: number;
    efficiencyMin: number;
    efficiencyMax: number;
    minPurity?: number;
    isVerified?: boolean;
    verificationStandard?: string;
    sortOrder?: number;
    tags?: string[];
    requirements?: Record<string, any>;
}
declare const UpdateQualityRatingDto_base: Type<Partial<T>>;
export declare class UpdateQualityRatingDto extends UpdateQualityRatingDto_base {
    isActive?: boolean;
}
export declare class QualityRatingFilterDto {
    rating?: QualityRating;
    tier?: QualityTier;
    categoryId?: string;
    isVerified?: boolean;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
}
export declare class QualityRatingResponseDto {
    id: string;
    rating: QualityRating;
    name: string;
    description: string;
    tier: QualityTier;
    categoryId: string;
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
export declare class CreateCertificationDto {
    type: CertificationType;
    name: string;
    description?: string;
    categoryId?: string;
    issuingAuthority: string;
    certificationCode: string;
    validFrom: string;
    validUntil?: string;
    isRecurring?: boolean;
    renewalPeriodDays?: number;
    priceAdjustment?: number;
    isVerified?: boolean;
    verificationMethod?: string;
    logoUrl?: string;
    tags?: string[];
    requirements?: Record<string, any>;
}
declare const UpdateCertificationDto_base: Type<Partial<T>>;
export declare class UpdateCertificationDto extends UpdateCertificationDto_base {
    status?: CertificationStatus;
}
export declare class CertificationFilterDto {
    type?: CertificationType;
    status?: CertificationStatus;
    categoryId?: string;
    isVerified?: boolean;
    search?: string;
    validOnly?: boolean;
    page?: number;
    limit?: number;
}
export declare class CertificationResponseDto {
    id: string;
    type: CertificationType;
    name: string;
    description: string;
    categoryId: string;
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
    createdAt: Date;
    updatedAt: Date;
}
export declare class ClassificationResponseDto {
    category: CategoryResponseDto;
    quality: QualityRatingResponseDto;
    certifications: CertificationResponseDto[];
    totalMultiplier: number;
}
export {};

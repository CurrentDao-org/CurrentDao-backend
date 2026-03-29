/**
 * Quality Rating DTOs
 *
 * Data Transfer Objects for energy quality rating operations.
 */

import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsUUID,
  Min,
  Max,
  Length,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { QualityRating, QualityTier } from '../entities/energy-quality.entity';
import {
  CertificationType,
  CertificationStatus,
} from '../entities/certification.entity';
import { CategoryResponseDto } from './category.dto';

/**
 * Create quality rating DTO
 */
export class CreateQualityRatingDto {
  @ApiProperty({ enum: QualityRating, description: 'Quality rating' })
  @IsEnum(QualityRating)
  @IsNotEmpty()
  rating: QualityRating;

  @ApiProperty({ example: 'Premium Quality', description: 'Quality name' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Quality description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: QualityTier, description: 'Quality tier' })
  @IsEnum(QualityTier)
  @IsNotEmpty()
  tier: QualityTier;

  @ApiProperty({ description: 'Category ID' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 1.5, description: 'Price multiplier' })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(10)
  priceMultiplier?: number;

  @ApiProperty({ example: 95, description: 'Minimum efficiency percentage' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  efficiencyMin: number;

  @ApiProperty({ example: 100, description: 'Maximum efficiency percentage' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  efficiencyMax: number;

  @ApiPropertyOptional({
    example: 99,
    description: 'Minimum purity percentage',
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minPurity?: number;

  @ApiPropertyOptional({ example: true, description: 'Is verified' })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'ISO 50001',
    description: 'Verification standard',
  })
  @IsString()
  @IsOptional()
  verificationStandard?: string;

  @ApiPropertyOptional({ example: 1, description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({
    example: ['premium', 'high-efficiency'],
    description: 'Tags',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Requirements' })
  @IsOptional()
  requirements?: Record<string, any>;
}

/**
 * Update quality rating DTO
 */
export class UpdateQualityRatingDto extends PartialType(
  CreateQualityRatingDto,
) {
  @ApiPropertyOptional({ example: true, description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Quality rating filter DTO
 */
export class QualityRatingFilterDto {
  @ApiPropertyOptional({ enum: QualityRating, description: 'Filter by rating' })
  @IsEnum(QualityRating)
  @IsOptional()
  rating?: QualityRating;

  @ApiPropertyOptional({ enum: QualityTier, description: 'Filter by tier' })
  @IsEnum(QualityTier)
  @IsOptional()
  tier?: QualityTier;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by verified status',
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'premium',
    description: 'Search by name or description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * Quality rating response DTO
 */
export class QualityRatingResponseDto {
  @ApiProperty({ description: 'Quality ID' })
  id: string;

  @ApiProperty({ enum: QualityRating, description: 'Quality rating' })
  rating: QualityRating;

  @ApiProperty({ description: 'Quality name' })
  name: string;

  @ApiProperty({ description: 'Quality description' })
  description: string;

  @ApiProperty({ enum: QualityTier, description: 'Quality tier' })
  tier: QualityTier;

  @ApiProperty({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ example: 1.5, description: 'Price multiplier' })
  priceMultiplier: number;

  @ApiProperty({ example: 95, description: 'Minimum efficiency' })
  efficiencyMin: number;

  @ApiProperty({ example: 100, description: 'Maximum efficiency' })
  efficiencyMax: number;

  @ApiPropertyOptional({ example: 99, description: 'Minimum purity' })
  minPurity: number;

  @ApiProperty({ example: true, description: 'Is verified' })
  isVerified: boolean;

  @ApiPropertyOptional({
    example: 'ISO 50001',
    description: 'Verification standard',
  })
  verificationStandard: string;

  @ApiProperty({ example: true, description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ example: ['premium'], description: 'Tags' })
  tags: string[];

  @ApiPropertyOptional({ description: 'Requirements' })
  requirements: Record<string, any>;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

/**
 * Create certification DTO
 */
export class CreateCertificationDto {
  @ApiProperty({ enum: CertificationType, description: 'Certification type' })
  @IsEnum(CertificationType)
  @IsNotEmpty()
  type: CertificationType;

  @ApiProperty({
    example: 'Green Energy Certification',
    description: 'Certification name',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  name: string;

  @ApiPropertyOptional({ description: 'Certification description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    example: 'Green Energy Standards Board',
    description: 'Issuing authority',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 150)
  issuingAuthority: string;

  @ApiProperty({ example: 'GEC-001', description: 'Certification code' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  certificationCode: string;

  @ApiProperty({ example: '2024-01-01', description: 'Valid from date' })
  @IsDateString()
  @IsNotEmpty()
  validFrom: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Valid until date',
  })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ example: true, description: 'Is recurring' })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: 365, description: 'Renewal period in days' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  renewalPeriodDays?: number;

  @ApiPropertyOptional({
    example: 1.25,
    description: 'Price adjustment multiplier',
  })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(10)
  priceAdjustment?: number;

  @ApiPropertyOptional({ example: true, description: 'Is verified' })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'Third-party audit',
    description: 'Verification method',
  })
  @IsString()
  @IsOptional()
  verificationMethod?: string;

  @ApiPropertyOptional({
    example: '/logos/green-energy.png',
    description: 'Logo URL',
  })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: ['green', 'renewable'], description: 'Tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Requirements' })
  @IsOptional()
  requirements?: Record<string, any>;
}

/**
 * Update certification DTO
 */
export class UpdateCertificationDto extends PartialType(
  CreateCertificationDto,
) {
  @ApiPropertyOptional({
    enum: CertificationStatus,
    description: 'Certification status',
  })
  @IsEnum(CertificationStatus)
  @IsOptional()
  status?: CertificationStatus;
}

/**
 * Certification filter DTO
 */
export class CertificationFilterDto {
  @ApiPropertyOptional({
    enum: CertificationType,
    description: 'Filter by type',
  })
  @IsEnum(CertificationType)
  @IsOptional()
  type?: CertificationType;

  @ApiPropertyOptional({
    enum: CertificationStatus,
    description: 'Filter by status',
  })
  @IsEnum(CertificationStatus)
  @IsOptional()
  status?: CertificationStatus;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by verified status',
  })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @ApiPropertyOptional({
    example: 'green',
    description: 'Search by name or description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter only valid certifications',
  })
  @IsBoolean()
  @IsOptional()
  validOnly?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

/**
 * Certification response DTO
 */
export class CertificationResponseDto {
  @ApiProperty({ description: 'Certification ID' })
  id: string;

  @ApiProperty({ enum: CertificationType, description: 'Certification type' })
  type: CertificationType;

  @ApiProperty({ description: 'Certification name' })
  name: string;

  @ApiProperty({ description: 'Certification description' })
  description: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  categoryId: string;

  @ApiProperty({ description: 'Issuing authority' })
  issuingAuthority: string;

  @ApiProperty({ description: 'Certification code' })
  certificationCode: string;

  @ApiProperty({
    enum: CertificationStatus,
    description: 'Certification status',
  })
  status: CertificationStatus;

  @ApiProperty({ description: 'Valid from' })
  validFrom: Date;

  @ApiPropertyOptional({ description: 'Valid until' })
  validUntil: Date;

  @ApiProperty({ example: true, description: 'Is recurring' })
  isRecurring: boolean;

  @ApiPropertyOptional({ example: 365, description: 'Renewal period in days' })
  renewalPeriodDays: number;

  @ApiProperty({ example: 1.25, description: 'Price adjustment' })
  priceAdjustment: number;

  @ApiProperty({ example: true, description: 'Is verified' })
  isVerified: boolean;

  @ApiPropertyOptional({
    example: 'Third-party audit',
    description: 'Verification method',
  })
  verificationMethod: string;

  @ApiPropertyOptional({
    example: '/logos/green-energy.png',
    description: 'Logo URL',
  })
  logoUrl: string;

  @ApiProperty({ example: ['green', 'renewable'], description: 'Tags' })
  tags: string[];

  @ApiPropertyOptional({ description: 'Requirements' })
  requirements: Record<string, any>;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}

/**
 * Combined classification response DTO
 */
export class ClassificationResponseDto {
  @ApiProperty({ description: 'Category information' })
  category: CategoryResponseDto;

  @ApiProperty({ description: 'Quality rating information' })
  quality: QualityRatingResponseDto;

  @ApiProperty({ description: 'Applicable certifications' })
  certifications: CertificationResponseDto[];

  @ApiProperty({ example: 1.5, description: 'Total price multiplier' })
  totalMultiplier: number;
}

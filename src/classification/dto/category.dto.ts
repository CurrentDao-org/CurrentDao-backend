/**
 * Category DTOs
 *
 * Data Transfer Objects for energy category operations.
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
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EnergyType, EnergySubType } from '../entities/energy-category.entity';

/**
 * Create category DTO
 */
export class CreateCategoryDto {
  @ApiProperty({ enum: EnergyType, description: 'Energy type' })
  @IsEnum(EnergyType)
  @IsNotEmpty()
  energyType: EnergyType;

  @ApiProperty({ example: 'Solar Energy', description: 'Category name' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ description: 'Category description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: EnergySubType, description: 'Energy sub-type' })
  @IsEnum(EnergySubType)
  @IsOptional()
  subType?: EnergySubType;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ example: 1.25, description: 'Price multiplier' })
  @IsNumber()
  @IsOptional()
  @Min(0.1)
  @Max(10)
  priceMultiplier?: number;

  @ApiPropertyOptional({ example: true, description: 'Is renewable' })
  @IsBoolean()
  @IsOptional()
  isRenewable?: boolean;

  @ApiPropertyOptional({ example: 1, description: 'Sort order' })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(999)
  sortOrder?: number;

  @ApiPropertyOptional({ example: ['renewable', 'solar'], description: 'Tags' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * Update category DTO
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional({ example: true, description: 'Is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

/**
 * Category filter DTO
 */
export class CategoryFilterDto {
  @ApiPropertyOptional({
    enum: EnergyType,
    description: 'Filter by energy type',
  })
  @IsEnum(EnergyType)
  @IsOptional()
  energyType?: EnergyType;

  @ApiPropertyOptional({
    enum: EnergySubType,
    description: 'Filter by sub-type',
  })
  @IsEnum(EnergySubType)
  @IsOptional()
  subType?: EnergySubType;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by renewable status',
  })
  @IsBoolean()
  @IsOptional()
  isRenewable?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by active status',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'solar',
    description: 'Search by name or description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Tags to filter by' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

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
 * Category response DTO
 */
export class CategoryResponseDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ enum: EnergyType, description: 'Energy type' })
  energyType: EnergyType;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ description: 'Category description' })
  description: string;

  @ApiPropertyOptional({ enum: EnergySubType, description: 'Energy sub-type' })
  subType: EnergySubType;

  @ApiPropertyOptional({ description: 'Parent category ID' })
  parentId: string;

  @ApiProperty({ example: 1.25, description: 'Price multiplier' })
  priceMultiplier: number;

  @ApiProperty({ example: true, description: 'Is renewable' })
  isRenewable: boolean;

  @ApiProperty({ example: true, description: 'Is active' })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Sort order' })
  sortOrder: number;

  @ApiProperty({ example: ['renewable', 'solar'], description: 'Tags' })
  tags: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

/**
 * Category list response DTO
 */
export class CategoryListResponseDto {
  @ApiProperty({ description: 'List of categories' })
  categories: CategoryResponseDto[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 5, description: 'Total pages' })
  totalPages: number;
}

/**
 * Category tree DTO
 */
export class CategoryTreeDto {
  @ApiProperty({ description: 'Category ID' })
  id: string;

  @ApiProperty({ enum: EnergyType, description: 'Energy type' })
  energyType: EnergyType;

  @ApiProperty({ description: 'Category name' })
  name: string;

  @ApiProperty({ example: 1.25, description: 'Price multiplier' })
  priceMultiplier: number;

  @ApiProperty({ example: true, description: 'Is renewable' })
  isRenewable: boolean;

  @ApiProperty({ description: 'Child categories' })
  children: CategoryTreeDto[];
}

/**
 * Calculate price DTO
 */
export class CalculatePriceDto {
  @ApiProperty({ example: 100, description: 'Base price' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  basePrice: number;

  @ApiProperty({ enum: EnergyType, description: 'Energy type' })
  @IsEnum(EnergyType)
  @IsNotEmpty()
  energyType: EnergyType;

  @ApiPropertyOptional({ enum: EnergyType, description: 'Quality rating' })
  @IsOptional()
  qualityMultiplier?: number;

  @ApiPropertyOptional({ description: 'Certification multiplier' })
  @IsOptional()
  certificationMultiplier?: number;
}

/**
 * Calculate price response DTO
 */
export class CalculatePriceResponseDto {
  @ApiProperty({ example: 100, description: 'Base price' })
  basePrice: number;

  @ApiProperty({ example: 125, description: 'Adjusted price' })
  adjustedPrice: number;

  @ApiProperty({ example: 1.25, description: 'Total multiplier' })
  totalMultiplier: number;

  @ApiProperty({ description: 'Price breakdown' })
  breakdown: {
    categoryMultiplier: number;
    qualityMultiplier: number;
    certificationMultiplier: number;
  };
}

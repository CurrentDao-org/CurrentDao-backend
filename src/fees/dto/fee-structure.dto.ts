/**
 * Fee Structure DTO
 * 
 * DTO for creating and managing fee structures.
 */

import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeType, FeeCategory, TierRange } from '../entities/fee-structure.entity';

export class CreateFeeStructureDto {
  @ApiProperty({ example: 'Standard Trading Fee', description: 'Name of the fee structure' })
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiPropertyOptional({ example: 'Standard fee for all trading transactions', description: 'Description' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiProperty({ enum: FeeType, example: FeeType.PERCENTAGE, description: 'Type of fee calculation' })
  @IsEnum(FeeType)
  feeType: FeeType;

  @ApiProperty({ enum: FeeCategory, example: FeeCategory.TRADING, description: 'Category of fee' })
  @IsEnum(FeeCategory)
  category: FeeCategory;

  @ApiPropertyOptional({ example: 0.5, description: 'Percentage rate (for PERCENTAGE type)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageRate?: number;

  @ApiPropertyOptional({ example: 5, description: 'Fixed fee amount (for FIXED type)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @ApiPropertyOptional({ example: 1, description: 'Minimum fee amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumFee?: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum fee cap' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumFee?: number;

  @ApiPropertyOptional({ description: 'Tier ranges for TIERED fee type' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierRangeDto)
  tiers?: TierRangeDto[];

  @ApiProperty({ example: 'USD', description: 'Currency code (ISO 4217)' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({ example: true, description: 'Whether fee structure is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z', description: 'Valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z', description: 'Valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ example: 10000, description: 'Volume threshold for discounts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeThreshold?: number;

  @ApiPropertyOptional({ example: 0.1, description: 'Volume discount rate (10%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volumeDiscountRate?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TierRangeDto implements TierRange {
  @ApiProperty({ example: 0, description: 'Minimum value for tier' })
  @IsNumber()
  @Min(0)
  min: number;

  @ApiPropertyOptional({ example: 1000, description: 'Maximum value for tier' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max?: number;

  @ApiProperty({ example: 0.5, description: 'Fee rate for this tier' })
  @IsNumber()
  @Min(0)
  feeRate: number;

  @ApiPropertyOptional({ example: 2, description: 'Fixed fee for this tier' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedFee?: number;
}

export class UpdateFeeStructureDto {
  @ApiPropertyOptional({ example: 'Premium Trading Fee', description: 'Updated name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({ description: 'Updated description' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;

  @ApiPropertyOptional({ enum: FeeType, description: 'Updated fee type' })
  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @ApiPropertyOptional({ enum: FeeCategory, description: 'Updated category' })
  @IsOptional()
  @IsEnum(FeeCategory)
  category?: FeeCategory;

  @ApiPropertyOptional({ description: 'Updated percentage rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentageRate?: number;

  @ApiPropertyOptional({ description: 'Updated fixed amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @ApiPropertyOptional({ description: 'Updated minimum fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumFee?: number;

  @ApiPropertyOptional({ description: 'Updated maximum fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumFee?: number;

  @ApiPropertyOptional({ description: 'Updated tiers' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierRangeDto)
  tiers?: TierRangeDto[];

  @ApiPropertyOptional({ description: 'Updated active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Updated valid from date' })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Updated valid until date' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: 'Updated volume threshold' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeThreshold?: number;

  @ApiPropertyOptional({ description: 'Updated volume discount rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volumeDiscountRate?: number;

  @ApiPropertyOptional({ description: 'Updated metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

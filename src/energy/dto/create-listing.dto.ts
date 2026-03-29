import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ListingType,
  EnergyType,
  DeliveryType,
} from '../entities/energy-listing.entity';

export class LocationDto {
  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class QualitySpecificationsDto {
  @ApiPropertyOptional({ example: 230 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  voltage?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  frequency?: number;

  @ApiPropertyOptional({ example: ['ISO 9001', 'CE'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certification?: string[];

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  renewablePercentage?: number;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbonFootprint?: number;
}

export class PaymentTermsDto {
  @ApiPropertyOptional({ example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  dueDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  escrowRequired?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  partialPayment?: boolean;
}

export class ContractTermsDto {
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  terminationNotice?: number;

  @ApiPropertyOptional({
    example: ['late_delivery_penalty', 'quality_penalty'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  penaltyClauses?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  forceMajeure?: boolean;
}

export class RequirementsDto {
  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumBidQuantity?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumBidQuantity?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bidIncrement?: number;

  @ApiPropertyOptional({ example: ['verified_buyer_1', 'verified_buyer_2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredBuyers?: string[];

  @ApiPropertyOptional({ example: ['blocked_buyer_1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedBuyers?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  verificationRequired?: boolean;
}

export class MetadataDto {
  @ApiPropertyOptional({ example: 'solar_farm_alpha' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ example: 'grid_connection_123' })
  @IsOptional()
  @IsString()
  gridConnection?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storageCapacity?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peakCapacity?: number;

  @ApiPropertyOptional({ example: 92.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiency?: number;

  @ApiPropertyOptional({
    example: ['monthly_maintenance', 'quarterly_inspection'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maintenanceSchedule?: string[];

  @ApiPropertyOptional({ example: ['green_energy_cert', 'iso_14001'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: ['renewable', 'premium', 'certified'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class CreateListingDto {
  @ApiProperty({ example: 'Premium Solar Energy - 1000 MWh' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example:
      'High-quality solar energy from certified solar farm with excellent reliability record',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ListingType, example: ListingType.SELL })
  @IsEnum(ListingType)
  type: ListingType;

  @ApiProperty({ enum: EnergyType, example: EnergyType.SOLAR })
  @IsEnum(EnergyType)
  energyType: EnergyType;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 0.085 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 0.08 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 0.09 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: DeliveryType, example: DeliveryType.FLEXIBLE })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ example: '2024-02-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ example: '2024-02-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deliveryStartDate?: string;

  @ApiPropertyOptional({ example: '2024-02-20T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  deliveryEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDeliveryDistance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => QualitySpecificationsDto)
  qualitySpecifications?: QualitySpecificationsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentTermsDto)
  paymentTerms?: PaymentTermsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ContractTermsDto)
  contractTerms?: ContractTermsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => RequirementsDto)
  requirements?: RequirementsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;

  @ApiPropertyOptional({ example: '2024-03-15T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;
}

/**
 * Energy Listing DTO
 * 
 * DTO for creating and updating energy listings with comprehensive validation.
 */

import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidEnergyPrice, IsValidWalletAddress } from '../../common/decorators/custom-validators';

export enum ListingType {
  SELL = 'SELL',
  BUY = 'BUY',
}

export enum EnergyType {
  SOLAR = 'SOLAR',
  WIND = 'WIND',
  HYDRO = 'HYDRO',
  NUCLEAR = 'NUCLEAR',
  COAL = 'COAL',
  GAS = 'GAS',
  BIOMASS = 'BIOMASS',
  GEOTHERMAL = 'GEOTHERMAL',
}

export enum DeliveryType {
  FIXED = 'FIXED',
  FLEXIBLE = 'FLEXIBLE',
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
}

export class EnergyLocationDto {
  @ApiProperty({ example: 40.7128, description: 'Latitude coordinate' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: -74.006, description: 'Longitude coordinate' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ example: '123 Main Street', description: 'Street address' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  address?: string;

  @ApiPropertyOptional({ example: 'New York', description: 'City name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  city?: string;

  @ApiPropertyOptional({ example: 'NY', description: 'State or region' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  region?: string;

  @ApiPropertyOptional({ example: 'USA', description: 'Country name' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  country?: string;

  @ApiPropertyOptional({ example: '10001', description: 'Postal code' })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9\s-]{3,20}$/, { message: 'Invalid postal code format' })
  postalCode?: string;
}

export class EnergyQualitySpecificationsDto {
  @ApiPropertyOptional({ example: 230, description: 'Voltage in volts' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  voltage?: number;

  @ApiPropertyOptional({ example: 50, description: 'Frequency in Hz' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  frequency?: number;

  @ApiPropertyOptional({ example: ['ISO 9001', 'CE'], description: 'Certifications' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  certification?: string[];

  @ApiPropertyOptional({ example: 95, description: 'Quality score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  qualityScore?: number;

  @ApiPropertyOptional({ example: 80, description: 'Renewable energy percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  renewablePercentage?: number;

  @ApiPropertyOptional({ example: 0.5, description: 'Carbon footprint metric' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  carbonFootprint?: number;
}

export class EnergyPaymentTermsDto {
  @ApiPropertyOptional({ example: 'bank_transfer', description: 'Payment method' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  method?: string;

  @ApiPropertyOptional({ example: 30, description: 'Payment due days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  dueDays?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether escrow is required' })
  @IsOptional()
  @IsBoolean()
  escrowRequired?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Whether partial payment allowed' })
  @IsOptional()
  @IsBoolean()
  partialPayment?: boolean;
}

export class EnergyContractTermsDto {
  @ApiPropertyOptional({ example: 12, description: 'Contract duration in months' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  duration?: number;

  @ApiPropertyOptional({ example: 30, description: 'Termination notice days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  terminationNotice?: number;

  @ApiPropertyOptional({ example: ['late_delivery_penalty'], description: 'Penalty clauses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  penaltyClauses?: string[];

  @ApiPropertyOptional({ example: true, description: 'Force majeure clause' })
  @IsOptional()
  @IsBoolean()
  forceMajeure?: boolean;
}

export class EnergyRequirementsDto {
  @ApiPropertyOptional({ example: 100, description: 'Minimum bid quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumBidQuantity?: number;

  @ApiPropertyOptional({ example: 10000, description: 'Maximum bid quantity' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumBidQuantity?: number;

  @ApiPropertyOptional({ example: 50, description: 'Bid increment' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  bidIncrement?: number;

  @ApiPropertyOptional({ example: ['buyer1', 'buyer2'], description: 'Preferred buyers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  preferredBuyers?: string[];

  @ApiPropertyOptional({ example: ['buyer3'], description: 'Excluded buyers' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  excludedBuyers?: string[];

  @ApiPropertyOptional({ example: true, description: 'Verification required' })
  @IsOptional()
  @IsBoolean()
  verificationRequired?: boolean;
}

export class EnergyMetadataDto {
  @ApiPropertyOptional({ example: 'solar_farm_alpha', description: 'Source identifier' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  source?: string;

  @ApiPropertyOptional({ example: 'grid_connection_123', description: 'Grid connection ID' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  gridConnection?: string;

  @ApiPropertyOptional({ example: 1000, description: 'Storage capacity in MWh' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  storageCapacity?: number;

  @ApiPropertyOptional({ example: 500, description: 'Peak capacity in MW' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  peakCapacity?: number;

  @ApiPropertyOptional({ example: 92.5, description: 'Efficiency percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiency?: number;

  @ApiPropertyOptional({ example: ['monthly_maintenance'], description: 'Maintenance schedule' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  maintenanceSchedule?: string[];

  @ApiPropertyOptional({ example: ['green_energy_cert'], description: 'Certifications' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: ['renewable', 'premium'], description: 'Tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  tags?: string[];
}

export class CreateEnergyListingDto {
  @ApiProperty({ example: 'Premium Solar Energy - 1000 MWh', description: 'Listing title' })
  @IsString()
  @Length(10, 200, { message: 'Title must be between 10 and 200 characters' })
  title: string;

  @ApiPropertyOptional({ example: 'High-quality solar energy from certified solar farm', description: 'Listing description' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  description?: string;

  @ApiProperty({ enum: ListingType, example: ListingType.SELL, description: 'Type of listing' })
  @IsEnum(ListingType)
  type: ListingType;

  @ApiProperty({ enum: EnergyType, example: EnergyType.SOLAR, description: 'Type of energy' })
  @IsEnum(EnergyType)
  energyType: EnergyType;

  @ApiProperty({ example: 1000, description: 'Quantity in MWh' })
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  quantity: number;

  @ApiProperty({ example: 0.085, description: 'Price per MWh' })
  @IsNumber()
  @Min(0.0001)
  @Max(10000)
  @IsValidEnergyPrice({ message: 'Price must be between 0.01 and 1000' })
  price: number;

  @ApiPropertyOptional({ example: 0.08, description: 'Minimum acceptable price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  minPrice?: number;

  @ApiPropertyOptional({ example: 0.09, description: 'Maximum price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  maxPrice?: number;

  @ApiPropertyOptional({ enum: DeliveryType, example: DeliveryType.FLEXIBLE, description: 'Delivery type' })
  @IsOptional()
  @IsEnum(DeliveryType)
  deliveryType?: DeliveryType;

  @ApiPropertyOptional({ example: '2024-02-15T00:00:00.000Z', description: 'Delivery date' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ example: '2024-02-15T00:00:00.000Z', description: 'Delivery start date' })
  @IsOptional()
  @IsDateString()
  deliveryStartDate?: string;

  @ApiPropertyOptional({ example: '2024-02-20T23:59:59.000Z', description: 'Delivery end date' })
  @IsOptional()
  @IsDateString()
  deliveryEndDate?: string;

  @ApiPropertyOptional({ description: 'Location details' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyLocationDto)
  location?: EnergyLocationDto;

  @ApiPropertyOptional({ example: 500, description: 'Maximum delivery distance in km' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  maxDeliveryDistance?: number;

  @ApiPropertyOptional({ description: 'Quality specifications' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyQualitySpecificationsDto)
  qualitySpecifications?: EnergyQualitySpecificationsDto;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyPaymentTermsDto)
  paymentTerms?: EnergyPaymentTermsDto;

  @ApiPropertyOptional({ description: 'Contract terms' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyContractTermsDto)
  contractTerms?: EnergyContractTermsDto;

  @ApiPropertyOptional({ description: 'Requirements' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyRequirementsDto)
  requirements?: EnergyRequirementsDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => EnergyMetadataDto)
  metadata?: EnergyMetadataDto;

  @ApiPropertyOptional({ example: '2024-03-15T23:59:59.000Z', description: 'Expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether this is a featured listing' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether this is a premium listing' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', description: 'Seller wallet address' })
  @IsOptional()
  @IsString()
  @Length(56, 56)
  @IsValidWalletAddress()
  sellerWallet?: string;
}

/**
 * Bid DTO
 * 
 * DTO for placing and managing bids in the energy marketplace.
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
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsValidEnergyPrice,
  IsValidWalletAddress,
  IsValidPercentage,
  IsGreaterThan,
  IsLessThan,
} from '../../common/decorators/custom-validators';

export enum BidType {
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  BULK = 'BULK',
  EMERGENCY = 'EMERGENCY',
}

export class BidDeliveryTermsDto {
  @ApiPropertyOptional({ example: '2024-02-20T00:00:00.000Z', description: 'Preferred delivery date' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional({ description: 'Delivery location coordinates' })
  @IsOptional()
  @IsObject()
  deliveryLocation?: {
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude: number;

    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude: number;

    @IsOptional()
    @IsString()
    @Length(1, 200)
    address?: string;
  };

  @ApiPropertyOptional({ example: 'truck', description: 'Delivery method' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  deliveryMethod?: string;

  @ApiPropertyOptional({ example: 500, description: 'Delivery cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  deliveryCost?: number;

  @ApiPropertyOptional({ example: 3, description: 'Delivery flexibility days (0-7)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  flexibility?: number;
}

export class BidPaymentTermsDto {
  @ApiPropertyOptional({ example: 'bank_transfer', description: 'Payment method' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  method?: string;

  @ApiPropertyOptional({ example: ['50%', '50%'], description: 'Payment schedule' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  schedule?: string[];

  @ApiPropertyOptional({ example: 20, description: 'Advance payment percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsValidPercentage()
  advancePayment?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether escrow is required' })
  @IsOptional()
  @IsBoolean()
  escrowRequired?: boolean;

  @ApiPropertyOptional({ example: 30, description: 'Payment terms in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(365)
  paymentDays?: number;
}

export class BidQualityRequirementsDto {
  @ApiPropertyOptional({ example: 90, description: 'Minimum quality score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumQuality?: number;

  @ApiPropertyOptional({ example: ['ISO 9001', 'CE'], description: 'Required certifications' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: true, description: 'Whether testing is required' })
  @IsOptional()
  @IsBoolean()
  testingRequired?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Whether inspection is required' })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;
}

export class BidAdditionalTermsDto {
  @ApiPropertyOptional({ example: 12, description: 'Warranty period in months' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(120)
  warrantyPeriod?: number;

  @ApiPropertyOptional({ example: 'premium', description: 'Support level' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  supportLevel?: string;

  @ApiPropertyOptional({ example: ['late_delivery_penalty'], description: 'Penalty clauses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  penaltyClauses?: string[];

  @ApiPropertyOptional({ example: ['early_delivery_bonus'], description: 'Bonus conditions' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  bonusConditions?: string[];
}

export class BidMetadataDto {
  @ApiPropertyOptional({ example: 'industrial_buyer', description: 'Bid source' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  source?: string;

  @ApiPropertyOptional({ example: 'high', description: 'Urgency level' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  urgency?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({ example: 85, description: 'Confidence score (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @ApiPropertyOptional({ description: 'Risk assessment scores' })
  @IsOptional()
  @IsObject()
  riskAssessment?: {
    @IsNumber()
    @Min(0)
    @Max(100)
    financial: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    operational: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    regulatory: number;
  };

  @ApiPropertyOptional({ example: ['long_term_contract'], description: 'Competitive advantages' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(1, 100, { each: true })
  competitiveAdvantage?: string[];
}

export class PlaceBidDto {
  @ApiProperty({ example: 'listing-uuid-here', description: 'ID of the listing to bid on' })
  @IsString()
  @Length(1, 100)
  listingId: string;

  @ApiProperty({ example: 500, description: 'Quantity in MWh' })
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  quantity: number;

  @ApiProperty({ example: 0.0825, description: 'Bid price per MWh' })
  @IsNumber()
  @Min(0.0001)
  @Max(10000)
  @IsValidEnergyPrice({ message: 'Price must be between 0.01 and 1000' })
  price: number;

  @ApiPropertyOptional({ enum: BidType, example: BidType.STANDARD, description: 'Type of bid' })
  @IsOptional()
  @IsEnum(BidType)
  type?: BidType;

  @ApiPropertyOptional({ example: 'We offer competitive pricing with reliable delivery', description: 'Bid message' })
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  message?: string;

  @ApiPropertyOptional({ description: 'Delivery terms' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BidDeliveryTermsDto)
  deliveryTerms?: BidDeliveryTermsDto;

  @ApiPropertyOptional({ description: 'Payment terms' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BidPaymentTermsDto)
  paymentTerms?: BidPaymentTermsDto;

  @ApiPropertyOptional({ description: 'Quality requirements' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BidQualityRequirementsDto)
  qualityRequirements?: BidQualityRequirementsDto;

  @ApiPropertyOptional({ description: 'Additional terms' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BidAdditionalTermsDto)
  additionalTerms?: BidAdditionalTermsDto;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BidMetadataDto)
  metadata?: BidMetadataDto;

  @ApiPropertyOptional({ example: '2024-02-10T23:59:59.000Z', description: 'Bid expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether to auto-accept if conditions met' })
  @IsOptional()
  @IsBoolean()
  autoAccept?: boolean;

  @ApiPropertyOptional({ example: 0.3, description: 'Auto-reject threshold (30%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  autoRejectThreshold?: number;

  @ApiPropertyOptional({ example: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', description: 'Bidder wallet address' })
  @IsOptional()
  @IsString()
  @Length(56, 56)
  @IsValidWalletAddress()
  bidderWallet?: string;

  @ApiPropertyOptional({ example: 0.08, description: 'Maximum acceptable price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  maxPrice?: number;

  @ApiPropertyOptional({ example: 0.07, description: 'Minimum acceptable price for counter-bids' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  minCounterPrice?: number;
}

export class UpdateBidDto {
  @ApiPropertyOptional({ example: 600, description: 'Updated quantity in MWh' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  quantity?: number;

  @ApiPropertyOptional({ example: 0.0830, description: 'Updated price per MWh' })
  @IsOptional()
  @IsNumber()
  @Min(0.0001)
  @Max(10000)
  @IsValidEnergyPrice()
  price?: number;

  @ApiPropertyOptional({ example: '2024-02-15T23:59:59.000Z', description: 'Updated expiration' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether to mark as active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Updated delivery schedule available', description: 'Status message' })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  statusMessage?: string;
}

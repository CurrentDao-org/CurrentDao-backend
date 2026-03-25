import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BidType } from '../entities/bid.entity';

export class DeliveryTermsDto {
  @ApiPropertyOptional({ example: '2024-02-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  deliveryLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @ApiPropertyOptional({ example: 'truck' })
  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deliveryCost?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(7)
  flexibility?: number;
}

export class PaymentTermsDto {
  @ApiPropertyOptional({ example: 'bank_transfer' })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({ example: ['50%', '50%'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  schedule?: string[];

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  advancePayment?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  escrowRequired?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentDays?: number;
}

export class QualityRequirementsDto {
  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumQuality?: number;

  @ApiPropertyOptional({ example: ['ISO 9001', 'CE'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  testingRequired?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;
}

export class AdditionalTermsDto {
  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  warrantyPeriod?: number;

  @ApiPropertyOptional({ example: 'premium' })
  @IsOptional()
  @IsString()
  supportLevel?: string;

  @ApiPropertyOptional({ example: ['late_delivery_penalty'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  penaltyClauses?: string[];

  @ApiPropertyOptional({ example: ['early_delivery_bonus'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bonusConditions?: string[];
}

export class MetadataDto {
  @ApiPropertyOptional({ example: 'industrial_buyer' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ enum: ['low', 'medium', 'high', 'critical'], example: 'high' })
  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  urgency?: 'low' | 'medium' | 'high' | 'critical';

  @ApiPropertyOptional({ example: 85 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  riskAssessment?: {
    financial: number;
    operational: number;
    regulatory: number;
  };

  @ApiPropertyOptional({ example: ['long_term_contract', 'bulk_discount'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  competitiveAdvantage?: string[];
}

export class PlaceBidDto {
  @ApiProperty({ example: 'listing-uuid-here' })
  @IsString()
  listingId: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 0.0825 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ enum: BidType, example: BidType.STANDARD })
  @IsOptional()
  @IsEnum(BidType)
  type?: BidType;

  @ApiPropertyOptional({ example: 'We offer competitive pricing with reliable delivery schedule' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryTermsDto)
  deliveryTerms?: DeliveryTermsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentTermsDto)
  paymentTerms?: PaymentTermsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => QualityRequirementsDto)
  qualityRequirements?: QualityRequirementsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalTermsDto)
  additionalTerms?: AdditionalTermsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => MetadataDto)
  metadata?: MetadataDto;

  @ApiPropertyOptional({ example: '2024-02-10T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  autoAccept?: boolean;

  @ApiPropertyOptional({ example: 0.3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  autoRejectThreshold?: number;
}

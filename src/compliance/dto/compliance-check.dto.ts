import { IsString, IsNumber, IsObject, IsArray, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  EXCHANGE = 'exchange',
  PAYMENT = 'payment',
  INVESTMENT = 'investment',
}

export enum EntityType {
  INDIVIDUAL = 'individual',
  BUSINESS = 'business',
  GOVERNMENT = 'government',
  NON_PROFIT = 'non_profit',
  FINANCIAL_INSTITUTION = 'financial_institution',
}

export class ComplianceCheckDto {
  @ApiProperty({ description: 'Transaction ID', example: 'txn_123456789' })
  @IsString()
  transactionId: string;

  @ApiProperty({ description: 'User ID', example: 'user_12345' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Transaction type', enum: TransactionType })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({ description: 'Amount', example: 1000.50 })
  @IsNumber()
  amount: number;

  @ApiProperty({ description: 'Currency', example: 'USD' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Source entity information' })
  @IsObject()
  sourceEntity: {
    id: string;
    type: EntityType;
    name: string;
    jurisdiction: string;
    registrationNumber?: string;
    taxId?: string;
  };

  @ApiProperty({ description: 'Destination entity information' })
  @IsObject()
  destinationEntity: {
    id: string;
    type: EntityType;
    name: string;
    jurisdiction: string;
    registrationNumber?: string;
    taxId?: string;
  };

  @ApiPropertyOptional({ description: 'Transaction purpose', example: 'Payment for services' })
  @IsString()
  @IsOptional()
  purpose?: string;

  @ApiPropertyOptional({ description: 'Transaction date', example: '2024-01-01T12:00:00Z' })
  @IsOptional()
  transactionDate?: string;

  @ApiPropertyOptional({ description: 'Source country', example: 'US' })
  @IsString()
  @IsOptional()
  sourceCountry?: string;

  @ApiPropertyOptional({ description: 'Destination country', example: 'GB' })
  @IsString()
  @IsOptional()
  destinationCountry?: string;

  @ApiPropertyOptional({ description: 'Payment method', example: 'bank_transfer' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Reference documents', example: ['invoice_123', 'contract_456'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  referenceDocuments?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Risk score', example: 0.3 })
  @IsNumber()
  @IsOptional()
  riskScore?: number;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Device fingerprint', example: 'device_abc123' })
  @IsString()
  @IsOptional()
  deviceFingerprint?: string;

  @ApiPropertyOptional({ description: 'User agent', example: 'Mozilla/5.0...' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ description: 'Geolocation data' })
  @IsOptional()
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };

  @ApiPropertyOptional({ description: 'Beneficiary information' })
  @IsOptional()
  beneficiary?: {
    name: string;
    relationship: string;
    identification: string;
  };

  @ApiPropertyOptional({ description: 'Intermediary information' })
  @IsOptional()
  intermediary?: {
    name: string;
    type: string;
    jurisdiction: string;
  };

  @ApiPropertyOptional({ description: 'Compliance flags', example: ['high_value', 'cross_border'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  complianceFlags?: string[];
}

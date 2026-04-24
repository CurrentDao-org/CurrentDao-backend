import { IsString, IsNumber, IsEnum, IsOptional, IsObject, ValidateNested, IsArray, IsBoolean, Length, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType } from '../enums/transaction.enum';

export class EnergyDataDto {
  @ApiProperty({ example: 'electricity', description: 'Type of energy' })
  @IsString()
  energyType: string;

  @ApiProperty({ example: 1000, description: 'Quantity of energy' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 'kWh', description: 'Unit of measurement' })
  @IsString()
  unit: string;

  @ApiProperty({ example: 'US-TX', description: 'Source location' })
  @IsString()
  sourceLocation: string;

  @ApiProperty({ example: 'US-CA', description: 'Target location' })
  @IsString()
  targetLocation: string;
}

export class CurrencyConversionDto {
  @ApiProperty({ example: 'USD', description: 'Target currency' })
  @IsString()
  @Length(3, 3)
  targetCurrency: string;

  @ApiProperty({ example: 1.2, description: 'Exchange rate' })
  @IsNumber()
  @Min(0)
  exchangeRate: number;
}

export class CreateTransactionDto {
  @ApiProperty({ example: 'tx_123456789', description: 'Unique transaction identifier' })
  @IsString()
  @Length(1, 100)
  transactionId: string;

  @ApiProperty({ enum: TransactionType, description: 'Type of transaction' })
  @IsEnum(TransactionType)
  transactionType: TransactionType;

  @ApiProperty({ example: 1000.50, description: 'Transaction amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiProperty({ example: 'GABC...XYZ', description: 'Source public key' })
  @IsString()
  @Length(56, 56)
  sourcePublicKey: string;

  @ApiProperty({ example: 'GDEF...UVW', description: 'Target public key' })
  @IsString()
  @Length(56, 56)
  targetPublicKey: string;

  @ApiProperty({ example: 'US', description: 'Source country code' })
  @IsString()
  @Length(2, 2)
  sourceCountry: string;

  @ApiProperty({ example: 'CA', description: 'Target country code' })
  @IsString()
  @Length(2, 2)
  targetCountry: string;

  @ApiPropertyOptional({ type: EnergyDataDto, description: 'Energy trading data' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EnergyDataDto)
  energyData?: EnergyDataDto;

  @ApiPropertyOptional({ example: 5.50, description: 'Transaction fee' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fee?: number;

  @ApiPropertyOptional({ type: CurrencyConversionDto, description: 'Currency conversion details' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CurrencyConversionDto)
  currencyConversion?: CurrencyConversionDto;

  @ApiPropertyOptional({ example: 'Energy trade between Texas and California', description: 'Transaction notes' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  notes?: string;
}

export class BatchTransactionDto {
  @ApiProperty({ type: [CreateTransactionDto], description: 'Array of transactions to process' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionDto)
  transactions: CreateTransactionDto[];

  @ApiPropertyOptional({ example: 'batch_123', description: 'Batch identifier' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  batchId?: string;

  @ApiPropertyOptional({ example: false, description: 'Process transactions in parallel' })
  @IsOptional()
  @IsBoolean()
  parallel?: boolean;
}

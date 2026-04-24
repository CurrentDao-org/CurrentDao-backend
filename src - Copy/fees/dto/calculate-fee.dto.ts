/**
 * Calculate Fee DTO
 * 
 * DTO for fee calculation requests.
 */

import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, Length, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeeType, FeeCategory } from '../entities/fee-structure.entity';

export class CalculateFeeDto {
  @ApiProperty({ example: 'trade-123', description: 'Transaction identifier' })
  @IsString()
  @Length(1, 100)
  transactionId: string;

  @ApiProperty({ example: 'TRADING', description: 'Type of transaction' })
  @IsString()
  @Length(1, 50)
  transactionType: string;

  @ApiProperty({ example: 1000, description: 'Transaction amount' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  @IsString()
  @Length(3, 3)
  currency: string;

  @ApiPropertyOptional({ example: 'user-wallet-address', description: 'User wallet address' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  walletAddress?: string;

  @ApiPropertyOptional({ example: 'FIXED', enum: FeeType, description: 'Preferred fee type' })
  @IsOptional()
  @IsEnum(FeeType)
  feeType?: FeeType;

  @ApiPropertyOptional({ example: 'TRADING', enum: FeeCategory, description: 'Fee category' })
  @IsOptional()
  @IsEnum(FeeCategory)
  category?: FeeCategory;

  @ApiPropertyOptional({ example: 5000, description: 'User monthly trading volume' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  userVolume?: number;

  @ApiPropertyOptional({ example: true, description: 'Whether user is premium member' })
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  @ApiPropertyOptional({ example: 'PROMO2024', description: 'Promotional code' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  promotionalCode?: string;

  @ApiPropertyOptional({ example: '2024-02-15T00:00:00.000Z', description: 'Transaction date' })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

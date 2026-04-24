import { IsString, IsNumber, IsOptional, IsEnum, IsDate, Min, Max, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ 
    description: 'Transaction type', 
    enum: ['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT']
  })
  @IsEnum(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT'])
  transactionType: string;

  @ApiProperty({ description: 'Quantity of asset' })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Price per unit' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Total amount (quantity × price)' })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Transaction fees', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fees?: number;

  @ApiPropertyOptional({ description: 'Taxes', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxes?: number;

  @ApiPropertyOptional({ description: 'Transaction date' })
  @IsOptional()
  @IsDate()
  date?: Date;

  @ApiPropertyOptional({ description: 'Settlement date' })
  @IsOptional()
  @IsDate()
  settlementDate?: Date;

  @ApiPropertyOptional({ description: 'Exchange' })
  @IsOptional()
  @IsString()
  exchange?: string;

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ description: 'External transaction ID' })
  @IsOptional()
  @IsString()
  externalTransactionId?: string;

  @ApiPropertyOptional({ description: 'Transaction notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: object;
}

export class TransactionQueryDto {
  @ApiPropertyOptional({ description: 'Portfolio ID filter' })
  @IsOptional()
  @IsString()
  portfolioId?: string;

  @ApiPropertyOptional({ description: 'Asset ID filter' })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional({ 
    description: 'Transaction type filter', 
    enum: ['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT']
  })
  @IsOptional()
  @IsEnum(['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT'])
  transactionType?: string;

  @ApiPropertyOptional({ description: 'Start date filter' })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date filter' })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}

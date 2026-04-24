import { IsString, IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMarketDataDto {
  @ApiProperty({ description: 'Trading symbol', example: 'BTC/USD' })
  @IsString()
  symbol: string;

  @ApiProperty({ description: 'Current price', example: 45000.50 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Trading volume', example: 1234567.89 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  volume?: number;

  @ApiPropertyOptional({ description: 'High price', example: 46000.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  high?: number;

  @ApiPropertyOptional({ description: 'Low price', example: 44000.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  low?: number;

  @ApiPropertyOptional({ description: 'Open price', example: 44500.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  open?: number;

  @ApiPropertyOptional({ description: 'Close price', example: 45200.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  close?: number;

  @ApiPropertyOptional({ description: 'Bid price', example: 44999.50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bid?: number;

  @ApiPropertyOptional({ description: 'Ask price', example: 45001.50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  ask?: number;

  @ApiPropertyOptional({ description: 'Bid-ask spread', example: 2.00 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  spread?: number;

  @ApiPropertyOptional({ description: 'Data source', example: 'binance' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Market identifier', example: 'spot' })
  @IsString()
  @IsOptional()
  market?: string;

  @ApiPropertyOptional({ description: 'Currency', example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Source timestamp', example: '2024-01-01T12:00:00Z' })
  @IsDateString()
  @IsOptional()
  sourceTimestamp?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

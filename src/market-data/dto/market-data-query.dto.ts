import { IsString, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class MarketDataQueryDto {
  @ApiPropertyOptional({ description: 'Filter by symbol', example: 'BTC/USD' })
  @IsString()
  @IsOptional()
  symbol?: string;

  @ApiPropertyOptional({ description: 'Filter by data source', example: 'binance' })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({ description: 'Start time filter', example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time filter', example: '2024-01-02T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Limit results', example: 100 })
  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset results', example: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  offset?: number;

  @ApiPropertyOptional({ description: 'Minimum quality score', example: 90 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  minQualityScore?: number;

  @ApiPropertyOptional({ description: 'Maximum quality score', example: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxQualityScore?: number;
}

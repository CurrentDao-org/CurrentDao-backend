import { IsString, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePositionDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiProperty({ description: 'Asset ID' })
  @IsString()
  assetId: string;

  @ApiProperty({ description: 'Quantity of asset' })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ description: 'Average cost per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageCost?: number;

  @ApiPropertyOptional({ description: 'Allocation target percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationTarget?: number;

  @ApiPropertyOptional({ description: 'Position status' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'CLOSED', 'PENDING'])
  status?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: object;
}

export class UpdatePositionDto {
  @ApiPropertyOptional({ description: 'Quantity of asset' })
  @IsOptional()
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Average cost per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  averageCost?: number;

  @ApiPropertyOptional({ description: 'Current price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentPrice?: number;

  @ApiPropertyOptional({ description: 'Allocation target percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationTarget?: number;

  @ApiPropertyOptional({ description: 'Position status' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'CLOSED', 'PENDING'])
  status?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: object;
}

export class PositionQueryDto {
  @ApiPropertyOptional({ description: 'Portfolio ID filter' })
  @IsOptional()
  @IsString()
  portfolioId?: string;

  @ApiPropertyOptional({ description: 'Asset ID filter' })
  @IsOptional()
  @IsString()
  assetId?: string;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsEnum(['ACTIVE', 'CLOSED', 'PENDING'])
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

export class RebalancePositionDto {
  @ApiProperty({ description: 'Target allocation percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  targetAllocation: number;

  @ApiPropertyOptional({ description: 'Rebalancing tolerance' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  tolerance?: number;
}

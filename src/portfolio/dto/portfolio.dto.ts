import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, IsObject, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePortfolioDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Portfolio name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Portfolio description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Initial portfolio value', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialValue?: number;

  @ApiPropertyOptional({ description: 'Portfolio currency', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ 
    description: 'Risk tolerance level', 
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    default: 'MEDIUM'
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  riskTolerance?: string;

  @ApiPropertyOptional({ description: 'Investment objective' })
  @IsOptional()
  @IsString()
  investmentObjective?: string;

  @ApiPropertyOptional({ description: 'Enable auto rebalancing', default: false })
  @IsOptional()
  @IsBoolean()
  autoRebalance?: boolean;

  @ApiPropertyOptional({ description: 'Rebalancing threshold percentage', default: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rebalanceThreshold?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: object;
}

export class UpdatePortfolioDto {
  @ApiPropertyOptional({ description: 'Portfolio name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Portfolio description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Risk tolerance level', 
    enum: ['LOW', 'MEDIUM', 'HIGH']
  })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  riskTolerance?: string;

  @ApiPropertyOptional({ description: 'Investment objective' })
  @IsOptional()
  @IsString()
  investmentObjective?: string;

  @ApiPropertyOptional({ description: 'Enable auto rebalancing' })
  @IsOptional()
  @IsBoolean()
  autoRebalance?: boolean;

  @ApiPropertyOptional({ description: 'Rebalancing threshold percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rebalanceThreshold?: number;

  @ApiPropertyOptional({ description: 'Portfolio status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: object;
}

export class PortfolioQueryDto {
  @ApiPropertyOptional({ description: 'User ID filter' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Status filter' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Risk tolerance filter' })
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  riskTolerance?: string;

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

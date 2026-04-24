import { IsString, IsArray, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ModelQueryDto {
  @ApiPropertyOptional({ description: 'Filter by model type', example: 'classification' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by status', example: 'trained' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by architecture', example: 'neural_network' })
  @IsString()
  @IsOptional()
  architecture?: string;

  @ApiPropertyOptional({ description: 'Filter by owner', example: 'data_science_team' })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', example: ['energy', 'prediction'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Filter by deployment environment', example: 'production' })
  @IsString()
  @IsOptional()
  deploymentEnvironment?: string;

  @ApiPropertyOptional({ description: 'Filter by monitoring enabled', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  monitoringEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Limit results', example: 100 })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset results', example: 0 })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  offset?: number;

  @ApiPropertyOptional({ description: 'Sort by field', example: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort order', example: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: string;

  @ApiPropertyOptional({ description: 'Search term', example: 'energy price' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by date range start', example: '2024-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter by date range end', example: '2024-12-31' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by performance threshold', example: 0.95 })
  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  performanceThreshold?: number;
}

import { IsString, IsArray, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class ComplianceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category', example: 'aml' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by jurisdiction', example: 'US' })
  @IsString()
  @IsOptional()
  jurisdiction?: string;

  @ApiPropertyOptional({ description: 'Filter by active status', example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  active?: boolean;

  @ApiPropertyOptional({ description: 'Filter by risk level', example: 'high' })
  @IsString()
  @IsOptional()
  riskLevel?: string;

  @ApiPropertyOptional({ description: 'Filter by rule type', example: 'transaction_limit' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Filter by tags', example: ['high_risk', 'manual_review'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

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

  @ApiPropertyOptional({ description: 'Search term', example: 'transaction limit' })
  @IsString()
  @IsOptional()
  search?: string;
}

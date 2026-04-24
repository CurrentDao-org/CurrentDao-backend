import { IsString, IsNumber, IsOptional, IsDate, Min, Max, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PerformanceAnalyticsDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiPropertyOptional({ description: 'Start date for analysis' })
  @IsOptional()
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ description: 'End date for analysis' })
  @IsOptional()
  @IsDate()
  endDate?: Date;

  @ApiPropertyOptional({ description: 'Benchmark symbol' })
  @IsOptional()
  @IsString()
  benchmark?: string;

  @ApiPropertyOptional({ description: 'Include risk metrics', default: true })
  @IsOptional()
  includeRiskMetrics?: boolean;

  @ApiPropertyOptional({ description: 'Include attribution analysis', default: false })
  @IsOptional()
  includeAttribution?: boolean;
}

export class RiskAnalysisDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiPropertyOptional({ description: 'Risk confidence level', default: 0.95 })
  @IsOptional()
  @IsNumber()
  @Min(0.8)
  @Max(0.99)
  confidenceLevel?: number;

  @ApiPropertyOptional({ description: 'Time horizon in days', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  timeHorizon?: number;

  @ApiPropertyOptional({ description: 'Include stress testing', default: true })
  @IsOptional()
  includeStressTest?: boolean;

  @ApiPropertyOptional({ description: 'Stress test scenarios' })
  @IsOptional()
  @IsArray()
  scenarios?: string[];
}

export class OptimizationRequestDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiPropertyOptional({ 
    description: 'Optimization objective', 
    enum: ['MAX_RETURN', 'MIN_RISK', 'MAX_SHARPE', 'RISK_PARITY', 'EQUAL_WEIGHT'],
    default: 'MAX_SHARPE'
  })
  @IsOptional()
  @IsEnum(['MAX_RETURN', 'MIN_RISK', 'MAX_SHARPE', 'RISK_PARITY', 'EQUAL_WEIGHT'])
  objective?: string;

  @ApiPropertyOptional({ description: 'Target return' })
  @IsOptional()
  @IsNumber()
  targetReturn?: number;

  @ApiPropertyOptional({ description: 'Maximum risk level' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxRisk?: number;

  @ApiPropertyOptional({ description: 'Minimum allocation percentage', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minAllocation?: number;

  @ApiPropertyOptional({ description: 'Maximum allocation percentage', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  maxAllocation?: number;

  @ApiPropertyOptional({ description: 'Restricted assets' })
  @IsOptional()
  @IsArray()
  restrictedAssets?: string[];

  @ApiPropertyOptional({ description: 'Required assets' })
  @IsOptional()
  @IsArray()
  requiredAssets?: string[];
}

export class RebalanceRequestDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiPropertyOptional({ description: 'Rebalancing threshold', default: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  threshold?: number;

  @ApiPropertyOptional({ description: 'Execute trades', default: false })
  @IsOptional()
  executeTrades?: boolean;

  @ApiPropertyOptional({ description: 'Target allocations' })
  @IsOptional()
  @IsArray()
  targetAllocations?: Array<{
    assetId: string;
    targetPercentage: number;
  }>;
}

export class PortfolioSnapshotDto {
  @ApiProperty({ description: 'Portfolio ID' })
  @IsString()
  portfolioId: string;

  @ApiPropertyOptional({ description: 'Include positions', default: true })
  @IsOptional()
  includePositions?: boolean;

  @ApiPropertyOptional({ description: 'Include performance metrics', default: true })
  @IsOptional()
  includePerformance?: boolean;

  @ApiPropertyOptional({ description: 'Include risk metrics', default: false })
  @IsOptional()
  includeRisk?: boolean;

  @ApiPropertyOptional({ description: 'Include allocation data', default: true })
  @IsOptional()
  includeAllocation?: boolean;
}

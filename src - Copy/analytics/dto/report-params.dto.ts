import {
  IsOptional,
  IsString,
  IsEnum,
  IsDate,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AnalyticsType,
  AggregationPeriod,
} from '../entities/analytics-data.entity';

export enum ReportFormat {
  JSON = 'json',
  CSV = 'csv',
  PDF = 'pdf',
}

export class ReportParamsDto {
  @ApiPropertyOptional({
    description: 'Type of analytics report',
    enum: AnalyticsType,
  })
  @IsOptional()
  @IsEnum(AnalyticsType)
  type?: AnalyticsType;

  @ApiPropertyOptional({
    description: 'Aggregation period for the data',
    enum: AggregationPeriod,
  })
  @IsOptional()
  @IsEnum(AggregationPeriod)
  period?: AggregationPeriod;

  @ApiPropertyOptional({
    description: 'Start date for the report period',
    type: Date,
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'End date for the report period',
    type: Date,
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'User ID to filter data for specific user',
    example: 'user-123',
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Grid zone ID to filter data for specific zone',
    example: 'zone-456',
  })
  @IsOptional()
  @IsString()
  gridZoneId?: string;

  @ApiPropertyOptional({
    description: 'Country to filter data',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Report output format',
    enum: ReportFormat,
    default: ReportFormat.JSON,
  })
  @IsOptional()
  @IsEnum(ReportFormat)
  format?: ReportFormat = ReportFormat.JSON;

  @ApiPropertyOptional({
    description: 'Include technical indicators in price trend reports',
    default: true,
  })
  @IsOptional()
  includeTechnicalIndicators?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include comparative analysis',
    default: true,
  })
  @IsOptional()
  includeComparativeAnalysis?: boolean = true;

  @ApiPropertyOptional({
    description: 'Number of top performers to include in leaderboards',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  topPerformersCount?: number = 10;

  @ApiPropertyOptional({
    description: 'Enable real-time data refresh',
    default: false,
  })
  @IsOptional()
  realTime?: boolean = false;
}

export class DashboardMetricsDto {
  @ApiPropertyOptional({
    description: 'Time window for dashboard metrics (in hours)',
    example: 24,
    minimum: 1,
    maximum: 8760,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(8760)
  timeWindowHours?: number = 24;

  @ApiPropertyOptional({
    description: 'Include geographic breakdown',
    default: true,
  })
  @IsOptional()
  includeGeographicBreakdown?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include renewable energy metrics',
    default: true,
  })
  @IsOptional()
  includeRenewableMetrics?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include market efficiency indicators',
    default: true,
  })
  @IsOptional()
  includeMarketEfficiency?: boolean = true;
}

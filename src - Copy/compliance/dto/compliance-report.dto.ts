import { IsString, IsArray, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  AD_HOC = 'ad_hoc',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export enum ReportCategory {
  TRANSACTIONS = 'transactions',
  VIOLATIONS = 'violations',
  RISK_ASSESSMENT = 'risk_assessment',
  REGULATORY = 'regulatory',
  AUDIT = 'audit',
  PERFORMANCE = 'performance',
}

export class ComplianceReportDto {
  @ApiProperty({ description: 'Report title', example: 'Daily Compliance Report' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Report type', enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: 'Report category', enum: ReportCategory })
  @IsEnum(ReportCategory)
  category: ReportCategory;

  @ApiProperty({ description: 'Start date', example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date', example: '2024-01-02T00:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ description: 'Report format', enum: ReportFormat })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({ description: 'Jurisdictions to include', example: ['US', 'EU', 'UK'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  jurisdictions?: string[];

  @ApiPropertyOptional({ description: 'Compliance categories to include', example: ['aml', 'kyc', 'sanctions'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({ description: 'Risk levels to include', example: ['high', 'medium'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  riskLevels?: string[];

  @ApiPropertyOptional({ description: 'Include charts and graphs', example: true })
  @IsOptional()
  includeCharts?: boolean;

  @ApiPropertyOptional({ description: 'Include detailed analysis', example: true })
  @IsOptional()
  includeAnalysis?: boolean;

  @ApiPropertyOptional({ description: 'Include recommendations', example: true })
  @IsOptional()
  includeRecommendations?: boolean;

  @ApiPropertyOptional({ description: 'Report recipients', example: ['compliance@company.com', 'management@company.com'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recipients?: string[];

  @ApiPropertyOptional({ description: 'Custom filters' })
  @IsOptional()
  filters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Report template', example: 'standard_compliance_report' })
  @IsString()
  @IsOptional()
  template?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

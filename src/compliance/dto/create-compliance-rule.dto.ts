import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ComplianceRuleType {
  TRANSACTION_LIMIT = 'transaction_limit',
  GEOGRAPHIC_RESTRICTION = 'geographic_restriction',
  AMOUNT_THRESHOLD = 'amount_threshold',
  TIME_RESTRICTION = 'time_restriction',
  ENTITY_SCREENING = 'entity_screening',
  DOCUMENT_VERIFICATION = 'document_verification',
  REPORTING_REQUIREMENT = 'reporting_requirement',
  DATA_PROTECTION = 'data_protection',
}

export enum ComplianceCategory {
  AML = 'aml',
  KYC = 'kyc',
  SANCTIONS = 'sanctions',
  TAX = 'tax',
  PRIVACY = 'privacy',
  SECURITIES = 'securities',
  BANKING = 'banking',
  GENERAL = 'general',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateComplianceRuleDto {
  @ApiProperty({ description: 'Rule name', example: 'Daily Transaction Limit' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Rule description', example: 'Limit daily transactions to $10,000' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Rule type', enum: ComplianceRuleType })
  @IsEnum(ComplianceRuleType)
  type: ComplianceRuleType;

  @ApiProperty({ description: 'Compliance category', enum: ComplianceCategory })
  @IsEnum(ComplianceCategory)
  category: ComplianceCategory;

  @ApiProperty({ description: 'Jurisdiction', example: 'US' })
  @IsString()
  jurisdiction: string;

  @ApiProperty({ description: 'Risk level', enum: RiskLevel })
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @ApiProperty({ description: 'Rule parameters', example: { maxAmount: 10000, currency: 'USD' } })
  parameters: Record<string, any>;

  @ApiPropertyOptional({ description: 'Rule conditions', example: { userTier: 'verified', businessHours: true } })
  @IsOptional()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Rule actions', example: { block: true, alert: true, report: true } })
  @IsOptional()
  actions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Priority level', example: 1 })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({ description: 'Applicable jurisdictions', example: ['US', 'EU', 'UK'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  applicableJurisdictions?: string[];

  @ApiPropertyOptional({ description: 'Excluded entities', example: ['government', 'banks'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  excludedEntities?: string[];

  @ApiPropertyOptional({ description: 'Required documents', example: ['passport', 'proof_of_address'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'Time restrictions', example: { startHour: 9, endHour: 17, weekdays: true } })
  @IsOptional()
  timeRestrictions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Amount restrictions', example: { minAmount: 100, maxAmount: 10000, currency: 'USD' } })
  @IsOptional()
  amountRestrictions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Geographic restrictions', example: { allowedCountries: ['US', 'CA'], blockedCountries: ['IR', 'KP'] } })
  @IsOptional()
  geographicRestrictions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Entity screening requirements', example: { sanctionLists: ['OFAC', 'UN'], pepLists: true } })
  @IsOptional()
  entityScreening?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Reporting requirements', example: { frequency: 'daily', recipients: ['compliance@company.com'] } })
  @IsOptional()
  reportingRequirements?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Data protection requirements', example: { encryption: true, retention: '7_years', anonymization: true } })
  @IsOptional()
  dataProtection?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Rule version', example: '1.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Effective date', example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional({ description: 'Expiry date', example: '2024-12-31T23:59:59Z' })
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Rule tags', example: ['high_risk', 'manual_review'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Rule metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
  IsDateString,
  IsPositive,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  FraudType,
  FraudSeverity,
  FraudCaseStatus,
} from '../entities/fraud-case.entity';

// ─── Re-export enums for convenience ────────────────────────────────────────
export { FraudType, FraudSeverity, FraudCaseStatus };

// ─── Trade Analysis Request ──────────────────────────────────────────────────
export class AnalyzeTradeDto {
  @ApiProperty({ description: 'Unique identifier of the trade' })
  @IsString()
  tradeId: string;

  @ApiProperty({ description: 'Trader / account identifier' })
  @IsString()
  traderId: string;

  @ApiPropertyOptional({ description: 'Counterparty identifier' })
  @IsOptional()
  @IsString()
  counterpartyId?: string;

  @ApiProperty({ description: 'Energy market identifier (e.g., EU-ETS, PJM)' })
  @IsString()
  market: string;

  @ApiProperty({
    description: 'Asset type (e.g., electricity, gas, carbon_credit)',
  })
  @IsString()
  assetType: string;

  @ApiProperty({ description: 'Trade quantity in MWh or equivalent' })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Trade price per unit' })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ description: 'Total trade value in USD' })
  @IsNumber()
  @IsPositive()
  tradeValue: number;

  @ApiProperty({ description: 'Order side: buy or sell' })
  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @ApiProperty({ description: 'Order type: market, limit, stop' })
  @IsEnum(['market', 'limit', 'stop'])
  orderType: 'market' | 'limit' | 'stop';

  @ApiPropertyOptional({ description: 'Time-in-force: GTC, IOC, FOK' })
  @IsOptional()
  @IsEnum(['GTC', 'IOC', 'FOK'])
  timeInForce?: 'GTC' | 'IOC' | 'FOK';

  @ApiPropertyOptional({ description: 'Timestamp of the trade (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  tradeTimestamp?: string;

  @ApiPropertyOptional({ description: 'Additional trade metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

// ─── Batch Trade Analysis ────────────────────────────────────────────────────
export class AnalyzeTradesBatchDto {
  @ApiProperty({
    type: [AnalyzeTradeDto],
    description: 'Array of trades to analyze',
  })
  @IsArray()
  trades: AnalyzeTradeDto[];
}

// ─── Pre-trade Prevention Check ─────────────────────────────────────────────
export class PreTradeCheckDto {
  @ApiProperty()
  @IsString()
  traderId: string;

  @ApiProperty()
  @IsString()
  market: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty()
  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  counterpartyId?: string;
}

// ─── Investigation Update ────────────────────────────────────────────────────
export class InvestigationUpdateDto {
  @ApiProperty({ enum: FraudCaseStatus })
  @IsEnum(FraudCaseStatus)
  status: FraudCaseStatus;

  @ApiPropertyOptional({ description: 'Investigator notes' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  investigationNotes?: string;

  @ApiPropertyOptional({ description: 'Assigned investigator ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Reason if marking as false positive' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  falsePositiveReason?: string;

  @ApiPropertyOptional({ description: 'Resolved by (user ID)' })
  @IsOptional()
  @IsString()
  resolvedBy?: string;
}

// ─── SAR Report Query ────────────────────────────────────────────────────────
export class FraudReportQueryDto {
  @ApiPropertyOptional({ enum: FraudType })
  @IsOptional()
  @IsEnum(FraudType)
  fraudType?: FraudType;

  @ApiPropertyOptional({ enum: FraudSeverity })
  @IsOptional()
  @IsEnum(FraudSeverity)
  severity?: FraudSeverity;

  @ApiPropertyOptional({ enum: FraudCaseStatus })
  @IsOptional()
  @IsEnum(FraudCaseStatus)
  status?: FraudCaseStatus;

  @ApiPropertyOptional({ description: 'Filter by trader ID' })
  @IsOptional()
  @IsString()
  traderId?: string;

  @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Minimum ML score filter (0-1)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minMlScore?: number;

  @ApiPropertyOptional({ description: 'Filter regulatory reported only' })
  @IsOptional()
  @IsBoolean()
  regulatoryReported?: boolean;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────
export interface FraudAnalysisResult {
  caseId: string;
  tradeId: string;
  traderId: string;
  isSuspicious: boolean;
  mlScore: number;
  severity: FraudSeverity;
  fraudTypes: FraudType[];
  patternsMatched: PatternMatchResult[];
  evidence: EvidenceItem[];
  recommendedAction: string;
  processingTimeMs: number;
}

export interface PatternMatchResult {
  patternId: string;
  patternName: string;
  category: string;
  matched: boolean;
  confidence: number;
  evidence: string;
}

export interface EvidenceItem {
  type: string;
  description: string;
  value: unknown;
  timestamp: Date;
}

export interface PreTradeCheckResult {
  allowed: boolean;
  riskScore: number;
  reasons: string[];
  recommendedAction: 'allow' | 'block' | 'review';
}

export interface FraudMetrics {
  totalCases: number;
  openCases: number;
  resolvedCases: number;
  falsePositives: number;
  falsePositiveRate: number;
  detectionRate: number;
  preventedTrades: number;
  blockedValue: number;
  averageMlScore: number;
  casesByType: Record<string, number>;
  casesBySeverity: Record<string, number>;
  averageResolutionTimeHours: number;
}

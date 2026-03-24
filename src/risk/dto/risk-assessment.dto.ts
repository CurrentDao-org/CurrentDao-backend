import { IsString, IsNumber, IsOptional, IsObject, IsEnum, Min, Max, IsBoolean, IsArray } from 'class-validator';

export enum RiskType {
  MARKET = 'market',
  CREDIT = 'credit',
  OPERATIONAL = 'operational',
  LIQUIDITY = 'liquidity',
  REGULATORY = 'regulatory',
}

export enum RiskLevel {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export class RiskAssessmentDto {
  @IsString()
  portfolioId: string;

  @IsEnum(RiskType)
  riskType: RiskType;

  @IsNumber()
  @Min(0)
  @Max(100000000)
  portfolioValue: number;

  @IsOptional()
  @IsObject()
  marketData?: object;

  @IsOptional()
  @IsObject()
  historicalData?: object;

  @IsOptional()
  @IsString()
  assessmentNotes?: string;
}

export class RiskMonitoringDto {
  @IsString()
  portfolioId: string;

  @IsOptional()
  @IsNumber()
  @Min(0.95)
  @Max(0.99)
  varConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  timeHorizon?: number;

  @IsOptional()
  @IsBoolean()
  enableRealTimeAlerts?: boolean;
}

export class HedgingStrategyDto {
  @IsString()
  portfolioId: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  hedgeRatio: number;

  @IsString()
  instrument: string;

  @IsNumber()
  @Min(1)
  @Max(365)
  maturity: number;

  @IsOptional()
  @IsObject()
  customParameters?: object;
}

export class StressTestDto {
  @IsString()
  portfolioId: string;

  @IsArray()
  scenarios: string[];

  @IsOptional()
  @IsNumber()
  @Min(-100)
  @Max(100)
  shockMagnitude?: number;

  @IsOptional()
  @IsObject()
  customScenario?: object;
}

export class VarCalculationDto {
  @IsString()
  portfolioId: string;

  @IsNumber()
  @Min(0.95)
  @Max(0.99)
  confidence: number;

  @IsNumber()
  @Min(1)
  @Max(30)
  timeHorizon: number;

  @IsEnum(['historical', 'parametric', 'monte_carlo'])
  method: 'historical' | 'parametric' | 'monte_carlo';

  @IsOptional()
  @IsNumber()
  @Min(100)
  simulations?: number;
}

export class RiskReportDto {
  @IsString()
  portfolioId: string;

  @IsEnum(['daily', 'weekly', 'monthly', 'on_demand'])
  reportType: 'daily' | 'weekly' | 'monthly' | 'on_demand';

  @IsOptional()
  @IsArray()
  includeMetrics?: string[];

  @IsOptional()
  @IsString()
  format?: 'json' | 'pdf' | 'csv';
}

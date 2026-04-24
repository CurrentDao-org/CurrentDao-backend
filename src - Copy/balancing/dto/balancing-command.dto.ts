import { IsString, IsNumber, IsEnum, IsArray, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export enum BalancingCommandType {
  FORECAST_DEMAND = 'forecast_demand',
  ADJUST_SUPPLY = 'adjust_supply',
  MONITOR_STABILITY = 'monitor_stability',
  OPTIMIZE_PRICE = 'optimize_price',
  EMERGENCY_SHED = 'emergency_shed',
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class SupplyAdjustment {
  @IsString()
  sourceId: string;

  @IsNumber()
  @Min(-100)
  @Max(100)
  adjustmentPercentage: number;

  @IsNumber()
  @Min(0)
  duration: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DemandForecast {
  @IsString()
  regionId: string;

  @IsNumber()
  @Min(1)
  @Max(168)
  horizonHours: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  factors?: string[];
}

export class StabilityThreshold {
  @IsNumber()
  @Min(45)
  @Max(55)
  frequencyMin: number;

  @IsNumber()
  @Min(45)
  @Max(55)
  frequencyMax: number;

  @IsNumber()
  @Min(0.8)
  @Max(1.2)
  voltageMin: number;

  @IsNumber()
  @Min(0.8)
  @Max(1.2)
  voltageMax: number;
}

export class PriceOptimization {
  @IsString()
  marketId: string;

  @IsNumber()
  @Min(0.01)
  @Max(1000)
  targetPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  volatilityThreshold?: number;
}

export class EmergencyShed {
  @IsArray()
  @IsString({ each: true })
  priorityOrder: string[];

  @IsNumber()
  @Min(0)
  @Max(100)
  shedPercentage: number;

  @IsNumber()
  @Min(1)
  @Max(60)
  durationMinutes: number;
}

export class BalancingCommand {
  @IsString()
  commandId: string;

  @IsEnum(BalancingCommandType)
  type: BalancingCommandType;

  @IsEnum(Priority)
  priority: Priority;

  @IsString()
  regionId: string;

  @IsNumber()
  @Min(0)
  maxResponseTimeMs: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SupplyAdjustment)
  supplyAdjustment?: SupplyAdjustment;

  @IsOptional()
  @ValidateNested()
  @Type(() => DemandForecast)
  demandForecast?: DemandForecast;

  @IsOptional()
  @ValidateNested()
  @Type(() => StabilityThreshold)
  stabilityThreshold?: StabilityThreshold;

  @IsOptional()
  @ValidateNested()
  @Type(() => PriceOptimization)
  priceOptimization?: PriceOptimization;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyShed)
  emergencyShed?: EmergencyShed;

  @IsOptional()
  @IsString()
  correlationId?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}

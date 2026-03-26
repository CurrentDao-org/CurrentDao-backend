import { IsEnum, IsNumber, IsBoolean, IsOptional, IsArray, IsString, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum EnergyType {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  NUCLEAR = 'nuclear',
  FOSSIL = 'fossil',
  BIOMASS = 'biomass',
  GEOTHERMAL = 'geothermal',
}

export enum MatchingStrategy {
  PRICE_FIRST = 'price_first',
  PROXIMITY_FIRST = 'proximity_first',
  RENEWABLE_FIRST = 'renewable_first',
  BALANCED = 'balanced',
  CUSTOM = 'custom',
}

export enum GeographicScope {
  LOCAL = 'local',
  REGIONAL = 'regional',
  NATIONAL = 'national',
  INTERNATIONAL = 'international',
}

export class PricePreferences {
  @IsNumber()
  @Min(0)
  @Max(100)
  priceTolerance: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsBoolean()
  preferFixedPrice?: boolean;
}

export class GeographicPreferences {
  @IsEnum(GeographicScope)
  scope: GeographicScope;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDistance?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredRegions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedRegions?: string[];
}

export class RenewablePreferences {
  @IsBoolean()
  preferRenewable: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumRenewablePercentage?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(EnergyType, { each: true })
  preferredRenewableTypes?: EnergyType[];

  @IsOptional()
  @IsBoolean()
  allowMixed?: boolean;
}

export class QuantityPreferences {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumQuantity?: number;

  @IsOptional()
  @IsBoolean()
  allowPartialFulfillment?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  partialFulfillmentThreshold?: number;
}

export class TimePreferences {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  matchingWindowHours?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0)
  @Max(23)
  preferredHours?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(1)
  @Max(7)
  preferredDays?: number[];

  @IsOptional()
  @IsBoolean()
  allowImmediateMatching?: boolean;
}

export class QualityPreferences {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minimumReliabilityScore?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredSuppliers?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedSuppliers?: string[];

  @IsOptional()
  @IsBoolean()
  prioritizeVerifiedSuppliers?: boolean;
}

export class MatchingPreferencesDto {
  @IsEnum(MatchingStrategy)
  strategy: MatchingStrategy;

  @IsOptional()
  @ValidateNested()
  @Type(() => PricePreferences)
  price?: PricePreferences;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeographicPreferences)
  geographic?: GeographicPreferences;

  @IsOptional()
  @ValidateNested()
  @Type(() => RenewablePreferences)
  renewable?: RenewablePreferences;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuantityPreferences)
  quantity?: QuantityPreferences;

  @IsOptional()
  @ValidateNested()
  @Type(() => TimePreferences)
  time?: TimePreferences;

  @IsOptional()
  @ValidateNested()
  @Type(() => QualityPreferences)
  quality?: QualityPreferences;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customRules?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  priorityScore?: number;
}

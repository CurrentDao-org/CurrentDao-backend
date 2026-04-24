import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EnergyType {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  NUCLEAR = 'nuclear',
  FOSSIL = 'fossil',
  GEOTHERMAL = 'geothermal',
}

export class CalculatePriceDto {
  @IsNumber()
  @Min(0)
  supply: number;

  @IsNumber()
  @Min(0)
  demand: number;

  @IsString()
  location: string;

  @IsEnum(EnergyType)
  energyType: EnergyType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  timestamp?: number = Date.now();

  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includePrediction?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  predictionHorizonHours?: number = 1;
}

export class PriceHistoryQueryDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(EnergyType)
  energyType?: EnergyType;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  startDate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  endDate?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}

export class PricePredictionDto {
  @IsString()
  location: string;

  @IsEnum(EnergyType)
  energyType: EnergyType;

  @IsNumber()
  @Min(1)
  @Max(24)
  hoursAhead: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedSupply?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedDemand?: number;
}

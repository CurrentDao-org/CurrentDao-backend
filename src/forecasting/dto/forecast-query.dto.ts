import {
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ForecastHorizon } from '../entities/forecast-data.entity';

export class ForecastQueryDto {
  @IsString()
  marketType: string;

  @IsEnum(ForecastHorizon)
  forecastHorizon: ForecastHorizon;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  confidenceLevel?: number = 0.95;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  models?: string[];

  @IsNumber()
  @Min(1)
  @Max(1000)
  @IsOptional()
  ensembleSize?: number = 10;
}

export class HistoricalDataQueryDto {
  @IsString()
  marketType: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  limit?: number = 1000;
}

export class EnsembleConfigDto {
  @IsArray()
  @IsString({ each: true })
  models: string[];

  @IsArray()
  @Type(() => Number)
  weights?: number[];

  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  @IsOptional()
  diversityThreshold?: number = 0.7;

  @IsString()
  @IsOptional()
  @IsEnum(['weighted', 'majority', 'ranked'])
  votingMethod?: string = 'weighted';
}

export class WeatherIntegrationDto {
  @IsString()
  location: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  parameters?: string[] = [
    'temperature',
    'humidity',
    'windSpeed',
    'precipitation',
  ];
}

export class EconomicIndicatorDto {
  @IsArray()
  @IsString({ each: true })
  indicators: string[];

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  region?: string = 'global';
}

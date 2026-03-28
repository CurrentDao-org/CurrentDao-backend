import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { EmissionSource, UnitType } from '../entities/carbon-data.entity';

export class CarbonCalculationDto {
  @ApiProperty({ description: 'Emission source type' })
  @IsEnum(EmissionSource)
  source: EmissionSource;

  @ApiProperty({ description: 'Activity data (e.g., kWh consumed)' })
  @IsNumber()
  activityData: number;

  @ApiProperty({ description: 'Emission factor (kg CO2e per unit)', required: false })
  @IsOptional()
  @IsNumber()
  emissionFactor?: number;

  @ApiProperty({ description: 'Location/region', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: 'Associated asset ID', required: false })
  @IsOptional()
  @IsUUID()
  assetId?: string;
}

export class CarbonOffsetDto {
  @ApiProperty({ description: 'Amount of CO2 to offset in tonnes' })
  @IsNumber()
  amountTonnes: number;

  @ApiProperty({ description: 'Offset project type' })
  @IsString()
  projectType: string;

  @ApiProperty({ description: 'Project location', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

export class CarbonReportDto {
  @ApiProperty({ description: 'Total emissions in tonnes CO2e' })
  totalEmissions: number;

  @ApiProperty({ description: 'Breakdown by source' })
  bySource: Record<string, number>;

  @ApiProperty({ description: 'Top emitters' })
  topEmitters: any[];

  @ApiProperty({ description: 'Reduction vs previous period' })
  reductionPercent: number;

  @ApiProperty({ description: 'Carbon intensity' })
  carbonIntensity: number;
}

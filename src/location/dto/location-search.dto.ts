import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum LocationSearchSortBy {
  DISTANCE = 'distance',
  PRICE = 'price',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum LocationSearchSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class LocationSearchDto {
  @ApiPropertyOptional({
    description: 'Center latitude for location-based search',
    example: 40.7128,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Center longitude for location-based search',
    example: -74.006,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Search radius in kilometers',
    example: 10,
    minimum: 0.1,
    maximum: 1000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  @Max(1000)
  radiusKm?: number;

  @ApiPropertyOptional({
    description: 'Grid zone ID to filter by',
    example: 'zone-123',
  })
  @IsOptional()
  @IsString()
  gridZoneId?: string;

  @ApiPropertyOptional({
    description: 'Country to filter by',
    example: 'United States',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'State/region to filter by',
    example: 'California',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: 'City to filter by',
    example: 'New York',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: 'Minimum regional price multiplier',
    example: 0.8,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPriceMultiplier?: number;

  @ApiPropertyOptional({
    description: 'Maximum regional price multiplier',
    example: 1.5,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPriceMultiplier?: number;

  @ApiPropertyOptional({
    description: 'Filter by privacy setting',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({
    description: 'Sort results by field',
    enum: LocationSearchSortBy,
    default: LocationSearchSortBy.DISTANCE,
  })
  @IsOptional()
  @IsEnum(LocationSearchSortBy)
  sortBy?: LocationSearchSortBy = LocationSearchSortBy.DISTANCE;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: LocationSearchSortOrder,
    default: LocationSearchSortOrder.ASC,
  })
  @IsOptional()
  @IsEnum(LocationSearchSortOrder)
  sortOrder?: LocationSearchSortOrder = LocationSearchSortOrder.ASC;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of results per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class LocationHeatmapDto {
  @ApiPropertyOptional({
    description: 'Bounding box minimum latitude',
    example: 40.0,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat?: number;

  @ApiPropertyOptional({
    description: 'Bounding box maximum latitude',
    example: 41.0,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat?: number;

  @ApiPropertyOptional({
    description: 'Bounding box minimum longitude',
    example: -75.0,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLon?: number;

  @ApiPropertyOptional({
    description: 'Bounding box maximum longitude',
    example: -73.0,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLon?: number;

  @ApiPropertyOptional({
    description: 'Heatmap grid resolution (number of cells per side)',
    example: 50,
    minimum: 10,
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(10)
  @Max(200)
  resolution?: number = 50;
}

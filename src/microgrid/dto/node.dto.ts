import { IsString, IsNumber, IsEnum, IsOptional, IsObject, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNodeDto {
  @IsString()
  name: string;

  @IsEnum(['solar', 'wind', 'battery', 'generator', 'load'])
  type: 'solar' | 'wind' | 'battery' | 'generator' | 'load';

  @IsNumber()
  @Min(0)
  capacity: number;

  @IsNumber()
  @Min(0)
  currentOutput: number;

  @IsEnum(['online', 'offline', 'maintenance'])
  status: 'online' | 'offline' | 'maintenance';

  @IsObject()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateNodeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(['solar', 'wind', 'battery', 'generator', 'load'])
  type?: 'solar' | 'wind' | 'battery' | 'generator' | 'load';

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentOutput?: number;

  @IsOptional()
  @IsEnum(['online', 'offline', 'maintenance'])
  status?: 'online' | 'offline' | 'maintenance';

  @IsOptional()
  @IsObject()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

import { IsString, IsArray, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InferenceRequestDto {
  @ApiProperty({ description: 'Input data for prediction' })
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Request explanation', example: true })
  @IsBoolean()
  @IsOptional()
  explain?: boolean;

  @ApiPropertyOptional({ description: 'Request confidence scores', example: true })
  @IsBoolean()
  @IsOptional()
  includeConfidence?: boolean;

  @ApiPropertyOptional({ description: 'Request feature importance', example: false })
  @IsBoolean()
  @IsOptional()
  includeFeatureImportance?: boolean;

  @ApiPropertyOptional({ description: 'Prediction threshold', example: 0.5 })
  @IsNumber()
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional({ description: 'Batch predictions', example: false })
  @IsBoolean()
  @IsOptional()
  batch?: boolean;

  @ApiPropertyOptional({ description: 'Request ID', example: 'req_12345' })
  @IsString()
  @IsOptional()
  requestId?: string;

  @ApiPropertyOptional({ description: 'Additional parameters' })
  @IsOptional()
  parameters?: Record<string, any>;
}

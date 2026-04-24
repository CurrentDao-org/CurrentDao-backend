import { ApiProperty } from '@nestjs/swagger';
import {
  IsUUID,
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
} from 'class-validator';
import { RecommendationType } from '../entities/recommendation.entity';

export class CreateRecommendationDto {
  @ApiProperty({ description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Asset symbol', required: false })
  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @ApiProperty({ description: 'Recommendation type' })
  @IsEnum(RecommendationType)
  type: RecommendationType;

  @ApiProperty({ description: 'Target price', required: false })
  @IsOptional()
  @IsNumber()
  targetPrice?: number;

  @ApiProperty({ description: 'Stop loss', required: false })
  @IsOptional()
  @IsNumber()
  stopLoss?: number;
}

export class AcceptRecommendationDto {
  @ApiProperty({ description: 'Recommendation ID' })
  @IsUUID()
  recommendationId: string;
}

export class RecommendationResponseDto {
  @ApiProperty({ description: 'Recommendation ID' })
  id: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Recommendation type' })
  type: RecommendationType;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Reasoning' })
  reasoning: string;

  @ApiProperty({ description: 'Confidence score' })
  confidenceScore: number;

  @ApiProperty({ description: 'Asset symbol', required: false })
  assetSymbol?: string;

  @ApiProperty({ description: 'Target price', required: false })
  targetPrice?: number;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;
}

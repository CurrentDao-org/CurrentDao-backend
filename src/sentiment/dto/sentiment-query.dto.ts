import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { SentimentType, SourceType } from '../entities/sentiment-data.entity';

export class SentimentQueryDto {
  @ApiProperty({ description: 'Asset symbol to query', required: false })
  @IsOptional()
  @IsString()
  assetSymbol?: string;

  @ApiProperty({ description: 'Start date', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: 'End date', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Sentiment type filter',
    required: false,
    enum: SentimentType,
  })
  @IsOptional()
  @IsEnum(SentimentType)
  sentimentType?: SentimentType;

  @ApiProperty({
    description: 'Source type filter',
    required: false,
    enum: SourceType,
  })
  @IsOptional()
  @IsEnum(SourceType)
  sourceType?: SourceType;

  @ApiProperty({ description: 'Limit results', default: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number = 50;
}

export class SentimentResponseDto {
  @ApiProperty({ description: 'Overall sentiment score' })
  overallScore: number;

  @ApiProperty({ description: 'Sentiment trend' })
  trend: 'improving' | 'declining' | 'stable';

  @ApiProperty({ description: 'Total articles analyzed' })
  totalArticles: number;

  @ApiProperty({ description: 'Positive percentage' })
  positivePercent: number;

  @ApiProperty({ description: 'Negative percentage' })
  negativePercent: number;

  @ApiProperty({ description: 'Neutral percentage' })
  neutralPercent: number;

  @ApiProperty({ description: 'Trading signal' })
  tradingSignal: 'bullish' | 'bearish' | 'neutral';
}

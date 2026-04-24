import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { SentimentService } from './sentiment.service';
import { SentimentController } from './sentiment.controller';
import {
  SentimentDataEntity,
  NewsItemEntity,
  SocialMediaMentionEntity,
  TradingSignalEntity,
  SentimentMetricsEntity,
  SentimentHeatMapEntity,
  SentimentAlertEntity,
} from './entities/sentiment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SentimentDataEntity,
      NewsItemEntity,
      SocialMediaMentionEntity,
      TradingSignalEntity,
      SentimentMetricsEntity,
      SentimentHeatMapEntity,
      SentimentAlertEntity,
    ]),
    HttpModule,
  ],
  providers: [SentimentService],
  controllers: [SentimentController],
  exports: [SentimentService],
})
export class SentimentModule {}

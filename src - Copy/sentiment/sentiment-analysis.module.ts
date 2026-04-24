import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SentimentData } from './entities/sentiment-data.entity';
import { TextProcessorService } from './nlp/text-processor.service';
import { SocialMediaMonitorService } from './monitors/social-media.service';
import { NewsAggregatorService } from './aggregators/news-aggregator.service';
import { SentimentScorerService } from './algorithms/sentiment-scorer.service';
import { MarketCorrelationService } from './correlation/market-correlation.service';
import { SentimentController } from './sentiment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SentimentData])],
  controllers: [SentimentController],
  providers: [
    TextProcessorService,
    SocialMediaMonitorService,
    NewsAggregatorService,
    SentimentScorerService,
    MarketCorrelationService,
  ],
  exports: [
    TextProcessorService,
    SocialMediaMonitorService,
    NewsAggregatorService,
    SentimentScorerService,
    MarketCorrelationService,
  ],
})
export class SentimentAnalysisModule {}

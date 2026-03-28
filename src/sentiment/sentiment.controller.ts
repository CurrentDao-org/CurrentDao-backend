import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TextProcessorService } from './nlp/text-processor.service';
import { SocialMediaMonitorService } from './monitors/social-media.service';
import { NewsAggregatorService } from './aggregators/news-aggregator.service';
import { SentimentScorerService } from './algorithms/sentiment-scorer.service';
import { MarketCorrelationService } from './correlation/market-correlation.service';

@ApiTags('Sentiment Analysis')
@Controller('sentiment')
export class SentimentController {
  constructor(
    private readonly textProcessor: TextProcessorService,
    private readonly socialMonitor: SocialMediaMonitorService,
    private readonly newsAggregator: NewsAggregatorService,
    private readonly sentimentScorer: SentimentScorerService,
    private readonly marketCorrelation: MarketCorrelationService,
  ) {}

  @Get('analyze')
  @ApiOperation({ summary: 'Analyze sentiment of text' })
  async analyzeText(@Query('text') text: string): Promise<any> {
    const processed = await this.textProcessor.process(text);
    const sentiment = await this.sentimentScorer.calculateSentiment(text, processed);
    
    return {
      ...processed,
      ...sentiment,
      label: sentiment.score > 0.3 ? 'positive' : sentiment.score < -0.3 ? 'negative' : 'neutral',
    };
  }

  @Get('social/trending')
  @ApiOperation({ summary: 'Get trending topics on social media' })
  async getTrendingTopics(): Promise<string[]> {
    return this.socialMonitor.fetchTrendingTopics();
  }

  @Get('news/latest')
  @ApiOperation({ summary: 'Get latest energy news' })
  async getLatestNews(): Promise<any[]> {
    return this.newsAggregator.aggregateNews(['reuters', 'bloomberg']);
  }

  @Get('market/correlation')
  @ApiOperation({ summary: 'Get sentiment-market correlation analysis' })
  async getMarketCorrelation(): Promise<any> {
    const sentimentData = [{ sentimentScore: 0.6 }, { sentimentScore: 0.4 }];
    const marketData = [{ priceChange: 0.05 }, { priceChange: 0.03 }];
    
    return this.marketCorrelation.correlateSentimentWithMarket(sentimentData, marketData);
  }

  @Get('trading-signal')
  @ApiOperation({ summary: 'Generate trading signal based on sentiment' })
  async getTradingSignal(@Query('trend') trend: string): Promise<any> {
    const signal = await this.marketCorrelation.generateTradingSignal(trend, { volatility: 0.2 });
    return { signal, generatedAt: new Date() };
  }

  @Post('batch-analyze')
  @ApiOperation({ summary: 'Batch analyze multiple texts' })
  async batchAnalyze(@Body('texts') texts: string[]): Promise<any[]> {
    const results = [];
    for (const text of texts) {
      const processed = await this.textProcessor.process(text);
      const sentiment = await this.sentimentScorer.calculateSentiment(text, processed);
      results.push({ text: text.substring(0, 50) + '...', ...sentiment });
    }
    return results;
  }
}

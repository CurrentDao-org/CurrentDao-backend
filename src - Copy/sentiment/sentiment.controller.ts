import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SentimentService } from './sentiment.service';
import {
  CreateSentimentDto,
  QuerySentimentDto,
  AlertConfigDto,
  EnergyType,
  TradingSignalType,
} from './dto/sentiment.dto';

@ApiTags('sentiment')
@Controller('sentiment')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  /**
   * Get real-time sentiment data
   */
  @Get('data')
  @ApiOperation({ summary: 'Get real-time sentiment data with filtering options' })
  @ApiResponse({ status: 200, description: 'Sentiment data retrieved successfully' })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSentimentData(@Query() query: QuerySentimentDto) {
    return this.sentimentService.getSentimentData(query);
  }

  /**
   * Create sentiment record
   */
  @Post('')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new sentiment record' })
  @ApiResponse({ status: 201, description: 'Sentiment record created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createSentiment(@Body() dto: CreateSentimentDto) {
    return this.sentimentService.createSentiment(dto);
  }

  /**
   * Get aggregated news from multiple sources
   */
  @Get('news/aggregated')
  @ApiOperation({ summary: 'Get aggregated news from 50+ sources' })
  @ApiResponse({ status: 200, description: 'News aggregated successfully' })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAggregatedNews(
    @Query('energyType') energyType?: EnergyType,
    @Query('region') region?: string,
    @Query('limit') limit?: number,
  ) {
    return this.sentimentService.aggregateNews({
      energyType,
      region,
      limit,
    });
  }

  /**
   * Trigger news fetch and processing
   */
  @Post('news/fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch and process news from all sources' })
  @ApiResponse({ status: 200, description: 'News fetched and processed' })
  async fetchNews() {
    return this.sentimentService.fetchAndProcessNews();
  }

  /**
   * Get social media sentiment tracking
   */
  @Get('social-media')
  @ApiOperation({ summary: 'Get social media sentiment tracking data' })
  @ApiResponse({ status: 200, description: 'Social media data retrieved' })
  @ApiQuery({ name: 'platform', required: false })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSocialMediaTracking(
    @Query('platform') platform?: string,
    @Query('energyType') energyType?: EnergyType,
    @Query('limit') limit?: number,
  ) {
    return this.sentimentService.trackSocialMedia({
      platform,
      energyType,
      limit,
    });
  }

  /**
   * Trigger social media fetch
   */
  @Post('social-media/fetch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fetch and process social media mentions' })
  @ApiResponse({ status: 200, description: 'Social media data fetched' })
  async fetchSocialMedia() {
    return this.sentimentService.fetchAndProcessSocialMedia();
  }

  /**
   * Get sentiment-based trading signals
   */
  @Get('trading-signals')
  @ApiOperation({ summary: 'Get sentiment-based trading signals' })
  @ApiResponse({ status: 200, description: 'Trading signals retrieved' })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'region', required: false })
  async getTradingSignals(
    @Query('energyType') energyType?: EnergyType,
    @Query('region') region?: string,
  ) {
    return this.sentimentService.generateTradingSignals({
      energyType,
      region,
    });
  }

  /**
   * Get sentiment metrics
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get sentiment metrics and analytics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'region', required: false })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['hour', 'day', 'week', 'month', 'year'] })
  async getSentimentMetrics(
    @Query('energyType') energyType?: EnergyType,
    @Query('region') region?: string,
    @Query('timeRange') timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year',
  ) {
    return this.sentimentService.getSentimentMetrics({
      energyType,
      region,
      timeRange,
    });
  }

  /**
   * Get sentiment heat map data
   */
  @Get('heat-map')
  @ApiOperation({ summary: 'Get sentiment heat map data by region and energy type' })
  @ApiResponse({ status: 200, description: 'Heat map data retrieved' })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['hour', 'day', 'week', 'month'] })
  async getHeatMapData(
    @Query('energyType') energyType?: EnergyType,
    @Query('timeRange') timeRange?: 'hour' | 'day' | 'week' | 'month',
  ) {
    return this.sentimentService.getHeatMapData({
      energyType,
      timeRange,
    });
  }

  /**
   * Update heat maps
   */
  @Post('heat-map/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update heat map data' })
  @ApiResponse({ status: 200, description: 'Heat maps updated' })
  async updateHeatMaps() {
    await this.sentimentService.updateHeatMaps();
    return { status: 'success', message: 'Heat maps updated' };
  }

  /**
   * Create sentiment alert
   */
  @Post('alerts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create sentiment alert for user' })
  @ApiResponse({ status: 201, description: 'Alert created successfully' })
  async createAlert(@Body() dto: AlertConfigDto) {
    // In production, get userId from authentication context
    const userId = 'current-user-id';
    return this.sentimentService.createAlert(userId, dto);
  }

  /**
   * Get user alerts
   */
  @Get('alerts')
  @ApiOperation({ summary: 'Get all alerts for authenticated user' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getUserAlerts() {
    // In production, get userId from authentication context
    const userId = 'current-user-id';
    return this.sentimentService.getUserAlerts(userId);
  }

  /**
   * Update alert
   */
  @Put('alerts/:alertId')
  @ApiOperation({ summary: 'Update existing alert' })
  @ApiResponse({ status: 200, description: 'Alert updated successfully' })
  async updateAlert(@Param('alertId') alertId: string, @Body() dto: Partial<AlertConfigDto>) {
    return this.sentimentService.updateAlert(alertId, dto);
  }

  /**
   * Delete alert
   */
  @Delete('alerts/:alertId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete alert' })
  @ApiResponse({ status: 204, description: 'Alert deleted successfully' })
  async deleteAlert(@Param('alertId') alertId: string) {
    await this.sentimentService.deleteAlert(alertId);
  }

  /**
   * Get historical sentiment trends
   */
  @Get('trends')
  @ApiOperation({ summary: 'Get 1-year historical sentiment trends' })
  @ApiResponse({ status: 200, description: 'Trend data retrieved' })
  @ApiQuery({ name: 'energyType', required: false, enum: EnergyType })
  @ApiQuery({ name: 'region', required: false })
  async getHistoricalTrends(
    @Query('energyType') energyType?: EnergyType,
    @Query('region') region?: string,
  ) {
    const query: QuerySentimentDto = {
      energyType,
      region,
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      limit: 1000,
      sortBy: 'timestamp',
      sortOrder: 'ASC',
    };
    return this.sentimentService.getSentimentData(query);
  }

  /**
   * Get dashboard overview
   */
  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get sentiment dashboard overview with all key metrics' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved' })
  async getDashboardOverview() {
    return {
      metrics: await this.sentimentService.getSentimentMetrics({ timeRange: 'day' }),
      signals: await this.sentimentService.generateTradingSignals(),
      news: await this.sentimentService.aggregateNews({ limit: 20 }),
      socialMedia: await this.sentimentService.trackSocialMedia({ limit: 20 }),
      heatMaps: await this.sentimentService.getHeatMapData({ timeRange: 'day' }),
    };
  }

  /**
   * Health check
   */
  @Get('health')
  @ApiOperation({ summary: 'Check sentiment service health' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date(),
      service: 'SentimentService',
    };
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
    const sentiment = await this.sentimentScorer.calculateSentiment(
      text,
      processed,
    );

    return {
      ...processed,
      ...sentiment,
      label:
        sentiment.score > 0.3
          ? 'positive'
          : sentiment.score < -0.3
            ? 'negative'
            : 'neutral',
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

    return this.marketCorrelation.correlateSentimentWithMarket(
      sentimentData,
      marketData,
    );
  }

  @Get('trading-signal')
  @ApiOperation({ summary: 'Generate trading signal based on sentiment' })
  async getTradingSignal(@Query('trend') trend: string): Promise<any> {
    const signal = await this.marketCorrelation.generateTradingSignal(trend, {
      volatility: 0.2,
    });
    return { signal, generatedAt: new Date() };
  }

  @Post('batch-analyze')
  @ApiOperation({ summary: 'Batch analyze multiple texts' })
  async batchAnalyze(@Body('texts') texts: string[]): Promise<any[]> {
    const results = [];
    for (const text of texts) {
      const processed = await this.textProcessor.process(text);
      const sentiment = await this.sentimentScorer.calculateSentiment(
        text,
        processed,
      );
      results.push({ text: text.substring(0, 50) + '...', ...sentiment });
    }
    return results;
  }
}

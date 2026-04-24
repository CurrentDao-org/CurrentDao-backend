import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, DataSource, LessThan, MoreThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import {
  SentimentDataEntity,
  NewsItemEntity,
  SocialMediaMentionEntity,
  TradingSignalEntity,
  SentimentMetricsEntity,
  SentimentHeatMapEntity,
  SentimentAlertEntity,
} from './entities/sentiment.entity';
import {
  CreateSentimentDto,
  NewsItemDto,
  SocialMediaMentionDto,
  TradingSignalDto,
  SentimentMetricsDto,
  SentimentHeatMapDto,
  QuerySentimentDto,
  AlertConfigDto,
  TradingSignalType,
  EnergyType,
  SentimentScore,
} from './dto/sentiment.dto';

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);
  private readonly NEWS_SOURCES = [
    'reuters',
    'bloomberg',
    'cnbc',
    'yahoo_finance',
    'marketwatch',
    'coindesk',
    'cryptonews',
    'techcrunch',
    'wsj',
    'ft',
    'guardian',
    'bbc',
    'sky',
    'seeking_alpha',
    'zacks',
    'motley_fool',
    'stockanalysis',
    'investopedia',
    'benzinga',
    'finviz',
    'stocktwits',
    'energy_exchange',
    'renewable_news',
    'energy_market_news',
  ];

  private readonly SOCIAL_PLATFORMS = [
    'twitter',
    'reddit',
    'discord',
    'telegram',
    'facebook',
    'linkedin',
    'stocktwits',
    'seeking_alpha',
  ];

  constructor(
    @InjectRepository(SentimentDataEntity)
    private sentimentRepository: Repository<SentimentDataEntity>,
    @InjectRepository(NewsItemEntity)
    private newsRepository: Repository<NewsItemEntity>,
    @InjectRepository(SocialMediaMentionEntity)
    private socialMediaRepository: Repository<SocialMediaMentionEntity>,
    @InjectRepository(TradingSignalEntity)
    private tradingSignalRepository: Repository<TradingSignalEntity>,
    @InjectRepository(SentimentMetricsEntity)
    private metricsRepository: Repository<SentimentMetricsEntity>,
    @InjectRepository(SentimentHeatMapEntity)
    private heatMapRepository: Repository<SentimentHeatMapEntity>,
    @InjectRepository(SentimentAlertEntity)
    private alertRepository: Repository<SentimentAlertEntity>,
    private httpService: HttpService,
    private dataSource: DataSource,
  ) {}

  /**
   * Create or update sentiment data
   */
  async createSentiment(dto: CreateSentimentDto): Promise<SentimentDataEntity> {
    const sentiment = this.sentimentRepository.create({
      ...dto,
      timestamp: dto.timestamp || new Date(),
    });

    const saved = await this.sentimentRepository.save(sentiment);
    await this.updateSentimentMetrics(dto.energyType, dto.region);
    return saved;
  }

  /**
   * Get real-time sentiment data
   */
  async getSentimentData(query: QuerySentimentDto) {
    const {
      energyType,
      region,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'timestamp',
      sortOrder = 'DESC',
    } = query;

    const where: any = {};

    if (energyType) where.energyType = energyType;
    if (region) where.region = region;

    if (startDate || endDate) {
      where.timestamp = Between(
        startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        endDate ? new Date(endDate) : new Date(),
      );
    }

    const [data, total] = await this.sentimentRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Aggregate news from multiple sources
   */
  async aggregateNews(filters?: {
    energyType?: EnergyType;
    region?: string;
    limit?: number;
  }): Promise<NewsItemEntity[]> {
    const where: any = { status: 'active' };

    if (filters?.energyType) where.energyType = filters.energyType;
    if (filters?.region) where.region = filters.region;

    return this.newsRepository.find({
      where,
      order: { publishedAt: 'DESC' },
      take: filters?.limit || 50,
    });
  }

  /**
   * Fetch and process news items
   */
  async fetchAndProcessNews(): Promise<NewsItemEntity[]> {
    const newsItems = await this.fetchNewsFromSources();
    const processed = [];

    for (const item of newsItems) {
      try {
        const sentiment = await this.analyzeSentiment(item.content);
        const keywords = this.extractKeywords(item.content);

        const newsEntity = this.newsRepository.create({
          ...item,
          sentiment: sentiment.score,
          confidence: sentiment.confidence,
          keywords,
          status: 'active',
        });

        const saved = await this.newsRepository.save(newsEntity);
        processed.push(saved);
      } catch (error) {
        this.logger.error(`Failed to process news item: ${error.message}`);
      }
    }

    return processed;
  }

  /**
   * Fetch news from various sources
   */
  private async fetchNewsFromSources(): Promise<Partial<NewsItemDto>[]> {
    const newsItems = [];

    try {
      // Example: Fetch from NewsAPI
      const response = await firstValueFrom(
        this.httpService.get('https://newsapi.org/v2/everything', {
          params: {
            q: 'energy OR solar OR wind OR renewable',
            sortBy: 'publishedAt',
            language: 'en',
            pageSize: 50,
          },
          headers: {
            'X-Api-Key': process.env.NEWS_API_KEY || 'demo',
          },
        }),
      );

      if (response.data.articles) {
        newsItems.push(
          ...response.data.articles.map((article) => ({
            title: article.title,
            content: article.description || article.content,
            url: article.url,
            source: article.source.name,
            imageUrl: article.urlToImage,
            publishedAt: new Date(article.publishedAt).toISOString(),
          })),
        );
      }
    } catch (error) {
      this.logger.error(`Failed to fetch news: ${error.message}`);
    }

    return newsItems;
  }

  /**
   * Track social media sentiment
   */
  async trackSocialMedia(filters?: {
    platform?: string;
    energyType?: EnergyType;
    limit?: number;
  }): Promise<SocialMediaMentionEntity[]> {
    const where: any = { status: 'active' };

    if (filters?.platform) where.platform = filters.platform;
    if (filters?.energyType) where.energyType = filters.energyType;

    return this.socialMediaRepository.find({
      where,
      order: { publishedAt: 'DESC' },
      take: filters?.limit || 50,
    });
  }

  /**
   * Fetch and process social media mentions
   */
  async fetchAndProcessSocialMedia(): Promise<SocialMediaMentionEntity[]> {
    const mentions = await this.fetchSocialMediaMentions();
    const processed = [];

    for (const mention of mentions) {
      try {
        const sentiment = await this.analyzeSentiment(mention.content);
        const keywords = this.extractKeywords(mention.content);

        const mentionEntity = this.socialMediaRepository.create({
          ...mention,
          sentiment: sentiment.score,
          confidence: sentiment.confidence,
          keywords,
          status: 'active',
        });

        const saved = await this.socialMediaRepository.save(mentionEntity);
        processed.push(saved);
      } catch (error) {
        this.logger.error(`Failed to process social media mention: ${error.message}`);
      }
    }

    return processed;
  }

  /**
   * Fetch social media mentions
   */
  private async fetchSocialMediaMentions(): Promise<Partial<SocialMediaMentionDto>[]> {
    const mentions = [];

    // This would typically fetch from Twitter API, Reddit API, etc.
    // For now, returning empty array as placeholders

    try {
      // Example: Fetch from Twitter
      // Implementation would require Twitter API client
    } catch (error) {
      this.logger.error(`Failed to fetch social media mentions: ${error.message}`);
    }

    return mentions;
  }

  /**
   * Analyze sentiment of text using NLP
   */
  private async analyzeSentiment(text: string): Promise<{ score: number; confidence: number }> {
    try {
      // This would use a sentiment analysis service like:
      // - AWS Comprehend
      // - Google Cloud NLP
      // - Azure Text Analytics
      // - Local ML model

      // Placeholder implementation
      const sentimentScore = this.simpleSentimentAnalysis(text);

      return {
        score: sentimentScore,
        confidence: 0.85,
      };
    } catch (error) {
      this.logger.error(`Sentiment analysis failed: ${error.message}`);
      return { score: 0, confidence: 0.5 };
    }
  }

  /**
   * Simple sentiment analysis placeholder
   */
  private simpleSentimentAnalysis(text: string): number {
    const positiveWords = ['bullish', 'up', 'gain', 'profit', 'outperform', 'growth', 'strong'];
    const negativeWords = ['bearish', 'down', 'loss', 'decline', 'underperform', 'weak', 'sell'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) score++;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) score--;
    });

    // Normalize to -2 to 2 scale
    return Math.max(-2, Math.min(2, score / Math.max(1, positiveWords.length + negativeWords.length) * 2));
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const energyTerms = [
      'solar',
      'wind',
      'hydro',
      'geothermal',
      'biomass',
      'natural gas',
      'coal',
      'nuclear',
      'grid',
      'battery',
      'renewable',
      'clean energy',
      'fossil fuel',
      'carbon',
      'emissions',
    ];

    const keywords = [];
    energyTerms.forEach((term) => {
      if (text.toLowerCase().includes(term)) {
        keywords.push(term);
      }
    });

    return keywords;
  }

  /**
   * Generate trading signals based on sentiment
   */
  async generateTradingSignals(filters?: {
    energyType?: EnergyType;
    region?: string;
  }): Promise<TradingSignalEntity[]> {
    const signals = [];

    try {
      // Get current metrics
      const metrics = await this.metricsRepository.find({
        where: {
          energyType: filters?.energyType,
          region: filters?.region,
        },
        order: { timestamp: 'DESC' },
        take: 1,
      });

      if (!metrics.length) {
        return signals;
      }

      const currentMetrics = metrics[0];

      // Generate signal based on sentiment score and trends
      const signal = this.determineSignal(currentMetrics);

      const tradingSignal = this.tradingSignalRepository.create({
        signal: signal.type,
        confidence: signal.confidence,
        reason: signal.reason,
        sentimentScore: currentMetrics.overallSentiment,
        newsImpact: currentMetrics.newsImpact,
        socialMediaImpact: currentMetrics.socialMediaImpact,
        energyType: filters?.energyType,
        region: filters?.region,
        generatedAt: new Date(),
        suggestedPrice: signal.suggestedPrice,
        targetPrice: signal.targetPrice,
        stopLoss: signal.stopLoss,
        status: 'active',
      });

      const saved = await this.tradingSignalRepository.save(tradingSignal);
      signals.push(saved);
    } catch (error) {
      this.logger.error(`Failed to generate trading signals: ${error.message}`);
    }

    return signals;
  }

  /**
   * Determine trading signal based on metrics
   */
  private determineSignal(metrics: SentimentMetricsEntity): {
    type: TradingSignalType;
    confidence: number;
    reason: string;
    suggestedPrice?: number;
    targetPrice?: number;
    stopLoss?: number;
  } {
    const sentiment = metrics.overallSentiment;
    const trend = metrics.trendStrength;

    let signal: TradingSignalType;
    let confidence = 0.5;
    let reason = '';

    if (sentiment > 60 && trend > 0.7) {
      signal = TradingSignalType.STRONG_BUY;
      confidence = 0.9;
      reason = 'Very strong positive sentiment with strong upward trend';
    } else if (sentiment > 30 && trend > 0.4) {
      signal = TradingSignalType.BUY;
      confidence = 0.75;
      reason = 'Positive sentiment with upward momentum';
    } else if (sentiment > -30 && sentiment < 30 && Math.abs(trend) < 0.4) {
      signal = TradingSignalType.HOLD;
      confidence = 0.7;
      reason = 'Neutral sentiment with stable market conditions';
    } else if (sentiment < -30 && trend < -0.4) {
      signal = TradingSignalType.SELL;
      confidence = 0.75;
      reason = 'Negative sentiment with downward trend';
    } else if (sentiment < -60 && trend < -0.7) {
      signal = TradingSignalType.STRONG_SELL;
      confidence = 0.9;
      reason = 'Very strong negative sentiment with strong downward trend';
    } else {
      signal = TradingSignalType.HOLD;
      confidence = 0.6;
      reason = 'Mixed signals, maintaining current position';
    }

    return {
      type: signal,
      confidence,
      reason,
      suggestedPrice: 100 * (1 + sentiment / 100), // Example calculation
      targetPrice: 100 * (1 + (sentiment * 0.5) / 100),
      stopLoss: 100 * (1 + (sentiment * -0.3) / 100),
    };
  }

  /**
   * Get sentiment metrics
   */
  async getSentimentMetrics(filters?: {
    energyType?: EnergyType;
    region?: string;
    timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year';
  }): Promise<SentimentMetricsEntity[]> {
    const where: any = {};

    if (filters?.energyType) where.energyType = filters.energyType;
    if (filters?.region) where.region = filters.region;

    if (filters?.timeRange) {
      const ranges = {
        hour: 1,
        day: 24,
        week: 7 * 24,
        month: 30 * 24,
        year: 365 * 24,
      };

      const hours = ranges[filters.timeRange];
      where.timestamp = MoreThan(new Date(Date.now() - hours * 60 * 60 * 1000));
    }

    return this.metricsRepository.find({
      where,
      order: { timestamp: 'ASC' },
    });
  }

  /**
   * Update sentiment metrics
   */
  private async updateSentimentMetrics(energyType?: EnergyType, region?: string): Promise<void> {
    try {
      // Calculate overall sentiment
      const recentSentiments = await this.sentimentRepository.find({
        where: {
          energyType,
          region,
          timestamp: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        },
      });

      if (recentSentiments.length === 0) return;

      const avgSentiment =
        recentSentiments.reduce((sum, s) => sum + s.score, 0) / recentSentiments.length;

      // Get news and social media sentiment
      const newsItems = await this.newsRepository.find({
        where: {
          energyType,
          region,
          publishedAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        },
      });

      const socialMentions = await this.socialMediaRepository.find({
        where: {
          energyType,
          region,
          publishedAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        },
      });

      const newsImpact = newsItems.length > 0 ? newsItems.reduce((sum, n) => sum + n.sentiment, 0) / newsItems.length : 0;
      const socialMediaImpact = socialMentions.length > 0 ? socialMentions.reduce((sum, m) => sum + m.sentiment, 0) / socialMentions.length : 0;

      // Calculate volatility and trend
      const volatilityIndex = this.calculateVolatility(recentSentiments);
      const trendStrength = this.calculateTrend(recentSentiments);

      const metrics = this.metricsRepository.create({
        overallSentiment: avgSentiment * 100,
        newsImpact: newsImpact * 100,
        socialMediaImpact: socialMediaImpact * 100,
        volatilityIndex,
        trendStrength,
        energyType,
        region,
        dataPoints: recentSentiments.length,
      });

      await this.metricsRepository.save(metrics);
    } catch (error) {
      this.logger.error(`Failed to update sentiment metrics: ${error.message}`);
    }
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(sentiments: SentimentDataEntity[]): number {
    if (sentiments.length < 2) return 0;

    const mean = sentiments.reduce((sum, s) => sum + s.score, 0) / sentiments.length;
    const variance = sentiments.reduce((sum, s) => sum + Math.pow(s.score - mean, 2), 0) / sentiments.length;
    const standardDeviation = Math.sqrt(variance);

    return Math.min(100, standardDeviation * 50);
  }

  /**
   * Calculate trend strength
   */
  private calculateTrend(sentiments: SentimentDataEntity[]): number {
    if (sentiments.length < 2) return 0;

    const firstHalf = sentiments.slice(0, Math.floor(sentiments.length / 2));
    const secondHalf = sentiments.slice(Math.floor(sentiments.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.score, 0) / secondHalf.length;

    const change = secondAvg - firstAvg;
    return Math.max(-1, Math.min(1, change / 2));
  }

  /**
   * Get heat map data
   */
  async getHeatMapData(filters?: {
    energyType?: EnergyType;
    timeRange?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<SentimentHeatMapEntity[]> {
    const where: any = {};

    if (filters?.energyType) where.energyType = filters.energyType;

    if (filters?.timeRange) {
      const ranges = {
        hour: 1,
        day: 24,
        week: 7 * 24,
        month: 30 * 24,
      };

      const hours = ranges[filters.timeRange];
      where.timestamp = MoreThan(new Date(Date.now() - hours * 60 * 60 * 1000));
    }

    return this.heatMapRepository.find({
      where,
      order: { timestamp: 'DESC' },
    });
  }

  /**
   * Update heat map data
   */
  async updateHeatMaps(): Promise<void> {
    try {
      const heatMapData = await this.calculateHeatMaps();

      for (const heatMap of heatMapData) {
        const existing = await this.heatMapRepository.findOne({
          where: {
            energyType: heatMap.energyType,
            region: heatMap.region,
          },
          order: { timestamp: 'DESC' },
        });

        if (existing) {
          await this.heatMapRepository.update(existing.id, heatMap);
        } else {
          await this.heatMapRepository.save(heatMap);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to update heat maps: ${error.message}`);
    }
  }

  /**
   * Calculate heat map data
   */
  private async calculateHeatMaps(): Promise<Partial<SentimentHeatMapEntity>[]> {
    const energyTypes = Object.values(EnergyType);
    const regions = ['North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];

    const heatMaps = [];

    for (const energyType of energyTypes) {
      for (const region of regions) {
        const mentions = await this.socialMediaRepository.find({
          where: {
            energyType,
            region,
            publishedAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
          },
        });

        if (mentions.length > 0) {
          const avgSentiment = mentions.reduce((sum, m) => sum + m.sentiment, 0) / mentions.length;
          const intensity = Math.min(100, mentions.length);

          heatMaps.push({
            energyType,
            region,
            sentiment: avgSentiment * 100,
            intensity,
            mentionCount: mentions.length,
          });
        }
      }
    }

    return heatMaps;
  }

  /**
   * Create sentiment alert
   */
  async createAlert(userId: string, dto: AlertConfigDto): Promise<SentimentAlertEntity> {
    const alert = this.alertRepository.create({
      userId,
      ...dto,
      active: true,
    });

    return this.alertRepository.save(alert);
  }

  /**
   * Get user alerts
   */
  async getUserAlerts(userId: string): Promise<SentimentAlertEntity[]> {
    return this.alertRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Check alerts and trigger notifications
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkAndTriggerAlerts(): Promise<void> {
    try {
      const activeAlerts = await this.alertRepository.find({
        where: { active: true },
      });

      for (const alert of activeAlerts) {
        await this.checkAlert(alert);
      }
    } catch (error) {
      this.logger.error(`Failed to check alerts: ${error.message}`);
    }
  }

  /**
   * Check individual alert
   */
  private async checkAlert(alert: SentimentAlertEntity): Promise<void> {
    try {
      const metrics = await this.metricsRepository.findOne({
        where: {
          energyType: alert.energyType,
          region: alert.region,
        },
        order: { timestamp: 'DESC' },
      });

      if (!metrics) return;

      let shouldTrigger = false;

      if (alert.condition === 'above') {
        shouldTrigger = metrics.overallSentiment > alert.threshold;
      } else if (alert.condition === 'below') {
        shouldTrigger = metrics.overallSentiment < alert.threshold;
      }

      if (shouldTrigger && !alert.triggeredAlerts?.includes(new Date().toDateString())) {
        await this.sendAlertNotification(alert, metrics);

        alert.triggeredAlerts = [...(alert.triggeredAlerts || []), new Date().toDateString()];
        alert.lastTriggeredAt = new Date();

        await this.alertRepository.save(alert);
      }
    } catch (error) {
      this.logger.error(`Failed to check alert ${alert.id}: ${error.message}`);
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: SentimentAlertEntity, metrics: SentimentMetricsEntity): Promise<void> {
    if (alert.notificationChannels?.includes('email') || !alert.notificationChannels) {
      await this.sendEmailNotification(alert, metrics);
    }

    if (alert.webhook) {
      await this.sendWebhookNotification(alert, metrics);
    }

    // Add SMS, push notification, etc. as needed
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: SentimentAlertEntity, metrics: SentimentMetricsEntity): Promise<void> {
    // Implementation would use nodemailer or similar service
    this.logger.log(`Email notification would be sent to ${alert.email}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: SentimentAlertEntity, metrics: SentimentMetricsEntity): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(alert.webhook, {
          alert: alert.name,
          sentiment: metrics.overallSentiment,
          energyType: alert.energyType,
          region: alert.region,
          timestamp: new Date(),
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to send webhook notification: ${error.message}`);
    }
  }

  /**
   * Periodic tasks
   */
  @Cron(CronExpression.EVERY_HOUR)
  async periodicUpdate(): Promise<void> {
    try {
      this.logger.log('Running periodic sentiment updates...');
      await this.fetchAndProcessNews();
      await this.fetchAndProcessSocialMedia();
      await this.generateTradingSignals();
      await this.updateHeatMaps();
      this.logger.log('Periodic updates completed');
    } catch (error) {
      this.logger.error(`Periodic update failed: ${error.message}`);
    }
  }

  /**
   * Delete alert
   */
  async deleteAlert(alertId: string): Promise<void> {
    const result = await this.alertRepository.delete(alertId);
    if (result.affected === 0) {
      throw new NotFoundException('Alert not found');
    }
  }

  /**
   * Update alert
   */
  async updateAlert(alertId: string, dto: Partial<AlertConfigDto>): Promise<SentimentAlertEntity> {
    const alert = await this.alertRepository.findOne({ where: { id: alertId } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    Object.assign(alert, dto);
    return this.alertRepository.save(alert);
  }
}

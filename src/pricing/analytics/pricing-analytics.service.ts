import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as mlRegression from 'ml-regression';
import * as simpleStatistics from 'simple-statistics';

export interface PricingAnalytics {
  timestamp: Date;
  totalTransactions: number;
  averagePrice: number;
  priceVolatility: number;
  priceTrend: 'increasing' | 'decreasing' | 'stable';
  marketEfficiency: number;
  liquidityScore: number;
  priceElasticity: number;
  seasonalPatterns: SeasonalPattern[];
  geographicVariations: GeographicVariation[];
  timeBasedPatterns: TimeBasedPattern[];
  predictionAccuracy: number;
  confidence: number;
}

export interface SeasonalPattern {
  season: string;
  avgPrice: number;
  priceChange: number;
  volume: number;
  confidence: number;
}

export interface GeographicVariation {
  location: string;
  avgPrice: number;
  priceIndex: number;
  marketShare: number;
  competitiveness: number;
}

export interface TimeBasedPattern {
  hour: number;
  avgPrice: number;
  volume: number;
  isPeakHour: boolean;
  priceMultiplier: number;
}

export interface PriceAnomaly {
  timestamp: Date;
  price: number;
  expectedPrice: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  cause?: string;
}

export interface MarketInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  actionable: boolean;
  recommendation?: string;
}

@Injectable()
export class PricingAnalyticsService {
  private readonly logger = new Logger(PricingAnalyticsService.name);
  private readonly TARGET_ACCURACY = 95; // 95% accuracy requirement
  private analyticsCache: Map<string, PricingAnalytics> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async generatePricingAnalytics(
    location?: string,
    energyType?: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<PricingAnalytics> {
    const cacheKey = `${location || 'all'}-${energyType || 'all'}-${timeRange?.start.getTime() || 'all'}`;
    
    // Check cache first
    const cached = this.analyticsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp.getTime()) < this.CACHE_TTL) {
      return cached;
    }

    const startTime = Date.now();
    
    // Fetch historical data
    const historicalData = await this.fetchHistoricalData(location, energyType, timeRange);
    
    if (historicalData.length === 0) {
      return this.getDefaultAnalytics();
    }

    // Generate comprehensive analytics
    const analytics: PricingAnalytics = {
      timestamp: new Date(),
      totalTransactions: historicalData.length,
      averagePrice: this.calculateAveragePrice(historicalData),
      priceVolatility: this.calculateVolatility(historicalData),
      priceTrend: this.analyzePriceTrend(historicalData),
      marketEfficiency: this.calculateMarketEfficiency(historicalData),
      liquidityScore: this.calculateLiquidityScore(historicalData),
      priceElasticity: this.calculatePriceElasticity(historicalData),
      seasonalPatterns: await this.analyzeSeasonalPatterns(historicalData),
      geographicVariations: await this.analyzeGeographicVariations(historicalData),
      timeBasedPatterns: this.analyzeTimeBasedPatterns(historicalData),
      predictionAccuracy: await this.calculatePredictionAccuracy(historicalData),
      confidence: this.calculateOverallConfidence(historicalData),
    };

    // Cache the results
    this.analyticsCache.set(cacheKey, analytics);

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Generated pricing analytics in ${processingTime}ms with ${analytics.confidence}% confidence`,
    );

    return analytics;
  }

  private async fetchHistoricalData(
    location?: string,
    energyType?: string,
    timeRange?: { start: Date; end: Date },
  ): Promise<PriceHistory[]> {
    const whereClause: any = {};
    
    if (location) whereClause.location = location;
    if (energyType) whereClause.energyType = energyType;
    if (timeRange) {
      whereClause.timestamp = Between(timeRange.start, timeRange.end);
    }

    return this.priceHistoryRepository.find({
      where: whereClause,
      order: { timestamp: 'ASC' },
      take: 10000, // Limit for performance
    });
  }

  private calculateAveragePrice(data: PriceHistory[]): number {
    if (data.length === 0) return 0;
    
    const prices = data.map(d => d.finalPrice);
    return simpleStatistics.mean(prices);
  }

  private calculateVolatility(data: PriceHistory[]): number {
    if (data.length < 2) return 0;
    
    const prices = data.map(d => d.finalPrice);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    return simpleStatistics.standardDeviation(returns) * Math.sqrt(252); // Annualized volatility
  }

  private analyzePriceTrend(data: PriceHistory[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 10) return 'stable';
    
    const prices = data.map(d => d.finalPrice);
    const x = data.map((_, i) => i);
    
    // Linear regression to determine trend
    const regression = new mlRegression.SimpleLinearRegression(x, prices);
    const slope = regression.slope;
    
    // Determine trend based on slope significance
    const avgPrice = simpleStatistics.mean(prices);
    const slopePercent = (slope / avgPrice) * 100;
    
    if (slopePercent > 0.5) return 'increasing';
    if (slopePercent < -0.5) return 'decreasing';
    return 'stable';
  }

  private calculateMarketEfficiency(data: PriceHistory[]): number {
    if (data.length < 2) return 0;
    
    // Calculate bid-ask spread efficiency
    let totalSpread = 0;
    let count = 0;
    
    for (const record of data) {
      // Estimate spread from price volatility
      const estimatedSpread = record.finalPrice * 0.002; // 0.2% typical spread
      totalSpread += estimatedSpread;
      count++;
    }
    
    const avgSpread = totalSpread / count;
    const avgPrice = this.calculateAveragePrice(data);
    
    // Efficiency is inversely related to spread
    const spreadRatio = avgSpread / avgPrice;
    return Math.max(0, Math.min(100, (1 - spreadRatio * 10) * 100));
  }

  private calculateLiquidityScore(data: PriceHistory[]): number {
    if (data.length === 0) return 0;
    
    // Calculate liquidity based on volume and price stability
    const volumes = data.map(d => d.supply + d.demand);
    const avgVolume = simpleStatistics.mean(volumes);
    const volumeStdDev = simpleStatistics.standardDeviation(volumes);
    
    // Higher and more stable volumes = better liquidity
    const volumeScore = Math.min(100, avgVolume / 1000); // Normalize to 0-100
    const stabilityScore = Math.max(0, 100 - (volumeStdDev / avgVolume) * 100);
    
    return (volumeScore + stabilityScore) / 2;
  }

  private calculatePriceElasticity(data: PriceHistory[]): number {
    if (data.length < 10) return 0.5; // Default elasticity
    
    // Calculate price elasticity from supply-demand changes
    const elasticityData = [];
    
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1];
      const curr = data[i];
      
      const priceChange = (curr.finalPrice - prev.finalPrice) / prev.finalPrice;
      const quantityChange = ((curr.supply + curr.demand) - (prev.supply + prev.demand)) / (prev.supply + prev.demand);
      
      if (Math.abs(priceChange) > 0.001) {
        elasticityData.push(quantityChange / priceChange);
      }
    }
    
    if (elasticityData.length === 0) return 0.5;
    
    return simpleStatistics.mean(elasticityData.map(Math.abs));
  }

  private async analyzeSeasonalPatterns(data: PriceHistory[]): Promise<SeasonalPattern[]> {
    const seasons = ['winter', 'spring', 'summer', 'autumn'];
    const patterns: SeasonalPattern[] = [];
    
    for (const season of seasons) {
      const seasonData = data.filter(record => {
        const month = record.timestamp.getMonth();
        return this.getSeason(month) === season;
      });
      
      if (seasonData.length > 0) {
        const avgPrice = this.calculateAveragePrice(seasonData);
        const totalVolume = seasonData.reduce((sum, d) => sum + d.supply + d.demand, 0);
        
        patterns.push({
          season,
          avgPrice,
          priceChange: this.calculateSeasonalPriceChange(season, data),
          volume: totalVolume,
          confidence: Math.min(95, (seasonData.length / data.length) * 100),
        });
      }
    }
    
    return patterns;
  }

  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private calculateSeasonalPriceChange(season: string, allData: PriceHistory[]): number {
    const seasonData = allData.filter(record => {
      const month = record.timestamp.getMonth();
      return this.getSeason(month) === season;
    });
    
    const otherSeasonsData = allData.filter(record => {
      const month = record.timestamp.getMonth();
      return this.getSeason(month) !== season;
    });
    
    if (seasonData.length === 0 || otherSeasonsData.length === 0) return 0;
    
    const seasonAvg = this.calculateAveragePrice(seasonData);
    const otherAvg = this.calculateAveragePrice(otherSeasonsData);
    
    return ((seasonAvg - otherAvg) / otherAvg) * 100;
  }

  private async analyzeGeographicVariations(data: PriceHistory[]): Promise<GeographicVariation[]> {
    const locationGroups = new Map<string, PriceHistory[]>();
    
    // Group by location
    for (const record of data) {
      if (!locationGroups.has(record.location)) {
        locationGroups.set(record.location, []);
      }
      locationGroups.get(record.location)!.push(record);
    }
    
    const overallAvg = this.calculateAveragePrice(data);
    const variations: GeographicVariation[] = [];
    
    for (const [location, locationData] of locationGroups.entries()) {
      const avgPrice = this.calculateAveragePrice(locationData);
      const priceIndex = (avgPrice / overallAvg) * 100;
      const volume = locationData.reduce((sum, d) => sum + d.supply + d.demand, 0);
      const totalVolume = data.reduce((sum, d) => sum + d.supply + d.demand, 0);
      
      variations.push({
        location,
        avgPrice,
        priceIndex,
        marketShare: (volume / totalVolume) * 100,
        competitiveness: this.calculateCompetitiveness(locationData),
      });
    }
    
    return variations.sort((a, b) => b.marketShare - a.marketShare);
  }

  private calculateCompetitiveness(locationData: PriceHistory[]): number {
    if (locationData.length < 2) return 50;
    
    // Higher competition = lower price volatility and more volume
    const volatility = this.calculateVolatility(locationData);
    const avgVolume = locationData.reduce((sum, d) => sum + d.supply + d.demand, 0) / locationData.length;
    
    const competitionScore = Math.max(0, 100 - volatility * 10) + Math.min(50, avgVolume / 100);
    return Math.min(100, competitionScore);
  }

  private analyzeTimeBasedPatterns(data: PriceHistory[]): TimeBasedPattern[] {
    const hourlyData = new Map<number, PriceHistory[]>();
    
    // Group by hour
    for (const record of data) {
      const hour = record.timestamp.getHours();
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, []);
      }
      hourlyData.get(hour)!.push(record);
    }
    
    const patterns: TimeBasedPattern[] = [];
    const overallAvg = this.calculateAveragePrice(data);
    
    for (let hour = 0; hour < 24; hour++) {
      const hourData = hourlyData.get(hour) || [];
      
      if (hourData.length > 0) {
        const avgPrice = this.calculateAveragePrice(hourData);
        const volume = hourData.reduce((sum, d) => sum + d.supply + d.demand, 0);
        const isPeakHour = this.isPeakHour(hour);
        const priceMultiplier = avgPrice / overallAvg;
        
        patterns.push({
          hour,
          avgPrice,
          volume,
          isPeakHour,
          priceMultiplier,
        });
      }
    }
    
    return patterns;
  }

  private isPeakHour(hour: number): boolean {
    return (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 21);
  }

  private async calculatePredictionAccuracy(data: PriceHistory[]): Promise<number> {
    // Calculate prediction accuracy by comparing predicted vs actual prices
    const predictionsWithAccuracy = data.filter(d => d.predictionAccuracy !== null);
    
    if (predictionsWithAccuracy.length === 0) return 0;
    
    const accuracies = predictionsWithAccuracy.map(d => d.predictionAccuracy!);
    return simpleStatistics.mean(accuracies);
  }

  private calculateOverallConfidence(data: PriceHistory[]): number {
    if (data.length === 0) return 0;
    
    let confidence = 50; // Base confidence
    
    // More data = higher confidence
    if (data.length > 100) confidence += 20;
    if (data.length > 1000) confidence += 20;
    
    // Recent data = higher confidence
    const recentData = data.filter(d => 
      (Date.now() - d.timestamp.getTime()) < 7 * 24 * 60 * 60 * 1000
    );
    if (recentData.length > data.length * 0.5) confidence += 10;
    
    return Math.min(95, confidence);
  }

  async detectPriceAnomalies(
    location?: string,
    energyType?: string,
  ): Promise<PriceAnomaly[]> {
    const data = await this.fetchHistoricalData(location, energyType);
    if (data.length < 10) return [];
    
    const anomalies: PriceAnomaly[] = [];
    const prices = data.map(d => d.finalPrice);
    const mean = simpleStatistics.mean(prices);
    const stdDev = simpleStatistics.standardDeviation(prices);
    
    for (const record of data) {
      const deviation = Math.abs(record.finalPrice - mean) / stdDev;
      
      if (deviation > 2) { // 2 standard deviations threshold
        anomalies.push({
          timestamp: record.timestamp,
          price: record.finalPrice,
          expectedPrice: mean,
          deviation,
          severity: deviation > 3 ? 'high' : deviation > 2.5 ? 'medium' : 'low',
          cause: this.identifyAnomalyCause(record, data),
        });
      }
    }
    
    return anomalies.sort((a, b) => b.deviation - a.deviation);
  }

  private identifyAnomalyCause(record: PriceHistory, allData: PriceHistory[]): string {
    const supplyDemandRatio = record.supply / record.demand;
    
    if (supplyDemandRatio < 0.5) return 'High demand, low supply';
    if (supplyDemandRatio > 2) return 'Low demand, high supply';
    if (record.isPeakHour) return 'Peak hour pricing';
    if (record.isRenewable) return 'Renewable energy premium';
    
    return 'Market volatility';
  }

  async generateMarketInsights(
    location?: string,
    energyType?: string,
  ): Promise<MarketInsight[]> {
    const analytics = await this.generatePricingAnalytics(location, energyType);
    const anomalies = await this.detectPriceAnomalies(location, energyType);
    
    const insights: MarketInsight[] = [];
    
    // Trend insights
    if (analytics.priceTrend !== 'stable') {
      insights.push({
        type: 'trend',
        title: `Price trend: ${analytics.priceTrend}`,
        description: `Market prices are showing a ${analytics.priceTrend} trend with ${analytics.confidence}% confidence`,
        impact: analytics.priceTrend === 'increasing' ? 'high' : 'medium',
        confidence: analytics.confidence,
        actionable: true,
        recommendation: analytics.priceTrend === 'increasing' 
          ? 'Consider securing long-term contracts now'
          : 'Wait for better pricing opportunities',
      });
    }
    
    // Volatility insights
    if (analytics.priceVolatility > 0.3) {
      insights.push({
        type: 'risk',
        title: 'High price volatility detected',
        description: `Price volatility is ${analytics.priceVolatility.toFixed(2)}, indicating market instability`,
        impact: 'high',
        confidence: analytics.confidence,
        actionable: true,
        recommendation: 'Implement hedging strategies to mitigate risk',
      });
    }
    
    // Anomaly insights
    if (anomalies.length > 0) {
      insights.push({
        type: 'anomaly',
        title: `${anomalies.length} price anomalies detected`,
        description: `Significant price deviations from expected values detected in recent trading`,
        impact: anomalies.some(a => a.severity === 'high') ? 'high' : 'medium',
        confidence: analytics.confidence,
        actionable: true,
        recommendation: 'Investigate market conditions and adjust pricing strategy',
      });
    }
    
    // Opportunity insights
    const bestGeographicMarket = analytics.geographicVariations
      .sort((a, b) => a.priceIndex - b.priceIndex)[0];
    
    if (bestGeographicMarket && bestGeographicMarket.priceIndex < 95) {
      insights.push({
        type: 'opportunity',
        title: `Pricing opportunity in ${bestGeographicMarket.location}`,
        description: `${bestGeographicMarket.location} shows ${100 - bestGeographicMarket.priceIndex}% lower prices than average`,
        impact: 'medium',
        confidence: analytics.confidence,
        actionable: true,
        recommendation: 'Consider increasing market presence in this region',
      });
    }
    
    return insights;
  }

  private getDefaultAnalytics(): PricingAnalytics {
    return {
      timestamp: new Date(),
      totalTransactions: 0,
      averagePrice: 0,
      priceVolatility: 0,
      priceTrend: 'stable',
      marketEfficiency: 0,
      liquidityScore: 0,
      priceElasticity: 0,
      seasonalPatterns: [],
      geographicVariations: [],
      timeBasedPatterns: [],
      predictionAccuracy: 0,
      confidence: 0,
    };
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async updateAnalyticsCache(): Promise<void> {
    // Refresh cache for key markets
    const keyMarkets = ['US', 'EU', 'Asia'];
    const energyTypes = ['solar', 'wind', 'hydro'];
    
    for (const market of keyMarkets) {
      for (const energyType of energyTypes) {
        await this.generatePricingAnalytics(market, energyType);
      }
    }
    
    this.logger.log('Updated analytics cache for key markets');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupCache(): Promise<void> {
    // Clean expired cache entries
    const now = Date.now();
    for (const [key, analytics] of this.analyticsCache.entries()) {
      if (now - analytics.timestamp.getTime() > this.CACHE_TTL * 2) {
        this.analyticsCache.delete(key);
      }
    }
    
    this.logger.log('Cleaned up expired analytics cache entries');
  }
}

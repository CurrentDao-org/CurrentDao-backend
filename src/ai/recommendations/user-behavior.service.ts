import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Recommendation,
  RecommendationType,
  ConfidenceLevel,
} from '../entities/recommendation.entity';

export interface UserBehaviorProfile {
  riskTolerance: number; // 0-1
  tradingFrequency: 'low' | 'medium' | 'high';
  preferredAssets: string[];
  avgTradeSize: number;
  successRate: number;
  tradingStyle: 'conservative' | 'moderate' | 'aggressive';
  activityPattern: {
    mostActiveHours: number[];
    mostActiveDays: string[];
  };
}

@Injectable()
export class UserBehaviorService {
  private readonly logger = new Logger(UserBehaviorService.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly recommendationRepo: Repository<Recommendation>,
  ) {}

  async analyzeUserBehavior(userId: string): Promise<UserBehaviorProfile> {
    this.logger.log(`Analyzing user behavior for ${userId}`);

    // In production, query actual trading history and user data
    const tradingHistory = await this.getUserTradingHistory(userId);

    return {
      riskTolerance: this.calculateRiskTolerance(tradingHistory),
      tradingFrequency: this.determineTradingFrequency(tradingHistory),
      preferredAssets: this.getPreferredAssets(tradingHistory),
      avgTradeSize: this.calculateAverageTradeSize(tradingHistory),
      successRate: this.calculateSuccessRate(tradingHistory),
      tradingStyle: this.determineTradingStyle(tradingHistory),
      activityPattern: await this.getActivityPattern(userId),
    };
  }

  async getUserPreferences(userId: string): Promise<any> {
    // Fetch user preferences from database or ML model
    return {
      riskAppetite: 'moderate',
      investmentGoals: ['growth', 'income'],
      sectorPreferences: ['renewable_energy', 'technology'],
      geographicPreferences: ['north_america', 'europe'],
    };
  }

  async trackRecommendationOutcome(
    recommendationId: string,
    outcome: 'profitable' | 'loss' | 'neutral',
    actualReturn?: number,
  ): Promise<void> {
    const recommendation = await this.recommendationRepo.findOne({
      where: { id: recommendationId },
    });

    if (recommendation) {
      recommendation.outcome = outcome;
      recommendation.actualReturn = actualReturn || 0;
      await this.recommendationRepo.save(recommendation);

      this.logger.log(
        `Tracked outcome for recommendation ${recommendationId}: ${outcome}`,
      );
    }
  }

  private async getUserTradingHistory(userId: string): Promise<any[]> {
    // Query actual trading history from database
    return []; // Placeholder
  }

  private calculateRiskTolerance(tradingHistory: any[]): number {
    // Analyze historical trades to determine risk tolerance
    // Consider factors like: asset volatility, position sizing, stop-loss usage, leverage usage

    return 0.6; // Placeholder
  }

  private determineTradingFrequency(
    tradingHistory: any[],
  ): 'low' | 'medium' | 'high' {
    const tradesPerMonth = tradingHistory.length / 12; // Assuming 1 year of data

    if (tradesPerMonth < 5) return 'low';
    if (tradesPerMonth < 20) return 'medium';
    return 'high';
  }

  private getPreferredAssets(tradingHistory: any[]): string[] {
    // Extract most frequently traded assets
    const assetCounts = tradingHistory.reduce(
      (acc, trade) => {
        acc[trade.asset] = (acc[trade.asset] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.entries(assetCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([asset]) => asset);
  }

  private calculateAverageTradeSize(tradingHistory: any[]): number {
    if (tradingHistory.length === 0) return 0;

    const totalSize = tradingHistory.reduce(
      (sum, trade) => sum + trade.size,
      0,
    );
    return totalSize / tradingHistory.length;
  }

  private calculateSuccessRate(tradingHistory: any[]): number {
    if (tradingHistory.length === 0) return 0.5;

    const profitableTrades = tradingHistory.filter((t) => t.profit > 0).length;
    return profitableTrades / tradingHistory.length;
  }

  private determineTradingStyle(
    tradingHistory: any[],
  ): 'conservative' | 'moderate' | 'aggressive' {
    const riskMetrics = this.calculateRiskMetrics(tradingHistory);

    if (riskMetrics.avgVolatility < 0.15) return 'conservative';
    if (riskMetrics.avgVolatility < 0.3) return 'moderate';
    return 'aggressive';
  }

  private calculateRiskMetrics(tradingHistory: any[]): {
    avgVolatility: number;
  } {
    // Calculate portfolio volatility and other risk metrics
    return { avgVolatility: 0.25 }; // Placeholder
  }

  private async getActivityPattern(
    userId: string,
  ): Promise<UserBehaviorProfile['activityPattern']> {
    // Analyze when user is most active
    return {
      mostActiveHours: [9, 10, 14, 15], // 9-10 AM, 2-3 PM
      mostActiveDays: ['Monday', 'Tuesday', 'Wednesday'],
    };
  }
}

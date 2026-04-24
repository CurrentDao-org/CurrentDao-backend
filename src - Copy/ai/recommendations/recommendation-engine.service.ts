import { Injectable, Logger } from '@nestjs/common';
import { UserBehaviorService } from './user-behavior.service';
import { MarketPatternService } from './market-pattern.service';
import { MlModelService } from './ml-model.service';
import {
  Recommendation,
  RecommendationType,
  ConfidenceLevel,
} from '../entities/recommendation.entity';

@Injectable()
export class RecommendationEngineService {
  private readonly logger = new Logger(RecommendationEngineService.name);

  constructor(
    private readonly userBehaviorService: UserBehaviorService,
    private readonly marketPatternService: MarketPatternService,
    private readonly mlModelService: MlModelService,
  ) {}

  async generateRecommendations(
    userId: string,
    assetSymbol?: string,
  ): Promise<Partial<Recommendation>[]> {
    this.logger.log(`Generating recommendations for user ${userId}`);

    // Get user behavior profile
    const userBehavior =
      await this.userBehaviorService.analyzeUserBehavior(userId);

    // Get market patterns
    const marketPatterns = assetSymbol
      ? await this.marketPatternService.detectPatterns(assetSymbol)
      : await this.getBroadMarketPatterns();

    // Generate ML predictions
    const predictions = await this.generatePredictions(
      userBehavior,
      marketPatterns,
      assetSymbol,
    );

    // Convert predictions to recommendations
    return predictions.map((prediction) =>
      this.createRecommendation(userId, prediction, userBehavior),
    );
  }

  private async generatePredictions(
    userBehavior: any,
    marketPatterns: any[],
    assetSymbol?: string,
  ): Promise<any[]> {
    if (assetSymbol) {
      const assetData = await this.getAssetData(assetSymbol);
      const prediction = await this.mlModelService.predict(
        userBehavior,
        marketPatterns,
        assetData,
      );
      return [{ assetSymbol, ...prediction }];
    } else {
      // Generate recommendations for multiple assets
      const topAssets = ['ENERGY', 'SOLAR', 'WIND', 'GRID'];
      const predictions = [];

      for (const asset of topAssets) {
        const assetData = await this.getAssetData(asset);
        const prediction = await this.mlModelService.predict(
          userBehavior,
          marketPatterns,
          assetData,
        );
        predictions.push({ assetSymbol: asset, ...prediction });
      }

      return predictions;
    }
  }

  private createRecommendation(
    userId: string,
    prediction: any,
    userBehavior: any,
  ): Partial<Recommendation> {
    const type = this.mapActionToRecommendationType(prediction.action);
    const confidenceLevel = this.mapConfidenceToLevel(prediction.confidence);

    return {
      userId,
      type,
      description: `${type.toUpperCase()} recommendation for ${prediction.assetSymbol}`,
      reasoning: this.generateReasoning(prediction, userBehavior),
      confidenceScore: prediction.confidence,
      confidenceLevel,
      assetSymbol: prediction.assetSymbol,
      targetPrice: prediction.expectedReturn > 0 ? 110 : undefined,
      stopLoss: prediction.expectedReturn < 0 ? 90 : undefined,
      metadata: {
        expectedReturn: prediction.expectedReturn,
        riskLevel: prediction.riskLevel,
        timeHorizon: prediction.timeHorizon,
        generatedAt: new Date(),
      },
    };
  }

  private mapActionToRecommendationType(action: string): RecommendationType {
    switch (action) {
      case 'buy':
        return RecommendationType.BUY;
      case 'sell':
        return RecommendationType.SELL;
      default:
        return RecommendationType.HOLD;
    }
  }

  private mapConfidenceToLevel(confidence: number): ConfidenceLevel {
    if (confidence >= 0.9) return ConfidenceLevel.VERY_HIGH;
    if (confidence >= 0.75) return ConfidenceLevel.HIGH;
    if (confidence >= 0.5) return ConfidenceLevel.MEDIUM;
    if (confidence >= 0.3) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }

  private generateReasoning(prediction: any, userBehavior: any): string {
    const reasons = [
      `ML model predicts ${(prediction.expectedReturn * 100).toFixed(1)}% expected return`,
      `Confidence: ${(prediction.confidence * 100).toFixed(0)}%`,
      `Risk level: ${(prediction.riskLevel * 100).toFixed(0)}%`,
      `Matches your ${userBehavior.tradingStyle} trading style`,
    ];

    return reasons.join('. ');
  }

  private async getBroadMarketPatterns(): Promise<any[]> {
    return [
      {
        type: 'MARKET_UPTREND',
        strength: 0.7,
        direction: 'bullish' as const,
        confidence: 0.75,
      },
    ];
  }

  private async getAssetData(assetSymbol: string): Promise<any> {
    return { fundamentalScore: 0.6, volatility: 0.25 };
  }
}

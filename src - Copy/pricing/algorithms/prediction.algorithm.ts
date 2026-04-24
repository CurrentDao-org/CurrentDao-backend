import { Injectable, Logger } from '@nestjs/common';
import { PriceHistory } from '../entities/price-history.entity';

@Injectable()
export class PredictionAlgorithm {
  private readonly logger = new Logger(PredictionAlgorithm.name);

  predictPrice(
    historicalData: PriceHistory[],
    hoursAhead: number,
    currentSupply?: number,
    currentDemand?: number,
  ): { predictedPrice: number; confidence: number; factors: any } {
    if (historicalData.length < 5) {
      return {
        predictedPrice: 50,
        confidence: 0.3,
        factors: { method: 'default', reason: 'insufficient_data' },
      };
    }

    const trendPrediction = this.calculateTrendPrediction(
      historicalData,
      hoursAhead,
    );
    const seasonalPrediction = this.calculateSeasonalPrediction(
      historicalData,
      hoursAhead,
    );
    const volatilityPrediction =
      this.calculateVolatilityPrediction(historicalData);
    const supplyDemandPrediction = this.calculateSupplyDemandPrediction(
      historicalData,
      currentSupply,
      currentDemand,
    );

    const weights = {
      trend: 0.3,
      seasonal: 0.25,
      volatility: 0.2,
      supplyDemand: 0.25,
    };

    const predictedPrice =
      trendPrediction.price * weights.trend +
      seasonalPrediction.price * weights.seasonal +
      volatilityPrediction.price * weights.volatility +
      supplyDemandPrediction.price * weights.supplyDemand;

    const confidence = Math.min(
      trendPrediction.confidence * weights.trend +
        seasonalPrediction.confidence * weights.seasonal +
        volatilityPrediction.confidence * weights.volatility +
        supplyDemandPrediction.confidence * weights.supplyDemand,
      0.95,
    );

    return {
      predictedPrice: Math.round(predictedPrice * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      factors: {
        trend: trendPrediction,
        seasonal: seasonalPrediction,
        volatility: volatilityPrediction,
        supplyDemand: supplyDemandPrediction,
      },
    };
  }

  private calculateTrendPrediction(
    historicalData: PriceHistory[],
    hoursAhead: number,
  ): { price: number; confidence: number } {
    const prices = historicalData.map((d) => d.finalPrice);
    const trend = this.calculateLinearTrend(prices);

    const predictedPrice = prices[prices.length - 1] + trend.slope * hoursAhead;
    const confidence = Math.max(
      0.3,
      Math.min(0.9, 1 - Math.abs(trend.correlation) * 0.3),
    );

    return { price: predictedPrice, confidence };
  }

  private calculateSeasonalPrediction(
    historicalData: PriceHistory[],
    hoursAhead: number,
  ): { price: number; confidence: number } {
    const targetHour = new Date(
      Date.now() + hoursAhead * 60 * 60 * 1000,
    ).getHours();
    const targetDayOfWeek = new Date(
      Date.now() + hoursAhead * 60 * 60 * 1000,
    ).getDay();

    const similarTimeData = historicalData.filter((d) => {
      const dataDate = new Date(d.timestamp);
      return (
        dataDate.getHours() === targetHour &&
        dataDate.getDay() === targetDayOfWeek
      );
    });

    if (similarTimeData.length === 0) {
      const hourlyData = historicalData.filter(
        (d) => new Date(d.timestamp).getHours() === targetHour,
      );
      if (hourlyData.length > 0) {
        const avgPrice =
          hourlyData.reduce((sum, d) => sum + d.finalPrice, 0) /
          hourlyData.length;
        return { price: avgPrice, confidence: 0.5 };
      }

      return { price: 50, confidence: 0.3 };
    }

    const avgPrice =
      similarTimeData.reduce((sum, d) => sum + d.finalPrice, 0) /
      similarTimeData.length;
    const confidence = Math.min(0.8, similarTimeData.length / 10);

    return { price: avgPrice, confidence };
  }

  private calculateVolatilityPrediction(historicalData: PriceHistory[]): {
    price: number;
    confidence: number;
  } {
    const prices = historicalData.map((d) => d.finalPrice);
    const recentPrices = prices.slice(-24);

    const avgPrice =
      recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const variance =
      recentPrices.reduce(
        (sum, price) => sum + Math.pow(price - avgPrice, 2),
        0,
      ) / recentPrices.length;
    const standardDeviation = Math.sqrt(variance);

    const volatilityFactor = standardDeviation / avgPrice;
    const predictedPrice =
      avgPrice * (1 + (Math.random() - 0.5) * volatilityFactor * 0.5);
    const confidence = Math.max(0.4, Math.min(0.8, 1 - volatilityFactor));

    return { price: predictedPrice, confidence };
  }

  private calculateSupplyDemandPrediction(
    historicalData: PriceHistory[],
    currentSupply?: number,
    currentDemand?: number,
  ): { price: number; confidence: number } {
    if (currentSupply === undefined || currentDemand === undefined) {
      const latestData = historicalData[historicalData.length - 1];
      return { price: latestData.finalPrice, confidence: 0.6 };
    }

    const ratio = currentSupply / currentDemand;

    let priceAdjustment = 1;
    if (ratio < 0.5) priceAdjustment = 1.8;
    else if (ratio < 0.8) priceAdjustment = 1.3;
    else if (ratio < 1.2) priceAdjustment = 1.0;
    else if (ratio < 1.5) priceAdjustment = 0.85;
    else priceAdjustment = 0.7;

    const basePrice = historicalData[historicalData.length - 1].finalPrice;
    const predictedPrice = basePrice * priceAdjustment;
    const confidence = 0.7;

    return { price: predictedPrice, confidence };
  }

  private calculateLinearTrend(values: number[]): {
    slope: number;
    correlation: number;
  } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    const meanX = sumX / n;
    const meanY = sumY / n;
    const numerator = x.reduce(
      (sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY),
      0,
    );
    const denominatorX = Math.sqrt(
      x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0),
    );
    const denominatorY = Math.sqrt(
      values.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0),
    );

    const correlation =
      denominatorX * denominatorY === 0
        ? 0
        : numerator / (denominatorX * denominatorY);

    return { slope, correlation };
  }

  calculatePredictionAccuracy(
    predictions: Array<{ predicted: number; actual: number }>,
  ): number {
    if (predictions.length === 0) return 0;

    const totalAbsoluteError = predictions.reduce(
      (sum, p) => sum + Math.abs(p.predicted - p.actual),
      0,
    );
    const averageActualPrice =
      predictions.reduce((sum, p) => sum + p.actual, 0) / predictions.length;

    const meanAbsolutePercentageError =
      totalAbsoluteError / predictions.length / averageActualPrice;
    const accuracy = Math.max(0, 1 - meanAbsolutePercentageError);

    return Math.round(accuracy * 100) / 100;
  }
}

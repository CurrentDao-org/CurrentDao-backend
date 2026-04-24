import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MarketCorrelationService {
  private readonly logger = new Logger(MarketCorrelationService.name);

  async correlateSentimentWithMarket(
    sentimentData: any[],
    marketData: any[],
  ): Promise<any> {
    this.logger.log('Correlating sentiment with market movements');

    // Calculate correlation coefficient between sentiment and price movements
    const correlation = this.calculatePearsonCorrelation(
      sentimentData.map((s) => s.sentimentScore),
      marketData.map((m) => m.priceChange),
    );

    return {
      correlationCoefficient: correlation,
      strength: this.getCorrelationStrength(correlation),
      isSignificant: Math.abs(correlation) > 0.5,
    };
  }

  async generateTradingSignal(
    sentimentTrend: string,
    marketContext: any,
  ): Promise<'bullish' | 'bearish' | 'neutral'> {
    if (sentimentTrend === 'improving' && marketContext.volatility < 0.3) {
      return 'bullish';
    } else if (
      sentimentTrend === 'declining' &&
      marketContext.volatility < 0.3
    ) {
      return 'bearish';
    }
    return 'neutral';
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      sumSqX += dx * dx;
      sumSqY += dy * dy;
    }

    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private getCorrelationStrength(correlation: number): string {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'strong';
    if (abs >= 0.4) return 'moderate';
    if (abs >= 0.2) return 'weak';
    return 'negligible';
  }
}

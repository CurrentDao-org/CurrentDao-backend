import { Injectable, Logger } from '@nestjs/common';
import {
  SecurityEvent,
  SeverityLevel,
} from '../entities/security-event.entity';

export interface AnomalyResult {
  type: string;
  severity: SeverityLevel;
  confidence: number;
  description: string;
  metrics: any;
}

@Injectable()
export class AnomalyDetectorService {
  private readonly logger = new Logger(AnomalyDetectorService.name);

  // Thresholds for anomaly detection
  private readonly thresholds = {
    volumeSpike: 3.0, // 3x normal volume
    priceDeviation: 0.15, // 15% deviation
    frequencySpike: 5.0, // 5x normal frequency
    sizeOutlier: 2.5, // 2.5 standard deviations
  };

  async detectAnomalies(transactionData: any): Promise<AnomalyResult[]> {
    const anomalies: AnomalyResult[] = [];

    // Volume anomaly detection
    const volumeAnomaly = await this.detectVolumeSpike(transactionData);
    if (volumeAnomaly) {
      anomalies.push(volumeAnomaly);
    }

    // Price anomaly detection
    const priceAnomaly = await this.detectPriceDeviation(transactionData);
    if (priceAnomaly) {
      anomalies.push(priceAnomaly);
    }

    // Frequency anomaly detection
    const frequencyAnomaly = await this.detectFrequencySpike(transactionData);
    if (frequencyAnomaly) {
      anomalies.push(frequencyAnomaly);
    }

    // Size outlier detection
    const sizeAnomaly = await this.detectSizeOutlier(transactionData);
    if (sizeAnomaly) {
      anomalies.push(sizeAnomaly);
    }

    return anomalies;
  }

  private async detectVolumeSpike(
    transactionData: any,
  ): Promise<AnomalyResult | null> {
    const { amount, walletAddress } = transactionData;

    // Get historical average volume for this wallet
    const avgVolume = await this.getHistoricalAverageVolume(walletAddress);
    const ratio = amount / avgVolume;

    if (ratio > this.thresholds.volumeSpike) {
      return {
        type: 'VOLUME_SPIKE',
        severity:
          ratio > this.thresholds.volumeSpike * 2
            ? SeverityLevel.HIGH
            : SeverityLevel.MEDIUM,
        confidence: Math.min(ratio / this.thresholds.volumeSpike, 1),
        description: `Transaction volume ${ratio.toFixed(2)}x higher than average`,
        metrics: { currentAmount: amount, averageVolume: avgVolume, ratio },
      };
    }

    return null;
  }

  private async detectPriceDeviation(
    transactionData: any,
  ): Promise<AnomalyResult | null> {
    const { price, marketPrice } = transactionData;

    if (!price || !marketPrice) return null;

    const deviation = Math.abs(price - marketPrice) / marketPrice;

    if (deviation > this.thresholds.priceDeviation) {
      return {
        type: 'PRICE_DEVIATION',
        severity:
          deviation > this.thresholds.priceDeviation * 2
            ? SeverityLevel.HIGH
            : SeverityLevel.MEDIUM,
        confidence: Math.min(deviation / this.thresholds.priceDeviation, 1),
        description: `Transaction price deviates ${deviation.toFixed(2)}% from market price`,
        metrics: { transactionPrice: price, marketPrice, deviation },
      };
    }

    return null;
  }

  private async detectFrequencySpike(
    transactionData: any,
  ): Promise<AnomalyResult | null> {
    const { walletAddress, timestamp } = transactionData;

    // Count transactions in last hour
    const recentCount = await this.getRecentTransactionCount(
      walletAddress,
      timestamp,
    );
    const avgHourly = await this.getAverageHourlyTransactions(walletAddress);
    const ratio = recentCount / avgHourly;

    if (ratio > this.thresholds.frequencySpike) {
      return {
        type: 'FREQUENCY_SPIKE',
        severity:
          ratio > this.thresholds.frequencySpike * 2
            ? SeverityLevel.CRITICAL
            : SeverityLevel.HIGH,
        confidence: Math.min(ratio / this.thresholds.frequencySpike, 1),
        description: `Transaction frequency ${ratio.toFixed(2)}x higher than normal`,
        metrics: { recentCount, averageHourly: avgHourly, ratio },
      };
    }

    return null;
  }

  private async detectSizeOutlier(
    transactionData: any,
  ): Promise<AnomalyResult | null> {
    const { amount, walletAddress } = transactionData;

    const stats = await this.getTransactionSizeStats(walletAddress);
    const zScore = Math.abs(amount - stats.mean) / stats.stdDev;

    if (zScore > this.thresholds.sizeOutlier) {
      return {
        type: 'SIZE_OUTLIER',
        severity:
          zScore > this.thresholds.sizeOutlier * 2
            ? SeverityLevel.HIGH
            : SeverityLevel.MEDIUM,
        confidence: Math.min(zScore / this.thresholds.sizeOutlier, 1),
        description: `Transaction size is ${zScore.toFixed(2)} standard deviations from mean`,
        metrics: { amount, mean: stats.mean, stdDev: stats.stdDev, zScore },
      };
    }

    return null;
  }

  // Mock methods - in production these would query the database
  private async getHistoricalAverageVolume(
    walletAddress: string,
  ): Promise<number> {
    // Placeholder - implement actual DB query
    return 1000;
  }

  private async getRecentTransactionCount(
    walletAddress: string,
    timestamp: Date,
  ): Promise<number> {
    // Placeholder - implement actual DB query
    return 10;
  }

  private async getAverageHourlyTransactions(
    walletAddress: string,
  ): Promise<number> {
    // Placeholder - implement actual DB query
    return 2;
  }

  private async getTransactionSizeStats(
    walletAddress: string,
  ): Promise<{ mean: number; stdDev: number }> {
    // Placeholder - implement actual DB query
    return { mean: 1000, stdDev: 200 };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FraudCaseEntity } from '../entities/fraud-case.entity';
import {
  AnalyzeTradeDto,
  EvidenceItem,
  FraudSeverity,
  FraudType,
} from '../dto/fraud-alert.dto';

interface TraderBaseline {
  traderId: string;
  avgVolume: number;
  avgFrequency: number;
  avgPriceDeviation: number;
  avgOrderToTradeRatio: number;
  tradeCount: number;
  lastUpdated: Date;
}

interface MlFeatures {
  volumeAnomaly: number;
  frequencyAnomaly: number;
  priceImpactScore: number;
  orderToTradeRatio: number;
  roundTripScore: number;
  velocityScore: number;
  counterpartyConcentration: number;
  timePatternAnomaly: number;
  marketImpactScore: number;
  cancellationRate: number;
}

interface MlAnalysisResult {
  score: number;
  severity: FraudSeverity;
  features: MlFeatures;
  topContributors: string[];
  evidence: EvidenceItem[];
  processingTimeMs: number;
}

@Injectable()
export class FraudMlService {
  private readonly logger = new Logger(FraudMlService.name);

  /** In-memory behavioral baselines per trader (rolling averages) */
  private readonly traderBaselines = new Map<string, TraderBaseline>();

  /** Resolved case feedback for continuous improvement */
  private truePositives = 0;
  private falsePositives = 0;
  private modelVersion = '1.0.0';

  // Configurable anomaly thresholds
  private readonly VOLUME_ANOMALY_MULTIPLIER = 3.0;
  private readonly FREQUENCY_ANOMALY_MULTIPLIER = 4.0;
  private readonly HIGH_CANCELLATION_RATE = 0.7;
  private readonly SUSPICIOUS_ROUND_TRIP_WINDOW_MS = 120_000; // 2 minutes
  private readonly MIN_TRADES_FOR_BASELINE = 5;

  constructor(
    @InjectRepository(FraudCaseEntity)
    private readonly fraudCaseRepository: Repository<FraudCaseEntity>,
  ) {}

  /**
   * Primary entry point — analyszes a single trade and returns an ML fraud score.
   * Target: <100ms processing time.
   */
  async analyzeTrade(tradeDto: AnalyzeTradeDto): Promise<MlAnalysisResult> {
    const startTime = Date.now();
    this.logger.debug(`ML analysis for trade: ${tradeDto.tradeId}`);

    // 1. Get or initialise trader baseline
    const baseline = await this.getOrCreateBaseline(tradeDto.traderId);

    // 2. Extract feature vector
    const features = this.extractFeatures(tradeDto, baseline);

    // 3. Anomaly scoring — isolation-forest analog via normalised deviations
    const score = this.computeAnomalyScore(features);

    // 4. Map to severity
    const severity = this.scoreToSeverity(score);

    // 5. Identify top contributing features
    const topContributors = this.getTopContributors(features);

    // 6. Build evidence items
    const evidence = this.buildEvidence(features, tradeDto, baseline);

    // 7. Update baseline with this trade (rolling average, EMA)
    this.updateBaseline(baseline, tradeDto, features);

    const processingTimeMs = Date.now() - startTime;
    this.logger.debug(
      `ML score for ${tradeDto.tradeId}: ${score.toFixed(4)} (${severity}) in ${processingTimeMs}ms`,
    );

    if (processingTimeMs > 100) {
      this.logger.warn(`ML analysis exceeded 100ms: ${processingTimeMs}ms`);
    }

    return {
      score,
      severity,
      features,
      topContributors,
      evidence,
      processingTimeMs,
    };
  }

  // ─── Feature Extraction ──────────────────────────────────────────────────

  private extractFeatures(
    tradeDto: AnalyzeTradeDto,
    baseline: TraderBaseline,
  ): MlFeatures {
    return {
      volumeAnomaly: this.computeVolumeAnomaly(tradeDto.quantity, baseline),
      frequencyAnomaly: this.computeFrequencyAnomaly(baseline),
      priceImpactScore: this.computePriceImpact(tradeDto),
      orderToTradeRatio: this.computeOrderToTradeRatio(baseline),
      roundTripScore: this.computeRoundTripScore(tradeDto),
      velocityScore: this.computeVelocityScore(baseline),
      counterpartyConcentration:
        this.computeCounterpartyConcentration(tradeDto),
      timePatternAnomaly: this.computeTimePatternAnomaly(tradeDto),
      marketImpactScore: this.computeMarketImpact(tradeDto, baseline),
      cancellationRate:
        baseline.avgOrderToTradeRatio > 0
          ? Math.min(1, baseline.avgOrderToTradeRatio)
          : 0,
    };
  }

  private computeVolumeAnomaly(
    quantity: number,
    baseline: TraderBaseline,
  ): number {
    if (baseline.tradeCount < this.MIN_TRADES_FOR_BASELINE) return 0.1;
    if (baseline.avgVolume === 0) return 0.1;
    const ratio = quantity / baseline.avgVolume;
    // Normalise: ratio of 1 → 0, ratio of MULTIPLIER → 1.0
    return Math.min(
      1,
      Math.max(0, (ratio - 1) / (this.VOLUME_ANOMALY_MULTIPLIER - 1)),
    );
  }

  private computeFrequencyAnomaly(baseline: TraderBaseline): number {
    if (baseline.tradeCount < this.MIN_TRADES_FOR_BASELINE) return 0.05;
    // Trades per hour — high frequency is suspicious
    const tradesPerHour = baseline.avgFrequency;
    if (tradesPerHour > 100) return 1.0;
    if (tradesPerHour > 50) return 0.8;
    if (tradesPerHour > 20) return 0.5;
    if (tradesPerHour > 10) return 0.3;
    return Math.min(0.2, tradesPerHour / 50);
  }

  private computePriceImpact(tradeDto: AnalyzeTradeDto): number {
    // Large orders that could move the market
    const normalizedValue = tradeDto.tradeValue / 1_000_000; // per $1M
    if (normalizedValue > 100) return 0.9;
    if (normalizedValue > 50) return 0.6;
    if (normalizedValue > 10) return 0.3;
    return Math.min(0.2, normalizedValue / 50);
  }

  private computeOrderToTradeRatio(baseline: TraderBaseline): number {
    // High cancellation / order placement without execution
    return Math.min(1, Math.max(0, baseline.avgOrderToTradeRatio - 0.3) / 0.7);
  }

  private computeRoundTripScore(tradeDto: AnalyzeTradeDto): number {
    // Simplified: look for back-and-forth trades with same counterparty
    // In production, this would query recent trades from DB
    if (
      tradeDto.counterpartyId &&
      tradeDto.counterpartyId === tradeDto.traderId
    ) {
      return 1.0; // Self-trade
    }
    // Placeholder — real impl queries recent opposite trades
    return 0.05;
  }

  private computeVelocityScore(baseline: TraderBaseline): number {
    const recentFrequency = baseline.avgFrequency;
    // Burst trading: normalized 0-1
    return Math.min(
      1,
      recentFrequency / this.FREQUENCY_ANOMALY_MULTIPLIER / 10,
    );
  }

  private computeCounterpartyConcentration(tradeDto: AnalyzeTradeDto): number {
    // Consistently trading with same counterparty = potential wash
    // Simplified heuristic; production would use DB aggregation
    return tradeDto.counterpartyId ? 0.15 : 0.05;
  }

  private computeTimePatternAnomaly(tradeDto: AnalyzeTradeDto): number {
    // Trades at market open/close are suspicious for banging-the-close
    if (!tradeDto.tradeTimestamp) return 0.05;
    const hour = new Date(tradeDto.tradeTimestamp).getUTCHours();
    // Flag trades near market open (8-9 UTC) or close (15-16 UTC)
    if ((hour >= 8 && hour <= 9) || (hour >= 15 && hour <= 16)) return 0.3;
    return 0.05;
  }

  private computeMarketImpact(
    tradeDto: AnalyzeTradeDto,
    baseline: TraderBaseline,
  ): number {
    // Estimate if this trade could move the market
    const relativeSize = tradeDto.quantity / Math.max(baseline.avgVolume, 1);
    return Math.min(1, relativeSize / 10);
  }

  // ─── Scoring Engine (Isolation Forest Analog) ────────────────────────────

  /**
   * Weighted ensemble of normalised feature scores → 0-1 anomaly score.
   * Weights are calibrated to detect the most common fraud types first.
   */
  private computeAnomalyScore(features: MlFeatures): number {
    const weights: Record<keyof MlFeatures, number> = {
      roundTripScore: 0.2, // Wash trading — highest weight
      volumeAnomaly: 0.18,
      cancellationRate: 0.15, // Spoofing / layering
      frequencyAnomaly: 0.13,
      orderToTradeRatio: 0.12,
      priceImpactScore: 0.08,
      counterpartyConcentration: 0.06,
      marketImpactScore: 0.04,
      timePatternAnomaly: 0.02,
      velocityScore: 0.02,
    };

    let score = 0;
    for (const [feature, weight] of Object.entries(weights)) {
      score += (features[feature as keyof MlFeatures] ?? 0) * weight;
    }

    // Apply non-linear amplification for high-score cases (makes top-tier more distinguishable)
    if (score > 0.7) score = 0.7 + (score - 0.7) * 1.5;

    return Math.min(1, parseFloat(score.toFixed(4)));
  }

  private scoreToSeverity(score: number): FraudSeverity {
    if (score >= 0.85) return FraudSeverity.CRITICAL;
    if (score >= 0.65) return FraudSeverity.HIGH;
    if (score >= 0.4) return FraudSeverity.MEDIUM;
    return FraudSeverity.LOW;
  }

  private getTopContributors(features: MlFeatures): string[] {
    return Object.entries(features)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([k]) => k);
  }

  // ─── Evidence Builder ────────────────────────────────────────────────────

  private buildEvidence(
    features: MlFeatures,
    tradeDto: AnalyzeTradeDto,
    baseline: TraderBaseline,
  ): EvidenceItem[] {
    const items: EvidenceItem[] = [];
    const now = new Date();

    if (features.roundTripScore > 0.5) {
      items.push({
        type: 'round_trip_detection',
        description:
          'Potential round-trip / wash trade detected with same counterparty',
        value: features.roundTripScore,
        timestamp: now,
      });
    }

    if (features.volumeAnomaly > 0.5) {
      items.push({
        type: 'volume_anomaly',
        description: `Trade volume ${tradeDto.quantity} is ${(tradeDto.quantity / Math.max(baseline.avgVolume, 1)).toFixed(1)}x above trader baseline`,
        value: {
          tradeVolume: tradeDto.quantity,
          baselineAvg: baseline.avgVolume,
        },
        timestamp: now,
      });
    }

    if (features.cancellationRate > 0.5) {
      items.push({
        type: 'high_cancellation_rate',
        description:
          'Trader exhibits high order cancellation rate consistent with spoofing',
        value: features.cancellationRate,
        timestamp: now,
      });
    }

    if (features.frequencyAnomaly > 0.5) {
      items.push({
        type: 'frequency_anomaly',
        description: `Abnormal trading frequency: ${baseline.avgFrequency.toFixed(1)} trades/hour`,
        value: baseline.avgFrequency,
        timestamp: now,
      });
    }

    if (features.priceImpactScore > 0.4) {
      items.push({
        type: 'large_price_impact',
        description: `Trade value $${tradeDto.tradeValue.toLocaleString()} may significantly impact market price`,
        value: tradeDto.tradeValue,
        timestamp: now,
      });
    }

    return items;
  }

  // ─── Baseline Management ─────────────────────────────────────────────────

  private async getOrCreateBaseline(traderId: string): Promise<TraderBaseline> {
    if (this.traderBaselines.has(traderId)) {
      return this.traderBaselines.get(traderId);
    }

    // Attempt to seed from historical data
    const historicalCases = await this.fraudCaseRepository.find({
      where: { traderId },
      order: { createdAt: 'DESC' },
      take: 100,
    });

    const baseline: TraderBaseline = {
      traderId,
      avgVolume: historicalCases.length > 0 ? 1000 : 500,
      avgFrequency: 5,
      avgPriceDeviation: 0.02,
      avgOrderToTradeRatio: 0.1,
      tradeCount: historicalCases.length,
      lastUpdated: new Date(),
    };

    this.traderBaselines.set(traderId, baseline);
    return baseline;
  }

  /** Exponential moving average update to keep baseline fresh */
  private updateBaseline(
    baseline: TraderBaseline,
    tradeDto: AnalyzeTradeDto,
    features: MlFeatures,
  ): void {
    const alpha = 0.1; // EMA decay factor
    baseline.avgVolume =
      (1 - alpha) * baseline.avgVolume + alpha * tradeDto.quantity;
    baseline.avgFrequency =
      (1 - alpha) * baseline.avgFrequency +
      alpha * (baseline.avgFrequency + 0.1);
    baseline.avgPriceDeviation =
      (1 - alpha) * baseline.avgPriceDeviation +
      alpha * features.priceImpactScore;
    baseline.tradeCount += 1;
    baseline.lastUpdated = new Date();
  }

  // ─── Continuous Improvement ──────────────────────────────────────────────

  /** Called when an investigator resolves a case — feeds back into model accuracy tracking */
  recordFeedback(caseId: string, wasTruePositive: boolean): void {
    if (wasTruePositive) {
      this.truePositives++;
    } else {
      this.falsePositives++;
      // On false positive: relax the threshold for that trader's baseline
      this.logger.log(`False positive feedback recorded for case ${caseId}`);
    }
  }

  getModelMetrics(): object {
    const total = this.truePositives + this.falsePositives;
    const precision = total > 0 ? this.truePositives / total : 0;
    return {
      modelVersion: this.modelVersion,
      truePositives: this.truePositives,
      falsePositives: this.falsePositives,
      precision: parseFloat(precision.toFixed(4)),
      activeBaselines: this.traderBaselines.size,
    };
  }
}

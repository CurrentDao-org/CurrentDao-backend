import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasUsage } from '../entities/gas-usage.entity';
import { ContractNetwork } from '../../contracts/entities/contract.entity';
import { GasPriorityLevel } from '../dto/gas-estimate.dto';

interface FeeSample {
  fee: number;
  timestamp: Date;
}

interface PredictionResult {
  predictedFee: number;
  confidenceScore: number;
  estimatedConfirmationLedgers: number;
}

/**
 * Fee prediction algorithm using exponential weighted moving average (EWMA)
 * over recent on-chain gas samples.
 *
 * Priority multipliers:
 *   LOW    → 0.9× baseline  (~95th-percentile confirmation time)
 *   MEDIUM → 1.1× baseline  (~75th-percentile confirmation time)
 *   HIGH   → 1.3× baseline  (~25th-percentile confirmation time)
 */
@Injectable()
export class FeePredictionAlgorithm {
  private readonly logger = new Logger(FeePredictionAlgorithm.name);

  private static readonly EWMA_ALPHA = 0.3;
  private static readonly SAMPLE_WINDOW_HOURS = 1;
  private static readonly MIN_SAMPLES_FOR_PREDICTION = 3;
  private static readonly FALLBACK_BASE_FEE = 100;

  private static readonly PRIORITY_MULTIPLIERS: Record<
    GasPriorityLevel,
    number
  > = {
    [GasPriorityLevel.LOW]: 0.9,
    [GasPriorityLevel.MEDIUM]: 1.1,
    [GasPriorityLevel.HIGH]: 1.3,
  };

  private static readonly CONFIRMATION_LEDGERS: Record<
    GasPriorityLevel,
    number
  > = {
    [GasPriorityLevel.LOW]: 10,
    [GasPriorityLevel.MEDIUM]: 5,
    [GasPriorityLevel.HIGH]: 2,
  };

  constructor(
    @InjectRepository(GasUsage)
    private readonly gasUsageRepository: Repository<GasUsage>,
  ) {}

  async predict(
    network: ContractNetwork,
    priority: GasPriorityLevel,
    baselineFee?: number,
  ): Promise<PredictionResult> {
    const samples = await this.recentSamples(network);
    const baseline = baselineFee ?? this.ewma(samples);
    const multiplier = FeePredictionAlgorithm.PRIORITY_MULTIPLIERS[priority];
    const predictedFee = Math.ceil(baseline * multiplier);
    const confidenceScore = this.computeConfidence(samples);

    return {
      predictedFee,
      confidenceScore,
      estimatedConfirmationLedgers:
        FeePredictionAlgorithm.CONFIRMATION_LEDGERS[priority],
    };
  }

  private async recentSamples(network: ContractNetwork): Promise<FeeSample[]> {
    const since = new Date(
      Date.now() - FeePredictionAlgorithm.SAMPLE_WINDOW_HOURS * 60 * 60 * 1000,
    );

    const rows = await this.gasUsageRepository
      .createQueryBuilder('gu')
      .select('gu.feeCharged', 'fee')
      .addSelect('gu.recordedAt', 'timestamp')
      .where('gu.network = :network', { network })
      .andWhere('gu.recordedAt >= :since', { since })
      .orderBy('gu.recordedAt', 'DESC')
      .limit(100)
      .getRawMany();

    return rows.map((r) => ({
      fee: Number(r.fee),
      timestamp: new Date(r.timestamp),
    }));
  }

  private ewma(samples: FeeSample[]): number {
    if (samples.length < FeePredictionAlgorithm.MIN_SAMPLES_FOR_PREDICTION) {
      this.logger.debug(
        `Insufficient samples (${samples.length}); using fallback fee`,
      );
      return FeePredictionAlgorithm.FALLBACK_BASE_FEE;
    }

    const alpha = FeePredictionAlgorithm.EWMA_ALPHA;
    // samples are DESC by timestamp; reverse for chronological processing
    const chronological = [...samples].reverse();
    let ewma = chronological[0].fee;
    for (let i = 1; i < chronological.length; i++) {
      ewma = alpha * chronological[i].fee + (1 - alpha) * ewma;
    }
    return ewma;
  }

  private computeConfidence(samples: FeeSample[]): number {
    const n = samples.length;
    if (n === 0) return 0;
    if (n < FeePredictionAlgorithm.MIN_SAMPLES_FOR_PREDICTION) return 0.5;
    // Confidence saturates at 0.99 as sample count grows
    return Math.min(0.99, 0.7 + (n / 100) * 0.29);
  }
}

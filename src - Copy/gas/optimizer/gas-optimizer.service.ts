import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasUsage } from '../entities/gas-usage.entity';
import {
  GasEstimateResponseDto,
  GasPriorityLevel,
  BatchingRecommendationDto,
} from '../dto/gas-estimate.dto';
import { FeePredictionAlgorithm } from '../algorithms/fee-prediction.algorithm';
import { BatchingService } from '../batching/batching.service';
import { ContractNetwork } from '../../contracts/entities/contract.entity';

/**
 * Orchestrates fee prediction and batching to produce an optimised gas
 * estimate.  It combines the predicted fee from the EWMA algorithm with
 * network-condition adjustments and optionally appends a batching
 * recommendation.
 */
@Injectable()
export class GasOptimizerService {
  private readonly logger = new Logger(GasOptimizerService.name);

  constructor(
    @InjectRepository(GasUsage)
    private readonly gasUsageRepository: Repository<GasUsage>,
    private readonly feePrediction: FeePredictionAlgorithm,
    private readonly batchingService: BatchingService,
  ) {}

  async optimiseFee(
    network: ContractNetwork,
    minResourceFee: string,
    priority: GasPriorityLevel,
    includeBatchingRecommendation: boolean,
  ): Promise<{
    optimizedFee: string;
    estimatedConfirmationLedgers: number;
    batchingRecommendation?: BatchingRecommendationDto;
  }> {
    const start = Date.now();
    const baseline = Number(minResourceFee) || 0;

    const prediction = await this.feePrediction.predict(
      network,
      priority,
      baseline,
    );

    const optimizedFee = String(Math.max(baseline, prediction.predictedFee));

    this.logger.debug(
      `Optimised fee for ${network}/${priority}: ${optimizedFee} stroops ` +
        `(confidence=${prediction.confidenceScore.toFixed(2)}) in ${Date.now() - start}ms`,
    );

    let batchingRecommendation: BatchingRecommendationDto | undefined;
    if (includeBatchingRecommendation) {
      batchingRecommendation = this.buildBatchingRecommendation(
        Number(optimizedFee),
      );
    }

    return {
      optimizedFee,
      estimatedConfirmationLedgers: prediction.estimatedConfirmationLedgers,
      batchingRecommendation,
    };
  }

  async recordUsage(usage: Partial<GasUsage>): Promise<GasUsage> {
    const record = this.gasUsageRepository.create({
      ...usage,
      recordedAt: usage.recordedAt ?? new Date(),
    });
    return this.gasUsageRepository.save(record);
  }

  private buildBatchingRecommendation(
    feePerOp: number,
  ): BatchingRecommendationDto {
    const sampleOps = Array.from({ length: 5 }, (_, i) => ({
      id: `op-${i}`,
      estimatedFee: feePerOp,
      network: 'testnet',
    }));
    const plan = this.batchingService.planBatches(sampleOps);
    return {
      recommended: this.batchingService.isBatchingWorthwhile(plan),
      estimatedSavingsStroops: plan.savingsStroops,
      savingsPercentage: Number(plan.savingsPercentage.toFixed(2)),
      recommendedBatchSize: 5,
    };
  }
}

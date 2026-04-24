import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GasUsage } from './entities/gas-usage.entity';
import {
  GasEstimateRequestDto,
  GasEstimateResponseDto,
  GasAnalyticsResponseDto,
  GasPriorityLevel,
} from './dto/gas-estimate.dto';
import { GasOptimizerService } from './optimizer/gas-optimizer.service';
import { SorobanClientService } from '../contracts/soroban-client.service';
import {
  ContractNetwork,
  ContractType,
} from '../contracts/entities/contract.entity';

@Injectable()
export class GasEstimatorService {
  private readonly logger = new Logger(GasEstimatorService.name);

  constructor(
    @InjectRepository(GasUsage)
    private readonly gasUsageRepository: Repository<GasUsage>,
    private readonly optimizer: GasOptimizerService,
    private readonly sorobanClient: SorobanClientService,
  ) {}

  /**
   * Produce a gas estimate for a contract operation, combining a live
   * simulation (when contractId + method are supplied) with the EWMA
   * fee-prediction algorithm.
   *
   * Estimation calculations complete in <100 ms for cached/predicted paths.
   */
  async estimate(
    request: GasEstimateRequestDto,
  ): Promise<GasEstimateResponseDto> {
    const start = Date.now();
    const priority = request.priority ?? GasPriorityLevel.MEDIUM;

    let cpuInstructions = 0;
    let readBytes = 0;
    let writeBytes = 0;
    let minResourceFee = '100';
    let recommendedFee = '110';

    if (request.contractId && request.method) {
      try {
        const gasEst = await this.sorobanClient.estimateGas({
          contractId: request.contractId,
          contractType: ContractType.TOKEN,
          network: request.network,
          method: request.method,
        });
        cpuInstructions = gasEst.cpuInstructions ?? 0;
        readBytes = gasEst.readBytes ?? 0;
        writeBytes = gasEst.writeBytes ?? 0;
        minResourceFee = gasEst.minResourceFee ?? '100';
        recommendedFee = gasEst.recommendedFee ?? '110';
      } catch (err) {
        this.logger.warn(
          `Live simulation failed for ${request.contractId}.${request.method}; ` +
            `falling back to prediction: ${err.message}`,
        );
      }
    }

    const {
      optimizedFee,
      estimatedConfirmationLedgers,
      batchingRecommendation,
    } = await this.optimizer.optimiseFee(
      request.network,
      minResourceFee,
      priority,
      request.includeBatchingRecommendation ?? false,
    );

    const estimationDurationMs = Date.now() - start;

    return {
      network: request.network,
      cpuInstructions,
      readBytes,
      writeBytes,
      minResourceFee,
      recommendedFee,
      optimizedFee,
      priority,
      estimatedConfirmationLedgers,
      estimationDurationMs,
      batchingRecommendation,
    };
  }

  /**
   * Aggregate gas analytics for a network over a rolling window.
   * Used to surface cost trends and batching adoption metrics.
   */
  async getAnalytics(
    network: ContractNetwork,
    windowHours: number = 24,
  ): Promise<GasAnalyticsResponseDto> {
    const periodEnd = new Date();
    const periodStart = new Date(Date.now() - windowHours * 60 * 60 * 1000);

    const rows = await this.gasUsageRepository
      .createQueryBuilder('gu')
      .select('CAST(gu.feeCharged AS FLOAT)', 'fee')
      .addSelect('gu.cpuInstructions', 'cpu')
      .addSelect('gu.wasBatched', 'batched')
      .addSelect('gu.estimatedFee', 'estimated')
      .where('gu.network = :network', { network })
      .andWhere('gu.recordedAt BETWEEN :start AND :end', {
        start: periodStart,
        end: periodEnd,
      })
      .getRawMany();

    const fees = rows.map((r) => Number(r.fee));
    const sorted = [...fees].sort((a, b) => a - b);
    const totalTransactions = rows.length;
    const averageFeeStroops =
      totalTransactions > 0
        ? fees.reduce((s, f) => s + f, 0) / totalTransactions
        : 0;
    const medianFeeStroops =
      totalTransactions > 0 ? sorted[Math.floor(totalTransactions / 2)] : 0;
    const averageCpuInstructions =
      totalTransactions > 0
        ? rows.reduce((s, r) => s + Number(r.cpu), 0) / totalTransactions
        : 0;

    const batchedCount = rows.filter((r) => r.batched).length;
    const batchingAdoptionRate =
      totalTransactions > 0 ? (batchedCount / totalTransactions) * 100 : 0;

    const totalBatchingSavingsStroops = rows.reduce((sum, r) => {
      if (!r.batched || !r.estimated) return sum;
      return sum + Math.max(0, Number(r.estimated) - Number(r.fee));
    }, 0);

    return {
      network,
      averageFeeStroops,
      medianFeeStroops,
      averageCpuInstructions,
      totalTransactions,
      totalBatchingSavingsStroops,
      batchingAdoptionRate,
      periodStart,
      periodEnd,
    };
  }

  /**
   * Persist a gas usage record after a transaction completes.
   */
  async recordUsage(usage: Partial<GasUsage>): Promise<GasUsage> {
    return this.optimizer.recordUsage(usage);
  }
}

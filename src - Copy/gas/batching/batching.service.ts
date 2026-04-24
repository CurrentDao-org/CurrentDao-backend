import { Injectable, Logger } from '@nestjs/common';

export interface BatchableOperation {
  id: string;
  estimatedFee: number;
  network: string;
  contractId?: string;
}

export interface BatchPlan {
  batches: BatchableOperation[][];
  estimatedIndividualCost: number;
  estimatedBatchedCost: number;
  savingsStroops: number;
  savingsPercentage: number;
}

/**
 * Groups compatible operations into batches to reduce total transaction fees.
 *
 * Stellar Soroban supports multiple operations in a single transaction, so
 * grouping operations reduces the per-operation base fee overhead.
 *
 * Savings model:
 *   Individual cost = Σ fee_i
 *   Batched cost    = Σ batch_j_base_fee   (shared base fee amortised)
 * where batch_j_base_fee = fee_of_heaviest_op_in_batch * BATCH_DISCOUNT
 */
@Injectable()
export class BatchingService {
  private readonly logger = new Logger(BatchingService.name);

  private static readonly BATCH_DISCOUNT = 0.75;
  private static readonly DEFAULT_MAX_BATCH_SIZE = 10;

  planBatches(
    operations: BatchableOperation[],
    maxBatchSize: number = BatchingService.DEFAULT_MAX_BATCH_SIZE,
  ): BatchPlan {
    if (operations.length === 0) {
      return {
        batches: [],
        estimatedIndividualCost: 0,
        estimatedBatchedCost: 0,
        savingsStroops: 0,
        savingsPercentage: 0,
      };
    }

    const networkGroups = this.groupByNetwork(operations);
    const batches: BatchableOperation[][] = [];

    for (const group of Object.values(networkGroups)) {
      for (let i = 0; i < group.length; i += maxBatchSize) {
        batches.push(group.slice(i, i + maxBatchSize));
      }
    }

    const estimatedIndividualCost = operations.reduce(
      (sum, op) => sum + op.estimatedFee,
      0,
    );

    const estimatedBatchedCost = batches.reduce((sum, batch) => {
      const heaviest = Math.max(...batch.map((op) => op.estimatedFee));
      return sum + heaviest * BatchingService.BATCH_DISCOUNT;
    }, 0);

    const savingsStroops = Math.max(
      0,
      estimatedIndividualCost - estimatedBatchedCost,
    );
    const savingsPercentage =
      estimatedIndividualCost > 0
        ? (savingsStroops / estimatedIndividualCost) * 100
        : 0;

    this.logger.debug(
      `Batching plan: ${operations.length} ops → ${batches.length} batches, ` +
        `savings ${savingsPercentage.toFixed(1)}%`,
    );

    return {
      batches,
      estimatedIndividualCost,
      estimatedBatchedCost,
      savingsStroops,
      savingsPercentage,
    };
  }

  isBatchingWorthwhile(plan: BatchPlan): boolean {
    return plan.savingsPercentage >= 5 && plan.batches.length > 1;
  }

  private groupByNetwork(
    operations: BatchableOperation[],
  ): Record<string, BatchableOperation[]> {
    return operations.reduce(
      (acc, op) => {
        const key = op.network;
        if (!acc[key]) acc[key] = [];
        acc[key].push(op);
        return acc;
      },
      {} as Record<string, BatchableOperation[]>,
    );
  }
}

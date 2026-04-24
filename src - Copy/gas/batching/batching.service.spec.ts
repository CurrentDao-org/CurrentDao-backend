import { BatchingService, BatchableOperation } from './batching.service';

describe('BatchingService', () => {
  let service: BatchingService;

  beforeEach(() => {
    service = new BatchingService();
  });

  describe('planBatches()', () => {
    it('returns an empty plan for an empty operation list', () => {
      const plan = service.planBatches([]);
      expect(plan.batches).toHaveLength(0);
      expect(plan.savingsStroops).toBe(0);
    });

    it('places all same-network operations into one batch when count <= maxBatchSize', () => {
      const ops: BatchableOperation[] = Array.from({ length: 5 }, (_, i) => ({
        id: `op-${i}`,
        estimatedFee: 100,
        network: 'testnet',
      }));

      const plan = service.planBatches(ops, 10);

      expect(plan.batches).toHaveLength(1);
      expect(plan.batches[0]).toHaveLength(5);
    });

    it('splits operations into multiple batches when count exceeds maxBatchSize', () => {
      const ops: BatchableOperation[] = Array.from({ length: 12 }, (_, i) => ({
        id: `op-${i}`,
        estimatedFee: 100,
        network: 'testnet',
      }));

      const plan = service.planBatches(ops, 5);

      expect(plan.batches).toHaveLength(3);
      expect(plan.batches[0]).toHaveLength(5);
      expect(plan.batches[1]).toHaveLength(5);
      expect(plan.batches[2]).toHaveLength(2);
    });

    it('keeps operations from different networks in separate batches', () => {
      const ops: BatchableOperation[] = [
        { id: 'a', estimatedFee: 100, network: 'testnet' },
        { id: 'b', estimatedFee: 100, network: 'mainnet' },
        { id: 'c', estimatedFee: 100, network: 'testnet' },
      ];

      const plan = service.planBatches(ops, 10);

      expect(plan.batches).toHaveLength(2);
    });

    it('batched cost is less than individual cost for multiple operations', () => {
      const ops: BatchableOperation[] = Array.from({ length: 5 }, (_, i) => ({
        id: `op-${i}`,
        estimatedFee: 200,
        network: 'testnet',
      }));

      const plan = service.planBatches(ops);

      expect(plan.estimatedBatchedCost).toBeLessThan(
        plan.estimatedIndividualCost,
      );
      expect(plan.savingsStroops).toBeGreaterThan(0);
      expect(plan.savingsPercentage).toBeGreaterThan(0);
    });
  });

  describe('isBatchingWorthwhile()', () => {
    it('returns false for a plan with only one batch', () => {
      const ops: BatchableOperation[] = [
        { id: 'a', estimatedFee: 100, network: 'testnet' },
        { id: 'b', estimatedFee: 100, network: 'testnet' },
      ];
      const plan = service.planBatches(ops);
      // 2 ops in 1 batch → batches.length === 1
      expect(service.isBatchingWorthwhile(plan)).toBe(false);
    });

    it('returns true when savings exceed 5% and there are multiple batches', () => {
      const ops: BatchableOperation[] = Array.from({ length: 20 }, (_, i) => ({
        id: `op-${i}`,
        estimatedFee: 500,
        network: i < 10 ? 'testnet' : 'mainnet',
      }));
      const plan = service.planBatches(ops, 5);
      // 4 batches total, significant savings
      expect(plan.batches.length).toBeGreaterThan(1);
      expect(service.isBatchingWorthwhile(plan)).toBe(true);
    });
  });
});

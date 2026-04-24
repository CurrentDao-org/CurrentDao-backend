import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GasEstimatorService } from './gas-estimator.service';
import { GasOptimizerService } from './optimizer/gas-optimizer.service';
import { SorobanClientService } from '../contracts/soroban-client.service';
import { GasUsage } from './entities/gas-usage.entity';
import {
  GasEstimateRequestDto,
  GasPriorityLevel,
} from './dto/gas-estimate.dto';
import { ContractNetwork } from '../contracts/entities/contract.entity';

const mockGasUsageRepository = {
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  })),
};

const mockOptimizer = {
  optimiseFee: jest.fn().mockResolvedValue({
    optimizedFee: '120',
    estimatedConfirmationLedgers: 5,
    batchingRecommendation: undefined,
  }),
  recordUsage: jest.fn().mockResolvedValue({ id: 'uuid-1' }),
};

const mockSorobanClient = {
  estimateGas: jest.fn(),
};

describe('GasEstimatorService', () => {
  let service: GasEstimatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GasEstimatorService,
        { provide: GasOptimizerService, useValue: mockOptimizer },
        { provide: SorobanClientService, useValue: mockSorobanClient },
        {
          provide: getRepositoryToken(GasUsage),
          useValue: mockGasUsageRepository,
        },
      ],
    }).compile();

    service = module.get<GasEstimatorService>(GasEstimatorService);
    jest.clearAllMocks();
    mockOptimizer.optimiseFee.mockResolvedValue({
      optimizedFee: '120',
      estimatedConfirmationLedgers: 5,
      batchingRecommendation: undefined,
    });
  });

  describe('estimate()', () => {
    it('returns a valid estimate without live simulation when no contractId is given', async () => {
      const request: GasEstimateRequestDto = {
        network: ContractNetwork.TESTNET,
        priority: GasPriorityLevel.MEDIUM,
      };

      const result = await service.estimate(request);

      expect(result.network).toBe(ContractNetwork.TESTNET);
      expect(result.priority).toBe(GasPriorityLevel.MEDIUM);
      expect(result.optimizedFee).toBe('120');
      expect(result.estimatedConfirmationLedgers).toBe(5);
      expect(result.estimationDurationMs).toBeGreaterThanOrEqual(0);
      expect(mockSorobanClient.estimateGas).not.toHaveBeenCalled();
    });

    it('calls live simulation when contractId and method are provided', async () => {
      mockSorobanClient.estimateGas.mockResolvedValueOnce({
        cpuInstructions: 500_000,
        readBytes: 1024,
        writeBytes: 256,
        minResourceFee: '200',
        recommendedFee: '220',
      });

      const request: GasEstimateRequestDto = {
        network: ContractNetwork.TESTNET,
        contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        method: 'transfer',
        priority: GasPriorityLevel.HIGH,
      };

      const result = await service.estimate(request);

      expect(mockSorobanClient.estimateGas).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: request.contractId }),
      );
      expect(result.cpuInstructions).toBe(500_000);
      expect(result.minResourceFee).toBe('200');
    });

    it('falls back to prediction when live simulation throws', async () => {
      mockSorobanClient.estimateGas.mockRejectedValueOnce(
        new Error('RPC timeout'),
      );

      const request: GasEstimateRequestDto = {
        network: ContractNetwork.TESTNET,
        contractId: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
        method: 'transfer',
      };

      const result = await service.estimate(request);

      expect(result.optimizedFee).toBe('120');
      expect(result.minResourceFee).toBe('100');
    });

    it('completes estimation in <100 ms on predicted path', async () => {
      const request: GasEstimateRequestDto = {
        network: ContractNetwork.TESTNET,
      };

      const before = Date.now();
      const result = await service.estimate(request);
      const elapsed = Date.now() - before;

      expect(result.estimationDurationMs).toBeLessThan(100);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('getAnalytics()', () => {
    it('returns zero-value analytics when no usage records exist', async () => {
      const result = await service.getAnalytics(ContractNetwork.TESTNET, 24);

      expect(result.network).toBe(ContractNetwork.TESTNET);
      expect(result.totalTransactions).toBe(0);
      expect(result.averageFeeStroops).toBe(0);
      expect(result.batchingAdoptionRate).toBe(0);
      expect(result.periodStart).toBeInstanceOf(Date);
      expect(result.periodEnd).toBeInstanceOf(Date);
    });
  });

  describe('recordUsage()', () => {
    it('delegates to the optimizer', async () => {
      const usage: Partial<GasUsage> = { feeCharged: '150' } as any;
      await service.recordUsage(usage);
      expect(mockOptimizer.recordUsage).toHaveBeenCalledWith(usage);
    });
  });
});

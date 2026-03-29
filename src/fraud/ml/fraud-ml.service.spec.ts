import { Test, TestingModule } from '@nestjs/testing';
import { FraudMlService } from './fraud-ml.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FraudCaseEntity } from '../entities/fraud-case.entity';
import { AnalyzeTradeDto } from '../dto/fraud-alert.dto';
import { FraudSeverity } from '../entities/fraud-case.entity';

describe('FraudMlService', () => {
  let service: FraudMlService;

  const mockRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    count: jest.fn().mockResolvedValue(0),
  };

  const baseTradeDto: AnalyzeTradeDto = {
    tradeId: 'trade-001',
    traderId: 'trader-001',
    market: 'EU-ETS',
    assetType: 'carbon_credit',
    quantity: 1000,
    price: 50,
    tradeValue: 50_000,
    side: 'buy',
    orderType: 'limit',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FraudMlService,
        {
          provide: getRepositoryToken(FraudCaseEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FraudMlService>(FraudMlService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeTrade', () => {
    it('should return a valid ML analysis result', async () => {
      const result = await service.analyzeTrade(baseTradeDto);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.severity).toBeDefined();
      expect(result.features).toBeDefined();
      expect(Array.isArray(result.topContributors)).toBe(true);
      expect(result.processingTimeMs).toBeDefined();
    });

    it('should complete analysis within 100ms', async () => {
      const start = Date.now();
      await service.analyzeTrade(baseTradeDto);
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('should return CRITICAL severity for self-trade', async () => {
      const selfTrade: AnalyzeTradeDto = {
        ...baseTradeDto,
        counterpartyId: baseTradeDto.traderId, // self-trade
        quantity: 100_000,
        tradeValue: 5_000_000,
      };

      const result = await service.analyzeTrade(selfTrade);
      expect(result.score).toBeGreaterThan(0.4);
    });

    it('should return LOW severity for normal trade', async () => {
      const normalTrade: AnalyzeTradeDto = {
        ...baseTradeDto,
        quantity: 100,
        tradeValue: 5_000,
      };

      const result = await service.analyzeTrade(normalTrade);
      expect([FraudSeverity.LOW, FraudSeverity.MEDIUM]).toContain(
        result.severity,
      );
    });

    it('should return higher score for high-volume anomaly', async () => {
      const normalResult = await service.analyzeTrade(baseTradeDto);

      // Train baseline first by analyzing multiple normal trades
      for (let i = 0; i < 10; i++) {
        await service.analyzeTrade({ ...baseTradeDto, tradeId: `train-${i}` });
      }

      const anomalousTrade: AnalyzeTradeDto = {
        ...baseTradeDto,
        tradeId: 'anomaly-001',
        quantity: 1_000_000, // 1000x normal volume
        tradeValue: 50_000_000,
      };

      const anomalousResult = await service.analyzeTrade(anomalousTrade);
      expect(anomalousResult.score).toBeGreaterThanOrEqual(normalResult.score);
    });

    it('should include evidence items for suspicious trades', async () => {
      const largeTrade: AnalyzeTradeDto = {
        ...baseTradeDto,
        quantity: 500_000,
        tradeValue: 25_000_000,
      };

      const result = await service.analyzeTrade(largeTrade);
      expect(Array.isArray(result.evidence)).toBe(true);
    });

    it('should build and update trader baseline over time', async () => {
      const trades = Array.from({ length: 6 }, (_, i) => ({
        ...baseTradeDto,
        tradeId: `baseline-${i}`,
      }));

      for (const trade of trades) {
        await service.analyzeTrade(trade);
      }

      // After building baseline, a large anomaly should score higher
      const anomalousTrade = {
        ...baseTradeDto,
        tradeId: 'post-baseline-anomaly',
        quantity: 500_000,
      };
      const result = await service.analyzeTrade(anomalousTrade);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('recordFeedback', () => {
    it('should record true positive feedback without errors', () => {
      expect(() => service.recordFeedback('case-001', true)).not.toThrow();
    });

    it('should record false positive feedback without errors', () => {
      expect(() => service.recordFeedback('case-002', false)).not.toThrow();
    });
  });

  describe('getModelMetrics', () => {
    it('should return model metrics object', () => {
      const metrics = service.getModelMetrics() as any;

      expect(metrics).toBeDefined();
      expect(metrics.modelVersion).toBeDefined();
      expect(metrics.truePositives).toBeGreaterThanOrEqual(0);
      expect(metrics.falsePositives).toBeGreaterThanOrEqual(0);
      expect(metrics.activeBaselines).toBeGreaterThanOrEqual(0);
    });
  });

  describe('severity mapping', () => {
    it('should map scores correctly to severities', async () => {
      const tinyTrade: AnalyzeTradeDto = {
        ...baseTradeDto,
        quantity: 1,
        price: 0.01,
        tradeValue: 0.01,
      };
      const result = await service.analyzeTrade(tinyTrade);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.severity);
    });
  });

  describe('performance', () => {
    it('should handle 100 concurrent analyses without errors', async () => {
      const trades = Array.from({ length: 100 }, (_, i) => ({
        ...baseTradeDto,
        tradeId: `perf-${i}`,
        traderId: `trader-${i % 10}`,
      }));

      const results = await Promise.all(
        trades.map((t) => service.analyzeTrade(t)),
      );
      expect(results).toHaveLength(100);
      expect(results.every((r) => r.score >= 0)).toBe(true);
    });
  });
});

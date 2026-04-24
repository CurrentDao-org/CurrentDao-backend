import { Test, TestingModule } from '@nestjs/testing';
import { MatchingAnalyticsService } from './matching-analytics.service';
import { Match, MatchStatus, MatchType } from '../entities/match.entity';

describe('MatchingAnalyticsService', () => {
  let service: MatchingAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchingAnalyticsService],
    }).compile();

    service = module.get<MatchingAnalyticsService>(MatchingAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordMatching', () => {
    it('should record matching operation', () => {
      const matches: Match[] = [
        {
          id: 'match1',
          buyerOrderId: 'buy1',
          sellerOrderId: 'sell1',
          matchedQuantity: 100,
          matchedPrice: 50,
          status: MatchStatus.PENDING,
          type: MatchType.FULL,
          matchingScore: 0.9,
          metadata: { algorithm: 'FIFO' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      service.recordMatching(2, 1, 50, 'FIFO', matches);

      const metrics = service.getCurrentMetrics();

      expect(metrics.totalOrdersProcessed).toBe(2);
      expect(metrics.totalMatchesCreated).toBe(1);
    });
  });

  describe('recordOrder', () => {
    it('should record order submission', () => {
      const order = {
        id: 'order1',
        type: 'buy' as const,
        quantity: 100,
        price: 50,
        energyType: 'solar',
        location: 'US',
        userId: 'user1',
        status: 'pending',
        createdAt: new Date(),
        priority: 0,
        isRenewable: true,
      };

      service.recordOrder(order);

      const metrics = service.getCurrentMetrics();

      expect(metrics).toBeDefined();
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return current metrics', () => {
      const metrics = service.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.totalOrdersProcessed).toBeGreaterThanOrEqual(0);
      expect(metrics.totalMatchesCreated).toBeGreaterThanOrEqual(0);
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getEfficiencyMetrics', () => {
    it('should return efficiency metrics', () => {
      const efficiency = service.getEfficiencyMetrics();

      expect(efficiency).toBeDefined();
      expect(efficiency.latencyEfficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.throughputEfficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.fillRateEfficiency).toBeGreaterThanOrEqual(0);
      expect(efficiency.overallEfficiency).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateReport', () => {
    it('should generate analytics report', () => {
      const startTime = Date.now() - 3600000; // 1 hour ago
      const endTime = Date.now();

      const report = service.generateReport(startTime, endTime);

      expect(report).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.byAlgorithm).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset analytics counters', () => {
      service.recordMatching(10, 5, 100, 'FIFO', []);
      service.reset();

      const metrics = service.getCurrentMetrics();

      expect(metrics.totalOrdersProcessed).toBe(0);
      expect(metrics.totalMatchesCreated).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return service statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.targetLatencyUs).toBe(100);
      expect(stats.targetThroughput).toBe(100000);
      expect(stats.targetFillRate).toBe(0.7);
      expect(stats.description).toBeDefined();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { FIFOAlgorithmService } from './fifo-algorithm.service';
import { MatchingRule } from '../entities/matching-rule.entity';
import { MatchingPreferencesDto, MatchingStrategy } from '../dto/matching-preferences.dto';

describe('FIFOAlgorithmService', () => {
  let service: FIFOAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FIFOAlgorithmService],
    }).compile();

    service = module.get<FIFOAlgorithmService>(FIFOAlgorithmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMatches', () => {
    it('should match orders in FIFO order', async () => {
      const buyOrders = [
        {
          id: 'buy1',
          type: 'buy' as const,
          quantity: 100,
          price: 50,
          energyType: 'solar',
          location: 'US',
          userId: 'user1',
          status: 'pending',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          priority: 0,
          isRenewable: true,
        },
        {
          id: 'buy2',
          type: 'buy' as const,
          quantity: 200,
          price: 55,
          energyType: 'solar',
          location: 'US',
          userId: 'user2',
          status: 'pending',
          createdAt: new Date('2024-01-01T11:00:00Z'),
          priority: 0,
          isRenewable: true,
        },
      ];

      const sellOrders = [
        {
          id: 'sell1',
          type: 'sell' as const,
          quantity: 100,
          price: 45,
          energyType: 'solar',
          location: 'US',
          userId: 'user3',
          status: 'pending',
          createdAt: new Date('2024-01-01T10:30:00Z'),
          priority: 0,
          isRenewable: true,
        },
      ];

      const rules: MatchingRule[] = [];
      const preferences: MatchingPreferencesDto = {
        strategy: MatchingStrategy.PRICE_FIRST,
        price: { priceTolerance: 10 },
      };

      const result = await service.findMatches(buyOrders, sellOrders, rules, preferences);

      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.matchRate).toBeGreaterThanOrEqual(0);
    });

    it('should return empty matches when no compatible orders', async () => {
      const buyOrders = [
        {
          id: 'buy1',
          type: 'buy' as const,
          quantity: 100,
          price: 30,
          energyType: 'solar',
          location: 'US',
          userId: 'user1',
          status: 'pending',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          priority: 0,
          isRenewable: true,
        },
      ];

      const sellOrders = [
        {
          id: 'sell1',
          type: 'sell' as const,
          quantity: 100,
          price: 100,
          energyType: 'solar',
          location: 'US',
          userId: 'user3',
          status: 'pending',
          createdAt: new Date('2024-01-01T10:30:00Z'),
          priority: 0,
          isRenewable: true,
        },
      ];

      const rules: MatchingRule[] = [];
      const preferences: MatchingPreferencesDto = {
        strategy: MatchingStrategy.PRICE_FIRST,
        price: { priceTolerance: 10 },
      };

      const result = await service.findMatches(buyOrders, sellOrders, rules, preferences);

      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBe(0);
    });

    it('should process orders with microsecond latency', async () => {
      const buyOrders = [
        {
          id: 'buy1',
          type: 'buy' as const,
          quantity: 100,
          price: 50,
          energyType: 'solar',
          location: 'US',
          userId: 'user1',
          status: 'pending',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          priority: 0,
          isRenewable: true,
        },
      ];

      const sellOrders = [
        {
          id: 'sell1',
          type: 'sell' as const,
          quantity: 100,
          price: 45,
          energyType: 'solar',
          location: 'US',
          userId: 'user3',
          status: 'pending',
          createdAt: new Date('2024-01-01T10:30:00Z'),
          priority: 0,
          isRenewable: true,
        },
      ];

      const rules: MatchingRule[] = [];
      const preferences: MatchingPreferencesDto = {
        strategy: MatchingStrategy.PRICE_FIRST,
        price: { priceTolerance: 10 },
      };

      const result = await service.findMatches(buyOrders, sellOrders, rules, preferences);

      expect(result.processingTime).toBeLessThan(1000); // Less than 1ms
    });
  });

  describe('getStatistics', () => {
    it('should return algorithm statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.algorithm).toBe('FIFO');
      expect(stats.targetLatencyUs).toBe(100);
      expect(stats.targetThroughput).toBe(100000);
      expect(stats.description).toBeDefined();
    });
  });
});

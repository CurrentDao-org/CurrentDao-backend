import { Test, TestingModule } from '@nestjs/testing';
import { ProRataAlgorithmService } from './pro-rata-algorithm.service';
import { MatchingRule } from '../entities/matching-rule.entity';
import { MatchingPreferencesDto, MatchingStrategy } from '../dto/matching-preferences.dto';

describe('ProRataAlgorithmService', () => {
  let service: ProRataAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProRataAlgorithmService],
    }).compile();

    service = module.get<ProRataAlgorithmService>(ProRataAlgorithmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMatches', () => {
    it('should match orders with pro-rata allocation', async () => {
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
          price: 50,
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
          quantity: 150,
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
      expect(result.allocationDetails).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should provide allocation details', async () => {
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

      expect(result.allocationDetails).toBeDefined();
      expect(result.allocationDetails.length).toBeGreaterThan(0);
    });
  });

  describe('getStatistics', () => {
    it('should return algorithm statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.algorithm).toBe('PRO_RATA');
      expect(stats.targetLatencyUs).toBe(100);
      expect(stats.targetThroughput).toBe(100000);
      expect(stats.description).toBeDefined();
    });
  });
});

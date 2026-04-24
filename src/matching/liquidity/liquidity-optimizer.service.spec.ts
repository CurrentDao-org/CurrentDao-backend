import { Test, TestingModule } from '@nestjs/testing';
import { LiquidityOptimizerService } from './liquidity-optimizer.service';
import { MatchingPreferencesDto, MatchingStrategy } from '../dto/matching-preferences.dto';

describe('LiquidityOptimizerService', () => {
  let service: LiquidityOptimizerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiquidityOptimizerService],
    }).compile();

    service = module.get<LiquidityOptimizerService>(LiquidityOptimizerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeLiquidity', () => {
    it('should optimize order liquidity', async () => {
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

      const preferences: MatchingPreferencesDto = {
        strategy: MatchingStrategy.PRICE_FIRST,
        price: { priceTolerance: 10 },
      };

      const result = await service.optimizeLiquidity(buyOrders, sellOrders, preferences);

      expect(result).toBeDefined();
      expect(result.optimizedBuyOrders).toBeDefined();
      expect(result.optimizedSellOrders).toBeDefined();
      expect(result.liquidityPools).toBeDefined();
      expect(result.aggregatedOrders).toBeDefined();
      expect(result.fillRateImprovement).toBeGreaterThanOrEqual(0);
      expect(result.liquidityScore).toBeGreaterThanOrEqual(0);
    });

    it('should create liquidity pools', async () => {
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

      const preferences: MatchingPreferencesDto = {
        strategy: MatchingStrategy.PRICE_FIRST,
        price: { priceTolerance: 10 },
      };

      const result = await service.optimizeLiquidity(buyOrders, sellOrders, preferences);

      expect(result.liquidityPools).toBeDefined();
      expect(result.liquidityPools.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeLiquidityDepth', () => {
    it('should analyze liquidity depth', () => {
      const analysis = service.analyzeLiquidityDepth('solar', 'US');

      expect(analysis).toBeDefined();
      expect(analysis.depth).toBeGreaterThanOrEqual(0);
      expect(analysis.totalBuyQuantity).toBeGreaterThanOrEqual(0);
      expect(analysis.totalSellQuantity).toBeGreaterThanOrEqual(0);
      expect(analysis.liquidityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getStatistics', () => {
    it('should return optimizer statistics', () => {
      const stats = service.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.targetFillImprovement).toBe(30);
      expect(stats.cacheTtl).toBe(5000);
      expect(stats.description).toBeDefined();
    });
  });
});

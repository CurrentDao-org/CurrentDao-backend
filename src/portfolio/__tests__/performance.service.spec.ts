import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceService } from '../analytics/performance.service';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { PortfolioPerformanceEntity } from '../entities/portfolio-performance.entity';
import { PerformanceAnalyticsDto } from '../dto/analytics.dto';

describe('PerformanceService', () => {
  let service: PerformanceService;
  let portfolioRepository: Repository<PortfolioEntity>;
  let positionRepository: Repository<PositionEntity>;
  let transactionRepository: Repository<TransactionEntity>;
  let performanceRepository: Repository<PortfolioPerformanceEntity>;

  const mockPortfolio: PortfolioEntity = {
    id: 'test-portfolio-id',
    userId: 'test-user-id',
    name: 'Test Portfolio',
    totalValue: 10000,
    initialValue: 5000,
    currency: 'USD',
    status: 'ACTIVE',
    riskTolerance: 'MEDIUM',
    createdAt: new Date(),
    updatedAt: new Date(),
    positions: [],
    lastRebalancedAt: null,
    metadata: {},
    autoRebalance: false,
    rebalanceThreshold: 5.0,
    investmentObjective: 'Growth',
    description: 'Test portfolio',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceService,
        {
          provide: getRepositoryToken(PortfolioEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PositionEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PortfolioPerformanceEntity),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PerformanceService>(PerformanceService);
    portfolioRepository = module.get<Repository<PortfolioEntity>>(getRepositoryToken(PortfolioEntity));
    positionRepository = module.get<Repository<PositionEntity>>(getRepositoryToken(PositionEntity));
    transactionRepository = module.get<Repository<TransactionEntity>>(getRepositoryToken(TransactionEntity));
    performanceRepository = module.get<Repository<PortfolioPerformanceEntity>>(getRepositoryToken(PortfolioPerformanceEntity));
  });

  describe('getPerformanceAnalytics', () => {
    it('should return performance analytics for valid portfolio', async () => {
      const analyticsDto: PerformanceAnalyticsDto = {
        portfolioId: 'test-portfolio-id',
        includeRiskMetrics: true,
        includeAttribution: false,
      };

      jest.spyOn(portfolioRepository, 'findOne').mockResolvedValue(mockPortfolio);
      jest.spyOn(service, 'calculatePerformanceMetrics' as any).mockResolvedValue({
        totalReturn: 0.15,
        annualizedReturn: 0.12,
        volatility: 0.18,
        sharpeRatio: 0.67,
        maxDrawdown: 0.08,
      });

      const result = await service.getPerformanceAnalytics('test-portfolio-id', analyticsDto);

      expect(result).toHaveProperty('portfolioId', 'test-portfolio-id');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('riskMetrics');
      expect(result.performance).toHaveProperty('totalReturn');
      expect(result.performance).toHaveProperty('sharpeRatio');
    });

    it('should throw NotFoundException for invalid portfolio', async () => {
      const analyticsDto: PerformanceAnalyticsDto = {
        portfolioId: 'invalid-id',
      };

      jest.spyOn(portfolioRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPerformanceAnalytics('invalid-id', analyticsDto))
        .rejects.toThrow('Portfolio with ID invalid-id not found');
    });
  });

  describe('getPerformanceSummary', () => {
    it('should return performance summary', async () => {
      const mockPositions = [
        {
          marketValue: 6000,
          quantity: 100,
          averageCost: 50,
          unrealizedPnl: 1000,
          asset: { id: 'asset-1' },
        },
        {
          marketValue: 4000,
          quantity: 50,
          averageCost: 60,
          unrealizedPnl: 1000,
          asset: { id: 'asset-2' },
        },
      ];

      jest.spyOn(portfolioRepository, 'findOne').mockResolvedValue(mockPortfolio);
      jest.spyOn(positionRepository, 'find').mockResolvedValue(mockPositions as any);
      jest.spyOn(service, 'getTotalRealizedPnL' as any).mockResolvedValue(500);
      jest.spyOn(service, 'calculateTimeWeightedReturn' as any).mockResolvedValue(0.15);
      jest.spyOn(service, 'calculateMoneyWeightedReturn' as any).mockResolvedValue(0.12);

      const result = await service.getPerformanceSummary('test-portfolio-id');

      expect(result).toHaveProperty('portfolioId', 'test-portfolio-id');
      expect(result).toHaveProperty('totalValue', 10000);
      expect(result).toHaveProperty('totalReturn', 5000);
      expect(result).toHaveProperty('totalReturnPercent', 100);
      expect(result).toHaveProperty('unrealizedPnL', 2000);
      expect(result).toHaveProperty('realizedPnL', 500);
    });
  });

  describe('calculateDailyReturns', () => {
    it('should calculate daily returns correctly', async () => {
      const mockPerformanceData = [
        { date: new Date('2023-01-01'), totalValue: 10000 },
        { date: new Date('2023-01-02'), totalValue: 10200 },
        { date: new Date('2023-01-03'), totalValue: 10100 },
      ];

      jest.spyOn(portfolioRepository, 'findOne').mockResolvedValue(mockPortfolio);
      jest.spyOn(performanceRepository, 'find').mockResolvedValue(mockPerformanceData as any);

      const result = await service.calculateDailyReturns(
        'test-portfolio-id',
        new Date('2023-01-01'),
        new Date('2023-01-03')
      );

      expect(result).toHaveLength(3);
      expect(result[0].dailyReturn).toBe(0);
      expect(result[1].dailyReturn).toBe(0.02);
      expect(result[2].dailyReturn).toBe(-0.0098);
    });
  });
});

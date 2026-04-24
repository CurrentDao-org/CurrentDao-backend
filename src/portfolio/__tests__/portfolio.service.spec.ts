import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PortfolioService } from '../portfolio.service';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { AssetEntity } from '../entities/asset.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { PortfolioPerformanceEntity } from '../entities/portfolio-performance.entity';
import { CreatePortfolioDto, UpdatePortfolioDto } from '../dto/portfolio.dto';
import { CreatePositionDto, UpdatePositionDto } from '../dto/position.dto';
import { CreateTransactionDto } from '../dto/transaction.dto';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let portfolioRepository: Repository<PortfolioEntity>;
  let positionRepository: Repository<PositionEntity>;
  let assetRepository: Repository<AssetEntity>;
  let transactionRepository: Repository<TransactionEntity>;
  let dataSource: DataSource;

  const mockPortfolio: PortfolioEntity = {
    id: 'test-portfolio-id',
    userId: 'test-user-id',
    name: 'Test Portfolio',
    description: 'Test Description',
    totalValue: 10000,
    initialValue: 5000,
    currency: 'USD',
    status: 'ACTIVE',
    riskTolerance: 'MEDIUM',
    investmentObjective: 'Growth',
    autoRebalance: false,
    rebalanceThreshold: 5.0,
    positions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAsset: AssetEntity = {
    id: 'test-asset-id',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetType: 'STOCK',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    currency: 'USD',
    currentPrice: 150,
    marketCap: 2500000000000,
    volume: 50000000,
    dividendYield: 0.5,
    peRatio: 25,
    beta: 1.2,
    volatility: 0.25,
    exchange: 'NASDAQ',
    isActive: true,
    lastPriceUpdate: new Date(),
    positions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPosition: PositionEntity = {
    id: 'test-position-id',
    portfolioId: 'test-portfolio-id',
    assetId: 'test-asset-id',
    quantity: 100,
    averageCost: 120,
    currentPrice: 150,
    marketValue: 15000,
    unrealizedPnl: 3000,
    unrealizedPnlPercent: 25,
    realizedPnl: 0,
    lastPriceUpdate: new Date(),
    status: 'ACTIVE',
    allocationTarget: 50,
    portfolio: mockPortfolio,
    asset: mockAsset,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortfolioService,
        {
          provide: getRepositoryToken(PortfolioEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PositionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AssetEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PortfolioPerformanceEntity),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    portfolioRepository = module.get<Repository<PortfolioEntity>>(getRepositoryToken(PortfolioEntity));
    positionRepository = module.get<Repository<PositionEntity>>(getRepositoryToken(PositionEntity));
    assetRepository = module.get<Repository<AssetEntity>>(getRepositoryToken(AssetEntity));
    transactionRepository = module.get<Repository<TransactionEntity>>(getRepositoryToken(TransactionEntity));
    dataSource = module.get<DataSource>(DataSource);
  });

  describe('createPortfolio', () => {
    it('should create a new portfolio successfully', async () => {
      const createPortfolioDto: CreatePortfolioDto = {
        userId: 'test-user-id',
        name: 'Test Portfolio',
        description: 'Test Description',
        initialValue: 5000,
        currency: 'USD',
        riskTolerance: 'MEDIUM',
        investmentObjective: 'Growth',
      };

      jest.spyOn(portfolioRepository, 'create').mockReturnValue(mockPortfolio);
      jest.spyOn(portfolioRepository, 'save').mockResolvedValue(mockPortfolio);

      const result = await service.createPortfolio(createPortfolioDto);

      expect(portfolioRepository.create).toHaveBeenCalledWith(createPortfolioDto);
      expect(portfolioRepository.save).toHaveBeenCalledWith(mockPortfolio);
      expect(result).toEqual(mockPortfolio);
    });
  });

  describe('getPortfolio', () => {
    it('should return portfolio when found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockPortfolio),
      };

      jest.spyOn(portfolioRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);

      const result = await service.getPortfolio('test-portfolio-id');

      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('portfolio.positions', 'positions');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('positions.asset', 'asset');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('portfolio.id = :id', { id: 'test-portfolio-id' });
      expect(result).toEqual(mockPortfolio);
    });

    it('should throw NotFoundException when portfolio not found', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      jest.spyOn(portfolioRepository, 'createQueryBuilder').mockReturnValue(mockQueryBuilder);

      await expect(service.getPortfolio('invalid-id')).rejects.toThrow('Portfolio with ID invalid-id not found');
    });
  });

  describe('addPosition', () => {
    it('should add position to portfolio successfully', async () => {
      const createPositionDto: CreatePositionDto = {
        portfolioId: 'test-portfolio-id',
        assetId: 'test-asset-id',
        quantity: 100,
        averageCost: 120,
        allocationTarget: 50,
      };

      jest.spyOn(service, 'getPortfolio').mockResolvedValue(mockPortfolio);
      jest.spyOn(assetRepository, 'findOne').mockResolvedValue(mockAsset);
      jest.spyOn(positionRepository, 'create').mockReturnValue(mockPosition);
      jest.spyOn(positionRepository, 'save').mockResolvedValue(mockPosition);
      jest.spyOn(service, 'updatePortfolioValue' as any).mockResolvedValue(undefined);

      const result = await service.addPosition('test-portfolio-id', createPositionDto);

      expect(service.getPortfolio).toHaveBeenCalledWith('test-portfolio-id');
      expect(assetRepository.findOne).toHaveBeenCalledWith({ where: { id: 'test-asset-id' } });
      expect(positionRepository.create).toHaveBeenCalledWith({
        ...createPositionDto,
        portfolioId: 'test-portfolio-id',
        currentPrice: 150,
        marketValue: 15000,
        lastPriceUpdate: expect.any(Date),
      });
      expect(result).toEqual(mockPosition);
    });

    it('should throw NotFoundException when asset not found', async () => {
      const createPositionDto: CreatePositionDto = {
        portfolioId: 'test-portfolio-id',
        assetId: 'invalid-asset-id',
        quantity: 100,
      };

      jest.spyOn(service, 'getPortfolio').mockResolvedValue(mockPortfolio);
      jest.spyOn(assetRepository, 'findOne').mockResolvedValue(null);

      await expect(service.addPosition('test-portfolio-id', createPositionDto))
        .rejects.toThrow('Asset with ID invalid-asset-id not found');
    });
  });

  describe('createTransaction', () => {
    it('should create transaction successfully', async () => {
      const createTransactionDto: CreateTransactionDto = {
        portfolioId: 'test-portfolio-id',
        assetId: 'test-asset-id',
        transactionType: 'BUY',
        quantity: 100,
        price: 150,
        totalAmount: 15000,
        fees: 10,
        taxes: 5,
      };

      const mockTransaction = {
        ...createTransactionDto,
        id: 'test-transaction-id',
        netAmount: 14985,
        date: new Date(),
        status: 'COMPLETED',
      };

      jest.spyOn(transactionRepository, 'create').mockReturnValue(mockTransaction);
      jest.spyOn(transactionRepository, 'save').mockResolvedValue(mockTransaction);
      jest.spyOn(service, 'updatePositionFromTransaction' as any).mockResolvedValue(undefined);
      jest.spyOn(service, 'updatePortfolioValue' as any).mockResolvedValue(undefined);

      const result = await service.createTransaction('test-portfolio-id', createTransactionDto);

      expect(transactionRepository.create).toHaveBeenCalledWith({
        ...createTransactionDto,
        portfolioId: 'test-portfolio-id',
        netAmount: 14985,
      });
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('rebalancePortfolio', () => {
    it('should rebalance portfolio successfully', async () => {
      const rebalanceRequest = {
        targetAllocations: [
          { assetId: 'test-asset-id', targetPercentage: 60 },
        ],
        threshold: 5.0,
        executeTrades: false,
      };

      jest.spyOn(service, 'getPortfolio').mockResolvedValue(mockPortfolio);
      jest.spyOn(positionRepository, 'find').mockResolvedValue([mockPosition]);

      const result = await service.rebalancePortfolio('test-portfolio-id', rebalanceRequest);

      expect(result).toHaveProperty('rebalancedPositions');
      expect(result).toHaveProperty('trades');
      expect(Array.isArray(result.trades)).toBe(true);
    });
  });

  describe('getPortfolioSnapshot', () => {
    it('should return portfolio snapshot with all components', async () => {
      const snapshotDto = {
        includePositions: true,
        includePerformance: true,
        includeAllocation: true,
        includeRisk: false,
      };

      jest.spyOn(service, 'getPortfolio').mockResolvedValue(mockPortfolio);
      jest.spyOn(service, 'getRecentPerformance' as any).mockResolvedValue([]);
      jest.spyOn(service, 'getAllocationData' as any).mockResolvedValue({});

      const result = await service.getPortfolioSnapshot('test-portfolio-id', snapshotDto);

      expect(result).toHaveProperty('portfolio');
      expect(result).toHaveProperty('positions');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('allocation');
      expect(result).toHaveProperty('timestamp');
    });
  });
});

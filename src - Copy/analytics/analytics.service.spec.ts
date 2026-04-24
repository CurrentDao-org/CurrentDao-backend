import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsData,
  AnalyticsType,
  AggregationPeriod,
} from './entities/analytics-data.entity';
import { ReportParamsDto } from './dto/report-params.dto';
import { TradingVolumeReport } from './reports/trading-volume.report';
import { PriceTrendsReport } from './reports/price-trends.report';
import { UserPerformanceReport } from './reports/user-performance.report';
import { MarketEfficiencyReport } from './reports/market-efficiency.report';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repository: Repository<AnalyticsData>;
  let tradingVolumeReport: TradingVolumeReport;
  let priceTrendsReport: PriceTrendsReport;
  let userPerformanceReport: UserPerformanceReport;
  let marketEfficiencyReport: MarketEfficiencyReport;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockTradingVolumeReport = {
    generateReport: jest.fn(),
  };

  const mockPriceTrendsReport = {
    generateReport: jest.fn(),
  };

  const mockUserPerformanceReport = {
    generateReport: jest.fn(),
  };

  const mockMarketEfficiencyReport = {
    generateReport: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(AnalyticsData),
          useValue: mockRepository,
        },
        {
          provide: TradingVolumeReport,
          useValue: mockTradingVolumeReport,
        },
        {
          provide: PriceTrendsReport,
          useValue: mockPriceTrendsReport,
        },
        {
          provide: UserPerformanceReport,
          useValue: mockUserPerformanceReport,
        },
        {
          provide: MarketEfficiencyReport,
          useValue: mockMarketEfficiencyReport,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    repository = module.get<Repository<AnalyticsData>>(
      getRepositoryToken(AnalyticsData),
    );
    tradingVolumeReport = module.get<TradingVolumeReport>(TradingVolumeReport);
    priceTrendsReport = module.get<PriceTrendsReport>(PriceTrendsReport);
    userPerformanceReport = module.get<UserPerformanceReport>(
      UserPerformanceReport,
    );
    marketEfficiencyReport = module.get<MarketEfficiencyReport>(
      MarketEfficiencyReport,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateTradingVolumeReport', () => {
    it('should generate trading volume report', async () => {
      const params: ReportParamsDto = {
        type: AnalyticsType.TRADING_VOLUME,
        period: AggregationPeriod.DAILY,
      };

      const expectedReport = {
        period: {
          start: new Date(),
          end: new Date(),
          aggregation: 'daily',
        },
        summary: {
          totalVolume: 1000,
          totalValue: 50000,
          totalTransactions: 100,
          averageTransactionSize: 500,
          peakVolume: 150,
          peakVolumeTime: new Date(),
          growthRate: 5.2,
        },
        data: [],
      };

      mockTradingVolumeReport.generateReport.mockResolvedValue(expectedReport);

      const result = await service.generateTradingVolumeReport(params);

      expect(result).toEqual(expectedReport);
      expect(mockTradingVolumeReport.generateReport).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('generatePriceTrendsReport', () => {
    it('should generate price trends report', async () => {
      const params: ReportParamsDto = {
        type: AnalyticsType.PRICE_TREND,
        period: AggregationPeriod.DAILY,
      };

      const expectedReport = {
        period: {
          start: new Date(),
          end: new Date(),
          aggregation: 'daily',
        },
        summary: {
          currentPrice: 50.25,
          priceChange: 2.15,
          priceChangePercent: 4.47,
          volatility: 0.15,
          averagePrice: 48.5,
          highestPrice: 52.0,
          lowestPrice: 45.75,
          trend: 'BULLISH',
        },
        data: [],
      };

      mockPriceTrendsReport.generateReport.mockResolvedValue(expectedReport);

      const result = await service.generatePriceTrendsReport(params);

      expect(result).toEqual(expectedReport);
      expect(mockPriceTrendsReport.generateReport).toHaveBeenCalledWith(params);
    });
  });

  describe('generateUserPerformanceReport', () => {
    it('should generate user performance report', async () => {
      const params: ReportParamsDto = {
        type: AnalyticsType.USER_PERFORMANCE,
        period: AggregationPeriod.DAILY,
        userId: 'user-123',
      };

      const expectedReport = {
        period: {
          start: new Date(),
          end: new Date(),
          aggregation: 'daily',
        },
        userMetrics: {
          userId: 'user-123',
          totalTrades: 50,
          totalVolume: 5000,
          totalValue: 250000,
          profitLoss: 15000,
          profitLossPercent: 6.0,
          winRate: 65.0,
          averageTradeSize: 5000,
          averageProfitPerTrade: 300,
          riskAdjustedReturn: 1.25,
          sharpeRatio: 1.8,
          maxDrawdown: 8.5,
          tradingFrequency: 2.5,
          renewableEnergyTrades: 20,
          renewableEnergyPercentage: 40.0,
        },
        historicalData: [],
      };

      mockUserPerformanceReport.generateReport.mockResolvedValue(
        expectedReport,
      );

      const result = await service.generateUserPerformanceReport(params);

      expect(result).toEqual(expectedReport);
      expect(mockUserPerformanceReport.generateReport).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('generateMarketEfficiencyReport', () => {
    it('should generate market efficiency report', async () => {
      const params: ReportParamsDto = {
        type: AnalyticsType.MARKET_EFFICIENCY,
        period: AggregationPeriod.DAILY,
      };

      const expectedReport = {
        period: {
          start: new Date(),
          end: new Date(),
          aggregation: 'daily',
        },
        summary: {
          averageSpread: 0.025,
          averageVolatility: 0.15,
          averageLiquidity: 7.5,
          marketEfficiencyScore: 75.2,
          priceDiscoveryEfficiency: 82.1,
          informationAsymmetry: 17.9,
        },
        metrics: [],
      };

      mockMarketEfficiencyReport.generateReport.mockResolvedValue(
        expectedReport,
      );

      const result = await service.generateMarketEfficiencyReport(params);

      expect(result).toEqual(expectedReport);
      expect(mockMarketEfficiencyReport.generateReport).toHaveBeenCalledWith(
        params,
      );
    });
  });

  describe('storeAnalyticsData', () => {
    it('should store analytics data', async () => {
      const analyticsData = {
        type: AnalyticsType.TRADING_VOLUME,
        period: AggregationPeriod.DAILY,
        timestamp: new Date(),
        data: { volume: 100, value: 5000 },
      };

      const expectedStoredData = { id: 'analytics-id', ...analyticsData };
      mockRepository.create.mockReturnValue(expectedStoredData);
      mockRepository.save.mockResolvedValue(expectedStoredData);

      const result = await service.storeAnalyticsData(analyticsData);

      expect(result).toEqual(expectedStoredData);
      expect(mockRepository.create).toHaveBeenCalledWith(analyticsData);
      expect(mockRepository.save).toHaveBeenCalledWith(expectedStoredData);
    });
  });

  describe('exportReport', () => {
    it('should export report as JSON', async () => {
      const reportData = { summary: { totalVolume: 1000 } };
      const expectedJson = JSON.stringify(reportData, null, 2);

      const result = await service.exportReport(reportData, 'json');

      expect(result).toBe(expectedJson);
    });

    it('should export report as CSV', async () => {
      const reportData = { summary: { totalVolume: 1000, totalValue: 5000 } };

      const result = await service.exportReport(reportData, 'csv');

      expect(typeof result).toBe('string');
      expect(result).toContain('summary');
    });

    it('should export report as PDF', async () => {
      const reportData = { summary: { totalVolume: 1000 } };

      const result = await service.exportReport(reportData, 'pdf');

      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('should throw error for unsupported format', async () => {
      const reportData = { summary: { totalVolume: 1000 } };

      await expect(
        service.exportReport(reportData, 'xml' as any),
      ).rejects.toThrow('Unsupported format: xml');
    });
  });
});

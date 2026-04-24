import { Test, TestingModule } from '@nestjs/testing';
import { RealTimeMonitorService } from './real-time-monitor.service';
import { FraudMlService } from '../ml/fraud-ml.service';
import { PatternRecognitionService } from '../patterns/pattern-recognition.service';
import { SuspiciousActivityService } from '../reporting/suspicious-activity.service';
import { FraudPreventionService } from '../prevention/fraud-prevention.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  FraudCaseEntity,
  FraudCaseStatus,
  FraudSeverity,
} from '../entities/fraud-case.entity';
import { AnalyzeTradeDto } from '../dto/fraud-alert.dto';

describe('RealTimeMonitorService', () => {
  let service: RealTimeMonitorService;

  const mockRepository = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn().mockImplementation((d) => d),
    save: jest
      .fn()
      .mockImplementation((d) => Promise.resolve({ ...d, id: 'case-id-1' })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(0),
  };

  const mockMlService = {
    analyzeTrade: jest.fn().mockResolvedValue({
      score: 0.3,
      severity: FraudSeverity.LOW,
      features: {},
      topContributors: [],
      evidence: [],
      processingTimeMs: 5,
    }),
    getModelMetrics: jest.fn().mockReturnValue({}),
    recordFeedback: jest.fn(),
  };

  const mockPatternService = {
    analyzePatterns: jest.fn().mockReturnValue([]),
    getMatchedPatterns: jest.fn().mockReturnValue([]),
    inferFraudTypes: jest.fn().mockReturnValue([]),
    getAllPatternDefinitions: jest.fn().mockReturnValue([]),
  };

  const mockReportingService = {
    generateSAR: jest.fn().mockResolvedValue({ sarReference: 'SAR-TEST-001' }),
    queryCases: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    getCaseById: jest.fn().mockResolvedValue(null),
    updateCase: jest.fn().mockResolvedValue(null),
    getMetrics: jest.fn().mockResolvedValue({}),
    getCaseByCaseId: jest.fn().mockResolvedValue(null),
    getCasesByTrader: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    generateSARById: jest.fn().mockResolvedValue(null),
  };

  const mockPreventionService = {
    preTradeCheck: jest.fn().mockResolvedValue({
      allowed: true,
      riskScore: 0,
      reasons: [],
      recommendedAction: 'allow',
    }),
    blockTrader: jest.fn(),
    unblockTrader: jest.fn().mockReturnValue(true),
    isTraderBlocked: jest.fn().mockReturnValue(false),
    getBlockedTraders: jest.fn().mockReturnValue([]),
    addToWhitelist: jest.fn(),
    removeFromWhitelist: jest.fn(),
    getWhitelist: jest.fn().mockReturnValue([]),
    getPreventionStats: jest.fn().mockReturnValue({}),
    applyPreventionForCase: jest.fn().mockResolvedValue(undefined),
  };

  const baseTrade: AnalyzeTradeDto = {
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
        RealTimeMonitorService,
        {
          provide: getRepositoryToken(FraudCaseEntity),
          useValue: mockRepository,
        },
        { provide: FraudMlService, useValue: mockMlService },
        { provide: PatternRecognitionService, useValue: mockPatternService },
        { provide: SuspiciousActivityService, useValue: mockReportingService },
        { provide: FraudPreventionService, useValue: mockPreventionService },
      ],
    }).compile();

    service = module.get<RealTimeMonitorService>(RealTimeMonitorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeIncomingTrade', () => {
    it('should return a valid analysis result', async () => {
      const result = await service.analyzeIncomingTrade(baseTrade);

      expect(result).toBeDefined();
      expect(result.tradeId).toBe(baseTrade.tradeId);
      expect(result.traderId).toBe(baseTrade.traderId);
      expect(typeof result.isSuspicious).toBe('boolean');
      expect(result.mlScore).toBeGreaterThanOrEqual(0);
      expect(result.mlScore).toBeLessThanOrEqual(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should complete within 100ms', async () => {
      const start = Date.now();
      await service.analyzeIncomingTrade(baseTrade);
      expect(Date.now() - start).toBeLessThan(100);
    });

    it('should call ML service for analysis', async () => {
      await service.analyzeIncomingTrade(baseTrade);
      expect(mockMlService.analyzeTrade).toHaveBeenCalledWith(baseTrade);
    });

    it('should call pattern recognition service', async () => {
      await service.analyzeIncomingTrade(baseTrade);
      expect(mockPatternService.analyzePatterns).toHaveBeenCalled();
    });

    it('should NOT mark low-score trade as suspicious', async () => {
      mockMlService.analyzeTrade.mockResolvedValueOnce({
        score: 0.1,
        severity: FraudSeverity.LOW,
        features: {},
        topContributors: [],
        evidence: [],
        processingTimeMs: 3,
      });

      const result = await service.analyzeIncomingTrade(baseTrade);
      expect(result.isSuspicious).toBe(false);
    });

    it('should mark high-score trade as suspicious and create case', async () => {
      mockMlService.analyzeTrade.mockResolvedValueOnce({
        score: 0.9,
        severity: FraudSeverity.CRITICAL,
        features: {},
        topContributors: ['roundTripScore'],
        evidence: [
          {
            type: 'self_trade',
            description: 'Test',
            value: 1,
            timestamp: new Date(),
          },
        ],
        processingTimeMs: 5,
      });

      mockPatternService.analyzePatterns.mockReturnValueOnce([
        {
          patternId: 'WT-001',
          patternName: 'Self-Trade',
          category: 'wash_trading',
          matched: true,
          confidence: 0.99,
          evidence: '',
        },
      ]);
      mockPatternService.inferFraudTypes.mockReturnValueOnce(['wash_trading']);

      // Mock save to return entity with caseId so result.caseId is populated
      mockRepository.save.mockResolvedValueOnce({
        ...baseTrade,
        id: 'case-id-1',
        caseId: 'FRAUD-20250328-ABCD1234',
        status: FraudCaseStatus.OPEN,
      });

      const result = await service.analyzeIncomingTrade(baseTrade);
      expect(result.isSuspicious).toBe(true);
      expect(result.caseId).toBe('FRAUD-20250328-ABCD1234');
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('trader monitoring', () => {
    it('should start monitoring for a trader', () => {
      service.startTraderMonitoring('trader-001');
      const status = service.getMonitoringStatus() as any;
      expect(status.monitoredTraderCount).toBeGreaterThanOrEqual(1);
    });

    it('should stop monitoring for a trader', () => {
      service.startTraderMonitoring('trader-stop-test');
      service.stopTraderMonitoring('trader-stop-test');
      // Trader removed from monitored map
      const status = service.getMonitoringStatus() as any;
      expect(status.monitoredTraders).not.toContain('trader-stop-test');
    });

    it('should not duplicate monitoring sessions', () => {
      service.startTraderMonitoring('trader-dup');
      service.startTraderMonitoring('trader-dup');
      const status = service.getMonitoringStatus() as any;
      const count = status.monitoredTraders.filter(
        (t: string) => t === 'trader-dup',
      ).length;
      expect(count).toBe(1);
    });
  });

  describe('global monitoring', () => {
    it('should start and stop global monitoring', () => {
      service.startGlobalMonitoring();
      let status = service.getMonitoringStatus() as any;
      expect(status.isRunning).toBe(true);

      service.stopGlobalMonitoring();
      status = service.getMonitoringStatus() as any;
      expect(status.isRunning).toBe(false);
    });

    it('should not start multiple intervals when called twice', () => {
      service.startGlobalMonitoring();
      service.startGlobalMonitoring();
      const status = service.getMonitoringStatus() as any;
      expect(status.isRunning).toBe(true);
    });
  });

  describe('getMonitoringStatus', () => {
    it('should return correct status structure', () => {
      const status = service.getMonitoringStatus() as any;

      expect(status.isRunning).toBeDefined();
      expect(status.monitoredTraderCount).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(status.monitoredTraders)).toBe(true);
      expect(status.intervalMs).toBe(15_000);
      expect(status.alertThreshold).toBeDefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clean up without errors', () => {
      service.startGlobalMonitoring();
      expect(() => service.onModuleDestroy()).not.toThrow();
    });
  });
});

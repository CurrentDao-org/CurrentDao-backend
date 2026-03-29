import { Test, TestingModule } from '@nestjs/testing';
import { SuspiciousActivityService } from './suspicious-activity.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  FraudCaseEntity,
  FraudCaseStatus,
  FraudSeverity,
  FraudType,
} from '../entities/fraud-case.entity';
import { InvestigationUpdateDto } from '../dto/fraud-alert.dto';

describe('SuspiciousActivityService', () => {
  let service: SuspiciousActivityService;

  const mockFraudCase: FraudCaseEntity = {
    id: 'uuid-001',
    caseId: 'FRAUD-20250328-ABCD1234',
    tradeId: 'trade-001',
    traderId: 'trader-001',
    counterpartyId: 'counterparty-001',
    fraudType: FraudType.WASH_TRADING,
    severity: FraudSeverity.HIGH,
    status: FraudCaseStatus.OPEN,
    mlScore: 0.82,
    patternMatched: 'Self-Trade Detection',
    patternsTriggered: ['WT-001', 'WT-002'],
    evidence: [
      {
        type: 'self_trade',
        description: 'Self-trade detected',
        value: 1,
        timestamp: new Date(),
      },
    ],
    tradeData: { market: 'EU-ETS', quantity: 1000 },
    mlFeatures: {},
    regulatoryReported: false,
    preventionApplied: false,
    preventionAction: null,
    assignedTo: null,
    investigationNotes: null,
    falsePositiveReason: null,
    resolvedBy: null,
    resolvedAt: null,
    sarReference: null,
    market: 'EU-ETS',
    assetType: 'carbon_credit',
    tradeValue: 50_000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    findOne: jest.fn().mockResolvedValue(mockFraudCase),
    find: jest.fn().mockResolvedValue([mockFraudCase]),
    findAndCount: jest.fn().mockResolvedValue([[mockFraudCase], 1]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    count: jest.fn().mockResolvedValue(5),
    create: jest.fn().mockImplementation((d) => d),
    save: jest
      .fn()
      .mockImplementation((d) => Promise.resolve({ ...d, id: 'new-id' })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuspiciousActivityService,
        {
          provide: getRepositoryToken(FraudCaseEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SuspiciousActivityService>(SuspiciousActivityService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSAR', () => {
    it('should generate SAR with correct structure', async () => {
      const sar = await service.generateSAR(mockFraudCase);

      expect(sar.sarReference).toMatch(/^SAR-/);
      expect(sar.caseId).toBe(mockFraudCase.caseId);
      expect(sar.traderId).toBe(mockFraudCase.traderId);
      expect(sar.fraudType).toBe(mockFraudCase.fraudType);
      expect(sar.severity).toBe(mockFraudCase.severity);
      expect(typeof sar.summary).toBe('string');
      expect(Array.isArray(sar.evidence)).toBe(true);
      expect(Array.isArray(sar.patternsMatched)).toBe(true);
      expect(typeof sar.reportingObligation).toBe('string');
      expect(Array.isArray(sar.regulatoryBodies)).toBe(true);
    });

    it('should include FinCEN in regulators by default', async () => {
      const sar = await service.generateSAR(mockFraudCase);
      expect(sar.regulatoryBodies).toContain('FinCEN');
    });

    it('should include ACER for EU markets', async () => {
      const euCase = { ...mockFraudCase, market: 'EU-ETS' };
      const sar = await service.generateSAR(euCase);
      expect(sar.regulatoryBodies).toContain('ACER');
    });

    it('should include FERC for PJM market', async () => {
      const pjmCase = { ...mockFraudCase, market: 'PJM' };
      const sar = await service.generateSAR(pjmCase);
      expect(sar.regulatoryBodies).toContain('FERC');
    });

    it('should update fraud case with SAR reference', async () => {
      await service.generateSAR(mockFraudCase);
      expect(mockRepository.update).toHaveBeenCalledWith(
        mockFraudCase.id,
        expect.objectContaining({ sarReference: expect.any(String) }),
      );
    });

    it('should mandate CRITICAL reporting obligation for critical cases', async () => {
      const criticalCase = {
        ...mockFraudCase,
        severity: FraudSeverity.CRITICAL,
      };
      const sar = await service.generateSAR(criticalCase);
      expect(sar.reportingObligation).toContain('MANDATORY');
    });
  });

  describe('generateSARById', () => {
    it('should return null when case not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.generateSARById('non-existent');
      expect(result).toBeNull();
    });

    it('should generate SAR when case exists', async () => {
      const result = await service.generateSARById(mockFraudCase.caseId);
      expect(result).not.toBeNull();
      expect(result?.caseId).toBe(mockFraudCase.caseId);
    });
  });

  describe('queryCases', () => {
    it('should return paginated results', async () => {
      const result = await service.queryCases({ page: 1, limit: 10 });

      expect(result.data).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBeDefined();
    });

    it('should pass filter options to repository', async () => {
      await service.queryCases({
        fraudType: FraudType.WASH_TRADING,
        severity: FraudSeverity.HIGH,
        status: FraudCaseStatus.OPEN,
      });

      expect(mockRepository.findAndCount).toHaveBeenCalled();
    });

    it('should apply minMlScore filter', async () => {
      mockRepository.findAndCount.mockResolvedValueOnce([
        [
          { ...mockFraudCase, mlScore: 0.9 },
          { ...mockFraudCase, mlScore: 0.3 },
        ],
        2,
      ]);

      const result = await service.queryCases({ minMlScore: 0.7 });
      expect(result.data.every((c) => Number(c.mlScore) >= 0.7)).toBe(true);
    });
  });

  describe('getCaseById', () => {
    it('should return case when found', async () => {
      const result = await service.getCaseById(mockFraudCase.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockFraudCase.id);
    });

    it('should return null when not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      const result = await service.getCaseById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateCase', () => {
    it('should update status to INVESTIGATING', async () => {
      const updateDto: InvestigationUpdateDto = {
        status: FraudCaseStatus.INVESTIGATING,
        assignedTo: 'investigator-001',
        investigationNotes: 'Under review',
      };

      await service.updateCase(mockFraudCase.id, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(
        mockFraudCase.id,
        expect.objectContaining({ status: FraudCaseStatus.INVESTIGATING }),
      );
    });

    it('should set resolvedAt when status is RESOLVED', async () => {
      const updateDto: InvestigationUpdateDto = {
        status: FraudCaseStatus.RESOLVED,
        resolvedBy: 'admin-001',
      };

      await service.updateCase(mockFraudCase.id, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(
        mockFraudCase.id,
        expect.objectContaining({ resolvedAt: expect.any(Date) }),
      );
    });

    it('should set resolvedAt when marked FALSE_POSITIVE', async () => {
      const updateDto: InvestigationUpdateDto = {
        status: FraudCaseStatus.FALSE_POSITIVE,
        falsePositiveReason: 'Normal trading behavior within policy',
      };

      await service.updateCase(mockFraudCase.id, updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith(
        mockFraudCase.id,
        expect.objectContaining({ resolvedAt: expect.any(Date) }),
      );
    });
  });

  describe('getMetrics', () => {
    it('should return metrics with all required fields', async () => {
      mockRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // open
        .mockResolvedValueOnce(60) // resolved
        .mockResolvedValueOnce(5) // false positives
        .mockResolvedValueOnce(10); // critical

      const metrics = (await service.getMetrics()) as any;

      expect(metrics.totalCases).toBeDefined();
      expect(metrics.openCases).toBeDefined();
      expect(metrics.resolvedCases).toBeDefined();
      expect(metrics.falsePositives).toBeDefined();
      expect(metrics.falsePositiveRate).toBeDefined();
      expect(metrics.detectionRate).toBeDefined();
      expect(metrics.averageMlScore).toBeDefined();
      expect(metrics.casesByType).toBeDefined();
      expect(metrics.casesBySeverity).toBeDefined();
    });

    it('should compute false positive rate correctly', async () => {
      mockRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60)
        .mockResolvedValueOnce(5) // false positives = 5/100 = 0.05
        .mockResolvedValueOnce(10);

      mockRepository.find.mockResolvedValueOnce(
        Array.from({ length: 100 }, () => ({
          ...mockFraudCase,
          mlScore: 0.75,
        })),
      );

      const metrics = (await service.getMetrics()) as any;
      expect(metrics.falsePositiveRate).toBeLessThanOrEqual(0.05); // <5% requirement
    });
  });

  describe('getCasesByTrader', () => {
    it('should return paginated trader cases', async () => {
      const result = await service.getCasesByTrader('trader-001', 1, 10);

      expect(result.data).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});

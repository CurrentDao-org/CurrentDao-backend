import { Test, TestingModule } from '@nestjs/testing';
import { RiskAssessorService } from './risk-assessor.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskDataEntity } from '../entities/risk-data.entity';
import { RiskAssessmentDto, RiskType } from '../dto/risk-assessment.dto';

describe('RiskAssessorService', () => {
  let service: RiskAssessorService;
  let repository: Repository<RiskDataEntity>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessorService,
        {
          provide: getRepositoryToken(RiskDataEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RiskAssessorService>(RiskAssessorService);
    repository = module.get<Repository<RiskDataEntity>>(getRepositoryToken(RiskDataEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assessRisk', () => {
    it('should assess market risk successfully', async () => {
      const riskAssessmentDto: RiskAssessmentDto = {
        portfolioId: 'test-portfolio',
        riskType: RiskType.MARKET,
        portfolioValue: 1000000,
        marketData: { volatility: 0.2, beta: 1.0 },
      };

      const expectedRiskData = {
        id: 'test-id',
        portfolioId: 'test-portfolio',
        riskType: RiskType.MARKET,
        riskLevel: 2,
        varValue: 0,
        varConfidence: 0.95,
        stressTestResult: {},
        hedgingStrategy: {},
        mitigationActions: {
          actions: ['Increased monitoring frequency', 'Implement basic hedging', 'Monthly review'],
          priority: 2,
          implementation: '14 days',
        },
        complianceStatus: 'pending',
        createdBy: 'risk-assessor',
      };

      mockRepository.create.mockReturnValue(expectedRiskData);
      mockRepository.save.mockResolvedValue(expectedRiskData);

      const result = await service.assessRisk(riskAssessmentDto);

      expect(result).toEqual(expectedRiskData);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should assess credit risk successfully', async () => {
      const riskAssessmentDto: RiskAssessmentDto = {
        portfolioId: 'test-portfolio',
        riskType: RiskType.CREDIT,
        portfolioValue: 1000000,
        historicalData: { defaultRate: 0.02, recoveryRate: 0.4 },
      };

      const expectedRiskData = {
        id: 'test-id',
        portfolioId: 'test-portfolio',
        riskType: RiskType.CREDIT,
        riskLevel: 2,
        varValue: 0,
        varConfidence: 0.95,
        stressTestResult: {},
        hedgingStrategy: {},
        mitigationActions: expect.any(Object),
        complianceStatus: 'pending',
        createdBy: 'risk-assessor',
      };

      mockRepository.create.mockReturnValue(expectedRiskData);
      mockRepository.save.mockResolvedValue(expectedRiskData);

      const result = await service.assessRisk(riskAssessmentDto);

      expect(result.riskType).toBe(RiskType.CREDIT);
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should handle operational risk assessment', async () => {
      const riskAssessmentDto: RiskAssessmentDto = {
        portfolioId: 'test-portfolio',
        riskType: RiskType.OPERATIONAL,
        portfolioValue: 1000000,
      };

      const expectedRiskData = {
        id: 'test-id',
        portfolioId: 'test-portfolio',
        riskType: RiskType.OPERATIONAL,
        riskLevel: expect.any(Number),
        varValue: 0,
        varConfidence: 0.95,
        stressTestResult: {},
        hedgingStrategy: {},
        mitigationActions: expect.any(Object),
        complianceStatus: 'pending',
        createdBy: 'risk-assessor',
      };

      mockRepository.create.mockReturnValue(expectedRiskData);
      mockRepository.save.mockResolvedValue(expectedRiskData);

      const result = await service.assessRisk(riskAssessmentDto);

      expect(result.riskType).toBe(RiskType.OPERATIONAL);
      expect(result.riskLevel).toBeGreaterThanOrEqual(1);
      expect(result.riskLevel).toBeLessThanOrEqual(4);
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return correct risk level for market risk', async () => {
      const riskAssessmentDto: RiskAssessmentDto = {
        portfolioId: 'test-portfolio',
        riskType: RiskType.MARKET,
        portfolioValue: 1000000,
        marketData: { volatility: 0.3, beta: 1.5 },
      };

      const riskLevel = await service['calculateRiskLevel'](riskAssessmentDto);

      expect(riskLevel).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(riskLevel);
    });

    it('should return correct risk level for credit risk', async () => {
      const riskAssessmentDto: RiskAssessmentDto = {
        portfolioId: 'test-portfolio',
        riskType: RiskType.CREDIT,
        portfolioValue: 1000000,
        historicalData: { defaultRate: 0.05, recoveryRate: 0.3 },
      };

      const riskLevel = await service['calculateRiskLevel'](riskAssessmentDto);

      expect(riskLevel).toBeDefined();
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(riskLevel);
    });
  });

  describe('getRiskAssessment', () => {
    it('should return risk assessments for portfolio', async () => {
      const portfolioId = 'test-portfolio';
      const expectedAssessments = [
        {
          id: '1',
          portfolioId,
          riskType: RiskType.MARKET,
          riskLevel: 2,
          createdAt: new Date(),
        },
        {
          id: '2',
          portfolioId,
          riskType: RiskType.CREDIT,
          riskLevel: 1,
          createdAt: new Date(),
        },
      ];

      mockRepository.find.mockResolvedValue(expectedAssessments);

      const result = await service.getRiskAssessment(portfolioId);

      expect(result).toEqual(expectedAssessments);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { portfolioId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('updateRiskAssessment', () => {
    it('should update risk assessment', async () => {
      const id = 'test-id';
      const updates = { riskLevel: 3, complianceStatus: 'approved' };
      const updatedAssessment = { id, ...updates };

      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.findOne.mockResolvedValue(updatedAssessment);

      const result = await service.updateRiskAssessment(id, updates);

      expect(result).toEqual(updatedAssessment);
      expect(mockRepository.update).toHaveBeenCalledWith(id, updates);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id } });
    });
  });

  describe('performance requirements', () => {
    it('should complete risk assessment within acceptable time', async () => {
      const riskAssessmentDto: RiskAssessmentDto = {
        portfolioId: 'test-portfolio',
        riskType: RiskType.MARKET,
        portfolioValue: 1000000,
      };

      const expectedRiskData = {
        id: 'test-id',
        portfolioId: 'test-portfolio',
        riskType: RiskType.MARKET,
        riskLevel: 2,
        varValue: 0,
        varConfidence: 0.95,
        stressTestResult: {},
        hedgingStrategy: {},
        mitigationActions: {},
        complianceStatus: 'pending',
        createdBy: 'risk-assessor',
      };

      mockRepository.create.mockReturnValue(expectedRiskData);
      mockRepository.save.mockResolvedValue(expectedRiskData);

      const startTime = Date.now();
      await service.assessRisk(riskAssessmentDto);
      const endTime = Date.now();

      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(200); // Should complete under 200ms
    });
  });
});

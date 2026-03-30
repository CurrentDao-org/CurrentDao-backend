import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PredictiveBalancerService } from './predictive-balancer.service';
import { DemandForecastService } from '../forecasting/demand-forecast.service';
import { BalancingData } from '../entities/balancing-data.entity';
import { BalancingCommand, BalancingCommandType, Priority } from '../dto/balancing-command.dto';

describe('PredictiveBalancerService', () => {
  let service: PredictiveBalancerService;
  let repository: Repository<BalancingData>;
  let demandForecastService: DemandForecastService;

  const mockBalancingData: BalancingData[] = [
    {
      id: '1',
      regionId: 'test-region',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      forecastType: 'supply',
      actualValue: 1000,
      predictedValue: 950,
      confidence: 0.85,
      metadata: {
        source: 'test',
        algorithm: 'test-algorithm',
      },
      gridFrequency: 50.0,
      voltageLevel: 1.0,
      loadFactor: 0.7,
      status: 'active',
      adjustments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockRepository = {
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    findOne: jest.fn(),
  };

  const mockDemandForecastService = {
    generateDemandForecast: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PredictiveBalancerService,
        {
          provide: getRepositoryToken(BalancingData),
          useValue: mockRepository,
        },
        {
          provide: DemandForecastService,
          useValue: mockDemandForecastService,
        },
      ],
    }).compile();

    service = module.get<PredictiveBalancerService>(PredictiveBalancerService);
    repository = module.get<Repository<BalancingData>>(getRepositoryToken(BalancingData));
    demandForecastService = module.get<DemandForecastService>(DemandForecastService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performPredictiveBalancing', () => {
    it('should perform predictive balancing successfully', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockDemandForecastService.generateDemandForecast.mockResolvedValue([
        {
          timestamp: new Date(Date.now() + 60 * 60 * 1000),
          predictedValue: 1050,
          confidence: 0.9,
          algorithm: 'linear',
          factors: ['time', 'historical_demand'],
        },
      ]);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.performPredictiveBalancing('test-region');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(demandForecastService.generateDemandForecast).toHaveBeenCalledWith('test-region', 24);
    });

    it('should handle emergency situations correctly', async () => {
      const emergencyData = [
        {
          ...mockBalancingData[0],
          gridFrequency: 49.2, // Critical under-frequency
          voltageLevel: 0.92, // Critical under-voltage
        },
      ];

      mockRepository.find.mockResolvedValue(emergencyData);
      mockDemandForecastService.generateDemandForecast.mockResolvedValue([]);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.performPredictiveBalancing('test-region');

      expect(result).toBeDefined();
      // Should include emergency actions
      expect(result.some(decision => decision.priority === 'critical')).toBe(true);
    });

    it('should generate preemptive actions for predicted peaks', async () => {
      const peakForecasts = [
        {
          timestamp: new Date(Date.now() + 3 * 60 * 60 * 1000),
          predictedValue: 1200, // High demand
          confidence: 0.85,
          algorithm: 'linear',
          factors: ['time', 'historical_demand'],
        },
      ];

      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockDemandForecastService.generateDemandForecast.mockResolvedValue(peakForecasts);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.performPredictiveBalancing('test-region');

      expect(result).toBeDefined();
      expect(result.some(decision => decision.action === 'increase_supply')).toBe(true);
    });

    it('should optimize during stable periods', async () => {
      const stableData = [
        {
          ...mockBalancingData[0],
          gridFrequency: 50.0,
          voltageLevel: 1.0,
          loadFactor: 0.6, // Low load factor
        },
      ];

      mockRepository.find.mockResolvedValue(stableData);
      mockDemandForecastService.generateDemandForecast.mockResolvedValue([]);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.performPredictiveBalancing('test-region');

      expect(result).toBeDefined();
      // Should include optimization actions
      expect(result.some(decision => decision.priority === 'low')).toBe(true);
    });
  });

  describe('getCurrentGridState', () => {
    it('should calculate grid state correctly', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);

      const gridState = await service['getCurrentGridState']('test-region');

      expect(gridState).toHaveProperty('frequency');
      expect(gridState).toHaveProperty('voltage');
      expect(gridState).toHaveProperty('loadFactor');
      expect(gridState).toHaveProperty('reserveMargin');
      expect(gridState).toHaveProperty('stabilityScore');
      expect(gridState.frequency).toBeCloseTo(50.0, 1);
      expect(gridState.voltage).toBeCloseTo(1.0, 1);
    });

    it('should return default state when no data available', async () => {
      mockRepository.find.mockResolvedValue([]);

      const gridState = await service['getCurrentGridState']('test-region');

      expect(gridState.frequency).toBe(50.0);
      expect(gridState.voltage).toBe(1.0);
      expect(gridState.stabilityScore).toBe(1.0);
    });
  });

  describe('analyzeGridStability', () => {
    it('should analyze stability correctly', async () => {
      const forecasts = [
        {
          timestamp: new Date(Date.now() + 60 * 60 * 1000),
          predictedValue: 1050,
          confidence: 0.9,
          algorithm: 'linear',
          factors: ['time'],
        },
      ];

      mockRepository.find.mockResolvedValue(mockBalancingData);

      const analysis = await service['analyzeGridStability']('test-region', forecasts);

      expect(analysis).toHaveProperty('currentStability');
      expect(analysis).toHaveProperty('predictedStability');
      expect(analysis).toHaveProperty('riskFactors');
      expect(analysis).toHaveProperty('timeToInstability');
      expect(analysis.currentStability).toBeGreaterThanOrEqual(0);
      expect(analysis.currentStability).toBeLessThanOrEqual(1);
    });

    it('should identify risk factors correctly', async () => {
      const volatileForecasts = [
        {
          timestamp: new Date(Date.now() + 60 * 60 * 1000),
          predictedValue: 800,
          confidence: 0.5, // Low confidence
          algorithm: 'linear',
          factors: ['time'],
        },
        {
          timestamp: new Date(Date.now() + 2 * 60 * 60 * 1000),
          predictedValue: 1200,
          confidence: 0.5,
          algorithm: 'linear',
          factors: ['time'],
        },
      ];

      const lowStabilityData = [
        {
          ...mockBalancingData[0],
          actualValue: 0.7, // Low stability
        },
      ];

      mockRepository.find.mockResolvedValue(lowStabilityData);

      const analysis = await service['analyzeGridStability']('test-region', volatileForecasts);

      expect(analysis.riskFactors).toContain('high_demand_volatility');
      expect(analysis.riskFactors).toContain('low_forecast_confidence');
    });
  });

  describe('generateBalancingDecisions', () => {
    it('should generate emergency actions for critical states', async () => {
      const criticalState = {
        frequency: 49.2,
        voltage: 0.92,
        loadFactor: 0.9,
        reserveMargin: 0.05,
        stabilityScore: 0.7,
        timestamp: new Date(),
      };

      const decisions = await service['generateEmergencyActions']('test-region', criticalState);

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions[0].priority).toBe('critical');
      expect(decisions[0].action).toMatch(/emergency_shed|increase_supply/);
    });

    it('should generate preemptive actions for predicted instability', async () => {
      const currentState = {
        frequency: 49.8,
        voltage: 0.98,
        loadFactor: 0.8,
        reserveMargin: 0.12,
        stabilityScore: 0.88,
        timestamp: new Date(),
      };

      const forecasts = [
        {
          timestamp: new Date(Date.now() + 3 * 60 * 60 * 1000),
          predictedValue: 1150,
          confidence: 0.8,
          algorithm: 'linear',
          factors: ['time'],
        },
      ];

      const stabilityAnalysis = {
        currentStability: 0.88,
        predictedStability: 0.85,
        riskFactors: ['high_demand_volatility'],
        timeToInstability: 4,
      };

      const decisions = await service['generatePreemptiveActions'](
        'test-region',
        currentState,
        forecasts,
        stabilityAnalysis,
      );

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions.some(d => d.priority === 'high')).toBe(true);
    });

    it('should generate optimization actions for stable periods', async () => {
      const stableState = {
        frequency: 50.0,
        voltage: 1.0,
        loadFactor: 0.6,
        reserveMargin: 0.3, // High reserve margin
        stabilityScore: 0.98,
        timestamp: new Date(),
      };

      const forecasts = [
        {
          timestamp: new Date(Date.now() + 60 * 60 * 1000),
          predictedValue: 900,
          confidence: 0.9,
          algorithm: 'linear',
          factors: ['time'],
        },
      ];

      const decisions = await service['generateOptimizationActions'](
        'test-region',
        stableState,
        forecasts,
      );

      expect(decisions.length).toBeGreaterThan(0);
      expect(decisions.some(d => d.priority === 'low')).toBe(true);
    });
  });

  describe('executeBalancingDecisions', () => {
    it('should execute decisions within response time limit', async () => {
      const decisions = [
        {
          id: 'test-decision-1',
          regionId: 'test-region',
          timestamp: new Date(),
          action: 'increase_supply' as const,
          sourceId: 'test-source',
          amount: 100,
          confidence: 0.9,
          priority: 'high' as const,
          expectedImpact: 0.7,
          duration: 30,
          reason: 'Test decision',
        },
      ];

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service['executeBalancingDecisions'](decisions);

      expect(result).toHaveLength(1);
      expect(result[0].success).toBe(true);
    });

    it('should limit concurrent decisions', async () => {
      const manyDecisions = Array.from({ length: 15 }, (_, i) => ({
        id: `test-decision-${i}`,
        regionId: 'test-region',
        timestamp: new Date(),
        action: 'increase_supply' as const,
        sourceId: `test-source-${i}`,
        amount: 50,
        confidence: 0.8,
        priority: 'medium' as const,
        expectedImpact: 0.5,
        duration: 30,
        reason: `Test decision ${i}`,
      }));

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service['executeBalancingDecisions'](manyDecisions);

      expect(result.length).toBeLessThanOrEqual(10); // Max concurrent limit
    });
  });

  describe('getBalancingMetrics', () => {
    it('should calculate balancing metrics correctly', async () => {
      const decisionData = [
        {
          ...mockBalancingData[0],
          actualValue: 0.9,
          metadata: {
            source: 'predictive_balancer',
            algorithm: 'performance_metrics',
            parameters: {
              totalDecisions: 10,
              successfulAdjustments: 8,
              averageResponseTime: 15000,
            },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(decisionData);

      const metrics = await service.getBalancingMetrics('test-region', 7);

      expect(metrics).toHaveProperty('totalDecisions');
      expect(metrics).toHaveProperty('successfulAdjustments');
      expect(metrics).toHaveProperty('preventedInstabilities');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('gridStabilityScore');
      expect(metrics.totalDecisions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.performPredictiveBalancing('test-region'))
        .rejects.toThrow('Database error');
    });

    it('should handle forecast service errors gracefully', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockDemandForecastService.generateDemandForecast.mockRejectedValue(new Error('Forecast error'));

      await expect(service.performPredictiveBalancing('test-region'))
        .rejects.toThrow('Forecast error');
    });
  });

  describe('performance', () => {
    it('should complete balancing within reasonable time', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockDemandForecastService.generateDemandForecast.mockResolvedValue([]);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const startTime = Date.now();
      await service.performPredictiveBalancing('test-region');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });
});

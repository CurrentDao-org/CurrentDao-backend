import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DemandForecastService } from './demand-forecast.service';
import { BalancingData } from '../entities/balancing-data.entity';
import { BalancingCommand, BalancingCommandType, Priority } from '../dto/balancing-command.dto';

describe('DemandForecastService', () => {
  let service: DemandForecastService;
  let repository: Repository<BalancingData>;

  const mockBalancingData: BalancingData[] = [
    {
      id: '1',
      regionId: 'test-region',
      timestamp: new Date('2024-01-01T00:00:00Z'),
      forecastType: 'demand',
      actualValue: 1000,
      predictedValue: 950,
      confidence: 0.85,
      metadata: {
        source: 'test',
        algorithm: 'test-algorithm',
        externalFactors: { temperature: 20, humidity: 50 },
      },
      gridFrequency: 50.0,
      voltageLevel: 1.0,
      loadFactor: 0.7,
      status: 'active',
      adjustments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      regionId: 'test-region',
      timestamp: new Date('2024-01-01T01:00:00Z'),
      forecastType: 'demand',
      actualValue: 950,
      predictedValue: 920,
      confidence: 0.88,
      metadata: {
        source: 'test',
        algorithm: 'test-algorithm',
        externalFactors: { temperature: 19, humidity: 52 },
      },
      gridFrequency: 49.9,
      voltageLevel: 1.01,
      loadFactor: 0.68,
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DemandForecastService,
        {
          provide: getRepositoryToken(BalancingData),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DemandForecastService>(DemandForecastService);
    repository = module.get<Repository<BalancingData>>(getRepositoryToken(BalancingData));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateDemandForecast', () => {
    it('should generate demand forecast successfully', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateDemandForecast('test-region', 24);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('predictedValue');
      expect(result[0]).toHaveProperty('confidence');
      expect(result[0]).toHaveProperty('algorithm');
      expect(result[0]).toHaveProperty('factors');
    });

    it('should throw error when insufficient historical data', async () => {
      mockRepository.find.mockResolvedValue([]);

      await expect(service.generateDemandForecast('test-region', 24))
        .rejects.toThrow('Insufficient historical data');
    });

    it('should generate forecasts with correct time horizon', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const horizon = 12;
      const result = await service.generateDemandForecast('test-region', horizon);

      expect(result).toHaveLength(horizon);
      
      const now = new Date();
      result.forEach((forecast, index) => {
        const expectedTime = new Date(now.getTime() + (index + 1) * 60 * 60 * 1000);
        expect(forecast.timestamp).toBeInstanceOf(Date);
        expect(Math.abs(forecast.timestamp.getTime() - expectedTime.getTime())).toBeLessThan(60000); // 1 minute tolerance
      });
    });

    it('should include confidence decay over time', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateDemandForecast('test-region', 24);

      // Confidence should decrease over time
      const firstConfidence = result[0].confidence;
      const lastConfidence = result[result.length - 1].confidence;
      expect(lastConfidence).toBeLessThan(firstConfidence);
    });
  });

  describe('getForecastAccuracy', () => {
    it('should calculate forecast accuracy correctly', async () => {
      const forecastsWithActuals = [
        ...mockBalancingData,
        {
          ...mockBalancingData[0],
          id: '3',
          actualValue: 1050,
          predictedValue: 1000,
        },
      ];

      mockRepository.find.mockResolvedValue(forecastsWithActuals);

      const accuracy = await service.getForecastAccuracy('test-region', 7);

      expect(accuracy).toHaveProperty('accuracy');
      expect(accuracy).toHaveProperty('mae');
      expect(accuracy).toHaveProperty('rmse');
      expect(accuracy).toHaveProperty('mape');
      expect(accuracy.accuracy).toBeGreaterThanOrEqual(0);
      expect(accuracy.accuracy).toBeLessThanOrEqual(100);
    });

    it('should return zero metrics when no data available', async () => {
      mockRepository.find.mockResolvedValue([]);

      const accuracy = await service.getForecastAccuracy('test-region', 7);

      expect(accuracy).toEqual({
        accuracy: 0,
        mae: 0,
        rmse: 0,
        mape: 0,
      });
    });
  });

  describe('prepareTrainingData', () => {
    it('should extract features correctly from balancing data', async () => {
      // This is a private method, so we test it indirectly through generateDemandForecast
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.generateDemandForecast('test-region', 24);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          regionId: 'test-region',
          forecastType: 'demand',
          timestamp: expect.any(Date),
        },
        order: { timestamp: 'ASC' },
      });
    });
  });

  describe('model training', () => {
    it('should train multiple models successfully', async () => {
      // Generate enough data for model training
      const extensiveData = Array.from({ length: 200 }, (_, i) => ({
        ...mockBalancingData[0],
        id: `data-${i}`,
        timestamp: new Date(Date.now() - (200 - i) * 60 * 60 * 1000),
        actualValue: 1000 + Math.sin(i / 24 * Math.PI * 2) * 200,
      }));

      mockRepository.find.mockResolvedValue(extensiveData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateDemandForecast('test-region', 24);

      expect(result.length).toBe(24);
      expect(result[0].algorithm).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.generateDemandForecast('test-region', 24))
        .rejects.toThrow('Database error');
    });

    it('should handle invalid region gracefully', async () => {
      mockRepository.find.mockResolvedValue([]);

      await expect(service.generateDemandForecast('invalid-region', 24))
        .rejects.toThrow('Insufficient historical data');
    });
  });

  describe('performance', () => {
    it('should complete forecast generation within reasonable time', async () => {
      mockRepository.find.mockResolvedValue(mockBalancingData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const startTime = Date.now();
      await service.generateDemandForecast('test-region', 24);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('edge cases', () => {
    it('should handle extreme weather factors', async () => {
      const extremeWeatherData = [
        {
          ...mockBalancingData[0],
          metadata: {
            source: 'test',
            algorithm: 'test-algorithm',
            externalFactors: { temperature: -10, humidity: 95, windSpeed: 25 },
          },
        },
      ];

      mockRepository.find.mockResolvedValue(extremeWeatherData);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateDemandForecast('test-region', 24);

      expect(result).toBeDefined();
      expect(result.length).toBe(24);
    });

    it('should handle missing external factors gracefully', async () => {
      const dataWithoutFactors = [
        {
          ...mockBalancingData[0],
          metadata: {
            source: 'test',
            algorithm: 'test-algorithm',
          },
        },
      ];

      mockRepository.find.mockResolvedValue(dataWithoutFactors);
      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      const result = await service.generateDemandForecast('test-region', 24);

      expect(result).toBeDefined();
      expect(result.length).toBe(24);
    });
  });
});

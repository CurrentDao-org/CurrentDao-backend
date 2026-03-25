import { Test, TestingModule } from '@nestjs/testing';
import {
  EnsembleMethodsService,
  EnsembleConfig,
  EnsembleResult,
} from './ensemble-methods.service';
import {
  TimeSeriesService,
  TimeSeriesData,
  ForecastResult,
} from '../models/time-series.service';
import { ForecastHorizon } from '../entities/forecast-data.entity';

describe('EnsembleMethodsService', () => {
  let service: EnsembleMethodsService;
  let timeSeriesService: TimeSeriesService;

  const mockTimeSeriesService = {
    arimaForecast: jest.fn(),
    exponentialSmoothingForecast: jest.fn(),
    lstmForecast: jest.fn(),
    prophetForecast: jest.fn(),
    evaluateModel: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnsembleMethodsService,
        {
          provide: TimeSeriesService,
          useValue: mockTimeSeriesService,
        },
      ],
    }).compile();

    service = module.get<EnsembleMethodsService>(EnsembleMethodsService);
    timeSeriesService = module.get<TimeSeriesService>(TimeSeriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEnsembleForecast', () => {
    const mockData: TimeSeriesData[] = [
      { timestamp: new Date('2023-01-01'), value: 100 },
      { timestamp: new Date('2023-01-02'), value: 102 },
      { timestamp: new Date('2023-01-03'), value: 101 },
      { timestamp: new Date('2023-01-04'), value: 103 },
      { timestamp: new Date('2023-01-05'), value: 105 },
    ];

    const mockForecasts: ForecastResult[] = [
      {
        predictedValue: 104,
        confidenceInterval: { lower: 102, upper: 106 },
        accuracy: 0.85,
        model: 'ARIMA',
        horizon: ForecastHorizon.ONE_HOUR,
      },
      {
        predictedValue: 103,
        confidenceInterval: { lower: 101, upper: 105 },
        accuracy: 0.82,
        model: 'ExponentialSmoothing',
        horizon: ForecastHorizon.ONE_HOUR,
      },
      {
        predictedValue: 105,
        confidenceInterval: { lower: 103, upper: 107 },
        accuracy: 0.88,
        model: 'LSTM',
        horizon: ForecastHorizon.ONE_HOUR,
      },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      mockTimeSeriesService.arimaForecast.mockResolvedValue(mockForecasts[0]);
      mockTimeSeriesService.exponentialSmoothingForecast.mockResolvedValue(
        mockForecasts[1],
      );
      mockTimeSeriesService.lstmForecast.mockResolvedValue(mockForecasts[2]);
    });

    it('should create ensemble forecast with weighted averaging', async () => {
      const config: EnsembleConfig = {
        models: ['ARIMA', 'ExponentialSmoothing', 'LSTM'],
        votingMethod: 'weighted',
      };

      const result = await service.createEnsembleForecast(
        mockData,
        ForecastHorizon.ONE_HOUR,
        config,
      );

      expect(result).toBeDefined();
      expect(result.forecast).toBeDefined();
      expect(result.individualForecasts).toHaveLength(3);
      expect(result.ensembleWeights).toBeDefined();
      expect(result.diversity).toBeGreaterThanOrEqual(0);
      expect(result.errorReduction).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.method).toBe('weighted');
      expect(result.metadata.modelCount).toBe(3);
    });

    it('should handle majority voting method', async () => {
      const config: EnsembleConfig = {
        models: ['ARIMA', 'ExponentialSmoothing', 'LSTM'],
        votingMethod: 'majority',
      };

      const result = await service.createEnsembleForecast(
        mockData,
        ForecastHorizon.ONE_HOUR,
        config,
      );

      expect(result.metadata.method).toBe('majority');
    });

    it('should handle ranked voting method', async () => {
      const config: EnsembleConfig = {
        models: ['ARIMA', 'ExponentialSmoothing', 'LSTM'],
        votingMethod: 'ranked',
      };

      const result = await service.createEnsembleForecast(
        mockData,
        ForecastHorizon.ONE_HOUR,
        config,
      );

      expect(result.metadata.method).toBe('ranked');
    });

    it('should use provided weights', async () => {
      const config: EnsembleConfig = {
        models: ['ARIMA', 'ExponentialSmoothing', 'LSTM'],
        weights: [0.5, 0.3, 0.2],
        votingMethod: 'weighted',
      };

      const result = await service.createEnsembleForecast(
        mockData,
        ForecastHorizon.ONE_HOUR,
        config,
      );

      expect(result.ensembleWeights['ARIMA']).toBe(0.5);
      expect(result.ensembleWeights['ExponentialSmoothing']).toBe(0.3);
      expect(result.ensembleWeights['LSTM']).toBe(0.2);
    });

    it('should handle model failures gracefully', async () => {
      mockTimeSeriesService.arimaForecast.mockRejectedValue(
        new Error('ARIMA failed'),
      );

      const config: EnsembleConfig = {
        models: ['ARIMA', 'ExponentialSmoothing', 'LSTM'],
        votingMethod: 'weighted',
      };

      const result = await service.createEnsembleForecast(
        mockData,
        ForecastHorizon.ONE_HOUR,
        config,
      );

      expect(result.individualForecasts).toHaveLength(2); // Only successful forecasts
    });

    it('should throw error when no forecasts succeed', async () => {
      mockTimeSeriesService.arimaForecast.mockRejectedValue(
        new Error('ARIMA failed'),
      );
      mockTimeSeriesService.exponentialSmoothingForecast.mockRejectedValue(
        new Error('ES failed'),
      );
      mockTimeSeriesService.lstmForecast.mockRejectedValue(
        new Error('LSTM failed'),
      );

      const config: EnsembleConfig = {
        models: ['ARIMA', 'ExponentialSmoothing', 'LSTM'],
        votingMethod: 'weighted',
      };

      await expect(
        service.createEnsembleForecast(
          mockData,
          ForecastHorizon.ONE_HOUR,
          config,
        ),
      ).rejects.toThrow();
    });
  });

  describe('optimizeEnsemble', () => {
    const mockData: TimeSeriesData[] = [
      { timestamp: new Date('2023-01-01'), value: 100 },
      { timestamp: new Date('2023-01-02'), value: 102 },
      { timestamp: new Date('2023-01-03'), value: 101 },
      { timestamp: new Date('2023-01-04'), value: 103 },
      { timestamp: new Date('2023-01-05'), value: 105 },
      { timestamp: new Date('2023-01-06'), value: 104 },
      { timestamp: new Date('2023-01-07'), value: 106 },
      { timestamp: new Date('2023-01-08'), value: 107 },
      { timestamp: new Date('2023-01-09'), value: 105 },
      { timestamp: new Date('2023-01-10'), value: 108 },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      mockTimeSeriesService.evaluateModel.mockResolvedValue({
        mae: 2.5,
        rmse: 3.2,
        mape: 2.1,
        r2: 0.85,
      });
    });

    it('should optimize ensemble configuration', async () => {
      const candidateModels = [
        'ARIMA',
        'ExponentialSmoothing',
        'LSTM',
        'Prophet',
      ];

      const result = await service.optimizeEnsemble(
        mockData,
        ForecastHorizon.ONE_HOUR,
        candidateModels,
        0.2,
      );

      expect(result).toBeDefined();
      expect(result.models).toBeDefined();
      expect(result.weights).toBeDefined();
      expect(result.weights?.length).toBe(result.models.length);
      expect(result.diversityThreshold).toBe(0.7);
      expect(result.votingMethod).toBe('weighted');
      expect(result.errorReductionMethod).toBe('bagging');
    });

    it('should select top performing models', async () => {
      const candidateModels = [
        'ARIMA',
        'ExponentialSmoothing',
        'LSTM',
        'Prophet',
        'Custom1',
        'Custom2',
      ];

      const result = await service.optimizeEnsemble(
        mockData,
        ForecastHorizon.ONE_HOUR,
        candidateModels,
        0.2,
      );

      expect(result.models.length).toBeLessThanOrEqual(5); // Should select top 5
    });
  });

  describe('baggingEnsemble', () => {
    const mockData: TimeSeriesData[] = [
      { timestamp: new Date('2023-01-01'), value: 100 },
      { timestamp: new Date('2023-01-02'), value: 102 },
      { timestamp: new Date('2023-01-03'), value: 101 },
      { timestamp: new Date('2023-01-04'), value: 103 },
      { timestamp: new Date('2023-01-05'), value: 105 },
    ];

    beforeEach(() => {
      jest.clearAllMocks();
      mockTimeSeriesService.arimaForecast.mockResolvedValue({
        predictedValue: 104,
        confidenceInterval: { lower: 102, upper: 106 },
        accuracy: 0.85,
        model: 'ARIMA',
        horizon: ForecastHorizon.ONE_HOUR,
      });
    });

    it('should create bagging ensemble', async () => {
      const models = ['ARIMA'];

      const result = await service.baggingEnsemble(
        mockData,
        ForecastHorizon.ONE_HOUR,
        models,
        5,
      );

      expect(result).toBeDefined();
      expect(result.metadata.method).toBe('bagging');
      expect(result.metadata.modelCount).toBe(5);
      expect(result.individualForecasts).toHaveLength(5);
    });

    it('should calculate bootstrap weights correctly', async () => {
      const models = ['ARIMA'];

      const result = await service.baggingEnsemble(
        mockData,
        ForecastHorizon.ONE_HOUR,
        models,
        3,
      );

      expect(Object.keys(result.ensembleWeights)).toHaveLength(3);
      Object.values(result.ensembleWeights).forEach((weight) => {
        expect(weight).toBeCloseTo(1 / 3, 5);
      });
    });
  });

  describe('evaluateEnsemblePerformance', () => {
    const mockEnsembleResults: EnsembleResult[] = [
      {
        forecast: {
          predictedValue: 104,
          confidenceInterval: { lower: 102, upper: 106 },
          accuracy: 0.85,
          model: 'Ensemble',
          horizon: ForecastHorizon.ONE_HOUR,
        },
        individualForecasts: [],
        ensembleWeights: {},
        diversity: 0.1,
        errorReduction: 0.15,
        confidence: 0.87,
        metadata: {
          method: 'weighted',
          modelCount: 3,
          agreement: 0.8,
          variance: 2.5,
        },
      },
      {
        forecast: {
          predictedValue: 105,
          confidenceInterval: { lower: 103, upper: 107 },
          accuracy: 0.88,
          model: 'Ensemble',
          horizon: ForecastHorizon.ONE_HOUR,
        },
        individualForecasts: [],
        ensembleWeights: {},
        diversity: 0.12,
        errorReduction: 0.18,
        confidence: 0.9,
        metadata: {
          method: 'weighted',
          modelCount: 3,
          agreement: 0.85,
          variance: 2.2,
        },
      },
    ];

    const mockActualData: TimeSeriesData[] = [
      { timestamp: new Date('2023-01-01'), value: 100 },
      { timestamp: new Date('2023-01-02'), value: 102 },
    ];

    it('should evaluate ensemble performance', async () => {
      const result = await service.evaluateEnsemblePerformance(
        mockEnsembleResults,
        mockActualData,
      );

      expect(result).toBeDefined();
      expect(result.overallAccuracy).toBeGreaterThanOrEqual(0);
      expect(result.overallAccuracy).toBeLessThanOrEqual(1);
      expect(result.errorReduction).toBeGreaterThanOrEqual(0);
      expect(result.consistency).toBeGreaterThanOrEqual(0);
      expect(result.consistency).toBeLessThanOrEqual(1);
      expect(result.reliability).toBeGreaterThanOrEqual(-1);
      expect(result.reliability).toBeLessThanOrEqual(1);
    });

    it('should handle empty results', async () => {
      const result = await service.evaluateEnsemblePerformance(
        [],
        mockActualData,
      );

      expect(result.overallAccuracy).toBe(0);
      expect(result.errorReduction).toBe(0);
      expect(result.consistency).toBe(0);
      expect(result.reliability).toBe(0);
    });
  });

  describe('helper methods', () => {
    it('should calculate variance correctly', () => {
      const serviceAny = service as any;
      const values = [1, 2, 3, 4, 5];

      const variance = serviceAny.calculateVariance(values);
      expect(variance).toBeCloseTo(2, 5);
    });

    it('should handle empty array for variance', () => {
      const serviceAny = service as any;

      const variance = serviceAny.calculateVariance([]);
      expect(variance).toBe(0);
    });

    it('should calculate diversity correctly', () => {
      const serviceAny = service as any;
      const forecasts: ForecastResult[] = [
        {
          predictedValue: 100,
          accuracy: 0.8,
          model: 'A',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
        {
          predictedValue: 110,
          accuracy: 0.85,
          model: 'B',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
        {
          predictedValue: 90,
          accuracy: 0.82,
          model: 'C',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
      ];

      const diversity = serviceAny.calculateDiversity(forecasts);
      expect(diversity).toBeGreaterThan(0);
    });

    it('should handle single forecast for diversity', () => {
      const serviceAny = service as any;
      const forecasts: ForecastResult[] = [
        {
          predictedValue: 100,
          accuracy: 0.8,
          model: 'A',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
      ];

      const diversity = serviceAny.calculateDiversity(forecasts);
      expect(diversity).toBe(0);
    });

    it('should calculate agreement correctly', () => {
      const serviceAny = service as any;
      const forecasts: ForecastResult[] = [
        {
          predictedValue: 100,
          accuracy: 0.8,
          model: 'A',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
        {
          predictedValue: 101,
          accuracy: 0.85,
          model: 'B',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
        {
          predictedValue: 99,
          accuracy: 0.82,
          model: 'C',
          horizon: ForecastHorizon.ONE_HOUR,
        } as any,
      ];

      const agreement = serviceAny.calculateAgreement(forecasts);
      expect(agreement).toBeGreaterThan(0);
      expect(agreement).toBeLessThanOrEqual(1);
    });
  });
});

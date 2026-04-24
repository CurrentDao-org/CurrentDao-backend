import { Test, TestingModule } from '@nestjs/testing';
import { TimeSeriesService, TimeSeriesData } from './time-series.service';
import { ForecastHorizon } from '../entities/forecast-data.entity';

describe('TimeSeriesService', () => {
  let service: TimeSeriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeSeriesService],
    }).compile();

    service = module.get<TimeSeriesService>(TimeSeriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('arimaForecast', () => {
    it('should generate ARIMA forecast', async () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 102 },
        { timestamp: new Date('2023-01-03'), value: 101 },
        { timestamp: new Date('2023-01-04'), value: 103 },
        { timestamp: new Date('2023-01-05'), value: 105 },
      ];

      const result = await service.arimaForecast(
        data,
        ForecastHorizon.ONE_HOUR,
      );

      expect(result).toBeDefined();
      expect(result.model).toBe('ARIMA');
      expect(result.predictedValue).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval.lower).toBeLessThanOrEqual(
        result.predictedValue,
      );
      expect(result.confidenceInterval.upper).toBeGreaterThanOrEqual(
        result.predictedValue,
      );
    });

    it('should handle insufficient data', async () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
      ];

      await expect(
        service.arimaForecast(data, ForecastHorizon.ONE_HOUR),
      ).rejects.toThrow();
    });
  });

  describe('exponentialSmoothingForecast', () => {
    it('should generate exponential smoothing forecast', async () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 102 },
        { timestamp: new Date('2023-01-03'), value: 101 },
        { timestamp: new Date('2023-01-04'), value: 103 },
        { timestamp: new Date('2023-01-05'), value: 105 },
      ];

      const result = await service.exponentialSmoothingForecast(
        data,
        ForecastHorizon.ONE_HOUR,
      );

      expect(result).toBeDefined();
      expect(result.model).toBe('ExponentialSmoothing');
      expect(result.predictedValue).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
    });
  });

  describe('lstmForecast', () => {
    it('should generate LSTM forecast', async () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 102 },
        { timestamp: new Date('2023-01-03'), value: 101 },
        { timestamp: new Date('2023-01-04'), value: 103 },
        { timestamp: new Date('2023-01-05'), value: 105 },
      ];

      const result = await service.lstmForecast(data, ForecastHorizon.ONE_HOUR);

      expect(result).toBeDefined();
      expect(result.model).toBe('LSTM');
      expect(result.predictedValue).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.layers).toBeDefined();
      expect(result.metadata.epochs).toBeDefined();
    });
  });

  describe('prophetForecast', () => {
    it('should generate Prophet forecast', async () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 102 },
        { timestamp: new Date('2023-01-03'), value: 101 },
        { timestamp: new Date('2023-01-04'), value: 103 },
        { timestamp: new Date('2023-01-05'), value: 105 },
      ];

      const result = await service.prophetForecast(
        data,
        ForecastHorizon.ONE_HOUR,
      );

      expect(result).toBeDefined();
      expect(result.model).toBe('Prophet');
      expect(result.predictedValue).toBeGreaterThan(0);
      expect(result.accuracy).toBeGreaterThanOrEqual(0);
      expect(result.accuracy).toBeLessThanOrEqual(1);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.seasonality).toBeDefined();
    });
  });

  describe('evaluateModel', () => {
    it('should evaluate model performance', async () => {
      const data: TimeSeriesData[] = [
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

      const result = await service.evaluateModel(data, 'ARIMA');

      expect(result).toBeDefined();
      expect(result.mae).toBeGreaterThanOrEqual(0);
      expect(result.rmse).toBeGreaterThanOrEqual(0);
      expect(result.mape).toBeGreaterThanOrEqual(0);
      expect(result.r2).toBeDefined();
    });

    it('should handle insufficient data for evaluation', async () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 102 },
      ];

      await expect(service.evaluateModel(data, 'ARIMA')).rejects.toThrow();
    });
  });

  describe('preprocessData', () => {
    it('should preprocess data correctly', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-02'), value: 102 },
        { timestamp: new Date('2023-01-01'), value: 100 }, // Out of order
        { timestamp: new Date('2023-01-03'), value: null as any }, // Invalid value
        { timestamp: new Date('2023-01-04'), value: 101 },
        { timestamp: new Date('2023-01-05'), value: 103 },
      ];

      const result = service.preprocessData(data);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThan(data.length); // Should filter invalid data
      expect(result[0].timestamp.getTime()).toBeLessThan(
        result[1].timestamp.getTime(),
      ); // Should be sorted
    });

    it('should handle empty data', () => {
      const result = service.preprocessData([]);
      expect(result).toEqual([]);
    });
  });

  describe('helper methods', () => {
    it('should calculate trend correctly', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
        { timestamp: new Date('2023-01-02'), value: 102 },
        { timestamp: new Date('2023-01-03'), value: 104 },
      ];

      // Access private method through type assertion for testing
      const serviceAny = service as any;
      const trend = serviceAny.calculateTrend(data);

      expect(trend).toBeGreaterThan(0); // Should be positive trend
    });

    it('should handle single data point for trend', () => {
      const data: TimeSeriesData[] = [
        { timestamp: new Date('2023-01-01'), value: 100 },
      ];

      const serviceAny = service as any;
      const trend = serviceAny.calculateTrend(data);

      expect(trend).toBe(0);
    });

    it('should calculate horizon periods correctly', () => {
      const serviceAny = service as any;

      expect(serviceAny.getHorizonPeriods(ForecastHorizon.ONE_HOUR)).toBe(1);
      expect(serviceAny.getHorizonPeriods(ForecastHorizon.SIX_HOURS)).toBe(6);
      expect(
        serviceAny.getHorizonPeriods(ForecastHorizon.TWENTY_FOUR_HOURS),
      ).toBe(24);
      expect(serviceAny.getHorizonPeriods(ForecastHorizon.ONE_WEEK)).toBe(168);
      expect(serviceAny.getHorizonPeriods(ForecastHorizon.ONE_YEAR)).toBe(8760);
    });
  });

  describe('percentile calculation', () => {
    it('should calculate percentiles correctly', () => {
      const serviceAny = service as any;
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(serviceAny.percentile(values, 25)).toBe(3.25);
      expect(serviceAny.percentile(values, 50)).toBe(5.5);
      expect(serviceAny.percentile(values, 75)).toBe(7.75);
    });

    it('should handle single value for percentile', () => {
      const serviceAny = service as any;
      const values = [5];

      expect(serviceAny.percentile(values, 50)).toBe(5);
    });
  });

  describe('outlier detection', () => {
    it('should detect and handle outliers', () => {
      const serviceAny = service as any;
      const values = [10, 12, 11, 13, 12, 100, 11]; // 100 is an outlier
      const q3 = 13;
      const iqr = 2;

      const outlierValue = 100;
      const upperBound = q3 + 1.5 * iqr; // 13 + 3 = 16
      const result = serviceAny.outlierDetection(outlierValue, values);

      expect(result).toBeLessThanOrEqual(upperBound);
    });

    it('should not modify non-outlier values', () => {
      const serviceAny = service as any;
      const values = [10, 12, 11, 13, 12, 14, 11];
      const normalValue = 12;

      const result = serviceAny.outlierDetection(normalValue, values);
      expect(result).toBe(normalValue);
    });
  });
});

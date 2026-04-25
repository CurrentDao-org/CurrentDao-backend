import { Injectable } from '@nestjs/common';

export interface TimeSeriesForecast {
  metric: string;
  horizon: number; // hours
  predictions: Array<{
    timestamp: string;
    value: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  }>;
  model: string;
  accuracy: number;
  seasonal: boolean;
  trend: 'increasing' | 'decreasing' | 'stable';
  metadata: {
    trainingPeriod: string;
    dataPoints: number;
    features: string[];
  };
}

export interface TimeSeriesMetrics {
  mae: number; // Mean Absolute Error
  mse: number; // Mean Squared Error
  rmse: number; // Root Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
  r2: number; // R-squared
  accuracy: number;
}

@Injectable()
export class TimeSeriesService {
  private readonly models: Map<string, any> = new Map();
  private readonly historicalData: Map<string, number[]> = new Map();

  constructor() {
    this.initializeModels();
    this.initializeHistoricalData();
  }

  async forecast(metric: string, horizonHours: number): Promise<TimeSeriesForecast> {
    try {
      const model = this.models.get(metric) || this.models.get('default');
      if (!model) {
        throw new Error(`No model available for metric: ${metric}`);
      }

      const historicalData = this.historicalData.get(metric) || this.generateMockData(metric);
      const predictions = this.generatePredictions(historicalData, horizonHours, model);
      const accuracy = this.calculateAccuracy(historicalData, predictions);
      const trend = this.detectTrend(historicalData);

      return {
        metric,
        horizon: horizonHours,
        predictions,
        model: model.name,
        accuracy,
        seasonal: model.seasonal,
        trend,
        metadata: {
          trainingPeriod: '30 days',
          dataPoints: historicalData.length,
          features: model.features,
        },
      };
    } catch (error) {
      throw new Error(`Failed to forecast time series: ${error.message}`);
    }
  }

  async evaluateModel(metric: string, actualData: number[]): Promise<TimeSeriesMetrics> {
    try {
      const model = this.models.get(metric) || this.models.get('default');
      if (!model) {
        throw new Error(`No model available for metric: ${metric}`);
      }

      const historicalData = this.historicalData.get(metric) || this.generateMockData(metric);
      const predictions = this.generatePredictions(historicalData, actualData.length, model);

      return this.calculateMetrics(actualData, predictions);
    } catch (error) {
      throw new Error(`Failed to evaluate model: ${error.message}`);
    }
  }

  async detectAnomalies(metric: string, threshold = 2): Promise<any> {
    try {
      const data = this.historicalData.get(metric) || this.generateMockData(metric);
      const anomalies = this.findAnomalies(data, threshold);

      return {
        metric,
        anomalies,
        totalAnomalies: anomalies.length,
        anomalyRate: (anomalies.length / data.length) * 100,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to detect anomalies: ${error.message}`);
    }
  }

  async getSeasonality(metric: string): Promise<any> {
    try {
      const data = this.historicalData.get(metric) || this.generateMockData(metric);
      const seasonality = this.analyzeSeasonality(data);

      return {
        metric,
        seasonality,
        dominant: seasonality.dominant,
        strength: seasonality.strength,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to analyze seasonality: ${error.message}`);
    }
  }

  private generatePredictions(historicalData: number[], horizon: number, model: any): any[] {
    const predictions: any[] = [];
    const lastValue = historicalData[historicalData.length - 1];
    const trend = this.calculateTrend(historicalData);
    const seasonalFactor = model.seasonal ? this.getSeasonalFactor(historicalData.length) : 1;

    for (let i = 1; i <= horizon; i++) {
      const timestamp = new Date(Date.now() + i * 60 * 60 * 1000).toISOString();
      
      // Base prediction with trend and seasonality
      let value = lastValue + (trend * i) * seasonalFactor;
      
      // Add some randomness for realism
      value += (Math.random() - 0.5) * 10;
      
      // Calculate confidence bounds
      const confidence = Math.max(0.5, 0.95 - (i * 0.02)); // Decreasing confidence
      const margin = value * 0.1 * (1 + i * 0.05); // Increasing uncertainty
      
      predictions.push({
        timestamp,
        value: Math.max(0, value),
        confidence,
        upperBound: value + margin,
        lowerBound: Math.max(0, value - margin),
      });
    }

    return predictions;
  }

  private calculateAccuracy(historicalData: number[], predictions: any[]): number {
    // Simulate accuracy calculation
    const baseAccuracy = 0.85;
    const dataQuality = Math.min(historicalData.length, 1000) / 1000;
    const modelComplexity = 0.1;
    
    return Math.min(0.98, baseAccuracy + (dataQuality * 0.1) - modelComplexity);
  }

  private detectTrend(data: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

    const change = (secondAvg - firstAvg) / firstAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, index) => sum + (val * index), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  private getSeasonalFactor(index: number): number {
    // Simulate seasonal patterns (24-hour cycle)
    const hourOfDay = index % 24;
    const seasonalPattern = [
      0.8, 0.7, 0.6, 0.5, 0.6, 0.8, 1.2, 1.4, 1.3, 1.2, 1.1, 1.0,
      1.0, 1.1, 1.2, 1.3, 1.4, 1.2, 1.0, 0.9, 0.8, 0.7, 0.6, 0.5
    ];
    
    return seasonalPattern[hourOfDay] || 1.0;
  }

  private calculateMetrics(actual: number[], predicted: any[]): TimeSeriesMetrics {
    const predictedValues = predicted.map(p => p.value);
    const n = actual.length;

    const errors = actual.map((val, i) => val - predictedValues[i]);
    const absoluteErrors = errors.map(e => Math.abs(e));
    const squaredErrors = errors.map(e => e * e);
    const percentageErrors = actual.map((val, i) => Math.abs((val - predictedValues[i]) / val) * 100);

    const mae = absoluteErrors.reduce((sum, e) => sum + e, 0) / n;
    const mse = squaredErrors.reduce((sum, e) => sum + e, 0) / n;
    const rmse = Math.sqrt(mse);
    const mape = percentageErrors.reduce((sum, e) => sum + e, 0) / n;

    // Calculate R-squared
    const yMean = actual.reduce((sum, val) => sum + val, 0) / n;
    const totalSumSquares = actual.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const residualSumSquares = squaredErrors.reduce((sum, e) => sum + e, 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);

    const accuracy = Math.max(0, 100 - mape);

    return {
      mae,
      mse,
      rmse,
      mape,
      r2,
      accuracy,
    };
  }

  private findAnomalies(data: number[], threshold: number): any[] {
    const anomalies: any[] = [];
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);

    data.forEach((value, index) => {
      const zScore = Math.abs((value - mean) / stdDev);
      if (zScore > threshold) {
        anomalies.push({
          index,
          timestamp: new Date(Date.now() - (data.length - index) * 60 * 60 * 1000).toISOString(),
          value,
          zScore,
          type: value > mean ? 'spike' : 'dip',
        });
      }
    });

    return anomalies;
  }

  private analyzeSeasonality(data: number[]): any {
    const periods = [24, 168]; // Daily and weekly
    const seasonality: any = {};

    periods.forEach(period => {
      const correlation = this.calculateSeasonalCorrelation(data, period);
      seasonality[`${period}h`] = {
        correlation,
        strength: Math.abs(correlation),
        detected: Math.abs(correlation) > 0.3,
      };
    });

    // Find dominant seasonality
    const dominant = Object.entries(seasonality)
      .reduce((best, [key, value]: [string, any]) => 
        value.strength > best.value.strength ? { key, value } : best,
        { key: 'none', value: { strength: 0 } }
      );

    return {
      ...seasonality,
      dominant: dominant.key,
      strength: dominant.value.strength,
    };
  }

  private calculateSeasonalCorrelation(data: number[], period: number): number {
    if (data.length < period * 2) return 0;

    const correlations: number[] = [];
    
    for (let lag = 1; lag <= Math.min(period, Math.floor(data.length / 2)); lag++) {
      const correlation = this.calculateCorrelation(
        data.slice(0, -lag),
        data.slice(lag)
      );
      correlations.push(correlation);
    }

    return correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;

    let numerator = 0;
    let xSumSquares = 0;
    let ySumSquares = 0;

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean;
      const yDiff = y[i] - yMean;
      numerator += xDiff * yDiff;
      xSumSquares += xDiff * xDiff;
      ySumSquares += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xSumSquares * ySumSquares);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private generateMockData(metric: string): number[] {
    const baseValue = 100;
    const data: number[] = [];

    for (let i = 0; i < 720; i++) { // 30 days of hourly data
      const trend = i * 0.1;
      const seasonal = Math.sin(i * Math.PI / 12) * 20; // Daily seasonality
      const weekly = Math.sin(i * Math.PI / 84) * 10; // Weekly seasonality
      const noise = (Math.random() - 0.5) * 15;
      
      data.push(Math.max(10, baseValue + trend + seasonal + weekly + noise));
    }

    this.historicalData.set(metric, data);
    return data;
  }

  private initializeModels(): void {
    this.models.set('default', {
      name: 'ARIMA',
      seasonal: true,
      features: ['trend', 'seasonality', 'autoregressive'],
    });

    this.models.set('energy-demand', {
      name: 'LSTM',
      seasonal: true,
      features: ['weather', 'time', 'historical_demand'],
    });

    this.models.set('price', {
      name: 'Prophet',
      seasonal: true,
      features: ['trend', 'seasonality', 'holidays'],
    });
  }

  private initializeHistoricalData(): void {
    const metrics = ['energy-demand', 'price', 'volume', 'supply'];
    metrics.forEach(metric => {
      this.generateMockData(metric);
    });
  }
}

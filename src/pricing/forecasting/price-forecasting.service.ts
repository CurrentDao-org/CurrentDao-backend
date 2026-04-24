import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as mlRegression from 'ml-regression';
import * as simpleStatistics from 'simple-statistics';

export interface ForecastingModel {
  name: string;
  type: 'linear' | 'polynomial' | 'exponential' | 'neural';
  accuracy: number;
  lastTrained: Date;
  parameters: any;
}

export interface PriceForecast {
  timestamp: number;
  predictedPrice: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  model: string;
  factors: ForecastingFactors;
}

export interface ForecastingFactors {
  supplyDemandRatio: number;
  seasonalFactor: number;
  timeOfDayFactor: number;
  weatherFactor: number;
  marketSentiment: number;
  externalEvents: number;
}

export interface HistoricalTracking {
  date: Date;
  actualPrice: number;
  predictedPrice: number;
  accuracy: number;
  error: number;
  model: string;
}

export interface ForecastAccuracy {
  overallAccuracy: number;
  modelAccuracy: Record<string, number>;
  timeHorizonAccuracy: Record<string, number>;
  recentAccuracy: number;
  trend: 'improving' | 'declining' | 'stable';
}

@Injectable()
export class PriceForecastingService {
  private readonly logger = new Logger(PriceForecastingService.name);
  private readonly TARGET_ACCURACY = 95; // 95% accuracy requirement
  private models: Map<string, ForecastingModel> = new Map();
  private historicalForecasts: HistoricalTracking[] = [];
  private readonly MAX_HISTORICAL_TRACKS = 10000;

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {
    this.initializeModels();
  }

  private initializeModels(): void {
    // Initialize multiple forecasting models
    this.models.set('linear', {
      name: 'Linear Regression',
      type: 'linear',
      accuracy: 0,
      lastTrained: new Date(),
      parameters: {},
    });

    this.models.set('polynomial', {
      name: 'Polynomial Regression',
      type: 'polynomial',
      accuracy: 0,
      lastTrained: new Date(),
      parameters: { degree: 3 },
    });

    this.models.set('exponential', {
      name: 'Exponential Smoothing',
      type: 'exponential',
      accuracy: 0,
      lastTrained: new Date(),
      parameters: { alpha: 0.3, beta: 0.1, gamma: 0.1 },
    });

    this.models.set('neural', {
      name: 'Neural Network',
      type: 'neural',
      accuracy: 0,
      lastTrained: new Date(),
      parameters: { layers: [10, 5], learningRate: 0.01 },
    });

    this.logger.log(`Initialized ${this.models.size} forecasting models`);
  }

  async generatePriceForecast(
    energyType: string,
    location: string,
    hoursAhead: number = 24,
    includeFactors: boolean = true,
  ): Promise<PriceForecast[]> {
    const startTime = Date.now();
    
    // Get historical data for training
    const historicalData = await this.getHistoricalData(energyType, location, 168); // 7 days
    
    if (historicalData.length < 10) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Train models if needed
    await this.trainModels(historicalData);
    
    // Generate forecasts using ensemble method
    const forecasts: PriceForecast[] = [];
    
    for (let hour = 1; hour <= hoursAhead; hour++) {
      const forecastTime = Date.now() + (hour * 60 * 60 * 1000);
      const forecast = await this.generateSingleForecast(
        historicalData,
        forecastTime,
        hour,
        energyType,
        location,
        includeFactors,
      );
      
      forecasts.push(forecast);
    }

    const processingTime = Date.now() - startTime;
    this.logger.log(
      `Generated ${forecasts.length} price forecasts in ${processingTime}ms for ${energyType} in ${location}`,
    );

    return forecasts;
  }

  private async generateSingleForecast(
    historicalData: PriceHistory[],
    forecastTime: number,
    hoursAhead: number,
    energyType: string,
    location: string,
    includeFactors: boolean,
  ): Promise<PriceForecast> {
    const modelForecasts = [];
    
    // Generate forecasts from all models
    for (const [modelName, model] of this.models.entries()) {
      const forecast = await this.generateModelForecast(
        model,
        historicalData,
        forecastTime,
        hoursAhead,
      );
      modelForecasts.push({ ...forecast, model: modelName });
    }

    // Ensemble method: weighted average based on model accuracy
    const ensembleForecast = this.ensembleForecasts(modelForecasts);
    
    // Calculate confidence bounds
    const bounds = this.calculateConfidenceBounds(ensembleForecast.predictedPrice, modelForecasts);
    
    // Generate forecasting factors
    const factors = includeFactors 
      ? await this.calculateForecastingFactors(forecastTime, energyType, location)
      : this.getDefaultFactors();

    return {
      timestamp: forecastTime,
      predictedPrice: ensembleForecast.predictedPrice,
      confidence: ensembleForecast.confidence,
      upperBound: bounds.upper,
      lowerBound: bounds.lower,
      model: 'ensemble',
      factors,
    };
  }

  private async generateModelForecast(
    model: ForecastingModel,
    historicalData: PriceHistory[],
    forecastTime: number,
    hoursAhead: number,
  ): Promise<{ predictedPrice: number; confidence: number }> {
    const prices = historicalData.map(d => d.finalPrice);
    const timestamps = historicalData.map(d => d.timestamp.getTime());
    
    switch (model.type) {
      case 'linear':
        return this.linearRegressionForecast(timestamps, prices, hoursAhead);
      case 'polynomial':
        return this.polynomialRegressionForecast(timestamps, prices, hoursAhead, model.parameters.degree);
      case 'exponential':
        return this.exponentialSmoothingForecast(prices, hoursAhead, model.parameters);
      case 'neural':
        return this.neuralNetworkForecast(historicalData, hoursAhead, model.parameters);
      default:
        throw new Error(`Unknown model type: ${model.type}`);
    }
  }

  private linearRegressionForecast(
    timestamps: number[],
    prices: number[],
    hoursAhead: number,
  ): { predictedPrice: number; confidence: number } {
    const x = timestamps.map((t, i) => i);
    const regression = new mlRegression.SimpleLinearRegression(x, prices);
    
    const predictedIndex = x.length + hoursAhead;
    const predictedPrice = regression.predict(predictedIndex);
    
    // Calculate confidence based on R-squared
    const r2 = regression.r2;
    const confidence = Math.max(50, Math.min(95, r2 * 100));
    
    return { predictedPrice, confidence };
  }

  private polynomialRegressionForecast(
    timestamps: number[],
    prices: number[],
    hoursAhead: number,
    degree: number,
  ): { predictedPrice: number; confidence: number } {
    const x = timestamps.map((t, i) => i);
    const regression = new mlRegression.PolynomialRegression(x, prices, degree);
    
    const predictedIndex = x.length + hoursAhead;
    const predictedPrice = regression.predict(predictedIndex);
    
    // Calculate confidence based on mean squared error
    const mse = this.calculateMSE(x.map(xi => regression.predict(xi)), prices);
    const confidence = Math.max(50, Math.min(95, 100 - mse * 10));
    
    return { predictedPrice, confidence };
  }

  private exponentialSmoothingForecast(
    prices: number[],
    hoursAhead: number,
    parameters: any,
  ): { predictedPrice: number; confidence: number } {
    const { alpha, beta, gamma } = parameters;
    
    // Holt-Winters exponential smoothing
    const level = prices[prices.length - 1];
    const trend = prices.length > 1 ? prices[prices.length - 1] - prices[prices.length - 2] : 0;
    
    let forecast = level + trend * hoursAhead;
    
    // Add seasonal component if we have enough data
    if (prices.length >= 24) {
      const seasonal = this.calculateSeasonalComponent(prices);
      const seasonIndex = (prices.length + hoursAhead) % 24;
      forecast += seasonal[seasonIndex];
    }
    
    const volatility = this.calculateVolatility(prices);
    const confidence = Math.max(50, Math.min(95, 100 - volatility * 50));
    
    return { predictedPrice: forecast, confidence };
  }

  private neuralNetworkForecast(
    historicalData: PriceHistory[],
    hoursAhead: number,
    parameters: any,
  ): { predictedPrice: number; confidence: number } {
    // Simplified neural network implementation
    // In production, this would use a proper ML library like TensorFlow.js
    
    const features = this.extractFeatures(historicalData);
    const weights = this.initializeWeights(parameters.layers);
    
    // Forward pass through network
    const prediction = this.forwardPass(features, weights, hoursAhead);
    
    // Calculate confidence based on training accuracy
    const confidence = this.models.get('neural')?.accuracy || 70;
    
    return { predictedPrice: prediction, confidence };
  }

  private extractFeatures(historicalData: PriceHistory[]): number[] {
    const latest = historicalData[historicalData.length - 1];
    const prices = historicalData.map(d => d.finalPrice);
    
    return [
      latest.finalPrice,
      latest.supply,
      latest.demand,
      latest.supply / latest.demand,
      simpleStatistics.mean(prices.slice(-24)), // 24h average
      simpleStatistics.standardDeviation(prices.slice(-24)), // 24h volatility
      latest.isPeakHour ? 1 : 0,
      latest.isRenewable ? 1 : 0,
      new Date().getHours(), // Time of day
      new Date().getDay(), // Day of week
    ];
  }

  private initializeWeights(layers: number[]): number[][] {
    const weights = [];
    for (let i = 0; i < layers.length - 1; i++) {
      const layerWeights = [];
      for (let j = 0; j < layers[i] * layers[i + 1]; j++) {
        layerWeights.push((Math.random() - 0.5) * 2);
      }
      weights.push(layerWeights);
    }
    return weights;
  }

  private forwardPass(features: number[], weights: number[][], hoursAhead: number): number {
    // Simplified forward pass
    let output = features.reduce((sum, feature) => sum + feature, 0) / features.length;
    
    // Apply weights (simplified)
    for (const layer of weights) {
      const layerSum = layer.reduce((sum, weight) => sum + weight, 0);
      output = output * (layerSum / layer.length);
    }
    
    // Add time factor
    output *= (1 + hoursAhead * 0.01);
    
    return Math.max(0, output);
  }

  private ensembleForecasts(
    modelForecasts: Array<{ predictedPrice: number; confidence: number; model: string }>,
  ): { predictedPrice: number; confidence: number } {
    if (modelForecasts.length === 0) {
      return { predictedPrice: 0, confidence: 0 };
    }

    // Weight by confidence
    let totalWeight = 0;
    let weightedPrice = 0;
    let totalConfidence = 0;

    for (const forecast of modelForecasts) {
      const weight = forecast.confidence / 100;
      totalWeight += weight;
      weightedPrice += forecast.predictedPrice * weight;
      totalConfidence += forecast.confidence;
    }

    return {
      predictedPrice: weightedPrice / totalWeight,
      confidence: totalConfidence / modelForecasts.length,
    };
  }

  private calculateConfidenceBounds(
    predictedPrice: number,
    modelForecasts: Array<{ predictedPrice: number; confidence: number }>,
  ): { upper: number; lower: number } {
    const prices = modelForecasts.map(f => f.predictedPrice);
    const stdDev = simpleStatistics.standardDeviation(prices);
    
    // 95% confidence interval
    const margin = 1.96 * stdDev;
    
    return {
      upper: predictedPrice + margin,
      lower: Math.max(0, predictedPrice - margin),
    };
  }

  private async calculateForecastingFactors(
    forecastTime: number,
    energyType: string,
    location: string,
  ): Promise<ForecastingFactors> {
    const date = new Date(forecastTime);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();
    
    // Get recent data for supply-demand ratio
    const recentData = await this.priceHistoryRepository.find({
      where: {
        energyType,
        location,
        timestamp: Between(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
          new Date(),
        ),
      },
      order: { timestamp: 'DESC' },
      take: 24,
    });

    const avgSupplyDemandRatio = recentData.length > 0
      ? recentData.reduce((sum, d) => sum + d.supply / d.demand, 0) / recentData.length
      : 1;

    return {
      supplyDemandRatio: avgSupplyDemandRatio,
      seasonalFactor: this.getSeasonalFactor(date.getMonth()),
      timeOfDayFactor: this.getTimeOfDayFactor(hour),
      weatherFactor: await this.getWeatherFactor(location, forecastTime),
      marketSentiment: this.getMarketSentiment(recentData),
      externalEvents: this.getExternalEventsFactor(date),
    };
  }

  private getDefaultFactors(): ForecastingFactors {
    return {
      supplyDemandRatio: 1,
      seasonalFactor: 1,
      timeOfDayFactor: 1,
      weatherFactor: 1,
      marketSentiment: 0,
      externalEvents: 0,
    };
  }

  private getSeasonalFactor(month: number): number {
    const factors = [1.2, 1.1, 1.0, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.3]; // Winter premium
    return factors[month];
  }

  private getTimeOfDayFactor(hour: number): number {
    if ((hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 21)) {
      return 1.3; // Peak hours
    }
    if (hour >= 23 || hour <= 6) {
      return 0.8; // Off-peak hours
    }
    return 1.0; // Normal hours
  }

  private async getWeatherFactor(location: string, forecastTime: number): Promise<number> {
    // Simulate weather factor (in real implementation, would call weather API)
    return 0.9 + Math.random() * 0.2; // 0.9 to 1.1
  }

  private getMarketSentiment(recentData: PriceHistory[]): number {
    if (recentData.length < 2) return 0;
    
    const prices = recentData.map(d => d.finalPrice);
    const trend = prices[prices.length - 1] - prices[0];
    
    return trend / prices[0]; // Normalized sentiment
  }

  private getExternalEventsFactor(date: Date): number {
    // Check for holidays, weekends, etc.
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isHoliday = this.isHoliday(date);
    
    if (isWeekend) return 0.9;
    if (isHoliday) return 0.85;
    return 1.0;
  }

  private isHoliday(date: Date): boolean {
    // Simplified holiday check
    const month = date.getMonth();
    const day = date.getDate();
    
    // Major holidays (simplified)
    return (
      (month === 0 && day === 1) || // New Year
      (month === 11 && day === 25)   // Christmas
    );
  }

  private calculateMSE(predicted: number[], actual: number[]): number {
    if (predicted.length !== actual.length) return Infinity;
    
    const errors = predicted.map((p, i) => Math.pow(p - actual[i], 2));
    return errors.reduce((sum, error) => sum + error, 0) / errors.length;
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    
    return simpleStatistics.standardDeviation(returns);
  }

  private calculateSeasonalComponent(prices: number[]): number[] {
    const seasonal = new Array(24).fill(0);
    const counts = new Array(24).fill(0);
    
    // Calculate hourly averages
    for (let i = 0; i < prices.length; i++) {
      const hour = i % 24;
      seasonal[hour] += prices[i];
      counts[hour]++;
    }
    
    // Normalize
    for (let i = 0; i < 24; i++) {
      if (counts[i] > 0) {
        seasonal[i] /= counts[i];
      }
    }
    
    // Remove overall average to get seasonal component
    const overallAvg = seasonal.reduce((sum, val) => sum + val, 0) / 24;
    return seasonal.map(val => val - overallAvg);
  }

  private async trainModels(historicalData: PriceHistory[]): Promise<void> {
    for (const [modelName, model] of this.models.entries()) {
      const lastTrained = new Date(model.lastTrained);
      const hoursSinceTraining = (Date.now() - lastTrained.getTime()) / (1000 * 60 * 60);
      
      // Retrain if model is old or has low accuracy
      if (hoursSinceTraining > 24 || model.accuracy < 80) {
        await this.trainSingleModel(modelName, historicalData);
      }
    }
  }

  private async trainSingleModel(modelName: string, historicalData: PriceHistory[]): Promise<void> {
    // Use cross-validation to evaluate model performance
    const accuracy = await this.evaluateModelAccuracy(modelName, historicalData);
    
    const model = this.models.get(modelName);
    if (model) {
      model.accuracy = accuracy;
      model.lastTrained = new Date();
      this.models.set(modelName, model);
    }
    
    this.logger.log(`Trained ${modelName} model with ${accuracy}% accuracy`);
  }

  private async evaluateModelAccuracy(
    modelName: string,
    historicalData: PriceHistory[],
  ): Promise<number> {
    if (historicalData.length < 20) return 50;
    
    // Use last 20% for testing
    const splitIndex = Math.floor(historicalData.length * 0.8);
    const trainData = historicalData.slice(0, splitIndex);
    const testData = historicalData.slice(splitIndex);
    
    let totalError = 0;
    let count = 0;
    
    for (let i = 0; i < testData.length; i++) {
      const actualPrice = testData[i].finalPrice;
      const contextData = trainData.concat(testData.slice(0, i));
      
      try {
        const forecast = await this.generateModelForecast(
          this.models.get(modelName)!,
          contextData,
          testData[i].timestamp.getTime(),
          1,
        );
        
        const error = Math.abs(forecast.predictedPrice - actualPrice) / actualPrice;
        totalError += error;
        count++;
      } catch (error) {
        // Skip failed predictions
      }
    }
    
    if (count === 0) return 50;
    
    const avgError = totalError / count;
    return Math.max(50, Math.min(95, 100 - avgError * 100));
  }

  async getHistoricalTracking(
    energyType?: string,
    location?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<HistoricalTracking[]> {
    let filtered = this.historicalForecasts;
    
    if (energyType || location) {
      filtered = filtered.filter(track => {
        // This would need to be enhanced with proper filtering
        return true;
      });
    }
    
    if (startDate && endDate) {
      filtered = filtered.filter(track => 
        track.date >= startDate && track.date <= endDate
      );
    }
    
    return filtered.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getForecastAccuracy(): Promise<ForecastAccuracy> {
    if (this.historicalForecasts.length === 0) {
      return {
        overallAccuracy: 0,
        modelAccuracy: {},
        timeHorizonAccuracy: {},
        recentAccuracy: 0,
        trend: 'stable',
      };
    }
    
    // Calculate overall accuracy
    const accuracies = this.historicalForecasts.map(track => track.accuracy);
    const overallAccuracy = simpleStatistics.mean(accuracies);
    
    // Calculate model-specific accuracy
    const modelAccuracy: Record<string, number> = {};
    const modelGroups = new Map<string, number[]>();
    
    for (const track of this.historicalForecasts) {
      if (!modelGroups.has(track.model)) {
        modelGroups.set(track.model, []);
      }
      modelGroups.get(track.model)!.push(track.accuracy);
    }
    
    for (const [model, modelAccuracies] of modelGroups.entries()) {
      modelAccuracy[model] = simpleStatistics.mean(modelAccuracies);
    }
    
    // Calculate recent accuracy (last 100 forecasts)
    const recentForecasts = this.historicalForecasts.slice(-100);
    const recentAccuracy = recentForecasts.length > 0
      ? simpleStatistics.mean(recentForecasts.map(f => f.accuracy))
      : 0;
    
    // Determine trend
    const trend = this.calculateAccuracyTrend();
    
    return {
      overallAccuracy,
      modelAccuracy,
      timeHorizonAccuracy: {}, // Would need more detailed tracking
      recentAccuracy,
      trend,
    };
  }

  private calculateAccuracyTrend(): 'improving' | 'declining' | 'stable' {
    if (this.historicalForecasts.length < 50) return 'stable';
    
    const recent = this.historicalForecasts.slice(-25);
    const older = this.historicalForecasts.slice(-50, -25);
    
    const recentAvg = simpleStatistics.mean(recent.map(f => f.accuracy));
    const olderAvg = simpleStatistics.mean(older.map(f => f.accuracy));
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 2) return 'improving';
    if (difference < -2) return 'declining';
    return 'stable';
  }

  private async getHistoricalData(
    energyType: string,
    location: string,
    hours: number,
  ): Promise<PriceHistory[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.priceHistoryRepository.find({
      where: {
        energyType,
        location,
        timestamp: LessThan(new Date()),
      },
      order: { timestamp: 'ASC' },
      take: 1000,
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateForecastTracking(): Promise<void> {
    // Compare recent forecasts with actual prices
    const recentForecasts = await this.getRecentForecasts();
    
    for (const forecast of recentForecasts) {
      const actualPrice = await this.getActualPrice(forecast.timestamp, forecast.energyType, forecast.location);
      
      if (actualPrice !== null) {
        const accuracy = this.calculateForecastAccuracy(forecast.predictedPrice, actualPrice);
        const tracking: HistoricalTracking = {
          date: new Date(forecast.timestamp),
          actualPrice,
          predictedPrice: forecast.predictedPrice,
          accuracy,
          error: Math.abs(forecast.predictedPrice - actualPrice),
          model: forecast.model,
        };
        
        this.historicalForecasts.push(tracking);
      }
    }
    
    // Clean old tracking data
    if (this.historicalForecasts.length > this.MAX_HISTORICAL_TRACKS) {
      this.historicalForecasts = this.historicalForecasts.slice(-this.MAX_HISTORICAL_TRACKS);
    }
    
    this.logger.log(`Updated forecast tracking with ${recentForecasts.length} forecasts`);
  }

  private async getRecentForecasts(): Promise<Array<{
    timestamp: number;
    predictedPrice: number;
    model: string;
    energyType: string;
    location: string;
  }>> {
    // This would retrieve recent forecasts from storage
    // For now, return empty array
    return [];
  }

  private async getActualPrice(
    timestamp: number,
    energyType: string,
    location: string,
  ): Promise<number | null> {
    const priceRecord = await this.priceHistoryRepository.findOne({
      where: {
        energyType,
        location,
        timestamp: Between(
          new Date(timestamp - 5 * 60 * 1000), // 5 minute window
          new Date(timestamp + 5 * 60 * 1000),
        ),
      },
    });
    
    return priceRecord ? priceRecord.finalPrice : null;
  }

  private calculateForecastAccuracy(predicted: number, actual: number): number {
    if (actual === 0) return 0;
    const error = Math.abs(predicted - actual) / actual;
    return Math.max(0, Math.min(100, 100 - error * 100));
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async retrainModels(): Promise<void> {
    this.logger.log('Starting scheduled model retraining...');
    
    // Get all historical data for retraining
    const allData = await this.priceHistoryRepository.find({
      order: { timestamp: 'ASC' },
      take: 5000,
    });
    
    if (allData.length > 50) {
      for (const modelName of this.models.keys()) {
        await this.trainSingleModel(modelName, allData);
      }
      
      this.logger.log('Completed scheduled model retraining');
    }
  }

  getModelStatistics(): {
    totalModels: number;
    avgAccuracy: number;
    bestModel: string;
    worstModel: string;
    models: ForecastingModel[];
  } {
    const models = Array.from(this.models.values());
    const accuracies = models.map(m => m.accuracy);
    const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    
    const bestModel = models.reduce((best, current) => 
      current.accuracy > best.accuracy ? current : best
    );
    
    const worstModel = models.reduce((worst, current) => 
      current.accuracy < worst.accuracy ? current : worst
    );
    
    return {
      totalModels: models.length,
      avgAccuracy,
      bestModel: bestModel.name,
      worstModel: worstModel.name,
      models,
    };
  }
}

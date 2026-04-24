import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { BalancingData } from '../entities/balancing-data.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SimpleLinearRegression, PolynomialRegression } from 'ml-regression';
import * as ss from 'simple-statistics';

export interface ForecastResult {
  timestamp: Date;
  predictedValue: number;
  confidence: number;
  algorithm: string;
  factors: string[];
}

export interface ForecastMetrics {
  accuracy: number;
  mae: number;
  rmse: number;
  mape: number;
}

@Injectable()
export class DemandForecastService {
  private readonly logger = new Logger(DemandForecastService.name);
  private readonly FORECAST_HORIZON_HOURS = 24;
  private readonly MIN_ACCURACY_THRESHOLD = 0.85;
  
  // Cache for trained models
  private modelCache = new Map<string, any>();
  private readonly MODEL_CACHE_TTL = 3600000; // 1 hour

  constructor(
    @InjectRepository(BalancingData)
    private readonly balancingRepository: Repository<BalancingData>,
  ) {}

  async generateDemandForecast(
    regionId: string,
    horizonHours: number = this.FORECAST_HORIZON_HOURS,
    factors?: string[],
  ): Promise<ForecastResult[]> {
    this.logger.log(`Generating ${horizonHours}h demand forecast for region ${regionId}`);
    
    try {
      // Get historical data for training
      const historicalData = await this.getHistoricalData(regionId, 90); // 90 days
      
      if (historicalData.length < 168) { // Minimum 1 week of hourly data
        throw new Error('Insufficient historical data for accurate forecasting');
      }

      // Prepare features and targets
      const { features, targets } = this.prepareTrainingData(historicalData, factors);
      
      // Train and evaluate multiple models
      const models = await this.trainMultipleModels(features, targets);
      
      // Select best model based on accuracy
      const bestModel = this.selectBestModel(models);
      
      // Generate forecasts
      const forecasts = await this.generateForecasts(
        bestModel,
        regionId,
        horizonHours,
        features,
        factors,
      );

      // Store forecast results
      await this.storeForecastResults(regionId, forecasts);

      this.logger.log(`Generated ${forecasts.length} forecast points with accuracy ${bestModel.metrics.accuracy}`);
      return forecasts;
      
    } catch (error) {
      this.logger.error(`Failed to generate demand forecast: ${error.message}`);
      throw error;
    }
  }

  private async getHistoricalData(regionId: string, days: number): Promise<BalancingData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.balancingRepository.find({
      where: {
        regionId,
        forecastType: 'demand',
        timestamp: MoreThan(startDate),
      },
      order: { timestamp: 'ASC' },
    });
  }

  private prepareTrainingData(
    historicalData: BalancingData[],
    factors?: string[],
  ): { features: number[][]; targets: number[] } {
    const features: number[][] = [];
    const targets: number[] = [];

    for (let i = 0; i < historicalData.length - 1; i++) {
      const current = historicalData[i];
      const next = historicalData[i + 1];
      
      const feature = this.extractFeatures(current, factors);
      features.push(feature);
      targets.push(next.actualValue);
    }

    return { features, targets };
  }

  private extractFeatures(data: BalancingData, factors?: string[]): number[] {
    const features: number[] = [];
    
    // Time-based features
    const date = new Date(data.timestamp);
    features.push(date.getHours()); // Hour of day
    features.push(date.getDay()); // Day of week
    features.push(date.getMonth()); // Month
    features.push(date.getHours() >= 6 && date.getHours() <= 18 ? 1 : 0); // Is daytime
    
    // Lag features
    features.push(data.actualValue); // Current demand
    features.push(data.loadFactor || 0); // Load factor
    features.push(data.gridFrequency ? data.gridFrequency - 50 : 0); // Frequency deviation
    
    // Weather-related features (if available in metadata)
    if (data.metadata?.externalFactors) {
      features.push(data.metadata.externalFactors.temperature || 20);
      features.push(data.metadata.externalFactors.humidity || 50);
      features.push(data.metadata.externalFactors.windSpeed || 0);
    } else {
      features.push(20, 50, 0); // Default values
    }
    
    // Additional factors
    if (factors) {
      factors.forEach(factor => {
        if (data.metadata?.externalFactors?.[factor] !== undefined) {
          features.push(Number(data.metadata.externalFactors[factor]));
        } else {
          features.push(0);
        }
      });
    }
    
    return features;
  }

  private async trainMultipleModels(
    features: number[][],
    targets: number[],
  ): Promise<any[]> {
    const models = [];
    
    try {
      // Linear Regression
      const linearModel = new SimpleLinearRegression(
        features.map(f => f[0]), // Use first feature for simple linear
        targets,
      );
      const linearMetrics = this.evaluateModel(linearModel, features, targets);
      models.push({
        type: 'linear',
        model: linearModel,
        metrics: linearMetrics,
      });
      
      // Polynomial Regression (degree 2)
      if (features.length > 10) {
        const polyModel = new PolynomialRegression(features, targets, 2);
        const polyMetrics = this.evaluateModel(polyModel, features, targets);
        models.push({
          type: 'polynomial',
          model: polyModel,
          metrics: polyMetrics,
        });
      }
      
      // Moving Average Model
      const maModel = this.createMovingAverageModel(targets);
      const maMetrics = this.evaluateMovingAverageModel(maModel, targets);
      models.push({
        type: 'moving_average',
        model: maModel,
        metrics: maMetrics,
      });
      
      // Seasonal Decomposition Model
      const seasonalModel = this.createSeasonalModel(targets);
      const seasonalMetrics = this.evaluateSeasonalModel(seasonalModel, targets);
      models.push({
        type: 'seasonal',
        model: seasonalModel,
        metrics: seasonalMetrics,
      });
      
    } catch (error) {
      this.logger.warn(`Error training some models: ${error.message}`);
    }
    
    return models;
  }

  private evaluateModel(model: any, features: number[][], targets: number[]): ForecastMetrics {
    const predictions = features.map(f => model.predict(f[0])); // Simplified for linear
    
    const mae = ss.mean(predictions.map((p, i) => Math.abs(p - targets[i])));
    const rmse = Math.sqrt(ss.mean(predictions.map((p, i) => Math.pow(p - targets[i], 2))));
    const mape = ss.mean(predictions.map((p, i) => Math.abs((p - targets[i]) / targets[i]))) * 100;
    const accuracy = Math.max(0, 100 - mape);
    
    return { accuracy, mae, rmse, mape };
  }

  private evaluateMovingAverageModel(model: any, targets: number[]): ForecastMetrics {
    const predictions = this.predictMovingAverage(model, targets.length);
    
    const mae = ss.mean(predictions.map((p, i) => Math.abs(p - targets[i])));
    const rmse = Math.sqrt(ss.mean(predictions.map((p, i) => Math.pow(p - targets[i], 2))));
    const mape = ss.mean(predictions.map((p, i) => Math.abs((p - targets[i]) / targets[i]))) * 100;
    const accuracy = Math.max(0, 100 - mape);
    
    return { accuracy, mae, rmse, mape };
  }

  private evaluateSeasonalModel(model: any, targets: number[]): ForecastMetrics {
    const predictions = this.predictSeasonal(model, targets.length);
    
    const mae = ss.mean(predictions.map((p, i) => Math.abs(p - targets[i])));
    const rmse = Math.sqrt(ss.mean(predictions.map((p, i) => Math.pow(p - targets[i], 2))));
    const mape = ss.mean(predictions.map((p, i) => Math.abs((p - targets[i]) / targets[i]))) * 100;
    const accuracy = Math.max(0, 100 - mape);
    
    return { accuracy, mae, rmse, mape };
  }

  private createMovingAverageModel(targets: number[]): any {
    const windowSize = Math.min(24, Math.floor(targets.length / 4));
    return {
      type: 'moving_average',
      windowSize,
      data: targets.slice(-windowSize * 3), // Keep 3 windows of data
    };
  }

  private predictMovingAverage(model: any, count: number): number[] {
    const predictions: number[] = [];
    const data = [...model.data];
    
    for (let i = 0; i < count; i++) {
      const window = data.slice(-model.windowSize);
      const prediction = ss.mean(window);
      predictions.push(prediction);
      data.push(prediction);
    }
    
    return predictions;
  }

  private createSeasonalModel(targets: number[]): any {
    // Simple seasonal decomposition with 24-hour seasonality
    const seasonalPeriod = 24;
    const seasons: number[][] = [];
    
    for (let i = 0; i < seasonalPeriod; i++) {
      const seasonData: number[] = [];
      for (let j = i; j < targets.length; j += seasonalPeriod) {
        seasonData.push(targets[j]);
      }
      seasons.push(seasonData);
    }
    
    return {
      type: 'seasonal',
      seasonalPeriod,
      seasons,
      trend: ss.mean(targets),
    };
  }

  private predictSeasonal(model: any, count: number): number[] {
    const predictions: number[] = [];
    
    for (let i = 0; i < count; i++) {
      const seasonIndex = i % model.seasonalPeriod;
      const seasonData = model.seasons[seasonIndex];
      const seasonalComponent = ss.mean(seasonData.slice(-7)); // Last 7 periods
      predictions.push(model.trend + seasonalComponent);
    }
    
    return predictions;
  }

  private selectBestModel(models: any[]): any {
    if (models.length === 0) {
      throw new Error('No models trained successfully');
    }
    
    return models.reduce((best, current) => 
      current.metrics.accuracy > best.metrics.accuracy ? current : best
    );
  }

  private async generateForecasts(
    model: any,
    regionId: string,
    horizonHours: number,
    features: number[][],
    factors?: string[],
  ): Promise<ForecastResult[]> {
    const forecasts: ForecastResult[] = [];
    const now = new Date();
    
    for (let hour = 1; hour <= horizonHours; hour++) {
      const forecastTime = new Date(now.getTime() + hour * 60 * 60 * 1000);
      let predictedValue: number;
      
      if (model.type === 'linear') {
        // Simple prediction using time progression
        predictedValue = model.model.predict(hour);
      } else if (model.type === 'polynomial') {
        predictedValue = model.model.predict([hour, hour * hour]);
      } else if (model.type === 'moving_average') {
        predictedValue = this.predictMovingAverage(model.model, 1)[0];
      } else if (model.type === 'seasonal') {
        predictedValue = this.predictSeasonal(model.model, 1)[0];
      } else {
        predictedValue = model.model.predict(features[features.length - 1]);
      }
      
      // Apply confidence decay over time
      const confidence = Math.max(0.5, model.metrics.accuracy / 100 * (1 - hour / horizonHours * 0.3));
      
      forecasts.push({
        timestamp: forecastTime,
        predictedValue,
        confidence,
        algorithm: model.type,
        factors: factors || ['time', 'historical_demand', 'load_factor'],
      });
    }
    
    return forecasts;
  }

  private async storeForecastResults(regionId: string, forecasts: ForecastResult[]): Promise<void> {
    const entities = forecasts.map(forecast => 
      this.balancingRepository.create({
        regionId,
        timestamp: forecast.timestamp,
        forecastType: 'demand',
        predictedValue: forecast.predictedValue,
        confidence: forecast.confidence,
        metadata: {
          source: 'demand_forecast_service',
          algorithm: forecast.algorithm,
          parameters: { factors: forecast.factors },
        },
        status: 'active',
      })
    );
    
    await this.balancingRepository.save(entities);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async updateForecastModels(): Promise<void> {
    this.logger.log('Updating forecast models...');
    
    try {
      // Get all active regions
      const regions = await this.getActiveRegions();
      
      for (const regionId of regions) {
        await this.generateDemandForecast(regionId);
      }
      
      this.logger.log(`Updated forecast models for ${regions.length} regions`);
    } catch (error) {
      this.logger.error(`Failed to update forecast models: ${error.message}`);
    }
  }

  private async getActiveRegions(): Promise<string[]> {
    const result = await this.balancingRepository
      .createQueryBuilder('data')
      .select('DISTINCT data.regionId', 'regionId')
      .where('data.timestamp > :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getRawMany();
    
    return result.map(r => r.regionId);
  }

  async getForecastAccuracy(regionId: string, days: number = 7): Promise<ForecastMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const forecasts = await this.balancingRepository.find({
      where: {
        regionId,
        forecastType: 'demand',
        timestamp: MoreThan(startDate),
        actualValue: MoreThan(0),
        predictedValue: MoreThan(0),
      },
    });
    
    if (forecasts.length === 0) {
      return { accuracy: 0, mae: 0, rmse: 0, mape: 0 };
    }
    
    const actuals = forecasts.map(f => f.actualValue);
    const predictions = forecasts.map(f => f.predictedValue);
    
    const mae = ss.mean(predictions.map((p, i) => Math.abs(p - actuals[i])));
    const rmse = Math.sqrt(ss.mean(predictions.map((p, i) => Math.pow(p - actuals[i], 2))));
    const mape = ss.mean(predictions.map((p, i) => Math.abs((p - actuals[i]) / actuals[i]))) * 100;
    const accuracy = Math.max(0, 100 - mape);
    
    return { accuracy, mae, rmse, mape };
  }
}

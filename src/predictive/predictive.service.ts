import { Injectable } from '@nestjs/common';
import { ModelTrainerService } from './ml-models/model-trainer.service';
import { TimeSeriesService } from './forecasting/time-series.service';
import { InsightsGeneratorService } from './insights/insights-generator.service';
import { ModelMonitorService } from './monitoring/model-monitor.service';
import { PredictionEndpointsService } from './api/prediction-endpoints.service';

export interface MLModel {
  id: string;
  name: string;
  type: 'regression' | 'classification' | 'time-series' | 'clustering';
  version: string;
  status: 'training' | 'ready' | 'deployed' | 'failed';
  accuracy: number;
  lastTrained: string;
  features: string[];
  parameters: Record<string, any>;
}

export interface Prediction {
  id: string;
  modelId: string;
  timestamp: string;
  value: number | string;
  confidence: number;
  features: Record<string, any>;
  metadata: Record<string, any>;
}

export interface PredictiveInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  recommendations: string[];
  timestamp: string;
}

@Injectable()
export class PredictiveService {
  constructor(
    private readonly modelTrainerService: ModelTrainerService,
    private readonly timeSeriesService: TimeSeriesService,
    private readonly insightsService: InsightsGeneratorService,
    private readonly monitorService: ModelMonitorService,
    private readonly endpointsService: PredictionEndpointsService,
  ) {}

  async getAvailableModels(): Promise<MLModel[]> {
    try {
      return await this.modelTrainerService.getAvailableModels();
    } catch (error) {
      throw new Error(`Failed to get available models: ${error.message}`);
    }
  }

  async getPredictions(modelName?: string, horizonHours = 24): Promise<Prediction[]> {
    try {
      if (modelName) {
        return await this.endpointsService.getPredictionsForModel(modelName, horizonHours);
      } else {
        return await this.endpointsService.getAllPredictions(horizonHours);
      }
    } catch (error) {
      throw new Error(`Failed to get predictions: ${error.message}`);
    }
  }

  async makePrediction(modelName: string, data: any, options?: any): Promise<Prediction> {
    try {
      return await this.endpointsService.makePrediction(modelName, data, options);
    } catch (error) {
      throw new Error(`Failed to make prediction: ${error.message}`);
    }
  }

  async getInsights(type?: string, periodDays = 7): Promise<PredictiveInsight[]> {
    try {
      return await this.insightsService.getInsights(type, periodDays);
    } catch (error) {
      throw new Error(`Failed to get insights: ${error.message}`);
    }
  }

  async trainModel(modelName: string, parameters?: any, force = false): Promise<any> {
    try {
      return await this.modelTrainerService.trainModel(modelName, parameters, force);
    } catch (error) {
      throw new Error(`Failed to train model: ${error.message}`);
    }
  }

  async getModelPerformance(modelId: string): Promise<any> {
    try {
      return await this.monitorService.getModelPerformance(modelId);
    } catch (error) {
      throw new Error(`Failed to get model performance: ${error.message}`);
    }
  }

  async deployModel(modelId: string, version?: string): Promise<any> {
    try {
      return await this.modelTrainerService.deployModel(modelId, version);
    } catch (error) {
      throw new Error(`Failed to deploy model: ${error.message}`);
    }
  }

  async getMonitoringStatus(): Promise<any> {
    try {
      return await this.monitorService.getMonitoringStatus();
    } catch (error) {
      throw new Error(`Failed to get monitoring status: ${error.message}`);
    }
  }

  async getTimeSeriesForecast(metric: string, periodHours: number): Promise<any> {
    try {
      return await this.timeSeriesService.forecast(metric, periodHours);
    } catch (error) {
      throw new Error(`Failed to get time series forecast: ${error.message}`);
    }
  }

  async getFeatureEngineering(modelName?: string): Promise<any> {
    try {
      return await this.modelTrainerService.getFeatureEngineering(modelName);
    } catch (error) {
      throw new Error(`Failed to get feature engineering: ${error.message}`);
    }
  }

  async selectFeatures(modelName: string, features: string[], method?: string): Promise<any> {
    try {
      return await this.modelTrainerService.selectFeatures(modelName, features, method);
    } catch (error) {
      throw new Error(`Failed to select features: ${error.message}`);
    }
  }

  async getDataQuality(dataset?: string): Promise<any> {
    try {
      return await this.modelTrainerService.assessDataQuality(dataset);
    } catch (error) {
      throw new Error(`Failed to assess data quality: ${error.message}`);
    }
  }

  async getExperimentResults(experimentId: string): Promise<any> {
    try {
      return await this.modelTrainerService.getExperimentResults(experimentId);
    } catch (error) {
      throw new Error(`Failed to get experiment results: ${error.message}`);
    }
  }

  async createExperiment(name: string, description?: string, parameters?: any): Promise<any> {
    try {
      return await this.modelTrainerService.createExperiment(name, description, parameters);
    } catch (error) {
      throw new Error(`Failed to create experiment: ${error.message}`);
    }
  }

  async getDashboard(): Promise<any> {
    try {
      const [models, insights, monitoringStatus] = await Promise.all([
        this.getAvailableModels(),
        this.getInsights(),
        this.getMonitoringStatus(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        summary: {
          totalModels: models.length,
          deployedModels: models.filter(m => m.status === 'deployed').length,
          activeInsights: insights.length,
          healthyModels: monitoringStatus.healthyModels || 0,
        },
        models: models.slice(0, 5), // Top 5 models
        recentInsights: insights.slice(0, 10), // Top 10 insights
        monitoring: monitoringStatus,
        performance: this.calculateOverallPerformance(models),
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard: ${error.message}`);
    }
  }

  private calculateOverallPerformance(models: MLModel[]): any {
    if (models.length === 0) {
      return { averageAccuracy: 0, totalModels: 0 };
    }

    const totalAccuracy = models.reduce((sum, model) => sum + model.accuracy, 0);
    const averageAccuracy = totalAccuracy / models.length;

    return {
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      totalModels: models.length,
      bestModel: models.reduce((best, current) => 
        current.accuracy > best.accuracy ? current : best
      ),
      worstModel: models.reduce((worst, current) => 
        current.accuracy < worst.accuracy ? current : worst
      ),
    };
  }
}

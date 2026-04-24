import { Injectable, Logger } from '@nestjs/common';
import {
  TimeSeriesService,
  ForecastResult,
  TimeSeriesData,
} from '../models/time-series.service';
import { WeatherData } from '../integrations/weather-data.service';
import { EconomicData } from '../analysis/economic-indicator.service';
import { ForecastHorizon } from '../entities/forecast-data.entity';

export interface EnsembleConfig {
  models: string[];
  weights?: number[];
  diversityThreshold?: number;
  votingMethod?: 'weighted' | 'majority' | 'ranked';
  errorReductionMethod?: 'bagging' | 'boosting' | 'stacking';
}

export interface EnsembleResult {
  forecast: ForecastResult;
  individualForecasts: ForecastResult[];
  ensembleWeights: Record<string, number>;
  diversity: number;
  errorReduction: number;
  confidence: number;
  metadata: {
    method: string;
    modelCount: number;
    agreement: number;
    variance: number;
  };
}

export interface ModelPerformance {
  model: string;
  accuracy: number;
  mae: number;
  rmse: number;
  mape: number;
  bias: number;
  variance: number;
  consistency: number;
}

@Injectable()
export class EnsembleMethodsService {
  private readonly logger = new Logger(EnsembleMethodsService.name);

  constructor(private readonly timeSeriesService: TimeSeriesService) {}

  async createEnsembleForecast(
    data: TimeSeriesData[],
    horizon: ForecastHorizon,
    config: EnsembleConfig,
    weatherData?: WeatherData[],
    economicData?: EconomicData[],
  ): Promise<EnsembleResult> {
    try {
      // Generate individual forecasts
      const individualForecasts = await this.generateIndividualForecasts(
        data,
        horizon,
        config.models,
        weatherData,
        economicData,
      );

      if (individualForecasts.length === 0) {
        throw new Error(
          'No forecasts could be generated for ensemble processing',
        );
      }

      // Calculate model weights based on performance
      const weights = await this.calculateOptimalWeights(
        individualForecasts,
        config,
      );

      // Apply ensemble method
      const ensembleForecast = this.applyEnsembleMethod(
        individualForecasts,
        weights,
        config.votingMethod || 'weighted',
      );

      // Calculate ensemble metrics
      const diversity = this.calculateDiversity(individualForecasts);
      const errorReduction = this.calculateErrorReduction(
        individualForecasts,
        ensembleForecast,
      );
      const confidence = this.calculateEnsembleConfidence(
        individualForecasts,
        weights,
      );

      return {
        forecast: ensembleForecast,
        individualForecasts,
        ensembleWeights: weights,
        diversity,
        errorReduction,
        confidence,
        metadata: {
          method: config.votingMethod || 'weighted',
          modelCount: config.models.length,
          agreement: this.calculateAgreement(individualForecasts),
          variance: this.calculateForecastVariance(individualForecasts),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create ensemble forecast', error);
      throw error;
    }
  }

  async optimizeEnsemble(
    data: TimeSeriesData[],
    horizon: ForecastHorizon,
    candidateModels: string[],
    validationSplit: number = 0.2,
  ): Promise<EnsembleConfig> {
    try {
      // Split data for validation
      const trainSize = Math.floor(data.length * (1 - validationSplit));
      const trainData = data.slice(0, trainSize);
      const validationData = data.slice(trainSize);

      // Evaluate all candidate models
      const modelPerformances = await this.evaluateModels(
        trainData,
        validationData,
        horizon,
        candidateModels,
      );

      // Select best performing models
      const selectedModels = this.selectBestModels(modelPerformances, 5); // Top 5 models

      // Calculate optimal weights
      const weights = this.calculateWeightsFromPerformance(
        modelPerformances.filter((p) => selectedModels.includes(p.model)),
      );

      return {
        models: selectedModels,
        weights,
        diversityThreshold: 0.7,
        votingMethod: 'weighted',
        errorReductionMethod: 'bagging',
      };
    } catch (error) {
      this.logger.error('Failed to optimize ensemble', error);
      throw error;
    }
  }

  async baggingEnsemble(
    data: TimeSeriesData[],
    horizon: ForecastHorizon,
    models: string[],
    numBootstrap: number = 10,
  ): Promise<EnsembleResult> {
    try {
      const bootstrapForecasts: ForecastResult[] = [];

      for (let i = 0; i < numBootstrap; i++) {
        // Create bootstrap sample
        const bootstrapData = this.createBootstrapSample(data);

        // Generate forecasts for bootstrap sample
        const bootstrapResult = await this.createEnsembleForecast(
          bootstrapData,
          horizon,
          { models, votingMethod: 'weighted' },
        );

        bootstrapForecasts.push(bootstrapResult.forecast);
      }

      // Aggregate bootstrap forecasts
      const aggregatedForecast =
        this.aggregateBootstrapForecasts(bootstrapForecasts);

      return {
        forecast: aggregatedForecast,
        individualForecasts: bootstrapForecasts,
        ensembleWeights: this.calculateBootstrapWeights(bootstrapForecasts),
        diversity: this.calculateDiversity(bootstrapForecasts),
        errorReduction:
          this.calculateBootstrapErrorReduction(bootstrapForecasts),
        confidence: this.calculateBootstrapConfidence(bootstrapForecasts),
        metadata: {
          method: 'bagging',
          modelCount: numBootstrap,
          agreement: this.calculateAgreement(bootstrapForecasts),
          variance: this.calculateForecastVariance(bootstrapForecasts),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create bagging ensemble', error);
      throw error;
    }
  }

  async boostingEnsemble(
    data: TimeSeriesData[],
    horizon: ForecastHorizon,
    models: string[],
    numIterations: number = 10,
  ): Promise<EnsembleResult> {
    try {
      let currentData = [...data];
      const boostedForecasts: ForecastResult[] = [];
      const modelWeights: number[] = [];

      for (let i = 0; i < numIterations; i++) {
        // Train model on current data
        const iterationResult = await this.createEnsembleForecast(
          currentData,
          horizon,
          { models, votingMethod: 'weighted' },
        );

        // Calculate residuals
        const residuals = this.calculateResiduals(
          currentData,
          iterationResult.forecast,
        );

        // Update data weights based on residuals
        currentData = this.updateDataWeights(currentData, residuals);

        boostedForecasts.push(iterationResult.forecast);
        modelWeights.push(iterationResult.forecast.accuracy);
      }

      // Create final boosted forecast
      const finalForecast = this.createBoostedForecast(
        boostedForecasts,
        modelWeights,
      );

      return {
        forecast: finalForecast,
        individualForecasts: boostedForecasts,
        ensembleWeights: this.createWeightMap(models, modelWeights),
        diversity: this.calculateDiversity(boostedForecasts),
        errorReduction: this.calculateBoostingErrorReduction(boostedForecasts),
        confidence: this.calculateBoostingConfidence(
          boostedForecasts,
          modelWeights,
        ),
        metadata: {
          method: 'boosting',
          modelCount: numIterations,
          agreement: this.calculateAgreement(boostedForecasts),
          variance: this.calculateForecastVariance(boostedForecasts),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create boosting ensemble', error);
      throw error;
    }
  }

  async stackingEnsemble(
    data: TimeSeriesData[],
    horizon: ForecastHorizon,
    baseModels: string[],
    metaModel: string = 'linear',
  ): Promise<EnsembleResult> {
    try {
      // Split data for meta-learning
      const folds = this.createCrossValidationFolds(data, 5);
      const metaFeatures: number[][] = [];
      const metaTargets: number[] = [];

      // Generate out-of-sample predictions for meta-learning
      for (const fold of folds) {
        const trainData = fold.train;
        const testData = fold.test;

        const baseForecasts = await this.generateIndividualForecasts(
          trainData,
          horizon,
          baseModels,
        );

        // Use base models to predict on test data
        const testForecasts = await this.generateIndividualForecasts(
          testData,
          horizon,
          baseModels,
        );

        // Store predictions as meta-features
        const features = testForecasts.map((f) => f.predictedValue);
        metaFeatures.push(...features.map((f) => [f])); // Simplified for single value
        metaTargets.push(...testData.map((d) => d.value));
      }

      // Train meta-model
      const metaModelWeights = this.trainMetaModel(
        metaFeatures,
        metaTargets,
        metaModel,
      );

      // Generate final ensemble forecast
      const finalBaseForecasts = await this.generateIndividualForecasts(
        data,
        horizon,
        baseModels,
      );
      const finalForecast = this.applyMetaModel(
        finalBaseForecasts,
        metaModelWeights,
        horizon,
      );

      return {
        forecast: finalForecast,
        individualForecasts: finalBaseForecasts,
        ensembleWeights: this.createWeightMap(baseModels, metaModelWeights),
        diversity: this.calculateDiversity(finalBaseForecasts),
        errorReduction: this.calculateStackingErrorReduction(
          finalBaseForecasts,
          finalForecast,
        ),
        confidence: this.calculateStackingConfidence(
          finalBaseForecasts,
          metaModelWeights,
        ),
        metadata: {
          method: 'stacking',
          modelCount: baseModels.length,
          agreement: this.calculateAgreement(finalBaseForecasts),
          variance: this.calculateForecastVariance(finalBaseForecasts),
        },
      };
    } catch (error) {
      this.logger.error('Failed to create stacking ensemble', error);
      throw error;
    }
  }

  async evaluateEnsemblePerformance(
    ensembleResults: EnsembleResult[],
    actualData: TimeSeriesData[],
  ): Promise<{
    overallAccuracy: number;
    errorReduction: number;
    consistency: number;
    reliability: number;
  }> {
    try {
      if (ensembleResults.length === 0) {
        return {
          overallAccuracy: 0,
          errorReduction: 0,
          consistency: 0,
          reliability: 0,
        };
      }

      const accuracies = ensembleResults.map(
        (result) => result.forecast.accuracy,
      );
      const errorReductions = ensembleResults.map(
        (result) => result.errorReduction,
      );
      const confidences = ensembleResults.map((result) => result.confidence);

      const overallAccuracy =
        accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      const averageErrorReduction =
        errorReductions.reduce((sum, red) => sum + red, 0) /
        errorReductions.length;
      const averageConfidence =
        confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;

      // Calculate consistency (variance in performance)
      const consistency =
        1 - this.calculateVariance(accuracies) / Math.pow(overallAccuracy, 2);

      // Calculate reliability (confidence vs actual accuracy)
      const reliability = this.calculateReliability(
        ensembleResults,
        actualData,
      );

      return {
        overallAccuracy,
        errorReduction: averageErrorReduction,
        consistency,
        reliability,
      };
    } catch (error) {
      this.logger.error('Failed to evaluate ensemble performance', error);
      throw error;
    }
  }

  private async generateIndividualForecasts(
    data: TimeSeriesData[],
    horizon: ForecastHorizon,
    models: string[],
    weatherData?: WeatherData[],
    economicData?: EconomicData[],
  ): Promise<ForecastResult[]> {
    const forecasts: ForecastResult[] = [];

    for (const model of models) {
      try {
        let forecast: ForecastResult;

        switch (model) {
          case 'ARIMA':
            forecast = await this.timeSeriesService.arimaForecast(
              data,
              horizon,
            );
            break;
          case 'ExponentialSmoothing':
            forecast =
              await this.timeSeriesService.exponentialSmoothingForecast(
                data,
                horizon,
              );
            break;
          case 'LSTM':
            forecast = await this.timeSeriesService.lstmForecast(data, horizon);
            break;
          case 'Prophet':
            forecast = await this.timeSeriesService.prophetForecast(
              data,
              horizon,
            );
            break;
          default:
            this.logger.warn(`Unknown model: ${model}, skipping`);
            continue;
        }

        // Enhance forecast with external data if available
        if (weatherData || economicData) {
          forecast = this.enhanceForecastWithExternalData(
            forecast,
            weatherData,
            economicData,
          );
        }

        forecasts.push(forecast);
      } catch (error) {
        this.logger.error(
          `Failed to generate forecast with model ${model}`,
          error,
        );
      }
    }

    return forecasts;
  }

  private enhanceForecastWithExternalData(
    forecast: ForecastResult,
    weatherData?: WeatherData[],
    economicData?: EconomicData[],
  ): ForecastResult {
    let adjustment = 0;

    if (weatherData) {
      // Calculate weather impact
      const recentWeather = weatherData.slice(-7);
      const avgTemp =
        recentWeather.reduce((sum, d) => sum + d.temperature, 0) /
        recentWeather.length;
      const tempImpact = (avgTemp - 20) * 0.01; // 20°C as baseline
      adjustment += tempImpact;
    }

    if (economicData) {
      // Calculate economic impact
      const latestEconomic = economicData[economicData.length - 1];
      const gdpImpact = ((latestEconomic.gdp - 20000) / 20000) * 0.1; // 20T as baseline
      adjustment += gdpImpact;
    }

    return {
      ...forecast,
      predictedValue: forecast.predictedValue * (1 + adjustment),
      accuracy: Math.max(
        0.5,
        forecast.accuracy * (1 - Math.abs(adjustment) * 0.1),
      ),
    };
  }

  private async calculateOptimalWeights(
    forecasts: ForecastResult[],
    config: EnsembleConfig,
  ): Promise<Record<string, number>> {
    if (config.weights && config.weights.length === forecasts.length) {
      // Use provided weights
      const weights: Record<string, number> = {};
      forecasts.forEach((forecast, i) => {
        weights[forecast.model] = config.weights[i];
      });
      return weights;
    }

    // Calculate weights based on accuracy
    const totalAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0);
    const weights: Record<string, number> = {};

    forecasts.forEach((forecast) => {
      weights[forecast.model] = forecast.accuracy / totalAccuracy;
    });

    return weights;
  }

  private applyEnsembleMethod(
    forecasts: ForecastResult[],
    weights: Record<string, number>,
    method: string,
  ): ForecastResult {
    switch (method) {
      case 'weighted':
        return this.weightedAverage(forecasts, weights);
      case 'majority':
        return this.majorityVoting(forecasts);
      case 'ranked':
        return this.rankedVoting(forecasts);
      default:
        return this.weightedAverage(forecasts, weights);
    }
  }

  private weightedAverage(
    forecasts: ForecastResult[],
    weights: Record<string, number>,
  ): ForecastResult {
    if (forecasts.length === 0) {
      return {
        predictedValue: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        accuracy: 0,
        model: 'Ensemble',
        horizon: ForecastHorizon.ONE_HOUR,
        metadata: {
          method: 'weighted_average',
          modelCount: 0,
          variance: 0,
        },
      };
    }

    let weightedValue = 0;
    let weightedAccuracy = 0;
    let totalWeight = 0;

    forecasts.forEach((forecast) => {
      const weight = weights[forecast.model] || 0;
      weightedValue += forecast.predictedValue * weight;
      weightedAccuracy += forecast.accuracy * weight;
      totalWeight += weight;
    });

    if (totalWeight === 0) {
      // Fallback to simple average
      weightedValue =
        forecasts.reduce((sum, f) => sum + f.predictedValue, 0) /
        forecasts.length;
      weightedAccuracy =
        forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
      totalWeight = 1;
    }

    const ensembleValue = weightedValue / totalWeight;
    const ensembleAccuracy = weightedAccuracy / totalWeight;

    // Calculate ensemble confidence intervals
    const values = forecasts.map((f) => f.predictedValue);
    const variance = this.calculateVariance(values);
    const stdDev = Math.sqrt(variance);

    return {
      predictedValue: ensembleValue,
      confidenceInterval: {
        lower: ensembleValue - 1.96 * stdDev,
        upper: ensembleValue + 1.96 * stdDev,
      },
      accuracy: ensembleAccuracy,
      model: 'Ensemble',
      horizon: forecasts[0].horizon,
      metadata: {
        method: 'weighted_average',
        modelCount: forecasts.length,
        variance,
      },
    };
  }

  private majorityVoting(forecasts: ForecastResult[]): ForecastResult {
    if (forecasts.length === 0) {
      return {
        predictedValue: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        accuracy: 0,
        model: 'Ensemble-Majority',
        horizon: ForecastHorizon.ONE_HOUR,
      };
    }

    // Sort forecasts by predicted value
    const sortedForecasts = [...forecasts].sort(
      (a, b) => a.predictedValue - b.predictedValue,
    );

    // Take median as majority vote
    const medianIndex = Math.floor(sortedForecasts.length / 2);
    const medianForecast = sortedForecasts[medianIndex];

    // Calculate average accuracy
    const avgAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;

    return {
      ...medianForecast,
      accuracy: avgAccuracy,
      model: 'Ensemble-Majority',
      metadata: {
        method: 'majority_voting',
        modelCount: forecasts.length,
      },
    };
  }

  private rankedVoting(forecasts: ForecastResult[]): ForecastResult {
    if (forecasts.length === 0) {
      return {
        predictedValue: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        accuracy: 0,
        model: 'Ensemble-Ranked',
        horizon: ForecastHorizon.ONE_HOUR,
      };
    }

    // Rank models by accuracy
    const rankedForecasts = [...forecasts].sort(
      (a, b) => b.accuracy - a.accuracy,
    );

    // Weight by rank (higher accuracy gets more weight)
    let weightedValue = 0;
    let totalWeight = 0;

    rankedForecasts.forEach((forecast, index) => {
      const weight = 1 / (index + 1); // Inverse rank weighting
      weightedValue += forecast.predictedValue * weight;
      totalWeight += weight;
    });

    const ensembleValue = weightedValue / totalWeight;
    const avgAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;

    return {
      predictedValue: ensembleValue,
      confidenceInterval: {
        lower: ensembleValue * 0.95,
        upper: ensembleValue * 1.05,
      },
      accuracy: avgAccuracy,
      model: 'Ensemble-Ranked',
      horizon: forecasts[0].horizon,
      metadata: {
        method: 'ranked_voting',
        modelCount: forecasts.length,
      },
    };
  }

  private calculateDiversity(forecasts: ForecastResult[]): number {
    if (forecasts.length < 2) return 0;

    const values = forecasts.map((f) => f.predictedValue);
    const variance = this.calculateVariance(values);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;

    // Diversity as coefficient of variation
    return Math.sqrt(variance) / mean;
  }

  private calculateErrorReduction(
    individualForecasts: ForecastResult[],
    ensembleForecast: ForecastResult,
  ): number {
    if (individualForecasts.length === 0) {
      return 0;
    }

    const avgIndividualError =
      individualForecasts.reduce((sum, f) => sum + (1 - f.accuracy), 0) /
      individualForecasts.length;
    const ensembleError = 1 - ensembleForecast.accuracy;

    if (avgIndividualError <= 0) {
      return 0;
    }

    return Math.max(
      0,
      (avgIndividualError - ensembleError) / avgIndividualError,
    );
  }

  private calculateEnsembleConfidence(
    forecasts: ForecastResult[],
    weights: Record<string, number>,
  ): number {
    const weightedAccuracy = forecasts.reduce(
      (sum, f) => sum + f.accuracy * (weights[f.model] || 0),
      0,
    );
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

    return totalWeight > 0 ? weightedAccuracy / totalWeight : 0.5;
  }

  private calculateAgreement(forecasts: ForecastResult[]): number {
    if (forecasts.length < 2) return 1;

    const values = forecasts.map((f) => f.predictedValue);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = this.calculateVariance(values);

    // Agreement as inverse of normalized variance
    return Math.max(0, 1 - variance / (mean * mean));
  }

  private calculateForecastVariance(forecasts: ForecastResult[]): number {
    const values = forecasts.map((f) => f.predictedValue);
    return this.calculateVariance(values);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      values.length;

    return variance;
  }

  private async evaluateModels(
    trainData: TimeSeriesData[],
    validationData: TimeSeriesData[],
    horizon: ForecastHorizon,
    models: string[],
  ): Promise<ModelPerformance[]> {
    const performances: ModelPerformance[] = [];

    for (const model of models) {
      try {
        // Generate forecast on training data
        const forecast = await this.generateIndividualForecasts(
          trainData,
          horizon,
          [model],
        );

        if (forecast.length === 0) continue;

        // Calculate performance metrics
        const predicted = forecast[0].predictedValue;
        const actual = validationData[validationData.length - 1]?.value || 0;

        const accuracy = forecast[0].accuracy;
        const error = Math.abs(predicted - actual);
        const mae = error;
        const rmse = Math.sqrt(error * error);
        const mape = actual !== 0 ? (error / actual) * 100 : 0;
        const bias = predicted - actual;
        const variance = this.calculateVariance(
          validationData.map((d) => d.value),
        );
        const consistency = 1 - Math.abs(bias) / actual;

        performances.push({
          model,
          accuracy,
          mae,
          rmse,
          mape,
          bias,
          variance,
          consistency,
        });
      } catch (error) {
        this.logger.error(`Failed to evaluate model ${model}`, error);
      }
    }

    return performances;
  }

  private selectBestModels(
    performances: ModelPerformance[],
    count: number,
  ): string[] {
    return performances
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, count)
      .map((p) => p.model);
  }

  private calculateWeightsFromPerformance(
    performances: ModelPerformance[],
  ): number[] {
    const totalAccuracy = performances.reduce((sum, p) => sum + p.accuracy, 0);
    return performances.map((p) => p.accuracy / totalAccuracy);
  }

  private createBootstrapSample(data: TimeSeriesData[]): TimeSeriesData[] {
    const bootstrapData: TimeSeriesData[] = [];
    for (let i = 0; i < data.length; i++) {
      const randomIndex = Math.floor(Math.random() * data.length);
      bootstrapData.push(data[randomIndex]);
    }
    return bootstrapData.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  private aggregateBootstrapForecasts(
    forecasts: ForecastResult[],
  ): ForecastResult {
    const values = forecasts.map((f) => f.predictedValue);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = this.calculateVariance(values);
    const avgAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;

    return {
      predictedValue: mean,
      confidenceInterval: {
        lower: mean - 1.96 * Math.sqrt(variance),
        upper: mean + 1.96 * Math.sqrt(variance),
      },
      accuracy: avgAccuracy,
      model: 'Bootstrap-Ensemble',
      horizon: forecasts[0].horizon,
      metadata: {
        method: 'bootstrap_aggregation',
        variance,
      },
    };
  }

  private calculateBootstrapWeights(
    forecasts: ForecastResult[],
  ): Record<string, number> {
    const weights: Record<string, number> = {};
    forecasts.forEach((forecast, i) => {
      weights[`bootstrap_${i}`] = 1 / forecasts.length;
    });
    return weights;
  }

  private calculateBootstrapErrorReduction(
    forecasts: ForecastResult[],
  ): number {
    const avgIndividualAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
    const ensembleAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;

    return Math.max(
      0,
      (ensembleAccuracy - avgIndividualAccuracy) / avgIndividualAccuracy,
    );
  }

  private calculateBootstrapConfidence(forecasts: ForecastResult[]): number {
    return forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
  }

  private calculateResiduals(
    data: TimeSeriesData[],
    forecast: ForecastResult,
  ): number[] {
    return data.map((d) => d.value - forecast.predictedValue);
  }

  private updateDataWeights(
    data: TimeSeriesData[],
    residuals: number[],
  ): TimeSeriesData[] {
    // Increase weight for poorly predicted samples
    const maxResidual = Math.max(...residuals.map(Math.abs));
    return data.map((d, i) => ({
      ...d,
      value: d.value * (1 + (Math.abs(residuals[i]) / maxResidual) * 0.1),
    }));
  }

  private createBoostedForecast(
    forecasts: ForecastResult[],
    weights: number[],
  ): ForecastResult {
    const weightedValue = forecasts.reduce(
      (sum, f, i) => sum + f.predictedValue * weights[i],
      0,
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const avgAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;

    return {
      predictedValue: weightedValue / totalWeight,
      confidenceInterval: {
        lower: (weightedValue / totalWeight) * 0.95,
        upper: (weightedValue / totalWeight) * 1.05,
      },
      accuracy: avgAccuracy,
      model: 'Boosted-Ensemble',
      horizon: forecasts[0].horizon,
      metadata: {
        method: 'boosting',
        iterations: forecasts.length,
      },
    };
  }

  private createWeightMap(
    models: string[],
    weights: number[],
  ): Record<string, number> {
    const weightMap: Record<string, number> = {};
    models.forEach((model, i) => {
      weightMap[model] = weights[i] || 0;
    });
    return weightMap;
  }

  private calculateBoostingErrorReduction(forecasts: ForecastResult[]): number {
    if (forecasts.length < 2) return 0;

    const firstAccuracy = forecasts[0].accuracy;
    const lastAccuracy = forecasts[forecasts.length - 1].accuracy;

    return Math.max(0, (lastAccuracy - firstAccuracy) / firstAccuracy);
  }

  private calculateBoostingConfidence(
    forecasts: ForecastResult[],
    weights: number[],
  ): number {
    const weightedAccuracy = forecasts.reduce(
      (sum, f, i) => sum + f.accuracy * weights[i],
      0,
    );
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    return totalWeight > 0 ? weightedAccuracy / totalWeight : 0.5;
  }

  private createCrossValidationFolds(
    data: TimeSeriesData[],
    numFolds: number,
  ): Array<{ train: TimeSeriesData[]; test: TimeSeriesData[] }> {
    const folds: Array<{ train: TimeSeriesData[]; test: TimeSeriesData[] }> =
      [];
    const foldSize = Math.floor(data.length / numFolds);

    for (let i = 0; i < numFolds; i++) {
      const startIndex = i * foldSize;
      const endIndex = i === numFolds - 1 ? data.length : (i + 1) * foldSize;

      const test = data.slice(startIndex, endIndex);
      const train = [...data.slice(0, startIndex), ...data.slice(endIndex)];

      folds.push({ train, test });
    }

    return folds;
  }

  private trainMetaModel(
    features: number[][],
    targets: number[],
    method: string,
  ): number[] {
    switch (method) {
      case 'linear':
        return this.trainLinearRegression(features, targets);
      case 'ridge':
        return this.trainRidgeRegression(features, targets);
      case 'lasso':
        return this.trainLassoRegression(features, targets);
      default:
        return this.trainLinearRegression(features, targets);
    }
  }

  private trainLinearRegression(
    features: number[][],
    targets: number[],
  ): number[] {
    // Simplified linear regression
    // In production, use proper ML library
    const n = features.length;
    if (n === 0) return [1];

    const avgFeature = features.reduce((sum, f) => sum + f[0], 0) / n;
    const avgTarget = targets.reduce((sum, t) => sum + t, 0) / n;

    const numerator = features.reduce(
      (sum, f, i) => sum + (f[0] - avgFeature) * (targets[i] - avgTarget),
      0,
    );
    const denominator = features.reduce(
      (sum, f) => sum + Math.pow(f[0] - avgFeature, 2),
      0,
    );

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = avgTarget - slope * avgFeature;

    return [slope, intercept];
  }

  private trainRidgeRegression(
    features: number[][],
    targets: number[],
  ): number[] {
    // Simplified ridge regression
    const weights = this.trainLinearRegression(features, targets);
    const alpha = 0.1;
    return weights.map((w) => w / (1 + alpha));
  }

  private trainLassoRegression(
    features: number[][],
    targets: number[],
  ): number[] {
    // Simplified lasso regression
    const weights = this.trainLinearRegression(features, targets);
    const alpha = 0.1;
    return weights.map((w) => Math.sign(w) * Math.max(0, Math.abs(w) - alpha));
  }

  private applyMetaModel(
    forecasts: ForecastResult[],
    weights: number[],
    horizon: ForecastHorizon,
  ): ForecastResult {
    const features = forecasts.map((f) => f.predictedValue);
    const prediction = weights[0] * features[0] + (weights[1] || 0);

    const avgAccuracy =
      forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;

    return {
      predictedValue: prediction,
      confidenceInterval: {
        lower: prediction * 0.95,
        upper: prediction * 1.05,
      },
      accuracy: avgAccuracy,
      model: 'Stacking-Ensemble',
      horizon,
      metadata: {
        method: 'stacking',
        weights,
      },
    };
  }

  private calculateStackingErrorReduction(
    baseForecasts: ForecastResult[],
    metaForecast: ForecastResult,
  ): number {
    const avgBaseAccuracy =
      baseForecasts.reduce((sum, f) => sum + f.accuracy, 0) /
      baseForecasts.length;
    return Math.max(
      0,
      (metaForecast.accuracy - avgBaseAccuracy) / avgBaseAccuracy,
    );
  }

  private calculateStackingConfidence(
    baseForecasts: ForecastResult[],
    weights: number[],
  ): number {
    const avgBaseAccuracy =
      baseForecasts.reduce((sum, f) => sum + f.accuracy, 0) /
      baseForecasts.length;
    const weightMagnitude = Math.sqrt(
      weights.reduce((sum, w) => sum + w * w, 0),
    );
    return avgBaseAccuracy * (1 + weightMagnitude * 0.1);
  }

  private calculateReliability(
    ensembleResults: EnsembleResult[],
    actualData: TimeSeriesData[],
  ): number {
    // Calculate correlation between confidence and actual accuracy
    const confidences = ensembleResults.map((r) => r.confidence);
    const accuracies = ensembleResults.map((r) => r.forecast.accuracy);

    return this.calculateCorrelation(confidences, accuracies);
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }
}

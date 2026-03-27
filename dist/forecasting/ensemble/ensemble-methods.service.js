"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EnsembleMethodsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnsembleMethodsService = void 0;
const common_1 = require("@nestjs/common");
const time_series_service_1 = require("../models/time-series.service");
const forecast_data_entity_1 = require("../entities/forecast-data.entity");
let EnsembleMethodsService = EnsembleMethodsService_1 = class EnsembleMethodsService {
    constructor(timeSeriesService) {
        this.timeSeriesService = timeSeriesService;
        this.logger = new common_1.Logger(EnsembleMethodsService_1.name);
    }
    async createEnsembleForecast(data, horizon, config, weatherData, economicData) {
        try {
            const individualForecasts = await this.generateIndividualForecasts(data, horizon, config.models, weatherData, economicData);
            if (individualForecasts.length === 0) {
                throw new Error('No forecasts could be generated for ensemble processing');
            }
            const weights = await this.calculateOptimalWeights(individualForecasts, config);
            const ensembleForecast = this.applyEnsembleMethod(individualForecasts, weights, config.votingMethod || 'weighted');
            const diversity = this.calculateDiversity(individualForecasts);
            const errorReduction = this.calculateErrorReduction(individualForecasts, ensembleForecast);
            const confidence = this.calculateEnsembleConfidence(individualForecasts, weights);
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
        }
        catch (error) {
            this.logger.error('Failed to create ensemble forecast', error);
            throw error;
        }
    }
    async optimizeEnsemble(data, horizon, candidateModels, validationSplit = 0.2) {
        try {
            const trainSize = Math.floor(data.length * (1 - validationSplit));
            const trainData = data.slice(0, trainSize);
            const validationData = data.slice(trainSize);
            const modelPerformances = await this.evaluateModels(trainData, validationData, horizon, candidateModels);
            const selectedModels = this.selectBestModels(modelPerformances, 5);
            const weights = this.calculateWeightsFromPerformance(modelPerformances.filter((p) => selectedModels.includes(p.model)));
            return {
                models: selectedModels,
                weights,
                diversityThreshold: 0.7,
                votingMethod: 'weighted',
                errorReductionMethod: 'bagging',
            };
        }
        catch (error) {
            this.logger.error('Failed to optimize ensemble', error);
            throw error;
        }
    }
    async baggingEnsemble(data, horizon, models, numBootstrap = 10) {
        try {
            const bootstrapForecasts = [];
            for (let i = 0; i < numBootstrap; i++) {
                const bootstrapData = this.createBootstrapSample(data);
                const bootstrapResult = await this.createEnsembleForecast(bootstrapData, horizon, { models, votingMethod: 'weighted' });
                bootstrapForecasts.push(bootstrapResult.forecast);
            }
            const aggregatedForecast = this.aggregateBootstrapForecasts(bootstrapForecasts);
            return {
                forecast: aggregatedForecast,
                individualForecasts: bootstrapForecasts,
                ensembleWeights: this.calculateBootstrapWeights(bootstrapForecasts),
                diversity: this.calculateDiversity(bootstrapForecasts),
                errorReduction: this.calculateBootstrapErrorReduction(bootstrapForecasts),
                confidence: this.calculateBootstrapConfidence(bootstrapForecasts),
                metadata: {
                    method: 'bagging',
                    modelCount: numBootstrap,
                    agreement: this.calculateAgreement(bootstrapForecasts),
                    variance: this.calculateForecastVariance(bootstrapForecasts),
                },
            };
        }
        catch (error) {
            this.logger.error('Failed to create bagging ensemble', error);
            throw error;
        }
    }
    async boostingEnsemble(data, horizon, models, numIterations = 10) {
        try {
            let currentData = [...data];
            const boostedForecasts = [];
            const modelWeights = [];
            for (let i = 0; i < numIterations; i++) {
                const iterationResult = await this.createEnsembleForecast(currentData, horizon, { models, votingMethod: 'weighted' });
                const residuals = this.calculateResiduals(currentData, iterationResult.forecast);
                currentData = this.updateDataWeights(currentData, residuals);
                boostedForecasts.push(iterationResult.forecast);
                modelWeights.push(iterationResult.forecast.accuracy);
            }
            const finalForecast = this.createBoostedForecast(boostedForecasts, modelWeights);
            return {
                forecast: finalForecast,
                individualForecasts: boostedForecasts,
                ensembleWeights: this.createWeightMap(models, modelWeights),
                diversity: this.calculateDiversity(boostedForecasts),
                errorReduction: this.calculateBoostingErrorReduction(boostedForecasts),
                confidence: this.calculateBoostingConfidence(boostedForecasts, modelWeights),
                metadata: {
                    method: 'boosting',
                    modelCount: numIterations,
                    agreement: this.calculateAgreement(boostedForecasts),
                    variance: this.calculateForecastVariance(boostedForecasts),
                },
            };
        }
        catch (error) {
            this.logger.error('Failed to create boosting ensemble', error);
            throw error;
        }
    }
    async stackingEnsemble(data, horizon, baseModels, metaModel = 'linear') {
        try {
            const folds = this.createCrossValidationFolds(data, 5);
            const metaFeatures = [];
            const metaTargets = [];
            for (const fold of folds) {
                const trainData = fold.train;
                const testData = fold.test;
                const baseForecasts = await this.generateIndividualForecasts(trainData, horizon, baseModels);
                const testForecasts = await this.generateIndividualForecasts(testData, horizon, baseModels);
                const features = testForecasts.map((f) => f.predictedValue);
                metaFeatures.push(...features.map((f) => [f]));
                metaTargets.push(...testData.map((d) => d.value));
            }
            const metaModelWeights = this.trainMetaModel(metaFeatures, metaTargets, metaModel);
            const finalBaseForecasts = await this.generateIndividualForecasts(data, horizon, baseModels);
            const finalForecast = this.applyMetaModel(finalBaseForecasts, metaModelWeights, horizon);
            return {
                forecast: finalForecast,
                individualForecasts: finalBaseForecasts,
                ensembleWeights: this.createWeightMap(baseModels, metaModelWeights),
                diversity: this.calculateDiversity(finalBaseForecasts),
                errorReduction: this.calculateStackingErrorReduction(finalBaseForecasts, finalForecast),
                confidence: this.calculateStackingConfidence(finalBaseForecasts, metaModelWeights),
                metadata: {
                    method: 'stacking',
                    modelCount: baseModels.length,
                    agreement: this.calculateAgreement(finalBaseForecasts),
                    variance: this.calculateForecastVariance(finalBaseForecasts),
                },
            };
        }
        catch (error) {
            this.logger.error('Failed to create stacking ensemble', error);
            throw error;
        }
    }
    async evaluateEnsemblePerformance(ensembleResults, actualData) {
        try {
            if (ensembleResults.length === 0) {
                return {
                    overallAccuracy: 0,
                    errorReduction: 0,
                    consistency: 0,
                    reliability: 0,
                };
            }
            const accuracies = ensembleResults.map((result) => result.forecast.accuracy);
            const errorReductions = ensembleResults.map((result) => result.errorReduction);
            const confidences = ensembleResults.map((result) => result.confidence);
            const overallAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
            const averageErrorReduction = errorReductions.reduce((sum, red) => sum + red, 0) /
                errorReductions.length;
            const averageConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
            const consistency = 1 - this.calculateVariance(accuracies) / Math.pow(overallAccuracy, 2);
            const reliability = this.calculateReliability(ensembleResults, actualData);
            return {
                overallAccuracy,
                errorReduction: averageErrorReduction,
                consistency,
                reliability,
            };
        }
        catch (error) {
            this.logger.error('Failed to evaluate ensemble performance', error);
            throw error;
        }
    }
    async generateIndividualForecasts(data, horizon, models, weatherData, economicData) {
        const forecasts = [];
        for (const model of models) {
            try {
                let forecast;
                switch (model) {
                    case 'ARIMA':
                        forecast = await this.timeSeriesService.arimaForecast(data, horizon);
                        break;
                    case 'ExponentialSmoothing':
                        forecast =
                            await this.timeSeriesService.exponentialSmoothingForecast(data, horizon);
                        break;
                    case 'LSTM':
                        forecast = await this.timeSeriesService.lstmForecast(data, horizon);
                        break;
                    case 'Prophet':
                        forecast = await this.timeSeriesService.prophetForecast(data, horizon);
                        break;
                    default:
                        this.logger.warn(`Unknown model: ${model}, skipping`);
                        continue;
                }
                if (weatherData || economicData) {
                    forecast = this.enhanceForecastWithExternalData(forecast, weatherData, economicData);
                }
                forecasts.push(forecast);
            }
            catch (error) {
                this.logger.error(`Failed to generate forecast with model ${model}`, error);
            }
        }
        return forecasts;
    }
    enhanceForecastWithExternalData(forecast, weatherData, economicData) {
        let adjustment = 0;
        if (weatherData) {
            const recentWeather = weatherData.slice(-7);
            const avgTemp = recentWeather.reduce((sum, d) => sum + d.temperature, 0) /
                recentWeather.length;
            const tempImpact = (avgTemp - 20) * 0.01;
            adjustment += tempImpact;
        }
        if (economicData) {
            const latestEconomic = economicData[economicData.length - 1];
            const gdpImpact = ((latestEconomic.gdp - 20000) / 20000) * 0.1;
            adjustment += gdpImpact;
        }
        return {
            ...forecast,
            predictedValue: forecast.predictedValue * (1 + adjustment),
            accuracy: Math.max(0.5, forecast.accuracy * (1 - Math.abs(adjustment) * 0.1)),
        };
    }
    async calculateOptimalWeights(forecasts, config) {
        if (config.weights && config.weights.length === forecasts.length) {
            const weights = {};
            forecasts.forEach((forecast, i) => {
                weights[forecast.model] = config.weights[i];
            });
            return weights;
        }
        const totalAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0);
        const weights = {};
        forecasts.forEach((forecast) => {
            weights[forecast.model] = forecast.accuracy / totalAccuracy;
        });
        return weights;
    }
    applyEnsembleMethod(forecasts, weights, method) {
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
    weightedAverage(forecasts, weights) {
        if (forecasts.length === 0) {
            return {
                predictedValue: 0,
                confidenceInterval: { lower: 0, upper: 0 },
                accuracy: 0,
                model: 'Ensemble',
                horizon: forecast_data_entity_1.ForecastHorizon.ONE_HOUR,
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
            weightedValue =
                forecasts.reduce((sum, f) => sum + f.predictedValue, 0) /
                    forecasts.length;
            weightedAccuracy =
                forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
            totalWeight = 1;
        }
        const ensembleValue = weightedValue / totalWeight;
        const ensembleAccuracy = weightedAccuracy / totalWeight;
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
    majorityVoting(forecasts) {
        if (forecasts.length === 0) {
            return {
                predictedValue: 0,
                confidenceInterval: { lower: 0, upper: 0 },
                accuracy: 0,
                model: 'Ensemble-Majority',
                horizon: forecast_data_entity_1.ForecastHorizon.ONE_HOUR,
            };
        }
        const sortedForecasts = [...forecasts].sort((a, b) => a.predictedValue - b.predictedValue);
        const medianIndex = Math.floor(sortedForecasts.length / 2);
        const medianForecast = sortedForecasts[medianIndex];
        const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
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
    rankedVoting(forecasts) {
        if (forecasts.length === 0) {
            return {
                predictedValue: 0,
                confidenceInterval: { lower: 0, upper: 0 },
                accuracy: 0,
                model: 'Ensemble-Ranked',
                horizon: forecast_data_entity_1.ForecastHorizon.ONE_HOUR,
            };
        }
        const rankedForecasts = [...forecasts].sort((a, b) => b.accuracy - a.accuracy);
        let weightedValue = 0;
        let totalWeight = 0;
        rankedForecasts.forEach((forecast, index) => {
            const weight = 1 / (index + 1);
            weightedValue += forecast.predictedValue * weight;
            totalWeight += weight;
        });
        const ensembleValue = weightedValue / totalWeight;
        const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
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
    calculateDiversity(forecasts) {
        if (forecasts.length < 2)
            return 0;
        const values = forecasts.map((f) => f.predictedValue);
        const variance = this.calculateVariance(values);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(variance) / mean;
    }
    calculateErrorReduction(individualForecasts, ensembleForecast) {
        if (individualForecasts.length === 0) {
            return 0;
        }
        const avgIndividualError = individualForecasts.reduce((sum, f) => sum + (1 - f.accuracy), 0) /
            individualForecasts.length;
        const ensembleError = 1 - ensembleForecast.accuracy;
        if (avgIndividualError <= 0) {
            return 0;
        }
        return Math.max(0, (avgIndividualError - ensembleError) / avgIndividualError);
    }
    calculateEnsembleConfidence(forecasts, weights) {
        const weightedAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy * (weights[f.model] || 0), 0);
        const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
        return totalWeight > 0 ? weightedAccuracy / totalWeight : 0.5;
    }
    calculateAgreement(forecasts) {
        if (forecasts.length < 2)
            return 1;
        const values = forecasts.map((f) => f.predictedValue);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = this.calculateVariance(values);
        return Math.max(0, 1 - variance / (mean * mean));
    }
    calculateForecastVariance(forecasts) {
        const values = forecasts.map((f) => f.predictedValue);
        return this.calculateVariance(values);
    }
    calculateVariance(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
            values.length;
        return variance;
    }
    async evaluateModels(trainData, validationData, horizon, models) {
        const performances = [];
        for (const model of models) {
            try {
                const forecast = await this.generateIndividualForecasts(trainData, horizon, [model]);
                if (forecast.length === 0)
                    continue;
                const predicted = forecast[0].predictedValue;
                const actual = validationData[validationData.length - 1]?.value || 0;
                const accuracy = forecast[0].accuracy;
                const error = Math.abs(predicted - actual);
                const mae = error;
                const rmse = Math.sqrt(error * error);
                const mape = actual !== 0 ? (error / actual) * 100 : 0;
                const bias = predicted - actual;
                const variance = this.calculateVariance(validationData.map((d) => d.value));
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
            }
            catch (error) {
                this.logger.error(`Failed to evaluate model ${model}`, error);
            }
        }
        return performances;
    }
    selectBestModels(performances, count) {
        return performances
            .sort((a, b) => b.accuracy - a.accuracy)
            .slice(0, count)
            .map((p) => p.model);
    }
    calculateWeightsFromPerformance(performances) {
        const totalAccuracy = performances.reduce((sum, p) => sum + p.accuracy, 0);
        return performances.map((p) => p.accuracy / totalAccuracy);
    }
    createBootstrapSample(data) {
        const bootstrapData = [];
        for (let i = 0; i < data.length; i++) {
            const randomIndex = Math.floor(Math.random() * data.length);
            bootstrapData.push(data[randomIndex]);
        }
        return bootstrapData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    aggregateBootstrapForecasts(forecasts) {
        const values = forecasts.map((f) => f.predictedValue);
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = this.calculateVariance(values);
        const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
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
    calculateBootstrapWeights(forecasts) {
        const weights = {};
        forecasts.forEach((forecast, i) => {
            weights[`bootstrap_${i}`] = 1 / forecasts.length;
        });
        return weights;
    }
    calculateBootstrapErrorReduction(forecasts) {
        const avgIndividualAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
        const ensembleAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
        return Math.max(0, (ensembleAccuracy - avgIndividualAccuracy) / avgIndividualAccuracy);
    }
    calculateBootstrapConfidence(forecasts) {
        return forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
    }
    calculateResiduals(data, forecast) {
        return data.map((d) => d.value - forecast.predictedValue);
    }
    updateDataWeights(data, residuals) {
        const maxResidual = Math.max(...residuals.map(Math.abs));
        return data.map((d, i) => ({
            ...d,
            value: d.value * (1 + (Math.abs(residuals[i]) / maxResidual) * 0.1),
        }));
    }
    createBoostedForecast(forecasts, weights) {
        const weightedValue = forecasts.reduce((sum, f, i) => sum + f.predictedValue * weights[i], 0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
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
    createWeightMap(models, weights) {
        const weightMap = {};
        models.forEach((model, i) => {
            weightMap[model] = weights[i] || 0;
        });
        return weightMap;
    }
    calculateBoostingErrorReduction(forecasts) {
        if (forecasts.length < 2)
            return 0;
        const firstAccuracy = forecasts[0].accuracy;
        const lastAccuracy = forecasts[forecasts.length - 1].accuracy;
        return Math.max(0, (lastAccuracy - firstAccuracy) / firstAccuracy);
    }
    calculateBoostingConfidence(forecasts, weights) {
        const weightedAccuracy = forecasts.reduce((sum, f, i) => sum + f.accuracy * weights[i], 0);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        return totalWeight > 0 ? weightedAccuracy / totalWeight : 0.5;
    }
    createCrossValidationFolds(data, numFolds) {
        const folds = [];
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
    trainMetaModel(features, targets, method) {
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
    trainLinearRegression(features, targets) {
        const n = features.length;
        if (n === 0)
            return [1];
        const avgFeature = features.reduce((sum, f) => sum + f[0], 0) / n;
        const avgTarget = targets.reduce((sum, t) => sum + t, 0) / n;
        const numerator = features.reduce((sum, f, i) => sum + (f[0] - avgFeature) * (targets[i] - avgTarget), 0);
        const denominator = features.reduce((sum, f) => sum + Math.pow(f[0] - avgFeature, 2), 0);
        const slope = denominator !== 0 ? numerator / denominator : 0;
        const intercept = avgTarget - slope * avgFeature;
        return [slope, intercept];
    }
    trainRidgeRegression(features, targets) {
        const weights = this.trainLinearRegression(features, targets);
        const alpha = 0.1;
        return weights.map((w) => w / (1 + alpha));
    }
    trainLassoRegression(features, targets) {
        const weights = this.trainLinearRegression(features, targets);
        const alpha = 0.1;
        return weights.map((w) => Math.sign(w) * Math.max(0, Math.abs(w) - alpha));
    }
    applyMetaModel(forecasts, weights, horizon) {
        const features = forecasts.map((f) => f.predictedValue);
        const prediction = weights[0] * features[0] + (weights[1] || 0);
        const avgAccuracy = forecasts.reduce((sum, f) => sum + f.accuracy, 0) / forecasts.length;
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
    calculateStackingErrorReduction(baseForecasts, metaForecast) {
        const avgBaseAccuracy = baseForecasts.reduce((sum, f) => sum + f.accuracy, 0) /
            baseForecasts.length;
        return Math.max(0, (metaForecast.accuracy - avgBaseAccuracy) / avgBaseAccuracy);
    }
    calculateStackingConfidence(baseForecasts, weights) {
        const avgBaseAccuracy = baseForecasts.reduce((sum, f) => sum + f.accuracy, 0) /
            baseForecasts.length;
        const weightMagnitude = Math.sqrt(weights.reduce((sum, w) => sum + w * w, 0));
        return avgBaseAccuracy * (1 + weightMagnitude * 0.1);
    }
    calculateReliability(ensembleResults, actualData) {
        const confidences = ensembleResults.map((r) => r.confidence);
        const accuracies = ensembleResults.map((r) => r.forecast.accuracy);
        return this.calculateCorrelation(confidences, accuracies);
    }
    calculateCorrelation(x, y) {
        if (x.length !== y.length || x.length === 0)
            return 0;
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
        const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
        const numerator = n * sumXY - sumX * sumY;
        const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        return denominator === 0 ? 0 : numerator / denominator;
    }
};
exports.EnsembleMethodsService = EnsembleMethodsService;
exports.EnsembleMethodsService = EnsembleMethodsService = EnsembleMethodsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [time_series_service_1.TimeSeriesService])
], EnsembleMethodsService);
//# sourceMappingURL=ensemble-methods.service.js.map
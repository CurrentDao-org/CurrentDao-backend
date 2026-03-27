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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MarketForecastingController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketForecastingController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const forecast_query_dto_1 = require("./dto/forecast-query.dto");
const time_series_service_1 = require("./models/time-series.service");
const weather_data_service_1 = require("./integrations/weather-data.service");
const economic_indicator_service_1 = require("./analysis/economic-indicator.service");
const trend_prediction_service_1 = require("./prediction/trend-prediction.service");
const ensemble_methods_service_1 = require("./ensemble/ensemble-methods.service");
let MarketForecastingController = MarketForecastingController_1 = class MarketForecastingController {
    constructor(timeSeriesService, weatherDataService, economicIndicatorService, trendPredictionService, ensembleMethodsService) {
        this.timeSeriesService = timeSeriesService;
        this.weatherDataService = weatherDataService;
        this.economicIndicatorService = economicIndicatorService;
        this.trendPredictionService = trendPredictionService;
        this.ensembleMethodsService = ensembleMethodsService;
        this.logger = new common_1.Logger(MarketForecastingController_1.name);
    }
    async generateForecast(query) {
        try {
            this.logger.log(`Generating forecast for ${query.marketType} with ${query.forecastHorizon} horizon`);
            const historicalData = await this.getHistoricalData(query);
            const forecasts = [];
            const models = query.models || [
                'ARIMA',
                'ExponentialSmoothing',
                'LSTM',
                'Prophet',
            ];
            for (const model of models) {
                try {
                    const forecast = await this.runModel(historicalData, model, query.forecastHorizon);
                    forecasts.push(forecast);
                }
                catch (error) {
                    this.logger.warn(`Failed to run model ${model}: ${error.message}`);
                }
            }
            if (forecasts.length === 0) {
                throw new common_1.HttpException('No forecasts could be generated', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            const bestForecast = forecasts.reduce((best, current) => current.accuracy > best.accuracy ? current : best);
            return bestForecast;
        }
        catch (error) {
            this.logger.error('Failed to generate forecast', error);
            throw new common_1.HttpException(error.message || 'Failed to generate forecast', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateEnsembleForecast(body) {
        try {
            const { query, config } = body;
            this.logger.log(`Generating ensemble forecast for ${query.marketType}`);
            const historicalData = await this.getHistoricalData(query);
            const weatherData = await this.getWeatherDataFromQuery(query);
            const economicData = await this.getEconomicData(query);
            const ensembleConfig = {
                models: config.models,
                weights: config.weights,
                diversityThreshold: config.diversityThreshold,
                votingMethod: config.votingMethod || 'weighted',
            };
            return await this.ensembleMethodsService.createEnsembleForecast(historicalData, query.forecastHorizon, ensembleConfig, weatherData, economicData);
        }
        catch (error) {
            this.logger.error('Failed to generate ensemble forecast', error);
            throw new common_1.HttpException(error.message || 'Failed to generate ensemble forecast', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async optimizeEnsemble(query) {
        try {
            const historicalData = await this.getHistoricalData(query);
            const candidateModels = [
                'ARIMA',
                'ExponentialSmoothing',
                'LSTM',
                'Prophet',
            ];
            return await this.ensembleMethodsService.optimizeEnsemble(historicalData, query.forecastHorizon, candidateModels);
        }
        catch (error) {
            this.logger.error('Failed to optimize ensemble', error);
            throw new common_1.HttpException(error.message || 'Failed to optimize ensemble', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async predictTrend(query) {
        try {
            const historicalData = await this.getHistoricalData(query);
            const weatherData = await this.getWeatherDataFromQuery(query);
            const economicData = await this.getEconomicData(query);
            return await this.trendPredictionService.predictMarketTrend(historicalData, weatherData, economicData);
        }
        catch (error) {
            this.logger.error('Failed to predict trend', error);
            throw new common_1.HttpException(error.message || 'Failed to predict trend', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateMarketSignals(body) {
        try {
            const trendPrediction = await this.predictTrend(body.query);
            return await this.trendPredictionService.generateMarketSignals(trendPrediction, body.currentPosition);
        }
        catch (error) {
            this.logger.error('Failed to generate market signals', error);
            throw new common_1.HttpException(error.message || 'Failed to generate market signals', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async recognizePatterns(query) {
        try {
            const historicalData = await this.getHistoricalData(query);
            return await this.trendPredictionService.recognizePatterns(historicalData);
        }
        catch (error) {
            this.logger.error('Failed to recognize patterns', error);
            throw new common_1.HttpException(error.message || 'Failed to recognize patterns', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async calculateVolatility(marketType, windowSize) {
        try {
            const historicalData = await this.getHistoricalData({
                marketType,
            });
            return await this.trendPredictionService.calculateVolatility(historicalData, windowSize);
        }
        catch (error) {
            this.logger.error('Failed to calculate volatility', error);
            throw new common_1.HttpException(error.message || 'Failed to calculate volatility', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getWeatherDataEndpoint(location, startDate, endDate) {
        try {
            if (startDate && endDate) {
                return await this.weatherDataService.getHistoricalWeather(location, new Date(startDate), new Date(endDate));
            }
            else {
                const current = await this.weatherDataService.getCurrentWeather(location);
                return [current];
            }
        }
        catch (error) {
            this.logger.error('Failed to get weather data', error);
            throw new common_1.HttpException(error.message || 'Failed to get weather data', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getEconomicIndicators(region = 'US', startDate, endDate) {
        try {
            if (startDate && endDate) {
                return await this.economicIndicatorService.getEconomicSnapshot(region);
            }
            else {
                return await this.economicIndicatorService.getEconomicSnapshot(region);
            }
        }
        catch (error) {
            this.logger.error('Failed to get economic indicators', error);
            throw new common_1.HttpException(error.message || 'Failed to get economic indicators', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    getAvailableModels() {
        return [
            {
                name: 'ARIMA',
                description: 'AutoRegressive Integrated Moving Average model for time series forecasting',
                suitableFor: ['short-term', 'medium-term', 'stationary-data'],
            },
            {
                name: 'ExponentialSmoothing',
                description: 'Exponential smoothing methods for time series forecasting',
                suitableFor: ['short-term', 'trend-data', 'seasonal-data'],
            },
            {
                name: 'LSTM',
                description: 'Long Short-Term Memory neural network for complex pattern recognition',
                suitableFor: ['long-term', 'non-linear-data', 'complex-patterns'],
            },
            {
                name: 'Prophet',
                description: 'Facebook Prophet for forecasting with seasonality and holidays',
                suitableFor: ['business-data', 'seasonal-data', 'holiday-effects'],
            },
        ];
    }
    getAvailableHorizons() {
        return [
            {
                value: '1h',
                label: '1 Hour',
                description: 'Very short-term forecast for immediate trading decisions',
            },
            {
                value: '6h',
                label: '6 Hours',
                description: 'Short-term forecast for intraday trading',
            },
            {
                value: '24h',
                label: '24 Hours',
                description: 'Daily forecast for short-term positioning',
            },
            {
                value: '1w',
                label: '1 Week',
                description: 'Weekly forecast for medium-term strategies',
            },
            {
                value: '1m',
                label: '1 Month',
                description: 'Monthly forecast for medium-term planning',
            },
            {
                value: '3m',
                label: '3 Months',
                description: 'Quarterly forecast for strategic planning',
            },
            {
                value: '6m',
                label: '6 Months',
                description: 'Semi-annual forecast for budget planning',
            },
            {
                value: '1y',
                label: '1 Year',
                description: 'Annual forecast for long-term strategy',
            },
        ];
    }
    async getModelPerformance(marketType) {
        try {
            const historicalData = await this.getHistoricalData({
                marketType,
            });
            const models = ['ARIMA', 'ExponentialSmoothing', 'LSTM', 'Prophet'];
            const performance = {};
            for (const model of models) {
                try {
                    const metrics = await this.timeSeriesService.evaluateModel(historicalData, model);
                    performance[model] = metrics;
                }
                catch (error) {
                    this.logger.warn(`Failed to evaluate model ${model}: ${error.message}`);
                    performance[model] = { error: 'Evaluation failed' };
                }
            }
            return performance;
        }
        catch (error) {
            this.logger.error('Failed to get model performance', error);
            throw new common_1.HttpException(error.message || 'Failed to get model performance', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getHistoricalData(query) {
        await Promise.resolve();
        const data = [];
        const now = new Date();
        const dataPoints = query.forecastHorizon.includes('h') ? 168 : 365;
        for (let i = dataPoints; i > 0; i--) {
            const timestamp = new Date(now.getTime() - i * 3600000);
            const baseValue = 100;
            const trend = i * 0.1;
            const noise = (Math.random() - 0.5) * 10;
            const value = baseValue + trend + noise;
            data.push({
                timestamp,
                value,
                volume: Math.floor(Math.random() * 1000000),
                metadata: {
                    marketType: query.marketType,
                    source: 'mock',
                },
            });
        }
        return data;
    }
    async getWeatherDataFromQuery(query) {
        await Promise.resolve();
        const data = [];
        const now = new Date();
        for (let i = 7; i > 0; i--) {
            const timestamp = new Date(now.getTime() - i * 24 * 3600000);
            data.push({
                timestamp,
                temperature: 15 + Math.random() * 20,
                humidity: 40 + Math.random() * 40,
                windSpeed: Math.random() * 15,
                windDirection: Math.random() * 360,
                precipitation: Math.random() * 10,
                pressure: 1000 + Math.random() * 50,
                visibility: 5 + Math.random() * 15,
                cloudCover: Math.random() * 100,
                uvIndex: Math.random() * 11,
                location: query.marketType || 'New York',
            });
        }
        return data;
    }
    async getEconomicData(query) {
        await Promise.resolve();
        const baseEnergyPrice = query.marketType === 'oil' ? 75 : 80;
        return [
            {
                gdp: 21000 + Math.random() * 2000,
                inflation: 2 + Math.random() * 2,
                unemployment: 3 + Math.random() * 3,
                interestRate: 2 + Math.random() * 3,
                industrialProduction: 100 + Math.random() * 20,
                consumerConfidence: 80 + Math.random() * 40,
                manufacturingIndex: 50 + Math.random() * 20,
                retailSales: 500000 + Math.random() * 100000,
                energyPrices: baseEnergyPrice + Math.random() * 40,
                currencyExchange: 1 + Math.random() * 0.2,
            },
        ];
    }
    async runModel(data, model, horizon) {
        switch (model) {
            case 'ARIMA':
                return await this.timeSeriesService.arimaForecast(data, horizon);
            case 'ExponentialSmoothing':
                return await this.timeSeriesService.exponentialSmoothingForecast(data, horizon);
            case 'LSTM':
                return await this.timeSeriesService.lstmForecast(data, horizon);
            case 'Prophet':
                return await this.timeSeriesService.prophetForecast(data, horizon);
            default:
                throw new Error(`Unknown model: ${model}`);
        }
    }
};
exports.MarketForecastingController = MarketForecastingController;
__decorate([
    (0, common_1.Post)('forecast'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate market forecast' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Forecast generated successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid request parameters' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forecast_query_dto_1.ForecastQueryDto]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "generateForecast", null);
__decorate([
    (0, common_1.Post)('ensemble'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate ensemble forecast' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Ensemble forecast generated successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "generateEnsembleForecast", null);
__decorate([
    (0, common_1.Post)('optimize-ensemble'),
    (0, swagger_1.ApiOperation)({ summary: 'Optimize ensemble configuration' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Ensemble optimized successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forecast_query_dto_1.ForecastQueryDto]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "optimizeEnsemble", null);
__decorate([
    (0, common_1.Post)('trend-prediction'),
    (0, swagger_1.ApiOperation)({ summary: 'Predict market trends' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Trend prediction completed successfully',
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forecast_query_dto_1.ForecastQueryDto]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "predictTrend", null);
__decorate([
    (0, common_1.Post)('market-signals'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate trading signals' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Signals generated successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "generateMarketSignals", null);
__decorate([
    (0, common_1.Post)('pattern-recognition'),
    (0, swagger_1.ApiOperation)({ summary: 'Recognize chart patterns' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Patterns recognized successfully' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forecast_query_dto_1.ForecastQueryDto]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "recognizePatterns", null);
__decorate([
    (0, common_1.Get)('volatility'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate market volatility' }),
    (0, swagger_1.ApiQuery)({ name: 'marketType', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'windowSize', required: false, type: Number }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Volatility calculated successfully',
    }),
    __param(0, (0, common_1.Query)('marketType')),
    __param(1, (0, common_1.Query)('windowSize')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "calculateVolatility", null);
__decorate([
    (0, common_1.Get)('weather/:location'),
    (0, swagger_1.ApiOperation)({ summary: 'Get weather data for location' }),
    (0, swagger_1.ApiParam)({ name: 'location', required: true, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Weather data retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('location')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "getWeatherDataEndpoint", null);
__decorate([
    (0, common_1.Get)('economic/:region'),
    (0, swagger_1.ApiOperation)({ summary: 'Get economic indicators for region' }),
    (0, swagger_1.ApiParam)({ name: 'region', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false, type: String }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Economic data retrieved successfully',
    }),
    __param(0, (0, common_1.Param)('region')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "getEconomicIndicators", null);
__decorate([
    (0, common_1.Get)('models'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available forecasting models' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Models retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], MarketForecastingController.prototype, "getAvailableModels", null);
__decorate([
    (0, common_1.Get)('horizons'),
    (0, swagger_1.ApiOperation)({ summary: 'Get available forecast horizons' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Horizons retrieved successfully' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], MarketForecastingController.prototype, "getAvailableHorizons", null);
__decorate([
    (0, common_1.Get)('performance'),
    (0, swagger_1.ApiOperation)({ summary: 'Get model performance metrics' }),
    (0, swagger_1.ApiQuery)({ name: 'marketType', required: true, type: String }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Performance metrics retrieved successfully',
    }),
    __param(0, (0, common_1.Query)('marketType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MarketForecastingController.prototype, "getModelPerformance", null);
exports.MarketForecastingController = MarketForecastingController = MarketForecastingController_1 = __decorate([
    (0, swagger_1.ApiTags)('market-forecasting'),
    (0, common_1.Controller)('forecasting'),
    __metadata("design:paramtypes", [time_series_service_1.TimeSeriesService,
        weather_data_service_1.WeatherDataService,
        economic_indicator_service_1.EconomicIndicatorService,
        trend_prediction_service_1.TrendPredictionService,
        ensemble_methods_service_1.EnsembleMethodsService])
], MarketForecastingController);
//# sourceMappingURL=market-forecasting.controller.js.map
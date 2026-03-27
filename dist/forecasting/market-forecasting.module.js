"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketForecastingModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const database_config_1 = __importDefault(require("../config/database.config"));
const forecast_data_entity_1 = require("./entities/forecast-data.entity");
const time_series_service_1 = require("./models/time-series.service");
const weather_data_service_1 = require("./integrations/weather-data.service");
const economic_indicator_service_1 = require("./analysis/economic-indicator.service");
const trend_prediction_service_1 = require("./prediction/trend-prediction.service");
const ensemble_methods_service_1 = require("./ensemble/ensemble-methods.service");
const market_forecasting_controller_1 = require("./market-forecasting.controller");
let MarketForecastingModule = class MarketForecastingModule {
};
exports.MarketForecastingModule = MarketForecastingModule;
exports.MarketForecastingModule = MarketForecastingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            config_1.ConfigModule.forFeature(database_config_1.default),
            typeorm_1.TypeOrmModule.forFeature([forecast_data_entity_1.ForecastData]),
        ],
        controllers: [market_forecasting_controller_1.MarketForecastingController],
        providers: [
            time_series_service_1.TimeSeriesService,
            weather_data_service_1.WeatherDataService,
            economic_indicator_service_1.EconomicIndicatorService,
            trend_prediction_service_1.TrendPredictionService,
            ensemble_methods_service_1.EnsembleMethodsService,
        ],
        exports: [
            time_series_service_1.TimeSeriesService,
            weather_data_service_1.WeatherDataService,
            economic_indicator_service_1.EconomicIndicatorService,
            trend_prediction_service_1.TrendPredictionService,
            ensemble_methods_service_1.EnsembleMethodsService,
        ],
    })
], MarketForecastingModule);
//# sourceMappingURL=market-forecasting.module.js.map
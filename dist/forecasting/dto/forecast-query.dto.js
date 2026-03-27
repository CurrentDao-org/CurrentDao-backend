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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EconomicIndicatorDto = exports.WeatherIntegrationDto = exports.EnsembleConfigDto = exports.HistoricalDataQueryDto = exports.ForecastQueryDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const forecast_data_entity_1 = require("../entities/forecast-data.entity");
class ForecastQueryDto {
    constructor() {
        this.confidenceLevel = 0.95;
        this.ensembleSize = 10;
    }
}
exports.ForecastQueryDto = ForecastQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ForecastQueryDto.prototype, "marketType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(forecast_data_entity_1.ForecastHorizon),
    __metadata("design:type", String)
], ForecastQueryDto.prototype, "forecastHorizon", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ForecastQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ForecastQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ForecastQueryDto.prototype, "confidenceLevel", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ForecastQueryDto.prototype, "models", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(1000),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ForecastQueryDto.prototype, "ensembleSize", void 0);
class HistoricalDataQueryDto {
    constructor() {
        this.limit = 1000;
    }
}
exports.HistoricalDataQueryDto = HistoricalDataQueryDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HistoricalDataQueryDto.prototype, "marketType", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], HistoricalDataQueryDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], HistoricalDataQueryDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(10000),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], HistoricalDataQueryDto.prototype, "limit", void 0);
class EnsembleConfigDto {
    constructor() {
        this.diversityThreshold = 0.7;
        this.votingMethod = 'weighted';
    }
}
exports.EnsembleConfigDto = EnsembleConfigDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EnsembleConfigDto.prototype, "models", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Array)
], EnsembleConfigDto.prototype, "weights", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(1.0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], EnsembleConfigDto.prototype, "diversityThreshold", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['weighted', 'majority', 'ranked']),
    __metadata("design:type", String)
], EnsembleConfigDto.prototype, "votingMethod", void 0);
class WeatherIntegrationDto {
    constructor() {
        this.parameters = [
            'temperature',
            'humidity',
            'windSpeed',
            'precipitation',
        ];
    }
}
exports.WeatherIntegrationDto = WeatherIntegrationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], WeatherIntegrationDto.prototype, "location", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], WeatherIntegrationDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], WeatherIntegrationDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], WeatherIntegrationDto.prototype, "parameters", void 0);
class EconomicIndicatorDto {
    constructor() {
        this.region = 'global';
    }
}
exports.EconomicIndicatorDto = EconomicIndicatorDto;
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], EconomicIndicatorDto.prototype, "indicators", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EconomicIndicatorDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], EconomicIndicatorDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], EconomicIndicatorDto.prototype, "region", void 0);
//# sourceMappingURL=forecast-query.dto.js.map
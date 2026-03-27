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
exports.MatchingPreferencesDto = exports.QualityPreferences = exports.TimePreferences = exports.QuantityPreferences = exports.RenewablePreferences = exports.GeographicPreferences = exports.PricePreferences = exports.GeographicScope = exports.MatchingStrategy = exports.EnergyType = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var EnergyType;
(function (EnergyType) {
    EnergyType["SOLAR"] = "solar";
    EnergyType["WIND"] = "wind";
    EnergyType["HYDRO"] = "hydro";
    EnergyType["NUCLEAR"] = "nuclear";
    EnergyType["FOSSIL"] = "fossil";
    EnergyType["BIOMASS"] = "biomass";
    EnergyType["GEOTHERMAL"] = "geothermal";
})(EnergyType || (exports.EnergyType = EnergyType = {}));
var MatchingStrategy;
(function (MatchingStrategy) {
    MatchingStrategy["PRICE_FIRST"] = "price_first";
    MatchingStrategy["PROXIMITY_FIRST"] = "proximity_first";
    MatchingStrategy["RENEWABLE_FIRST"] = "renewable_first";
    MatchingStrategy["BALANCED"] = "balanced";
    MatchingStrategy["CUSTOM"] = "custom";
})(MatchingStrategy || (exports.MatchingStrategy = MatchingStrategy = {}));
var GeographicScope;
(function (GeographicScope) {
    GeographicScope["LOCAL"] = "local";
    GeographicScope["REGIONAL"] = "regional";
    GeographicScope["NATIONAL"] = "national";
    GeographicScope["INTERNATIONAL"] = "international";
})(GeographicScope || (exports.GeographicScope = GeographicScope = {}));
class PricePreferences {
}
exports.PricePreferences = PricePreferences;
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], PricePreferences.prototype, "priceTolerance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PricePreferences.prototype, "maxPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], PricePreferences.prototype, "minPrice", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PricePreferences.prototype, "preferFixedPrice", void 0);
class GeographicPreferences {
}
exports.GeographicPreferences = GeographicPreferences;
__decorate([
    (0, class_validator_1.IsEnum)(GeographicScope),
    __metadata("design:type", String)
], GeographicPreferences.prototype, "scope", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], GeographicPreferences.prototype, "maxDistance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GeographicPreferences.prototype, "preferredRegions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], GeographicPreferences.prototype, "excludedRegions", void 0);
class RenewablePreferences {
}
exports.RenewablePreferences = RenewablePreferences;
__decorate([
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RenewablePreferences.prototype, "preferRenewable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], RenewablePreferences.prototype, "minimumRenewablePercentage", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsEnum)(EnergyType, { each: true }),
    __metadata("design:type", Array)
], RenewablePreferences.prototype, "preferredRenewableTypes", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RenewablePreferences.prototype, "allowMixed", void 0);
class QuantityPreferences {
}
exports.QuantityPreferences = QuantityPreferences;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], QuantityPreferences.prototype, "minimumQuantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    __metadata("design:type", Number)
], QuantityPreferences.prototype, "maximumQuantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QuantityPreferences.prototype, "allowPartialFulfillment", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QuantityPreferences.prototype, "partialFulfillmentThreshold", void 0);
class TimePreferences {
}
exports.TimePreferences = TimePreferences;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(168),
    __metadata("design:type", Number)
], TimePreferences.prototype, "matchingWindowHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(23),
    __metadata("design:type", Array)
], TimePreferences.prototype, "preferredHours", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsNumber)({}, { each: true }),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(7),
    __metadata("design:type", Array)
], TimePreferences.prototype, "preferredDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], TimePreferences.prototype, "allowImmediateMatching", void 0);
class QualityPreferences {
}
exports.QualityPreferences = QualityPreferences;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QualityPreferences.prototype, "minimumReliabilityScore", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], QualityPreferences.prototype, "preferredSuppliers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], QualityPreferences.prototype, "excludedSuppliers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QualityPreferences.prototype, "prioritizeVerifiedSuppliers", void 0);
class MatchingPreferencesDto {
}
exports.MatchingPreferencesDto = MatchingPreferencesDto;
__decorate([
    (0, class_validator_1.IsEnum)(MatchingStrategy),
    __metadata("design:type", String)
], MatchingPreferencesDto.prototype, "strategy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PricePreferences),
    __metadata("design:type", PricePreferences)
], MatchingPreferencesDto.prototype, "price", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => GeographicPreferences),
    __metadata("design:type", GeographicPreferences)
], MatchingPreferencesDto.prototype, "geographic", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RenewablePreferences),
    __metadata("design:type", RenewablePreferences)
], MatchingPreferencesDto.prototype, "renewable", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => QuantityPreferences),
    __metadata("design:type", QuantityPreferences)
], MatchingPreferencesDto.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => TimePreferences),
    __metadata("design:type", TimePreferences)
], MatchingPreferencesDto.prototype, "time", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => QualityPreferences),
    __metadata("design:type", QualityPreferences)
], MatchingPreferencesDto.prototype, "quality", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MatchingPreferencesDto.prototype, "customRules", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], MatchingPreferencesDto.prototype, "priorityScore", void 0);
//# sourceMappingURL=matching-preferences.dto.js.map
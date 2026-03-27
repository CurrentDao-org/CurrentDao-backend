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
exports.RiskReportDto = exports.VarCalculationDto = exports.StressTestDto = exports.HedgingStrategyDto = exports.RiskMonitoringDto = exports.RiskAssessmentDto = exports.RiskLevel = exports.RiskType = void 0;
const class_validator_1 = require("class-validator");
var RiskType;
(function (RiskType) {
    RiskType["MARKET"] = "market";
    RiskType["CREDIT"] = "credit";
    RiskType["OPERATIONAL"] = "operational";
    RiskType["LIQUIDITY"] = "liquidity";
    RiskType["REGULATORY"] = "regulatory";
})(RiskType || (exports.RiskType = RiskType = {}));
var RiskLevel;
(function (RiskLevel) {
    RiskLevel[RiskLevel["LOW"] = 1] = "LOW";
    RiskLevel[RiskLevel["MEDIUM"] = 2] = "MEDIUM";
    RiskLevel[RiskLevel["HIGH"] = 3] = "HIGH";
    RiskLevel[RiskLevel["CRITICAL"] = 4] = "CRITICAL";
})(RiskLevel || (exports.RiskLevel = RiskLevel = {}));
class RiskAssessmentDto {
}
exports.RiskAssessmentDto = RiskAssessmentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RiskAssessmentDto.prototype, "portfolioId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(RiskType),
    __metadata("design:type", String)
], RiskAssessmentDto.prototype, "riskType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100000000),
    __metadata("design:type", Number)
], RiskAssessmentDto.prototype, "portfolioValue", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RiskAssessmentDto.prototype, "marketData", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RiskAssessmentDto.prototype, "historicalData", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RiskAssessmentDto.prototype, "assessmentNotes", void 0);
class RiskMonitoringDto {
}
exports.RiskMonitoringDto = RiskMonitoringDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RiskMonitoringDto.prototype, "portfolioId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.95),
    (0, class_validator_1.Max)(0.99),
    __metadata("design:type", Number)
], RiskMonitoringDto.prototype, "varConfidence", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(30),
    __metadata("design:type", Number)
], RiskMonitoringDto.prototype, "timeHorizon", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], RiskMonitoringDto.prototype, "enableRealTimeAlerts", void 0);
class HedgingStrategyDto {
}
exports.HedgingStrategyDto = HedgingStrategyDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HedgingStrategyDto.prototype, "portfolioId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1),
    __metadata("design:type", Number)
], HedgingStrategyDto.prototype, "hedgeRatio", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], HedgingStrategyDto.prototype, "instrument", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(365),
    __metadata("design:type", Number)
], HedgingStrategyDto.prototype, "maturity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], HedgingStrategyDto.prototype, "customParameters", void 0);
class StressTestDto {
}
exports.StressTestDto = StressTestDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], StressTestDto.prototype, "portfolioId", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], StressTestDto.prototype, "scenarios", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-100),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], StressTestDto.prototype, "shockMagnitude", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], StressTestDto.prototype, "customScenario", void 0);
class VarCalculationDto {
}
exports.VarCalculationDto = VarCalculationDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], VarCalculationDto.prototype, "portfolioId", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0.95),
    (0, class_validator_1.Max)(0.99),
    __metadata("design:type", Number)
], VarCalculationDto.prototype, "confidence", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(30),
    __metadata("design:type", Number)
], VarCalculationDto.prototype, "timeHorizon", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['historical', 'parametric', 'monte_carlo']),
    __metadata("design:type", String)
], VarCalculationDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(100),
    __metadata("design:type", Number)
], VarCalculationDto.prototype, "simulations", void 0);
class RiskReportDto {
}
exports.RiskReportDto = RiskReportDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RiskReportDto.prototype, "portfolioId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(['daily', 'weekly', 'monthly', 'on_demand']),
    __metadata("design:type", String)
], RiskReportDto.prototype, "reportType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], RiskReportDto.prototype, "includeMetrics", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RiskReportDto.prototype, "format", void 0);
//# sourceMappingURL=risk-assessment.dto.js.map
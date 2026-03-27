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
exports.ForecastData = exports.ForecastStatus = exports.ForecastHorizon = void 0;
const typeorm_1 = require("typeorm");
var ForecastHorizon;
(function (ForecastHorizon) {
    ForecastHorizon["ONE_HOUR"] = "1h";
    ForecastHorizon["SIX_HOURS"] = "6h";
    ForecastHorizon["TWENTY_FOUR_HOURS"] = "24h";
    ForecastHorizon["ONE_WEEK"] = "1w";
    ForecastHorizon["ONE_MONTH"] = "1m";
    ForecastHorizon["THREE_MONTHS"] = "3m";
    ForecastHorizon["SIX_MONTHS"] = "6m";
    ForecastHorizon["ONE_YEAR"] = "1y";
})(ForecastHorizon || (exports.ForecastHorizon = ForecastHorizon = {}));
var ForecastStatus;
(function (ForecastStatus) {
    ForecastStatus["PENDING"] = "pending";
    ForecastStatus["PROCESSING"] = "processing";
    ForecastStatus["COMPLETED"] = "completed";
    ForecastStatus["FAILED"] = "failed";
})(ForecastStatus || (exports.ForecastStatus = ForecastStatus = {}));
let ForecastData = class ForecastData {
};
exports.ForecastData = ForecastData;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ForecastData.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], ForecastData.prototype, "marketType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ForecastHorizon }),
    __metadata("design:type", String)
], ForecastData.prototype, "forecastHorizon", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], ForecastData.prototype, "predictedValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ForecastData.prototype, "confidenceIntervalLower", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], ForecastData.prototype, "confidenceIntervalUpper", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], ForecastData.prototype, "accuracy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ForecastData.prototype, "modelWeights", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ForecastData.prototype, "inputData", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ForecastStatus,
        default: ForecastStatus.PENDING,
    }),
    __metadata("design:type", String)
], ForecastData.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], ForecastData.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ForecastData.prototype, "targetDate", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ForecastData.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], ForecastData.prototype, "updatedAt", void 0);
exports.ForecastData = ForecastData = __decorate([
    (0, typeorm_1.Entity)('forecast_data'),
    (0, typeorm_1.Index)(['marketType', 'forecastHorizon', 'createdAt'])
], ForecastData);
//# sourceMappingURL=forecast-data.entity.js.map
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
exports.RiskDataEntity = void 0;
const typeorm_1 = require("typeorm");
let RiskDataEntity = class RiskDataEntity {
};
exports.RiskDataEntity = RiskDataEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], RiskDataEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'portfolio_id' }),
    __metadata("design:type", String)
], RiskDataEntity.prototype, "portfolioId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_type' }),
    __metadata("design:type", String)
], RiskDataEntity.prototype, "riskType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'risk_level', type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], RiskDataEntity.prototype, "riskLevel", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'var_value', type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], RiskDataEntity.prototype, "varValue", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'var_confidence', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], RiskDataEntity.prototype, "varConfidence", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'stress_test_result', type: 'json' }),
    __metadata("design:type", Object)
], RiskDataEntity.prototype, "stressTestResult", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'hedging_strategy', type: 'json' }),
    __metadata("design:type", Object)
], RiskDataEntity.prototype, "hedgingStrategy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mitigation_actions', type: 'json' }),
    __metadata("design:type", Object)
], RiskDataEntity.prototype, "mitigationActions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'compliance_status', default: 'pending' }),
    __metadata("design:type", String)
], RiskDataEntity.prototype, "complianceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], RiskDataEntity.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], RiskDataEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], RiskDataEntity.prototype, "updatedAt", void 0);
exports.RiskDataEntity = RiskDataEntity = __decorate([
    (0, typeorm_1.Entity)('risk_data')
], RiskDataEntity);
//# sourceMappingURL=risk-data.entity.js.map
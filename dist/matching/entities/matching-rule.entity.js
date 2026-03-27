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
exports.MatchingRule = exports.RuleStatus = exports.RulePriority = exports.RuleType = void 0;
const typeorm_1 = require("typeorm");
var RuleType;
(function (RuleType) {
    RuleType["PRICE_PRIORITY"] = "price_priority";
    RuleType["TIME_PRIORITY"] = "time_priority";
    RuleType["GEOGRAPHIC_PROXIMITY"] = "geographic_proximity";
    RuleType["RENEWABLE_PREFERENCE"] = "renewable_preference";
    RuleType["QUANTITY_MATCH"] = "quantity_match";
    RuleType["MINIMUM_ORDER_SIZE"] = "minimum_order_size";
    RuleType["MAXIMUM_DISTANCE"] = "maximum_distance";
    RuleType["PRICE_TOLERANCE"] = "price_tolerance";
    RuleType["SUPPLIER_RELIABILITY"] = "supplier_reliability";
    RuleType["MARKET_SEGMENT"] = "market_segment";
})(RuleType || (exports.RuleType = RuleType = {}));
var RulePriority;
(function (RulePriority) {
    RulePriority[RulePriority["LOW"] = 1] = "LOW";
    RulePriority[RulePriority["MEDIUM"] = 2] = "MEDIUM";
    RulePriority[RulePriority["HIGH"] = 3] = "HIGH";
    RulePriority[RulePriority["CRITICAL"] = 4] = "CRITICAL";
})(RulePriority || (exports.RulePriority = RulePriority = {}));
var RuleStatus;
(function (RuleStatus) {
    RuleStatus["ACTIVE"] = "active";
    RuleStatus["INACTIVE"] = "inactive";
    RuleStatus["SUSPENDED"] = "suspended";
})(RuleStatus || (exports.RuleStatus = RuleStatus = {}));
let MatchingRule = class MatchingRule {
};
exports.MatchingRule = MatchingRule;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MatchingRule.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], MatchingRule.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], MatchingRule.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RuleType,
    }),
    __metadata("design:type", String)
], MatchingRule.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RulePriority,
        default: RulePriority.MEDIUM,
    }),
    __metadata("design:type", Number)
], MatchingRule.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: RuleStatus,
        default: RuleStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], MatchingRule.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], MatchingRule.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], MatchingRule.prototype, "parameters", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], MatchingRule.prototype, "conditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_default', default: false }),
    __metadata("design:type", Boolean)
], MatchingRule.prototype, "isDefault", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_system_rule', default: false }),
    __metadata("design:type", Boolean)
], MatchingRule.prototype, "isSystemRule", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applies_to_buyer', default: true }),
    __metadata("design:type", Boolean)
], MatchingRule.prototype, "appliesToBuyer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applies_to_seller', default: true }),
    __metadata("design:type", Boolean)
], MatchingRule.prototype, "appliesToSeller", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'effective_from', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], MatchingRule.prototype, "effectiveFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'effective_to', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], MatchingRule.prototype, "effectiveTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], MatchingRule.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], MatchingRule.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], MatchingRule.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], MatchingRule.prototype, "updatedAt", void 0);
exports.MatchingRule = MatchingRule = __decorate([
    (0, typeorm_1.Entity)('matching_rules')
], MatchingRule);
//# sourceMappingURL=matching-rule.entity.js.map
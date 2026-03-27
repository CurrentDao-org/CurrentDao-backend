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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Match = exports.MatchType = exports.MatchStatus = void 0;
const typeorm_1 = require("typeorm");
const order_entity_1 = require("../../modules/energy/entities/order.entity");
var MatchStatus;
(function (MatchStatus) {
    MatchStatus["PENDING"] = "pending";
    MatchStatus["CONFIRMED"] = "confirmed";
    MatchStatus["REJECTED"] = "rejected";
    MatchStatus["PARTIALLY_FULFILLED"] = "partially_fulfilled";
    MatchStatus["COMPLETED"] = "completed";
    MatchStatus["CANCELLED"] = "cancelled";
})(MatchStatus || (exports.MatchStatus = MatchStatus = {}));
var MatchType;
(function (MatchType) {
    MatchType["FULL"] = "full";
    MatchType["PARTIAL"] = "partial";
    MatchType["SPLIT"] = "split";
})(MatchType || (exports.MatchType = MatchType = {}));
let Match = class Match {
};
exports.Match = Match;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Match.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_order_id' }),
    __metadata("design:type", String)
], Match.prototype, "buyerOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_order_id' }),
    __metadata("design:type", String)
], Match.prototype, "sellerOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2 }),
    __metadata("design:type", Number)
], Match.prototype, "matchedQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4 }),
    __metadata("design:type", Number)
], Match.prototype, "matchedPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Match.prototype, "remainingQuantity", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MatchStatus,
        default: MatchStatus.PENDING,
    }),
    __metadata("design:type", String)
], Match.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: MatchType,
        default: MatchType.FULL,
    }),
    __metadata("design:type", String)
], Match.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Match.prototype, "distance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Match.prototype, "matchingScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Match.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_confirmed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Match.prototype, "buyerConfirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_confirmed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Match.prototype, "sellerConfirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Match.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Match.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Match.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'buyer_order_id' }),
    __metadata("design:type", typeof (_a = typeof order_entity_1.Order !== "undefined" && order_entity_1.Order) === "function" ? _a : Object)
], Match.prototype, "buyerOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => order_entity_1.Order, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'seller_order_id' }),
    __metadata("design:type", typeof (_b = typeof order_entity_1.Order !== "undefined" && order_entity_1.Order) === "function" ? _b : Object)
], Match.prototype, "sellerOrder", void 0);
exports.Match = Match = __decorate([
    (0, typeorm_1.Entity)('matches')
], Match);
//# sourceMappingURL=match.entity.js.map
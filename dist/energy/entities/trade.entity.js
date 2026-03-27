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
exports.Trade = exports.DeliveryStatus = exports.PaymentStatus = exports.TradeType = exports.TradeStatus = void 0;
const typeorm_1 = require("typeorm");
const energy_listing_entity_1 = require("./energy-listing.entity");
const bid_entity_1 = require("./bid.entity");
var TradeStatus;
(function (TradeStatus) {
    TradeStatus["PENDING"] = "pending";
    TradeStatus["CONFIRMED"] = "confirmed";
    TradeStatus["IN_PROGRESS"] = "in_progress";
    TradeStatus["COMPLETED"] = "completed";
    TradeStatus["CANCELLED"] = "cancelled";
    TradeStatus["DISPUTED"] = "disputed";
    TradeStatus["REFUNDED"] = "refunded";
})(TradeStatus || (exports.TradeStatus = TradeStatus = {}));
var TradeType;
(function (TradeType) {
    TradeType["STANDARD"] = "standard";
    TradeType["PREMIUM"] = "premium";
    TradeType["EMERGENCY"] = "emergency";
    TradeType["BULK"] = "bulk";
})(TradeType || (exports.TradeType = TradeType = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
    PaymentStatus["PARTIALLY_REFUNDED"] = "partially_refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var DeliveryStatus;
(function (DeliveryStatus) {
    DeliveryStatus["PENDING"] = "pending";
    DeliveryStatus["SCHEDULED"] = "scheduled";
    DeliveryStatus["IN_TRANSIT"] = "in_transit";
    DeliveryStatus["DELIVERED"] = "delivered";
    DeliveryStatus["FAILED"] = "failed";
    DeliveryStatus["CANCELLED"] = "cancelled";
})(DeliveryStatus || (exports.DeliveryStatus = DeliveryStatus = {}));
let Trade = class Trade {
};
exports.Trade = Trade;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Trade.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'listing_id' }),
    __metadata("design:type", String)
], Trade.prototype, "listingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bid_id' }),
    __metadata("design:type", String)
], Trade.prototype, "bidId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id' }),
    __metadata("design:type", String)
], Trade.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_id' }),
    __metadata("design:type", String)
], Trade.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Trade.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4 }),
    __metadata("design:type", Number)
], Trade.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], Trade.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "finalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "finalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TradeStatus,
        default: TradeStatus.PENDING,
    }),
    __metadata("design:type", String)
], Trade.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TradeType,
        default: TradeType.STANDARD,
    }),
    __metadata("design:type", String)
], Trade.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    }),
    __metadata("design:type", String)
], Trade.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DeliveryStatus,
        default: DeliveryStatus.PENDING,
    }),
    __metadata("design:type", String)
], Trade.prototype, "deliveryStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "negotiatedDiscount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "serviceFee", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "taxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "deliveryCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "deliveryDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "paymentDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "contractTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "qualityAssurance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "compliance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Trade.prototype, "milestones", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "riskManagement", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirmed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "confirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disputed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "disputedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refunded_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "refundedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivery_confirmed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "deliveryConfirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_completed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Trade.prototype, "paymentCompletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], Trade.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'confirmed_by', nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "confirmedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_by', nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "cancelledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'disputed_by', nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "disputedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Trade.prototype, "auditTrail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Trade.prototype, "analytics", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_disputed', default: false }),
    __metadata("design:type", Boolean)
], Trade.prototype, "isDisputed", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispute_reason', nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "disputeReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'dispute_resolution', nullable: true }),
    __metadata("design:type", String)
], Trade.prototype, "disputeResolution", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_amount', type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'penalty_amount', type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "penaltyAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bonus_amount', type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Trade.prototype, "bonusAmount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Trade.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Trade.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => energy_listing_entity_1.EnergyListing, listing => listing.trades, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'listing_id' }),
    __metadata("design:type", energy_listing_entity_1.EnergyListing)
], Trade.prototype, "listing", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => bid_entity_1.Bid, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'bid_id' }),
    __metadata("design:type", bid_entity_1.Bid)
], Trade.prototype, "bid", void 0);
exports.Trade = Trade = __decorate([
    (0, typeorm_1.Entity)('trades')
], Trade);
//# sourceMappingURL=trade.entity.js.map
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
exports.Bid = exports.BidType = exports.BidStatus = void 0;
const typeorm_1 = require("typeorm");
const energy_listing_entity_1 = require("./energy-listing.entity");
var BidStatus;
(function (BidStatus) {
    BidStatus["PENDING"] = "pending";
    BidStatus["ACCEPTED"] = "accepted";
    BidStatus["REJECTED"] = "rejected";
    BidStatus["WITHDRAWN"] = "withdrawn";
    BidStatus["EXPIRED"] = "expired";
})(BidStatus || (exports.BidStatus = BidStatus = {}));
var BidType;
(function (BidType) {
    BidType["STANDARD"] = "standard";
    BidType["PREMIUM"] = "premium";
    BidType["EMERGENCY"] = "emergency";
})(BidType || (exports.BidType = BidType = {}));
let Bid = class Bid {
};
exports.Bid = Bid;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Bid.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'listing_id' }),
    __metadata("design:type", String)
], Bid.prototype, "listingId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bidder_id' }),
    __metadata("design:type", String)
], Bid.prototype, "bidderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], Bid.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4 }),
    __metadata("design:type", Number)
], Bid.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], Bid.prototype, "totalPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BidStatus,
        default: BidStatus.PENDING,
    }),
    __metadata("design:type", String)
], Bid.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BidType,
        default: BidType.STANDARD,
    }),
    __metadata("design:type", String)
], Bid.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Bid.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Bid.prototype, "deliveryTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Bid.prototype, "paymentTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Bid.prototype, "qualityRequirements", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Bid.prototype, "additionalTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Bid.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Bid.prototype, "matchScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Bid.prototype, "competitivenessScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Bid.prototype, "reliabilityScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Bid.prototype, "overallScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_counter_offer', default: false }),
    __metadata("design:type", Boolean)
], Bid.prototype, "isCounterOffer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'original_bid_id', nullable: true }),
    __metadata("design:type", String)
], Bid.prototype, "originalBidId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'counter_bid_id', nullable: true }),
    __metadata("design:type", String)
], Bid.prototype, "counterBidId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'negotiation_round', default: 1 }),
    __metadata("design:type", Number)
], Bid.prototype, "negotiationRound", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_accept', default: false }),
    __metadata("design:type", Boolean)
], Bid.prototype, "autoAccept", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'auto_reject_threshold', type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], Bid.prototype, "autoRejectThreshold", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Bid.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'responded_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Bid.prototype, "respondedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'accepted_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Bid.prototype, "acceptedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejected_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Bid.prototype, "rejectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'withdrawn_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Bid.prototype, "withdrawnAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], Bid.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], Bid.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'responded_by', nullable: true }),
    __metadata("design:type", String)
], Bid.prototype, "respondedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Bid.prototype, "auditTrail", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], Bid.prototype, "analytics", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Bid.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Bid.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => energy_listing_entity_1.EnergyListing, listing => listing.bids, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'listing_id' }),
    __metadata("design:type", energy_listing_entity_1.EnergyListing)
], Bid.prototype, "listing", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Bid, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'original_bid_id' }),
    __metadata("design:type", Bid)
], Bid.prototype, "originalBid", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Bid, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'counter_bid_id' }),
    __metadata("design:type", Bid)
], Bid.prototype, "counterBid", void 0);
exports.Bid = Bid = __decorate([
    (0, typeorm_1.Entity)('bids')
], Bid);
//# sourceMappingURL=bid.entity.js.map
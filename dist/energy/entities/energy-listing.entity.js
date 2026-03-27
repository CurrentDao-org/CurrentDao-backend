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
exports.EnergyListing = exports.DeliveryType = exports.ListingStatus = exports.EnergyType = exports.ListingType = void 0;
const typeorm_1 = require("typeorm");
var ListingType;
(function (ListingType) {
    ListingType["BUY"] = "buy";
    ListingType["SELL"] = "sell";
})(ListingType || (exports.ListingType = ListingType = {}));
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
var ListingStatus;
(function (ListingStatus) {
    ListingStatus["ACTIVE"] = "active";
    ListingStatus["PENDING"] = "pending";
    ListingStatus["FILLED"] = "filled";
    ListingStatus["CANCELLED"] = "cancelled";
    ListingStatus["EXPIRED"] = "expired";
})(ListingStatus || (exports.ListingStatus = ListingStatus = {}));
var DeliveryType;
(function (DeliveryType) {
    DeliveryType["IMMEDIATE"] = "immediate";
    DeliveryType["SCHEDULED"] = "scheduled";
    DeliveryType["FLEXIBLE"] = "flexible";
})(DeliveryType || (exports.DeliveryType = DeliveryType = {}));
let EnergyListing = class EnergyListing {
};
exports.EnergyListing = EnergyListing;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EnergyListing.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 255 }),
    __metadata("design:type", String)
], EnergyListing.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], EnergyListing.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ListingType,
    }),
    __metadata("design:type", String)
], EnergyListing.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: EnergyType,
    }),
    __metadata("design:type", String)
], EnergyListing.prototype, "energyType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 12, scale: 2 }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4 }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "minPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "maxPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ListingStatus,
        default: ListingStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], EnergyListing.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: DeliveryType,
        default: DeliveryType.FLEXIBLE,
    }),
    __metadata("design:type", String)
], EnergyListing.prototype, "deliveryType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "deliveryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "deliveryStartDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "deliveryEndDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 8, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "maxDeliveryDistance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "qualitySpecifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "paymentTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "contractTerms", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "requirements", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'seller_id', nullable: true }),
    __metadata("design:type", String)
], EnergyListing.prototype, "sellerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'buyer_id', nullable: true }),
    __metadata("design:type", String)
], EnergyListing.prototype, "buyerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], EnergyListing.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], EnergyListing.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'filled_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "filledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'view_count', default: 0 }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "viewCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'bid_count', default: 0 }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "bidCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_featured', default: false }),
    __metadata("design:type", Boolean)
], EnergyListing.prototype, "isFeatured", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], EnergyListing.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_premium', default: false }),
    __metadata("design:type", Boolean)
], EnergyListing.prototype, "isPremium", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'visibility_score', type: 'decimal', precision: 3, scale: 2, default: 1.0 }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "visibilityScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'match_score', type: 'decimal', precision: 3, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], EnergyListing.prototype, "matchScore", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], EnergyListing.prototype, "analytics", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], EnergyListing.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Bid, bid => bid.listing),
    __metadata("design:type", Array)
], EnergyListing.prototype, "bids", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Trade, trade => trade.listing),
    __metadata("design:type", Array)
], EnergyListing.prototype, "trades", void 0);
exports.EnergyListing = EnergyListing = __decorate([
    (0, typeorm_1.Entity)('energy_listings')
], EnergyListing);
//# sourceMappingURL=energy-listing.entity.js.map
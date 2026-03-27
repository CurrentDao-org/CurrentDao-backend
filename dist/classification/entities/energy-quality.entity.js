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
exports.meetsQualityRequirements = exports.calculateAdjustedPrice = exports.getQualityByRating = exports.DEFAULT_QUALITY_RATINGS = exports.EnergyQuality = exports.QualityTier = exports.QualityRating = void 0;
const typeorm_1 = require("typeorm");
const energy_category_entity_1 = require("./energy-category.entity");
var QualityRating;
(function (QualityRating) {
    QualityRating["PREMIUM"] = "premium";
    QualityRating["STANDARD"] = "standard";
    QualityRating["BASIC"] = "basic";
})(QualityRating || (exports.QualityRating = QualityRating = {}));
var QualityTier;
(function (QualityTier) {
    QualityTier["A"] = "A";
    QualityTier["B"] = "B";
    QualityTier["C"] = "C";
    QualityTier["D"] = "D";
})(QualityTier || (exports.QualityTier = QualityTier = {}));
let EnergyQuality = class EnergyQuality {
};
exports.EnergyQuality = EnergyQuality;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], EnergyQuality.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: QualityRating,
        unique: true,
    }),
    __metadata("design:type", String)
], EnergyQuality.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], EnergyQuality.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], EnergyQuality.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: QualityTier,
    }),
    __metadata("design:type", String)
], EnergyQuality.prototype, "tier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id' }),
    __metadata("design:type", String)
], EnergyQuality.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => energy_category_entity_1.EnergyCategory, (category) => category.qualities, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", energy_category_entity_1.EnergyCategory)
], EnergyQuality.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 1.0 }),
    __metadata("design:type", Number)
], EnergyQuality.prototype, "priceMultiplier", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'efficiency_min', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], EnergyQuality.prototype, "efficiencyMin", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'efficiency_max', type: 'decimal', precision: 5, scale: 2 }),
    __metadata("design:type", Number)
], EnergyQuality.prototype, "efficiencyMax", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_purity', type: 'decimal', precision: 5, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], EnergyQuality.prototype, "minPurity", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], EnergyQuality.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_standard', nullable: true }),
    __metadata("design:type", String)
], EnergyQuality.prototype, "verificationStandard", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_active', default: true }),
    __metadata("design:type", Boolean)
], EnergyQuality.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], EnergyQuality.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], EnergyQuality.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], EnergyQuality.prototype, "requirements", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], EnergyQuality.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], EnergyQuality.prototype, "updatedAt", void 0);
exports.EnergyQuality = EnergyQuality = __decorate([
    (0, typeorm_1.Entity)('energy_qualities')
], EnergyQuality);
exports.DEFAULT_QUALITY_RATINGS = [
    {
        rating: QualityRating.PREMIUM,
        name: 'Premium Quality',
        description: 'Highest quality energy with maximum efficiency and purity',
        tier: QualityTier.A,
        priceMultiplier: 1.5,
        efficiencyMin: 95,
        efficiencyMax: 100,
        minPurity: 99,
        isVerified: true,
        verificationStandard: 'ISO 50001',
        sortOrder: 1,
        tags: ['premium', 'high-efficiency', 'verified'],
        requirements: {
            minEfficiency: 95,
            requiresCertification: true,
            inspectionFrequency: 'monthly',
        },
    },
    {
        rating: QualityRating.STANDARD,
        name: 'Standard Quality',
        description: 'Good quality energy with standard efficiency levels',
        tier: QualityTier.B,
        priceMultiplier: 1.0,
        efficiencyMin: 80,
        efficiencyMax: 94,
        minPurity: 95,
        isVerified: true,
        verificationStandard: 'ISO 50001',
        sortOrder: 2,
        tags: ['standard', 'medium-efficiency', 'verified'],
        requirements: {
            minEfficiency: 80,
            requiresCertification: true,
            inspectionFrequency: 'quarterly',
        },
    },
    {
        rating: QualityRating.BASIC,
        name: 'Basic Quality',
        description: 'Entry-level energy with minimum acceptable standards',
        tier: QualityTier.C,
        priceMultiplier: 0.75,
        efficiencyMin: 60,
        efficiencyMax: 79,
        minPurity: 90,
        isVerified: false,
        verificationStandard: null,
        sortOrder: 3,
        tags: ['basic', 'low-efficiency'],
        requirements: {
            minEfficiency: 60,
            requiresCertification: false,
            inspectionFrequency: 'annually',
        },
    },
];
const getQualityByRating = (rating) => {
    return exports.DEFAULT_QUALITY_RATINGS.find(q => q.rating === rating);
};
exports.getQualityByRating = getQualityByRating;
const calculateAdjustedPrice = (basePrice, qualityRating) => {
    const quality = (0, exports.getQualityByRating)(qualityRating);
    if (!quality)
        return basePrice;
    return basePrice * Number(quality.priceMultiplier);
};
exports.calculateAdjustedPrice = calculateAdjustedPrice;
const meetsQualityRequirements = (efficiency, purity, rating) => {
    const quality = (0, exports.getQualityByRating)(rating);
    if (!quality)
        return false;
    return (efficiency >= quality.efficiencyMin &&
        (quality.minPurity === null || purity >= quality.minPurity));
};
exports.meetsQualityRequirements = meetsQualityRequirements;
//# sourceMappingURL=energy-quality.entity.js.map
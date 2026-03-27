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
exports.calculatePriceWithCertification = exports.needsRenewal = exports.isCertificationValid = exports.DEFAULT_CERTIFICATIONS = exports.Certification = exports.CertificationStatus = exports.CertificationType = void 0;
const typeorm_1 = require("typeorm");
const energy_category_entity_1 = require("./energy-category.entity");
var CertificationType;
(function (CertificationType) {
    CertificationType["GREEN_ENERGY"] = "green_energy";
    CertificationType["CARBON_NEUTRAL"] = "carbon_neutral";
    CertificationType["ORGANIC"] = "organic";
    CertificationType["FAIR_TRADE"] = "fair_trade";
    CertificationType["RENEWABLE_ENERGY"] = "renewable_energy";
    CertificationType["LOW_CARBON"] = "low_carbon";
    CertificationType["SUSTAINABLE"] = "sustainable";
    CertificationType["ECO_FRIENDLY"] = "eco_friendly";
})(CertificationType || (exports.CertificationType = CertificationType = {}));
var CertificationStatus;
(function (CertificationStatus) {
    CertificationStatus["ACTIVE"] = "active";
    CertificationStatus["PENDING"] = "pending";
    CertificationStatus["EXPIRED"] = "expired";
    CertificationStatus["REVOKED"] = "revoked";
})(CertificationStatus || (exports.CertificationStatus = CertificationStatus = {}));
let Certification = class Certification {
};
exports.Certification = Certification;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Certification.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CertificationType,
        unique: true,
    }),
    __metadata("design:type", String)
], Certification.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 150 }),
    __metadata("design:type", String)
], Certification.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Certification.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id', nullable: true }),
    __metadata("design:type", String)
], Certification.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => energy_category_entity_1.EnergyCategory, (category) => category.certifications, { nullable: true, onDelete: 'SET NULL' }),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", energy_category_entity_1.EnergyCategory)
], Certification.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'issuing_authority', length: 150 }),
    __metadata("design:type", String)
], Certification.prototype, "issuingAuthority", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'certification_code', length: 100, unique: true }),
    __metadata("design:type", String)
], Certification.prototype, "certificationCode", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: CertificationStatus,
        default: CertificationStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], Certification.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_from', type: 'timestamp' }),
    __metadata("design:type", Date)
], Certification.prototype, "validFrom", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'valid_until', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], Certification.prototype, "validUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_recurring', default: false }),
    __metadata("design:type", Boolean)
], Certification.prototype, "isRecurring", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'renewal_period_days', nullable: true }),
    __metadata("design:type", Number)
], Certification.prototype, "renewalPeriodDays", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_adjustment', type: 'decimal', precision: 5, scale: 2, default: 1.0 }),
    __metadata("design:type", Number)
], Certification.prototype, "priceAdjustment", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_verified', default: false }),
    __metadata("design:type", Boolean)
], Certification.prototype, "isVerified", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'verification_method', nullable: true }),
    __metadata("design:type", String)
], Certification.prototype, "verificationMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logo_url', nullable: true }),
    __metadata("design:type", String)
], Certification.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-array', nullable: true }),
    __metadata("design:type", Array)
], Certification.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Certification.prototype, "requirements", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Certification.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Certification.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Certification.prototype, "updatedAt", void 0);
exports.Certification = Certification = __decorate([
    (0, typeorm_1.Entity)('certifications')
], Certification);
exports.DEFAULT_CERTIFICATIONS = [
    {
        type: CertificationType.GREEN_ENERGY,
        name: 'Green Energy Certification',
        description: 'Certifies that energy is generated from renewable sources with minimal environmental impact',
        issuingAuthority: 'Green Energy Standards Board',
        certificationCode: 'GEC-001',
        status: CertificationStatus.ACTIVE,
        priceAdjustment: 1.25,
        isVerified: true,
        verificationMethod: 'Third-party audit',
        tags: ['green', 'renewable', 'eco-friendly'],
        requirements: {
            renewablePercentage: 100,
            emissionThreshold: 0,
            auditFrequency: 'annual',
        },
    },
    {
        type: CertificationType.CARBON_NEUTRAL,
        name: 'Carbon Neutral Certification',
        description: 'Certifies that net carbon emissions are zero through offset programs',
        issuingAuthority: 'Carbon Neutral Alliance',
        certificationCode: 'CNC-001',
        status: CertificationStatus.ACTIVE,
        priceAdjustment: 1.15,
        isVerified: true,
        verificationMethod: 'Carbon accounting',
        tags: ['carbon-neutral', 'offset', 'climate'],
        requirements: {
            carbonOffsetRequired: true,
            netEmissions: 0,
            offsetVerification: 'required',
        },
    },
    {
        type: CertificationType.RENEWABLE_ENERGY,
        name: 'Renewable Energy Certification',
        description: 'Certifies that energy is sourced entirely from renewable sources',
        issuingAuthority: 'International Renewable Energy Agency',
        certificationCode: 'REC-001',
        status: CertificationStatus.ACTIVE,
        priceAdjustment: 1.2,
        isVerified: true,
        verificationMethod: 'Source verification',
        tags: ['renewable', 'clean', 'sustainable'],
        requirements: {
            renewablePercentage: 100,
            sourceVerification: 'required',
        },
    },
    {
        type: CertificationType.LOW_CARBON,
        name: 'Low Carbon Certification',
        description: 'Certifies energy with reduced carbon footprint',
        issuingAuthority: 'Climate Action Network',
        certificationCode: 'LCC-001',
        status: CertificationStatus.ACTIVE,
        priceAdjustment: 1.1,
        isVerified: true,
        verificationMethod: 'Carbon intensity analysis',
        tags: ['low-carbon', 'reduced-emissions'],
        requirements: {
            maxCarbonIntensity: 50,
            emissionReductionTarget: 50,
        },
    },
    {
        type: CertificationType.SUSTAINABLE,
        name: 'Sustainable Energy Certification',
        description: 'Certifies energy production meets sustainability standards',
        issuingAuthority: 'Sustainable Energy Council',
        certificationCode: 'SEC-001',
        status: CertificationStatus.ACTIVE,
        priceAdjustment: 1.15,
        isVerified: true,
        verificationMethod: 'Sustainability assessment',
        tags: ['sustainable', 'responsible', 'green'],
        requirements: {
            sustainabilityScore: 80,
            environmentalImpact: 'low',
        },
    },
];
const isCertificationValid = (certification) => {
    if (certification.status !== CertificationStatus.ACTIVE) {
        return false;
    }
    const now = new Date();
    if (certification.validUntil) {
        return now >= certification.validFrom && now <= certification.validUntil;
    }
    return now >= certification.validFrom;
};
exports.isCertificationValid = isCertificationValid;
const needsRenewal = (certification) => {
    if (!certification.isRecurring || !certification.renewalPeriodDays) {
        return false;
    }
    if (!certification.validUntil) {
        return false;
    }
    const daysUntilExpiry = Math.ceil((certification.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
};
exports.needsRenewal = needsRenewal;
const calculatePriceWithCertification = (basePrice, certifications) => {
    let multiplier = 1.0;
    for (const cert of certifications) {
        if ((0, exports.isCertificationValid)(cert)) {
            multiplier *= Number(cert.priceAdjustment);
        }
    }
    return basePrice * multiplier;
};
exports.calculatePriceWithCertification = calculatePriceWithCertification;
//# sourceMappingURL=certification.entity.js.map
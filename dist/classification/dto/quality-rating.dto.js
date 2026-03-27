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
exports.ClassificationResponseDto = exports.CertificationResponseDto = exports.CertificationFilterDto = exports.UpdateCertificationDto = exports.CreateCertificationDto = exports.QualityRatingResponseDto = exports.QualityRatingFilterDto = exports.UpdateQualityRatingDto = exports.CreateQualityRatingDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const energy_quality_entity_1 = require("../entities/energy-quality.entity");
const certification_entity_1 = require("../entities/certification.entity");
const category_dto_1 = require("./category.dto");
class CreateQualityRatingDto {
}
exports.CreateQualityRatingDto = CreateQualityRatingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_quality_entity_1.QualityRating, description: 'Quality rating' }),
    (0, class_validator_1.IsEnum)(energy_quality_entity_1.QualityRating),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateQualityRatingDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Premium Quality', description: 'Quality name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateQualityRatingDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Quality description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateQualityRatingDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_quality_entity_1.QualityTier, description: 'Quality tier' }),
    (0, class_validator_1.IsEnum)(energy_quality_entity_1.QualityTier),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateQualityRatingDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateQualityRatingDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1.5, description: 'Price multiplier' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], CreateQualityRatingDto.prototype, "priceMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 95, description: 'Minimum efficiency percentage' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateQualityRatingDto.prototype, "efficiencyMin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Maximum efficiency percentage' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateQualityRatingDto.prototype, "efficiencyMax", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 99, description: 'Minimum purity percentage' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateQualityRatingDto.prototype, "minPurity", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is verified' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateQualityRatingDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ISO 50001', description: 'Verification standard' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateQualityRatingDto.prototype, "verificationStandard", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Sort order' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(999),
    __metadata("design:type", Number)
], CreateQualityRatingDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['premium', 'high-efficiency'], description: 'Tags' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateQualityRatingDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Requirements' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateQualityRatingDto.prototype, "requirements", void 0);
class UpdateQualityRatingDto extends (0, swagger_1.PartialType)(CreateQualityRatingDto) {
}
exports.UpdateQualityRatingDto = UpdateQualityRatingDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is active' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateQualityRatingDto.prototype, "isActive", void 0);
class QualityRatingFilterDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
    }
}
exports.QualityRatingFilterDto = QualityRatingFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_quality_entity_1.QualityRating, description: 'Filter by rating' }),
    (0, class_validator_1.IsEnum)(energy_quality_entity_1.QualityRating),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QualityRatingFilterDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: energy_quality_entity_1.QualityTier, description: 'Filter by tier' }),
    (0, class_validator_1.IsEnum)(energy_quality_entity_1.QualityTier),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QualityRatingFilterDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by category ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QualityRatingFilterDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Filter by verified status' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], QualityRatingFilterDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Filter by active status' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], QualityRatingFilterDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'premium', description: 'Search by name or description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], QualityRatingFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Page number' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], QualityRatingFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: 'Items per page' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], QualityRatingFilterDto.prototype, "limit", void 0);
class QualityRatingResponseDto {
}
exports.QualityRatingResponseDto = QualityRatingResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quality ID' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_quality_entity_1.QualityRating, description: 'Quality rating' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "rating", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quality name' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quality description' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: energy_quality_entity_1.QualityTier, description: 'Quality tier' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "tier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category ID' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.5, description: 'Price multiplier' }),
    __metadata("design:type", Number)
], QualityRatingResponseDto.prototype, "priceMultiplier", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 95, description: 'Minimum efficiency' }),
    __metadata("design:type", Number)
], QualityRatingResponseDto.prototype, "efficiencyMin", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 100, description: 'Maximum efficiency' }),
    __metadata("design:type", Number)
], QualityRatingResponseDto.prototype, "efficiencyMax", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 99, description: 'Minimum purity' }),
    __metadata("design:type", Number)
], QualityRatingResponseDto.prototype, "minPurity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is verified' }),
    __metadata("design:type", Boolean)
], QualityRatingResponseDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'ISO 50001', description: 'Verification standard' }),
    __metadata("design:type", String)
], QualityRatingResponseDto.prototype, "verificationStandard", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is active' }),
    __metadata("design:type", Boolean)
], QualityRatingResponseDto.prototype, "isActive", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, description: 'Sort order' }),
    __metadata("design:type", Number)
], QualityRatingResponseDto.prototype, "sortOrder", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['premium'], description: 'Tags' }),
    __metadata("design:type", Array)
], QualityRatingResponseDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Requirements' }),
    __metadata("design:type", Object)
], QualityRatingResponseDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created at' }),
    __metadata("design:type", Date)
], QualityRatingResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Updated at' }),
    __metadata("design:type", Date)
], QualityRatingResponseDto.prototype, "updatedAt", void 0);
class CreateCertificationDto {
}
exports.CreateCertificationDto = CreateCertificationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: certification_entity_1.CertificationType, description: 'Certification type' }),
    (0, class_validator_1.IsEnum)(certification_entity_1.CertificationType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Green Energy Certification', description: 'Certification name' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 150),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Certification description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Green Energy Standards Board', description: 'Issuing authority' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 150),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "issuingAuthority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GEC-001', description: 'Certification code' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.Length)(1, 100),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "certificationCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-01-01', description: 'Valid from date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "validFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2025-12-31', description: 'Valid until date' }),
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "validUntil", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is recurring' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateCertificationDto.prototype, "isRecurring", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 365, description: 'Renewal period in days' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CreateCertificationDto.prototype, "renewalPeriodDays", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1.25, description: 'Price adjustment multiplier' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(0.1),
    (0, class_validator_1.Max)(10),
    __metadata("design:type", Number)
], CreateCertificationDto.prototype, "priceAdjustment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Is verified' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateCertificationDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Third-party audit', description: 'Verification method' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "verificationMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '/logos/green-energy.png', description: 'Logo URL' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateCertificationDto.prototype, "logoUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['green', 'renewable'], description: 'Tags' }),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateCertificationDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Requirements' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], CreateCertificationDto.prototype, "requirements", void 0);
class UpdateCertificationDto extends (0, swagger_1.PartialType)(CreateCertificationDto) {
}
exports.UpdateCertificationDto = UpdateCertificationDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: certification_entity_1.CertificationStatus, description: 'Certification status' }),
    (0, class_validator_1.IsEnum)(certification_entity_1.CertificationStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateCertificationDto.prototype, "status", void 0);
class CertificationFilterDto {
    constructor() {
        this.page = 1;
        this.limit = 10;
    }
}
exports.CertificationFilterDto = CertificationFilterDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: certification_entity_1.CertificationType, description: 'Filter by type' }),
    (0, class_validator_1.IsEnum)(certification_entity_1.CertificationType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CertificationFilterDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: certification_entity_1.CertificationStatus, description: 'Filter by status' }),
    (0, class_validator_1.IsEnum)(certification_entity_1.CertificationStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CertificationFilterDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Filter by category ID' }),
    (0, class_validator_1.IsUUID)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CertificationFilterDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Filter by verified status' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CertificationFilterDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'green', description: 'Search by name or description' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CertificationFilterDto.prototype, "search", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true, description: 'Filter only valid certifications' }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CertificationFilterDto.prototype, "validOnly", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 1, description: 'Page number' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    __metadata("design:type", Number)
], CertificationFilterDto.prototype, "page", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 10, description: 'Items per page' }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CertificationFilterDto.prototype, "limit", void 0);
class CertificationResponseDto {
}
exports.CertificationResponseDto = CertificationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Certification ID' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: certification_entity_1.CertificationType, description: 'Certification type' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Certification name' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Certification description' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Category ID' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "categoryId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Issuing authority' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "issuingAuthority", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Certification code' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "certificationCode", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ enum: certification_entity_1.CertificationStatus, description: 'Certification status' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Valid from' }),
    __metadata("design:type", Date)
], CertificationResponseDto.prototype, "validFrom", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Valid until' }),
    __metadata("design:type", Date)
], CertificationResponseDto.prototype, "validUntil", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is recurring' }),
    __metadata("design:type", Boolean)
], CertificationResponseDto.prototype, "isRecurring", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 365, description: 'Renewal period in days' }),
    __metadata("design:type", Number)
], CertificationResponseDto.prototype, "renewalPeriodDays", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.25, description: 'Price adjustment' }),
    __metadata("design:type", Number)
], CertificationResponseDto.prototype, "priceAdjustment", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, description: 'Is verified' }),
    __metadata("design:type", Boolean)
], CertificationResponseDto.prototype, "isVerified", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Third-party audit', description: 'Verification method' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "verificationMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '/logos/green-energy.png', description: 'Logo URL' }),
    __metadata("design:type", String)
], CertificationResponseDto.prototype, "logoUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: ['green', 'renewable'], description: 'Tags' }),
    __metadata("design:type", Array)
], CertificationResponseDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Requirements' }),
    __metadata("design:type", Object)
], CertificationResponseDto.prototype, "requirements", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Created at' }),
    __metadata("design:type", Date)
], CertificationResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Updated at' }),
    __metadata("design:type", Date)
], CertificationResponseDto.prototype, "updatedAt", void 0);
class ClassificationResponseDto {
}
exports.ClassificationResponseDto = ClassificationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Category information' }),
    __metadata("design:type", category_dto_1.CategoryResponseDto)
], ClassificationResponseDto.prototype, "category", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Quality rating information' }),
    __metadata("design:type", QualityRatingResponseDto)
], ClassificationResponseDto.prototype, "quality", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Applicable certifications' }),
    __metadata("design:type", Array)
], ClassificationResponseDto.prototype, "certifications", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1.5, description: 'Total price multiplier' }),
    __metadata("design:type", Number)
], ClassificationResponseDto.prototype, "totalMultiplier", void 0);
//# sourceMappingURL=quality-rating.dto.js.map
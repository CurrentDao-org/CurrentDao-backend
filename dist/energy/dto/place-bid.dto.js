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
exports.PlaceBidDto = exports.MetadataDto = exports.AdditionalTermsDto = exports.QualityRequirementsDto = exports.PaymentTermsDto = exports.DeliveryTermsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const bid_entity_1 = require("../entities/bid.entity");
class DeliveryTermsDto {
}
exports.DeliveryTermsDto = DeliveryTermsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-20T00:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DeliveryTermsDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DeliveryTermsDto.prototype, "deliveryLocation", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'truck' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeliveryTermsDto.prototype, "deliveryMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], DeliveryTermsDto.prototype, "deliveryCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 3 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    Max(7),
    __metadata("design:type", Number)
], DeliveryTermsDto.prototype, "flexibility", void 0);
class PaymentTermsDto {
}
exports.PaymentTermsDto = PaymentTermsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'bank_transfer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentTermsDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['50%', '50%'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], PaymentTermsDto.prototype, "schedule", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 20 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], PaymentTermsDto.prototype, "advancePayment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PaymentTermsDto.prototype, "escrowRequired", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 30 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], PaymentTermsDto.prototype, "paymentDays", void 0);
class QualityRequirementsDto {
}
exports.QualityRequirementsDto = QualityRequirementsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 90 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], QualityRequirementsDto.prototype, "minimumQuality", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['ISO 9001', 'CE'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], QualityRequirementsDto.prototype, "certifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QualityRequirementsDto.prototype, "testingRequired", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QualityRequirementsDto.prototype, "inspectionRequired", void 0);
class AdditionalTermsDto {
}
exports.AdditionalTermsDto = AdditionalTermsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 12 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], AdditionalTermsDto.prototype, "warrantyPeriod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'premium' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], AdditionalTermsDto.prototype, "supportLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['late_delivery_penalty'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AdditionalTermsDto.prototype, "penaltyClauses", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['early_delivery_bonus'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], AdditionalTermsDto.prototype, "bonusConditions", void 0);
class MetadataDto {
}
exports.MetadataDto = MetadataDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'industrial_buyer' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MetadataDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['low', 'medium', 'high', 'critical'], example: 'high' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['low', 'medium', 'high', 'critical']),
    __metadata("design:type", String)
], MetadataDto.prototype, "urgency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 85 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], MetadataDto.prototype, "confidence", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], MetadataDto.prototype, "riskAssessment", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['long_term_contract', 'bulk_discount'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MetadataDto.prototype, "competitiveAdvantage", void 0);
class PlaceBidDto {
}
exports.PlaceBidDto = PlaceBidDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'listing-uuid-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlaceBidDto.prototype, "listingId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500 }),
    (0, class_validator_1.IsNumber)(),
    Min(0.01),
    __metadata("design:type", Number)
], PlaceBidDto.prototype, "quantity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 0.0825 }),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], PlaceBidDto.prototype, "price", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: bid_entity_1.BidType, example: bid_entity_1.BidType.STANDARD }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(bid_entity_1.BidType),
    __metadata("design:type", String)
], PlaceBidDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'We offer competitive pricing with reliable delivery schedule' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PlaceBidDto.prototype, "message", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DeliveryTermsDto),
    __metadata("design:type", DeliveryTermsDto)
], PlaceBidDto.prototype, "deliveryTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PaymentTermsDto),
    __metadata("design:type", PaymentTermsDto)
], PlaceBidDto.prototype, "paymentTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => QualityRequirementsDto),
    __metadata("design:type", QualityRequirementsDto)
], PlaceBidDto.prototype, "qualityRequirements", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => AdditionalTermsDto),
    __metadata("design:type", AdditionalTermsDto)
], PlaceBidDto.prototype, "additionalTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => MetadataDto),
    __metadata("design:type", MetadataDto)
], PlaceBidDto.prototype, "metadata", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-10T23:59:59.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], PlaceBidDto.prototype, "expiresAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PlaceBidDto.prototype, "autoAccept", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0.3 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    Max(1),
    __metadata("design:type", Number)
], PlaceBidDto.prototype, "autoRejectThreshold", void 0);
//# sourceMappingURL=place-bid.dto.js.map
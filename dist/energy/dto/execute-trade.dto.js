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
exports.ExecuteTradeDto = exports.MilestoneDto = exports.ComplianceDto = exports.QualityAssuranceDto = exports.ContractTermsDto = exports.PaymentDetailsDto = exports.DeliveryDetailsDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
const trade_entity_1 = require("../entities/trade.entity");
class DeliveryDetailsDto {
}
exports.DeliveryDetailsDto = DeliveryDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DeliveryDetailsDto.prototype, "deliveryAddress", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-02-20T00:00:00.000Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], DeliveryDetailsDto.prototype, "deliveryWindow", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'truck' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "deliveryMethod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'TRK123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "trackingNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'FedEx' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "carrier", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Deliver to loading dock at rear entrance' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], DeliveryDetailsDto.prototype, "specialInstructions", void 0);
class PaymentDetailsDto {
}
exports.PaymentDetailsDto = PaymentDetailsDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'bank_transfer' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentDetailsDto.prototype, "method", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'USD' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentDetailsDto.prototype, "currency", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], PaymentDetailsDto.prototype, "paymentSchedule", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], PaymentDetailsDto.prototype, "escrowReleased", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], PaymentDetailsDto.prototype, "refundAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Quality issues' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PaymentDetailsDto.prototype, "refundReason", void 0);
class ContractTermsDto {
}
exports.ContractTermsDto = ContractTermsDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'contract-uuid-here' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContractTermsDto.prototype, "contractId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'https://example.com/contract.pdf' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContractTermsDto.prototype, "contractUrl", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true }),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ContractTermsDto.prototype, "termsAccepted", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-15T10:30:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], ContractTermsDto.prototype, "termsAcceptedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '30 days notice required' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContractTermsDto.prototype, "terminationClause", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 12 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], ContractTermsDto.prototype, "warrantyPeriod", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'premium' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContractTermsDto.prototype, "supportLevel", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['late_delivery_penalty', 'quality_penalty'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ContractTermsDto.prototype, "penaltyClauses", void 0);
class QualityAssuranceDto {
}
exports.QualityAssuranceDto = QualityAssuranceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QualityAssuranceDto.prototype, "inspectionRequired", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], QualityAssuranceDto.prototype, "inspectionCompleted", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-18T14:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], QualityAssuranceDto.prototype, "inspectionDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['pass', 'fail', 'conditional'], example: 'pass' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['pass', 'fail', 'conditional']),
    __metadata("design:type", String)
], QualityAssuranceDto.prototype, "inspectionResult", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 95 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], QualityAssuranceDto.prototype, "qualityScore", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['minor_scratches'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], QualityAssuranceDto.prototype, "deficiencies", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['touch_up_paint'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], QualityAssuranceDto.prototype, "correctiveActions", void 0);
class ComplianceDto {
}
exports.ComplianceDto = ComplianceDto;
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['ISO 9001', 'CE', 'FCC'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], ComplianceDto.prototype, "certifications", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ComplianceDto.prototype, "regulatoryApproved", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ComplianceDto.prototype, "environmentalCompliance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ComplianceDto.prototype, "safetyCompliance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    __metadata("design:type", Array)
], ComplianceDto.prototype, "complianceDocuments", void 0);
class MilestoneDto {
}
exports.MilestoneDto = MilestoneDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'delivery_confirmation' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Delivery Confirmation' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Confirm receipt of energy delivery' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2024-02-20T18:00:00.000Z' }),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "dueDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2024-02-20T17:30:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "completedDate", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: ['pending', 'in_progress', 'completed', 'failed'], example: 'completed' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['pending', 'in_progress', 'completed', 'failed']),
    __metadata("design:type", String)
], MilestoneDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'delivery_team' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], MilestoneDto.prototype, "assignedTo", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['quality_check'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", Array)
], MilestoneDto.prototype, "dependencies", void 0);
class ExecuteTradeDto {
}
exports.ExecuteTradeDto = ExecuteTradeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'bid-uuid-here' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecuteTradeDto.prototype, "bidId", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ enum: trade_entity_1.TradeType, example: trade_entity_1.TradeType.STANDARD }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(trade_entity_1.TradeType),
    __metadata("design:type", String)
], ExecuteTradeDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0.05 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    Max(1),
    __metadata("design:type", Number)
], ExecuteTradeDto.prototype, "negotiatedDiscount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0.02 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], ExecuteTradeDto.prototype, "serviceFee", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 0.08 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], ExecuteTradeDto.prototype, "taxAmount", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 500 }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    Min(0),
    __metadata("design:type", Number)
], ExecuteTradeDto.prototype, "deliveryCost", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => DeliveryDetailsDto),
    __metadata("design:type", DeliveryDetailsDto)
], ExecuteTradeDto.prototype, "deliveryDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PaymentDetailsDto),
    __metadata("design:type", PaymentDetailsDto)
], ExecuteTradeDto.prototype, "paymentDetails", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ContractTermsDto),
    __metadata("design:type", ContractTermsDto)
], ExecuteTradeDto.prototype, "contractTerms", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => QualityAssuranceDto),
    __metadata("design:type", QualityAssuranceDto)
], ExecuteTradeDto.prototype, "qualityAssurance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => ComplianceDto),
    __metadata("design:type", ComplianceDto)
], ExecuteTradeDto.prototype, "compliance", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => MilestoneDto),
    __metadata("design:type", Array)
], ExecuteTradeDto.prototype, "milestones", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'Urgent delivery required for critical infrastructure' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ExecuteTradeDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: ['urgent', 'priority'] }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsString)({ each: true }),
    __metadata("design:type", String)
], ExecuteTradeDto.prototype, "tags", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: true }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], ExecuteTradeDto.prototype, "immediateExecution", void 0);
//# sourceMappingURL=execute-trade.dto.js.map
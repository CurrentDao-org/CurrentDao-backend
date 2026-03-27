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
exports.FilterInternationalTradeDto = exports.UpdateInternationalTradeDto = exports.CreateInternationalTradeDto = exports.CustomsTariffDto = exports.RegulatoryComplianceDto = exports.CurrencyConversionDto = void 0;
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const cross_border_transaction_entity_1 = require("../entities/cross-border-transaction.entity");
class CurrencyConversionDto {
}
exports.CurrencyConversionDto = CurrencyConversionDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CurrencyConversionDto.prototype, "sourceCurrency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CurrencyConversionDto.prototype, "targetCurrency", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CurrencyConversionDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CurrencyConversionDto.prototype, "exchangeRate", void 0);
class RegulatoryComplianceDto {
}
exports.RegulatoryComplianceDto = RegulatoryComplianceDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegulatoryComplianceDto.prototype, "regulationCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], RegulatoryComplianceDto.prototype, "complianceLevel", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], RegulatoryComplianceDto.prototype, "requiredDocuments", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], RegulatoryComplianceDto.prototype, "complianceChecks", void 0);
class CustomsTariffDto {
}
exports.CustomsTariffDto = CustomsTariffDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CustomsTariffDto.prototype, "hsCode", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CustomsTariffDto.prototype, "productCategory", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CustomsTariffDto.prototype, "tariffRate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CustomsTariffDto.prototype, "customsValue", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CustomsTariffDto.prototype, "applicableTaxes", void 0);
class CreateInternationalTradeDto {
}
exports.CreateInternationalTradeDto = CreateInternationalTradeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "transactionId", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(cross_border_transaction_entity_1.TransactionType),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "transactionType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "sourceCountry", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "targetCountry", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateInternationalTradeDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CurrencyConversionDto),
    __metadata("design:type", CurrencyConversionDto)
], CreateInternationalTradeDto.prototype, "currencyConversion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RegulatoryComplianceDto),
    __metadata("design:type", RegulatoryComplianceDto)
], CreateInternationalTradeDto.prototype, "regulatoryCompliance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CustomsTariffDto),
    __metadata("design:type", CustomsTariffDto)
], CreateInternationalTradeDto.prototype, "customsTariff", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "energyType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateInternationalTradeDto.prototype, "energyQuantity", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "energyUnit", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "supplierId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "buyerId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "contractId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "transactionDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "deliveryDate", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "paymentTerms", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "incoterms", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], CreateInternationalTradeDto.prototype, "documents", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateInternationalTradeDto.prototype, "notes", void 0);
class UpdateInternationalTradeDto {
}
exports.UpdateInternationalTradeDto = UpdateInternationalTradeDto;
__decorate([
    (0, class_validator_1.IsEnum)(cross_border_transaction_entity_1.TransactionType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInternationalTradeDto.prototype, "transactionType", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateInternationalTradeDto.prototype, "amount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInternationalTradeDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CurrencyConversionDto),
    __metadata("design:type", CurrencyConversionDto)
], UpdateInternationalTradeDto.prototype, "currencyConversion", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => RegulatoryComplianceDto),
    __metadata("design:type", RegulatoryComplianceDto)
], UpdateInternationalTradeDto.prototype, "regulatoryCompliance", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => CustomsTariffDto),
    __metadata("design:type", CustomsTariffDto)
], UpdateInternationalTradeDto.prototype, "customsTariff", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateInternationalTradeDto.prototype, "notes", void 0);
class FilterInternationalTradeDto {
}
exports.FilterInternationalTradeDto = FilterInternationalTradeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "sourceCountry", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "targetCountry", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(cross_border_transaction_entity_1.TransactionType),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "transactionType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "currency", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(cross_border_transaction_entity_1.ComplianceStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "complianceStatus", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], FilterInternationalTradeDto.prototype, "minAmount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], FilterInternationalTradeDto.prototype, "maxAmount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "energyType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "supplierId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], FilterInternationalTradeDto.prototype, "buyerId", void 0);
//# sourceMappingURL=international-trade.dto.js.map
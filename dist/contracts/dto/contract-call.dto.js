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
exports.ContractUpgradeDto = exports.ContractDeploymentDto = exports.ContractEventListenerDto = exports.ContractCallDto = exports.ContractInvocationMode = void 0;
const class_validator_1 = require("class-validator");
const contract_entity_1 = require("../entities/contract.entity");
var ContractInvocationMode;
(function (ContractInvocationMode) {
    ContractInvocationMode["READ_ONLY"] = "read_only";
    ContractInvocationMode["SIGNED"] = "signed";
})(ContractInvocationMode || (exports.ContractInvocationMode = ContractInvocationMode = {}));
class ContractCallDto {
}
exports.ContractCallDto = ContractCallDto;
__decorate([
    (0, class_validator_1.IsEnum)(contract_entity_1.ContractType),
    __metadata("design:type", String)
], ContractCallDto.prototype, "contractType", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "method", void 0);
__decorate([
    (0, class_validator_1.IsArray)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], ContractCallDto.prototype, "args", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(ContractInvocationMode),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "mode", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(contract_entity_1.ContractNetwork),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "network", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ContractCallDto.prototype, "simulateOnly", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "signerSecretKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "sourcePublicKey", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "correlationId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractCallDto.prototype, "idempotencyKey", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ContractCallDto.prototype, "useCache", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(1),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ContractCallDto.prototype, "timeoutInSeconds", void 0);
class ContractEventListenerDto {
}
exports.ContractEventListenerDto = ContractEventListenerDto;
__decorate([
    (0, class_validator_1.IsEnum)(contract_entity_1.ContractType),
    __metadata("design:type", String)
], ContractEventListenerDto.prototype, "contractType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(contract_entity_1.ContractNetwork),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractEventListenerDto.prototype, "network", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], ContractEventListenerDto.prototype, "startLedger", void 0);
class ContractDeploymentDto {
}
exports.ContractDeploymentDto = ContractDeploymentDto;
__decorate([
    (0, class_validator_1.IsEnum)(contract_entity_1.ContractType),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "contractType", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(contract_entity_1.ContractNetwork),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "network", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "alias", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "version", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "contractId", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "prebuiltTransactionXdr", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "deploymentTxHash", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], ContractDeploymentDto.prototype, "signerSecretKey", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ContractDeploymentDto.prototype, "abi", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ContractDeploymentDto.prototype, "metadata", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], ContractDeploymentDto.prototype, "deploymentMetadata", void 0);
class ContractUpgradeDto extends ContractDeploymentDto {
}
exports.ContractUpgradeDto = ContractUpgradeDto;
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ContractUpgradeDto.prototype, "previousContractId", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], ContractUpgradeDto.prototype, "activate", void 0);
//# sourceMappingURL=contract-call.dto.js.map
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
exports.ContractEntity = exports.ContractStatus = exports.ContractNetwork = exports.ContractType = void 0;
const typeorm_1 = require("typeorm");
var ContractType;
(function (ContractType) {
    ContractType["TOKEN"] = "token";
    ContractType["ESCROW"] = "escrow";
    ContractType["GOVERNANCE"] = "governance";
})(ContractType || (exports.ContractType = ContractType = {}));
var ContractNetwork;
(function (ContractNetwork) {
    ContractNetwork["TESTNET"] = "testnet";
    ContractNetwork["MAINNET"] = "mainnet";
})(ContractNetwork || (exports.ContractNetwork = ContractNetwork = {}));
var ContractStatus;
(function (ContractStatus) {
    ContractStatus["ACTIVE"] = "active";
    ContractStatus["INACTIVE"] = "inactive";
    ContractStatus["DEPLOYING"] = "deploying";
    ContractStatus["FAILED"] = "failed";
    ContractStatus["DEPRECATED"] = "deprecated";
})(ContractStatus || (exports.ContractStatus = ContractStatus = {}));
let ContractEntity = class ContractEntity {
};
exports.ContractEntity = ContractEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ContractEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ContractType }),
    __metadata("design:type", String)
], ContractEntity.prototype, "contractType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ContractNetwork }),
    __metadata("design:type", String)
], ContractEntity.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], ContractEntity.prototype, "contractId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "alias", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "version", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "specHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "metadataCacheKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "deploymentTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "upgradeTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "previousContractId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "deployedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ContractStatus,
        default: ContractStatus.ACTIVE,
    }),
    __metadata("design:type", String)
], ContractEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], ContractEntity.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ContractEntity.prototype, "abi", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ContractEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], ContractEntity.prototype, "deploymentMetadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", String)
], ContractEntity.prototype, "lastProcessedLedger", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], ContractEntity.prototype, "lastEventAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ContractEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ContractEntity.prototype, "updatedAt", void 0);
exports.ContractEntity = ContractEntity = __decorate([
    (0, typeorm_1.Entity)('contracts'),
    (0, typeorm_1.Index)(['contractType', 'network', 'isActive']),
    (0, typeorm_1.Index)(['contractId', 'network'])
], ContractEntity);
//# sourceMappingURL=contract.entity.js.map
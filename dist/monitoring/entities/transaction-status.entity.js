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
exports.TransactionStatusEntity = exports.TransactionPriority = exports.TransactionStatus = void 0;
const typeorm_1 = require("typeorm");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["CONFIRMED"] = "confirmed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["RETRYING"] = "retrying";
    TransactionStatus["TIMEOUT"] = "timeout";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionPriority;
(function (TransactionPriority) {
    TransactionPriority["LOW"] = "low";
    TransactionPriority["MEDIUM"] = "medium";
    TransactionPriority["HIGH"] = "high";
    TransactionPriority["CRITICAL"] = "critical";
})(TransactionPriority || (exports.TransactionPriority = TransactionPriority = {}));
let TransactionStatusEntity = class TransactionStatusEntity {
};
exports.TransactionStatusEntity = TransactionStatusEntity;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "transactionHash", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransactionStatus,
        default: TransactionStatus.PENDING
    }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TransactionPriority,
        default: TransactionPriority.MEDIUM
    }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "sourceAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "destinationAccount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 7, nullable: true }),
    __metadata("design:type", Number)
], TransactionStatusEntity.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "assetCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "assetIssuer", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "memo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TransactionStatusEntity.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionStatusEntity.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], TransactionStatusEntity.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 3 }),
    __metadata("design:type", Number)
], TransactionStatusEntity.prototype, "maxRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'bigint', nullable: true }),
    __metadata("design:type", Number)
], TransactionStatusEntity.prototype, "ledgerSequence", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TransactionStatusEntity.prototype, "confirmedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TransactionStatusEntity.prototype, "lastRetryAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TransactionStatusEntity.prototype, "timeoutAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], TransactionStatusEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], TransactionStatusEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], TransactionStatusEntity.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], TransactionStatusEntity.prototype, "isArchived", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], TransactionStatusEntity.prototype, "alerts", void 0);
exports.TransactionStatusEntity = TransactionStatusEntity = __decorate([
    (0, typeorm_1.Entity)('transaction_status'),
    (0, typeorm_1.Index)(['transactionHash']),
    (0, typeorm_1.Index)(['status']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['priority'])
], TransactionStatusEntity);
//# sourceMappingURL=transaction-status.entity.js.map
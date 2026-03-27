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
exports.CrossBorderTransaction = exports.ComplianceStatus = exports.TransactionType = exports.TransactionStatus = void 0;
const typeorm_1 = require("typeorm");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["DISPUTED"] = "disputed";
    TransactionStatus["CANCELLED"] = "cancelled";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["IMPORT"] = "import";
    TransactionType["EXPORT"] = "export";
    TransactionType["TRANSIT"] = "transit";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var ComplianceStatus;
(function (ComplianceStatus) {
    ComplianceStatus["COMPLIANT"] = "compliant";
    ComplianceStatus["NON_COMPLIANT"] = "non_compliant";
    ComplianceStatus["PENDING_REVIEW"] = "pending_review";
    ComplianceStatus["REQUIREMENTS_MET"] = "requirements_met";
})(ComplianceStatus || (exports.ComplianceStatus = ComplianceStatus = {}));
let CrossBorderTransaction = class CrossBorderTransaction {
};
exports.CrossBorderTransaction = CrossBorderTransaction;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "transactionType", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "sourceCountry", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "targetCountry", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], CrossBorderTransaction.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3 }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CrossBorderTransaction.prototype, "convertedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, nullable: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "targetCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 4, nullable: true }),
    __metadata("design:type", Number)
], CrossBorderTransaction.prototype, "exchangeRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CrossBorderTransaction.prototype, "customsTariff", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CrossBorderTransaction.prototype, "regulatoryFees", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], CrossBorderTransaction.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: TransactionStatus.PENDING }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: ComplianceStatus.PENDING_REVIEW }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "complianceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], CrossBorderTransaction.prototype, "regulatoryData", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], CrossBorderTransaction.prototype, "customsData", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], CrossBorderTransaction.prototype, "complianceChecks", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "regulatoryReportId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "customsDeclarationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "disputeId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CrossBorderTransaction.prototype, "failureReason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], CrossBorderTransaction.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], CrossBorderTransaction.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], CrossBorderTransaction.prototype, "processedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", Date)
], CrossBorderTransaction.prototype, "completedAt", void 0);
exports.CrossBorderTransaction = CrossBorderTransaction = __decorate([
    (0, typeorm_1.Entity)('cross_border_transactions'),
    (0, typeorm_1.Index)(['transactionId', 'status']),
    (0, typeorm_1.Index)(['sourceCountry', 'targetCountry']),
    (0, typeorm_1.Index)(['currency', 'status'])
], CrossBorderTransaction);
//# sourceMappingURL=cross-border-transaction.entity.js.map
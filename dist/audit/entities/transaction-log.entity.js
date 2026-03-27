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
exports.TransactionLog = exports.ComplianceLevel = exports.PaymentMethod = exports.TransactionCategory = exports.TransactionStatus = exports.TransactionType = void 0;
const typeorm_1 = require("typeorm");
const audit_log_entity_1 = require("./audit-log.entity");
var TransactionType;
(function (TransactionType) {
    TransactionType["TRADE_EXECUTION"] = "trade_execution";
    TransactionType["PAYMENT_PROCESSING"] = "payment_processing";
    TransactionType["SETTLEMENT"] = "settlement";
    TransactionType["ESCROW_RELEASE"] = "escrow_release";
    TransactionType["REFUND"] = "refund";
    TransactionType["CANCELLATION"] = "cancellation";
    TransactionType["MODIFICATION"] = "modification";
    TransactionType["APPROVAL"] = "approval";
    TransactionType["REJECTION"] = "rejection";
    TransactionType["VERIFICATION"] = "verification";
    TransactionType["COMPLIANCE_CHECK"] = "compliance_check";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["INITIATED"] = "initiated";
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["COMPLETED"] = "completed";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["CANCELLED"] = "cancelled";
    TransactionStatus["REVERSED"] = "reversed";
    TransactionStatus["HELD"] = "held";
    TransactionStatus["EXPIRED"] = "expired";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
var TransactionCategory;
(function (TransactionCategory) {
    TransactionCategory["ENERGY_TRADE"] = "energy_trade";
    TransactionCategory["FINANCIAL"] = "financial";
    TransactionCategory["COMPLIANCE"] = "compliance";
    TransactionCategory["SECURITY"] = "security";
    TransactionCategory["SYSTEM"] = "system";
    TransactionCategory["USER_MANAGEMENT"] = "user_management";
    TransactionCategory["DATA_MANAGEMENT"] = "data_management";
})(TransactionCategory || (exports.TransactionCategory = TransactionCategory = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["BANK_TRANSFER"] = "bank_transfer";
    PaymentMethod["CREDIT_CARD"] = "credit_card";
    PaymentMethod["DEBIT_CARD"] = "debit_card";
    PaymentMethod["DIGITAL_WALLET"] = "digital_wallet";
    PaymentMethod["CRYPTOCURRENCY"] = "cryptocurrency";
    PaymentMethod["ESCROW"] = "escrow";
    PaymentMethod["WIRE_TRANSFER"] = "wire_transfer";
    PaymentMethod["CHECK"] = "check";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var ComplianceLevel;
(function (ComplianceLevel) {
    ComplianceLevel["STANDARD"] = "standard";
    ComplianceLevel["ENHANCED"] = "enhanced";
    ComplianceLevel["STRICT"] = "strict";
    ComplianceLevel["REGULATED"] = "regulated";
})(ComplianceLevel || (exports.ComplianceLevel = ComplianceLevel = {}));
let TransactionLog = class TransactionLog {
};
exports.TransactionLog = TransactionLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], TransactionLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionType }),
    __metadata("design:type", String)
], TransactionLog.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.INITIATED }),
    __metadata("design:type", String)
], TransactionLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: TransactionCategory }),
    __metadata("design:type", String)
], TransactionLog.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'transaction_id', unique: true, length: 64 }),
    __metadata("design:type", String)
], TransactionLog.prototype, "transactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_transaction_id', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "parentTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'root_transaction_id', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "rootTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'batch_id', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlation_id', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'source_account_id', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "sourceAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'destination_account_id', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "destinationAccountId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'intermediate_accounts', type: 'json', nullable: true }),
    __metadata("design:type", Array)
], TransactionLog.prototype, "intermediateAccounts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "amount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "originalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "feeAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "taxAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 15, scale: 2 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "exchangeRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3 }),
    __metadata("design:type", String)
], TransactionLog.prototype, "currency", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 3, nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "originalCurrency", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: PaymentMethod, nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_reference', length: 128, nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "paymentReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_gateway', length: 64, nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "paymentGateway", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_transaction_id', length: 128, nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "gatewayTransactionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'gateway_response', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "gatewayResponse", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "participants", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "energyDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "contractDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "compliance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "risk", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "timeline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "state", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "audit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "security", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "privacy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "reconciliation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "reporting", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'error_code', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "errorCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "errorMessage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "errorDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retry_count', default: 0 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "retryCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_retries', default: 3 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "maxRetries", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_retry_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "nextRetryAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by' }),
    __metadata("design:type", String)
], TransactionLog.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejected_by', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "rejectedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rejected_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "rejectedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_by', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "completedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'completed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expires_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "expiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retention_until', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "retentionUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'archived_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "archivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deleted_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_reversible', default: false }),
    __metadata("design:type", Boolean)
], TransactionLog.prototype, "isReversible", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_reversible_until', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "isReversibleUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reversed_by', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "reversedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reversed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "reversedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reversal_reason', type: 'text', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "reversalReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'external_reference', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "externalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'internal_reference', nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "internalReference", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'blockchain_tx_hash', length: 64, nullable: true }),
    __metadata("design:type", String)
], TransactionLog.prototype, "blockchainTxHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'blockchain_block_number', nullable: true }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "blockchainBlockNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'blockchain_confirmations', default: 0 }),
    __metadata("design:type", Number)
], TransactionLog.prototype, "blockchainConfirmations", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], TransactionLog.prototype, "blockchain", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], TransactionLog.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => audit_log_entity_1.AuditLog, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'audit_log_id' }),
    __metadata("design:type", audit_log_entity_1.AuditLog)
], TransactionLog.prototype, "auditLog", void 0);
__decorate([
    (0, typeorm_1.Index)(['transactionId']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['type', 'createdAt']),
    (0, typeorm_1.Index)(['category', 'createdAt']),
    (0, typeorm_1.Index)(['sourceAccountId']),
    (0, typeorm_1.Index)(['destinationAccountId']),
    (0, typeorm_1.Index)(['amount', 'currency']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['correlationId']),
    (0, typeorm_1.Index)(['batchId']),
    (0, typeorm_1.Index)(['parentTransactionId']),
    (0, typeorm_1.Index)(['rootTransactionId']),
    (0, typeorm_1.Index)(['retentionUntil']),
    (0, typeorm_1.Index)(['expiresAt']),
    (0, typeorm_1.Index)(['blockchainTxHash']),
    __metadata("design:type", Object)
], TransactionLog.prototype, "", void 0);
exports.TransactionLog = TransactionLog = __decorate([
    (0, typeorm_1.Entity)('transaction_logs')
], TransactionLog);
//# sourceMappingURL=transaction-log.entity.js.map
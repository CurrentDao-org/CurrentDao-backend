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
exports.AuditLog = exports.AuditStatus = exports.AuditSeverity = exports.AuditResource = exports.AuditAction = void 0;
const typeorm_1 = require("typeorm");
var AuditAction;
(function (AuditAction) {
    AuditAction["CREATE"] = "create";
    AuditAction["READ"] = "read";
    AuditAction["UPDATE"] = "update";
    AuditAction["DELETE"] = "delete";
    AuditAction["EXECUTE"] = "execute";
    AuditAction["APPROVE"] = "approve";
    AuditAction["REJECT"] = "reject";
    AuditAction["CANCEL"] = "cancel";
    AuditAction["LOGIN"] = "login";
    AuditAction["LOGOUT"] = "logout";
    AuditAction["ACCESS_DENIED"] = "access_denied";
    AuditAction["SYSTEM_ERROR"] = "system_error";
    AuditAction["DATA_EXPORT"] = "data_export";
    AuditAction["CONFIG_CHANGE"] = "config_change";
    AuditAction["SECURITY_EVENT"] = "security_event";
    AuditAction["COMPLIANCE_CHECK"] = "compliance_check";
})(AuditAction || (exports.AuditAction = AuditAction = {}));
var AuditResource;
(function (AuditResource) {
    AuditResource["USER"] = "user";
    AuditResource["TRADE"] = "trade";
    AuditResource["LISTING"] = "listing";
    AuditResource["BID"] = "bid";
    AuditResource["MATCH"] = "match";
    AuditResource["TRANSACTION"] = "transaction";
    AuditResource["PAYMENT"] = "payment";
    AuditResource["SETTLEMENT"] = "settlement";
    AuditResource["CONTRACT"] = "contract";
    AuditResource["SYSTEM"] = "system";
    AuditResource["AUDIT"] = "audit";
    AuditResource["REPORT"] = "report";
    AuditResource["CONFIGURATION"] = "configuration";
})(AuditResource || (exports.AuditResource = AuditResource = {}));
var AuditSeverity;
(function (AuditSeverity) {
    AuditSeverity["LOW"] = "low";
    AuditSeverity["MEDIUM"] = "medium";
    AuditSeverity["HIGH"] = "high";
    AuditSeverity["CRITICAL"] = "critical";
})(AuditSeverity || (exports.AuditSeverity = AuditSeverity = {}));
var AuditStatus;
(function (AuditStatus) {
    AuditStatus["ACTIVE"] = "active";
    AuditStatus["ARCHIVED"] = "archived";
    AuditStatus["DELETED"] = "deleted";
})(AuditStatus || (exports.AuditStatus = AuditStatus = {}));
let AuditLog = class AuditLog {
};
exports.AuditLog = AuditLog;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], AuditLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AuditAction }),
    __metadata("design:type", String)
], AuditLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AuditResource }),
    __metadata("design:type", String)
], AuditLog.prototype, "resource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AuditSeverity, default: AuditSeverity.MEDIUM }),
    __metadata("design:type", String)
], AuditLog.prototype, "severity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: AuditStatus, default: AuditStatus.ACTIVE }),
    __metadata("design:type", String)
], AuditLog.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resource_id', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "resourceId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'session_id', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "sessionId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ip_address', length: 45, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_agent', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'request_method', length: 10, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "requestMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'request_url', type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "requestUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'request_body', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "requestBody", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'response_body', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "responseBody", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'response_status', nullable: true }),
    __metadata("design:type", Number)
], AuditLog.prototype, "responseStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'execution_time', type: 'decimal', precision: 8, scale: 3, nullable: true }),
    __metadata("design:type", Number)
], AuditLog.prototype, "executionTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'memory_usage', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Number)
], AuditLog.prototype, "memoryUsage", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'checksum', length: 64, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "checksum", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signature', length: 512, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "signature", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signed_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuditLog.prototype, "signedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'signed_by', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "signedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'retention_until', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuditLog.prototype, "retentionUntil", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'archived_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuditLog.prototype, "archivedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deleted_at', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AuditLog.prototype, "deletedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], AuditLog.prototype, "chainOfCustody", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "verification", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "compliance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "privacy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'correlation_id', length: 64, nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "correlationId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_id', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'batch_id', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "batchId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "performance", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "security", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "integration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], AuditLog.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_sensitive', default: false }),
    __metadata("design:type", Boolean)
], AuditLog.prototype, "isSensitive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_encrypted', default: false }),
    __metadata("design:type", Boolean)
], AuditLog.prototype, "isEncrypted", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'encryption_key_id', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "encryptionKeyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'compression_algorithm', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "compressionAlgorithm", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'storage_location', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "storageLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'backup_location', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "backupLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'restore_point', nullable: true }),
    __metadata("design:type", String)
], AuditLog.prototype, "restorePoint", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AuditLog.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], AuditLog.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Index)(['userId', 'createdAt']),
    (0, typeorm_1.Index)(['resource', 'resourceId']),
    (0, typeorm_1.Index)(['action', 'createdAt']),
    (0, typeorm_1.Index)(['severity', 'createdAt']),
    (0, typeorm_1.Index)(['status', 'createdAt']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['correlationId']),
    (0, typeorm_1.Index)(['batchId']),
    (0, typeorm_1.Index)(['retentionUntil']),
    __metadata("design:type", Object)
], AuditLog.prototype, "", void 0);
exports.AuditLog = AuditLog = __decorate([
    (0, typeorm_1.Entity)('audit_logs')
], AuditLog);
//# sourceMappingURL=audit-log.entity.js.map
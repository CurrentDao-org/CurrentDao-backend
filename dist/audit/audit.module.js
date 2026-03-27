"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const audit_service_1 = require("./audit.service");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const transaction_log_entity_1 = require("./entities/transaction-log.entity");
const compliance_report_1 = require("./reports/compliance.report");
let AuditModule = class AuditModule {
};
exports.AuditModule = AuditModule;
exports.AuditModule = AuditModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([audit_log_entity_1.AuditLog, transaction_log_entity_1.TransactionLog])],
        providers: [audit_service_1.AuditService, compliance_report_1.ComplianceReport],
        exports: [audit_service_1.AuditService, compliance_report_1.ComplianceReport],
    })
], AuditModule);
//# sourceMappingURL=audit.module.js.map
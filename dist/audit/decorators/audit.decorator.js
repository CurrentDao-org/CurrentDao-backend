"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditComplianceCheck = exports.AuditSecurityEvent = exports.AuditConfigChange = exports.AuditDataExport = exports.AuditSystemError = exports.AuditAccessDenied = exports.AuditLogout = exports.AuditLogin = exports.AuditCancel = exports.AuditReject = exports.AuditApprove = exports.AuditExecute = exports.AuditDelete = exports.AuditUpdate = exports.AuditRead = exports.AuditCreate = exports.Audit = void 0;
exports.AuditMethod = AuditMethod;
exports.AuditClass = AuditClass;
exports.AuditParam = AuditParam;
exports.AuditSensitive = AuditSensitive;
exports.AuditSkipIf = AuditSkipIf;
exports.AuditRedact = AuditRedact;
exports.AuditCustomField = AuditCustomField;
exports.UseAuditInterceptor = UseAuditInterceptor;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../interceptors/audit.interceptor");
const audit_log_entity_1 = require("../entities/audit-log.entity");
const Audit = (options = {}) => {
    return (target, propertyKey, descriptor) => {
        const action = options.action || propertyKey || 'unknown';
        const resource = options.resource || target.constructor.name;
        (0, common_1.SetMetadata)('audit', {
            action,
            resource,
            severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
            description: options.description || `${action} ${resource}`,
            includeRequestBody: options.includeRequestBody ?? false,
            includeResponseBody: options.includeResponseBody ?? false,
            includeHeaders: options.includeHeaders ?? false,
            includeMetadata: options.includeMetadata ?? true,
            sensitive: options.sensitive ?? false,
            customFields: options.customFields || {},
            skipIf: options.skipIf,
            redactFields: options.redactFields || [],
        });
        if (descriptor) {
            Reflect.defineMetadata(target, propertyKey, descriptor);
        }
    };
};
exports.Audit = Audit;
const AuditCreate = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.CREATE,
    });
};
exports.AuditCreate = AuditCreate;
const AuditRead = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.READ,
    });
};
exports.AuditRead = AuditRead;
const AuditUpdate = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.UPDATE,
        includeRequestBody: true,
        includeResponseBody: true,
    });
};
exports.AuditUpdate = AuditUpdate;
const AuditDelete = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.DELETE,
        severity: options.severity || audit_log_entity_1.AuditSeverity.HIGH,
    });
};
exports.AuditDelete = AuditDelete;
const AuditExecute = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.EXECUTE,
        severity: options.severity || audit_log_entity_1.AuditSeverity.HIGH,
    });
};
exports.AuditExecute = AuditExecute;
const AuditApprove = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.APPROVE,
        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
    });
};
exports.AuditApprove = AuditApprove;
const AuditReject = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.REJECT,
        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
    });
};
exports.AuditReject = AuditReject;
const AuditCancel = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.CANCEL,
        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
    });
};
exports.AuditCancel = AuditCancel;
const AuditLogin = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.LOGIN,
        resource: audit_log_entity_1.AuditResource.USER,
        severity: options.severity || audit_log_entity_1.AuditSeverity.LOW,
        includeHeaders: true,
    });
};
exports.AuditLogin = AuditLogin;
const AuditLogout = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.LOGOUT,
        resource: audit_log_entity_1.AuditResource.USER,
        severity: options.severity || audit_log_entity_1.AuditSeverity.LOW,
        includeHeaders: true,
    });
};
exports.AuditLogout = AuditLogout;
const AuditAccessDenied = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.ACCESS_DENIED,
        severity: options.severity || audit_log_entity_1.AuditSeverity.HIGH,
        includeHeaders: true,
    });
};
exports.AuditAccessDenied = AuditAccessDenied;
const AuditSystemError = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.SYSTEM_ERROR,
        resource: audit_log_entity_1.AuditResource.SYSTEM,
        severity: options.severity || audit_log_entity_1.AuditSeverity.CRITICAL,
        includeHeaders: true,
        includeRequestBody: true,
        includeResponseBody: true,
    });
};
exports.AuditSystemError = AuditSystemError;
const AuditDataExport = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.DATA_EXPORT,
        resource: audit_log_entity_1.AuditResource.AUDIT,
        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
        includeHeaders: true,
    });
};
exports.AuditDataExport = AuditDataExport;
const AuditConfigChange = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.CONFIG_CHANGE,
        resource: audit_log_entity_1.AuditResource.CONFIGURATION,
        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
        includeRequestBody: true,
    });
};
exports.AuditConfigChange = AuditConfigChange;
const AuditSecurityEvent = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.SECURITY_EVENT,
        resource: audit_log_entity_1.AuditResource.SYSTEM,
        severity: options.severity || audit_log_entity_1.AuditSeverity.HIGH,
        includeHeaders: true,
    });
};
exports.AuditSecurityEvent = AuditSecurityEvent;
const AuditComplianceCheck = (options = {}) => {
    return (0, exports.Audit)({
        ...options,
        action: audit_log_entity_1.AuditAction.COMPLIANCE_CHECK,
        resource: audit_log_entity_1.AuditResource.COMPLIANCE,
        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
    });
};
exports.AuditComplianceCheck = AuditComplianceCheck;
function AuditMethod(options = {}) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const startTime = Date.now();
            let result;
            let error;
            try {
                result = await originalMethod.apply(this, args);
            }
            catch (err) {
                error = err;
                throw err;
            }
            finally {
                const endTime = Date.now();
                const executionTime = endTime - startTime;
                const req = args[0]?.req || this?.req;
                if (req && (!options.skipIf || !options.skipIf(req))) {
                    const auditData = {
                        action: options.action || propertyKey,
                        resource: options.resource || target.constructor.name,
                        severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
                        description: options.description || `${options.action || propertyKey} ${options.resource || target.constructor.name}`,
                        executionTime,
                        timestamp: new Date(),
                        customFields: options.customFields || {},
                    };
                    req.auditData = auditData;
                }
            }
            return result;
        };
        return descriptor;
    };
}
function AuditClass(options = {}) {
    return function (constructor) {
        const auditOptions = {
            action: options.action || audit_log_entity_1.AuditAction.READ,
            resource: options.resource || constructor.name,
            severity: options.severity || audit_log_entity_1.AuditSeverity.MEDIUM,
            description: options.description || `${options.action} ${options.resource}`,
            includeRequestBody: options.includeRequestBody ?? false,
            includeResponseBody: options.includeResponseBody ?? false,
            includeHeaders: options.includeHeaders ?? false,
            includeMetadata: options.includeMetadata ?? true,
        };
        (0, common_1.SetMetadata)('audit:global', auditOptions);
        return constructor;
    };
}
function AuditParam(options = {}) {
    return function (target, propertyKey, descriptor) {
        const paramName = options.name || propertyKey;
        (0, common_1.SetMetadata)('audit:param', {
            name: paramName,
            description: options.description,
            redact: options.redact ?? false,
        });
        return descriptor;
    };
}
function AuditSensitive(options = {}) {
    return function (target, propertyKey, descriptor) {
        const fieldName = propertyKey;
        (0, common_1.SetMetadata)('audit:sensitive', {
            field: fieldName,
            redactAll: options.redactAll ?? false,
            fields: options.fields || [],
            classification: options.classification || 'confidential',
        });
        return descriptor;
    };
}
function AuditSkipIf(condition) {
    return function (target, propertyKey, descriptor) {
        (0, common_1.SetMetadata)('audit:skipIf', condition);
        return descriptor;
    };
}
function AuditRedact(fields) {
    return function (target, propertyKey, descriptor) {
        (0, common_1.SetMetadata)('audit:redact', fields);
        return descriptor;
    };
}
function AuditCustomField(key, value) {
    return function (target, propertyKey, descriptor) {
        (0, common_1.SetMetadata)(`audit:custom:${key}`, value);
        return descriptor;
    };
}
function UseAuditInterceptor(guards) {
    return function (target) {
        const interceptors = [audit_interceptor_1.AuditInterceptor];
        if (guards && guards.length > 0) {
            return (0, common_1.UseGuards)(...guards, (0, common_1.UseInterceptors)(...interceptors))(target);
        }
        return (0, common_1.UseInterceptors)(...interceptors)(target);
    };
}
//# sourceMappingURL=audit.decorator.js.map
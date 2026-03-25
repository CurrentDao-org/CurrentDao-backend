import { SetMetadata, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';

export interface AuditOptions {
  action?: AuditAction;
  resource?: AuditResource;
  severity?: AuditSeverity;
  description?: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeHeaders?: boolean;
  includeMetadata?: boolean;
  sensitive?: boolean;
  customFields?: Record<string, any>;
  skipIf?: (req: Request) => boolean;
  redactFields?: string[];
}

export const Audit = (options: AuditOptions = {}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const action = options.action || propertyKey || 'unknown';
    const resource = options.resource || target.constructor.name;
    
    SetMetadata('audit', {
      action,
      resource,
      severity: options.severity || AuditSeverity.MEDIUM,
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

export const AuditCreate = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.CREATE,
  });
};

export const AuditRead = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.READ,
  });
};

export const AuditUpdate = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.UPDATE,
    includeRequestBody: true,
    includeResponseBody: true,
  });
};

export const AuditDelete = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.DELETE,
    severity: options.severity || AuditSeverity.HIGH,
  });
};

export const AuditExecute = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.EXECUTE,
    severity: options.severity || AuditSeverity.HIGH,
  });
};

export const AuditApprove = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.APPROVE,
    severity: options.severity || AuditSeverity.MEDIUM,
  });
};

export const AuditReject = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.REJECT,
    severity: options.severity || AuditSeverity.MEDIUM,
  });
};

export const AuditCancel = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.CANCEL,
    severity: options.severity || AuditSeverity.MEDIUM,
  });
};

export const AuditLogin = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.LOGIN,
    resource: AuditResource.USER,
    severity: options.severity || AuditSeverity.LOW,
    includeHeaders: true,
  });
};

export const AuditLogout = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.LOGOUT,
    resource: AuditResource.USER,
    severity: options.severity || AuditSeverity.LOW,
    includeHeaders: true,
  });
};

export const AuditAccessDenied = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.ACCESS_DENIED,
    severity: options.severity || AuditSeverity.HIGH,
    includeHeaders: true,
  });
};

export const AuditSystemError = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.SYSTEM_ERROR,
    resource: AuditResource.SYSTEM,
    severity: options.severity || AuditSeverity.CRITICAL,
    includeHeaders: true,
    includeRequestBody: true,
    includeResponseBody: true,
  });
};

export const AuditDataExport = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.DATA_EXPORT,
    resource: AuditResource.AUDIT,
    severity: options.severity || AuditSeverity.MEDIUM,
    includeHeaders: true,
  });
};

export const AuditConfigChange = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.CONFIG_CHANGE,
    resource: AuditResource.CONFIGURATION,
    severity: options.severity || AuditSeverity.MEDIUM,
    includeRequestBody: true,
  });
};

export const AuditSecurityEvent = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.SECURITY_EVENT,
    resource: AuditResource.SYSTEM,
    severity: options.severity || AuditSeverity.HIGH,
    includeHeaders: true,
  });
};

export const AuditComplianceCheck = (options: Partial<AuditOptions> = {}) => {
  return Audit({
    ...options,
    action: AuditAction.COMPLIANCE_CHECK,
    resource: AuditResource.COMPLIANCE,
    severity: options.severity || AuditSeverity.MEDIUM,
  });
};

export function AuditMethod(options: AuditOptions = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let result: any;
      let error: any;

      try {
        result = await originalMethod.apply(this, args);
      } catch (err) {
        error = err;
        throw err;
      } finally {
        const endTime = Date.now();
        const executionTime = endTime - startTime;

        const req = args[0]?.req || this?.req;
        if (req && (!options.skipIf || !options.skipIf(req))) {
          const auditData = {
            action: options.action || propertyKey,
            resource: options.resource || target.constructor.name,
            severity: options.severity || AuditSeverity.MEDIUM,
            description: options.description || `${options.action || propertyKey} ${options.resource || target.constructor.name}`,
            executionTime,
            timestamp: new Date(),
            customFields: options.customFields || {},
          };

          // Store audit data in request for the interceptor to pick up
          req.auditData = auditData;
        }
      }

      return result;
    };

    return descriptor;
  };
}

export function AuditClass(options: {
  action?: AuditAction;
  resource?: AuditResource;
  severity?: AuditSeverity;
  description?: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  includeHeaders?: boolean;
  includeMetadata?: boolean;
} = {}) {
  return function <T extends { new(...args: any[]): T }>(constructor: T) {
    const auditOptions = {
      action: options.action || AuditAction.READ,
      resource: options.resource || constructor.name,
      severity: options.severity || AuditSeverity.MEDIUM,
      description: options.description || `${options.action} ${options.resource}`,
      includeRequestBody: options.includeRequestBody ?? false,
      includeResponseBody: options.includeResponseBody ?? false,
      includeHeaders: options.includeHeaders ?? false,
      includeMetadata: options.includeMetadata ?? true,
    };

    SetMetadata('audit:global', auditOptions);
    return constructor;
  };
}

export function AuditParam(options: {
  name?: string;
  description?: string;
  redact?: boolean;
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const paramName = options.name || propertyKey;
    
    SetMetadata('audit:param', {
      name: paramName,
      description: options.description,
      redact: options.redact ?? false,
    });

    return descriptor;
  };
}

export function AuditSensitive(options: {
  fields?: string[];
  redactAll?: boolean;
  classification?: 'public' | 'internal' | 'confidential' | 'restricted';
} = {}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const fieldName = propertyKey;
    
    SetMetadata('audit:sensitive', {
      field: fieldName,
      redactAll: options.redactAll ?? false,
      fields: options.fields || [],
      classification: options.classification || 'confidential',
    });

    return descriptor;
  };
}

export function AuditSkipIf(condition: (req: Request) => boolean) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata('audit:skipIf', condition);
    return descriptor;
  };
}

export function AuditRedact(fields: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata('audit:redact', fields);
    return descriptor;
  };
}

export function AuditCustomField(key: string, value: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    SetMetadata(`audit:custom:${key}`, value);
    return descriptor;
  };
}

export function UseAuditInterceptor(guards?: any[]) {
  return function (target: any) {
    const interceptors = [AuditInterceptor];
    if (guards && guards.length > 0) {
      return UseGuards(...guards, UseInterceptors(...interceptors))(target);
    }
    return UseInterceptors(...interceptors)(target);
  };
}

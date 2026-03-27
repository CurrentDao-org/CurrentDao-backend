import { Request } from 'express';
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
export declare const Audit: (options?: AuditOptions) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditCreate: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditRead: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditUpdate: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditDelete: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditExecute: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditApprove: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditReject: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditCancel: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditLogin: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditLogout: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditAccessDenied: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditSystemError: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditDataExport: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditConfigChange: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditSecurityEvent: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare const AuditComplianceCheck: (options?: Partial<AuditOptions>) => (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => void;
export declare function AuditMethod(options?: AuditOptions): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function AuditClass(options?: {
    action?: AuditAction;
    resource?: AuditResource;
    severity?: AuditSeverity;
    description?: string;
    includeRequestBody?: boolean;
    includeResponseBody?: boolean;
    includeHeaders?: boolean;
    includeMetadata?: boolean;
}): <T extends {
    new (...args: any[]): T;
}>(constructor: T) => T;
export declare function AuditParam(options?: {
    name?: string;
    description?: string;
    redact?: boolean;
}): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function AuditSensitive(options?: {
    fields?: string[];
    redactAll?: boolean;
    classification?: 'public' | 'internal' | 'confidential' | 'restricted';
}): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function AuditSkipIf(condition: (req: Request) => boolean): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function AuditRedact(fields: string[]): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function AuditCustomField(key: string, value: any): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare function UseAuditInterceptor(guards?: any[]): (target: any) => any;

import { PipeTransform, ArgumentMetadata } from '@nestjs/common';
export declare const DEFAULT_SENSITIVE_FIELDS: string[];
export interface TransformPipeConfig {
    exclude?: string[];
    include?: string[];
    recursive?: boolean;
    transform?: (key: string, value: unknown) => unknown;
    maskInsteadOfRemove?: boolean;
    maskChar?: string;
}
export declare class TransformPipe implements PipeTransform {
    private readonly logger;
    private readonly config;
    constructor(config?: TransformPipeConfig);
    transform(value: any, metadata: ArgumentMetadata): any;
    private filterSensitiveData;
    private isSensitiveField;
    private maskValue;
}
export declare const Sensitive: (fieldName: string) => (target: any, key: string) => void;
export declare const createSensitiveDataFilter: (sensitiveFields: string[], maskInsteadOfRemove?: boolean) => (data: any) => any;
export declare const toFilteredResponse: <T extends Record<string, any>>(data: T, options?: {
    exclude?: string[];
    include?: string[];
    maskInsteadOfRemove?: boolean;
}) => T;
export declare const toFilteredArray: <T extends Record<string, any>>(data: T[], options?: {
    exclude?: string[];
    include?: string[];
    maskInsteadOfRemove?: boolean;
}) => T[];
export declare const removeSensitiveFields: <T extends Record<string, any>>(data: T, fieldsToRemove?: string[]) => T;
export declare const maskSensitiveFields: <T extends Record<string, any>>(data: T, fieldsToMask?: string[]) => T;

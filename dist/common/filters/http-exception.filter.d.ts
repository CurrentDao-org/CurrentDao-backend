import { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
export interface HttpExceptionFilterConfig {
    apiVersion?: string;
    includeStackTrace?: boolean;
    customMessages?: Record<string, string>;
}
export declare class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger;
    private readonly config;
    constructor(config?: HttpExceptionFilterConfig);
    catch(exception: unknown, host: ArgumentsHost): void;
    private parseException;
    private parseHttpException;
    private parseValidationErrors;
    private buildErrorResponse;
    private getErrorMessage;
    private generateRequestId;
    private logError;
}
export declare const throwBadRequest: (message: string, details?: {
    field?: string;
    message: string;
}[]) => never;
export declare const throwNotFound: (message?: string) => never;
export declare const throwUnauthorized: (message?: string) => never;
export declare const throwForbidden: (message?: string) => never;
export declare const throwConflict: (message?: string) => never;

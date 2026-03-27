import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PaginationMeta } from '../interfaces/response.interface';
export interface ResponseInterceptorConfig {
    apiVersion?: string;
    includeResponseTime?: boolean;
    includeRequestId?: boolean;
    defaultPageSize?: number;
    maxPageSize?: number;
}
export declare const IS_PAGINATED_KEY = "is_paginated";
export declare const PAGINATION_META_KEY = "pagination_meta";
export declare const SetPaginated: (pagination: PaginationMeta) => (target: any, key: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
export declare class ResponseInterceptor implements NestInterceptor {
    private readonly config;
    private startTime;
    constructor(config?: ResponseInterceptorConfig);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    private formatSuccessResponse;
    private formatPaginatedResponse;
    private isPaginatedResponse;
    private setResponseHeaders;
    private getApiVersion;
    private generateRequestId;
    private getBaseUrl;
}
export declare const createPaginatedResponse: <T>(data: T[], page: number, limit: number, total: number) => {
    data: T[];
    pagination: PaginationMeta;
};
export declare const createSuccessResponse: <T>(data: T) => T;

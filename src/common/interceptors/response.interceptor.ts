/**
 * Response Interceptor
 * 
 * Transforms all API responses to standardized format.
 * Adds metadata, pagination, and version headers.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Response,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request } from 'express';
import {
  ApiResponse,
  PaginatedApiResponse,
  ApiMeta,
  PaginationMeta,
  PaginationLinks,
  DEFAULT_API_VERSION,
} from '../interfaces/response.interface';
import { getPaginationMeta, getPaginationLinks } from '../utils/pagination.util';

/**
 * Configuration for the response interceptor
 */
export interface ResponseInterceptorConfig {
  /** Default API version */
  apiVersion?: string;
  /** Whether to include response time header */
  includeResponseTime?: boolean;
  /** Whether to include request ID */
  includeRequestId?: boolean;
  /** Default page size */
  defaultPageSize?: number;
  /** Max page size */
  maxPageSize?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ResponseInterceptorConfig = {
  apiVersion: '1.0',
  includeResponseTime: true,
  includeRequestId: true,
  defaultPageSize: 10,
  maxPageSize: 100,
};

/**
 * Custom decorator to mark response as paginated
 */
export const IS_PAGINATED_KEY = 'is_paginated';
export const PAGINATION_META_KEY = 'pagination_meta';

export const SetPaginated = (pagination: PaginationMeta) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(IS_PAGINATED_KEY, true, descriptor.value);
    Reflect.defineMetadata(PAGINATION_META_KEY, pagination, descriptor.value);
    return descriptor;
  };
};

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly config: ResponseInterceptorConfig;
  private startTime: number = 0;

  constructor(config?: ResponseInterceptorConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Intercept method to transform responses
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();
    
    this.startTime = Date.now();

    // Get request ID from headers or generate one
    const requestId = request.headers['x-request-id'] as string || 
      this.generateRequestId();

    // Get API version from controller or endpoint
    const apiVersion = this.getApiVersion(context);

    // Set response headers
    this.setResponseHeaders(response, apiVersion, requestId);

    return next.handle().pipe(
      tap(() => {
        // Add response time header after response is sent
        if (this.config.includeResponseTime) {
          const responseTime = Date.now() - this.startTime;
          response.setHeader('X-Response-Time', `${responseTime}ms`);
        }
      }),
      map((data) => {
        // Check if this is a paginated response
        const isPaginated = this.isPaginatedResponse(data);
        
        if (isPaginated) {
          return this.formatPaginatedResponse(
            data,
            request,
            apiVersion,
            requestId,
          );
        }

        return this.formatSuccessResponse(data, apiVersion, requestId);
      }),
    );
  }

  /**
   * Format success response
   */
  private formatSuccessResponse<T>(
    data: T,
    version: string,
    requestId: string,
  ): ApiResponse<T> {
    const meta: ApiMeta = {
      timestamp: new Date().toISOString(),
      version,
      requestId: this.config.includeRequestId ? requestId : undefined,
    };

    return {
      data,
      meta,
    };
  }

  /**
   * Format paginated response
   */
  private formatPaginatedResponse<T>(
    data: {
      data: T[];
      pagination?: PaginationMeta;
    },
    request: Request,
    version: string,
    requestId: string,
  ): PaginatedApiResponse<T> {
    const pagination = data.pagination || {
      page: 1,
      limit: this.config.defaultPageSize || 10,
      total: data.data.length,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    };

    const baseUrl = this.getBaseUrl(request);
    const links = getPaginationLinks(
      baseUrl,
      pagination.page,
      pagination.limit,
      pagination.total,
    );

    const meta: ApiMeta = {
      timestamp: new Date().toISOString(),
      version,
      requestId: this.config.includeRequestId ? requestId : undefined,
    };

    return {
      data: data.data,
      meta,
      links,
      pagination,
    };
  }

  /**
   * Check if response should be paginated
   */
  private isPaginatedResponse(data: any): boolean {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Check if data has pagination structure
    if (Array.isArray(data.data) && data.pagination) {
      return true;
    }

    // Check metadata flag
    return Reflect.has(data, 'isPaginated') && data.isPaginated === true;
  }

  /**
   * Set response headers
   */
  private setResponseHeaders(
    response: Response,
    apiVersion: string,
    requestId: string,
  ): void {
    // Set API version header
    response.setHeader('X-API-Version', apiVersion);
    
    // Set request ID header
    if (this.config.includeRequestId) {
      response.setHeader('X-Request-Id', requestId);
    }

    // Set content type
    response.setHeader('Content-Type', 'application/json');
  }

  /**
   * Get API version from controller or endpoint
   */
  private getApiVersion(context: ExecutionContext): string {
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check handler for version metadata
    const handlerVersion = Reflect.getMetadata('api_version', handler);
    if (handlerVersion) {
      return handlerVersion.version || this.config.apiVersion || DEFAULT_API_VERSION;
    }

    // Check controller for version metadata
    const controllerVersion = Reflect.getMetadata('api_version', controller);
    if (controllerVersion) {
      return controllerVersion.version || this.config.apiVersion || DEFAULT_API_VERSION;
    }

    return this.config.apiVersion || DEFAULT_API_VERSION;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get base URL from request
   */
  private getBaseUrl(request: Request): string {
    const protocol = request.protocol;
    const host = request.get('host') || 'localhost';
    const baseUrl = `${protocol}://${host}${request.path.split('/').slice(0, -1).join('/')}`;
    return baseUrl || request.originalUrl.split('?')[0];
  }
}

/**
 * Helper function to create paginated response data
 */
export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): { data: T[]; pagination: PaginationMeta } => {
  return {
    data,
    pagination: getPaginationMeta(page, limit, total),
  };
};

/**
 * Helper function to create success response data
 */
export const createSuccessResponse = <T>(data: T): T => {
  return data;
};

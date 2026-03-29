/**
 * HTTP Exception Filter
 *
 * Standardizes error responses across the application.
 * Transforms all exceptions to {error, code, details} format.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  ValidationError,
} from '@nestjs/common';
import { Request, Response } from 'express';
import {
  ApiErrorResponse,
  ApiResponseCode,
  ApiMeta,
  DEFAULT_API_VERSION,
} from '../interfaces/response.interface';

/**
 * Configuration for the exception filter
 */
export interface HttpExceptionFilterConfig {
  /** Default API version */
  apiVersion?: string;
  /** Whether to include stack trace in development */
  includeStackTrace?: boolean;
  /** Custom error messages */
  customMessages?: Record<string, string>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: HttpExceptionFilterConfig = {
  apiVersion: '1.0',
  includeStackTrace: false,
  customMessages: {},
};

/**
 * HTTP status to response code mapping
 */
const STATUS_TO_CODE: Record<number, ApiResponseCode> = {
  [HttpStatus.BAD_REQUEST]: ApiResponseCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ApiResponseCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiResponseCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiResponseCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ApiResponseCode.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ApiResponseCode.VALIDATION_ERROR,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiResponseCode.RATE_LIMITED,
};

/**
 * Default error messages
 */
const DEFAULT_ERROR_MESSAGES: Record<ApiResponseCode, string> = {
  [ApiResponseCode.SUCCESS]: 'Success',
  [ApiResponseCode.CREATED]: 'Resource created successfully',
  [ApiResponseCode.UPDATED]: 'Resource updated successfully',
  [ApiResponseCode.DELETED]: 'Resource deleted successfully',
  [ApiResponseCode.BAD_REQUEST]: 'Bad request',
  [ApiResponseCode.UNAUTHORIZED]: 'Unauthorized access',
  [ApiResponseCode.FORBIDDEN]: 'Forbidden',
  [ApiResponseCode.NOT_FOUND]: 'Resource not found',
  [ApiResponseCode.CONFLICT]: 'Resource conflict',
  [ApiResponseCode.INTERNAL_ERROR]: 'Internal server error',
  [ApiResponseCode.VALIDATION_ERROR]: 'Validation error',
  [ApiResponseCode.RATE_LIMITED]: 'Too many requests',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly config: HttpExceptionFilterConfig;

  constructor(config?: HttpExceptionFilterConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Catch and handle all exceptions
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine exception type and status
    const { status, error, code, details } = this.parseException(exception);

    // Get request ID
    const requestId =
      (request.headers['x-request-id'] as string) || this.generateRequestId();

    // Get API version
    const apiVersion = this.config.apiVersion || DEFAULT_API_VERSION;

    // Build error response
    const errorResponse: ApiErrorResponse = this.buildErrorResponse(
      status,
      error,
      code,
      details,
      requestId,
      apiVersion,
      request,
    );

    // Log the error
    this.logError(exception, request, status);

    // Set response headers
    response.setHeader('X-API-Version', apiVersion);
    response.setHeader('X-Request-Id', requestId);

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Parse exception to extract error information
   */
  private parseException(exception: unknown): {
    status: number;
    error: string;
    code: ApiResponseCode;
    details?: { field?: string; message: string }[];
  } {
    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      return this.parseHttpException(exception);
    }

    // Handle validation errors (from class-validator)
    if (
      Array.isArray(exception) &&
      exception.every((e) => e instanceof ValidationError)
    ) {
      return this.parseValidationErrors(exception as ValidationError[]);
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: this.getErrorMessage(ApiResponseCode.INTERNAL_ERROR),
      code: ApiResponseCode.INTERNAL_ERROR,
      details: this.config.includeStackTrace
        ? [
            {
              message:
                exception instanceof Error
                  ? exception.message
                  : 'Unknown error',
            },
          ]
        : undefined,
    };
  }

  /**
   * Parse HTTP exception
   */
  private parseHttpException(exception: HttpException): {
    status: number;
    error: string;
    code: ApiResponseCode;
    details?: { field?: string; message: string }[];
  } {
    const status = exception.getStatus();
    const response = exception.getResponse();

    // Get response code
    const code = STATUS_TO_CODE[status] || ApiResponseCode.BAD_REQUEST;

    // Handle different response types
    if (typeof response === 'string') {
      return {
        status,
        error: response,
        code,
      };
    }

    if (typeof response === 'object') {
      const responseObj = response as Record<string, any>;

      // Handle validation errors
      if (Array.isArray(responseObj.message)) {
        return {
          status,
          error: this.getErrorMessage(code),
          code,
          details: responseObj.message.map((msg: string) => ({ message: msg })),
        };
      }

      // Handle object response
      return {
        status,
        error:
          responseObj.message ||
          responseObj.error ||
          this.getErrorMessage(code),
        code,
        details: responseObj.details,
      };
    }

    return {
      status,
      error: this.getErrorMessage(code),
      code,
    };
  }

  /**
   * Parse validation errors from class-validator
   */
  private parseValidationErrors(errors: ValidationError[]): {
    status: number;
    error: string;
    code: ApiResponseCode;
    details: { field?: string; message: string }[];
  } {
    const details = errors
      .filter((error) => error.constraints)
      .map((error) => ({
        field: error.property,
        message: Object.values(error.constraints || {}).join(', '),
      }));

    return {
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      error: this.getErrorMessage(ApiResponseCode.VALIDATION_ERROR),
      code: ApiResponseCode.VALIDATION_ERROR,
      details,
    };
  }

  /**
   * Build standardized error response
   */
  private buildErrorResponse(
    status: number,
    error: string,
    code: ApiResponseCode,
    details: { field?: string; message: string }[] | undefined,
    requestId: string,
    apiVersion: string,
    request: Request,
  ): ApiErrorResponse {
    const meta: ApiMeta = {
      timestamp: new Date().toISOString(),
      version: apiVersion,
      requestId,
      path: request.url,
      method: request.method,
    };

    const response: ApiErrorResponse = {
      error,
      code,
      meta,
    };

    if (details && details.length > 0) {
      response.details = details;
    }

    // Add context in development
    if (this.config.includeStackTrace) {
      response.context = {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      };
    }

    return response;
  }

  /**
   * Get error message from code or custom messages
   */
  private getErrorMessage(code: ApiResponseCode): string {
    return (
      this.config.customMessages?.[code] ||
      DEFAULT_ERROR_MESSAGES[code] ||
      'An error occurred'
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Log error with appropriate level
   */
  private logError(exception: unknown, request: Request, status: number): void {
    const message = `${request.method} ${request.url} - ${status}`;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status >= HttpStatus.BAD_REQUEST) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }
  }
}

/**
 * Helper function to throw standardized HTTP exceptions
 */
export const throwBadRequest = (
  message: string,
  details?: { field?: string; message: string }[],
) => {
  throw new BadRequestException({
    message,
    code: ApiResponseCode.BAD_REQUEST,
    details,
  });
};

export const throwNotFound = (message: string = 'Resource not found') => {
  throw new NotFoundException({
    message,
    code: ApiResponseCode.NOT_FOUND,
  });
};

export const throwUnauthorized = (message: string = 'Unauthorized access') => {
  throw new UnauthorizedException({
    message,
    code: ApiResponseCode.UNAUTHORIZED,
  });
};

export const throwForbidden = (message: string = 'Forbidden') => {
  throw new ForbiddenException({
    message,
    code: ApiResponseCode.FORBIDDEN,
  });
};

export const throwConflict = (message: string = 'Resource conflict') => {
  throw new ConflictException({
    message,
    code: ApiResponseCode.CONFLICT,
  });
};

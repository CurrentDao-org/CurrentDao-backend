/**
 * Validation Exception Filter
 * 
 * Catches and formats validation exceptions in a user-friendly manner.
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
  ValidationError,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Validation error response interface
 */
interface ValidationErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Catch BadRequestException for validation errors
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Format the error response
    const errorResponse: ValidationErrorResponse = {
      statusCode: status,
      message: this.extractMessage(exceptionResponse),
      error: 'Bad Request',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Add detailed validation errors if available
    if (this.isValidationError(exceptionResponse)) {
      errorResponse.details = this.formatValidationDetails(exceptionResponse);
    }

    this.logger.debug(
      `Validation Error: ${request.method} ${request.url}`,
      JSON.stringify(errorResponse.details || errorResponse.message),
    );

    response.status(status).json(errorResponse);
  }

  /**
   * Extract message from exception response
   */
  private extractMessage(exceptionResponse: any): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (exceptionResponse.message) {
      return exceptionResponse.message;
    }

    if (exceptionResponse.errors) {
      const messages: string[] = [];
      for (const [field, errors] of Object.entries(exceptionResponse.errors)) {
        if (Array.isArray(errors)) {
          messages.push(...errors.map(e => `${field}: ${e}`));
        } else {
          messages.push(`${field}: ${errors}`);
        }
      }
      return messages;
    }

    return 'Validation failed';
  }

  /**
   * Check if exception response contains validation errors
   */
  private isValidationError(exceptionResponse: any): boolean {
    return exceptionResponse.errors !== undefined;
  }

  /**
   * Format validation error details
   */
  private formatValidationDetails(exceptionResponse: any): any {
    if (!exceptionResponse.errors) {
      return undefined;
    }

    const details: any = {};
    
    for (const [field, errors] of Object.entries(exceptionResponse.errors)) {
      details[field] = {
        errors: Array.isArray(errors) ? errors : [errors],
        field: field,
      };
    }

    return details;
  }
}

/**
 * Helper function to create validation error response
 */
export const createValidationErrorResponse = (
  errors: Record<string, string[]>,
  path: string,
): ValidationErrorResponse => {
  const messages: string[] = [];
  
  for (const [field, fieldErrors] of Object.entries(errors)) {
    fieldErrors.forEach(error => {
      messages.push(`${field}: ${error}`);
    });
  }

  return {
    statusCode: 400,
    message: messages,
    error: 'Bad Request',
    timestamp: new Date().toISOString(),
    path: path,
    details: errors,
  };
};

/**
 * Helper function to throw validation error
 */
export const throwValidationError = (
  errors: Record<string, string[]>,
  path: string = 'unknown',
): never => {
  throw new BadRequestException(createValidationErrorResponse(errors, path));
};

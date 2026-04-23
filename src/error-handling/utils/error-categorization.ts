import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCategory {
  TRANSIENT = 'TRANSIENT',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  ACCESS = 'ACCESS',
  EXTERNAL = 'EXTERNAL',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof HttpException) {
    const status = error.getStatus();
    if (status === HttpStatus.BAD_REQUEST || status === HttpStatus.UNPROCESSABLE_ENTITY) {
      return ErrorCategory.VALIDATION;
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return ErrorCategory.AUTH;
    }
    if (status === HttpStatus.FORBIDDEN) {
      return ErrorCategory.ACCESS;
    }
    if (status === HttpStatus.SERVICE_UNAVAILABLE || status === HttpStatus.GATEWAY_TIMEOUT) {
      return ErrorCategory.EXTERNAL;
    }
    if (status >= 500) {
      return ErrorCategory.SYSTEM;
    }
  }

  if (error instanceof Error) {
    const transientKeywords = ['timeout', 'temporarily', 'timed out', 'connection refused', 'ECONNRESET'];
    const lower = error.message.toLowerCase();
    if (transientKeywords.some((keyword) => lower.includes(keyword))) {
      return ErrorCategory.TRANSIENT;
    }
  }

  return ErrorCategory.UNKNOWN;
}

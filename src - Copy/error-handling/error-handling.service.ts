import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { ApiErrorResponse, ApiResponseCode, DEFAULT_API_VERSION } from '../common/interfaces/response.interface';
import { ErrorCategory, categorizeError } from './utils/error-categorization';
import { CircuitBreakerStrategy } from './strategies/circuit-breaker.strategy';
import { RetryStrategy } from './strategies/retry.strategy';
import { FallbackStrategy } from './strategies/fallback.strategy';
import { ErrorMonitorService } from './monitors/error-monitor.service';

@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);

  constructor(
    private readonly circuitBreaker: CircuitBreakerStrategy,
    private readonly retryStrategy: RetryStrategy,
    private readonly fallbackStrategy: FallbackStrategy,
    private readonly errorMonitor: ErrorMonitorService,
  ) {}

  async handleError(exception: unknown, request: Request): Promise<ApiErrorResponse> {
    const category = categorizeError(exception);
    const status = this.getStatusCode(exception);
    const code = this.getResponseCode(category, status);
    const error = this.getClientMessage(exception, category);
    const details = this.getErrorDetails(exception);

    this.errorMonitor.recordError({
      timestamp: new Date().toISOString(),
      status,
      category,
      message: error,
      path: request.url,
      method: request.method,
    });

    this.logger.error(`Error handled (${category}) ${request.method} ${request.url}: ${error}`);

    return {
      error,
      code,
      details: details ? [details] : undefined,
      context: {
        category,
        path: request.url,
        method: request.method,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: DEFAULT_API_VERSION,
        requestId: request.headers['x-request-id'] as string,
      },
    };
  }

  async executeWithResilience<T>(operation: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    await this.circuitBreaker.ensureAvailable();

    try {
      const result = await this.retryStrategy.execute(operation);
      await this.circuitBreaker.recordSuccess();
      return result;
    } catch (error) {
      await this.circuitBreaker.recordFailure();
      this.errorMonitor.recordError({
        timestamp: new Date().toISOString(),
        status: this.getStatusCode(error),
        category: categorizeError(error),
        message: error instanceof Error ? error.message : 'Service failure',
      });

      if (fallback) {
        return this.fallbackStrategy.executeWithFallback(operation, fallback);
      }

      throw error;
    }
  }

  private getStatusCode(exception: unknown): number {
    const anyException = exception as any;
    if (anyException?.status && typeof anyException.status === 'number') {
      return anyException.status;
    }
    return 500;
  }

  private getResponseCode(category: ErrorCategory, status: number): ApiResponseCode {
    if (category === ErrorCategory.VALIDATION) {
      return ApiResponseCode.VALIDATION_ERROR;
    }
    if (category === ErrorCategory.ACCESS || category === ErrorCategory.AUTH) {
      return status === 403 ? ApiResponseCode.FORBIDDEN : ApiResponseCode.UNAUTHORIZED;
    }
    if (status === 404) {
      return ApiResponseCode.NOT_FOUND;
    }
    if (status === 429) {
      return ApiResponseCode.RATE_LIMITED;
    }

    return ApiResponseCode.INTERNAL_ERROR;
  }

  private getClientMessage(exception: unknown, category: ErrorCategory): string {
    if (category === ErrorCategory.VALIDATION) {
      return 'Validation failed for the provided data.';
    }
    if (category === ErrorCategory.TRANSIENT) {
      return 'Temporary service disruption, please retry shortly.';
    }
    if (category === ErrorCategory.EXTERNAL) {
      return 'External partner service is unavailable. Core features remain available.';
    }
    if (exception instanceof Error && exception.message) {
      return exception.message;
    }
    return 'An unexpected error occurred. Our team is investigating.';
  }

  private getErrorDetails(exception: unknown): { field?: string; message: string } | undefined {
    if (exception instanceof Error) {
      return { message: exception.message };
    }
    return undefined;
  }
}

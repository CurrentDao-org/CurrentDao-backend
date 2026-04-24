import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ErrorHandlingService } from './error-handling.service';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { CircuitBreakerStrategy } from './strategies/circuit-breaker.strategy';
import { RetryStrategy } from './strategies/retry.strategy';
import { FallbackStrategy } from './strategies/fallback.strategy';
import { ErrorMonitorService } from './monitors/error-monitor.service';

@Global()
@Module({
  providers: [
    ErrorHandlingService,
    CircuitBreakerStrategy,
    RetryStrategy,
    FallbackStrategy,
    ErrorMonitorService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [
    ErrorHandlingService,
    CircuitBreakerStrategy,
    RetryStrategy,
    FallbackStrategy,
    ErrorMonitorService,
  ],
})
export class ErrorHandlingModule {}

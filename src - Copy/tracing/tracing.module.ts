import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { OpenTelemetryService } from './opentelemetry.service';
import { CustomInstrumentation } from './instrumentation/custom-instrumentation';
import { TraceAnalyticsService } from './analytics/trace-analytics.service';
import { TracingInterceptor } from './interceptors/tracing.interceptor';
import { TracingFilter } from './filters/tracing.filter';

@Global()
@Module({
  providers: [
    OpenTelemetryService,
    CustomInstrumentation,
    TraceAnalyticsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TracingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: TracingFilter,
    },
  ],
  exports: [OpenTelemetryService, CustomInstrumentation, TraceAnalyticsService],
})
export class TracingModule {}

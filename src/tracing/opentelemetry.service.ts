import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { trace, Tracer, Span, SpanOptions, context, propagation } from '@opentelemetry/api';
import sdk from './otel-sdk';

@Injectable()
export class OpenTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenTelemetryService.name);
  private readonly tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('currentdao-api');
    this.logger.log('OpenTelemetry Tracer initialized');
  }

  async onModuleInit() {
    this.logger.log('OpenTelemetry SDK lifecycle managed by Main bootstrap');
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Shutting down OpenTelemetry SDK...');
      await sdk.shutdown();
      this.logger.log('OpenTelemetry SDK shut down');
    } catch (error) {
      this.logger.error('Error shutting down OpenTelemetry SDK', error);
    }
  }

  /**
   * Start a manual span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    return this.tracer.startSpan(name, options);
  }

  /**
   * Execute a callback in the context of a new active span
   */
  async withSpan<T>(name: string, callback: (span: Span) => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span: Span) => {
      try {
        const result = await callback(span);
        return result;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Inject current context into headers for distributed tracing
   */
  injectContext(headers: Record<string, string>) {
    propagation.inject(context.active(), headers);
  }

  /**
   * Extract context from headers
   */
  extractContext(headers: Record<string, string>) {
    return propagation.extract(context.active(), headers);
  }
}

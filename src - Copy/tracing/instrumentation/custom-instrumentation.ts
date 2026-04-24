import { trace, Span, SpanStatusCode, Tracer } from '@opentelemetry/api';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CustomInstrumentation {
  private readonly logger = new Logger(CustomInstrumentation.name);
  private readonly tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('currentdao-custom-instrumentation');
  }

  /**
   * Instrument a function with a custom span
   * @param name Name of the span
   * @param fn Function to execute
   */
  async instrument<T>(name: string, fn: () => Promise<T>): Promise<T> {
    return this.tracer.startActiveSpan(name, async (span: Span) => {
      try {
        this.logger.debug(`Starting span: ${name}`);
        const result = await fn();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.recordException(error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Get the current tracer
   */
  getTracer(): Tracer {
    return this.tracer;
  }
}

/**
 * Decorator to trace a method
 * @param spanName (Optional) name for the span
 */
export function Trace(spanName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const name = spanName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      const tracer = trace.getTracer('currentdao-custom-instrumentation');
      return tracer.startActiveSpan(name, async (span: Span) => {
        try {
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.recordException(error);
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

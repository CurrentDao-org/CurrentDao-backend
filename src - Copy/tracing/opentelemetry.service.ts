import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  trace,
  Tracer,
  Span,
  SpanOptions,
  context,
  propagation,
  SpanStatusCode,
  Attributes,
} from '@opentelemetry/api';
import sdk from './otel-sdk';

@Injectable()
export class OpenTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OpenTelemetryService.name);
  private readonly tracer: Tracer;

  constructor() {
    this.tracer = trace.getTracer('currentdao-api');
    this.logger.log('OpenTelemetry Tracer initialized');
  }

  onModuleInit() {
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
  async withSpan<T>(
    name: string,
    callback: (span: Span) => Promise<T>,
  ): Promise<T> {
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

  /**
   * Get current trace ID
   */
  getCurrentTraceId(): string | undefined {
    const currentSpan = trace.getSpan(context.active());
    if (!currentSpan) return undefined;
    
    const spanContext = currentSpan.spanContext();
    return spanContext?.traceId;
  }

  /**
   * Get current span ID
   */
  getCurrentSpanId(): string | undefined {
    const currentSpan = trace.getSpan(context.active());
    if (!currentSpan) return undefined;
    
    const spanContext = currentSpan.spanContext();
    return spanContext?.spanId;
  }

  /**
   * Set attributes on current span
   */
  setAttributes(span: Span, attributes: Attributes): void {
    span.setAttributes(attributes);
  }

  /**
   * Set status on span
   */
  setStatus(span: Span, code: SpanStatusCode, description?: string): void {
    span.setStatus({ code, message: description });
  }

  /**
   * Record exception on span
   */
  recordException(span: Span, error: Error): void {
    span.recordException(error);
  }

  /**
   * Add event to span
   */
  addEvent(span: Span, name: string, attributes?: Attributes): void {
    span.addEvent(name, attributes);
  }

  /**
   * End span
   */
  endSpan(span: Span): void {
    span.end();
  }

  /**
   * Create a child span
   */
  createChildSpan(parentSpan: Span, name: string, options?: SpanOptions): Span {
    return this.tracer.startSpan(name, {
      ...options,
      parent: parentSpan,
    });
  }

  /**
   * Trace database operation
   */
  async traceDatabaseOperation<T>(
    operation: string,
    query: string,
    callback: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.withSpan(`database.${operation}`, async (span) => {
      this.setAttributes(span, {
        'db.operation': operation,
        'db.query': query,
        'db.system': 'mysql',
      });

      try {
        const result = await callback(span);
        this.setAttributes(span, {
          'db.rows_affected': Array.isArray(result) ? result.length : 1,
        });
        return result;
      } catch (error) {
        this.recordException(span, error as Error);
        this.setStatus(span, SpanStatusCode.ERROR, (error as Error).message);
        throw error;
      }
    });
  }

  /**
   * Trace HTTP request
   */
  async traceHttpRequest<T>(
    method: string,
    url: string,
    callback: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.withSpan(`http.${method.toLowerCase()}`, async (span) => {
      this.setAttributes(span, {
        'http.method': method,
        'http.url': url,
        'http.scheme': 'https',
      });

      try {
        const result = await callback(span);
        return result;
      } catch (error) {
        this.recordException(span, error as Error);
        this.setStatus(span, SpanStatusCode.ERROR, (error as Error).message);
        throw error;
      }
    });
  }

  /**
   * Trace blockchain transaction
   */
  async traceBlockchainTransaction<T>(
    operation: string,
    contractAddress?: string,
    callback: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.withSpan(`blockchain.${operation}`, async (span) => {
      this.setAttributes(span, {
        'blockchain.operation': operation,
        'blockchain.network': 'stellar',
        ...(contractAddress && { 'blockchain.contract_address': contractAddress }),
      });

      try {
        const result = await callback(span);
        return result;
      } catch (error) {
        this.recordException(span, error as Error);
        this.setStatus(span, SpanStatusCode.ERROR, (error as Error).message);
        throw error;
      }
    });
  }

  /**
   * Trace cache operation
   */
  async traceCacheOperation<T>(
    operation: 'get' | 'set' | 'delete' | 'clear',
    key: string,
    callback?: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.withSpan(`cache.${operation}`, async (span) => {
      this.setAttributes(span, {
        'cache.operation': operation,
        'cache.key': key,
        'cache.system': 'redis',
      });

      try {
        if (callback) {
          const result = await callback(span);
          
          if (operation === 'get') {
            this.setAttributes(span, {
              'cache.hit': result !== null && result !== undefined,
            });
          }
          
          return result;
        }
        
        return undefined as T;
      } catch (error) {
        this.recordException(span, error as Error);
        this.setStatus(span, SpanStatusCode.ERROR, (error as Error).message);
        throw error;
      }
    });
  }

  /**
   * Trace message queue operation
   */
  async traceMessageQueue<T>(
    operation: 'publish' | 'consume' | 'ack' | 'nack',
    topic: string,
    callback?: (span: Span) => Promise<T>,
  ): Promise<T> {
    return this.withSpan(`messaging.${operation}`, async (span) => {
      this.setAttributes(span, {
        'messaging.operation': operation,
        'messaging.destination': topic,
        'messaging.system': 'rabbitmq',
      });

      try {
        if (callback) {
          return await callback(span);
        }
        
        return undefined as T;
      } catch (error) {
        this.recordException(span, error as Error);
        this.setStatus(span, SpanStatusCode.ERROR, (error as Error).message);
        throw error;
      }
    });
  }

  /**
   * Get span context information
   */
  getSpanContext(): {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
  } {
    const currentSpan = trace.getSpan(context.active());
    if (!currentSpan) {
      return {};
    }

    const spanContext = currentSpan.spanContext();
    const parentSpan = currentSpan.parentSpanId;

    return {
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      parentSpanId: parentSpan,
    };
  }

  /**
   * Create baggage for context propagation
   */
  setBaggage(key: string, value: string): void {
    const currentContext = context.active();
    // Note: This would require @opentelemetry/api-baggage package
    // For now, we'll use span attributes as an alternative
    const currentSpan = trace.getSpan(currentContext);
    if (currentSpan) {
      currentSpan.setAttribute(`baggage.${key}`, value);
    }
  }

  /**
   * Get baggage value
   */
  getBaggage(key: string): string | undefined {
    const currentSpan = trace.getSpan(context.active());
    if (!currentSpan) return undefined;
    
    // Note: This would require @opentelemetry/api-baggage package
    // For now, we'll use span attributes as an alternative
    return currentSpan.attributes[`baggage.${key}`] as string;
  }

  /**
   * Trace custom business operation
   */
  async traceBusinessOperation<T>(
    domain: string,
    operation: string,
    callback: (span: Span) => Promise<T>,
    attributes?: Attributes,
  ): Promise<T> {
    return this.withSpan(`${domain}.${operation}`, async (span) => {
      this.setAttributes(span, {
        'business.domain': domain,
        'business.operation': operation,
        ...attributes,
      });

      try {
        const result = await callback(span);
        return result;
      } catch (error) {
        this.recordException(span, error as Error);
        this.setStatus(span, SpanStatusCode.ERROR, (error as Error).message);
        throw error;
      }
    });
  }

  /**
   * Get tracing statistics
   */
  getTracingStats(): {
    activeSpans: number;
    currentTraceId?: string;
    currentSpanId?: string;
  } {
    const currentSpan = trace.getSpan(context.active());
    const spanContext = this.getSpanContext();
    
    return {
      activeSpans: currentSpan ? 1 : 0, // Simplified - would need access to span processor
      currentTraceId: spanContext.traceId,
      currentSpanId: spanContext.spanId,
    };
  }
}

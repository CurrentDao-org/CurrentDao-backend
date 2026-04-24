import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

export interface CorrelationContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  parentSpanId?: string;
  traceId?: string;
}

@Injectable()
export class CorrelationService {
  private readonly als = new AsyncLocalStorage<CorrelationContext>();

  constructor() {
    this.als = new AsyncLocalStorage<CorrelationContext>();
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Get current correlation ID from context
   */
  getCorrelationId(): string | undefined {
    const context = this.als.getStore();
    return context?.correlationId;
  }

  /**
   * Get full correlation context
   */
  getContext(): CorrelationContext | undefined {
    return this.als.getStore();
  }

  /**
   * Set correlation context
   */
  setContext(context: Partial<CorrelationContext>): void {
    const currentContext = this.als.getStore() || {};
    const newContext = { ...currentContext, ...context };
    this.als.enterWith(newContext);
  }

  /**
   * Run a function within correlation context
   */
  runWithContext<T>(context: CorrelationContext, fn: () => T): T {
    return this.als.run(context, fn);
  }

  /**
   * Run an async function within correlation context
   */
  async runWithContextAsync<T>(
    context: CorrelationContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    return this.als.run(context, fn);
  }

  /**
   * Create a child context with new correlation ID
   */
  createChildContext(additionalContext?: Partial<CorrelationContext>): CorrelationContext {
    const parentContext = this.als.getStore() || {};
    return {
      correlationId: this.generateCorrelationId(),
      ...parentContext,
      ...additionalContext,
    };
  }

  /**
   * Extract correlation ID from headers
   */
  extractFromHeaders(headers: Record<string, string>): Partial<CorrelationContext> {
    const context: Partial<CorrelationContext> = {};

    if (headers['x-correlation-id']) {
      context.correlationId = headers['x-correlation-id'];
    }
    if (headers['x-request-id']) {
      context.requestId = headers['x-request-id'];
    }
    if (headers['x-user-id']) {
      context.userId = headers['x-user-id'];
    }
    if (headers['x-session-id']) {
      context.sessionId = headers['x-session-id'];
    }
    if (headers['x-trace-id']) {
      context.traceId = headers['x-trace-id'];
    }
    if (headers['x-parent-span-id']) {
      context.parentSpanId = headers['x-parent-span-id'];
    }

    return context;
  }

  /**
   * Inject correlation headers into response
   */
  injectIntoResponse(response: Response, context: CorrelationContext): void {
    if (context.correlationId) {
      response.setHeader('x-correlation-id', context.correlationId);
    }
    if (context.requestId) {
      response.setHeader('x-request-id', context.requestId);
    }
    if (context.traceId) {
      response.setHeader('x-trace-id', context.traceId);
    }
  }

  /**
   * Create correlation headers for outbound requests
   */
  createOutboundHeaders(): Record<string, string> {
    const context = this.getContext() || {};
    const headers: Record<string, string> = {};

    if (context.correlationId) {
      headers['x-correlation-id'] = context.correlationId;
    }
    if (context.requestId) {
      headers['x-request-id'] = context.requestId;
    }
    if (context.userId) {
      headers['x-user-id'] = context.userId;
    }
    if (context.sessionId) {
      headers['x-session-id'] = context.sessionId;
    }
    if (context.traceId) {
      headers['x-trace-id'] = context.traceId;
    }

    return headers;
  }

  /**
   * Initialize correlation context from request
   */
  initializeFromRequest(request: Request): CorrelationContext {
    const headers = request.headers as Record<string, string>;
    let context = this.extractFromHeaders(headers);

    // Generate new correlation ID if not present
    if (!context.correlationId) {
      context.correlationId = this.generateCorrelationId();
    }

    // Generate new request ID if not present
    if (!context.requestId) {
      context.requestId = this.generateCorrelationId();
    }

    // Extract user ID from JWT or session if available
    if (request.user && typeof request.user === 'object' && 'id' in request.user) {
      context.userId = (request.user as any).id;
    }

    // Extract session ID
    if (request.sessionID) {
      context.sessionId = request.sessionID;
    }

    this.setContext(context);
    return context as CorrelationContext;
  }

  /**
   * Get correlation context for logging
   */
  getLogContext(): Record<string, any> {
    const context = this.getContext();
    if (!context) return {};

    return {
      correlationId: context.correlationId,
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      traceId: context.traceId,
      parentSpanId: context.parentSpanId,
    };
  }
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  constructor(private readonly correlationService: CorrelationService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    // Initialize correlation context
    const context = this.correlationService.initializeFromRequest(request);

    // Inject correlation headers into response
    this.correlationService.injectIntoResponse(response, context);

    // Continue with the request
    next();
  }
}

/**
 * Decorator to add correlation context to method calls
 */
export function Correlated(correlationId?: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const correlationService = this.correlationService as CorrelationService;
      
      if (correlationService) {
        const context = correlationService.createChildContext({
          correlationId: correlationId || correlationService.generateCorrelationId(),
        });

        return correlationService.runWithContextAsync(context, () => {
          return originalMethod.apply(this, args);
        });
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Utility function to run code with correlation context
 */
export function withCorrelation<T>(
  correlationService: CorrelationService,
  context: Partial<CorrelationContext>,
  fn: () => T,
): T {
  const fullContext = correlationService.createChildContext(context);
  return correlationService.runWithContext(fullContext, fn);
}

/**
 * Utility function to run async code with correlation context
 */
export async function withCorrelationAsync<T>(
  correlationService: CorrelationService,
  context: Partial<CorrelationContext>,
  fn: () => Promise<T>,
): Promise<T> {
  const fullContext = correlationService.createChildContext(context);
  return correlationService.runWithContextAsync(fullContext, fn);
}

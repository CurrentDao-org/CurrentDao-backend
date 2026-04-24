import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { CorrelationService } from '../utils/correlation-id';
import { LoggingService } from '../logging.service';

export interface RequestMetrics {
  method: string;
  url: string;
  userAgent: string;
  ip: string;
  userId?: string;
  sessionId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  error?: string;
  requestSize?: number;
  responseSize?: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(
    protected readonly correlationService: CorrelationService,
    protected readonly loggingService: LoggingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Initialize metrics
    const metrics: RequestMetrics = {
      method: request.method,
      url: request.url,
      userAgent: request.get('User-Agent') || 'Unknown',
      ip: this.getClientIP(request),
      startTime: Date.now(),
      requestSize: this.getRequestSize(request),
    };

    // Extract user information if available
    if (request.user && typeof request.user === 'object') {
      metrics.userId = (request.user as any).id;
      metrics.sessionId = (request.user as any).sessionId || request.sessionID;
    }

    // Log request start
    this.loggingService.info(
      `HTTP ${request.method} ${request.url} - Request started`,
      {
        method: request.method,
        url: request.url,
        userAgent: metrics.userAgent,
        ip: metrics.ip,
        userId: metrics.userId,
        sessionId: metrics.sessionId,
        requestSize: metrics.requestSize,
        ...this.correlationService.getLogContext(),
      },
      {
        context: {
          service_name: 'currentdao-backend',
          environment: process.env.NODE_ENV || 'development',
          request_id: this.correlationService.getContext()?.requestId,
          user_id: metrics.userId,
          session_id: metrics.sessionId,
          ip_address: metrics.ip,
          user_agent: metrics.userAgent,
          component: 'http-interceptor',
          function: 'intercept',
        },
        tags: ['http-request', request.method, 'request-start'],
        parse_immediately: true,
      },
    );

    return next.handle().pipe(
      tap((data) => {
        // On successful response
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.statusCode = response.statusCode;
        metrics.responseSize = this.getResponseSize(response, data);

        // Log response
        this.loggingService.info(
          `HTTP ${request.method} ${request.url} - ${response.statusCode} (${metrics.duration}ms)`,
          {
            method: request.method,
            url: request.url,
            statusCode: metrics.statusCode,
            duration: metrics.duration,
            userAgent: metrics.userAgent,
            ip: metrics.ip,
            userId: metrics.userId,
            sessionId: metrics.sessionId,
            requestSize: metrics.requestSize,
            responseSize: metrics.responseSize,
            ...this.correlationService.getLogContext(),
          },
          {
            context: {
              service_name: 'currentdao-backend',
              environment: process.env.NODE_ENV || 'development',
              request_id: this.correlationService.getContext()?.requestId,
              user_id: metrics.userId,
              session_id: metrics.sessionId,
              ip_address: metrics.ip,
              user_agent: metrics.userAgent,
              component: 'http-interceptor',
              function: 'intercept',
            },
            tags: ['http-response', request.method, `status-${response.statusCode}`],
            parse_immediately: true,
          },
        );

        // Log performance metrics
        this.loggingService.logPerformanceMetrics(
          {
            response_time: metrics.duration,
            throughput: 1, // One request processed
          },
          {
            service_name: 'currentdao-backend',
            environment: process.env.NODE_ENV || 'development',
            request_id: this.correlationService.getContext()?.requestId,
            user_id: metrics.userId,
            session_id: metrics.sessionId,
            component: 'http-interceptor',
            function: 'intercept',
          },
        );

        // Set response time header
        response.set('x-response-time', metrics.duration.toString());
      }),
      catchError((error) => {
        // On error
        metrics.endTime = Date.now();
        metrics.duration = metrics.endTime - metrics.startTime;
        metrics.statusCode = error.status || 500;
        metrics.error = error.message || 'Unknown error';

        // Log error response
        this.loggingService.error(
          `HTTP ${request.method} ${request.url} - ${metrics.statusCode} (${metrics.duration}ms)`,
          error,
          {
            context: {
              service_name: 'currentdao-backend',
              environment: process.env.NODE_ENV || 'development',
              request_id: this.correlationService.getContext()?.requestId,
              user_id: metrics.userId,
              session_id: metrics.sessionId,
              ip_address: metrics.ip,
              user_agent: metrics.userAgent,
              component: 'http-interceptor',
              function: 'intercept',
              method: request.method,
              url: request.url,
              status_code: metrics.statusCode,
              duration: metrics.duration,
            },
            tags: ['http-error', request.method, `status-${metrics.statusCode}`],
            parse_immediately: true,
            alert_immediately: metrics.statusCode >= 500,
          },
        );

        // Set response time header
        response.set('x-response-time', metrics.duration.toString());

        // Re-throw the error
        throw error;
      }),
    );
  }

  protected getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (request.headers['x-real-ip'] as string) ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }

  protected getRequestSize(request: Request): number {
    try {
      const contentLength = request.headers['content-length'];
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      // If content-length is not available, estimate from request body
      if (request.body) {
        return JSON.stringify(request.body).length;
      }
      
      return 0;
    } catch {
      return 0;
    }
  }

  protected getResponseSize(response: Response, data: any): number {
    try {
      const contentLength = response.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      // If content-length is not available, estimate from response data
      if (data) {
        return JSON.stringify(data).length;
      }
      
      return 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Enhanced logging interceptor with additional security monitoring
 */
@Injectable()
export class SecurityLoggingInterceptor extends LoggingInterceptor {
  constructor(
    correlationService: CorrelationService,
    loggingService: LoggingService,
  ) {
    super(correlationService, loggingService);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Perform security checks before processing
    this.performSecurityChecks(request);

    return super.intercept(context, next);
  }

  private performSecurityChecks(request: Request): void {
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /<script/i,  // XSS
      /union.*select/i,  // SQL injection
      /javascript:/i,  // JavaScript injection
      /data:.*base64/i,  // Base64 injection
    ];

    const url = request.url.toLowerCase();
    const userAgent = (request.get('User-Agent') || '').toLowerCase();
    
    // Check for suspicious patterns in URL
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        this.loggingService.logSecurityEvent(
          'Suspicious URL pattern detected',
          'medium',
          {
            url: request.url,
            pattern: pattern.source,
            ip: this.getClientIP(request),
            userAgent: request.get('User-Agent'),
          },
          {
            service_name: 'currentdao-backend',
            environment: process.env.NODE_ENV || 'development',
            request_id: this.correlationService.getContext()?.requestId,
            ip_address: this.getClientIP(request),
            user_agent: request.get('User-Agent'),
            component: 'security-interceptor',
            function: 'performSecurityChecks',
          },
        );
        break;
      }
    }

    // Check for suspicious user agents
    const suspiciousUserAgents = [
      /bot/i,
      /crawler/i,
      /scanner/i,
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
    ];

    for (const pattern of suspiciousUserAgents) {
      if (pattern.test(userAgent)) {
        this.loggingService.logSecurityEvent(
          'Suspicious user agent detected',
          'low',
          {
            userAgent: request.get('User-Agent'),
            ip: this.getClientIP(request),
            url: request.url,
          },
          {
            service_name: 'currentdao-backend',
            environment: process.env.NODE_ENV || 'development',
            request_id: this.correlationService.getContext()?.requestId,
            ip_address: this.getClientIP(request),
            user_agent: request.get('User-Agent'),
            component: 'security-interceptor',
            function: 'performSecurityChecks',
          },
        );
        break;
      }
    }
  }
}

/**
 * Performance monitoring interceptor
 */
@Injectable()
export class PerformanceLoggingInterceptor extends LoggingInterceptor {
  private readonly slowRequestThreshold = 1000; // 1 second
  private readonly verySlowRequestThreshold = 5000; // 5 seconds

  constructor(
    correlationService: CorrelationService,
    loggingService: LoggingService,
  ) {
    super(correlationService, loggingService);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    return super.intercept(context, next).pipe(
      tap((data) => {
        const response = context.switchToHttp().getResponse<Response>();
        const duration = response.get('x-response-time');
        
        if (duration) {
          const durationMs = parseInt(duration, 10);
          
          if (durationMs > this.verySlowRequestThreshold) {
            this.loggingService.logSecurityEvent(
              'Very slow request detected',
              'medium',
              {
                method: request.method,
                url: request.url,
                duration: durationMs,
                threshold: this.verySlowRequestThreshold,
              },
              {
                service_name: 'currentdao-backend',
                environment: process.env.NODE_ENV || 'development',
                request_id: this.correlationService.getContext()?.requestId,
                component: 'performance-interceptor',
                function: 'intercept',
              },
            );
          } else if (durationMs > this.slowRequestThreshold) {
            this.loggingService.info(
              `Slow request detected: ${request.method} ${request.url} (${durationMs}ms)`,
              {
                method: request.method,
                url: request.url,
                duration: durationMs,
                threshold: this.slowRequestThreshold,
                ...this.correlationService.getLogContext(),
              },
              {
                context: {
                  service_name: 'currentdao-backend',
                  environment: process.env.NODE_ENV || 'development',
                  request_id: this.correlationService.getContext()?.requestId,
                  component: 'performance-interceptor',
                  function: 'intercept',
                },
                tags: ['performance', 'slow-request'],
                parse_immediately: true,
              },
            );
          }
        }
      }),
    );
  }
}

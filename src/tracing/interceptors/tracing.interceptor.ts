import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { trace, Span, SpanStatusCode } from '@opentelemetry/api';
import { TraceAnalyticsService } from '../analytics/trace-analytics.service';

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TracingInterceptor.name);

  constructor(private readonly analytics: TraceAnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    const tracer = trace.getTracer('currentdao-http-interceptor');
    return new Observable((observer) => {
      tracer.startActiveSpan(`${method} ${url}`, async (span: Span) => {
        span.setAttributes({
          'http.method': method,
          'http.url': url,
          'http.client_ip': request.ip,
          'http.user_agent': request.get('user-agent') || 'Unknown',
        });

        const subscription = next.handle().pipe(
          tap({
            next: (data) => {
              const response = context.switchToHttp().getResponse();
              const duration = Date.now() - startTime;
              const statusCode = response.statusCode;

              span.setAttribute('http.status_code', statusCode);
              span.setStatus({ code: SpanStatusCode.OK });
              
              this.analytics.trackRequest({
                method,
                path: url,
                status: statusCode,
              }, duration);

              this.logger.debug(`${method} ${url} completed in ${duration}ms`);
            },
            error: (error) => {
              const duration = Date.now() - startTime;
              const statusCode = error.status || 500;
              
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error.message,
              });
              span.setAttribute('http.status_code', statusCode);
              span.recordException(error);

              this.analytics.trackRequest({
                method,
                path: url,
                status: statusCode,
              }, duration);

              this.logger.error(`${method} ${url} failed with error: ${error.message}`);
            },
            complete: () => {
              span.end();
            },
          }),
        ).subscribe(observer);

        return () => {
          subscription.unsubscribe();
          span.end();
        };
      });
    });
  }
}

import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TraceAnalyticsService } from '../analytics/trace-analytics.service';
export declare class TracingInterceptor implements NestInterceptor {
    private readonly analytics;
    private readonly logger;
    constructor(analytics: TraceAnalyticsService);
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}

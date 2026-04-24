import { TracingInterceptor } from './tracing.interceptor';
import { TraceAnalyticsService } from '../analytics/trace-analytics.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TracingInterceptor', () => {
  let interceptor: TracingInterceptor;
  let analyticsService: Partial<TraceAnalyticsService>;

  beforeEach(() => {
    analyticsService = {
      trackRequest: jest.fn(),
    };
    interceptor = new TracingInterceptor(
      analyticsService as TraceAnalyticsService,
    );
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should intercept and track requests', (done) => {
    const mockRequest = {
      method: 'GET',
      url: '/test',
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
    };
    const mockResponse = { statusCode: 200 };
    const mockContext: Partial<ExecutionContext> = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    const mockHandler: Partial<CallHandler> = {
      handle: () => of('test-data'),
    };

    interceptor
      .intercept(mockContext as ExecutionContext, mockHandler as CallHandler)
      .subscribe({
        next: () => {
          expect(analyticsService.trackRequest).toHaveBeenCalled();
          done();
        },
        error: (err) => done(err),
      });
  });
});

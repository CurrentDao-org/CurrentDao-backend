import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, metrics, Meter } from '@opentelemetry/api';

@Injectable()
export class TraceAnalyticsService {
  private readonly logger = new Logger(TraceAnalyticsService.name);
  private readonly meter: Meter;
  private readonly requestCounter: Counter;
  private readonly requestDuration: Histogram;
  private readonly errorCounter: Counter;

  constructor() {
    this.meter = metrics.getMeter('currentdao-analytics');

    this.requestCounter = this.meter.createCounter('http_requests_total', {
      description: 'Total HTTP requests',
    });

    this.requestDuration = this.meter.createHistogram(
      'http_request_duration_seconds',
      {
        description: 'HTTP request duration in seconds',
      },
    );

    this.errorCounter = this.meter.createCounter('http_errors_total', {
      description: 'Total HTTP errors',
    });
  }

  /**
   * Track a request's performance and outcome
   */
  trackRequest(
    labels: { method: string; path: string; status: number },
    durationMs: number,
  ) {
    this.requestCounter.add(1, labels);
    this.requestDuration.record(durationMs / 1000, labels);

    if (labels.status >= 400) {
      this.errorCounter.add(1, labels);
    }

    if (durationMs > 500) {
      this.logger.warn(
        `Performance bottleneck detected: ${labels.method} ${labels.path} took ${durationMs}ms`,
      );
    }
  }

  /**
   * Get metrics for a quick health check
   */
  getHealthReport() {
    this.logger.log('Generating trace analytics health report...');
    return {
      status: 'Collecting metrics',
      active_meter: 'currentdao-analytics',
    };
  }
}

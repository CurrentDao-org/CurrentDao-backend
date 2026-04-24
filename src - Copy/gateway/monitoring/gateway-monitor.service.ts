import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Registry } from 'prom-client';

@Injectable()
export class GatewayMonitorService {
  private readonly logger = new Logger(GatewayMonitorService.name);
  private readonly registry: Registry;
  private readonly requestCounter: Counter<string>;
  private readonly responseTimeHistogram: Histogram<string>;

  constructor() {
    this.registry = new Registry();
    this.requestCounter = new Counter({
      name: 'api_gateway_requests_total',
      help: 'Total number of requests handled by the API gateway',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });
    this.responseTimeHistogram = new Histogram({
      name: 'api_gateway_response_time_ms',
      help: 'Response time for API gateway requests in milliseconds',
      labelNames: ['method', 'path'],
      buckets: [10, 50, 100, 200, 500, 1000],
      registers: [this.registry],
    });
  }

  /**
   * Logs a request and updates metrics.
   * @param method The HTTP method of the request.
   * @param path The request path.
   * @param status The response status code.
   * @param duration The duration of the request in milliseconds.
   */
  logRequest(
    method: string,
    path: string,
    status: number,
    duration: number,
  ): void {
    this.logger.log(
      `[${method}] ${path} - Status: ${status} - Duration: ${duration}ms`,
    );
    this.requestCounter.inc({ method, path, status: status.toString() });
    this.responseTimeHistogram.observe({ method, path }, duration);
  }

  /**
   * Gets the current Prometheus metrics for the gateway.
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

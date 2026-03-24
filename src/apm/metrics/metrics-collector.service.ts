import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { metrics, Meter, Counter, UpDownCounter, Histogram, ObservableGauge } from '@opentelemetry/api';
import * as os from 'os';

@Injectable()
export class MetricsCollectorService implements OnModuleInit {
  private readonly logger = new Logger(MetricsCollectorService.name);
  private readonly meter: Meter;
  
  // Custom metrics
  private readonly cpuUsageGauge: ObservableGauge;
  private readonly memoryUsageGauge: ObservableGauge;
  private readonly activeHandlesGauge: ObservableGauge;
  private readonly eventLoopDelayGauge: ObservableGauge;
  private readonly totalRequests: Counter;

  constructor() {
    this.meter = metrics.getMeter('currentdao-apm');

    // Collect standard system metrics via OTel Gauges
    this.cpuUsageGauge = this.meter.createObservableGauge('system_cpu_usage', {
      description: 'System CPU usage percentage',
    });

    this.memoryUsageGauge = this.meter.createObservableGauge('system_memory_usage', {
      description: 'System memory usage in bytes',
    });

    this.activeHandlesGauge = this.meter.createObservableGauge('nodejs_active_handles', {
      description: 'Number of active handles in the event loop',
    });

    this.eventLoopDelayGauge = this.meter.createObservableGauge('nodejs_event_loop_delay_ms', {
      description: 'Current event loop delay in milliseconds',
    });

    this.totalRequests = this.meter.createCounter('apm_requests_total', {
      description: 'Total business requests tracked by APM',
    });
  }

  onModuleInit() {
    this.startCollection();
  }

  private startCollection() {
    this.logger.log('Starting APM metrics collection...');

    this.cpuUsageGauge.addCallback((result) => {
      const cpus = os.cpus();
      const avgLoad = os.loadavg()[0]; // 1-minute load average
      result.observe(avgLoad / cpus.length);
    });

    this.memoryUsageGauge.addCallback((result) => {
      result.observe(process.memoryUsage().heapUsed);
    });

    this.activeHandlesGauge.addCallback((result) => {
      // @ts-ignore - access to internal process state
      result.observe(process._getActiveHandles ? process._getActiveHandles().length : 0);
    });

    // Sample event loop delay
    let lastTime = Date.now();
    setInterval(() => {
      const now = Date.now();
      const delay = now - lastTime - 100; // Expected 100ms interval
      this.eventLoopDelayGauge.addCallback((result) => result.observe(delay > 0 ? delay : 0));
      lastTime = now;
    }, 100);
  }

  trackBusinessMetric(name: string, value: number = 1) {
    this.totalRequests.add(value, { metric_name: name });
  }
}

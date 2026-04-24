import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';
import * as pidusage from 'pidusage';
import { LoggingService } from '../logging.service';
import { CorrelationService } from '../utils/correlation-id';

export interface PerformanceMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
    cores: number;
  };
  memory: {
    used: number;
    free: number;
    total: number;
    usage: number;
    heapUsed: number;
    heapTotal: number;
    heapUsage: number;
  };
  process: {
    pid: number;
    uptime: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  network?: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  disk?: {
    read: number;
    write: number;
    readOps: number;
    writeOps: number;
  };
}

export interface PerformanceThresholds {
  cpu: {
    warning: number;
    critical: number;
  };
  memory: {
    warning: number;
    critical: number;
  };
  responseTime: {
    warning: number;
    critical: number;
  };
  errorRate: {
    warning: number;
    critical: number;
  };
}

export interface PerformanceAlert {
  timestamp: Date;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  message: string;
  context?: any;
}

@Injectable()
export class PerformanceMonitor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PerformanceMonitor.name);
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory = 1000;
  private monitoringInterval: NodeJS.Timeout;
  private readonly thresholds: PerformanceThresholds;
  private readonly monitoringIntervalMs: number;
  private lastNetworkStats?: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly loggingService: LoggingService,
    private readonly correlationService: CorrelationService,
  ) {
    this.monitoringIntervalMs = this.configService.get<number>(
      'PERFORMANCE_MONITORING_INTERVAL',
      30000, // 30 seconds
    );

    this.thresholds = {
      cpu: {
        warning: this.configService.get<number>('CPU_WARNING_THRESHOLD', 70),
        critical: this.configService.get<number>('CPU_CRITICAL_THRESHOLD', 90),
      },
      memory: {
        warning: this.configService.get<number>('MEMORY_WARNING_THRESHOLD', 80),
        critical: this.configService.get<number>('MEMORY_CRITICAL_THRESHOLD', 95),
      },
      responseTime: {
        warning: this.configService.get<number>('RESPONSE_TIME_WARNING', 1000),
        critical: this.configService.get<number>('RESPONSE_TIME_CRITICAL', 5000),
      },
      errorRate: {
        warning: this.configService.get<number>('ERROR_RATE_WARNING', 5),
        critical: this.configService.get<number>('ERROR_RATE_CRITICAL', 10),
      },
    };
  }

  async onModuleInit() {
    this.logger.log('Initializing performance monitor');
    this.startMonitoring();
    this.logger.log('Performance monitor initialized');
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down performance monitor');
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.logger.log('Performance monitor shutdown complete');
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        this.logger.error('Failed to collect performance metrics', error);
      }
    }, this.monitoringIntervalMs);
  }

  private async collectMetrics(): Promise<void> {
    const metrics: PerformanceMetrics = {
      timestamp: new Date(),
      cpu: this.collectCPUMetrics(),
      memory: this.collectMemoryMetrics(),
      process: await this.collectProcessMetrics(),
      network: this.collectNetworkMetrics(),
      disk: this.collectDiskMetrics(),
    };

    // Store metrics
    this.addMetrics(metrics);

    // Check thresholds and alert if necessary
    await this.checkThresholds(metrics);

    // Log metrics
    await this.logMetrics(metrics);
  }

  private collectCPUMetrics() {
    return {
      usage: this.getCPUUsage(),
      loadAverage: os.loadavg(),
      cores: os.cpus().length,
    };
  }

  private collectMemoryMetrics() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsage = (usedMem / totalMem) * 100;

    const memUsageProcess = process.memoryUsage();
    const heapUsage = (memUsageProcess.heapUsed / memUsageProcess.heapTotal) * 100;

    return {
      used: usedMem,
      free: freeMem,
      total: totalMem,
      usage: memUsage,
      heapUsed: memUsageProcess.heapUsed,
      heapTotal: memUsageProcess.heapTotal,
      heapUsage: heapUsage,
    };
  }

  private async collectProcessMetrics() {
    try {
      const stats = await pidusage(process.pid);
      return {
        pid: process.pid,
        uptime: process.uptime(),
        cpuUsage: stats.cpu,
        memoryUsage: stats.memory,
      };
    } catch (error) {
      this.logger.error('Failed to collect process metrics', error);
      return {
        pid: process.pid,
        uptime: process.uptime(),
        cpuUsage: 0,
        memoryUsage: 0,
      };
    }
  }

  private collectNetworkMetrics() {
    try {
      // This would require additional system-specific libraries
      // For now, return placeholder values
      return {
        bytesIn: 0,
        bytesOut: 0,
        packetsIn: 0,
        packetsOut: 0,
      };
    } catch (error) {
      this.logger.error('Failed to collect network metrics', error);
      return undefined;
    }
  }

  private collectDiskMetrics() {
    try {
      // This would require additional system-specific libraries
      // For now, return placeholder values
      return {
        read: 0,
        write: 0,
        readOps: 0,
        writeOps: 0,
      };
    } catch (error) {
      this.logger.error('Failed to collect disk metrics', error);
      return undefined;
    }
  }

  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (totalIdle / totalTick) * 100;
  }

  private addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);

    // Keep only the last N metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }
  }

  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    const alerts: PerformanceAlert[] = [];

    // Check CPU usage
    if (metrics.cpu.usage > this.thresholds.cpu.critical) {
      alerts.push({
        timestamp: metrics.timestamp,
        metric: 'cpu.usage',
        value: metrics.cpu.usage,
        threshold: this.thresholds.cpu.critical,
        severity: 'critical',
        message: `CPU usage is critically high: ${metrics.cpu.usage.toFixed(2)}%`,
      });
    } else if (metrics.cpu.usage > this.thresholds.cpu.warning) {
      alerts.push({
        timestamp: metrics.timestamp,
        metric: 'cpu.usage',
        value: metrics.cpu.usage,
        threshold: this.thresholds.cpu.warning,
        severity: 'warning',
        message: `CPU usage is high: ${metrics.cpu.usage.toFixed(2)}%`,
      });
    }

    // Check memory usage
    if (metrics.memory.usage > this.thresholds.memory.critical) {
      alerts.push({
        timestamp: metrics.timestamp,
        metric: 'memory.usage',
        value: metrics.memory.usage,
        threshold: this.thresholds.memory.critical,
        severity: 'critical',
        message: `Memory usage is critically high: ${metrics.memory.usage.toFixed(2)}%`,
      });
    } else if (metrics.memory.usage > this.thresholds.memory.warning) {
      alerts.push({
        timestamp: metrics.timestamp,
        metric: 'memory.usage',
        value: metrics.memory.usage,
        threshold: this.thresholds.memory.warning,
        severity: 'warning',
        message: `Memory usage is high: ${metrics.memory.usage.toFixed(2)}%`,
      });
    }

    // Check heap memory usage
    if (metrics.memory.heapUsage > this.thresholds.memory.critical) {
      alerts.push({
        timestamp: metrics.timestamp,
        metric: 'memory.heapUsage',
        value: metrics.memory.heapUsage,
        threshold: this.thresholds.memory.critical,
        severity: 'critical',
        message: `Heap memory usage is critically high: ${metrics.memory.heapUsage.toFixed(2)}%`,
      });
    } else if (metrics.memory.heapUsage > this.thresholds.memory.warning) {
      alerts.push({
        timestamp: metrics.timestamp,
        metric: 'memory.heapUsage',
        value: metrics.memory.heapUsage,
        threshold: this.thresholds.memory.warning,
        severity: 'warning',
        message: `Heap memory usage is high: ${metrics.memory.heapUsage.toFixed(2)}%`,
      });
    }

    // Send alerts if any
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }

  private async sendAlert(alert: PerformanceAlert): Promise<void> {
    await this.loggingService.logSecurityEvent(
      `Performance alert: ${alert.message}`,
      alert.severity === 'critical' ? 'critical' : 'medium',
      {
        metric: alert.metric,
        value: alert.value,
        threshold: alert.threshold,
        severity: alert.severity,
        timestamp: alert.timestamp.toISOString(),
      },
      {
        service_name: 'currentdao-backend',
        environment: process.env.NODE_ENV || 'development',
        component: 'performance-monitor',
        function: 'sendAlert',
        ...this.correlationService.getLogContext(),
      },
    );
  }

  private async logMetrics(metrics: PerformanceMetrics): Promise<void> {
    await this.loggingService.logPerformanceMetrics(
      {
        cpu_usage: metrics.cpu.usage,
        memory_usage: metrics.memory.usage,
        heap_usage: metrics.memory.heapUsage,
        process_cpu: metrics.process.cpuUsage,
        process_memory: metrics.process.memoryUsage,
        uptime: metrics.process.uptime,
      },
      {
        service_name: 'currentdao-backend',
        environment: process.env.NODE_ENV || 'development',
        component: 'performance-monitor',
        function: 'logMetrics',
        ...this.correlationService.getLogContext(),
      },
    );
  }

  // Public API methods
  getMetrics(limit?: number): PerformanceMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  getLatestMetrics(): PerformanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getMetricsAverage(timeRangeMs: number): Partial<PerformanceMetrics> | undefined {
    const cutoffTime = new Date(Date.now() - timeRangeMs);
    const recentMetrics = this.metrics.filter(m => m.timestamp >= cutoffTime);

    if (recentMetrics.length === 0) return undefined;

    const avg = recentMetrics.reduce(
      (acc, metric) => ({
        cpu: {
          usage: acc.cpu.usage + metric.cpu.usage,
          loadAverage: acc.cpu.loadAverage.map((val, idx) => val + metric.cpu.loadAverage[idx]),
          cores: metric.cpu.cores,
        },
        memory: {
          used: acc.memory.used + metric.memory.used,
          free: acc.memory.free + metric.memory.free,
          total: metric.memory.total,
          usage: acc.memory.usage + metric.memory.usage,
          heapUsed: acc.memory.heapUsed + metric.memory.heapUsed,
          heapTotal: metric.memory.heapTotal,
          heapUsage: acc.memory.heapUsage + metric.memory.heapUsage,
        },
        process: {
          pid: metric.process.pid,
          uptime: acc.process.uptime + metric.process.uptime,
          cpuUsage: acc.process.cpuUsage + metric.process.cpuUsage,
          memoryUsage: acc.process.memoryUsage + metric.process.memoryUsage,
        },
      }),
      {
        cpu: { usage: 0, loadAverage: [0, 0, 0], cores: 0 },
        memory: { used: 0, free: 0, total: 0, usage: 0, heapUsed: 0, heapTotal: 0, heapUsage: 0 },
        process: { pid: 0, uptime: 0, cpuUsage: 0, memoryUsage: 0 },
      },
    );

    const count = recentMetrics.length;
    return {
      cpu: {
        usage: avg.cpu.usage / count,
        loadAverage: avg.cpu.loadAverage.map(val => val / count),
        cores: avg.cpu.cores,
      },
      memory: {
        used: avg.memory.used / count,
        free: avg.memory.free / count,
        total: avg.memory.total,
        usage: avg.memory.usage / count,
        heapUsed: avg.memory.heapUsed / count,
        heapTotal: avg.memory.heapTotal,
        heapUsage: avg.memory.heapUsage / count,
      },
      process: {
        pid: avg.process.pid,
        uptime: avg.process.uptime / count,
        cpuUsage: avg.process.cpuUsage / count,
        memoryUsage: avg.process.memoryUsage / count,
      },
    };
  }

  getThresholds(): PerformanceThresholds {
    return { ...this.thresholds };
  }

  updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    Object.assign(this.thresholds, newThresholds);
    this.logger.log('Performance thresholds updated', newThresholds);
  }

  async forceMetricsCollection(): Promise<PerformanceMetrics> {
    await this.collectMetrics();
    return this.getLatestMetrics()!;
  }

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    metrics?: PerformanceMetrics;
  } {
    const latestMetrics = this.getLatestMetrics();
    if (!latestMetrics) {
      return { healthy: false, issues: ['No metrics available'] };
    }

    const issues: string[] = [];

    if (latestMetrics.cpu.usage > this.thresholds.cpu.critical) {
      issues.push(`CPU usage is critically high: ${latestMetrics.cpu.usage.toFixed(2)}%`);
    }

    if (latestMetrics.memory.usage > this.thresholds.memory.critical) {
      issues.push(`Memory usage is critically high: ${latestMetrics.memory.usage.toFixed(2)}%`);
    }

    if (latestMetrics.memory.heapUsage > this.thresholds.memory.critical) {
      issues.push(`Heap memory usage is critically high: ${latestMetrics.memory.heapUsage.toFixed(2)}%`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics: latestMetrics,
    };
  }
}

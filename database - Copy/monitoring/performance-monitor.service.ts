import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

interface QueryAlert {
  query: string;
  executionTime: number;
  threshold: number;
  timestamp: Date;
}

interface PerformanceSnapshot {
  timestamp: Date;
  activeConnections: number;
  slowQueryCount: number;
  avgQueryTime: number;
  alertCount: number;
}

@Injectable()
export class PerformanceMonitorService implements OnModuleInit {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly SLOW_QUERY_THRESHOLD_MS = 1000;
  private readonly alerts: QueryAlert[] = [];
  private readonly snapshots: PerformanceSnapshot[] = [];
  private queryTimes: number[] = [];
  private monitoringInterval: NodeJS.Timeout;

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
  ) {}

  async onModuleInit() {
    this.startMonitoring();
  }

  private startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      await this.captureSnapshot();
    }, 60000); // Every minute
    this.logger.log('Performance monitoring started');
  }

  recordQueryExecution(query: string, executionTime: number): void {
    this.queryTimes.push(executionTime);
    if (this.queryTimes.length > 1000) this.queryTimes.shift(); // rolling window

    if (executionTime > this.SLOW_QUERY_THRESHOLD_MS) {
      this.raiseAlert(query, executionTime);
    }
  }

  private raiseAlert(query: string, executionTime: number): void {
    const alert: QueryAlert = {
      query,
      executionTime,
      threshold: this.SLOW_QUERY_THRESHOLD_MS,
      timestamp: new Date(),
    };
    this.alerts.push(alert);
    this.logger.warn(
      `Slow query detected: ${executionTime}ms (threshold: ${this.SLOW_QUERY_THRESHOLD_MS}ms)`,
    );
  }

  private async captureSnapshot(): Promise<void> {
    const avgQueryTime =
      this.queryTimes.length > 0
        ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
        : 0;

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      activeConnections: await this.getActiveConnectionCount(),
      slowQueryCount: this.alerts.length,
      avgQueryTime,
      alertCount: this.alerts.filter(
        a => a.timestamp > new Date(Date.now() - 60000),
      ).length,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > 1440) this.snapshots.shift(); // Keep 24h of minute snapshots

    this.logger.debug(`Snapshot captured: avgQueryTime=${avgQueryTime.toFixed(2)}ms`);
  }

  private async getActiveConnectionCount(): Promise<number> {
    try {
      const result = await this.connection.query(
        `SHOW STATUS LIKE 'Threads_connected'`,
      );
      return parseInt(result[0]?.Value || '0', 10);
    } catch {
      return 0;
    }
  }

  getAlerts(since?: Date): QueryAlert[] {
    if (!since) return this.alerts;
    return this.alerts.filter(a => a.timestamp >= since);
  }

  getSnapshots(limit = 60): PerformanceSnapshot[] {
    return this.snapshots.slice(-limit);
  }

  getAverageQueryTime(): number {
    if (!this.queryTimes.length) return 0;
    return this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  async getDatabaseHealthReport(): Promise<Record<string, any>> {
    return {
      avgQueryTime: this.getAverageQueryTime(),
      totalAlerts: this.alerts.length,
      recentAlerts: this.getAlerts(new Date(Date.now() - 3600000)).length,
      activeConnections: await this.getActiveConnectionCount(),
      monitoringActive: !!this.monitoringInterval,
    };
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { MetricsCollectorService } from '../metrics/metrics-collector.service';
import * as os from 'os';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly metrics: MetricsCollectorService) {}

  /**
   * Return real-time monitoring dashboard data
   */
  getDashboardState() {
    this.logger.debug('Refreshing monitoring dashboard state...');

    const memUsage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        uptime: os.uptime(),
        loadavg: os.loadavg(),
        total_memory: os.totalmem(),
        free_memory: os.freemem(),
        cpus: os.cpus().length,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          rss: memUsage.rss,
          heapTotal: memUsage.heapTotal,
          heapUsed: memUsage.heapUsed,
          external: memUsage.external,
          arrayBuffers: memUsage.arrayBuffers,
        },
        cpu: process.cpuUsage(),
      },
      health: {
        status: 'UP',
        checks: 2,
        errors_last_hour: 0,
      },
    };
  }

  /**
   * Refresh metrics every 5 seconds for UI push (simulated)
   */
  async streamDashboardUpdates(callback: (data: any) => void) {
    setInterval(() => {
      callback(this.getDashboardState());
    }, 5000); // 5 seconds per requirement
  }
}

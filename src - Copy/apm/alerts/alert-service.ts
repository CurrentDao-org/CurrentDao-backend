import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class AlertService implements OnModuleInit {
  private readonly logger = new Logger(AlertService.name);
  private readonly CPU_THRESHOLD = 80; // 80% load
  private readonly MEMORY_THRESHOLD = 0.9; // 90% usage

  onModuleInit() {
    this.startAlertMonitoring();
  }

  private startAlertMonitoring() {
    this.logger.log('Starting Alert System monitoring...');

    // Check system status every 15 seconds
    setInterval(() => {
      this.checkSystemAlerts();
    }, 15000);
  }

  private checkSystemAlerts() {
    // Check CPU Usage
    const cpus = os.cpus().length;
    const loadAvg = os.loadavg()[0]; // 1-minute load
    const cpuUsage = (loadAvg / cpus) * 100;

    if (cpuUsage > this.CPU_THRESHOLD) {
      this.emitAlert(
        'CRITICAL',
        `High CPU load detected: ${cpuUsage.toFixed(2)}% on ${cpus} cores.`,
      );
    }

    // Check Memory Usage
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;
    const heapTotal = memUsage.heapTotal;
    const ratio = heapUsed / heapTotal;

    if (ratio > this.MEMORY_THRESHOLD) {
      this.emitAlert(
        'WARNING',
        `Critical Heap Memory usage: ${(ratio * 100).toFixed(2)}% (${(heapUsed / 1024 / 1024).toFixed(2)}MB used out of ${(heapTotal / 1024 / 1024).toFixed(2)}MB)`,
      );
    }

    this.logger.debug(
      `Alert monitoring check complete. System Status: Healthy - CPU: ${cpuUsage.toFixed(1)}%, Mem: ${(ratio * 100).toFixed(1)}%`,
    );
  }

  /**
   * Send an alert notification
   */
  emitAlert(level: 'INFO' | 'WARNING' | 'CRITICAL', message: string) {
    const timestamp = new Date().toISOString();
    const alertMessage = `[APM ALERT] ${level.toUpperCase()} - ${timestamp}: ${message}`;

    // Alert via Logger. In production, this would trigger email / PagerDuty / Webhook
    this.logger.error(alertMessage);

    // Potential Slack or Email integration
    this.triggerNotifier(level, message);
  }

  private triggerNotifier(level: string, message: string) {
    // Async notifier
    setImmediate(() => {
      this.logger.log(`Notifier triggered for ${level} alert.`);
    });
  }
}

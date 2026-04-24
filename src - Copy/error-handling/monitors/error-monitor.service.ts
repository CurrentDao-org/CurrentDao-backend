import { Injectable, Logger } from '@nestjs/common';
import { ErrorCategory } from '../utils/error-categorization';

export interface ErrorEvent {
  timestamp: string;
  status: number;
  category: ErrorCategory;
  message: string;
  path?: string;
  method?: string;
}

@Injectable()
export class ErrorMonitorService {
  private readonly logger = new Logger(ErrorMonitorService.name);
  private readonly events: ErrorEvent[] = [];
  private readonly alertThreshold = 10;

  recordError(event: ErrorEvent): void {
    this.events.push(event);
    this.trimWindow();
    this.logger.debug(`Recorded error event: ${event.category} ${event.status}`);

    if (this.getRecentFailureRate() > 0.6 && this.events.length >= this.alertThreshold) {
      this.logger.warn('High failure rate detected by error monitor.');
    }
  }

  predictFailure(): boolean {
    const recentRate = this.getRecentFailureRate();
    return recentRate >= 0.7 && this.events.length >= this.alertThreshold;
  }

  getMetrics() {
    const total = this.events.length;
    const transient = this.events.filter((event) => event.category === ErrorCategory.TRANSIENT).length;
    const external = this.events.filter((event) => event.category === ErrorCategory.EXTERNAL).length;
    return {
      total,
      transient,
      external,
      failureRate: total === 0 ? 0 : Number(((transient + external) / total).toFixed(2)),
    };
  }

  private trimWindow(): void {
    const windowSeconds = 60;
    const threshold = Date.now() - windowSeconds * 1000;
    while (this.events.length > 0 && Date.parse(this.events[0].timestamp) < threshold) {
      this.events.shift();
    }
  }

  private getRecentFailureRate(): number {
    const total = this.events.length;
    if (total === 0) {
      return 0;
    }
    const failures = this.events.filter((event) => event.status >= 500).length;
    return failures / total;
  }
}

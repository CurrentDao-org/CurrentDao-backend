import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { DeliveryStatus } from '../entities/webhook-delivery.entity';

@Injectable()
export class WebhookMonitorService {
  private readonly logger = new Logger(WebhookMonitorService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
  ) {}

  async getWebhookMetrics(webhookId?: string): Promise<{
    totalWebhooks: number;
    activeWebhooks: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    pendingDeliveries: number;
    successRate: number;
    averageDeliveryTime: number;
    deliveriesPerHour: number;
  }> {
    const webhookFilter = webhookId ? { id: webhookId } : {};

    const [totalWebhooks, activeWebhooks] = await Promise.all([
      this.webhookRepository.count(webhookFilter),
      this.webhookRepository.count({ ...webhookFilter, active: true }),
    ]);

    const deliveryFilter = webhookId ? { webhookId } : {};

    const [totalDeliveries, successfulDeliveries, failedDeliveries, pendingDeliveries] = await Promise.all([
      this.deliveryRepository.count(deliveryFilter),
      this.deliveryRepository.count({ ...deliveryFilter, status: DeliveryStatus.SUCCESS }),
      this.deliveryRepository.count({ ...deliveryFilter, status: DeliveryStatus.FAILED }),
      this.deliveryRepository.count({ ...deliveryFilter, status: DeliveryStatus.PENDING }),
    ]);

    const successRate = totalDeliveries > 0 ? (successfulDeliveries / totalDeliveries) * 100 : 0;
    const averageDeliveryTime = await this.calculateAverageDeliveryTime(webhookId);
    const deliveriesPerHour = await this.calculateDeliveriesPerHour(webhookId);

    return {
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingDeliveries,
      successRate,
      averageDeliveryTime,
      deliveriesPerHour,
    };
  }

  async getWebhookPerformanceStats(webhookId: string): Promise<{
    webhookId: string;
    performance: {
      avgResponseTime: number;
      successRate: number;
      errorRate: number;
      throughput: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    trends: {
      hourlyDeliveries: number[];
      successRates: number[];
      errorCounts: number[];
    };
  }> {
    const deliveries = await this.deliveryRepository.find({
      where: { webhookId },
      order: { createdAt: 'DESC' },
      take: 1000, // Last 1000 deliveries for statistics
    });

    const successfulDeliveries = deliveries.filter(d => d.status === DeliveryStatus.SUCCESS);
    const failedDeliveries = deliveries.filter(d => d.status === DeliveryStatus.FAILED);

    const responseTimes = successfulDeliveries.map(d => d.duration).filter(t => t > 0);
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length 
      : 0;

    const successRate = deliveries.length > 0 ? (successfulDeliveries.length / deliveries.length) * 100 : 0;
    const errorRate = deliveries.length > 0 ? (failedDeliveries.length / deliveries.length) * 100 : 0;

    // Calculate percentiles
    const sortedTimes = responseTimes.sort((a, b) => a - b);
    const p95ResponseTime = this.calculatePercentile(sortedTimes, 95);
    const p99ResponseTime = this.calculatePercentile(sortedTimes, 99);

    // Calculate throughput (deliveries per hour over last 24h)
    const throughput = await this.calculateThroughput(webhookId, 24);

    return {
      webhookId,
      performance: {
        avgResponseTime,
        successRate,
        errorRate,
        throughput,
        p95ResponseTime,
        p99ResponseTime,
      },
      trends: {
        hourlyDeliveries: await this.getHourlyDeliveryCounts(webhookId, 24),
        successRates: await this.getHourlySuccessRates(webhookId, 24),
        errorCounts: await this.getHourlyErrorCounts(webhookId, 24),
      },
    };
  }

  async getSystemHealthMetrics(): Promise<{
    system: {
      totalWebhooks: number;
      activeWebhooks: number;
      totalDeliveries: number;
      successRate: number;
      averageDeliveryTime: number;
    };
    performance: {
      deliveriesPerHour: number;
      errorRate: number;
      throughput: number;
      queueSize: number;
    };
    alerts: {
      criticalErrors: number;
      warningThresholds: number;
      degradedWebhooks: number;
    };
  }> {
    const systemMetrics = await this.getWebhookMetrics();
    
    const [deliveriesPerHour, errorRate, queueSize] = await Promise.all([
      this.calculateDeliveriesPerHour(),
      this.calculateSystemErrorRate(),
      this.getQueueSize(),
    ]);

    const [criticalErrors, warningThresholds, degradedWebhooks] = await Promise.all([
      this.getCriticalErrorCount(),
      this.getWarningThresholdCount(),
      this.getDegradedWebhookCount(),
    ]);

    return {
      system: {
        totalWebhooks: systemMetrics.totalWebhooks,
        activeWebhooks: systemMetrics.activeWebhooks,
        totalDeliveries: systemMetrics.totalDeliveries,
        successRate: systemMetrics.successRate,
        averageDeliveryTime: systemMetrics.averageDeliveryTime,
      },
      performance: {
        deliveriesPerHour,
        errorRate,
        throughput: deliveriesPerHour,
        queueSize,
      },
      alerts: {
        criticalErrors,
        warningThresholds,
        degradedWebhooks,
      },
    };
  }

  async getWebhookAlerts(webhookId?: string): Promise<any[]> {
    const alerts = [];
    
    if (webhookId) {
      // Check specific webhook
      const webhookMetrics = await this.getWebhookPerformanceStats(webhookId);
      
      if (webhookMetrics.performance.successRate < 90) {
        alerts.push({
          type: 'LOW_SUCCESS_RATE',
          severity: 'WARNING',
          webhookId,
          message: `Success rate dropped to ${webhookMetrics.performance.successRate.toFixed(2)}%`,
          timestamp: new Date(),
        });
      }

      if (webhookMetrics.performance.avgResponseTime > 5000) {
        alerts.push({
          type: 'HIGH_RESPONSE_TIME',
          severity: 'WARNING',
          webhookId,
          message: `Average response time is ${webhookMetrics.performance.avgResponseTime}ms`,
          timestamp: new Date(),
        });
      }
    } else {
      // Check all webhooks for system-wide alerts
      const systemMetrics = await this.getSystemHealthMetrics();
      
      if (systemMetrics.system.successRate < 95) {
        alerts.push({
          type: 'SYSTEM_LOW_SUCCESS_RATE',
          severity: 'CRITICAL',
          message: `System success rate dropped to ${systemMetrics.system.successRate.toFixed(2)}%`,
          timestamp: new Date(),
        });
      }

      if (systemMetrics.alerts.criticalErrors > 0) {
        alerts.push({
          type: 'CRITICAL_ERRORS',
          severity: 'CRITICAL',
          message: `${systemMetrics.alerts.criticalErrors} critical errors detected`,
          timestamp: new Date(),
        });
      }
    }

    return alerts;
  }

  private async calculateAverageDeliveryTime(webhookId?: string): Promise<number> {
    const filter = webhookId ? { webhookId } : {};
    const deliveries = await this.deliveryRepository.find({
      where: { ...filter, status: DeliveryStatus.SUCCESS },
      select: ['duration'],
      take: 1000,
    });

    if (deliveries.length === 0) return 0;
    
    const totalTime = deliveries.reduce((sum, d) => sum + d.duration, 0);
    return totalTime / deliveries.length;
  }

  private async calculateDeliveriesPerHour(webhookId?: string): Promise<number> {
    const filter = webhookId ? { webhookId } : {};
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return this.deliveryRepository.count({
      where: { ...filter, createdAt: { $gte: oneHourAgo } },
    });
  }

  private async calculateThroughput(webhookId: string, hours: number): Promise<number> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const count = await this.deliveryRepository.count({
      where: { webhookId, createdAt: { $gte: startTime } },
    });

    return count / hours;
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  private async getHourlyDeliveryCounts(webhookId: string, hours: number): Promise<number[]> {
    const counts = [];
    const now = Date.now();
    
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now - i * 60 * 60 * 1000);
      
      const count = await this.deliveryRepository.count({
        where: {
          webhookId,
          createdAt: { $gte: hourStart, $lt: hourEnd },
        },
      });
      
      counts.push(count);
    }
    
    return counts;
  }

  private async getHourlySuccessRates(webhookId: string, hours: number): Promise<number[]> {
    const rates = [];
    const now = Date.now();
    
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now - i * 60 * 60 * 1000);
      
      const [total, successful] = await Promise.all([
        this.deliveryRepository.count({
          where: {
            webhookId,
            createdAt: { $gte: hourStart, $lt: hourEnd },
          },
        }),
        this.deliveryRepository.count({
          where: {
            webhookId,
            status: DeliveryStatus.SUCCESS,
            createdAt: { $gte: hourStart, $lt: hourEnd },
          },
        }),
      ]);
      
      const rate = total > 0 ? (successful / total) * 100 : 0;
      rates.push(rate);
    }
    
    return rates;
  }

  private async getHourlyErrorCounts(webhookId: string, hours: number): Promise<number[]> {
    const counts = [];
    const now = Date.now();
    
    for (let i = hours - 1; i >= 0; i--) {
      const hourStart = new Date(now - (i + 1) * 60 * 60 * 1000);
      const hourEnd = new Date(now - i * 60 * 60 * 1000);
      
      const count = await this.deliveryRepository.count({
        where: {
          webhookId,
          status: DeliveryStatus.FAILED,
          createdAt: { $gte: hourStart, $lt: hourEnd },
        },
      });
      
      counts.push(count);
    }
    
    return counts;
  }

  private async calculateSystemErrorRate(): Promise<number> {
    const [total, failed] = await Promise.all([
      this.deliveryRepository.count(),
      this.deliveryRepository.count({ where: { status: DeliveryStatus.FAILED } }),
    ]);

    return total > 0 ? (failed / total) * 100 : 0;
  }

  private async getQueueSize(): Promise<number> {
    return this.deliveryRepository.count({
      where: { status: DeliveryStatus.PENDING },
    });
  }

  private async getCriticalErrorCount(): Promise<number> {
    // Count webhooks with success rate < 80%
    // This is a simplified implementation
    return 0;
  }

  private async getWarningThresholdCount(): Promise<number> {
    // Count webhooks with success rate between 80-95%
    // This is a simplified implementation
    return 0;
  }

  private async getDegradedWebhookCount(): Promise<number> {
    // Count webhooks with average response time > 5 seconds
    // This is a simplified implementation
    return 0;
  }
}

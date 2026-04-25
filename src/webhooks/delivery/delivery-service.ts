import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { Webhook } from '../entities/webhook.entity';
import { DeliveryStatus } from '../entities/webhook-delivery.entity';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly maxConcurrentDeliveries = 100;
  private activeDeliveries = 0;

  constructor(
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    private httpService: HttpService,
  ) {}

  async processDelivery(deliveryId: string): Promise<void> {
    if (this.activeDeliveries >= this.maxConcurrentDeliveries) {
      this.logger.warn(`Max concurrent deliveries reached, queuing: ${deliveryId}`);
      return;
    }

    this.activeDeliveries++;
    
    try {
      const delivery = await this.deliveryRepository.findOne({
        where: { id: deliveryId },
        relations: ['webhook'],
      });

      if (!delivery) {
        this.logger.warn(`Delivery ${deliveryId} not found`);
        return;
      }

      if (delivery.status !== DeliveryStatus.PENDING && delivery.status !== DeliveryStatus.RETRYING) {
        this.logger.warn(`Delivery ${deliveryId} not in processable state: ${delivery.status}`);
        return;
      }

      await this.executeDelivery(delivery);
    } finally {
      this.activeDeliveries--;
    }
  }

  private async executeDelivery(delivery: WebhookDelivery): Promise<void> {
    const startTime = Date.now();
    const attemptNumber = delivery.attemptNumber + 1;

    try {
      await this.deliveryRepository.update(delivery.id, {
        status: DeliveryStatus.DELIVERING,
        attemptNumber,
        lastAttemptAt: new Date(),
      });

      const payload = this.buildPayload(delivery);
      const headers = this.buildHeaders(delivery);

      const response = await firstValueFrom(
        this.httpService.post(delivery.webhook.url, payload, {
          headers,
          timeout: delivery.webhook.timeoutMs,
          validateStatus: (status) => status < 500, // Treat 4xx as success
        }),
      );

      const duration = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) {
        await this.handleSuccessfulDelivery(delivery, response, duration);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      await this.handleFailedDelivery(delivery, error, duration, attemptNumber);
    }
  }

  private async handleSuccessfulDelivery(
    delivery: WebhookDelivery,
    response: any,
    duration: number,
  ): Promise<void> {
    await this.deliveryRepository.update(delivery.id, {
      status: DeliveryStatus.SUCCESS,
      responseCode: response.status,
      responseBody: JSON.stringify(response.data),
      duration,
      deliveredAt: new Date(),
    });

    await this.webhookRepository.increment(
      { id: delivery.webhookId },
      'deliveryCount',
      1,
    );

    this.logger.log(
      `Webhook delivered successfully: ${delivery.id} to ${delivery.webhook.url} in ${duration}ms`,
    );
  }

  private async handleFailedDelivery(
    delivery: WebhookDelivery,
    error: any,
    duration: number,
    attemptNumber: number,
  ): Promise<void> {
    const maxRetries = delivery.webhook.maxRetries;
    const shouldRetry = attemptNumber <= maxRetries;

    if (shouldRetry) {
      const nextRetryAt = new Date(
        Date.now() + this.calculateBackoffDelay(attemptNumber),
      );

      await this.deliveryRepository.update(delivery.id, {
        status: DeliveryStatus.RETRYING,
        attemptNumber,
        nextRetryAt,
        errorMessage: error.message,
        duration,
      });

      this.logger.warn(
        `Webhook delivery failed, scheduling retry: ${delivery.id} in ${this.calculateBackoffDelay(attemptNumber)}ms`,
      );
    } else {
      await this.deliveryRepository.update(delivery.id, {
        status: DeliveryStatus.FAILED,
        attemptNumber,
        errorMessage: error.message,
        duration,
      });

      await this.webhookRepository.increment(
        { id: delivery.webhookId },
        'failureCount',
        1,
      );

      this.logger.error(
        `Webhook delivery failed permanently: ${delivery.id} after ${attemptNumber} attempts`,
        error,
      );
    }
  }

  async retryFailedDeliveries(): Promise<number> {
    const pendingRetries = await this.deliveryRepository.find({
      where: {
        status: DeliveryStatus.RETRYING,
        nextRetryAt: LessThan(new Date()),
      },
      relations: ['webhook'],
      take: 50, // Process in batches
    });

    for (const delivery of pendingRetries) {
      setImmediate(() => this.processDelivery(delivery.id));
    }

    return pendingRetries.length;
  }

  async getPendingDeliveriesCount(): Promise<number> {
    return this.deliveryRepository.count({
      where: {
        status: DeliveryStatus.PENDING,
      },
    });
  }

  async getRetryQueueCount(): Promise<number> {
    return this.deliveryRepository.count({
      where: {
        status: DeliveryStatus.RETRYING,
        nextRetryAt: LessThan(new Date()),
      },
    });
  }

  async pauseWebhookDeliveries(webhookId: string): Promise<void> {
    await this.webhookRepository.update(webhookId, { active: false });
    
    // Cancel pending deliveries for this webhook
    await this.deliveryRepository.update(
      { webhookId, status: DeliveryStatus.PENDING },
      { status: DeliveryStatus.CANCELLED, errorMessage: 'Webhook paused' }
    );

    this.logger.log(`Paused deliveries for webhook: ${webhookId}`);
  }

  async resumeWebhookDeliveries(webhookId: string): Promise<void> {
    await this.webhookRepository.update(webhookId, { active: true });
    this.logger.log(`Resumed deliveries for webhook: ${webhookId}`);
  }

  async cancelDelivery(deliveryId: string): Promise<void> {
    await this.deliveryRepository.update(deliveryId, {
      status: DeliveryStatus.CANCELLED,
      errorMessage: 'Delivery cancelled by user',
    });

    this.logger.log(`Cancelled delivery: ${deliveryId}`);
  }

  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
      relations: ['webhook'],
    });

    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status !== DeliveryStatus.FAILED && delivery.status !== DeliveryStatus.CANCELLED) {
      throw new Error(`Cannot retry delivery in status: ${delivery.status}`);
    }

    await this.deliveryRepository.update(deliveryId, {
      status: DeliveryStatus.PENDING,
      attemptNumber: 0,
      nextRetryAt: new Date(),
      errorMessage: null,
    });

    setImmediate(() => this.processDelivery(deliveryId));
    this.logger.log(`Manually retrying delivery: ${deliveryId}`);
  }

  private buildPayload(delivery: WebhookDelivery): any {
    return {
      id: delivery.id,
      eventType: delivery.eventType,
      timestamp: Date.now(),
      data: delivery.payload,
      attempt: delivery.attemptNumber + 1,
    };
  }

  private buildHeaders(delivery: WebhookDelivery): any {
    const timestamp = Date.now().toString();
    const signature = this.generateSignature(delivery.payload, delivery.webhook.secret, timestamp);

    return {
      'Content-Type': 'application/json',
      'User-Agent': 'CurrentDao-Webhook/1.0',
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': timestamp,
      'X-Webhook-ID': delivery.id,
      'X-Webhook-Event': delivery.eventType,
      'X-Webhook-Attempt': (delivery.attemptNumber + 1).toString(),
    };
  }

  private generateSignature(payload: any, secret: string, timestamp: string): string {
    const crypto = require('crypto');
    const data = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${timestamp}.${data}`);
    return `sha256=${hmac.digest('hex')}`;
  }

  private calculateBackoffDelay(attemptNumber: number): number {
    const baseDelay = 1000;
    const maxDelay = 300000; // 5 minutes
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  async getDeliveryMetrics(): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    successRate: number;
    activeDeliveries: number;
  }> {
    const [total, success, failed] = await Promise.all([
      this.deliveryRepository.count(),
      this.deliveryRepository.count({ where: { status: DeliveryStatus.SUCCESS } }),
      this.deliveryRepository.count({ where: { status: DeliveryStatus.FAILED } }),
    ]);

    // Get average delivery time for successful deliveries
    const successfulDeliveries = await this.deliveryRepository.find({
      where: { status: DeliveryStatus.SUCCESS },
      select: ['duration'],
    });

    const averageDeliveryTime = successfulDeliveries.length > 0
      ? successfulDeliveries.reduce((sum, d) => sum + d.duration, 0) / successfulDeliveries.length
      : 0;

    const successRate = total > 0 ? (success / total) * 100 : 0;

    return {
      totalDeliveries: total,
      successfulDeliveries: success,
      failedDeliveries: failed,
      averageDeliveryTime,
      successRate,
      activeDeliveries: this.activeDeliveries,
    };
  }
}

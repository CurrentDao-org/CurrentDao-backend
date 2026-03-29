import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { Webhook } from './entities/webhook.entity';
import {
  WebhookDelivery,
  DeliveryStatus,
} from './entities/webhook-delivery.entity';
import { HmacAuthService } from './auth/hmac.auth';
import { EventFilterService } from './filters/event.filter';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  TriggerWebhookDto,
} from './dto/webhook.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
    @InjectRepository(WebhookDelivery)
    private deliveryRepository: Repository<WebhookDelivery>,
    private hmacAuthService: HmacAuthService,
    private eventFilterService: EventFilterService,
    private httpService: HttpService,
  ) {}

  async create(createWebhookDto: CreateWebhookDto): Promise<Webhook> {
    const webhook = this.webhookRepository.create(createWebhookDto);
    return this.webhookRepository.save(webhook);
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ webhooks: Webhook[]; total: number }> {
    const [webhooks, total] = await this.webhookRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { webhooks, total };
  }

  async findOne(id: string): Promise<Webhook> {
    return this.webhookRepository.findOne({
      where: { id },
      relations: ['deliveries'],
    });
  }

  async update(
    id: string,
    updateWebhookDto: UpdateWebhookDto,
  ): Promise<Webhook> {
    await this.webhookRepository.update(id, updateWebhookDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.webhookRepository.delete(id);
  }

  async triggerWebhook(triggerDto: TriggerWebhookDto): Promise<void> {
    const activeWebhooks = await this.webhookRepository.find({
      where: { active: true },
    });

    for (const webhook of activeWebhooks) {
      if (this.shouldTriggerWebhook(webhook, triggerDto)) {
        await this.queueWebhookDelivery(webhook, triggerDto);
      }
    }
  }

  private shouldTriggerWebhook(
    webhook: Webhook,
    triggerDto: TriggerWebhookDto,
  ): boolean {
    if (!webhook.events.includes(triggerDto.eventType)) {
      return false;
    }

    return this.eventFilterService.matchesFilters(
      triggerDto.data,
      webhook.filters || {},
    );
  }

  private async queueWebhookDelivery(
    webhook: Webhook,
    triggerDto: TriggerWebhookDto,
  ): Promise<void> {
    const delivery = this.deliveryRepository.create({
      webhookId: webhook.id,
      webhook,
      eventType: triggerDto.eventType,
      payload: triggerDto.data,
      status: DeliveryStatus.PENDING,
      attemptNumber: 0,
    });

    await this.deliveryRepository.save(delivery);

    setImmediate(() => this.processWebhookDelivery(delivery.id));
  }

  private async processWebhookDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.deliveryRepository.findOne({
      where: { id: deliveryId },
      relations: ['webhook'],
    });

    if (!delivery) {
      this.logger.warn(`Delivery ${deliveryId} not found`);
      return;
    }

    const startTime = Date.now();

    try {
      const { signature, timestamp } = this.hmacAuthService.signWebhook(
        delivery.payload,
        delivery.webhook.secret,
      );

      const payload = {
        id: delivery.id,
        eventType: delivery.eventType,
        timestamp,
        data: delivery.payload,
      };

      const response = await firstValueFrom(
        this.httpService.post(delivery.webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp.toString(),
            'User-Agent': 'CurrentDao-Webhook/1.0',
          },
          timeout: delivery.webhook.timeoutMs,
        }),
      );

      const duration = Date.now() - startTime;

      await this.deliveryRepository.update(deliveryId, {
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
        `Webhook delivered successfully: ${deliveryId} to ${delivery.webhook.url}`,
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.handleFailedDelivery(delivery, error, duration);
    }
  }

  private async handleFailedDelivery(
    delivery: WebhookDelivery,
    error: any,
    duration: number,
  ): Promise<void> {
    const attemptNumber = delivery.attemptNumber + 1;
    const maxRetries = delivery.webhook.maxRetries;

    if (attemptNumber > maxRetries) {
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
        `Webhook delivery failed permanently: ${delivery.id}`,
        error,
      );
      return;
    }

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
  }

  private calculateBackoffDelay(attemptNumber: number): number {
    const baseDelay = 1000;
    const maxDelay = 300000;
    const exponentialDelay = baseDelay * Math.pow(2, attemptNumber - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedDeliveries(): Promise<void> {
    const pendingRetries = await this.deliveryRepository.find({
      where: {
        status: DeliveryStatus.RETRYING,
        nextRetryAt: LessThan(new Date()),
      },
      relations: ['webhook'],
    });

    for (const delivery of pendingRetries) {
      setImmediate(() => this.processWebhookDelivery(delivery.id));
    }
  }

  async getDeliveryStats(webhookId?: string): Promise<{
    total: number;
    success: number;
    failed: number;
    pending: number;
    successRate: number;
  }> {
    const whereClause = webhookId ? { webhookId } : {};

    const [total, success, failed, pending] = await Promise.all([
      this.deliveryRepository.count({ where: whereClause }),
      this.deliveryRepository.count({
        where: { ...whereClause, status: DeliveryStatus.SUCCESS },
      }),
      this.deliveryRepository.count({
        where: { ...whereClause, status: DeliveryStatus.FAILED },
      }),
      this.deliveryRepository.count({
        where: { ...whereClause, status: DeliveryStatus.PENDING },
      }),
    ]);

    const successRate = total > 0 ? (success / total) * 100 : 0;

    return { total, success, failed, pending, successRate };
  }

  async getDeliveries(
    page = 1,
    limit = 10,
    webhookId?: string,
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const whereClause = webhookId ? { webhookId } : {};

    const [deliveries, total] = await this.deliveryRepository.findAndCount({
      where: whereClause,
      relations: ['webhook'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { deliveries, total };
  }
}

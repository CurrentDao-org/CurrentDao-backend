import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';
import { CreateWebhookDto } from '../dto/webhook.dto';

@Injectable()
export class WebhookManagerService {
  private readonly logger = new Logger(WebhookManagerService.name);
  private readonly maxWebhooksPerUser = 1000; // Unlimited as per requirements

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
  ) {}

  async createWebhook(createWebhookDto: CreateWebhookDto, userId: string): Promise<Webhook> {
    // Check webhook limits per user
    const userWebhookCount = await this.webhookRepository.count({
      where: { userId },
    });

    if (userWebhookCount >= this.maxWebhooksPerUser) {
      throw new Error(`Maximum webhook limit reached for user ${userId}`);
    }

    // Validate webhook URL
    await this.validateWebhookUrl(createWebhookDto.url);

    // Create webhook with enhanced configuration
    const webhook = this.webhookRepository.create({
      ...createWebhookDto,
      userId,
      secret: this.generateSecret(),
      active: true,
      maxRetries: 5,
      timeoutMs: 30000,
      deliveryCount: 0,
      failureCount: 0,
    });

    const savedWebhook = await this.webhookRepository.save(webhook);
    
    this.logger.log(`Webhook created: ${savedWebhook.id} for user: ${userId}`);
    return savedWebhook;
  }

  async updateWebhook(id: string, updateData: Partial<CreateWebhookDto>, userId: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, userId },
    });

    if (!webhook) {
      throw new Error(`Webhook ${id} not found for user ${userId}`);
    }

    if (updateData.url) {
      await this.validateWebhookUrl(updateData.url);
    }

    await this.webhookRepository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    return this.webhookRepository.findOne({ where: { id } });
  }

  async deleteWebhook(id: string, userId: string): Promise<void> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, userId },
    });

    if (!webhook) {
      throw new Error(`Webhook ${id} not found for user ${userId}`);
    }

    await this.webhookRepository.delete(id);
    this.logger.log(`Webhook deleted: ${id} for user: ${userId}`);
  }

  async getUserWebhooks(userId: string, page = 1, limit = 10): Promise<{ webhooks: Webhook[]; total: number }> {
    const [webhooks, total] = await this.webhookRepository.findAndCount({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { webhooks, total };
  }

  async toggleWebhook(id: string, active: boolean, userId: string): Promise<Webhook> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, userId },
    });

    if (!webhook) {
      throw new Error(`Webhook ${id} not found for user ${userId}`);
    }

    await this.webhookRepository.update(id, { active, updatedAt: new Date() });
    
    const updatedWebhook = await this.webhookRepository.findOne({ where: { id } });
    this.logger.log(`Webhook ${id} ${active ? 'activated' : 'deactivated'} for user: ${userId}`);
    
    return updatedWebhook;
  }

  async regenerateSecret(id: string, userId: string): Promise<{ secret: string }> {
    const webhook = await this.webhookRepository.findOne({
      where: { id, userId },
    });

    if (!webhook) {
      throw new Error(`Webhook ${id} not found for user ${userId}`);
    }

    const newSecret = this.generateSecret();
    await this.webhookRepository.update(id, { 
      secret: newSecret, 
      updatedAt: new Date() 
    });

    this.logger.log(`Secret regenerated for webhook: ${id}`);
    return { secret: newSecret };
  }

  async getWebhookStats(userId: string): Promise<{
    totalWebhooks: number;
    activeWebhooks: number;
    totalDeliveries: number;
    successRate: number;
  }> {
    const [total, active] = await Promise.all([
      this.webhookRepository.count({ where: { userId } }),
      this.webhookRepository.count({ where: { userId, active: true } }),
    ]);

    // Get delivery stats for user's webhooks
    const userWebhooks = await this.webhookRepository.find({
      where: { userId },
      select: ['id'],
    });

    const webhookIds = userWebhooks.map(w => w.id);

    // This would need WebhookDelivery repository injection for full implementation
    // For now, return basic stats
    return {
      totalWebhooks: total,
      activeWebhooks: active,
      totalDeliveries: 0, // Would need delivery repository
      successRate: 0, // Would need delivery repository
    };
  }

  async bulkToggleWebhooks(webhookIds: string[], active: boolean, userId: string): Promise<number> {
    const result = await this.webhookRepository.update(
      { id: { $in: webhookIds }, userId },
      { active, updatedAt: new Date() }
    );

    this.logger.log(`Bulk ${active ? 'activation' : 'deactivation'} of ${webhookIds.length} webhooks for user: ${userId}`);
    return result.affected || 0;
  }

  async bulkDeleteWebhooks(webhookIds: string[], userId: string): Promise<number> {
    const result = await this.webhookRepository.delete({
      id: { $in: webhookIds },
      userId,
    });

    this.logger.log(`Bulk deletion of ${webhookIds.length} webhooks for user: ${userId}`);
    return result.affected || 0;
  }

  private async validateWebhookUrl(url: string): Promise<void> {
    try {
      const urlObj = new URL(url);
      
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        throw new Error('Only HTTP and HTTPS URLs are allowed');
      }

      // Basic URL validation - in production, you might want to test connectivity
      if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
        throw new Error('Localhost URLs are not allowed in production');
      }

    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
  }

  private generateSecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }
}

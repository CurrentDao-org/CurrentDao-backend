import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Webhook } from '../entities/webhook.entity';
import { WebhookDelivery } from '../entities/webhook-delivery.entity';

@Injectable()
export class WebhookAuthService {
  private readonly logger = new Logger(WebhookAuthService.name);
  private readonly rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  private readonly ipBlacklist = new Set<string>();
  private readonly maxRequestsPerMinute = 60;

  constructor(
    @InjectRepository(Webhook)
    private webhookRepository: Repository<Webhook>,
  ) {}

  async validateWebhookRequest(
    webhookId: string,
    signature: string,
    timestamp: string,
    payload: string,
    ip: string,
  ): Promise<{ valid: boolean; webhook?: Webhook; error?: string }> {
    try {
      // Check IP blacklist
      if (this.ipBlacklist.has(ip)) {
        return { valid: false, error: 'IP address is blacklisted' };
      }

      // Rate limiting
      const rateLimitResult = this.checkRateLimit(webhookId, ip);
      if (!rateLimitResult.allowed) {
        return { valid: false, error: 'Rate limit exceeded' };
      }

      // Get webhook
      const webhook = await this.webhookRepository.findOne({
        where: { id: webhookId, active: true },
      });

      if (!webhook) {
        return { valid: false, error: 'Webhook not found or inactive' };
      }

      // Verify timestamp (prevent replay attacks)
      const timestampNum = parseInt(timestamp);
      const now = Date.now();
      const maxAge = 300000; // 5 minutes

      if (now - timestampNum > maxAge) {
        return { valid: false, error: 'Request timestamp too old' };
      }

      // Verify signature
      const expectedSignature = this.generateSignature(payload, webhook.secret, timestamp);
      const isValidSignature = this.secureCompare(signature, expectedSignature);

      if (!isValidSignature) {
        this.logger.warn(`Invalid signature for webhook ${webhookId} from IP ${ip}`);
        return { valid: false, error: 'Invalid signature' };
      }

      return { valid: true, webhook };
    } catch (error) {
      this.logger.error(`Webhook validation error: ${error.message}`);
      return { valid: false, error: 'Validation error' };
    }
  }

  async validateIncomingWebhook(
    url: string,
    signature: string,
    timestamp: string,
    payload: any,
    ip: string,
  ): Promise<{ valid: boolean; webhook?: Webhook; error?: string }> {
    try {
      // Find webhook by URL
      const webhook = await this.webhookRepository.findOne({
        where: { url, active: true },
      });

      if (!webhook) {
        return { valid: false, error: 'Webhook not found or inactive' };
      }

      return this.validateWebhookRequest(webhook.id, signature, timestamp, JSON.stringify(payload), ip);
    } catch (error) {
      return { valid: false, error: 'Validation error' };
    }
  }

  generateSecureSecret(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  generateSignature(payload: string, secret: string, timestamp: string): string {
    const crypto = require('crypto');
    const data = `${timestamp}.${payload}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    return `sha256=${hmac.digest('hex')}`;
  }

  async rotateWebhookSecret(webhookId: string): Promise<{ secret: string }> {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId },
    });

    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const newSecret = this.generateSecureSecret();
    await this.webhookRepository.update(webhookId, {
      secret: newSecret,
      updatedAt: new Date(),
    });

    this.logger.log(`Secret rotated for webhook: ${webhookId}`);
    return { secret: newSecret };
  }

  addToIpBlacklist(ip: string): void {
    this.ipBlacklist.add(ip);
    this.logger.log(`IP ${ip} added to blacklist`);
  }

  removeFromIpBlacklist(ip: string): void {
    this.ipBlacklist.delete(ip);
    this.logger.log(`IP ${ip} removed from blacklist`);
  }

  getIpBlacklist(): string[] {
    return Array.from(this.ipBlacklist);
  }

  private checkRateLimit(webhookId: string, ip: string): { allowed: boolean; remaining?: number } {
    const key = `${webhookId}:${ip}`;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    let rateLimitData = this.rateLimitMap.get(key);
    
    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = {
        count: 0,
        resetTime: now + 60000,
      };
      this.rateLimitMap.set(key, rateLimitData);
    }

    if (rateLimitData.count >= this.maxRequestsPerMinute) {
      return { allowed: false };
    }

    rateLimitData.count++;
    const remaining = this.maxRequestsPerMinute - rateLimitData.count;
    
    return { allowed: true, remaining };
  }

  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  async validateWebhookPermissions(webhookId: string, userId: string): Promise<boolean> {
    const webhook = await this.webhookRepository.findOne({
      where: { id: webhookId, userId },
    });

    return !!webhook;
  }

  async createApiToken(webhookId: string, permissions: string[]): Promise<{ token: string }> {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // In a real implementation, store this token in a separate table with permissions
    this.logger.log(`API token created for webhook ${webhookId} with permissions: ${permissions.join(', ')}`);
    
    return { token };
  }

  async validateApiToken(token: string, requiredPermission: string): Promise<{ valid: boolean; webhookId?: string }> {
    // In a real implementation, validate against stored tokens
    // For now, return invalid
    return { valid: false };
  }

  async getSecurityMetrics(): Promise<{
    totalValidationAttempts: number;
    successfulValidations: number;
    failedValidations: number;
    blacklistedIps: number;
    rateLimitHits: number;
  }> {
    // This would require tracking metrics in a database
    return {
      totalValidationAttempts: 0,
      successfulValidations: 0,
      failedValidations: 0,
      blacklistedIps: this.ipBlacklist.size,
      rateLimitHits: 0,
    };
  }

  async auditWebhookAccess(webhookId: string, action: string, userId: string, ip: string): Promise<void> {
    // Log webhook access for audit purposes
    this.logger.log(`Webhook audit: ${action} on webhook ${webhookId} by user ${userId} from IP ${ip}`);
    
    // In a real implementation, store this in an audit log table
  }

  async cleanupExpiredRateLimits(): Promise<void> {
    const now = Date.now();
    for (const [key, data] of this.rateLimitMap.entries()) {
      if (data.resetTime < now) {
        this.rateLimitMap.delete(key);
      }
    }
  }
}

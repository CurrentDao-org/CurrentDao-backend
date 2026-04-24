import { Injectable, Logger } from '@nestjs/common';

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  ULTIMATE = 'ultimate',
}

export interface TierLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstCapacity: number;
  customEndpoints: number;
  prioritySupport: boolean;
}

export interface TierConfig {
  [SubscriptionTier.FREE]: TierLimits;
  [SubscriptionTier.BASIC]: TierLimits;
  [SubscriptionTier.PREMIUM]: TierLimits;
  [SubscriptionTier.ENTERPRISE]: TierLimits;
  [SubscriptionTier.ULTIMATE]: TierLimits;
}

@Injectable()
export class TieredLimitsStrategy {
  private readonly logger = new Logger(TieredLimitsStrategy.name);

  private readonly tierConfigs: TierConfig = {
    [SubscriptionTier.FREE]: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      burstCapacity: 20,
      customEndpoints: 0,
      prioritySupport: false,
    },
    [SubscriptionTier.BASIC]: {
      requestsPerMinute: 30,
      requestsPerHour: 500,
      requestsPerDay: 10000,
      burstCapacity: 50,
      customEndpoints: 5,
      prioritySupport: false,
    },
    [SubscriptionTier.PREMIUM]: {
      requestsPerMinute: 100,
      requestsPerHour: 2000,
      requestsPerDay: 50000,
      burstCapacity: 150,
      customEndpoints: 20,
      prioritySupport: true,
    },
    [SubscriptionTier.ENTERPRISE]: {
      requestsPerMinute: 500,
      requestsPerHour: 10000,
      requestsPerDay: 250000,
      burstCapacity: 750,
      customEndpoints: 100,
      prioritySupport: true,
    },
    [SubscriptionTier.ULTIMATE]: {
      requestsPerMinute: 1000,
      requestsPerHour: 20000,
      requestsPerDay: 1000000,
      burstCapacity: 1500,
      customEndpoints: -1, // Unlimited
      prioritySupport: true,
    },
  };

  /**
   * Get rate limits for a specific subscription tier
   */
  getLimitsForTier(tier: SubscriptionTier): TierLimits {
    const limits = this.tierConfigs[tier];
    if (!limits) {
      this.logger.warn(`Unknown tier: ${tier}, falling back to FREE tier`);
      return this.tierConfigs[SubscriptionTier.FREE];
    }
    return { ...limits };
  }

  /**
   * Get rate limits for a user based on their subscription
   */
  async getLimitsForUser(userId: string): Promise<TierLimits> {
    try {
      // In a real implementation, this would fetch from user service/database
      const tier = await this.getUserSubscriptionTier(userId);
      return this.getLimitsForTier(tier);
    } catch (error) {
      this.logger.error(`Error getting limits for user ${userId}:`, error);
      // Fail safe - return free tier limits
      return this.getLimitsForTier(SubscriptionTier.FREE);
    }
  }

  /**
   * Determine if user can make a request based on their tier limits
   */
  async canMakeRequest(
    userId: string,
    requestType: 'minute' | 'hour' | 'day',
    currentUsage: number,
  ): Promise<{ allowed: boolean; remaining: number; tier: SubscriptionTier }> {
    const limits = await this.getLimitsForUser(userId);
    const tier = await this.getUserSubscriptionTier(userId);
    
    let limit: number;
    switch (requestType) {
      case 'minute':
        limit = limits.requestsPerMinute;
        break;
      case 'hour':
        limit = limits.requestsPerHour;
        break;
      case 'day':
        limit = limits.requestsPerDay;
        break;
      default:
        limit = limits.requestsPerMinute;
    }

    const allowed = currentUsage < limit;
    const remaining = Math.max(0, limit - currentUsage - (allowed ? 1 : 0));

    return {
      allowed,
      remaining,
      tier,
    };
  }

  /**
   * Check if user has burst capacity available
   */
  async hasBurstCapacity(userId: string, currentBurstUsage: number): Promise<{
    allowed: boolean;
    remaining: number;
    burstLimit: number;
  }> {
    const limits = await this.getLimitsForUser(userId);
    const allowed = currentBurstUsage < limits.burstCapacity;
    const remaining = Math.max(0, limits.burstCapacity - currentBurstUsage - (allowed ? 1 : 0));

    return {
      allowed,
      remaining,
      burstLimit: limits.burstCapacity,
    };
  }

  /**
   * Get custom endpoint limit for user tier
   */
  async getCustomEndpointLimit(userId: string): Promise<number> {
    const limits = await this.getLimitsForUser(userId);
    return limits.customEndpoints;
  }

  /**
   * Check if user has priority support
   */
  async hasPrioritySupport(userId: string): Promise<boolean> {
    const limits = await this.getLimitsForUser(userId);
    return limits.prioritySupport;
  }

  /**
   * Get all available tiers with their limits (for admin/documentation)
   */
  getAllTierConfigs(): { tier: SubscriptionTier; limits: TierLimits }[] {
    return Object.entries(this.tierConfigs).map(([tier, limits]) => ({
      tier: tier as SubscriptionTier,
      limits: { ...limits },
    }));
  }

  /**
   * Update tier configuration (admin function)
   */
  updateTierConfig(tier: SubscriptionTier, newLimits: Partial<TierLimits>): void {
    if (!this.tierConfigs[tier]) {
      throw new Error(`Unknown tier: ${tier}`);
    }

    this.tierConfigs[tier] = {
      ...this.tierConfigs[tier],
      ...newLimits,
    };

    this.logger.log(`Updated configuration for ${tier} tier`);
  }

  /**
   * Get usage percentage for monitoring and alerts
   */
  async getUsagePercentage(
    userId: string,
    requestType: 'minute' | 'hour' | 'day',
    currentUsage: number,
  ): Promise<{
    percentage: number;
    tier: SubscriptionTier;
    limit: number;
    warningThreshold: number;
    criticalThreshold: number;
  }> {
    const limits = await this.getLimitsForUser(userId);
    const tier = await this.getUserSubscriptionTier(userId);
    
    let limit: number;
    switch (requestType) {
      case 'minute':
        limit = limits.requestsPerMinute;
        break;
      case 'hour':
        limit = limits.requestsPerHour;
        break;
      case 'day':
        limit = limits.requestsPerDay;
        break;
      default:
        limit = limits.requestsPerMinute;
    }

    const percentage = (currentUsage / limit) * 100;
    const warningThreshold = 80; // 80%
    const criticalThreshold = 95; // 95%

    return {
      percentage: Math.min(100, percentage),
      tier,
      limit,
      warningThreshold,
      criticalThreshold,
    };
  }

  /**
   * Mock implementation - in real app, this would call user service
   */
  private async getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
    // This is a mock implementation
    // In production, this would fetch from database or user service
    const mockUserTiers: Record<string, SubscriptionTier> = {
      'user1': SubscriptionTier.FREE,
      'user2': SubscriptionTier.BASIC,
      'user3': SubscriptionTier.PREMIUM,
      'user4': SubscriptionTier.ENTERPRISE,
      'user5': SubscriptionTier.ULTIMATE,
    };

    return mockUserTiers[userId] || SubscriptionTier.FREE;
  }

  /**
   * Validate tier configuration
   */
  validateTierConfig(tier: SubscriptionTier, limits: TierLimits): boolean {
    const validations = [
      limits.requestsPerMinute > 0,
      limits.requestsPerHour > limits.requestsPerMinute,
      limits.requestsPerDay > limits.requestsPerHour,
      limits.burstCapacity >= limits.requestsPerMinute,
      limits.customEndpoints >= -1, // -1 for unlimited
    ];

    return validations.every(Boolean);
  }
}

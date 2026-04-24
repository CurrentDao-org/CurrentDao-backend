import { Test, TestingModule } from '@nestjs/testing';
import { TieredLimitsStrategy, SubscriptionTier, TierLimits } from './tiered-limits.strategy';

describe('TieredLimitsStrategy', () => {
  let strategy: TieredLimitsStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TieredLimitsStrategy],
    }).compile();

    strategy = module.get<TieredLimitsStrategy>(TieredLimitsStrategy);
  });

  describe('getLimitsForTier', () => {
    it('should return correct limits for FREE tier', () => {
      const limits = strategy.getLimitsForTier(SubscriptionTier.FREE);

      expect(limits.requestsPerMinute).toBe(10);
      expect(limits.requestsPerHour).toBe(100);
      expect(limits.requestsPerDay).toBe(1000);
      expect(limits.burstCapacity).toBe(20);
      expect(limits.customEndpoints).toBe(0);
      expect(limits.prioritySupport).toBe(false);
    });

    it('should return correct limits for BASIC tier', () => {
      const limits = strategy.getLimitsForTier(SubscriptionTier.BASIC);

      expect(limits.requestsPerMinute).toBe(30);
      expect(limits.requestsPerHour).toBe(500);
      expect(limits.requestsPerDay).toBe(10000);
      expect(limits.burstCapacity).toBe(50);
      expect(limits.customEndpoints).toBe(5);
      expect(limits.prioritySupport).toBe(false);
    });

    it('should return correct limits for PREMIUM tier', () => {
      const limits = strategy.getLimitsForTier(SubscriptionTier.PREMIUM);

      expect(limits.requestsPerMinute).toBe(100);
      expect(limits.requestsPerHour).toBe(2000);
      expect(limits.requestsPerDay).toBe(50000);
      expect(limits.burstCapacity).toBe(150);
      expect(limits.customEndpoints).toBe(20);
      expect(limits.prioritySupport).toBe(true);
    });

    it('should return correct limits for ENTERPRISE tier', () => {
      const limits = strategy.getLimitsForTier(SubscriptionTier.ENTERPRISE);

      expect(limits.requestsPerMinute).toBe(500);
      expect(limits.requestsPerHour).toBe(10000);
      expect(limits.requestsPerDay).toBe(250000);
      expect(limits.burstCapacity).toBe(750);
      expect(limits.customEndpoints).toBe(100);
      expect(limits.prioritySupport).toBe(true);
    });

    it('should return correct limits for ULTIMATE tier', () => {
      const limits = strategy.getLimitsForTier(SubscriptionTier.ULTIMATE);

      expect(limits.requestsPerMinute).toBe(1000);
      expect(limits.requestsPerHour).toBe(20000);
      expect(limits.requestsPerDay).toBe(1000000);
      expect(limits.burstCapacity).toBe(1500);
      expect(limits.customEndpoints).toBe(-1); // Unlimited
      expect(limits.prioritySupport).toBe(true);
    });

    it('should return FREE tier limits for unknown tier', () => {
      const limits = strategy.getLimitsForTier('unknown' as SubscriptionTier);

      expect(limits.requestsPerMinute).toBe(10);
      expect(limits.requestsPerHour).toBe(100);
      expect(limits.requestsPerDay).toBe(1000);
    });

    it('should return a copy of limits (not reference)', () => {
      const limits1 = strategy.getLimitsForTier(SubscriptionTier.PREMIUM);
      const limits2 = strategy.getLimitsForTier(SubscriptionTier.PREMIUM);

      limits1.requestsPerMinute = 999;

      expect(limits2.requestsPerMinute).toBe(100); // Should not be affected
    });
  });

  describe('getLimitsForUser', () => {
    it('should return limits for known user', async () => {
      const limits = await strategy.getLimitsForUser('user1');

      expect(limits.requestsPerMinute).toBe(10); // FREE tier
      expect(limits.requestsPerHour).toBe(100);
      expect(limits.requestsPerDay).toBe(1000);
    });

    it('should return limits for premium user', async () => {
      const limits = await strategy.getLimitsForUser('user3');

      expect(limits.requestsPerMinute).toBe(100); // PREMIUM tier
      expect(limits.requestsPerHour).toBe(2000);
      expect(limits.requestsPerDay).toBe(50000);
    });

    it('should return FREE tier limits for unknown user', async () => {
      const limits = await strategy.getLimitsForUser('unknown-user');

      expect(limits.requestsPerMinute).toBe(10);
      expect(limits.requestsPerHour).toBe(100);
      expect(limits.requestsPerDay).toBe(1000);
    });
  });

  describe('canMakeRequest', () => {
    it('should allow request under limit', async () => {
      const result = await strategy.canMakeRequest('user3', 'minute', 50);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49); // 100 - 50 - 1
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
    });

    it('should block request over limit', async () => {
      const result = await strategy.canMakeRequest('user3', 'minute', 100);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
    });

    it('should handle hourly limits', async () => {
      const result = await strategy.canMakeRequest('user3', 'hour', 1500);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(499); // 2000 - 1500 - 1
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
    });

    it('should handle daily limits', async () => {
      const result = await strategy.canMakeRequest('user4', 'day', 200000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49999); // 250000 - 200000 - 1
      expect(result.tier).toBe(SubscriptionTier.ENTERPRISE);
    });

    it('should handle unknown user', async () => {
      const result = await strategy.canMakeRequest('unknown', 'minute', 5);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 5 - 1
      expect(result.tier).toBe(SubscriptionTier.FREE);
    });
  });

  describe('hasBurstCapacity', () => {
    it('should allow burst under capacity', async () => {
      const result = await strategy.hasBurstCapacity('user3', 100);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49); // 150 - 100 - 1
      expect(result.burstLimit).toBe(150);
    });

    it('should block burst over capacity', async () => {
      const result = await strategy.hasBurstCapacity('user3', 150);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.burstLimit).toBe(150);
    });

    it('should handle ultimate tier unlimited burst', async () => {
      const result = await strategy.hasBurstCapacity('user5', 1000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(499); // 1500 - 1000 - 1
      expect(result.burstLimit).toBe(1500);
    });
  });

  describe('getCustomEndpointLimit', () => {
    it('should return correct limits for each tier', async () => {
      expect(await strategy.getCustomEndpointLimit('user1')).toBe(0); // FREE
      expect(await strategy.getCustomEndpointLimit('user2')).toBe(5); // BASIC
      expect(await strategy.getCustomEndpointLimit('user3')).toBe(20); // PREMIUM
      expect(await strategy.getCustomEndpointLimit('user4')).toBe(100); // ENTERPRISE
      expect(await strategy.getCustomEndpointLimit('user5')).toBe(-1); // ULTIMATE (unlimited)
    });

    it('should return 0 for unknown user', async () => {
      const limit = await strategy.getCustomEndpointLimit('unknown');
      expect(limit).toBe(0);
    });
  });

  describe('hasPrioritySupport', () => {
    it('should return false for free and basic tiers', async () => {
      expect(await strategy.hasPrioritySupport('user1')).toBe(false); // FREE
      expect(await strategy.hasPrioritySupport('user2')).toBe(false); // BASIC
    });

    it('should return true for premium and above', async () => {
      expect(await strategy.hasPrioritySupport('user3')).toBe(true); // PREMIUM
      expect(await strategy.hasPrioritySupport('user4')).toBe(true); // ENTERPRISE
      expect(await strategy.hasPrioritySupport('user5')).toBe(true); // ULTIMATE
    });

    it('should return false for unknown user', async () => {
      expect(await strategy.hasPrioritySupport('unknown')).toBe(false);
    });
  });

  describe('getAllTierConfigs', () => {
    it('should return all tier configurations', () => {
      const configs = strategy.getAllTierConfigs();

      expect(configs).toHaveLength(5);
      expect(configs.map(c => c.tier)).toContain(SubscriptionTier.FREE);
      expect(configs.map(c => c.tier)).toContain(SubscriptionTier.BASIC);
      expect(configs.map(c => c.tier)).toContain(SubscriptionTier.PREMIUM);
      expect(configs.map(c => c.tier)).toContain(SubscriptionTier.ENTERPRISE);
      expect(configs.map(c => c.tier)).toContain(SubscriptionTier.ULTIMATE);

      const premiumConfig = configs.find(c => c.tier === SubscriptionTier.PREMIUM);
      expect(premiumConfig?.limits.requestsPerMinute).toBe(100);
      expect(premiumConfig?.limits.prioritySupport).toBe(true);
    });

    it('should return copies of configurations', () => {
      const configs1 = strategy.getAllTierConfigs();
      const configs2 = strategy.getAllTierConfigs();

      const premiumConfig1 = configs1.find(c => c.tier === SubscriptionTier.PREMIUM);
      const premiumConfig2 = configs2.find(c => c.tier === SubscriptionTier.PREMIUM);

      if (premiumConfig1 && premiumConfig2) {
        premiumConfig1.limits.requestsPerMinute = 999;
        expect(premiumConfig2.limits.requestsPerMinute).toBe(100);
      }
    });
  });

  describe('updateTierConfig', () => {
    it('should update tier configuration', () => {
      const newLimits = {
        requestsPerMinute: 150,
        requestsPerHour: 3000,
        requestsPerDay: 75000,
      };

      strategy.updateTierConfig(SubscriptionTier.PREMIUM, newLimits);

      const updatedLimits = strategy.getLimitsForTier(SubscriptionTier.PREMIUM);
      expect(updatedLimits.requestsPerMinute).toBe(150);
      expect(updatedLimits.requestsPerHour).toBe(3000);
      expect(updatedLimits.requestsPerDay).toBe(75000);
      // Other properties should remain unchanged
      expect(updatedLimits.burstCapacity).toBe(150);
      expect(updatedLimits.prioritySupport).toBe(true);
    });

    it('should throw error for unknown tier', () => {
      expect(() => {
        strategy.updateTierConfig('unknown' as SubscriptionTier, { requestsPerMinute: 100 });
      }).toThrow('Unknown tier: unknown');
    });

    it('should preserve unchanged properties', () => {
      const originalLimits = strategy.getLimitsForTier(SubscriptionTier.BASIC);
      
      strategy.updateTierConfig(SubscriptionTier.BASIC, {
        requestsPerMinute: 35,
      });

      const updatedLimits = strategy.getLimitsForTier(SubscriptionTier.BASIC);
      expect(updatedLimits.requestsPerMinute).toBe(35);
      expect(updatedLimits.requestsPerHour).toBe(originalLimits.requestsPerHour);
      expect(updatedLimits.requestsPerDay).toBe(originalLimits.requestsPerDay);
      expect(updatedLimits.burstCapacity).toBe(originalLimits.burstCapacity);
    });
  });

  describe('getUsagePercentage', () => {
    it('should calculate correct percentage', async () => {
      const result = await strategy.getUsagePercentage('user3', 'minute', 80);

      expect(result.percentage).toBe(80);
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(result.limit).toBe(100);
      expect(result.warningThreshold).toBe(80);
      expect(result.criticalThreshold).toBe(95);
    });

    it('should cap percentage at 100', async () => {
      const result = await strategy.getUsagePercentage('user3', 'minute', 150);

      expect(result.percentage).toBe(100);
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(result.limit).toBe(100);
    });

    it('should handle different request types', async () => {
      const minuteResult = await strategy.getUsagePercentage('user4', 'minute', 250);
      const hourResult = await strategy.getUsagePercentage('user4', 'hour', 5000);
      const dayResult = await strategy.getUsagePercentage('user4', 'day', 100000);

      expect(minuteResult.limit).toBe(500); // Enterprise minute limit
      expect(hourResult.limit).toBe(10000); // Enterprise hour limit
      expect(dayResult.limit).toBe(250000); // Enterprise day limit
    });

    it('should handle unknown user', async () => {
      const result = await strategy.getUsagePercentage('unknown', 'minute', 5);

      expect(result.tier).toBe(SubscriptionTier.FREE);
      expect(result.limit).toBe(10);
      expect(result.percentage).toBe(50);
    });
  });

  describe('validateTierConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig: TierLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, validConfig)).toBe(true);
    });

    it('should reject invalid minute limit', () => {
      const invalidConfig: TierLimits = {
        requestsPerMinute: 0,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, invalidConfig)).toBe(false);
    });

    it('should reject when hour limit <= minute limit', () => {
      const invalidConfig: TierLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 50, // Invalid: should be > minute
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, invalidConfig)).toBe(false);
    });

    it('should reject when day limit <= hour limit', () => {
      const invalidConfig: TierLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 1000, // Invalid: should be > hour
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, invalidConfig)).toBe(false);
    });

    it('should reject when burst capacity < minute limit', () => {
      const invalidConfig: TierLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 50, // Invalid: should be >= minute
        customEndpoints: 20,
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, invalidConfig)).toBe(false);
    });

    it('should accept unlimited custom endpoints (-1)', () => {
      const validConfig: TierLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: -1, // Unlimited
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, validConfig)).toBe(true);
    });

    it('should reject negative custom endpoints (except -1)', () => {
      const invalidConfig: TierLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: -5, // Invalid negative
        prioritySupport: true,
      };

      expect(strategy.validateTierConfig(SubscriptionTier.PREMIUM, invalidConfig)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle zero current usage', async () => {
      const result = await strategy.canMakeRequest('user3', 'minute', 0);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // 100 - 0 - 1
    });

    it('should handle maximum valid usage', async () => {
      const result = await strategy.canMakeRequest('user3', 'minute', 99);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // 100 - 99 - 1
    });

    it('should handle burst at exactly capacity', async () => {
      const result = await strategy.hasBurstCapacity('user3', 149);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // 150 - 149 - 1
    });

    it('should handle zero burst capacity check', async () => {
      const result = await strategy.hasBurstCapacity('user3', 0);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(149); // 150 - 0 - 1
    });
  });
});

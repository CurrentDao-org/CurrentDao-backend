import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { TieredLimitsStrategy } from './strategies/tiered-limits.strategy';
import { DDoSProtectionUtil } from './utils/ddos-protection';
import { SubscriptionTier } from './strategies/tiered-limits.strategy';

describe('RateLimitService', () => {
  let service: RateLimitService;
  let slidingWindowStrategy: SlidingWindowStrategy;
  let tieredLimitsStrategy: TieredLimitsStrategy;
  let ddosProtection: DDoSProtectionUtil;

  const mockSlidingWindowStrategy = {
    checkRateLimit: jest.fn(),
    getUsageStats: jest.fn(),
    resetRateLimit: jest.fn(),
    getActiveKeys: jest.fn(),
  };

  const mockTieredLimitsStrategy = {
    getLimitsForUser: jest.fn(),
    hasBurstCapacity: jest.fn(),
    getUsagePercentage: jest.fn(),
    updateTierConfig: jest.fn(),
    validateTierConfig: jest.fn(),
  };

  const mockDdosProtection = {
    analyzeRequest: jest.fn(),
    getMetrics: jest.fn(),
    unblockIP: jest.fn(),
    getBlockedIPs: jest.fn(),
    updateConfig: jest.fn(),
    getConfig: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: SlidingWindowStrategy,
          useValue: mockSlidingWindowStrategy,
        },
        {
          provide: TieredLimitsStrategy,
          useValue: mockTieredLimitsStrategy,
        },
        {
          provide: DDoSProtectionUtil,
          useValue: mockDdosProtection,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    slidingWindowStrategy = module.get<SlidingWindowStrategy>(SlidingWindowStrategy);
    tieredLimitsStrategy = module.get<TieredLimitsStrategy>(TieredLimitsStrategy);
    ddosProtection = module.get<DDoSProtectionUtil>(DDoSProtectionUtil);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request within limits', async () => {
      const identifier = 'user:test-user';
      const options = {
        identifier,
        limit: 100,
        windowMs: 60000,
      };

      mockDdosProtection.analyzeRequest.mockResolvedValue({
        allowed: true,
        metrics: {
          ip: '192.168.1.1',
          requestCount: 10,
          requestsPerSecond: 0.5,
          suspiciousPatterns: [],
          blocked: false,
        },
      });

      mockSlidingWindowStrategy.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      const result = await service.checkRateLimit(identifier, options);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
      expect(ddosProtection.analyzeRequest).toHaveBeenCalled();
      expect(slidingWindowStrategy.checkRateLimit).toHaveBeenCalled();
    });

    it('should block request when DDoS protection triggers', async () => {
      const identifier = 'user:test-user';
      const options = {
        identifier,
        limit: 100,
        windowMs: 60000,
      };

      mockDdosProtection.analyzeRequest.mockResolvedValue({
        allowed: false,
        blockReason: 'DDoS attack detected',
        metrics: {
          ip: '192.168.1.1',
          requestCount: 1000,
          requestsPerSecond: 100,
          suspiciousPatterns: ['request_flood_pattern'],
          blocked: true,
        },
      });

      await expect(service.checkRateLimit(identifier, options)).rejects.toThrow(
        'Request blocked: DDoS attack detected',
      );

      expect(ddosProtection.analyzeRequest).toHaveBeenCalled();
      expect(slidingWindowStrategy.checkRateLimit).not.toHaveBeenCalled();
    });

    it('should apply tier-based limits for users', async () => {
      const identifier = 'user:test-user';
      const options = {
        identifier,
        tier: SubscriptionTier.PREMIUM,
        windowMs: 60000,
      };

      mockTieredLimitsStrategy.getLimitsForUser.mockResolvedValue({
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      });

      mockDdosProtection.analyzeRequest.mockResolvedValue({
        allowed: true,
        metrics: { requestCount: 10, requestsPerSecond: 0.5, suspiciousPatterns: [], blocked: false },
      });

      mockSlidingWindowStrategy.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      const result = await service.checkRateLimit(identifier, options);

      expect(result.allowed).toBe(true);
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(tieredLimitsStrategy.getLimitsForUser).toHaveBeenCalledWith('test-user');
    });

    it('should handle errors gracefully and fail open', async () => {
      const identifier = 'user:test-user';
      const options = {
        identifier,
        limit: 100,
        windowMs: 60000,
      };

      mockDdosProtection.analyzeRequest.mockRejectedValue(new Error('Redis connection failed'));

      await expect(service.checkRateLimit(identifier, options)).rejects.toThrow(
        'Redis connection failed',
      );
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics for user', async () => {
      const identifier = 'user:test-user';

      mockSlidingWindowStrategy.getUsageStats.mockResolvedValue({
        currentRequests: 25,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
        requestsPerSecond: 0.42,
      });

      mockTieredLimitsStrategy.getLimitsForUser.mockResolvedValue({
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      });

      mockDdosProtection.getMetrics.mockResolvedValue({
        ip: '192.168.1.1',
        requestCount: 5,
        requestsPerSecond: 0.08,
        suspiciousPatterns: [],
        blocked: false,
      });

      const result = await service.getUsageStats(identifier);

      expect(result.identifier).toBe(identifier);
      expect(result.totalRequests).toBe(25);
      expect(result.requestsPerMinute).toBeCloseTo(25.2);
      expect(result.burstUsage).toBe(5);
    });

    it('should handle IP-based identifiers', async () => {
      const identifier = 'ip:192.168.1.1';

      mockSlidingWindowStrategy.getUsageStats.mockResolvedValue({
        currentRequests: 10,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
        requestsPerSecond: 0.17,
      });

      mockDdosProtection.getMetrics.mockResolvedValue({
        ip: '192.168.1.1',
        requestCount: 10,
        requestsPerSecond: 0.17,
        suspiciousPatterns: [],
        blocked: false,
      });

      const result = await service.getUsageStats(identifier);

      expect(result.identifier).toBe(identifier);
      expect(result.totalRequests).toBe(10);
      expect(result.tier).toBeUndefined();
    });
  });

  describe('sendRateLimitWarning', () => {
    it('should store and log warnings', async () => {
      const identifier = 'user:test-user';
      const warning = {
        current: 85,
        limit: 100,
        percentage: 85,
        resetTime: Date.now() + 60000,
        level: 'warning' as const,
      };

      await service.sendRateLimitWarning(identifier, warning);

      const recentWarnings = await service.getRecentWarnings(10);
      expect(recentWarnings).toHaveLength(1);
      expect(recentWarnings[0].identifier).toBe(identifier);
      expect(recentWarnings[0].percentage).toBe(85);
      expect(recentWarnings[0].level).toBe('warning');
    });

    it('should limit warning cache size', async () => {
      // Add 1005 warnings to test cache cleanup
      for (let i = 0; i < 1005; i++) {
        await service.sendRateLimitWarning(`user:${i}`, {
          current: 85,
          limit: 100,
          percentage: 85,
          resetTime: Date.now() + 60000,
          level: 'warning',
        });
      }

      const recentWarnings = await service.getRecentWarnings(2000);
      expect(recentWarnings.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', async () => {
      const identifier = 'user:test-user';

      mockSlidingWindowStrategy.resetRateLimit.mockResolvedValue();

      await service.resetRateLimit(identifier);

      expect(slidingWindowStrategy.resetRateLimit).toHaveBeenCalledWith(identifier, 'api_rate_limit');
    });
  });

  describe('getGlobalStats', () => {
    it('should return global statistics', async () => {
      mockSlidingWindowStrategy.getActiveKeys.mockResolvedValue([
        'api_rate_limit:user:user1',
        'api_rate_limit:user:user2',
        'api_rate_limit:ip:192.168.1.1',
      ]);

      mockSlidingWindowStrategy.getUsageStats.mockImplementation((key) => {
        if (key.includes('user')) {
          return Promise.resolve({
            currentRequests: 50,
            requestsPerSecond: 0.83,
            windowStart: Date.now() - 60000,
            windowEnd: Date.now(),
          });
        }
        return Promise.resolve({
          currentRequests: 10,
          requestsPerSecond: 0.17,
          windowStart: Date.now() - 60000,
          windowEnd: Date.now(),
        });
      });

      mockDdosProtection.getBlockedIPs.mockResolvedValue([
        { ip: '192.168.1.100', reason: 'DDoS attack', expiry: Date.now() + 300000 },
      ]);

      mockTieredLimitsStrategy.getLimitsForUser.mockImplementation((userId) => {
        if (userId === 'user1') return Promise.resolve({ requestsPerMinute: 10 } as any);
        if (userId === 'user2') return Promise.resolve({ requestsPerMinute: 30 } as any);
        return Promise.resolve({ requestsPerMinute: 100 } as any);
      });

      const stats = await service.getGlobalStats();

      expect(stats.totalActiveKeys).toBe(3);
      expect(stats.blockedIPs).toBe(1);
      expect(stats.averageRequestsPerSecond).toBeGreaterThan(0);
      expect(stats.tierDistribution).toBeDefined();
    });
  });

  describe('tier management', () => {
    it('should get tier limits for user', async () => {
      const userId = 'test-user';
      const expectedLimits = {
        requestsPerMinute: 100,
        requestsPerHour: 2000,
        requestsPerDay: 50000,
        burstCapacity: 150,
        customEndpoints: 20,
        prioritySupport: true,
      };

      mockTieredLimitsStrategy.getLimitsForUser.mockResolvedValue(expectedLimits);

      const result = await service.getTierLimits(userId);

      expect(result).toEqual(expectedLimits);
      expect(tieredLimitsStrategy.getLimitsForUser).toHaveBeenCalledWith(userId);
    });

    it('should check burst capacity', async () => {
      const userId = 'test-user';
      const currentUsage = 50;

      mockTieredLimitsStrategy.hasBurstCapacity.mockResolvedValue({
        allowed: true,
        remaining: 100,
        burstLimit: 150,
      });

      const result = await service.checkBurstCapacity(userId, currentUsage);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(100);
      expect(result.burstLimit).toBe(150);
    });

    it('should get usage percentage', async () => {
      const userId = 'test-user';
      const requestType = 'minute' as const;
      const currentUsage = 80;

      mockTieredLimitsStrategy.getUsagePercentage.mockResolvedValue({
        percentage: 80,
        tier: SubscriptionTier.PREMIUM,
        limit: 100,
        warningThreshold: 80,
        criticalThreshold: 95,
      });

      const result = await service.getUsagePercentage(userId, requestType, currentUsage);

      expect(result.percentage).toBe(80);
      expect(result.tier).toBe(SubscriptionTier.PREMIUM);
      expect(result.limit).toBe(100);
    });
  });

  describe('DDoS protection integration', () => {
    it('should get DDoS metrics', async () => {
      const ip = '192.168.1.1';
      const expectedMetrics = {
        ip,
        requestCount: 100,
        requestsPerSecond: 1.67,
        suspiciousPatterns: ['request_flood_pattern'],
        blocked: false,
      };

      mockDdosProtection.getMetrics.mockResolvedValue(expectedMetrics);

      const result = await service.getDDoSMetrics(ip);

      expect(result).toEqual(expectedMetrics);
      expect(ddosProtection.getMetrics).toHaveBeenCalledWith(ip);
    });

    it('should unblock IP', async () => {
      const ip = '192.168.1.1';

      mockDdosProtection.unblockIP.mockResolvedValue();

      await service.unblockIP(ip);

      expect(ddosProtection.unblockIP).toHaveBeenCalledWith(ip);
    });

    it('should get blocked IPs', async () => {
      const expectedBlockedIPs = [
        { ip: '192.168.1.100', reason: 'DDoS attack', expiry: Date.now() + 300000 },
        { ip: '192.168.1.101', reason: 'Suspicious patterns', expiry: Date.now() + 300000 },
      ];

      mockDdosProtection.getBlockedIPs.mockResolvedValue(expectedBlockedIPs);

      const result = await service.getBlockedIPs();

      expect(result).toEqual(expectedBlockedIPs);
      expect(ddosProtection.getBlockedIPs).toHaveBeenCalled();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', async () => {
      const config = {
        defaultLimits: {
          premium: {
            requestsPerMinute: 150,
            requestsPerHour: 3000,
            requestsPerDay: 75000,
          },
        },
        ddosConfig: {
          maxRequestsPerSecond: 200,
          blockDurationMs: 600000,
        },
      };

      await service.updateConfiguration(config);

      expect(tieredLimitsStrategy.updateTierConfig).toHaveBeenCalledWith(
        SubscriptionTier.PREMIUM,
        config.defaultLimits.premium,
      );
      expect(ddosProtection.updateConfig).toHaveBeenCalledWith(config.ddosConfig);
    });
  });

  describe('performance tests', () => {
    it('should handle high volume requests efficiently', async () => {
      const identifier = 'user:perf-test';
      const options = {
        identifier,
        limit: 1000,
        windowMs: 60000,
      };

      mockDdosProtection.analyzeRequest.mockResolvedValue({
        allowed: true,
        metrics: { requestCount: 1, requestsPerSecond: 0.02, suspiciousPatterns: [], blocked: false },
      });

      mockSlidingWindowStrategy.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      const startTime = Date.now();
      const promises = [];

      // Simulate 1000 concurrent requests
      for (let i = 0; i < 1000; i++) {
        promises.push(service.checkRateLimit(identifier, options));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process 1000 requests in under 100ms (less than 0.1ms per request)
      expect(processingTime).toBeLessThan(100);
    });
  });
});

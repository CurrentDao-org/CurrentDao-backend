import { Test, TestingModule } from '@nestjs/testing';
import { SlidingWindowStrategy, SlidingWindowOptions, RateLimitResult } from './sliding-window.strategy';
import { RedisProvider } from '../../cache/providers/redis.provider';

describe('SlidingWindowStrategy', () => {
  let strategy: SlidingWindowStrategy;
  let redisProvider: RedisProvider;

  const mockRedisProvider = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlidingWindowStrategy,
        {
          provide: RedisProvider,
          useValue: mockRedisProvider,
        },
      ],
    }).compile();

    strategy = module.get<SlidingWindowStrategy>(SlidingWindowStrategy);
    redisProvider = module.get<RedisProvider>(RedisProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    const defaultOptions: SlidingWindowOptions = {
      windowSizeMs: 60000,
      maxRequests: 100,
      keyPrefix: 'test',
    };

    it('should allow request when under limit', async () => {
      const identifier = 'user:test-user';
      
      mockRedisProvider.get.mockResolvedValue(null);
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, defaultOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
      expect(result.totalRequests).toBe(1);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should block request when over limit', async () => {
      const identifier = 'user:test-user';
      
      // Mock existing requests at limit
      mockRedisProvider.get.mockResolvedValue('100');
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, defaultOptions);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.totalRequests).toBe(100);
    });

    it('should handle partial remaining requests', async () => {
      const identifier = 'user:test-user';
      
      // Mock 80 existing requests
      mockRedisProvider.get.mockResolvedValue('80');
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, defaultOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(19); // 100 - 80 - 1 current
      expect(result.totalRequests).toBe(81);
    });

    it('should use custom key prefix', async () => {
      const identifier = 'user:test-user';
      const options = { ...defaultOptions, keyPrefix: 'custom' };
      
      mockRedisProvider.get.mockResolvedValue(null);
      mockRedisProvider.set.mockResolvedValue();

      await strategy.checkRateLimit(identifier, options);

      expect(redisProvider.get).toHaveBeenCalledWith('rate_limit', 'cleanup:custom:user:test-user');
    });

    it('should fail open when Redis is unavailable', async () => {
      const identifier = 'user:test-user';
      
      mockRedisProvider.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await strategy.checkRateLimit(identifier, defaultOptions);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    it('should handle different window sizes', async () => {
      const identifier = 'user:test-user';
      const options = { ...defaultOptions, windowSizeMs: 30000 };
      
      mockRedisProvider.get.mockResolvedValue(null);
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, options);

      expect(result.allowed).toBe(true);
      expect(result.windowEnd - result.windowStart).toBeLessThanOrEqual(30000);
    });

    it('should handle high limits efficiently', async () => {
      const identifier = 'user:high-volume';
      const options = { ...defaultOptions, maxRequests: 10000 };
      
      mockRedisProvider.get.mockResolvedValue('5000');
      mockRedisProvider.set.mockResolvedValue();

      const startTime = Date.now();
      const result = await strategy.checkRateLimit(identifier, options);
      const endTime = Date.now();

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4999);
      expect(endTime - startTime).toBeLessThan(5); // Should complete in under 5ms
    });
  });

  describe('getUsageStats', () => {
    it('should return current usage statistics', async () => {
      const identifier = 'user:test-user';
      const windowSizeMs = 60000;
      
      mockRedisProvider.get.mockResolvedValue('50');

      const stats = await strategy.getUsageStats(identifier, windowSizeMs);

      expect(stats.currentRequests).toBe(50);
      expect(stats.requestsPerSecond).toBeCloseTo(50 / 60, 2);
      expect(stats.windowEnd).toBeGreaterThan(stats.windowStart);
    });

    it('should handle zero requests', async () => {
      const identifier = 'user:new-user';
      const windowSizeMs = 60000;
      
      mockRedisProvider.get.mockResolvedValue('0');

      const stats = await strategy.getUsageStats(identifier, windowSizeMs);

      expect(stats.currentRequests).toBe(0);
      expect(stats.requestsPerSecond).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      const identifier = 'user:test-user';
      const windowSizeMs = 60000;
      
      mockRedisProvider.get.mockRejectedValue(new Error('Redis error'));

      const stats = await strategy.getUsageStats(identifier, windowSizeMs);

      expect(stats.currentRequests).toBe(0);
      expect(stats.requestsPerSecond).toBe(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', async () => {
      const identifier = 'user:test-user';
      const keyPrefix = 'test';
      
      mockRedisProvider.del.mockResolvedValue();

      await strategy.resetRateLimit(identifier, keyPrefix);

      expect(redisProvider.del).toHaveBeenCalledWith('rate_limit', `${keyPrefix}:${identifier}`);
    });

    it('should use default key prefix', async () => {
      const identifier = 'user:test-user';
      
      mockRedisProvider.del.mockResolvedValue();

      await strategy.resetRateLimit(identifier);

      expect(redisProvider.del).toHaveBeenCalledWith('rate_limit', `rate_limit:${identifier}`);
    });

    it('should handle reset errors gracefully', async () => {
      const identifier = 'user:test-user';
      
      mockRedisProvider.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(strategy.resetRateLimit(identifier)).resolves.toBeUndefined();
    });
  });

  describe('getActiveKeys', () => {
    it('should return active rate limit keys', async () => {
      const keyPrefix = 'test';
      const expectedKeys = [
        'test:user:user1',
        'test:user:user2',
        'test:ip:192.168.1.1',
      ];
      
      mockRedisProvider.keys.mockResolvedValue(expectedKeys);

      const keys = await strategy.getActiveKeys(keyPrefix);

      expect(keys).toEqual(expectedKeys);
      expect(redisProvider.keys).toHaveBeenCalledWith('rate_limit', `${keyPrefix}:*`);
    });

    it('should use default key prefix', async () => {
      const expectedKeys = ['rate_limit:user:user1'];
      
      mockRedisProvider.keys.mockResolvedValue(expectedKeys);

      const keys = await strategy.getActiveKeys();

      expect(keys).toEqual(expectedKeys);
      expect(redisProvider.keys).toHaveBeenCalledWith('rate_limit', 'rate_limit:*');
    });

    it('should handle empty results', async () => {
      mockRedisProvider.keys.mockResolvedValue([]);

      const keys = await strategy.getActiveKeys();

      expect(keys).toEqual([]);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisProvider.keys.mockRejectedValue(new Error('Redis error'));

      const keys = await strategy.getActiveKeys();

      expect(keys).toEqual([]);
    });
  });

  describe('performance tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const identifier = 'user:concurrent-test';
      const options: SlidingWindowOptions = {
        windowSizeMs: 60000,
        maxRequests: 1000,
        keyPrefix: 'perf',
      };
      
      mockRedisProvider.get.mockResolvedValue('100');
      mockRedisProvider.set.mockResolvedValue();

      const startTime = Date.now();
      const promises = [];

      // Simulate 100 concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(strategy.checkRateLimit(identifier, options));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in under 50ms
      results.forEach(result => {
        expect(result.allowed).toBe(true);
      });
    });

    it('should maintain performance with high request counts', async () => {
      const identifier = 'user:high-perf';
      const options: SlidingWindowOptions = {
        windowSizeMs: 60000,
        maxRequests: 100000,
        keyPrefix: 'high-perf',
      };
      
      mockRedisProvider.get.mockResolvedValue('50000');
      mockRedisProvider.set.mockResolvedValue();

      const startTime = Date.now();
      const result = await strategy.checkRateLimit(identifier, options);
      const endTime = Date.now();

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(49999);
      expect(endTime - startTime).toBeLessThan(2); // Should complete in under 2ms even with high counts
    });
  });

  describe('edge cases', () => {
    it('should handle very small windows', async () => {
      const identifier = 'user:small-window';
      const options: SlidingWindowOptions = {
        windowSizeMs: 1000, // 1 second
        maxRequests: 10,
        keyPrefix: 'small',
      };
      
      mockRedisProvider.get.mockResolvedValue('5');
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, options);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.windowEnd - result.windowStart).toBeLessThanOrEqual(1000);
    });

    it('should handle very large windows', async () => {
      const identifier = 'user:large-window';
      const options: SlidingWindowOptions = {
        windowSizeMs: 86400000, // 24 hours
        maxRequests: 1000000,
        keyPrefix: 'large',
      };
      
      mockRedisProvider.get.mockResolvedValue('500000');
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, options);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(499999);
      expect(result.windowEnd - result.windowStart).toBeLessThanOrEqual(86400000);
    });

    it('should handle zero max requests', async () => {
      const identifier = 'user:zero-limit';
      const options: SlidingWindowOptions = {
        windowSizeMs: 60000,
        maxRequests: 0,
        keyPrefix: 'zero',
      };
      
      mockRedisProvider.get.mockResolvedValue('0');
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, options);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle invalid Redis responses', async () => {
      const identifier = 'user:invalid-response';
      
      mockRedisProvider.get.mockResolvedValue('invalid_number');
      mockRedisProvider.set.mockResolvedValue();

      const result = await strategy.checkRateLimit(identifier, defaultOptions);

      expect(result.allowed).toBe(true);
      expect(result.totalRequests).toBe(1);
    });
  });
});

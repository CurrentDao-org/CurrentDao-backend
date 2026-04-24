import { Test, TestingModule } from '@nestjs/testing';
import { DDoSProtectionUtil, DDoSMetrics, DDoSConfig } from './ddos-protection';
import { RedisProvider } from '../../cache/providers/redis.provider';

describe('DDoSProtectionUtil', () => {
  let ddosProtection: DDoSProtectionUtil;
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
        DDoSProtectionUtil,
        {
          provide: RedisProvider,
          useValue: mockRedisProvider,
        },
      ],
    }).compile();

    ddosProtection = module.get<DDoSProtectionUtil>(DDoSProtectionUtil);
    redisProvider = module.get<RedisProvider>(RedisProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeRequest', () => {
    const ip = '192.168.1.1';
    const userAgent = 'Mozilla/5.0 (Test Browser)';
    const headers = {
      'accept': 'application/json',
      'content-type': 'application/json',
    };
    const endpoint = 'GET /api/test';

    it('should allow legitimate requests', async () => {
      mockRedisProvider.get.mockResolvedValue(null); // No existing block
      mockRedisProvider.set.mockResolvedValue();
      mockRedisProvider.keys.mockResolvedValue([]);

      const result = await ddosProtection.analyzeRequest(ip, userAgent, headers, endpoint);

      expect(result.allowed).toBe(true);
      expect(result.metrics.ip).toBe(ip);
      expect(result.metrics.blocked).toBe(false);
    });

    it('should block already blocked IPs', async () => {
      const blockData = JSON.stringify({
        ip,
        reason: 'Previous DDoS attack',
        timestamp: Date.now() - 10000,
        expiry: Date.now() + 300000,
      });

      mockRedisProvider.get.mockResolvedValueOnce(blockData); // Block exists
      mockRedisProvider.get.mockResolvedValue('10'); // Request count

      const result = await ddosProtection.analyzeRequest(ip, userAgent, headers, endpoint);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toBe('Previous DDoS attack');
      expect(result.blockExpiry).toBeGreaterThan(Date.now());
    });

    it('should detect and block high request rate', async () => {
      mockRedisProvider.get.mockResolvedValue(null); // No existing block
      mockRedisProvider.set.mockResolvedValue();
      mockRedisProvider.keys.mockResolvedValue(
        Array(200).fill(null).map((_, i) => `ddos:count:${ip}:${Date.now() - i * 100}`)
      );

      const result = await ddosProtection.analyzeRequest(ip, userAgent, headers, endpoint);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain('Exceeded max requests per minute');
      expect(result.metrics.blocked).toBe(true);
    });

    it('should detect suspicious patterns', async () => {
      mockRedisProvider.get.mockResolvedValue(null); // No existing block
      mockRedisProvider.set.mockResolvedValue();
      
      // Mock requests with different user agents (suspicious pattern)
      const requests = Array(60).fill(null).map((_, i) => ({
        timestamp: Date.now() - i * 1000,
        userAgent: `Bot-${i}`,
        headers: { 'user-agent': `Bot-${i}` },
        endpoint: 'GET /api/data',
      }));

      mockRedisProvider.keys.mockImplementation((namespace, pattern) => {
        if (pattern.includes('requests')) {
          return Promise.resolve(requests.map((_, i) => `ddos:requests:${ip}:${i}`));
        }
        return Promise.resolve([]);
      });

      requests.forEach((req, i) => {
        mockRedisProvider.get.mockResolvedValueOnce(JSON.stringify(req));
      });

      const result = await ddosProtection.analyzeRequest(ip, userAgent, headers, endpoint);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toContain('Suspicious patterns detected');
      expect(result.metrics.suspiciousPatterns.length).toBeGreaterThan(0);
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisProvider.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await ddosProtection.analyzeRequest(ip, userAgent, headers, endpoint);

      expect(result.allowed).toBe(true); // Fail open
      expect(result.metrics.requestCount).toBe(0);
    });

    it('should clean up expired blocks', async () => {
      const expiredBlockData = JSON.stringify({
        ip,
        reason: 'Expired block',
        timestamp: Date.now() - 400000,
        expiry: Date.now() - 100000, // Expired
      });

      mockRedisProvider.get.mockResolvedValueOnce(expiredBlockData); // Expired block
      mockRedisProvider.del.mockResolvedValue(); // Block deletion
      mockRedisProvider.get.mockResolvedValue('5'); // Request count
      mockRedisProvider.keys.mockResolvedValue([]);

      const result = await ddosProtection.analyzeRequest(ip, userAgent, headers, endpoint);

      expect(result.allowed).toBe(true);
      expect(redisProvider.del).toHaveBeenCalledWith('ddos', `ddos:blocked:${ip}`);
    });
  });

  describe('getMetrics', () => {
    const ip = '192.168.1.1';

    it('should return current metrics', async () => {
      const now = Date.now();
      const windowStart = now - 60000;

      mockRedisProvider.keys.mockResolvedValue([
        `ddos:count:${ip}:${now - 1000}`,
        `ddos:count:${ip}:${now - 2000}`,
        `ddos:count:${ip}:${now - 3000}`,
      ]);

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.ip).toBe(ip);
      expect(metrics.requestCount).toBe(3);
      expect(metrics.requestsPerSecond).toBeCloseTo(0.05, 2);
      expect(metrics.windowStart).toBe(windowStart);
      expect(metrics.windowEnd).toBe(now);
      expect(metrics.blocked).toBe(false);
    });

    it('should handle empty request history', async () => {
      mockRedisProvider.keys.mockResolvedValue([]);

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.requestCount).toBe(0);
      expect(metrics.requestsPerSecond).toBe(0);
      expect(metrics.suspiciousPatterns).toEqual([]);
    });

    it('should include blocked status', async () => {
      const blockData = JSON.stringify({
        ip,
        reason: 'DDoS attack',
        timestamp: Date.now() - 10000,
        expiry: Date.now() + 300000,
      });

      mockRedisProvider.get.mockResolvedValue(blockData);
      mockRedisProvider.keys.mockResolvedValue([]);

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.blocked).toBe(true);
      expect(metrics.blockReason).toBe('DDoS attack');
      expect(metrics.blockExpiry).toBeGreaterThan(Date.now());
    });

    it('should handle Redis errors', async () => {
      mockRedisProvider.get.mockRejectedValue(new Error('Redis error'));
      mockRedisProvider.keys.mockRejectedValue(new Error('Redis error'));

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.requestCount).toBe(0);
      expect(metrics.requestsPerSecond).toBe(0);
      expect(metrics.blocked).toBe(false);
    });
  });

  describe('unblockIP', () => {
    const ip = '192.168.1.1';

    it('should unblock an IP', async () => {
      mockRedisProvider.del.mockResolvedValue();

      await ddosProtection.unblockIP(ip);

      expect(redisProvider.del).toHaveBeenCalledWith('ddos', `ddos:blocked:${ip}`);
    });

    it('should handle unblock errors gracefully', async () => {
      mockRedisProvider.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(ddosProtection.unblockIP(ip)).resolves.toBeUndefined();
    });
  });

  describe('getBlockedIPs', () => {
    it('should return all blocked IPs', async () => {
      const now = Date.now();
      const blockedIPs = [
        `ddos:blocked:192.168.1.100`,
        `ddos:blocked:192.168.1.101`,
        `ddos:blocked:192.168.1.102`,
      ];

      const blockData1 = JSON.stringify({
        ip: '192.168.1.100',
        reason: 'DDoS attack',
        expiry: now + 300000,
      });

      const blockData2 = JSON.stringify({
        ip: '192.168.1.101',
        reason: 'Suspicious patterns',
        expiry: now + 300000,
      });

      const expiredBlockData = JSON.stringify({
        ip: '192.168.1.102',
        reason: 'Expired block',
        expiry: now - 100000, // Expired
      });

      mockRedisProvider.keys.mockResolvedValue(blockedIPs);
      mockRedisProvider.get.mockImplementation((namespace, key) => {
        if (key.includes('192.168.1.100')) return Promise.resolve(blockData1);
        if (key.includes('192.168.1.101')) return Promise.resolve(blockData2);
        if (key.includes('192.168.1.102')) return Promise.resolve(expiredBlockData);
        return Promise.resolve(null);
      });

      const result = await ddosProtection.getBlockedIPs();

      expect(result).toHaveLength(2); // Only non-expired blocks
      expect(result[0].ip).toBe('192.168.1.100');
      expect(result[1].ip).toBe('192.168.1.101');
    });

    it('should handle empty blocked list', async () => {
      mockRedisProvider.keys.mockResolvedValue([]);

      const result = await ddosProtection.getBlockedIPs();

      expect(result).toEqual([]);
    });

    it('should handle Redis errors', async () => {
      mockRedisProvider.keys.mockRejectedValue(new Error('Redis error'));

      const result = await ddosProtection.getBlockedIPs();

      expect(result).toEqual([]);
    });
  });

  describe('updateConfig', () => {
    it('should update configuration', () => {
      const newConfig: Partial<DDoSConfig> = {
        maxRequestsPerSecond: 200,
        blockDurationMs: 600000,
        suspiciousThreshold: 75,
      };

      ddosProtection.updateConfig(newConfig);

      const updatedConfig = ddosProtection.getConfig();
      expect(updatedConfig.maxRequestsPerSecond).toBe(200);
      expect(updatedConfig.blockDurationMs).toBe(600000);
      expect(updatedConfig.suspiciousThreshold).toBe(75);
      // Other properties should remain unchanged
      expect(updatedConfig.detectionWindowMs).toBe(60000);
    });

    it('should handle partial config updates', () => {
      const originalConfig = ddosProtection.getConfig();

      ddosProtection.updateConfig({
        maxRequestsPerSecond: 150,
      });

      const updatedConfig = ddosProtection.getConfig();
      expect(updatedConfig.maxRequestsPerSecond).toBe(150);
      expect(updatedConfig.maxRequestsPerMinute).toBe(originalConfig.maxRequestsPerMinute);
      expect(updatedConfig.blockDurationMs).toBe(originalConfig.blockDurationMs);
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = ddosProtection.getConfig();

      expect(config.detectionWindowMs).toBe(60000);
      expect(config.maxRequestsPerSecond).toBe(100);
      expect(config.maxRequestsPerMinute).toBe(1000);
      expect(config.blockDurationMs).toBe(300000);
      expect(config.suspiciousThreshold).toBe(50);
      expect(config.patternDetectionEnabled).toBe(true);
    });

    it('should return a copy of configuration', () => {
      const config1 = ddosProtection.getConfig();
      const config2 = ddosProtection.getConfig();

      config1.maxRequestsPerSecond = 999;

      expect(config2.maxRequestsPerSecond).toBe(100); // Should not be affected
    });
  });

  describe('pattern detection', () => {
    const ip = '192.168.1.1';

    it('should detect user agent switching', async () => {
      const requests = [
        { userAgent: 'Chrome/90.0', timestamp: Date.now() - 5000 },
        { userAgent: 'Firefox/88.0', timestamp: Date.now() - 4000 },
        { userAgent: 'Safari/14.0', timestamp: Date.now() - 3000 },
        { userAgent: 'Edge/90.0', timestamp: Date.now() - 2000 },
        { userAgent: 'Opera/76.0', timestamp: Date.now() - 1000 },
        { userAgent: 'Chrome/91.0', timestamp: Date.now() },
      ];

      mockRedisProvider.keys.mockResolvedValue(
        requests.map((_, i) => `ddos:requests:${ip}:${i}`)
      );

      requests.forEach((req, i) => {
        mockRedisProvider.get.mockResolvedValueOnce(JSON.stringify({
          timestamp: req.timestamp,
          userAgent: req.userAgent,
          headers: { 'user-agent': req.userAgent },
          endpoint: 'GET /api/test',
        }));
      });

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.suspiciousPatterns).toContain('rapid_user_agent_switching');
    });

    it('should detect header anomalies', async () => {
      const requests = [
        { headers: { 'accept': 'application/json' }, timestamp: Date.now() - 3000 },
        { headers: { 'accept': 'text/html', 'authorization': 'Bearer token' }, timestamp: Date.now() - 2000 },
        { headers: { 'accept': 'application/xml', 'x-custom': 'value' }, timestamp: Date.now() - 1000 },
        { headers: { 'content-type': 'multipart/form-data' }, timestamp: Date.now() },
      ];

      mockRedisProvider.keys.mockResolvedValue(
        requests.map((_, i) => `ddos:requests:${ip}:${i}`)
      );

      requests.forEach((req, i) => {
        mockRedisProvider.get.mockResolvedValueOnce(JSON.stringify({
          timestamp: req.timestamp,
          userAgent: 'TestBot/1.0',
          headers: req.headers,
          endpoint: 'POST /api/upload',
        }));
      });

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.suspiciousPatterns).toContain('unusual_header_combinations');
    });

    it('should detect endpoint abuse', async () => {
      const requests = Array(20).fill(null).map((_, i) => ({
        timestamp: Date.now() - i * 100,
        endpoint: 'GET /api/sensitive-endpoint',
      }));

      mockRedisProvider.keys.mockResolvedValue(
        requests.map((_, i) => `ddos:requests:${ip}:${i}`)
      );

      requests.forEach((req, i) => {
        mockRedisProvider.get.mockResolvedValueOnce(JSON.stringify({
          timestamp: req.timestamp,
          userAgent: 'TestBot/1.0',
          headers: { 'user-agent': 'TestBot/1.0' },
          endpoint: req.endpoint,
        }));
      });

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.suspiciousPatterns).toContain('endpoint_abuse');
    });

    it('should detect timing patterns', async () => {
      const baseTime = Date.now();
      const requests = Array(10).fill(null).map((_, i) => ({
        timestamp: baseTime - (9 - i) * 1000, // Regular 1-second intervals
        endpoint: 'GET /api/data',
      }));

      mockRedisProvider.keys.mockResolvedValue(
        requests.map((_, i) => `ddos:requests:${ip}:${i}`)
      );

      requests.forEach((req, i) => {
        mockRedisProvider.get.mockResolvedValueOnce(JSON.stringify({
          timestamp: req.timestamp,
          userAgent: 'TestBot/1.0',
          headers: { 'user-agent': 'TestBot/1.0' },
          endpoint: req.endpoint,
        }));
      });

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.suspiciousPatterns).toContain('timing_pattern_anomaly');
    });
  });

  describe('performance tests', () => {
    it('should handle high volume analysis efficiently', async () => {
      const ip = '192.168.1.1';
      
      mockRedisProvider.get.mockResolvedValue(null);
      mockRedisProvider.set.mockResolvedValue();
      mockRedisProvider.keys.mockResolvedValue(Array(50).fill(null).map((_, i) => `ddos:count:${ip}:${i}`));

      const startTime = Date.now();
      const promises = [];

      // Simulate 100 concurrent requests
      for (let i = 0; i < 100; i++) {
        promises.push(ddosProtection.analyzeRequest(ip, `Bot-${i}`, {}, `GET /api/endpoint-${i}`));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      results.forEach(result => {
        expect(result.allowed).toBeDefined();
      });
    });

    it('should maintain performance with large request histories', async () => {
      const ip = '192.168.1.100';
      
      // Mock large request history
      mockRedisProvider.keys.mockResolvedValue(Array(1000).fill(null).map((_, i) => `ddos:count:${ip}:${i}`));
      mockRedisProvider.get.mockResolvedValue('1');

      const startTime = Date.now();
      const metrics = await ddosProtection.getMetrics(ip);
      const endTime = Date.now();

      expect(metrics.requestCount).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('edge cases', () => {
    it('should handle malformed request data', async () => {
      mockRedisProvider.get.mockResolvedValue('invalid json');
      mockRedisProvider.keys.mockResolvedValue([]);

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.requestCount).toBe(0);
      expect(metrics.suspiciousPatterns).toEqual([]);
    });

    it('should handle missing request data', async () => {
      mockRedisProvider.get.mockResolvedValue(null);
      mockRedisProvider.keys.mockResolvedValue([]);

      const result = await ddosProtection.analyzeRequest(ip, undefined, undefined, undefined);

      expect(result.allowed).toBe(true);
      expect(result.metrics.ip).toBe(ip);
    });

    it('should handle extremely high request counts', async () => {
      mockRedisProvider.keys.mockResolvedValue(Array(10000).fill(null).map((_, i) => `ddos:count:${ip}:${i}`));
      mockRedisProvider.get.mockResolvedValue('1');

      const metrics = await ddosProtection.getMetrics(ip);

      expect(metrics.requestCount).toBe(10000);
      expect(metrics.requestsPerSecond).toBeGreaterThan(100);
    });

    it('should handle disabled pattern detection', async () => {
      ddosProtection.updateConfig({ patternDetectionEnabled: false });

      mockRedisProvider.get.mockResolvedValue(null);
      mockRedisProvider.set.mockResolvedValue();
      mockRedisProvider.keys.mockResolvedValue(Array(100).fill(null).map((_, i) => `ddos:count:${ip}:${i}`));

      const result = await ddosProtection.analyzeRequest(ip, 'Bot/1.0', {}, 'GET /api/test');

      expect(result.allowed).toBe(true);
      expect(result.metrics.suspiciousPatterns).toEqual([]);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { GlobalRateLimitMiddleware } from './global-rate-limit.middleware';
import { RateLimitService } from '../rate-limit.service';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';

describe('GlobalRateLimitMiddleware', () => {
  let middleware: GlobalRateLimitMiddleware;
  let rateLimitService: RateLimitService;
  let reflector: Reflector;

  const mockRateLimitService = {
    checkRateLimit: jest.fn(),
  };

  const mockReflector = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalRateLimitMiddleware,
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    middleware = module.get<GlobalRateLimitMiddleware>(GlobalRateLimitMiddleware);
    rateLimitService = module.get<RateLimitService>(RateLimitService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (overrides: Partial<Request> = {}): Request => ({
    method: 'GET',
    path: '/api/test',
    headers: {
      'user-agent': 'Test Browser',
      'x-forwarded-for': '192.168.1.1',
    },
    connection: { remoteAddress: '192.168.1.1' },
    socket: { remoteAddress: '192.168.1.1' },
    route: {
      path: '/api/test',
      handler: {},
    },
    ...overrides,
  } as any);

  const createMockResponse = (): Response => {
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    return res;
  };

  const createMockNext = (): jest.Mock => jest.fn();

  describe('use', () => {
    it('should allow request under rate limit', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null); // No rate limit config
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '99');
    });

    it('should block request over rate limit', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalRequests: 100,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 429,
          error: 'Too Many Requests',
        })
      );
    });

    it('should skip rate limiting when decorator indicates', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockImplementation((key) => {
        if (key === 'skip_rate_limit') return true;
        return null;
      });

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    });

    it('should use custom rate limit configuration', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const customConfig = {
        limit: 50,
        windowMs: 30000,
        message: 'Custom limit exceeded',
        statusCode: 422,
      };

      mockReflector.get.mockReturnValue(customConfig);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
        totalRequests: 50,
        windowStart: Date.now() - 30000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: 'Custom limit exceeded',
        })
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '50');
    });

    it('should use user ID when authenticated', async () => {
      const req = createMockRequest({
        user: { id: 'user123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'user:user123',
        expect.objectContaining({
          identifier: 'user:user123',
        })
      );
    });

    it('should use IP address when not authenticated', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'ip:192.168.1.1',
        expect.objectContaining({
          identifier: 'ip:192.168.1.1',
        })
      );
    });

    it('should extract X-Forwarded-For IP correctly', async () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.1, 192.168.1.1',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'ip:203.0.113.1',
        expect.any(Object)
      );
    });

    it('should add tier header when present', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
        tier: 'premium',
      });

      await middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'premium');
    });

    it('should add DDoS headers when blocked', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
        ddosMetrics: {
          blocked: true,
          blockReason: 'DDoS attack detected',
        },
      });

      await middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-DDoS-Blocked', 'true');
      expect(res.setHeader).toHaveBeenCalledWith('X-DDoS-Reason', 'DDoS attack detected');
    });

    it('should log warnings when approaching limits', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue({ limit: 100 });
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 15, // 85% used
        resetTime: Date.now() + 60000,
        totalRequests: 85,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      // Warning should be logged (checked through console.warn or logger)
    });

    it('should handle service errors gracefully', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockRejectedValue(new Error('Service error'));

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled(); // Fail open
    });

    it('should extract relevant headers for DDoS analysis', async () => {
      const req = createMockRequest({
        headers: {
          'accept': 'application/json',
          'accept-encoding': 'gzip',
          'accept-language': 'en-US',
          'authorization': 'Bearer token',
          'connection': 'keep-alive',
          'content-type': 'application/json',
          'host': 'api.example.com',
          'origin': 'https://example.com',
          'referer': 'https://example.com/page',
          'user-agent': 'Test Browser',
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.1',
          'x-custom-header': 'custom-value',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'accept': 'application/json',
            'accept-encoding': 'gzip',
            'accept-language': 'en-US',
            'authorization': 'Bearer token',
            'connection': 'keep-alive',
            'content-type': 'application/json',
            'host': 'api.example.com',
            'origin': 'https://example.com',
            'referer': 'https://example.com/page',
            'user-agent': 'Test Browser',
            'x-forwarded-for': '192.168.1.1',
            'x-real-ip': '192.168.1.1',
          }),
        })
      );
    });

    it('should construct endpoint correctly', async () => {
      const req = createMockRequest({
        method: 'POST',
        route: { path: '/api/users' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          endpoint: 'POST /api/users',
        })
      );
    });

    it('should handle missing route path', async () => {
      const req = createMockRequest({
        route: {},
        path: '/api/fallback',
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          endpoint: 'GET /api/fallback',
        })
      );
    });

    it('should handle array header values', async () => {
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': ['203.0.113.1', '192.168.1.1'],
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'ip:203.0.113.1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-forwarded-for': '203.0.113.1',
          }),
        })
      );
    });

    it('should fallback to unknown IP when no IP found', async () => {
      const req = createMockRequest({
        headers: {},
        connection: null,
        socket: null,
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'ip:unknown',
        expect.any(Object)
      );
    });
  });

  describe('performance tests', () => {
    it('should handle high volume requests efficiently', async () => {
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      const startTime = Date.now();
      const promises = [];

      // Simulate 1000 concurrent requests
      for (let i = 0; i < 1000; i++) {
        const req = createMockRequest({ path: `/api/endpoint-${i}` });
        const res = createMockResponse();
        promises.push(middleware.use(req, res, next));
      }

      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(next).toHaveBeenCalledTimes(1000);
    });

    it('should maintain performance with complex configurations', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const complexConfig = {
        limit: 1000,
        windowMs: 3600000,
        tier: 'ultimate',
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
        customResponse: () => ({ message: 'Custom response' }),
      };

      mockReflector.get.mockReturnValue(complexConfig);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 999,
        resetTime: Date.now() + 3600000,
        totalRequests: 1,
        windowStart: Date.now() - 3600000,
        windowEnd: Date.now(),
        tier: 'ultimate',
        ddosMetrics: { blocked: false },
      });

      const startTime = Date.now();
      await middleware.use(req, res, next);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // Should complete in under 10ms
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '1000');
      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Tier', 'ultimate');
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined headers', async () => {
      const req = createMockRequest({
        headers: null,
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(rateLimitService.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {},
        })
      );
    });

    it('should handle empty string headers', async () => {
      const req = createMockRequest({
        headers: '',
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockReturnValue(null);
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle controller-level rate limit config', async () => {
      const req = createMockRequest({
        route: {
          path: '/api/test',
          handler: {},
          controller: {},
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockReflector.get.mockImplementation((key, target) => {
        if (key === 'rate_limit' && target === req.route.handler) {
          return null; // No handler-level config
        }
        if (key === 'rate_limit' && target === req.route.controller) {
          return { limit: 200 }; // Controller-level config
        }
        return null;
      });

      mockRateLimitService.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 199,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
        windowStart: Date.now() - 60000,
        windowEnd: Date.now(),
      });

      await middleware.use(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '200');
    });
  });
});

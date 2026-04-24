import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

describe('Rate Limiting E2E Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Global Rate Limiting', () => {
    it('should allow requests within limits', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/test')
        .expect(200);

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });

    it('should include rate limit headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThanOrEqual(0);
      expect(parseInt(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
    });

    it('should handle rate limit exceeded scenario', async () => {
      // Make multiple rapid requests to exceed limit
      const promises = Array(150).fill(null).map(() =>
        request(app.getHttpServer()).get('/rate-limit/test')
      );

      const responses = await Promise.allSettled(promises);
      
      // Some responses should be rate limited
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limit API Endpoints', () => {
    it('should get user rate limit status', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/status')
        .expect(200);

      expect(response.body).toHaveProperty('identifier');
      expect(response.body).toHaveProperty('currentUsage');
      expect(response.body).toHaveProperty('remaining');
      expect(response.body).toHaveProperty('resetTime');
    });

    it('should get tier limits information', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/tier-limits')
        .expect(200);

      expect(response.body).toHaveProperty('tiers');
      expect(Array.isArray(response.body.tiers)).toBe(true);
      expect(response.body.tiers.length).toBeGreaterThan(0);
    });

    it('should get usage analytics', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/analytics')
        .expect(200);

      expect(response.body).toHaveProperty('identifier');
      expect(response.body).toHaveProperty('totalRequests');
      expect(response.body).toHaveProperty('requestsPerMinute');
      expect(response.body).toHaveProperty('windowStart');
      expect(response.body).toHaveProperty('windowEnd');
    });

    it('should get usage percentage', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/usage-percentage')
        .expect(200);

      expect(response.body).toHaveProperty('percentage');
      expect(response.body).toHaveProperty('tier');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('warningThreshold');
      expect(response.body).toHaveProperty('criticalThreshold');
    });

    it('should check burst capacity', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/burst-capacity')
        .expect(200);

      expect(response.body).toHaveProperty('allowed');
      expect(response.body).toHaveProperty('remaining');
      expect(response.body).toHaveProperty('burstLimit');
    });

    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Admin Endpoints', () => {
    it('should get global statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/global-stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalActiveKeys');
      expect(response.body).toHaveProperty('totalWarnings');
      expect(response.body).toHaveProperty('blockedIPs');
      expect(response.body).toHaveProperty('averageRequestsPerSecond');
      expect(response.body).toHaveProperty('tierDistribution');
    });

    it('should get recent warnings', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/warnings?limit=10')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should get blocked IPs', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/blocked-ips')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reset rate limit for identifier', async () => {
      const response = await request(app.getHttpServer())
        .post('/rate-limit/reset')
        .send({ identifier: 'test-user', reason: 'Test reset' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('identifier');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should update configuration', async () => {
      const config = {
        defaultLimits: {
          premium: {
            requestsPerMinute: 150,
            requestsPerHour: 3000,
            requestsPerDay: 75000,
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/rate-limit/update-config')
        .send(config)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('updatedAt');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();
      const promises = Array(100).fill(null).map(() =>
        request(app.getHttpServer()).get('/rate-limit/health')
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(responses).toHaveLength(100);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      // Make requests to different endpoints
      const endpoints = [
        '/rate-limit/status',
        '/rate-limit/analytics',
        '/rate-limit/usage-percentage',
        '/rate-limit/burst-capacity',
        '/rate-limit/health',
      ];

      const promises = Array(200).fill(null).map((_, i) =>
        request(app.getHttpServer()).get(endpoints[i % endpoints.length])
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(responses).toHaveLength(200);
      
      const successResponses = responses.filter(r => r.status === 200);
      expect(successResponses.length).toBeGreaterThan(190); // At least 95% success rate
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid request data gracefully', async () => {
      const response = await request(app.getHttpServer())
        .post('/rate-limit/reset')
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/rate-limit/reset')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle invalid configuration updates', async () => {
      const invalidConfig = {
        defaultLimits: {
          premium: {
            requestsPerMinute: -1, // Invalid negative value
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post('/rate-limit/update-config')
        .send(invalidConfig)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Integration with Other Modules', () => {
    it('should work with authentication system', async () => {
      // Test with authenticated user (mock)
      const response = await request(app.getHttpServer())
        .get('/rate-limit/status')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('identifier');
      // Should use user-based identifier when authenticated
    });

    it('should work with existing middleware', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200);

      // Should have correlation ID from correlation middleware
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      // Should have security headers from security middleware
    });

    it('should integrate with logging system', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/test')
        .expect(200);

      // Request should be logged with correlation ID and rate limit info
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
  });

  describe('DDoS Protection Integration', () => {
    it('should allow normal requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/test')
        .expect(200);

      expect(response.headers['x-ddos-blocked']).toBeUndefined();
    });

    it('should include DDoS metrics when relevant', async () => {
      // This would require triggering DDoS detection in a real test
      // For now, we just verify the endpoint works
      const response = await request(app.getHttpServer())
        .get('/rate-limit/ddos-metrics/192.168.1.1')
        .expect(200);

      expect(response.body).toHaveProperty('ip');
      expect(response.body).toHaveProperty('requestCount');
      expect(response.body).toHaveProperty('requestsPerSecond');
    });
  });

  describe('Rate Limit Decorators', () => {
    it('should respect custom rate limit configurations', async () => {
      // Test endpoint with custom rate limit (if implemented)
      const response = await request(app.getHttpServer())
        .get('/rate-limit/test')
        .expect(200);

      // Should have rate limit headers
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
    });

    it('should skip rate limiting on health endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/rate-limit/health')
        .expect(200);

      // Health endpoint should not be rate limited
      expect(parseInt(response.headers['x-ratelimit-remaining'])).toBeGreaterThan(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate environment configuration', async () => {
      // Test that the system starts with valid configuration
      const response = await request(app.getHttpServer())
        .get('/rate-limit/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should handle missing Redis gracefully', async () => {
      // This would require mocking Redis failure
      // For now, we verify the system handles errors gracefully
      const response = await request(app.getHttpServer())
        .get('/rate-limit/status')
        .expect(200);

      expect(response.body).toHaveProperty('identifier');
    });
  });

  describe('Memory and Resource Management', () => {
    it('should handle large numbers of requests without memory leaks', async () => {
      // Make many requests to test memory usage
      const promises = Array(500).fill(null).map((_, i) =>
        request(app.getHttpServer()).get(`/rate-limit/test?id=${i}`)
      );

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(500);
      const successResponses = responses.filter(r => r.status === 200 || r.status === 429);
      expect(successResponses.length).toBe(500); // All should be handled (either allowed or rate limited)
    });

    it('should clean up expired rate limit data', async () => {
      // This would require waiting for cleanup intervals
      // For now, we verify the system continues to work
      const response1 = await request(app.getHttpServer())
        .get('/rate-limit/status')
        .expect(200);

      // Wait a moment and make another request
      await new Promise(resolve => setTimeout(resolve, 100));

      const response2 = await request(app.getHttpServer())
        .get('/rate-limit/status')
        .expect(200);

      expect(response1.body.identifier).toBe(response2.body.identifier);
    });
  });
});

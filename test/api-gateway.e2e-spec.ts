import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { AdvancedRateLimiterService } from './../src/gateway/rate-limiting/advanced-rate-limiter.service';
import { CircuitBreakerService } from './../src/gateway/circuit-breaker/circuit-breaker.service';

describe('ApiGateway (e2e)', () => {
  let app: INestApplication;
  let rateLimiter: AdvancedRateLimiterService;
  let circuitBreaker: CircuitBreakerService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    rateLimiter = moduleFixture.get<AdvancedRateLimiterService>(AdvancedRateLimiterService);
    circuitBreaker = moduleFixture.get<CircuitBreakerService>(CircuitBreakerService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('Gateway services should be injected and defined', () => {
    expect(rateLimiter).toBeDefined();
    expect(circuitBreaker).toBeDefined();
  });

  it('should handle rate limiting check', async () => {
    const result = await rateLimiter.checkRateLimit('127.0.0.1');
    expect(result).toBe(true);
  });

  it('should handle circuit breaker check', async () => {
    await expect(circuitBreaker.checkCircuit()).resolves.not.toThrow();
  });

  // Example of a gateway-protected route if we had one implemented in a controller
  // For now we verify the module integration in AppModule
});

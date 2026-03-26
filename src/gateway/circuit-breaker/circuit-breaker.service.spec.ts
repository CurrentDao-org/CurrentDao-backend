import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';
import { InternalServerErrorException } from '@nestjs/common';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkCircuit', () => {
    it('should not throw error if circuit is closed', async () => {
      await expect(service.checkCircuit()).resolves.not.toThrow();
    });

    it('should throw InternalServerErrorException if circuit is open', async () => {
      // Simulate multiple failures to open the circuit
      for (let i = 0; i < 5; i++) {
        await service.reportFailure();
      }
      await expect(service.checkCircuit()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('reportSuccess', () => {
    it('should reset failure count and close the circuit', async () => {
      // Simulate failures first
      await service.reportFailure();
      await service.reportSuccess();
      // Verify circuit is now closed
      await expect(service.checkCircuit()).resolves.not.toThrow();
    });
  });

  describe('reportFailure', () => {
    it('should increment failure count and open the circuit after threshold', async () => {
      // Threshold is 5 failures
      for (let i = 0; i < 4; i++) {
        await service.reportFailure();
        await expect(service.checkCircuit()).resolves.not.toThrow();
      }
      await service.reportFailure(); // 5th failure
      await expect(service.checkCircuit()).rejects.toThrow(InternalServerErrorException);
    });
  });
});

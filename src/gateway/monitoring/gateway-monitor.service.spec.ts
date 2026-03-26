import { Test, TestingModule } from '@nestjs/testing';
import { GatewayMonitorService } from './gateway-monitor.service';

describe('GatewayMonitorService', () => {
  let service: GatewayMonitorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GatewayMonitorService],
    }).compile();

    service = module.get<GatewayMonitorService>(GatewayMonitorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logRequest', () => {
    it('should log a request and update metrics (placeholder implementation)', () => {
      // We'll just verify no errors are thrown for now
      expect(() => service.logRequest('GET', '/test', 200, 150)).not.toThrow();
    });
  });

  describe('getMetrics', () => {
    it('should return metrics string', async () => {
      const result = await service.getMetrics();
      expect(typeof result).toBe('string');
      expect(result).toBeDefined();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { TraceAnalyticsService } from './trace-analytics.service';

describe('TraceAnalyticsService', () => {
  let service: TraceAnalyticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TraceAnalyticsService],
    }).compile();

    service = module.get<TraceAnalyticsService>(TraceAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a health report', () => {
    const report = service.getHealthReport();
    expect(report.status).toBe('Collecting metrics');
    expect(report.active_meter).toBe('currentdao-analytics');
  });

  it('should track requests safely', () => {
    // Should not throw
    expect(() => {
      service.trackRequest({ method: 'GET', path: '/', status: 200 }, 100);
    }).not.toThrow();
  });
});

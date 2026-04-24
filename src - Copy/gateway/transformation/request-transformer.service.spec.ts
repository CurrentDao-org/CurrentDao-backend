import { Test, TestingModule } from '@nestjs/testing';
import { RequestTransformerService } from './request-transformer.service';

describe('RequestTransformerService', () => {
  let service: RequestTransformerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RequestTransformerService],
    }).compile();

    service = module.get<RequestTransformerService>(RequestTransformerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transformRequest', () => {
    it('should transform energy requests correctly', () => {
      const body = { data: 'test data' };
      const rule = 'transformEnergyRequest';
      const result = service.transformRequest(body, rule);
      expect(result).toBeDefined();
      expect(result.data).toBe('test data');
      expect(result.timestamp).toBeDefined();
      expect(result.source).toBe('gateway');
    });

    it('should return the original body for unknown rules', () => {
      const body = { data: 'test data' };
      const rule = 'unknownRule';
      const result = service.transformRequest(body, rule);
      expect(result).toEqual(body);
    });
  });

  describe('transformResponse', () => {
    it('should transform energy responses correctly', () => {
      const body = { data: ['item1', 'item2'] };
      const rule = 'transformEnergyResponse';
      const result = service.transformResponse(body, rule);
      expect(result).toBeDefined();
      expect(result.results).toEqual(['item1', 'item2']);
      expect(result.count).toBe(2);
      expect(result.processedAt).toBeDefined();
    });

    it('should return the original body for unknown rules', () => {
      const body = { data: ['item1', 'item2'] };
      const rule = 'unknownRule';
      const result = service.transformResponse(body, rule);
      expect(result).toEqual(body);
    });
  });
});

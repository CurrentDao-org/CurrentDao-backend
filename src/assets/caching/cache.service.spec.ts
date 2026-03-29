import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CacheService],
    }).compile();
    service = module.get<CacheService>(CacheService);
  });
  it('should set and get cache', () => {
    service.set('key', 'value');
    expect(service.get('key')).toBe('value');
  });
});

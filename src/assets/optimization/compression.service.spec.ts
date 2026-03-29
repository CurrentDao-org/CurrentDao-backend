import { Test, TestingModule } from '@nestjs/testing';
import { CompressionService } from './compression.service';

describe('CompressionService', () => {
  let service: CompressionService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompressionService],
    }).compile();
    service = module.get<CompressionService>(CompressionService);
  });
  it('should compress buffer', async () => {
    const buffer = Buffer.from('test data string for compression');
    const result = await service.compressAsset(buffer, 'gzip');
    expect(result).toBeDefined();
  });
});

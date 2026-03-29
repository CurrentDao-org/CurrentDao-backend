import { Test, TestingModule } from '@nestjs/testing';
import { AssetVersionService } from './asset-version.service';

describe('AssetVersionService', () => {
  let service: AssetVersionService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetVersionService],
    }).compile();
    service = module.get<AssetVersionService>(AssetVersionService);
  });
  it('should generate hash', () => {
    const buffer = Buffer.from('test');
    expect(service.generateVersionHash(buffer)).toBeDefined();
  });
});

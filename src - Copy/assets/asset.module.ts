import { Module, Global } from '@nestjs/common';
import { CdnService } from './cdn/cdn.service';
import { CompressionService } from './optimization/compression.service';
import { ImageOptimizerService } from './optimization/image-optimizer.service';
import { CacheService } from './caching/cache.service';
import { AssetVersionService } from './versioning/asset-version.service';

@Global()
@Module({
  providers: [
    CdnService,
    CompressionService,
    ImageOptimizerService,
    CacheService,
    AssetVersionService,
  ],
  exports: [
    CdnService,
    CompressionService,
    ImageOptimizerService,
    CacheService,
    AssetVersionService,
  ],
})
export class AssetModule {}

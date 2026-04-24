import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { MultiLevelCacheStrategy } from './strategies/multi-level.strategy';
import { InvalidationStrategy } from './strategies/invalidation.strategy';
import { CacheAnalyticsService } from './monitoring/cache-analytics.service';
import { RedisProvider } from './providers/redis.provider';
import { MemoryProvider } from './providers/memory.provider';
import { CacheWarming } from './utils/cache-warming';

@Global()
@Module({
  providers: [
    CacheService,
    MultiLevelCacheStrategy,
    InvalidationStrategy,
    CacheAnalyticsService,
    RedisProvider,
    MemoryProvider,
    CacheWarming,
  ],
  exports: [CacheService, CacheAnalyticsService, CacheWarming],
})
export class CacheModule {}

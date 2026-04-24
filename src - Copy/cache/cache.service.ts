import { Injectable } from '@nestjs/common';
import { MemoryProvider } from './providers/memory.provider';
import { RedisProvider } from './providers/redis.provider';
import { MultiLevelCacheStrategy } from './strategies/multi-level.strategy';
import { InvalidationStrategy } from './strategies/invalidation.strategy';
import { CacheAnalyticsService } from './monitoring/cache-analytics.service';
import { CacheWarming } from './utils/cache-warming';

@Injectable()
export class CacheService {
  constructor(
    private readonly memoryProvider: MemoryProvider,
    private readonly redisProvider: RedisProvider,
    private readonly multiLevelStrategy: MultiLevelCacheStrategy,
    private readonly invalidationStrategy: InvalidationStrategy,
    private readonly analytics: CacheAnalyticsService,
    private readonly warming: CacheWarming,
  ) {}

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const cached = await this.multiLevelStrategy.fetch<T>(namespace, key);
    if (cached !== null) {
      this.analytics.recordHit();
      return cached;
    }
    this.analytics.recordMiss();
    return null;
  }

  async set<T>(namespace: string, key: string, value: T, ttlSeconds = 300): Promise<void> {
    await this.multiLevelStrategy.store(namespace, key, value, ttlSeconds);
    this.analytics.recordWrite();
  }

  async invalidate(namespace: string, key: string): Promise<void> {
    await this.invalidationStrategy.invalidateKey(this.memoryProvider, this.redisProvider, namespace, key);
    this.analytics.recordInvalidate();
  }

  async warm(namespace: string, keys: string[], loader: (key: string) => Promise<any>) {
    await this.warming.warmCache(namespace, keys, loader);
  }

  async getStats() {
    return this.analytics.getMetrics();
  }
}

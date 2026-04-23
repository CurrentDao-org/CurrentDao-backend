import { Injectable, Logger } from '@nestjs/common';
import { MemoryProvider } from '../providers/memory.provider';
import { RedisProvider } from '../providers/redis.provider';

@Injectable()
export class CacheWarming {
  private readonly logger = new Logger(CacheWarming.name);

  constructor(
    private readonly memoryProvider: MemoryProvider,
    private readonly redisProvider: RedisProvider,
  ) {}

  async warmCache(namespace: string, keys: string[], loader: (key: string) => Promise<any>): Promise<number> {
    let loaded = 0;

    for (const key of keys) {
      try {
        const value = await loader(key);
        await this.memoryProvider.set(namespace, key, value, 3600);
        await this.redisProvider.set(namespace, key, value, 3600);
        loaded += 1;
      } catch (error) {
        this.logger.warn(`Cache warming failed for ${namespace}:${key}`, error as any);
      }
    }

    this.logger.log(`Warm cache loaded ${loaded}/${keys.length} entries for namespace ${namespace}.`);
    return loaded;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MemoryProvider } from '../providers/memory.provider';
import { RedisProvider } from '../providers/redis.provider';

@Injectable()
export class InvalidationStrategy {
  private readonly logger = new Logger(InvalidationStrategy.name);

  async invalidateKey(
    memoryProvider: MemoryProvider,
    redisProvider: RedisProvider,
    namespace: string,
    key: string,
  ): Promise<void> {
    await memoryProvider.del(namespace, key);
    await redisProvider.del(namespace, key);
    this.logger.debug(`Invalidated cache key ${namespace}:${key}`);
  }

  async invalidatePattern(
    memoryProvider: MemoryProvider,
    redisProvider: RedisProvider,
    namespace: string,
    pattern: string,
  ): Promise<void> {
    const keys = await redisProvider.keys(namespace, pattern);
    for (const key of keys) {
      await memoryProvider.del(namespace, key);
      await redisProvider.del(namespace, key);
    }
    this.logger.debug(`Invalidated cache pattern ${namespace}:${pattern}`);
  }
}

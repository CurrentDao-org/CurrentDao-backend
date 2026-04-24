import { Injectable, Logger } from '@nestjs/common';
import { MemoryProvider } from '../providers/memory.provider';
import { RedisProvider } from '../providers/redis.provider';

@Injectable()
export class MultiLevelCacheStrategy {
  private readonly logger = new Logger(MultiLevelCacheStrategy.name);

  async fetch<T>(namespace: string, key: string): Promise<T | null> {
    const memoryValue = await this.memoryProvider.get<T>(namespace, key);
    if (memoryValue !== null) {
      this.logger.debug(`Cache hit in memory for ${namespace}:${key}`);
      return memoryValue;
    }

    const redisValue = await this.redisProvider.get<T>(namespace, key);
    if (redisValue !== null) {
      this.logger.debug(`Cache hit in redis for ${namespace}:${key}`);
      await this.memoryProvider.set(namespace, key, redisValue);
      return redisValue;
    }

    return null;
  }

  async store<T>(namespace: string, key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.memoryProvider.set(namespace, key, value, ttlSeconds);
    await this.redisProvider.set(namespace, key, value, ttlSeconds);
    this.logger.debug(`Cache stored at memory and redis for ${namespace}:${key}`);
  }
}

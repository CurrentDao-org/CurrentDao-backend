import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, { data: any; expiresAt: number }>();

  set(key: string, value: any, ttlSeconds: number = 3600): void {
    this.logger.debug(`Setting cache for key: ${key} with TTL: ${ttlSeconds}s`);
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { data: value, expiresAt });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.logger.debug(`Cache expired for key: ${key}`);
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit for key: ${key}`);
    return cached.data;
  }

  invalidate(key: string): void {
    this.logger.debug(`Invalidating cache for key: ${key}`);
    this.cache.delete(key);
  }
}

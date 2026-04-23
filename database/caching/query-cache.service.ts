import { Injectable, Logger } from '@nestjs/common';

interface CacheEntry {
  data: any;
  expiresAt: number;
  hits: number;
}

@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL_MS = 30000; // 30 seconds
  private totalRequests = 0;
  private cacheHits = 0;

  set(key: string, data: any, ttlMs = this.DEFAULT_TTL_MS): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      hits: 0,
    });
  }

  get<T = any>(key: string): T | null {
    this.totalRequests++;
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    this.cacheHits++;
    return entry.data as T;
  }

  async getOrSet<T = any>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs = this.DEFAULT_TTL_MS,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    this.set(key, data, ttlMs);
    return data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  flush(): void {
    this.cache.clear();
    this.logger.log('Cache flushed');
  }

  getStats(): Record<string, any> {
    const hitRate = this.totalRequests > 0 ? (this.cacheHits / this.totalRequests) * 100 : 0;
    return {
      totalEntries: this.cache.size,
      totalRequests: this.totalRequests,
      cacheHits: this.cacheHits,
      hitRatePercent: hitRate.toFixed(2),
      loadReductionPercent: hitRate.toFixed(2), // Mirrors hit rate
    };
  }

  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        evicted++;
      }
    }
    return evicted;
  }
}
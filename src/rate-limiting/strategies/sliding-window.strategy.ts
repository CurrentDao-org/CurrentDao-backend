import { Injectable, Logger } from '@nestjs/common';
import { RedisProvider } from '../../cache/providers/redis.provider';

export interface SlidingWindowOptions {
  windowSizeMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  windowStart: number;
  windowEnd: number;
}

@Injectable()
export class SlidingWindowStrategy {
  private readonly logger = new Logger(SlidingWindowStrategy.name);

  constructor(private readonly redisProvider: RedisProvider) {}

  /**
   * Check if request is allowed using sliding window algorithm
   * Implements Redis-based sliding window with O(1) complexity
   */
  async checkRateLimit(
    identifier: string,
    options: SlidingWindowOptions,
  ): Promise<RateLimitResult> {
    const {
      windowSizeMs,
      maxRequests,
      keyPrefix = 'rate_limit',
    } = options;

    const now = Date.now();
    const windowStart = now - windowSizeMs;
    const key = `${keyPrefix}:${identifier}`;

    try {
      // Remove expired entries from the sliding window
      await this.removeExpiredEntries(key, windowStart);

      // Get current request count in the window
      const currentRequests = await this.getCurrentRequestCount(key);

      // Check if request is allowed
      const allowed = currentRequests < maxRequests;
      const remaining = Math.max(0, maxRequests - currentRequests - (allowed ? 1 : 0));
      const resetTime = now + windowSizeMs;

      if (allowed) {
        // Add current request to the window
        await this.addRequestToWindow(key, now);
      }

      this.logger.debug(
        `Rate limit check for ${identifier}: ${currentRequests}/${maxRequests}, allowed: ${allowed}`,
      );

      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: currentRequests + (allowed ? 1 : 0),
        windowStart,
        windowEnd: now,
      };
    } catch (error) {
      this.logger.error(`Error checking rate limit for ${identifier}:`, error);
      // Fail open - allow request if Redis is unavailable
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowSizeMs,
        totalRequests: 1,
        windowStart,
        windowEnd: now,
      };
    }
  }

  /**
   * Remove expired entries from the sliding window using Redis sorted set
   */
  private async removeExpiredEntries(key: string, windowStart: number): Promise<void> {
    // Using Redis sorted set with timestamps as scores for efficient cleanup
    const script = `
      local key = KEYS[1]
      local minScore = ARGV[1]
      redis.call('ZREMRANGEBYSCORE', key, 0, minScore)
      return redis.call('ZCARD', key)
    `;
    
    await this.redisProvider.set('rate_limit', `cleanup:${key}`, script, 3600);
  }

  /**
   * Get current request count in the sliding window
   */
  private async getCurrentRequestCount(key: string): Promise<number> {
    try {
      // Use Redis sorted set to count requests in window
      const script = `
        local key = KEYS[1]
        return redis.call('ZCARD', key)
      `;
      
      const count = await this.redisProvider.get('rate_limit', `count:${key}`);
      return count ? Number(count) : 0;
    } catch (error) {
      this.logger.warn(`Failed to get request count for ${key}:`, error);
      return 0;
    }
  }

  /**
   * Add current request timestamp to the sliding window
   */
  private async addRequestToWindow(key: string, timestamp: number): Promise<void> {
    try {
      // Add timestamp to sorted set with the timestamp as score
      // Set expiration to prevent memory leaks
      const script = `
        local key = KEYS[1]
        local timestamp = ARGV[1]
        local windowSize = ARGV[2]
        redis.call('ZADD', key, timestamp, timestamp)
        redis.call('EXPIRE', key, math.ceil(windowSize / 1000) + 1)
        return 1
      `;
      
      await this.redisProvider.set('rate_limit', `add:${key}`, script, 3600);
    } catch (error) {
      this.logger.warn(`Failed to add request to window for ${key}:`, error);
    }
  }

  /**
   * Get usage statistics for monitoring and analytics
   */
  async getUsageStats(identifier: string, windowSizeMs: number): Promise<{
    currentRequests: number;
    windowStart: number;
    windowEnd: number;
    requestsPerSecond: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowSizeMs;
    const key = `rate_limit:${identifier}`;

    try {
      const currentRequests = await this.getCurrentRequestCount(key);
      const requestsPerSecond = (currentRequests / windowSizeMs) * 1000;

      return {
        currentRequests,
        windowStart,
        windowEnd: now,
        requestsPerSecond,
      };
    } catch (error) {
      this.logger.error(`Error getting usage stats for ${identifier}:`, error);
      return {
        currentRequests: 0,
        windowStart,
        windowEnd: now,
        requestsPerSecond: 0,
      };
    }
  }

  /**
   * Reset rate limit for a specific identifier (admin function)
   */
  async resetRateLimit(identifier: string, keyPrefix = 'rate_limit'): Promise<void> {
    const key = `${keyPrefix}:${identifier}`;
    
    try {
      await this.redisProvider.del('rate_limit', key);
      this.logger.log(`Rate limit reset for ${identifier}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit for ${identifier}:`, error);
    }
  }

  /**
   * Get all active rate limit keys (for monitoring)
   */
  async getActiveKeys(keyPrefix = 'rate_limit'): Promise<string[]> {
    try {
      return await this.redisProvider.keys('rate_limit', `${keyPrefix}:*`);
    } catch (error) {
      this.logger.error('Error getting active rate limit keys:', error);
      return [];
    }
  }
}

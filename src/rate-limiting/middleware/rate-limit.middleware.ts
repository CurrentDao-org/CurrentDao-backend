import { Injectable, NestMiddleware, Logger, ForbiddenException, TooManyRequestsException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../rate-limit.service';
import { RateLimitDecorator } from '../decorators/rate-limit.decorator';

export interface RateLimitInfo {
  identifier: string;
  limit: number;
  windowMs: number;
  remaining: number;
  resetTime: number;
  tier?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);

  constructor(private readonly rateLimitService: RateLimitService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get rate limit configuration from decorator or defaults
      const config = this.getRateLimitConfig(req);
      
      // Get identifier (IP address and/or user ID)
      const identifier = this.getIdentifier(req);
      
      // Check rate limit
      const result = await this.rateLimitService.checkRateLimit(identifier, config);
      
      // Add rate limit headers to response
      this.addRateLimitHeaders(res, result);
      
      // Log rate limit warnings
      if (result.remaining <= Math.floor(config.limit * 0.2)) { // 20% threshold
        this.logger.warn(
          `Rate limit warning for ${identifier}: ${result.remaining}/${config.limit} remaining`,
        );
      }
      
      // Send notifications if needed
      await this.sendNotificationsIfNeeded(identifier, result, config);
      
      // Check if request should be blocked
      if (!result.allowed) {
        this.logger.warn(`Rate limit exceeded for ${identifier}`);
        throw new TooManyRequestsException(
          `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`,
        );
      }
      
      next();
    } catch (error) {
      if (error instanceof TooManyRequestsException || error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error('Rate limit middleware error:', error);
      // Fail open - allow request if middleware fails
      next();
    }
  }

  /**
   * Get rate limit configuration from route decorator or use defaults
   */
  private getRateLimitConfig(req: Request): any {
    // Check if route has custom rate limit decorator
    const routeConfig = (req as any).rateLimitConfig;
    
    if (routeConfig) {
      return {
        limit: routeConfig.limit,
        windowMs: routeConfig.windowMs,
        tier: routeConfig.tier,
        skipSuccessfulRequests: routeConfig.skipSuccessfulRequests,
        skipFailedRequests: routeConfig.skipFailedRequests,
        keyGenerator: routeConfig.keyGenerator,
      };
    }
    
    // Default configuration
    return {
      limit: 100, // 100 requests
      windowMs: 60000, // per minute
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };
  }

  /**
   * Generate identifier for rate limiting
   */
  private getIdentifier(req: Request): string {
    // Try to get user ID from authenticated user
    const user = (req as any).user;
    if (user && user.id) {
      return `user:${user.id}`;
    }
    
    // Fall back to IP address
    const ip = this.getClientIP(req);
    return `ip:${ip}`;
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(res: Response, result: any): void {
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-Reset-Ttl': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
    };

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  /**
   * Send notifications when rate limits are approaching
   */
  private async sendNotificationsIfNeeded(identifier: string, result: any, config: any): Promise<void> {
    const usagePercentage = ((config.limit - result.remaining) / config.limit) * 100;
    
    // Send warning at 80%
    if (usagePercentage >= 80 && usagePercentage < 95) {
      await this.rateLimitService.sendRateLimitWarning(identifier, {
        current: config.limit - result.remaining,
        limit: config.limit,
        percentage: usagePercentage,
        resetTime: result.resetTime,
        level: 'warning',
      });
    }
    
    // Send critical alert at 95%
    if (usagePercentage >= 95) {
      await this.rateLimitService.sendRateLimitWarning(identifier, {
        current: config.limit - result.remaining,
        limit: config.limit,
        percentage: usagePercentage,
        resetTime: result.resetTime,
        level: 'critical',
      });
    }
  }
}

/**
 * Factory function to create rate limit middleware with custom configuration
 */
export function createRateLimitMiddleware(config: Partial<RateLimitInfo>) {
  return class CustomRateLimitMiddleware extends RateLimitMiddleware {
    private customConfig = config;

    protected getRateLimitConfig(req: Request): any {
      const baseConfig = super.getRateLimitConfig(req);
      return { ...baseConfig, ...this.customConfig };
    }
  };
}

/**
 * Apply rate limiting to specific HTTP methods
 */
export function applyRateLimitToMethods(
  methods: string[],
  config: Partial<RateLimitInfo>,
) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const req = args.find(arg => arg && arg.method) as Request;
      
      if (req && methods.includes(req.method)) {
        const middleware = new RateLimitMiddleware(this.rateLimitService);
        await middleware.use(req, {} as Response, () => {});
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

import { SetMetadata } from '@nestjs/common';
import { SubscriptionTier } from '../strategies/tiered-limits.strategy';

export const RATE_LIMIT_KEY = 'rate_limit';

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  tier?: SubscriptionTier;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
  message?: string;
  statusCode?: number;
  headers?: boolean;
  customResponse?: (req: any, res: any) => any;
}

/**
 * Decorator to apply rate limiting to a specific route or controller
 * 
 * Usage:
 * @RateLimit({ limit: 100, windowMs: 60000 })
 * @Get('/endpoint')
 * async getEndpoint() { ... }
 * 
 * @RateLimit({ tier: SubscriptionTier.PREMIUM })
 * @Controller('/premium')
 * export class PremiumController { ... }
 */
export const RateLimit = (options: RateLimitOptions = {}) => {
  const defaultOptions: RateLimitOptions = {
    limit: 100,
    windowMs: 60000, // 1 minute
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    headers: true,
    statusCode: 429,
    message: 'Too many requests, please try again later.',
  };

  const finalOptions = { ...defaultOptions, ...options };
  
  return SetMetadata(RATE_LIMIT_KEY, finalOptions);
};

/**
 * Decorator for public endpoints with higher rate limits
 */
export const PublicRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    limit: 1000,
    windowMs: 60000,
    ...options,
  });
};

/**
 * Decorator for authenticated endpoints with standard rate limits
 */
export const AuthRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    limit: 500,
    windowMs: 60000,
    ...options,
  });
};

/**
 * Decorator for premium user endpoints with higher limits
 */
export const PremiumRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    limit: 2000,
    windowMs: 60000,
    ...options,
  });
};

/**
 * Decorator for admin endpoints with very high limits
 */
export const AdminRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    limit: 5000,
    windowMs: 60000,
    ...options,
  });
};

/**
 * Decorator for API endpoints with strict rate limiting
 */
export const StrictRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    limit: 10,
    windowMs: 60000,
    ...options,
  });
};

/**
 * Decorator for endpoints with burst capacity allowance
 */
export const BurstRateLimit = (options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    limit: 100,
    windowMs: 60000,
    burstLimit: 200,
    ...options,
  });
};

/**
 * Decorator to apply tier-based rate limiting
 */
export const TieredRateLimit = (tier: SubscriptionTier, options: Partial<RateLimitOptions> = {}) => {
  return RateLimit({
    tier,
    ...options,
  });
};

/**
 * Decorator to skip rate limiting for specific routes
 */
export const SkipRateLimit = () => {
  return SetMetadata('skip_rate_limit', true);
};

/**
 * Decorator to apply custom rate limit based on user subscription
 */
export const UserBasedRateLimit = (options: {
  getLimit?: (user: any) => number;
  getWindowMs?: (user: any) => number;
} = {}) => {
  return RateLimit({
    keyGenerator: (req) => {
      const user = req.user;
      if (user && user.id) {
        return `user:${user.id}`;
      }
      return `ip:${req.ip}`;
    },
    limit: options.getLimit ? undefined : 100,
    windowMs: options.getWindowMs ? undefined : 60000,
    customResponse: (req, res) => {
      const user = req.user;
      if (options.getLimit) {
        return {
          limit: options.getLimit(user),
          windowMs: options.getWindowMs ? options.getWindowMs(user) : 60000,
        };
      }
      return {};
    },
    ...options,
  });
};

/**
 * Decorator for endpoints with different limits per HTTP method
 */
export const MethodRateLimit = (methodLimits: {
  GET?: Partial<RateLimitOptions>;
  POST?: Partial<RateLimitOptions>;
  PUT?: Partial<RateLimitOptions>;
  DELETE?: Partial<RateLimitOptions>;
  PATCH?: Partial<RateLimitOptions>;
}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const req = args.find(arg => arg && arg.method);
      const method = req?.method?.toUpperCase();
      
      if (method && methodLimits[method as keyof typeof methodLimits]) {
        const options = methodLimits[method as keyof typeof methodLimits];
        const limitDecorator = RateLimit(options);
        limitDecorator(target, propertyKey, descriptor);
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
};

/**
 * Decorator for endpoints with time-based rate limiting
 */
export const TimeBasedRateLimit = (timeWindows: {
  minute?: number;
  hour?: number;
  day?: number;
}) => {
  return RateLimit({
    limit: timeWindows.minute || 60,
    windowMs: 60000, // 1 minute
    additionalLimits: [
      { limit: timeWindows.hour || 1000, windowMs: 3600000 }, // 1 hour
      { limit: timeWindows.day || 10000, windowMs: 86400000 }, // 1 day
    ],
  });
};

/**
 * Decorator for endpoints with custom rate limit logic
 */
export const CustomRateLimit = (options: {
  shouldLimit?: (req: any) => boolean;
  getIdentifier?: (req: any) => string;
  getLimit?: (req: any) => number;
  getWindowMs?: (req: any) => number;
  onLimitExceeded?: (req: any, res: any) => void;
}) => {
  return RateLimit({
    keyGenerator: options.getIdentifier || ((req) => req.ip),
    limit: options.getLimit ? undefined : 100,
    windowMs: options.getWindowMs ? undefined : 60000,
    customResponse: options.onLimitExceeded,
    ...options,
  });
};

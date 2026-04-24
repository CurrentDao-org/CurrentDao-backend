import { Injectable, NestMiddleware, Logger, ModuleRef } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimitService } from '../rate-limit.service';
import { RATE_LIMIT_KEY, SkipRateLimit } from '../decorators/rate-limit.decorator';
import { Reflector } from '@nestjs/core';

@Injectable()
export class GlobalRateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(GlobalRateLimitMiddleware.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if rate limiting should be skipped for this route
      const skipRateLimit = this.reflector.get('skip_rate_limit', req.route?.handler) ||
                           this.reflector.get('skip_rate_limit', req.route?.controller);
      
      if (skipRateLimit) {
        return next();
      }

      // Get custom rate limit configuration from route handler
      const rateLimitConfig = this.reflector.get(RATE_LIMIT_KEY, req.route?.handler) ||
                              this.reflector.get(RATE_LIMIT_KEY, req.route?.controller);

      // Get identifier (user ID if authenticated, otherwise IP)
      const identifier = this.getIdentifier(req);
      
      // Extract request information for DDoS protection
      const userAgent = req.headers['user-agent'] as string;
      const headers = this.extractHeaders(req);
      const endpoint = `${req.method} ${req.route?.path || req.path}`;
      
      // Get effective limit for headers
      const effectiveLimit = rateLimitConfig?.limit || 100;

      // Check rate limit with DDoS protection
      const result = await this.rateLimitService.checkRateLimit(identifier, {
        identifier,
        limit: rateLimitConfig?.limit,
        windowMs: rateLimitConfig?.windowMs,
        tier: rateLimitConfig?.tier,
        endpoint,
        userAgent,
        headers,
      });

      // Add rate limit headers to response
      this.addRateLimitHeaders(res, result, effectiveLimit);

      // Log warnings if approaching limits
      if (result.remaining <= Math.floor(effectiveLimit * 0.2)) {
        this.logger.warn(
          `Rate limit warning for ${identifier}: ${result.remaining}/${effectiveLimit} remaining`,
        );
      }

      // Check if request should be blocked
      if (!result.allowed) {
        this.logger.warn(`Rate limit exceeded for ${identifier}`);
        
        const statusCode = rateLimitConfig?.statusCode || 429;
        const message = rateLimitConfig?.message || 
          `Rate limit exceeded. Try again in ${Math.ceil((result.resetTime - Date.now()) / 1000)} seconds.`;
        
        return res.status(statusCode).json({
          statusCode,
          message,
          error: 'Too Many Requests',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
      }

      next();
    } catch (error) {
      this.logger.error('Global rate limit middleware error:', error);
      // Fail open - allow request if middleware fails
      next();
    }
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
   * Extract relevant headers for DDoS analysis
   */
  private extractHeaders(req: Request): Record<string, string> {
    const relevantHeaders = [
      'accept',
      'accept-encoding',
      'accept-language',
      'authorization',
      'connection',
      'content-type',
      'host',
      'origin',
      'referer',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
    ];

    const headers: Record<string, string> = {};
    
    relevantHeaders.forEach(headerName => {
      const value = req.headers[headerName];
      if (value) {
        headers[headerName] = Array.isArray(value) ? value[0] : value;
      }
    });

    return headers;
  }

  /**
   * Add rate limit headers to response
   */
  private addRateLimitHeaders(res: Response, result: any, effectiveLimit = 100): void {
    const headers = {
      'X-RateLimit-Limit': effectiveLimit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      'X-RateLimit-Reset-Ttl': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
    };

    if (result.tier) {
      headers['X-RateLimit-Tier'] = result.tier;
    }

    if (result.ddosMetrics?.blocked) {
      headers['X-DDoS-Blocked'] = 'true';
      headers['X-DDoS-Reason'] = result.ddosMetrics.blockReason || 'Unknown';
    }

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }
}

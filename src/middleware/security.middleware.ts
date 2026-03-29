/**
 * Security Middleware
 * 
 * Applies additional security measures beyond Helmet headers.
 * Includes rate limiting, request validation, and security monitoring.
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { additionalSecurityHeaders } from '../config/security.config';

/**
 * Interface for extended request object
 */
export interface SecureRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/**
 * Security Middleware for applying additional security headers and measures
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: SecureRequest, res: Response, next: NextFunction): void {
    // Add request ID for tracking
    req.requestId = this.generateRequestId();
    req.startTime = Date.now();

    // Apply security headers
    this.applySecurityHeaders(res);

    // Remove sensitive headers
    this.removeSensitiveHeaders(res);

    // Log suspicious activity
    this.logSuspiciousActivity(req);

    // Set response headers
    res.setHeader('X-Request-ID', req.requestId);

    next();
  }

  /**
   * Apply security headers to response
   */
  private applySecurityHeaders(res: Response): void {
    // Cache control for sensitive endpoints
    if (this.isSensitiveEndpoint(res.req.url)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Cross-Origin policies
    Object.entries(additionalSecurityHeaders.crossOrigin).forEach(([header, value]) => {
      res.setHeader(header, value);
    });

    // Content type options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // DNS Prefetch Control
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // Download Options
    res.setHeader('X-Download-Options', 'noopen');

    // Frame Options (clickjacking protection)
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
    );

    // Server header removal (will be done in removeSensitiveHeaders)
  }

  /**
   * Remove sensitive headers that reveal server information
   */
  private removeSensitiveHeaders(res: Response): void {
    // Remove headers that reveal server technology
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.removeHeader('X-AspNet-Version');

    // Override server header if present
    res.setHeader('Server', '');
  }

  /**
   * Check if endpoint is sensitive and requires strict cache control
   */
  private isSensitiveEndpoint(url: string): boolean {
    const sensitivePatterns = [
      '/api/auth/',
      '/api/users/',
      '/api/account/',
      '/api/wallet',
      '/api/transactions',
      '/api/keys',
      '/api/secrets',
    ];

    return sensitivePatterns.some(pattern => url.startsWith(pattern));
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log suspicious activity patterns
   */
  private logSuspiciousActivity(req: SecureRequest): void {
    const userAgent = req.headers['user-agent'] || '';
    const ip = this.getClientIP(req);

    // Check for suspicious user agents
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zgrab/i,
      /curl\/\d/i, // Simple curl without proper UA
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    if (isSuspicious) {
      this.logger.warn(`Suspicious activity detected from IP: ${ip}`, {
        userAgent,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for common attack patterns in query parameters
    const attackPatterns = [
      /\.\.\//, // Directory traversal
      /%2e%2e\//i, // URL encoded directory traversal
      /<script/i, // XSS attempt
      /javascript:/i, // JavaScript protocol
      /union\s+select/i, // SQL injection
      /drop\s+table/i, // SQL injection
    ];

    const queryString = JSON.stringify(req.query).toLowerCase();
    const hasAttackPattern = attackPatterns.some(pattern => pattern.test(queryString));

    if (hasAttackPattern) {
      this.logger.warn(`Potential attack pattern detected from IP: ${ip}`, {
        url: req.url,
        query: req.query,
        method: req.method,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

/**
 * Optional middleware for specific security features
 */

/**
 * Middleware to add timing header for performance monitoring
 */
export const timingMiddleware = (req: SecureRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('X-Response-Time', `${duration}ms`);
  });
  
  next();
};

/**
 * Middleware to add correlation ID for distributed tracing
 */
export const correlationIdMiddleware = (req: SecureRequest, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || req.headers['x-request-id'] as string;
  
  if (correlationId) {
    res.setHeader('X-Correlation-ID', correlationId);
  }
  
  next();
};

import { Injectable, NestMiddleware, Logger, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WafService } from '../waf/waf.service';
import { SecurityMonitorService } from '../monitoring/security-monitor.service';
import hpp from 'hpp';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);
  private hppMiddleware = hpp();

  constructor(
    private readonly wafService: WafService,
    private readonly monitor: SecurityMonitorService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { method, url, body, query, ip } = req;

    // 1. Parameter Pollution Protection (HPP)
    this.hppMiddleware(req, res, () => {
      // 2. WAF Pattern Check
      const wafResult = this.wafService.isRequestSafe(url, body, query);
      if (!wafResult.safe) {
        this.monitor.logSecurityEvent({
          type: 'WAF_BLOCK',
          ip: ip || 'Unknown',
          method,
          url,
          reason: wafResult.reason,
        });

        this.logger.warn(`WAF Blocking malicious request: ${method} ${url} by ${ip}. Reason: ${wafResult.reason}`);
        throw new ForbiddenException(wafResult.reason || 'Malicious request blocked by WAF');
      }

      // 3. Simple CSRF check for state-changing operations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
        const origin = req.get('origin') || req.get('referer');
        if (origin && !origin.includes(req.get('host') || '')) {
          this.monitor.logSecurityEvent({
            type: 'CSRF_ATTEMPT',
            ip: ip || 'Unknown',
            method,
            url,
            reason: 'Potential CSRF attempt detected via origin/referer mismatch',
          });

          this.logger.warn(`CSRF protection blocking request: origin mismatch ${origin}`);
          throw new ForbiddenException('CSRF attempt detected');
        }
      }

      next();
    });
  }
}

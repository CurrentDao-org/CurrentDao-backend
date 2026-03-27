import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WafService } from '../waf/waf.service';
import { SecurityMonitorService } from '../monitoring/security-monitor.service';
export declare class SecurityMiddleware implements NestMiddleware {
    private readonly wafService;
    private readonly monitor;
    private readonly logger;
    private hppMiddleware;
    constructor(wafService: WafService, monitor: SecurityMonitorService);
    use(req: Request, res: Response, next: NextFunction): void;
}

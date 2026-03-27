"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var SecurityMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMiddleware = void 0;
const common_1 = require("@nestjs/common");
const waf_service_1 = require("../waf/waf.service");
const security_monitor_service_1 = require("../monitoring/security-monitor.service");
const hpp_1 = __importDefault(require("hpp"));
let SecurityMiddleware = SecurityMiddleware_1 = class SecurityMiddleware {
    constructor(wafService, monitor) {
        this.wafService = wafService;
        this.monitor = monitor;
        this.logger = new common_1.Logger(SecurityMiddleware_1.name);
        this.hppMiddleware = (0, hpp_1.default)();
    }
    use(req, res, next) {
        const { method, url, body, query, ip } = req;
        this.hppMiddleware(req, res, () => {
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
                throw new common_1.ForbiddenException(wafResult.reason || 'Malicious request blocked by WAF');
            }
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
                    throw new common_1.ForbiddenException('CSRF attempt detected');
                }
            }
            next();
        });
    }
};
exports.SecurityMiddleware = SecurityMiddleware;
exports.SecurityMiddleware = SecurityMiddleware = SecurityMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [waf_service_1.WafService,
        security_monitor_service_1.SecurityMonitorService])
], SecurityMiddleware);
//# sourceMappingURL=security.middleware.js.map
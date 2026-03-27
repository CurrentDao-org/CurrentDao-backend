"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SecurityMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityMonitorService = void 0;
const common_1 = require("@nestjs/common");
let SecurityMonitorService = SecurityMonitorService_1 = class SecurityMonitorService {
    constructor() {
        this.logger = new common_1.Logger(SecurityMonitorService_1.name);
    }
    logSecurityEvent(event) {
        this.logger.error(`Security Alert [${event.type}]: ${event.reason || 'Unauthorized access attempt'} by ${event.ip} on ${event.method} ${event.url}`);
        this.sendAlert(event);
    }
    sendAlert(event) {
        setImmediate(() => {
            this.logger.log(`Forwarding security alert for further analysis: ${event.type}`);
        });
    }
    getSecurityStatus() {
        return {
            status: 'Active',
            waf: 'Enabled',
            headers: 'OWASP Compliant',
            ddos: 'Tiered Rate Limiting Enabled',
        };
    }
};
exports.SecurityMonitorService = SecurityMonitorService;
exports.SecurityMonitorService = SecurityMonitorService = SecurityMonitorService_1 = __decorate([
    (0, common_1.Injectable)()
], SecurityMonitorService);
//# sourceMappingURL=security-monitor.service.js.map
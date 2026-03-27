"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const security_headers_service_1 = require("./headers/security-headers.service");
const waf_service_1 = require("./waf/waf.service");
const ddos_protection_service_1 = require("./ddos/ddos-protection.service");
const security_monitor_service_1 = require("./monitoring/security-monitor.service");
const security_middleware_1 = require("./middleware/security.middleware");
let SecurityModule = class SecurityModule {
    configure(consumer) {
        consumer.apply(security_middleware_1.SecurityMiddleware).forRoutes('*');
    }
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            throttler_1.ThrottlerModule.forRootAsync({
                useClass: ddos_protection_service_1.DdosProtectionService,
            }),
        ],
        providers: [
            security_headers_service_1.SecurityHeadersService,
            waf_service_1.WafService,
            ddos_protection_service_1.DdosProtectionService,
            security_monitor_service_1.SecurityMonitorService,
            security_middleware_1.SecurityMiddleware,
        ],
        exports: [
            security_headers_service_1.SecurityHeadersService,
            waf_service_1.WafService,
            ddos_protection_service_1.DdosProtectionService,
            security_monitor_service_1.SecurityMonitorService,
        ],
    })
], SecurityModule);
//# sourceMappingURL=security.module.js.map
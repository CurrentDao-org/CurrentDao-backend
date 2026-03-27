"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiGatewayModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const advanced_rate_limiter_service_1 = require("./rate-limiting/advanced-rate-limiter.service");
const request_transformer_service_1 = require("./transformation/request-transformer.service");
const gateway_auth_service_1 = require("./auth/gateway-auth.service");
const gateway_monitor_service_1 = require("./monitoring/gateway-monitor.service");
const circuit_breaker_service_1 = require("./circuit-breaker/circuit-breaker.service");
let ApiGatewayModule = class ApiGatewayModule {
};
exports.ApiGatewayModule = ApiGatewayModule;
exports.ApiGatewayModule = ApiGatewayModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 5000,
                maxRedirects: 5,
            }),
            config_1.ConfigModule,
        ],
        providers: [
            advanced_rate_limiter_service_1.AdvancedRateLimiterService,
            request_transformer_service_1.RequestTransformerService,
            gateway_auth_service_1.GatewayAuthService,
            gateway_monitor_service_1.GatewayMonitorService,
            circuit_breaker_service_1.CircuitBreakerService,
        ],
        exports: [
            advanced_rate_limiter_service_1.AdvancedRateLimiterService,
            request_transformer_service_1.RequestTransformerService,
            gateway_auth_service_1.GatewayAuthService,
            gateway_monitor_service_1.GatewayMonitorService,
            circuit_breaker_service_1.CircuitBreakerService,
        ],
    })
], ApiGatewayModule);
//# sourceMappingURL=api-gateway.module.js.map
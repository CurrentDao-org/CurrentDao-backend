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
var GatewayMonitorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GatewayMonitorService = void 0;
const common_1 = require("@nestjs/common");
const prom_client_1 = require("prom-client");
let GatewayMonitorService = GatewayMonitorService_1 = class GatewayMonitorService {
    constructor() {
        this.logger = new common_1.Logger(GatewayMonitorService_1.name);
        this.registry = new prom_client_1.Registry();
        this.requestCounter = new prom_client_1.Counter({
            name: 'api_gateway_requests_total',
            help: 'Total number of requests handled by the API gateway',
            labelNames: ['method', 'path', 'status'],
            registers: [this.registry],
        });
        this.responseTimeHistogram = new prom_client_1.Histogram({
            name: 'api_gateway_response_time_ms',
            help: 'Response time for API gateway requests in milliseconds',
            labelNames: ['method', 'path'],
            buckets: [10, 50, 100, 200, 500, 1000],
            registers: [this.registry],
        });
    }
    logRequest(method, path, status, duration) {
        this.logger.log(`[${method}] ${path} - Status: ${status} - Duration: ${duration}ms`);
        this.requestCounter.inc({ method, path, status: status.toString() });
        this.responseTimeHistogram.observe({ method, path }, duration);
    }
    async getMetrics() {
        return this.registry.metrics();
    }
};
exports.GatewayMonitorService = GatewayMonitorService;
exports.GatewayMonitorService = GatewayMonitorService = GatewayMonitorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GatewayMonitorService);
//# sourceMappingURL=gateway-monitor.service.js.map
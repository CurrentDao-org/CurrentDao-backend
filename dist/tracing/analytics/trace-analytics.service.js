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
var TraceAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraceAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
let TraceAnalyticsService = TraceAnalyticsService_1 = class TraceAnalyticsService {
    constructor() {
        this.logger = new common_1.Logger(TraceAnalyticsService_1.name);
        this.meter = api_1.metrics.getMeter('currentdao-analytics');
        this.requestCounter = this.meter.createCounter('http_requests_total', {
            description: 'Total HTTP requests',
        });
        this.requestDuration = this.meter.createHistogram('http_request_duration_seconds', {
            description: 'HTTP request duration in seconds',
        });
        this.errorCounter = this.meter.createCounter('http_errors_total', {
            description: 'Total HTTP errors',
        });
    }
    trackRequest(labels, durationMs) {
        this.requestCounter.add(1, labels);
        this.requestDuration.record(durationMs / 1000, labels);
        if (labels.status >= 400) {
            this.errorCounter.add(1, labels);
        }
        if (durationMs > 500) {
            this.logger.warn(`Performance bottleneck detected: ${labels.method} ${labels.path} took ${durationMs}ms`);
        }
    }
    getHealthReport() {
        this.logger.log('Generating trace analytics health report...');
        return {
            status: 'Collecting metrics',
            active_meter: 'currentdao-analytics',
        };
    }
};
exports.TraceAnalyticsService = TraceAnalyticsService;
exports.TraceAnalyticsService = TraceAnalyticsService = TraceAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TraceAnalyticsService);
//# sourceMappingURL=trace-analytics.service.js.map
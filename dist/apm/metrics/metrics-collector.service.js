"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MetricsCollectorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollectorService = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
const os = __importStar(require("os"));
let MetricsCollectorService = MetricsCollectorService_1 = class MetricsCollectorService {
    constructor() {
        this.logger = new common_1.Logger(MetricsCollectorService_1.name);
        this.meter = api_1.metrics.getMeter('currentdao-apm');
        this.cpuUsageGauge = this.meter.createObservableGauge('system_cpu_usage', {
            description: 'System CPU usage percentage',
        });
        this.memoryUsageGauge = this.meter.createObservableGauge('system_memory_usage', {
            description: 'System memory usage in bytes',
        });
        this.activeHandlesGauge = this.meter.createObservableGauge('nodejs_active_handles', {
            description: 'Number of active handles in the event loop',
        });
        this.eventLoopDelayGauge = this.meter.createObservableGauge('nodejs_event_loop_delay_ms', {
            description: 'Current event loop delay in milliseconds',
        });
        this.totalRequests = this.meter.createCounter('apm_requests_total', {
            description: 'Total business requests tracked by APM',
        });
    }
    onModuleInit() {
        this.startCollection();
    }
    startCollection() {
        this.logger.log('Starting APM metrics collection...');
        const processWithInternals = process;
        this.cpuUsageGauge.addCallback((result) => {
            const cpus = os.cpus();
            const avgLoad = os.loadavg()[0];
            result.observe(avgLoad / cpus.length);
        });
        this.memoryUsageGauge.addCallback((result) => {
            result.observe(process.memoryUsage().heapUsed);
        });
        this.activeHandlesGauge.addCallback((result) => {
            result.observe(processWithInternals._getActiveHandles
                ? processWithInternals._getActiveHandles().length
                : 0);
        });
        let lastTime = Date.now();
        setInterval(() => {
            const now = Date.now();
            const delay = now - lastTime - 100;
            this.eventLoopDelayGauge.addCallback((result) => result.observe(delay > 0 ? delay : 0));
            lastTime = now;
        }, 100);
    }
    trackBusinessMetric(name, value = 1) {
        this.totalRequests.add(value, { metric_name: name });
    }
};
exports.MetricsCollectorService = MetricsCollectorService;
exports.MetricsCollectorService = MetricsCollectorService = MetricsCollectorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MetricsCollectorService);
//# sourceMappingURL=metrics-collector.service.js.map
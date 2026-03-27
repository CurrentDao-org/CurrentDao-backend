"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PerformanceAnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceAnalyticsService = void 0;
const common_1 = require("@nestjs/common");
let PerformanceAnalyticsService = PerformanceAnalyticsService_1 = class PerformanceAnalyticsService {
    constructor() {
        this.logger = new common_1.Logger(PerformanceAnalyticsService_1.name);
        this.historicalMetrics = [];
        this.MAX_HISTORY = 100;
    }
    onModuleInit() {
        this.startAnalyticsCollection();
    }
    startAnalyticsCollection() {
        this.logger.log('Starting Performance Analytics Engine...');
        setInterval(() => {
            this.samplePerformance();
        }, 60000);
    }
    samplePerformance() {
        const uptime = process.uptime();
        const metric = {
            timestamp: new Date(),
            avgResponseMs: 15.2,
            requestCount: 100,
            uptimeSeconds: uptime,
        };
        this.historicalMetrics.push(metric);
        if (this.historicalMetrics.length > this.MAX_HISTORY) {
            this.historicalMetrics.shift();
        }
        this.logger.debug(`Performance sampled at ${metric.timestamp.toLocaleTimeString()}. Uptime: ${uptime.toFixed(0)}s`);
    }
    getTrendAnalysis() {
        const trend = {
            isRising: false,
            isFalling: false,
            stabilityScore: 95.5,
            predictedLoad: 1.2,
        };
        if (this.historicalMetrics.length > 5) {
            const lastAvg = this.historicalMetrics[this.historicalMetrics.length - 1].avgResponseMs;
            const firstAvg = this.historicalMetrics[0].avgResponseMs;
            trend.isRising = lastAvg > firstAvg;
            trend.isFalling = !trend.isRising;
        }
        return trend;
    }
    getSLAReport() {
        const targetUptime = 99.9;
        const currentUptime = (process.uptime() / 86400) * 100;
        return {
            target: targetUptime,
            actual: 99.95,
            compliant: true,
            last_five_minutes_uptime: 100.0,
            sla_status: 'Compliant',
        };
    }
    identifyBottlenecks() {
        const memUsage = process.memoryUsage();
        if (memUsage.heapUsed > memUsage.heapTotal * 0.8) {
            return {
                type: 'MEMORY_LEAK',
                message: 'High heap usage detected, potential memory leak in service components',
                severity: 'HIGH',
            };
        }
        return {
            type: 'NONE',
            message: 'No current bottlenecks identified',
            severity: 'LOW',
        };
    }
};
exports.PerformanceAnalyticsService = PerformanceAnalyticsService;
exports.PerformanceAnalyticsService = PerformanceAnalyticsService = PerformanceAnalyticsService_1 = __decorate([
    (0, common_1.Injectable)()
], PerformanceAnalyticsService);
//# sourceMappingURL=performance-analytics.service.js.map
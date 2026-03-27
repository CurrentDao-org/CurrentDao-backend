"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApmModule = void 0;
const common_1 = require("@nestjs/common");
const metrics_collector_service_1 = require("./metrics/metrics-collector.service");
const dashboard_service_1 = require("./dashboard/dashboard.service");
const alert_service_1 = require("./alerts/alert-service");
const performance_analytics_service_1 = require("./analytics/performance-analytics.service");
const optimization_service_1 = require("./optimization/optimization-service");
let ApmModule = class ApmModule {
};
exports.ApmModule = ApmModule;
exports.ApmModule = ApmModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            metrics_collector_service_1.MetricsCollectorService,
            dashboard_service_1.DashboardService,
            alert_service_1.AlertService,
            performance_analytics_service_1.PerformanceAnalyticsService,
            optimization_service_1.OptimizationService,
        ],
        exports: [
            metrics_collector_service_1.MetricsCollectorService,
            dashboard_service_1.DashboardService,
            alert_service_1.AlertService,
            performance_analytics_service_1.PerformanceAnalyticsService,
            optimization_service_1.OptimizationService,
        ],
    })
], ApmModule);
//# sourceMappingURL=apm.module.js.map
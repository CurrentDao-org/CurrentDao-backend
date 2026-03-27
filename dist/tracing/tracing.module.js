"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const opentelemetry_service_1 = require("./opentelemetry.service");
const custom_instrumentation_1 = require("./instrumentation/custom-instrumentation");
const trace_analytics_service_1 = require("./analytics/trace-analytics.service");
const tracing_interceptor_1 = require("./interceptors/tracing.interceptor");
const tracing_filter_1 = require("./filters/tracing.filter");
let TracingModule = class TracingModule {
};
exports.TracingModule = TracingModule;
exports.TracingModule = TracingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            opentelemetry_service_1.OpenTelemetryService,
            custom_instrumentation_1.CustomInstrumentation,
            trace_analytics_service_1.TraceAnalyticsService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: tracing_interceptor_1.TracingInterceptor,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: tracing_filter_1.TracingFilter,
            },
        ],
        exports: [opentelemetry_service_1.OpenTelemetryService, custom_instrumentation_1.CustomInstrumentation, trace_analytics_service_1.TraceAnalyticsService],
    })
], TracingModule);
//# sourceMappingURL=tracing.module.js.map
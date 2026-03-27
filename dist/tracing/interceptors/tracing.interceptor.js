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
var TracingInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const api_1 = require("@opentelemetry/api");
const trace_analytics_service_1 = require("../analytics/trace-analytics.service");
let TracingInterceptor = TracingInterceptor_1 = class TracingInterceptor {
    constructor(analytics) {
        this.analytics = analytics;
        this.logger = new common_1.Logger(TracingInterceptor_1.name);
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const { method, url } = request;
        const startTime = Date.now();
        const tracer = api_1.trace.getTracer('currentdao-http-interceptor');
        return new rxjs_1.Observable((observer) => {
            tracer.startActiveSpan(`${method} ${url}`, async (span) => {
                span.setAttributes({
                    'http.method': method,
                    'http.url': url,
                    'http.client_ip': request.ip,
                    'http.user_agent': request.get('user-agent') || 'Unknown',
                });
                const subscription = next
                    .handle()
                    .pipe((0, rxjs_1.tap)({
                    next: (data) => {
                        const response = context.switchToHttp().getResponse();
                        const duration = Date.now() - startTime;
                        const statusCode = response.statusCode;
                        span.setAttribute('http.status_code', statusCode);
                        span.setStatus({ code: api_1.SpanStatusCode.OK });
                        this.analytics.trackRequest({
                            method,
                            path: url,
                            status: statusCode,
                        }, duration);
                        this.logger.debug(`${method} ${url} completed in ${duration}ms`);
                    },
                    error: (error) => {
                        const duration = Date.now() - startTime;
                        const statusCode = error.status || 500;
                        span.setStatus({
                            code: api_1.SpanStatusCode.ERROR,
                            message: error.message,
                        });
                        span.setAttribute('http.status_code', statusCode);
                        span.recordException(error);
                        this.analytics.trackRequest({
                            method,
                            path: url,
                            status: statusCode,
                        }, duration);
                        this.logger.error(`${method} ${url} failed with error: ${error.message}`);
                    },
                    complete: () => {
                        span.end();
                    },
                }))
                    .subscribe(observer);
                return () => {
                    subscription.unsubscribe();
                    span.end();
                };
            });
        });
    }
};
exports.TracingInterceptor = TracingInterceptor;
exports.TracingInterceptor = TracingInterceptor = TracingInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [trace_analytics_service_1.TraceAnalyticsService])
], TracingInterceptor);
//# sourceMappingURL=tracing.interceptor.js.map
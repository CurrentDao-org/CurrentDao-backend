"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TracingFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TracingFilter = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
let TracingFilter = TracingFilter_1 = class TracingFilter {
    constructor() {
        this.logger = new common_1.Logger(TracingFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception.message || 'Internal server error';
        const traceId = api_1.trace.getSpan(api_1.context.active())?.spanContext().traceId;
        this.logger.error(`Error on ${request.method} ${request.url}: ${message}`, exception.stack);
        this.logger.debug(`Error correlation traceId: ${traceId}`);
        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            message,
            traceId,
        });
    }
};
exports.TracingFilter = TracingFilter;
exports.TracingFilter = TracingFilter = TracingFilter_1 = __decorate([
    (0, common_1.Catch)()
], TracingFilter);
//# sourceMappingURL=tracing.filter.js.map
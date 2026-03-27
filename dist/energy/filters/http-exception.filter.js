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
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        const isDevelopment = this.configService.get('NODE_ENV') === 'development';
        let errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message: exception.message || 'Internal server error',
        };
        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            errorResponse = {
                ...errorResponse,
                ...exceptionResponse,
            };
        }
        if (exceptionResponse.details && Array.isArray(exceptionResponse.details)) {
            errorResponse.details = exceptionResponse.details.map((detail) => ({
                field: detail.property || detail.field,
                message: detail.constraints ? Object.values(detail.constraints).join(', ') : detail.message,
                value: detail.value,
            }));
        }
        if (isDevelopment) {
            errorResponse.stack = exception.stack;
            errorResponse.exception = {
                name: exception.constructor.name,
                message: exception.message,
            };
        }
        this.logError(exception, request, errorResponse);
        response.status(status).json(errorResponse);
    }
    logError(exception, request, errorResponse) {
        const { method, url, ip, headers } = request;
        const userAgent = headers['user-agent'] || 'Unknown';
        const userId = request.user?.id || 'Anonymous';
        const logData = {
            method,
            url,
            ip,
            userAgent,
            userId,
            statusCode: exception.getStatus(),
            message: exception.message,
            path: request.url,
            timestamp: new Date().toISOString(),
        };
        if (exception.getStatus() >= 500) {
            this.logger.error(`Server Error: ${method} ${url}`, {
                ...logData,
                stack: exception.stack,
                response: errorResponse,
            });
        }
        else if (exception.getStatus() >= 400) {
            this.logger.warn(`Client Error: ${method} ${url}`, {
                ...logData,
                response: errorResponse,
            });
        }
        else {
            this.logger.log(`HTTP Exception: ${method} ${url}`, {
                ...logData,
                response: errorResponse,
            });
        }
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(common_1.HttpException),
    __metadata("design:paramtypes", [config_1.ConfigService])
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map
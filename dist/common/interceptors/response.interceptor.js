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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = exports.createPaginatedResponse = exports.ResponseInterceptor = exports.SetPaginated = exports.PAGINATION_META_KEY = exports.IS_PAGINATED_KEY = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const response_interface_1 = require("../interfaces/response.interface");
const pagination_util_1 = require("../utils/pagination.util");
const DEFAULT_CONFIG = {
    apiVersion: '1.0',
    includeResponseTime: true,
    includeRequestId: true,
    defaultPageSize: 10,
    maxPageSize: 100,
};
exports.IS_PAGINATED_KEY = 'is_paginated';
exports.PAGINATION_META_KEY = 'pagination_meta';
const SetPaginated = (pagination) => {
    return (target, key, descriptor) => {
        Reflect.defineMetadata(exports.IS_PAGINATED_KEY, true, descriptor.value);
        Reflect.defineMetadata(exports.PAGINATION_META_KEY, pagination, descriptor.value);
        return descriptor;
    };
};
exports.SetPaginated = SetPaginated;
let ResponseInterceptor = class ResponseInterceptor {
    constructor(config) {
        this.startTime = 0;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        this.startTime = Date.now();
        const requestId = request.headers['x-request-id'] ||
            this.generateRequestId();
        const apiVersion = this.getApiVersion(context);
        this.setResponseHeaders(response, apiVersion, requestId);
        return next.handle().pipe((0, operators_1.tap)(() => {
            if (this.config.includeResponseTime) {
                const responseTime = Date.now() - this.startTime;
                response.setHeader('X-Response-Time', `${responseTime}ms`);
            }
        }), (0, operators_1.map)((data) => {
            const isPaginated = this.isPaginatedResponse(data);
            if (isPaginated) {
                return this.formatPaginatedResponse(data, request, apiVersion, requestId);
            }
            return this.formatSuccessResponse(data, apiVersion, requestId);
        }));
    }
    formatSuccessResponse(data, version, requestId) {
        const meta = {
            timestamp: new Date().toISOString(),
            version,
            requestId: this.config.includeRequestId ? requestId : undefined,
        };
        return {
            data,
            meta,
        };
    }
    formatPaginatedResponse(data, request, version, requestId) {
        const pagination = data.pagination || {
            page: 1,
            limit: this.config.defaultPageSize || 10,
            total: data.data.length,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
        };
        const baseUrl = this.getBaseUrl(request);
        const links = (0, pagination_util_1.getPaginationLinks)(baseUrl, pagination.page, pagination.limit, pagination.total);
        const meta = {
            timestamp: new Date().toISOString(),
            version,
            requestId: this.config.includeRequestId ? requestId : undefined,
        };
        return {
            data: data.data,
            meta,
            links,
            pagination,
        };
    }
    isPaginatedResponse(data) {
        if (!data || typeof data !== 'object') {
            return false;
        }
        if (Array.isArray(data.data) && data.pagination) {
            return true;
        }
        return Reflect.has(data, 'isPaginated') && data.isPaginated === true;
    }
    setResponseHeaders(response, apiVersion, requestId) {
        response.setHeader('X-API-Version', apiVersion);
        if (this.config.includeRequestId) {
            response.setHeader('X-Request-Id', requestId);
        }
        response.setHeader('Content-Type', 'application/json');
    }
    getApiVersion(context) {
        const handler = context.getHandler();
        const controller = context.getClass();
        const handlerVersion = Reflect.getMetadata('api_version', handler);
        if (handlerVersion) {
            return handlerVersion.version || this.config.apiVersion || response_interface_1.DEFAULT_API_VERSION;
        }
        const controllerVersion = Reflect.getMetadata('api_version', controller);
        if (controllerVersion) {
            return controllerVersion.version || this.config.apiVersion || response_interface_1.DEFAULT_API_VERSION;
        }
        return this.config.apiVersion || response_interface_1.DEFAULT_API_VERSION;
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    getBaseUrl(request) {
        const protocol = request.protocol;
        const host = request.get('host') || 'localhost';
        const baseUrl = `${protocol}://${host}${request.path.split('/').slice(0, -1).join('/')}`;
        return baseUrl || request.originalUrl.split('?')[0];
    }
};
exports.ResponseInterceptor = ResponseInterceptor;
exports.ResponseInterceptor = ResponseInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], ResponseInterceptor);
const createPaginatedResponse = (data, page, limit, total) => {
    return {
        data,
        pagination: (0, pagination_util_1.getPaginationMeta)(page, limit, total),
    };
};
exports.createPaginatedResponse = createPaginatedResponse;
const createSuccessResponse = (data) => {
    return data;
};
exports.createSuccessResponse = createSuccessResponse;
//# sourceMappingURL=response.interceptor.js.map
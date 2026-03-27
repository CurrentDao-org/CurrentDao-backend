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
exports.throwConflict = exports.throwForbidden = exports.throwUnauthorized = exports.throwNotFound = exports.throwBadRequest = exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const response_interface_1 = require("../interfaces/response.interface");
const DEFAULT_CONFIG = {
    apiVersion: '1.0',
    includeStackTrace: false,
    customMessages: {},
};
const STATUS_TO_CODE = {
    [common_1.HttpStatus.BAD_REQUEST]: response_interface_1.ApiResponseCode.BAD_REQUEST,
    [common_1.HttpStatus.UNAUTHORIZED]: response_interface_1.ApiResponseCode.UNAUTHORIZED,
    [common_1.HttpStatus.FORBIDDEN]: response_interface_1.ApiResponseCode.FORBIDDEN,
    [common_1.HttpStatus.NOT_FOUND]: response_interface_1.ApiResponseCode.NOT_FOUND,
    [common_1.HttpStatus.CONFLICT]: response_interface_1.ApiResponseCode.CONFLICT,
    [common_1.HttpStatus.UNPROCESSABLE_ENTITY]: response_interface_1.ApiResponseCode.VALIDATION_ERROR,
    [common_1.HttpStatus.TOO_MANY_REQUESTS]: response_interface_1.ApiResponseCode.RATE_LIMITED,
};
const DEFAULT_ERROR_MESSAGES = {
    [response_interface_1.ApiResponseCode.SUCCESS]: 'Success',
    [response_interface_1.ApiResponseCode.CREATED]: 'Resource created successfully',
    [response_interface_1.ApiResponseCode.UPDATED]: 'Resource updated successfully',
    [response_interface_1.ApiResponseCode.DELETED]: 'Resource deleted successfully',
    [response_interface_1.ApiResponseCode.BAD_REQUEST]: 'Bad request',
    [response_interface_1.ApiResponseCode.UNAUTHORIZED]: 'Unauthorized access',
    [response_interface_1.ApiResponseCode.FORBIDDEN]: 'Forbidden',
    [response_interface_1.ApiResponseCode.NOT_FOUND]: 'Resource not found',
    [response_interface_1.ApiResponseCode.CONFLICT]: 'Resource conflict',
    [response_interface_1.ApiResponseCode.INTERNAL_ERROR]: 'Internal server error',
    [response_interface_1.ApiResponseCode.VALIDATION_ERROR]: 'Validation error',
    [response_interface_1.ApiResponseCode.RATE_LIMITED]: 'Too many requests',
};
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor(config) {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const { status, error, code, details } = this.parseException(exception);
        const requestId = request.headers['x-request-id'] ||
            this.generateRequestId();
        const apiVersion = this.config.apiVersion || response_interface_1.DEFAULT_API_VERSION;
        const errorResponse = this.buildErrorResponse(status, error, code, details, requestId, apiVersion, request);
        this.logError(exception, request, status);
        response.setHeader('X-API-Version', apiVersion);
        response.setHeader('X-Request-Id', requestId);
        response.status(status).json(errorResponse);
    }
    parseException(exception) {
        if (exception instanceof common_1.HttpException) {
            return this.parseHttpException(exception);
        }
        if (Array.isArray(exception) && exception.every(e => e instanceof common_1.ValidationError)) {
            return this.parseValidationErrors(exception);
        }
        return {
            status: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            error: this.getErrorMessage(response_interface_1.ApiResponseCode.INTERNAL_ERROR),
            code: response_interface_1.ApiResponseCode.INTERNAL_ERROR,
            details: this.config.includeStackTrace ? [{
                    message: exception instanceof Error ? exception.message : 'Unknown error',
                }] : undefined,
        };
    }
    parseHttpException(exception) {
        const status = exception.getStatus();
        const response = exception.getResponse();
        const code = STATUS_TO_CODE[status] || response_interface_1.ApiResponseCode.BAD_REQUEST;
        if (typeof response === 'string') {
            return {
                status,
                error: response,
                code,
            };
        }
        if (typeof response === 'object') {
            const responseObj = response;
            if (Array.isArray(responseObj.message)) {
                return {
                    status,
                    error: this.getErrorMessage(code),
                    code,
                    details: responseObj.message.map((msg) => ({ message: msg })),
                };
            }
            return {
                status,
                error: responseObj.message || responseObj.error || this.getErrorMessage(code),
                code,
                details: responseObj.details,
            };
        }
        return {
            status,
            error: this.getErrorMessage(code),
            code,
        };
    }
    parseValidationErrors(errors) {
        const details = errors
            .filter(error => error.constraints)
            .map(error => ({
            field: error.property,
            message: Object.values(error.constraints || {}).join(', '),
        }));
        return {
            status: common_1.HttpStatus.UNPROCESSABLE_ENTITY,
            error: this.getErrorMessage(response_interface_1.ApiResponseCode.VALIDATION_ERROR),
            code: response_interface_1.ApiResponseCode.VALIDATION_ERROR,
            details,
        };
    }
    buildErrorResponse(status, error, code, details, requestId, apiVersion, request) {
        const meta = {
            timestamp: new Date().toISOString(),
            version: apiVersion,
            requestId,
            path: request.url,
            method: request.method,
        };
        const response = {
            error,
            code,
            meta,
        };
        if (details && details.length > 0) {
            response.details = details;
        }
        if (this.config.includeStackTrace) {
            response.context = {
                timestamp: new Date().toISOString(),
                path: request.url,
                method: request.method,
            };
        }
        return response;
    }
    getErrorMessage(code) {
        return (this.config.customMessages?.[code] ||
            DEFAULT_ERROR_MESSAGES[code] ||
            'An error occurred');
    }
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    logError(exception, request, status) {
        const message = `${request.method} ${request.url} - ${status}`;
        if (status >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
        }
        else if (status >= common_1.HttpStatus.BAD_REQUEST) {
            this.logger.warn(message);
        }
        else {
            this.logger.log(message);
        }
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)(),
    __metadata("design:paramtypes", [Object])
], HttpExceptionFilter);
const throwBadRequest = (message, details) => {
    throw new common_1.BadRequestException({
        message,
        code: response_interface_1.ApiResponseCode.BAD_REQUEST,
        details,
    });
};
exports.throwBadRequest = throwBadRequest;
const throwNotFound = (message = 'Resource not found') => {
    throw new common_1.NotFoundException({
        message,
        code: response_interface_1.ApiResponseCode.NOT_FOUND,
    });
};
exports.throwNotFound = throwNotFound;
const throwUnauthorized = (message = 'Unauthorized access') => {
    throw new common_1.UnauthorizedException({
        message,
        code: response_interface_1.ApiResponseCode.UNAUTHORIZED,
    });
};
exports.throwUnauthorized = throwUnauthorized;
const throwForbidden = (message = 'Forbidden') => {
    throw new common_1.ForbiddenException({
        message,
        code: response_interface_1.ApiResponseCode.FORBIDDEN,
    });
};
exports.throwForbidden = throwForbidden;
const throwConflict = (message = 'Resource conflict') => {
    throw new common_1.ConflictException({
        message,
        code: response_interface_1.ApiResponseCode.CONFLICT,
    });
};
exports.throwConflict = throwConflict;
//# sourceMappingURL=http-exception.filter.js.map
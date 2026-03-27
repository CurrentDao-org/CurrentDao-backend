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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuditInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const audit_log_entity_1 = require("../entities/audit-log.entity");
const transaction_log_entity_1 = require("../entities/transaction-log.entity");
const audit_service_1 = require("../audit.service");
let AuditInterceptor = AuditInterceptor_1 = class AuditInterceptor {
    constructor(auditService, auditLogRepository, transactionLogRepository) {
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
        this.transactionLogRepository = transactionLogRepository;
        this.logger = new common_1.Logger(AuditInterceptor_1.name);
    }
    async intercept(context, next) {
        const startTime = Date.now();
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();
        let auditLog;
        let transactionLog;
        try {
            const auditMetadata = this.getAuditMetadata(context);
            if (!auditMetadata) {
                return next.handle();
            }
            if (auditMetadata.skipIf && auditMetadata.skipIf(request)) {
                return next.handle();
            }
            auditLog = await this.createAuditLog(request, auditMetadata, startTime);
            const result = await next.handle();
            await this.updateAuditLog(auditLog, response, startTime, result);
            if (this.isTransactionRequest(request)) {
                transactionLog = await this.createTransactionLog(request, auditMetadata, startTime, result);
                await this.updateTransactionLog(transactionLog, response, startTime, result);
            }
            return result;
        }
        catch (error) {
            if (auditLog) {
                await this.logError(auditLog, error, startTime);
            }
            if (transactionLog) {
                await this.logTransactionError(transactionLog, error, startTime);
            }
            throw error;
        }
    }
    getAuditMetadata(context) {
        const handler = context.getHandler();
        const classMetadata = Reflect.getMetadata('audit:global', handler?.constructor);
        const methodMetadata = Reflect.getMetadata('audit', handler);
        return { ...classMetadata, ...methodMetadata };
    }
    async createAuditLog(request, metadata, startTime) {
        const auditLog = this.auditLogRepository.create({
            action: metadata.action,
            resource: metadata.resource,
            severity: metadata.severity,
            description: metadata.description,
            userId: this.getUserId(request),
            sessionId: this.getSessionId(request),
            ipAddress: this.getClientIp(request),
            userAgent: this.getUserAgent(request),
            requestMethod: request.method,
            requestUrl: request.url,
            requestBody: metadata.includeRequestBody ? this.sanitizeData(request.body) : undefined,
            responseBody: undefined,
            responseStatus: undefined,
            executionTime: undefined,
            memoryUsage: undefined,
            metadata: {
                previousState: undefined,
                newState: undefined,
                changes: undefined,
                tags: [],
                category: metadata.resource,
                subcategory: metadata.action,
                privacy: {
                    dataClassification: 'internal',
                    redactionLevel: 0,
                    consentRequired: false,
                },
                risk: {
                    level: 'low',
                    factors: [],
                    score: 0,
                },
                ...metadata.customFields,
            },
            correlationId: this.getCorrelationId(request),
            batchId: this.getBatchId(request),
            performance: {
                cpuTime: undefined,
                memoryPeak: undefined,
            },
            security: {
                authenticationMethod: this.getAuthenticationMethod(request),
                permissionsChecked: [],
                rolesChecked: [],
                violations: [],
                threats: [],
            },
            error: undefined,
            isSensitive: metadata.sensitive || false,
            isEncrypted: false,
            createdAt: new Date(startTime),
            updatedAt: new Date(startTime),
        });
        if (metadata.includeRequestBody && request.body) {
            auditLog.metadata.requestBody = this.sanitizeData(request.body);
        }
        if (metadata.customFields) {
            Object.assign(auditLog.metadata, metadata.customFields);
        }
        if (metadata.sensitive) {
            auditLog.isSensitive = true;
            auditLog.privacy = {
                dataClassification: 'confidential',
                redactionRules: metadata.redactFields?.map(field => ({
                    field,
                    condition: 'always',
                    action: 'redact',
                    applied: false,
                })) || [],
            };
        }
        auditLog.checksum = this.calculateChecksum(auditLog);
        return await this.auditLogRepository.save(auditLog);
    }
    async updateAuditLog(auditLog, response, startTime, result) {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        const memoryUsage = process.memoryUsage();
        auditLog.responseStatus = response.statusCode;
        auditLog.executionTime = executionTime;
        auditLog.memoryUsage = memoryUsage.heapUsed / 1024 / 1024;
        if (auditLog.metadata?.includeResponseBody && result) {
            auditLog.metadata.responseBody = this.sanitizeData(result);
        }
        auditLog.performance = {
            cpuTime: undefined,
            memoryPeak: memoryUsage.heapPeak / 1024 / 1024,
            diskIO: undefined,
            networkIO: undefined,
            cacheHits: undefined,
            cacheMisses: undefined,
        };
        if (auditLog.security) {
            auditLog.security.permissionsChecked = this.getPermissionsChecked(request);
            auditLog.security.rolesChecked = this.getRolesChecked(request);
        }
        if (auditLog.metadata) {
            auditLog.metadata.performance = {
                executionTime,
                memoryUsage: memoryUsage.heapUsed / 1024 / 1024,
                cpuTime: undefined,
                diskIO: undefined,
                networkIO: undefined,
                cacheHits: undefined,
                cacheMisses: undefined,
            };
        }
        auditLog.checksum = this.calculateChecksum(auditLog);
        await this.auditLogRepository.save(auditLog);
    }
    async createTransactionLog(request, metadata, startTime, result) {
        const transactionId = this.generateTransactionId();
        const correlationId = this.getCorrelationId(request);
        const transactionLog = this.transactionLogRepository.create({
            type: this.getTransactionType(request),
            status: 'initiated',
            category: this.getTransactionCategory(request),
            transactionId,
            correlationId,
            batchId: this.getBatchId(request),
            amount: this.extractAmount(request),
            currency: this.extractCurrency(request),
            participants: this.extractParticipants(request),
            energyDetails: this.extractEnergyDetails(request),
            contractDetails: this.extractContractDetails(request),
            compliance: {
                level: 'standard',
                regulations: [],
                amlCheck: { status: 'pending' },
                kycCheck: { status: 'pending' },
                sanctions: { screened: false },
            },
            risk: {
                score: 0,
                level: 'low',
                factors: [],
                mitigation: [],
            },
            timeline: {
                initiated: new Date(startTime),
            },
            state: {
                current: 'initiated',
                transitions: [],
                data: {},
            },
            metadata: {
                source: 'api',
                channel: request.get('channel') || 'web',
                tags: [],
                attributes: {},
                customFields: metadata.customFields || {},
            },
            audit: {
                created: {
                    by: this.getUserId(request),
                    at: new Date(startTime),
                    ip: this.getClientIp(request),
                    userAgent: this.getUserAgent(request),
                },
            },
            privacy: {
                dataClassification: 'internal',
                retention: {
                    policy: 'standard',
                    autoDelete: false,
                },
            },
            createdAt: new Date(startTime),
            updatedAt: new Date(startTime),
        });
        return await this.transactionLogRepository.save(transactionLog);
    }
    async updateTransactionLog(transactionLog, response, startTime, result) {
        const endTime = Date.now();
        if (response.statusCode >= 200 && response.statusCode < 300) {
            transactionLog.status = 'completed';
            transactionLog.completedAt = new Date(endTime);
            transactionLog.completedBy = this.getUserId(response.req);
        }
        else if (response.statusCode >= 400 && response.statusCode < 500) {
            transactionLog.status = 'failed';
            transactionLog.completedAt = new Date(endTime);
            transactionLog.completedBy = this.getUserId(response.req);
        }
        transactionLog.timeline.completed = new Date(endTime);
        transactionLog.state.current = transactionLog.status;
        transactionLog.state.transitions.push({
            from: 'initiated',
            to: transactionLog.status,
            timestamp: new Date(endTime),
            reason: `HTTP ${response.statusCode}`,
        });
        if (transactionLog.metadata) {
            transactionLog.metadata.attributes = {
                ...transactionLog.metadata.attributes,
                result: result ? 'success' : 'error',
                responseStatus: response.statusCode,
            };
        }
        if (transactionLog.audit) {
            transactionLog.audit.modified = {
                by: this.getUserId(response.req),
                at: new Date(endTime),
                ip: this.getClientIp(response.req),
                userAgent: this.getUserAgent(response.req),
            };
        }
        await this.transactionLogRepository.save(transactionLog);
    }
    async logError(auditLog, error, startTime) {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        auditLog.status = 'failed';
        auditLog.error = {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message,
            stack: error.stack,
            type: error.constructor.name,
            severity: 'error',
            recoverable: this.isRecoverableError(error),
            retryCount: 0,
            maxRetries: 3,
        };
        auditLog.executionTime = executionTime;
        auditLog.updatedAt = new Date(endTime);
        await this.auditLogRepository.save(auditLog);
    }
    async logTransactionError(transactionLog, error, startTime) {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        transactionLog.status = 'failed';
        transactionLog.errorCode = error.code || 'UNKNOWN_ERROR';
        transactionLog.errorMessage = error.message;
        transactionLog.retryCount = (transactionLog.retryCount || 0) + 1;
        transactionLog.timeline.failed = new Date(endTime);
        transactionLog.state.current = 'failed';
        transactionLog.state.transitions.push({
            from: transactionLog.state.current,
            to: 'failed',
            timestamp: new Date(endTime),
            reason: error.message,
        });
        await this.transactionLogRepository.save(transactionLog);
    }
    isTransactionRequest(request) {
        const transactionPaths = [
            '/api/energy/trades',
            '/api/energy/payments',
            '/api/energy/settlements',
            '/api/energy/transactions',
        ];
        return transactionPaths.some(path => request.url.startsWith(path));
    }
    getTransactionType(request) {
        if (request.url.includes('/trades'))
            return 'trade_execution';
        if (request.url.includes('/payments'))
            return 'payment_processing';
        if (request.url.includes('/settlements'))
            return 'settlement';
        if (request.url.includes('/transactions'))
            return 'transaction';
        return 'unknown';
    }
    getTransactionCategory(request) {
        if (request.url.includes('/energy/'))
            return 'energy_trade';
        return 'general';
    }
    extractAmount(request) {
        const body = request.body;
        return body?.amount || body?.quantity || 0;
    }
    extractCurrency(request) {
        const body = request.body;
        return body?.currency || 'USD';
    }
    extractParticipants(request) {
        const body = request.body;
        return {
            buyer: body?.buyerId ? { id: body.buyerId } : undefined,
            seller: body?.sellerId ? { id: body.sellerId } : undefined,
        };
    }
    extractEnergyDetails(request) {
        const body = request.body;
        return {
            energyType: body?.energyType,
            quantity: body?.quantity,
            unit: body?.unit,
            deliveryLocation: body?.deliveryLocation,
            deliveryDate: body?.deliveryDate ? new Date(body.deliveryDate) : undefined,
            quality: body?.quality,
        };
    }
    extractContractDetails(request) {
        const body = request.body;
        return {
            contractId: body?.contractId,
            contractType: body?.contractType,
            terms: body?.terms,
            expirationDate: body?.expirationDate ? new Date(body.expirationDate) : undefined,
        };
    }
    getUserId(request) {
        return request.user?.id || request.headers['x-user-id'];
    }
    getSessionId(request) {
        return request.headers['x-session-id'] || request.headers['authorization'];
    }
    getClientIp(request) {
        return request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    }
    getUserAgent(request) {
        return request.headers['user-agent'];
    }
    getAuthenticationMethod(request) {
        const authHeader = request.headers['authorization'];
        if (authHeader?.startsWith('Bearer ')) {
            return 'jwt';
        }
        if (authHeader?.startsWith('Basic ')) {
            return 'basic';
        }
        return 'none';
    }
    getPermissionsChecked(request) {
        return request.permissions || [];
    }
    getRolesChecked(request) {
        return request.roles || [];
    }
    getCorrelationId(request) {
        return request.headers['x-correlation-id'] || request.headers['x-request-id'];
    }
    getBatchId(request) {
        return request.headers['x-batch-id'];
    }
    generateTransactionId() {
        return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    sanitizeData(data) {
        if (!data)
            return data;
        if (typeof data === 'string') {
            return data;
        }
        if (typeof data === 'object' && data !== null) {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (this.isSensitiveField(key)) {
                    sanitized[key] = '***REDACTED***';
                }
                else if (typeof value === 'object' && value !== null) {
                    sanitized[key] = this.sanitizeData(value);
                }
                else {
                    sanitized[key] = value;
                }
            }
            return sanitized;
        }
        return data;
    }
    isSensitiveField(fieldName) {
        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'key',
            'apiKey',
            'creditCard',
            'ssn',
            'bankAccount',
            'routingNumber',
            'cvv',
            'pin',
        ];
        return sensitiveFields.some(field => fieldName.toLowerCase().includes(field.toLowerCase()));
    }
    calculateChecksum(data) {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }
    isRecoverableError(error) {
        const recoverableErrors = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'EHOSTUNREACH',
            'EPIPE',
            'ENOTFOUND',
            'ECONNABORTED',
            'EBUSY',
            'ENOTFOUND',
            'EAI_AGAIN',
            'EAI_AGAIN',
        ];
        return recoverableErrors.some(err => error.code === err);
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = AuditInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __param(2, (0, typeorm_1.InjectRepository)(transaction_log_entity_1.TransactionLog)),
    __metadata("design:paramtypes", [audit_service_1.AuditService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map
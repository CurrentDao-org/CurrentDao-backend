import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction, AuditResource, AuditSeverity } from '../entities/audit-log.entity';
import { TransactionLog } from '../entities/transaction-log.entity';
import { AuditService } from '../audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectRepository(TransactionLog)
    private readonly transactionLogRepository: Repository<TransactionLog>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    let auditLog: AuditLog;
    let transactionLog: TransactionLog;

    try {
      // Get audit metadata from the method or class
      const auditMetadata = this.getAuditMetadata(context);
      
      if (!auditMetadata) {
        return next.handle();
      }

      // Check if we should skip this request
      if (auditMetadata.skipIf && auditMetadata.skipIf(request)) {
        return next.handle();
      }

      // Create audit log entry
      auditLog = await this.createAuditLog(request, auditMetadata, startTime);

      // Execute the request
      const result = await next.handle();

      // Update audit log with response data
      await this.updateAuditLog(auditLog, response, startTime, result);

      // Create transaction log if applicable
      if (this.isTransactionRequest(request)) {
        transactionLog = await this.createTransactionLog(request, auditMetadata, startTime, result);
        await this.updateTransactionLog(transactionLog, response, startTime, result);
      }

      return result;

    } catch (error) {
      // Log error in audit log
      if (auditLog) {
        await this.logError(auditLog, error, startTime);
      }

      if (transactionLog) {
        await this.logTransactionError(transactionLog, error, startTime);
      }

      throw error;
    }
  }

  private getAuditMetadata(context: ExecutionContext): any {
    const handler = context.getHandler();
    const classMetadata = Reflect.getMetadata('audit:global', handler?.constructor);
    const methodMetadata = Reflect.getMetadata('audit', handler);
    
    return { ...classMetadata, ...methodMetadata };
  }

  private async createAuditLog(request: Request, metadata: any, startTime: number): Promise<AuditLog> {
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
      responseBody: undefined, // Will be set in updateAuditLog
      responseStatus: undefined, // Will be set in updateAuditLog
      executionTime: undefined, // Will be set in updateAuditLog
      memoryUsage: undefined, // Will be set in updateAuditLog
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
        cpuTime: undefined, // Will be set in updateAuditLog
        memoryPeak: undefined, // Will be set in updateAuditLog
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

    // Add request body to metadata if needed
    if (metadata.includeRequestBody && request.body) {
      auditLog.metadata.requestBody = this.sanitizeData(request.body);
    }

    // Add custom fields from metadata
    if (metadata.customFields) {
      Object.assign(auditLog.metadata, metadata.customFields);
    }

    // Add sensitive data handling
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

    // Calculate initial checksum
    auditLog.checksum = this.calculateChecksum(auditLog);

    return await this.auditLogRepository.save(auditLog);
  }

  private async updateAuditLog(
    auditLog: AuditLog,
    response: Response,
    startTime: number,
    result: any,
  ): Promise<void> {
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    const memoryUsage = process.memoryUsage();

    auditLog.responseStatus = response.statusCode;
    auditLog.executionTime = executionTime;
    auditLog.memoryUsage = memoryUsage.heapUsed / 1024 / 1024; // Convert to MB

    // Add response body to metadata if needed
    if (auditLog.metadata?.includeResponseBody && result) {
      auditLog.metadata.responseBody = this.sanitizeData(result);
    }

    // Add performance metrics
    auditLog.performance = {
      cpuTime: undefined, // Would need to be calculated separately
      memoryPeak: memoryUsage.heapPeak / 1024 / 1024,
      diskIO: undefined,
      networkIO: undefined,
      cacheHits: undefined,
      cacheMisses: undefined,
    };

    // Update security information
    if (auditLog.security) {
      auditLog.security.permissionsChecked = this.getPermissionsChecked(request);
      auditLog.security.rolesChecked = this.getRolesChecked(request);
    }

    // Update metadata with performance metrics
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

    // Recalculate checksum
    auditLog.checksum = this.calculateChecksum(auditLog);

    await this.auditLogRepository.save(auditLog);
  }

  private async createTransactionLog(
    request: Request,
    metadata: any,
    startTime: number,
    result: any,
  ): Promise<TransactionLog> {
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

  private async updateTransactionLog(
    transactionLog: TransactionLog,
    response: Response,
    startTime: number,
    result: any,
  ): Promise<void> {
    const endTime = Date.now();

    // Update status based on response
    if (response.statusCode >= 200 && response.statusCode < 300) {
      transactionLog.status = 'completed';
      transactionLog.completedAt = new Date(endTime);
      transactionLog.completedBy = this.getUserId(response.req);
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      transactionLog.status = 'failed';
      transactionLog.completedAt = new Date(endTime);
      transactionLog.completedBy = this.getUserId(response.req);
    }

    // Update timeline
    transactionLog.timeline.completed = new Date(endTime);

    // Update state
    transactionLog.state.current = transactionLog.status;
    transactionLog.state.transitions.push({
      from: 'initiated',
      to: transactionLog.status,
      timestamp: new Date(endTime),
      reason: `HTTP ${response.statusCode}`,
    });

    // Update metadata with result
    if (transactionLog.metadata) {
      transactionLog.metadata.attributes = {
        ...transactionLog.metadata.attributes,
        result: result ? 'success' : 'error',
        responseStatus: response.statusCode,
      };
    }

    // Update audit information
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

  private async logError(auditLog: AuditLog, error: any, startTime: number): Promise<void> {
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

  private async logTransactionError(transactionLog: TransactionLog, error: any, startTime: number): Promise<void> {
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

  private isTransactionRequest(request: Request): boolean {
    const transactionPaths = [
      '/api/energy/trades',
      '/api/energy/payments',
      '/api/energy/settlements',
      '/api/energy/transactions',
    ];

    return transactionPaths.some(path => request.url.startsWith(path));
  }

  private getTransactionType(request: Request): string {
    if (request.url.includes('/trades')) return 'trade_execution';
    if (request.url.includes('/payments')) return 'payment_processing';
    if (request.url.includes('/settlements')) return 'settlement';
    if (request.url.includes('/transactions')) return 'transaction';
    return 'unknown';
  }

  private getTransactionCategory(request: Request): string {
    if (request.url.includes('/energy/')) return 'energy_trade';
    return 'general';
  }

  private extractAmount(request: Request): number {
    const body = request.body as any;
    return body?.amount || body?.quantity || 0;
  }

  private extractCurrency(request: Request): string {
    const body = request.body as any;
    return body?.currency || 'USD';
  }

  private extractParticipants(request: Request): any {
    const body = request.body as any;
    return {
      buyer: body?.buyerId ? { id: body.buyerId } : undefined,
      seller: body?.sellerId ? { id: body.sellerId } : undefined,
    };
  }

  private extractEnergyDetails(request: Request): any {
    const body = request.body as any;
    return {
      energyType: body?.energyType,
      quantity: body?.quantity,
      unit: body?.unit,
      deliveryLocation: body?.deliveryLocation,
      deliveryDate: body?.deliveryDate ? new Date(body.deliveryDate) : undefined,
      quality: body?.quality,
    };
  }

  private extractContractDetails(request: Request): any {
    const body = request.body as any;
    return {
      contractId: body?.contractId,
      contractType: body?.contractType,
      terms: body?.terms,
      expirationDate: body?.expirationDate ? new Date(body.expirationDate) : undefined,
    };
  }

  private getUserId(request: Request): string | undefined {
    return (request as any).user?.id || request.headers['x-user-id'];
  }

  private getSessionId(request: Request): string | undefined {
    return request.headers['x-session-id'] || request.headers['authorization'];
  }

  private getClientIp(request: Request): string {
    return request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress;
  }

  private getUserAgent(request: Request): string {
    return request.headers['user-agent'];
  }

  private getAuthenticationMethod(request: Request): string {
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return 'jwt';
    }
    if (authHeader?.startsWith('Basic ')) {
      return 'basic';
    }
    return 'none';
  }

  private getPermissionsChecked(request: Request): string[] {
    return (request as any).permissions || [];
  }

  private getRolesChecked(request: Request): string[] {
    return (request as any).roles || [];
  }

  private getCorrelationId(request: Request): string | undefined {
    return request.headers['x-correlation-id'] || request.headers['x-request-id'];
  }

  private getBatchId(request: Request): string | undefined {
    return request.headers['x-batch-id'];
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitizeData(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    }

    return data;
  }

  private isSensitiveField(fieldName: string): boolean {
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

    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  private calculateChecksum(data: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private isRecoverableError(error: any): boolean {
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
}

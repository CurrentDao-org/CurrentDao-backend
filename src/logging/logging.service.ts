import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ElasticsearchService, LogEntry } from './elasticsearch/elasticsearch.service';
import { LogParserService, ParsedLogEntry, ParseResult } from './parsing/log-parser.service';
import { LogAlertService } from './alerts/log-alert.service';
import { RetentionPolicyService } from './retention/retention-policy.service';

export interface LogContext {
  service_name: string;
  environment: string;
  request_id?: string;
  user_id?: string;
  session_id?: string;
  ip_address?: string;
  user_agent?: string;
  component?: string;
  function?: string;
  line_number?: number;
  blockchain_tx_hash?: string;
  contract_address?: string;
}

export interface LogOptions {
  level?: 'debug' | 'info' | 'warn' | 'error';
  context?: LogContext;
  tags?: string[];
  metadata?: Record<string, any>;
  parse_immediately?: boolean;
  alert_immediately?: boolean;
}

@Injectable()
export class LoggingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoggingService.name);
  private readonly logBuffer: LogEntry[] = [];
  private readonly bufferSize = 100;
  private readonly flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly elasticsearchService: ElasticsearchService,
    private readonly logParserService: LogParserService,
    private readonly logAlertService: LogAlertService,
    private readonly retentionPolicyService: RetentionPolicyService,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing logging service');
    
    // Start periodic flush
    this.startPeriodicFlush();
    
    // Set up process error handlers
    this.setupErrorHandlers();
    
    this.logger.log('Logging service initialized');
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    
    // Clear flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining logs
    await this.flushLogs();
    
    this.logger.log('Logging service shutdown complete');
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.flushLogs();
      }
    }, this.flushInterval);
  }

  private setupErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      await this.error('Uncaught Exception', error, {
        context: {
          service_name: 'currentdao-backend',
          environment: this.configService.get('NODE_ENV') || 'development',
        },
        tags: ['uncaught-exception', 'critical'],
        alert_immediately: true,
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      await this.error('Unhandled Promise Rejection', reason, {
        context: {
          service_name: 'currentdao-backend',
          environment: this.configService.get('NODE_ENV') || 'development',
        },
        tags: ['unhandled-rejection', 'critical'],
        alert_immediately: true,
      });
    });
  }

  async debug(message: string, metadata?: any, options?: LogOptions): Promise<void> {
    await this.log('debug', message, metadata, options);
  }

  async info(message: string, metadata?: any, options?: LogOptions): Promise<void> {
    await this.log('info', message, metadata, options);
  }

  async warn(message: string, metadata?: any, options?: LogOptions): Promise<void> {
    await this.log('warn', message, metadata, options);
  }

  async error(message: string, error?: any, options?: LogOptions): Promise<void> {
    const errorMetadata = error ? {
      error_name: error.name || 'UnknownError',
      error_message: error.message || message,
      error_stack: error.stack,
      ...error,
    } : {};

    await this.log('error', message, errorMetadata, options);
  }

  private async log(level: string, message: string, metadata?: any, options?: LogOptions): Promise<void> {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level: options?.level || level,
      message,
      service_name: options?.context?.service_name || this.configService.get('SERVICE_NAME') || 'currentdao-backend',
      environment: options?.context?.environment || this.configService.get('NODE_ENV') || 'development',
      request_id: options?.context?.request_id,
      response_time: metadata?.response_time,
      memory_usage: metadata?.memory_usage,
      cpu_usage: metadata?.cpu_usage,
      tx_hash: options?.context?.blockchain_tx_hash,
      tx_type: metadata?.tx_type,
      tx_status: metadata?.tx_status,
      tags: options?.tags || [],
      metadata: {
        ...metadata,
        ...options?.metadata,
        context: options?.context,
      },
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Flush immediately if buffer is full or critical error
    if (this.logBuffer.length >= this.bufferSize || (level === 'error' && options?.alert_immediately)) {
      await this.flushLogs();
    }

    // Also log to console for development
    if (this.configService.get('NODE_ENV') === 'development') {
      this.logToConsole(level, message, metadata);
    }
  }

  private logToConsole(level: string, message: string, metadata?: any): void {
    const logMessage = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`;
    
    switch (level) {
      case 'debug':
        this.logger.debug(logMessage, metadata);
        break;
      case 'info':
        this.logger.log(logMessage, metadata);
        break;
      case 'warn':
        this.logger.warn(logMessage, metadata);
        break;
      case 'error':
        this.logger.error(logMessage, metadata);
        break;
      default:
        this.logger.log(logMessage, metadata);
    }
  }

  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    const logsToFlush = [...this.logBuffer];
    this.logBuffer.length = 0; // Clear buffer

    try {
      // Parse logs if needed
      const parsedLogs: ParsedLogEntry[] = [];
      
      for (const log of logsToFlush) {
        if (log.metadata?.parse_immediately) {
          const result = await this.logParserService.parseLogEntry(
            JSON.stringify(log),
            log.metadata?.context
          );
          
          if (result.success && result.parsed_entry) {
            parsedLogs.push(result.parsed_entry);
          }
        } else {
          // Create basic parsed entry
          parsedLogs.push({
            ...log,
            parsed_fields: {},
            extracted_tags: log.tags || [],
            severity_score: this.calculateSeverityScore(log.level),
            categorized_as: this.categorizeLog(log),
          });
        }
      }

      // Index logs to Elasticsearch
      await this.elasticsearchService.indexLogs(parsedLogs);

      // Check for alerts if needed
      for (const log of logsToFlush) {
        if (log.metadata?.alert_immediately || log.level === 'error') {
          // Alert checking is handled by the alert service monitoring
        }
      }

    } catch (error) {
      this.logger.error('Failed to flush logs to Elasticsearch', error);
      
      // Re-add failed logs to buffer for retry (with limit)
      const retryLogs = logsToFlush.slice(-10); // Keep only last 10 for retry
      this.logBuffer.unshift(...retryLogs);
    }
  }

  private calculateSeverityScore(level: string): number {
    switch (level.toLowerCase()) {
      case 'error':
        return 80;
      case 'warn':
      case 'warning':
        return 60;
      case 'info':
        return 40;
      case 'debug':
        return 20;
      default:
        return 30;
    }
  }

  private categorizeLog(log: LogEntry): string[] {
    const categories: string[] = [];

    // Level-based categorization
    if (log.level === 'error') {
      categories.push('error', 'issue');
    }
    if (log.level === 'warn') {
      categories.push('warning', 'attention');
    }

    // Message-based categorization
    const message = log.message.toLowerCase();
    if (message.includes('security') || message.includes('unauthorized')) {
      categories.push('security');
    }
    if (message.includes('performance') || message.includes('slow')) {
      categories.push('performance');
    }
    if (message.includes('database') || message.includes('sql')) {
      categories.push('database');
    }
    if (message.includes('blockchain') || message.includes('transaction')) {
      categories.push('blockchain');
    }
    if (log.tx_hash) {
      categories.push('blockchain', 'transaction');
    }

    // Tag-based categorization
    if (log.tags) {
      categories.push(...log.tags);
    }

    return categories.length > 0 ? categories : ['general'];
  }

  // Specialized logging methods for different contexts
  async logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    context?: Partial<LogContext>,
    metadata?: any
  ): Promise<void> {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    await this.log(level, `HTTP ${method} ${url} - ${statusCode}`, {
      request_method: method,
      request_url: url,
      status_code: statusCode,
      response_time: responseTime,
      ...metadata,
    }, {
      context: {
        service_name: 'currentdao-backend',
        environment: this.configService.get('NODE_ENV') || 'development',
        ...context,
      },
      tags: ['http-request', `status-${statusCode}`],
      parse_immediately: true,
    });
  }

  async logDatabaseQuery(
    query: string,
    duration: number,
    error?: any,
    context?: Partial<LogContext>
  ): Promise<void> {
    const level = error ? 'error' : duration > 1000 ? 'warn' : 'info';
    
    await this.log(level, `Database query executed in ${duration}ms`, {
      database_query: query,
      database_duration: duration,
      ...error,
    }, {
      context: {
        service_name: 'currentdao-backend',
        environment: this.configService.get('NODE_ENV') || 'development',
        ...context,
      },
      tags: ['database', 'query'],
      parse_immediately: true,
    });
  }

  async logBlockchainTransaction(
    txHash: string,
    txType: string,
    status: string,
    gasUsed?: number,
    error?: any,
    context?: Partial<LogContext>
  ): Promise<void> {
    const level = status === 'failed' ? 'error' : status === 'pending' ? 'info' : 'info';
    
    await this.log(level, `Blockchain transaction ${txHash} - ${status}`, {
      tx_hash: txHash,
      tx_type: txType,
      tx_status: status,
      gas_used: gasUsed,
      ...error,
    }, {
      context: {
        service_name: 'currentdao-backend',
        environment: this.configService.get('NODE_ENV') || 'development',
        blockchain_tx_hash: txHash,
        ...context,
      },
      tags: ['blockchain', 'transaction', txType, status],
      parse_immediately: true,
      alert_immediately: status === 'failed',
    });
  }

  async logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: any,
    context?: Partial<LogContext>
  ): Promise<void> {
    const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
    
    await this.log(level, `Security event: ${event}`, {
      security_event: event,
      security_severity: severity,
      ...details,
    }, {
      context: {
        service_name: 'currentdao-backend',
        environment: this.configService.get('NODE_ENV') || 'development',
        ...context,
      },
      tags: ['security', event, severity],
      parse_immediately: true,
      alert_immediately: ['high', 'critical'].includes(severity),
    });
  }

  async logPerformanceMetrics(
    metrics: {
      response_time?: number;
      memory_usage?: number;
      cpu_usage?: number;
      throughput?: number;
      error_rate?: number;
    },
    context?: Partial<LogContext>
  ): Promise<void> {
    await this.info('Performance metrics collected', metrics, {
      context: {
        service_name: 'currentdao-backend',
        environment: this.configService.get('NODE_ENV') || 'development',
        ...context,
      },
      tags: ['performance', 'metrics'],
      parse_immediately: true,
    });
  }

  // Public API methods for external access
  async searchLogs(query: any): Promise<any> {
    return this.elasticsearchService.searchLogs(query);
  }

  async getLogAggregations(query: any): Promise<any> {
    return this.elasticsearchService.getLogAggregations(query);
  }

  async getAlertMetrics(): Promise<any> {
    return this.logAlertService.getAlertMetrics();
  }

  async getRetentionMetrics(): Promise<any> {
    return this.retentionPolicyPolicyService.getRetentionMetrics();
  }

  async forceFlush(): Promise<void> {
    await this.flushLogs();
  }

  getBufferSize(): number {
    return this.logBuffer.length;
  }

  async testLogging(): Promise<void> {
    await this.info('Test log message', { test: true }, {
      tags: ['test'],
      parse_immediately: true,
    });
  }
}

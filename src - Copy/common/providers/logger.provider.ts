/**
 * Logger Provider
 *
 * Custom provider for structured logging with context support,
 * different log levels, and performance tracking.
 */

import {
  Provider,
  Injectable,
  LoggerService,
  Scope,
  Optional,
  Inject,
} from '@nestjs/common';
import { createLogger, Logger, LogLevel, format, transports } from 'winston';

/**
 * Logger provider options
 */
export interface LoggerProviderOptions {
  /** Log level */
  level?: LogLevel;
  /** Whether to include timestamp */
  includeTimestamp?: boolean;
  /** Whether to colorize output */
  colorize?: boolean;
  /** Custom label for logs */
  label?: string;
  /** Whether to log to file */
  logToFile?: boolean;
  /** Log file path */
  logFilePath?: string;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: LoggerProviderOptions = {
  level: 'info',
  includeTimestamp: true,
  colorize: true,
  logToFile: false,
  logFilePath: 'logs/app.log',
};

/**
 * Custom log entry structure
 */
export interface LogEntry {
  level: string;
  message: string;
  context?: string;
  timestamp: string;
  meta?: Record<string, any>;
  duration?: number;
}

/**
 * Logger provider token
 */
export const LOGGER_PROVIDER = 'LOGGER_PROVIDER';

/**
 * Custom NestJS-compatible logger using Winston
 */
@Injectable({ scope: Scope.DEFAULT })
export class LoggerProvider implements LoggerService {
  private readonly logger: Logger;
  private readonly options: LoggerProviderOptions;
  private readonly context: string;

  constructor(
    @Optional() @Inject(LOGGER_PROVIDER) options?: LoggerProviderOptions,
    @Optional() context?: string,
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.context = context || 'App';

    // Create Winston logger
    this.logger = createLogger({
      level: this.options.level || 'info',
      format: this.getFormat(),
      transports: this.getTransports(),
    });
  }

  /**
   * Get Winston format
   */
  private getFormat() {
    const timestampFormat = format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS',
    });

    return format.combine(
      this.options.includeTimestamp !== false && timestampFormat(),
      format.errors({ stack: true }),
      format.splat(),
      format.json(),
      this.options.colorize !== false && format.colorize(),
      format.printf(({ level, message, context, timestamp, ...meta }) => {
        return `${timestamp} [${context || 'App'}] ${level}: ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ''
        }`;
      }),
    );
  }

  /**
   * Get transports
   */
  private getTransports() {
    const transportList: any[] = [
      new transports.Console({
        handleExceptions: true,
      }),
    ];

    // Add file transport if enabled
    if (this.options.logToFile) {
      transportList.push(
        new transports.File({
          filename: this.options.logFilePath || 'logs/app.log',
          handleExceptions: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    return transportList;
  }

  /**
   * Log message
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  /**
   * Log error
   */
  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, {
      context: context || this.context,
      trace,
    });
  }

  /**
   * Log warning
   */
  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  /**
   * Log verbose message
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  /**
   * Create child logger with context
   */
  createChild(context: string): LoggerProvider {
    return new LoggerProvider(this.options, context);
  }

  /**
   * Log with custom metadata
   */
  logWithMeta(
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    meta?: Record<string, any>,
    context?: string,
  ): void {
    this.logger.log(level, message, {
      context: context || this.context,
      ...meta,
    });
  }

  /**
   * Log performance timing
   */
  logPerformance(operation: string, duration: number, context?: string): void {
    this.logger.info(`Performance: ${operation} took ${duration}ms`, {
      context: context || this.context,
      duration,
      operation,
    });
  }
}

/**
 * Factory function to create logger provider
 */
export const createLoggerProvider = (
  options?: LoggerProviderOptions,
  context?: string,
): Provider => {
  return {
    provide: LOGGER_PROVIDER,
    useFactory: () => new LoggerProvider(options, context),
  };
};

/**
 * Inject logger provider
 */
export const InjectLoggerProvider = (context?: string) => {
  return {
    provide: LOGGER_PROVIDER,
    useFactory: (options?: LoggerProviderOptions) =>
      new LoggerProvider(options, context),
  };
};

/**
 * Token for application logger
 */
export const APP_LOGGER = 'APP_LOGGER';

/**
 * Create application-wide logger
 */
export const createAppLogger = () => {
  return new LoggerProvider(
    {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      includeTimestamp: true,
      colorize: process.env.NODE_ENV !== 'production',
      logToFile: process.env.NODE_ENV === 'production',
      logFilePath: process.env.LOG_FILE_PATH || 'logs/app.log',
    },
    'CurrentDao',
  );
};

/**
 * Performance tracking mixin
 */
export const withPerformanceTracking = (
  logger: LoggerProvider,
  operation: string,
  context?: string,
) => {
  const startTime = Date.now();

  return {
    complete: () => {
      const duration = Date.now() - startTime;
      logger.logPerformance(operation, duration, context);
    },
    error: (error: Error) => {
      const duration = Date.now() - startTime;
      logger.error(
        `Performance error: ${operation} failed after ${duration}ms`,
        error.stack,
        context,
      );
    },
  };
};

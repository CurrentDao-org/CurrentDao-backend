import { Provider, LoggerService } from '@nestjs/common';
import { LogLevel } from 'winston';
export interface LoggerProviderOptions {
    level?: LogLevel;
    includeTimestamp?: boolean;
    colorize?: boolean;
    label?: string;
    logToFile?: boolean;
    logFilePath?: string;
}
export interface LogEntry {
    level: string;
    message: string;
    context?: string;
    timestamp: string;
    meta?: Record<string, any>;
    duration?: number;
}
export declare const LOGGER_PROVIDER = "LOGGER_PROVIDER";
export declare class LoggerProvider implements LoggerService {
    private readonly logger;
    private readonly options;
    private readonly context;
    constructor(options?: LoggerProviderOptions, context?: string);
    private getFormat;
    private getTransports;
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
    setLogLevel(level: LogLevel): void;
    createChild(context: string): LoggerProvider;
    logWithMeta(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, any>, context?: string): void;
    logPerformance(operation: string, duration: number, context?: string): void;
}
export declare const createLoggerProvider: (options?: LoggerProviderOptions, context?: string) => Provider;
export declare const InjectLoggerProvider: (context?: string) => {
    provide: string;
    useFactory: (options?: LoggerProviderOptions) => LoggerProvider;
};
export declare const APP_LOGGER = "APP_LOGGER";
export declare const createAppLogger: () => LoggerProvider;
export declare const withPerformanceTracking: (logger: LoggerProvider, operation: string, context?: string) => {
    complete: () => void;
    error: (error: Error) => void;
};

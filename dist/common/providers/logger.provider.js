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
var LoggerProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.withPerformanceTracking = exports.createAppLogger = exports.APP_LOGGER = exports.InjectLoggerProvider = exports.createLoggerProvider = exports.LoggerProvider = exports.LOGGER_PROVIDER = void 0;
const common_1 = require("@nestjs/common");
const winston_1 = require("winston");
const DEFAULT_OPTIONS = {
    level: 'info',
    includeTimestamp: true,
    colorize: true,
    logToFile: false,
    logFilePath: 'logs/app.log',
};
exports.LOGGER_PROVIDER = 'LOGGER_PROVIDER';
let LoggerProvider = LoggerProvider_1 = class LoggerProvider {
    constructor(options, context) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.context = context || 'App';
        this.logger = (0, winston_1.createLogger)({
            level: this.options.level || 'info',
            format: this.getFormat(),
            transports: this.getTransports(),
        });
    }
    getFormat() {
        const timestampFormat = winston_1.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss.SSS',
        });
        return winston_1.format.combine(this.options.includeTimestamp !== false && timestampFormat(), winston_1.format.errors({ stack: true }), winston_1.format.splat(), winston_1.format.json(), this.options.colorize !== false && winston_1.format.colorize(), winston_1.format.printf(({ level, message, context, timestamp, ...meta }) => {
            return `${timestamp} [${context || 'App'}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        }));
    }
    getTransports() {
        const transportList = [
            new winston_1.transports.Console({
                handleExceptions: true,
            }),
        ];
        if (this.options.logToFile) {
            transportList.push(new winston_1.transports.File({
                filename: this.options.logFilePath || 'logs/app.log',
                handleExceptions: true,
                maxsize: 5242880,
                maxFiles: 5,
            }));
        }
        return transportList;
    }
    log(message, context) {
        this.logger.info(message, { context: context || this.context });
    }
    error(message, trace, context) {
        this.logger.error(message, {
            context: context || this.context,
            trace,
        });
    }
    warn(message, context) {
        this.logger.warn(message, { context: context || this.context });
    }
    debug(message, context) {
        this.logger.debug(message, { context: context || this.context });
    }
    verbose(message, context) {
        this.logger.verbose(message, { context: context || this.context });
    }
    setLogLevel(level) {
        this.logger.level = level;
    }
    createChild(context) {
        return new LoggerProvider_1(this.options, context);
    }
    logWithMeta(level, message, meta, context) {
        this.logger.log(level, message, {
            context: context || this.context,
            ...meta,
        });
    }
    logPerformance(operation, duration, context) {
        this.logger.info(`Performance: ${operation} took ${duration}ms`, {
            context: context || this.context,
            duration,
            operation,
        });
    }
};
exports.LoggerProvider = LoggerProvider;
exports.LoggerProvider = LoggerProvider = LoggerProvider_1 = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.DEFAULT }),
    __param(0, (0, common_1.Optional)()),
    __param(0, (0, common_1.Inject)(exports.LOGGER_PROVIDER)),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [Object, String])
], LoggerProvider);
const createLoggerProvider = (options, context) => {
    return {
        provide: exports.LOGGER_PROVIDER,
        useFactory: () => new LoggerProvider(options, context),
    };
};
exports.createLoggerProvider = createLoggerProvider;
const InjectLoggerProvider = (context) => {
    return {
        provide: exports.LOGGER_PROVIDER,
        useFactory: (options) => new LoggerProvider(options, context),
    };
};
exports.InjectLoggerProvider = InjectLoggerProvider;
exports.APP_LOGGER = 'APP_LOGGER';
const createAppLogger = () => {
    return new LoggerProvider({
        level: process.env.LOG_LEVEL || 'info',
        includeTimestamp: true,
        colorize: process.env.NODE_ENV !== 'production',
        logToFile: process.env.NODE_ENV === 'production',
        logFilePath: process.env.LOG_FILE_PATH || 'logs/app.log',
    }, 'CurrentDao');
};
exports.createAppLogger = createAppLogger;
const withPerformanceTracking = (logger, operation, context) => {
    const startTime = Date.now();
    return {
        complete: () => {
            const duration = Date.now() - startTime;
            logger.logPerformance(operation, duration, context);
        },
        error: (error) => {
            const duration = Date.now() - startTime;
            logger.error(`Performance error: ${operation} failed after ${duration}ms`, error.stack, context);
        },
    };
};
exports.withPerformanceTracking = withPerformanceTracking;
//# sourceMappingURL=logger.provider.js.map
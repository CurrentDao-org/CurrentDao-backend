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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenTelemetryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenTelemetryService = void 0;
const common_1 = require("@nestjs/common");
const api_1 = require("@opentelemetry/api");
const otel_sdk_1 = __importDefault(require("./otel-sdk"));
let OpenTelemetryService = OpenTelemetryService_1 = class OpenTelemetryService {
    constructor() {
        this.logger = new common_1.Logger(OpenTelemetryService_1.name);
        this.tracer = api_1.trace.getTracer('currentdao-api');
        this.logger.log('OpenTelemetry Tracer initialized');
    }
    onModuleInit() {
        this.logger.log('OpenTelemetry SDK lifecycle managed by Main bootstrap');
    }
    async onModuleDestroy() {
        try {
            this.logger.log('Shutting down OpenTelemetry SDK...');
            await otel_sdk_1.default.shutdown();
            this.logger.log('OpenTelemetry SDK shut down');
        }
        catch (error) {
            this.logger.error('Error shutting down OpenTelemetry SDK', error);
        }
    }
    startSpan(name, options) {
        return this.tracer.startSpan(name, options);
    }
    async withSpan(name, callback) {
        return this.tracer.startActiveSpan(name, async (span) => {
            try {
                const result = await callback(span);
                return result;
            }
            finally {
                span.end();
            }
        });
    }
    injectContext(headers) {
        api_1.propagation.inject(api_1.context.active(), headers);
    }
    extractContext(headers) {
        return api_1.propagation.extract(api_1.context.active(), headers);
    }
};
exports.OpenTelemetryService = OpenTelemetryService;
exports.OpenTelemetryService = OpenTelemetryService = OpenTelemetryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], OpenTelemetryService);
//# sourceMappingURL=opentelemetry.service.js.map
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
var CustomInstrumentation_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomInstrumentation = void 0;
exports.Trace = Trace;
const api_1 = require("@opentelemetry/api");
const common_1 = require("@nestjs/common");
let CustomInstrumentation = CustomInstrumentation_1 = class CustomInstrumentation {
    constructor() {
        this.logger = new common_1.Logger(CustomInstrumentation_1.name);
        this.tracer = api_1.trace.getTracer('currentdao-custom-instrumentation');
    }
    async instrument(name, fn) {
        return this.tracer.startActiveSpan(name, async (span) => {
            try {
                this.logger.debug(`Starting span: ${name}`);
                const result = await fn();
                span.setStatus({ code: api_1.SpanStatusCode.OK });
                return result;
            }
            catch (error) {
                span.setStatus({
                    code: api_1.SpanStatusCode.ERROR,
                    message: error.message,
                });
                span.recordException(error);
                throw error;
            }
            finally {
                span.end();
            }
        });
    }
    getTracer() {
        return this.tracer;
    }
};
exports.CustomInstrumentation = CustomInstrumentation;
exports.CustomInstrumentation = CustomInstrumentation = CustomInstrumentation_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CustomInstrumentation);
function Trace(spanName) {
    return function (target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        const name = spanName || `${target.constructor.name}.${propertyKey}`;
        descriptor.value = function (...args) {
            const tracer = api_1.trace.getTracer('currentdao-custom-instrumentation');
            return tracer.startActiveSpan(name, async (span) => {
                try {
                    const result = await originalMethod.apply(this, args);
                    span.setStatus({ code: api_1.SpanStatusCode.OK });
                    return result;
                }
                catch (error) {
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message: error.message,
                    });
                    span.recordException(error);
                    throw error;
                }
                finally {
                    span.end();
                }
            });
        };
        return descriptor;
    };
}
//# sourceMappingURL=custom-instrumentation.js.map
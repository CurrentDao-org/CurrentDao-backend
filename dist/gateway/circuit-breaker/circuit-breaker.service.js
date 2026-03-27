"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CircuitBreakerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreakerService = void 0;
const common_1 = require("@nestjs/common");
var CircuitBreakerState;
(function (CircuitBreakerState) {
    CircuitBreakerState[CircuitBreakerState["CLOSED"] = 0] = "CLOSED";
    CircuitBreakerState[CircuitBreakerState["OPEN"] = 1] = "OPEN";
    CircuitBreakerState[CircuitBreakerState["HALF_OPEN"] = 2] = "HALF_OPEN";
})(CircuitBreakerState || (CircuitBreakerState = {}));
let CircuitBreakerService = CircuitBreakerService_1 = class CircuitBreakerService {
    constructor() {
        this.logger = new common_1.Logger(CircuitBreakerService_1.name);
        this.state = CircuitBreakerState.CLOSED;
        this.failureCount = 0;
        this.threshold = 5;
        this.timeout = 30000;
    }
    async checkCircuit() {
        if (this.state === CircuitBreakerState.OPEN) {
            throw new common_1.InternalServerErrorException('Circuit is open, please try again later');
        }
    }
    async reportSuccess() {
        this.failureCount = 0;
        this.state = CircuitBreakerState.CLOSED;
        this.logger.debug('Circuit Breaker status: CLOSED');
    }
    async reportFailure() {
        this.failureCount++;
        this.logger.error(`Circuit Breaker status: FAILURE (Count: ${this.failureCount}/${this.threshold})`);
        if (this.failureCount >= this.threshold) {
            this.state = CircuitBreakerState.OPEN;
            this.logger.error('Circuit Breaker status: OPEN');
            setTimeout(() => {
                this.state = CircuitBreakerState.HALF_OPEN;
                this.logger.warn('Circuit Breaker status: HALF_OPEN');
            }, this.timeout);
        }
    }
};
exports.CircuitBreakerService = CircuitBreakerService;
exports.CircuitBreakerService = CircuitBreakerService = CircuitBreakerService_1 = __decorate([
    (0, common_1.Injectable)()
], CircuitBreakerService);
//# sourceMappingURL=circuit-breaker.service.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const contract_service_1 = require("./contracts/contract.service");
let HealthController = class HealthController {
    constructor(contractService) {
        this.contractService = contractService;
    }
    async healthCheck(res) {
        try {
            const contracts = await this.contractService.getHealthStatus();
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                contracts,
            };
            return res.status(common_1.HttpStatus.OK).json(health);
        }
        catch (error) {
            return res.status(common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: error.message,
            });
        }
    }
    async readinessCheck(res) {
        try {
            const contracts = await this.contractService.getHealthStatus();
            const ready = {
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'connected',
                    redis: 'connected',
                    api: 'ready',
                    contracts: contracts.status,
                },
            };
            return res.status(common_1.HttpStatus.OK).json(ready);
        }
        catch (error) {
            return res.status(common_1.HttpStatus.SERVICE_UNAVAILABLE).json({
                status: 'not ready',
                timestamp: new Date().toISOString(),
                error: error.message,
            });
        }
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Health check endpoint' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is healthy' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Service is unhealthy' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "healthCheck", null);
__decorate([
    (0, common_1.Get)('ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Readiness check endpoint' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Service is ready' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'Service is not ready' }),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readinessCheck", null);
exports.HealthController = HealthController = __decorate([
    (0, swagger_1.ApiTags)('health'),
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [contract_service_1.ContractService])
], HealthController);
//# sourceMappingURL=health.controller.js.map
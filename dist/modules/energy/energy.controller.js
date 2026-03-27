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
exports.EnergyController = void 0;
const common_1 = require("@nestjs/common");
const energy_service_1 = require("./energy.service");
const create_energy_trade_dto_1 = require("./dto/create-energy-trade.dto");
const swagger_1 = require("@nestjs/swagger");
let EnergyController = class EnergyController {
    constructor(energyService) {
        this.energyService = energyService;
    }
    async findAll() {
        return this.energyService.findAll();
    }
    async findOne(id) {
        return this.energyService.findOne(id);
    }
    async create(createEnergyTradeDto) {
        return this.energyService.create(createEnergyTradeDto);
    }
    async executeTrade(id) {
        return this.energyService.executeTrade(id);
    }
    async getMarketPrice() {
        return this.energyService.getMarketPrice();
    }
    async getUserTrades(userId) {
        return this.energyService.getUserTrades(userId);
    }
};
exports.EnergyController = EnergyController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all energy trades' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get energy trade by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create new energy trade' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_energy_trade_dto_1.CreateEnergyTradeDto]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/execute'),
    (0, swagger_1.ApiOperation)({ summary: 'Execute energy trade' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "executeTrade", null);
__decorate([
    (0, common_1.Get)('market-price'),
    (0, swagger_1.ApiOperation)({ summary: 'Get current market price' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getMarketPrice", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user energy trades' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EnergyController.prototype, "getUserTrades", null);
exports.EnergyController = EnergyController = __decorate([
    (0, common_1.Controller)('energy'),
    (0, swagger_1.ApiTags)('energy'),
    __metadata("design:paramtypes", [energy_service_1.EnergyService])
], EnergyController);
//# sourceMappingURL=energy.controller.js.map
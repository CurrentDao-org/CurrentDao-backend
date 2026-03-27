"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnergyService = void 0;
const common_1 = require("@nestjs/common");
let EnergyService = class EnergyService {
    constructor() {
        this.trades = [];
        this.marketPrice = 0.08;
    }
    async findAll() {
        return this.trades;
    }
    async findOne(id) {
        return this.trades.find((trade) => trade.id === id) || null;
    }
    async create(createEnergyTradeDto) {
        const trade = {
            id: Date.now().toString(),
            sellerId: createEnergyTradeDto.sellerId,
            buyerId: createEnergyTradeDto.buyerId,
            amount: createEnergyTradeDto.amount,
            price: createEnergyTradeDto.price,
            type: createEnergyTradeDto.type,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        this.trades.push(trade);
        return trade;
    }
    async executeTrade(id) {
        const trade = this.trades.find((t) => t.id === id);
        if (trade) {
            trade.status = 'executed';
            trade.updatedAt = new Date();
        }
        return trade || null;
    }
    async getMarketPrice() {
        return {
            price: this.marketPrice,
            timestamp: Date.now(),
            volume24h: 1250000,
        };
    }
    async getUserTrades(userId) {
        return this.trades.filter((trade) => trade.sellerId === userId || trade.buyerId === userId);
    }
};
exports.EnergyService = EnergyService;
exports.EnergyService = EnergyService = __decorate([
    (0, common_1.Injectable)()
], EnergyService);
//# sourceMappingURL=energy.service.js.map
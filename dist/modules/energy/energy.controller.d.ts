import { EnergyService } from './energy.service';
import { CreateEnergyTradeDto } from './dto/create-energy-trade.dto';
export declare class EnergyController {
    private readonly energyService;
    constructor(energyService: EnergyService);
    findAll(): Promise<import("./entities/energy-trade.entity").EnergyTrade[]>;
    findOne(id: string): Promise<import("./entities/energy-trade.entity").EnergyTrade>;
    create(createEnergyTradeDto: CreateEnergyTradeDto): Promise<import("./entities/energy-trade.entity").EnergyTrade>;
    executeTrade(id: string): Promise<import("./entities/energy-trade.entity").EnergyTrade>;
    getMarketPrice(): Promise<import("./energy.service").MarketPriceDto>;
    getUserTrades(userId: string): Promise<import("./entities/energy-trade.entity").EnergyTrade[]>;
}

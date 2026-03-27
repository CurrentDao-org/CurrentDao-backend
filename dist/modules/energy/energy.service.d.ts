import { EnergyTrade } from './entities/energy-trade.entity';
export interface CreateEnergyTradeDto {
    sellerId: string;
    buyerId: string;
    amount: number;
    price: number;
    type: 'buy' | 'sell';
}
export interface MarketPriceDto {
    price: number;
    timestamp: number;
    volume24h: number;
}
export declare class EnergyService {
    private readonly trades;
    private marketPrice;
    findAll(): Promise<EnergyTrade[]>;
    findOne(id: string): Promise<EnergyTrade | null>;
    create(createEnergyTradeDto: CreateEnergyTradeDto): Promise<EnergyTrade>;
    executeTrade(id: string): Promise<EnergyTrade | null>;
    getMarketPrice(): Promise<MarketPriceDto>;
    getUserTrades(userId: string): Promise<EnergyTrade[]>;
}

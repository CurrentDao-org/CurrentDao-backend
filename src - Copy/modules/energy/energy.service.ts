import { Injectable } from '@nestjs/common';
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

@Injectable()
export class EnergyService {
  private readonly trades: EnergyTrade[] = [];
  private marketPrice = 0.08; // Mock market price

  async findAll(): Promise<EnergyTrade[]> {
    return this.trades;
  }

  async findOne(id: string): Promise<EnergyTrade | null> {
    return this.trades.find((trade) => trade.id === id) || null;
  }

  async create(
    createEnergyTradeDto: CreateEnergyTradeDto,
  ): Promise<EnergyTrade> {
    const trade: EnergyTrade = {
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

  async executeTrade(id: string): Promise<EnergyTrade | null> {
    const trade = this.trades.find((t) => t.id === id);
    if (trade) {
      trade.status = 'executed';
      trade.updatedAt = new Date();
    }
    return trade || null;
  }

  async getMarketPrice(): Promise<MarketPriceDto> {
    return {
      price: this.marketPrice,
      timestamp: Date.now(),
      volume24h: 1250000, // Mock volume
    };
  }

  async getUserTrades(userId: string): Promise<EnergyTrade[]> {
    return this.trades.filter(
      (trade) => trade.sellerId === userId || trade.buyerId === userId,
    );
  }
}

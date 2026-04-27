import { Injectable } from '@nestjs/common';
import { OrderBookService } from './order-book/order-book.service';
import { MatchingEngineService } from './matching/matching-engine.service';
import { SettlementService } from './settlement/settlement.service';
import { StellarIntegrationService } from './integration/stellar-integration.service';

@Injectable()
export class TradingService {
  constructor(
    private readonly orderBookService: OrderBookService,
    private readonly matchingEngineService: MatchingEngineService,
    private readonly settlementService: SettlementService,
    private readonly stellarService: StellarIntegrationService,
  ) {}

  async getOrderBook() {
    return this.orderBookService.getOrderBook();
  }

  async getTrades() {
    // Implement logic to get recent trades
    return [];
  }

  async processTrade(trade: any) {
    // Validate and execute trade
    await this.settlementService.settleTrade(trade);
    await this.stellarService.recordTrade(trade);
  }
}
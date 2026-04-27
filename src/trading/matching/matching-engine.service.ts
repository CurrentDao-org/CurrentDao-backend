import { Injectable } from '@nestjs/common';
import { OrderBookService } from '../order-book/order-book.service';
import { SettlementService } from '../settlement/settlement.service';
import { Order } from '../order-management/order.service';

@Injectable()
export class MatchingEngineService {
  constructor(
    private readonly orderBook: OrderBookService,
    private readonly settlement: SettlementService,
  ) {}

  async submitOrder(order: Order): Promise<void> {
    // Add to order book
    this.orderBook.addOrder(order.id, order.side, order.price!, order.quantity);

    // Try to match
    await this.matchOrders();
  }

  async cancelOrder(orderId: string): Promise<void> {
    // Remove from order book - need to know price and side
    // For simplicity, assume we have a way to get order details
  }

  private async matchOrders(): Promise<void> {
    const bestBid = this.orderBook.getBestBid();
    const bestAsk = this.orderBook.getBestAsk();

    if (bestBid && bestAsk && bestBid >= bestAsk) {
      // Match at mid price or something
      const matchPrice = (bestBid + bestAsk) / 2;

      // Create trade
      const trade = {
        id: this.generateId(),
        price: matchPrice,
        quantity: Math.min(/* quantities */ 100), // placeholder
        buyerId: 'buyer',
        sellerId: 'seller',
        timestamp: new Date(),
      };

      await this.settlement.settleTrade(trade);
    }
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
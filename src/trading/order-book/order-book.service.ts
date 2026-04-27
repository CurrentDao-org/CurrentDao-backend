import { Injectable } from '@nestjs/common';

interface OrderBookEntry {
  price: number;
  quantity: number;
  orders: string[]; // order ids
}

@Injectable()
export class OrderBookService {
  private buyOrders: Map<number, OrderBookEntry> = new Map();
  private sellOrders: Map<number, OrderBookEntry> = new Map();

  addOrder(orderId: string, side: 'buy' | 'sell', price: number, quantity: number): void {
    const orders = side === 'buy' ? this.buyOrders : this.sellOrders;
    if (!orders.has(price)) {
      orders.set(price, { price, quantity: 0, orders: [] });
    }
    const entry = orders.get(price)!;
    entry.quantity += quantity;
    entry.orders.push(orderId);
  }

  removeOrder(orderId: string, side: 'buy' | 'sell', price: number, quantity: number): void {
    const orders = side === 'buy' ? this.buyOrders : this.sellOrders;
    const entry = orders.get(price);
    if (entry) {
      entry.quantity -= quantity;
      entry.orders = entry.orders.filter(id => id !== orderId);
      if (entry.quantity <= 0) {
        orders.delete(price);
      }
    }
  }

  getOrderBook() {
    const buys = Array.from(this.buyOrders.values()).sort((a, b) => b.price - a.price);
    const sells = Array.from(this.sellOrders.values()).sort((a, b) => a.price - b.price);
    return { buys, sells };
  }

  getBestBid(): number | undefined {
    const prices = Array.from(this.buyOrders.keys()).sort((a, b) => b - a);
    return prices[0];
  }

  getBestAsk(): number | undefined {
    const prices = Array.from(this.sellOrders.keys()).sort((a, b) => a - b);
    return prices[0];
  }
}
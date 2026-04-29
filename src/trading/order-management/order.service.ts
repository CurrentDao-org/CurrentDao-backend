import { Injectable } from '@nestjs/common';
import { MatchingEngineService } from '../matching/matching-engine.service';

export interface Order {
  id: string;
  type: 'market' | 'limit' | 'stop' | 'stop-limit';
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
  stopPrice?: number;
  status: 'pending' | 'open' | 'filled' | 'cancelled';
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrderService {
  private orders: Map<string, Order> = new Map();

  constructor(private readonly matchingEngine: MatchingEngineService) {}

  async createOrder(orderData: Partial<Order>): Promise<Order> {
    const order: Order = {
      id: this.generateId(),
      type: orderData.type || 'limit',
      side: orderData.side,
      quantity: orderData.quantity,
      price: orderData.price,
      stopPrice: orderData.stopPrice,
      status: 'pending',
      userId: orderData.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate order
    this.validateOrder(order);

    this.orders.set(order.id, order);

    // Submit to matching engine
    await this.matchingEngine.submitOrder(order);

    return order;
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async cancelOrder(id: string): Promise<boolean> {
    const order = this.orders.get(id);
    if (order && order.status === 'open') {
      order.status = 'cancelled';
      order.updatedAt = new Date();
      // Notify matching engine
      await this.matchingEngine.cancelOrder(id);
      return true;
    }
    return false;
  }

  private validateOrder(order: Order): void {
    if (!order.side || !['buy', 'sell'].includes(order.side)) {
      throw new Error('Invalid order side');
    }
    if (order.quantity <= 0) {
      throw new Error('Invalid quantity');
    }
    if (order.type === 'limit' && !order.price) {
      throw new Error('Limit order requires price');
    }
    // Add more validations
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderType, OrderStatus, OrderPriority } from '../entities/order.entity';

export interface QueueMetrics {
  totalOrders: number;
  ordersByPriority: Record<OrderPriority, number>;
  ordersByType: Record<OrderType, number>;
  averageWaitTime: number;
  oldestOrderAge: number;
  queueDepth: number;
  processingRate: number;
}

export interface QueueItem {
  order: Order;
  priority: OrderPriority;
  timestamp: number;
  sequenceNumber: number;
}

@Injectable()
export class PriorityQueueService {
  private readonly logger = new Logger(PriorityQueueService.name);
  
  // Priority queues for different symbols
  private buyQueues: Map<string, QueueItem[]> = new Map();
  private sellQueues: Map<string, QueueItem[]> = new Map();
  
  // Sequence counter for FIFO within priority levels
  private sequenceCounter: number = 0;
  
  // Performance metrics
  private processingStats: Map<string, {
    processedCount: number;
    totalProcessingTime: number;
    lastProcessed: number;
  }> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // Initialize metrics tracking
    setInterval(() => {
      this.cleanupExpiredOrders();
      this.updateMetrics();
    }, 1000); // Update every second
  }

  addOrder(order: Order): void {
    const queueItem: QueueItem = {
      order,
      priority: order.priority,
      timestamp: Date.now(),
      sequenceNumber: this.sequenceCounter++
    };

    const queue = order.type === OrderType.BUY ? this.buyQueues : this.sellQueues;
    const symbolQueue = queue.get(order.symbol) || [];
    
    // Insert while maintaining priority order
    const insertIndex = this.findInsertIndex(symbolQueue, queueItem);
    symbolQueue.splice(insertIndex, 0, queueItem);
    
    queue.set(order.symbol, symbolQueue);

    this.logger.debug(
      `Added order ${order.id} to ${order.type} queue for ${order.symbol} ` +
      `(priority: ${order.priority}, queue size: ${symbolQueue.length})`
    );
  }

  removeOrder(orderId: string, symbol: string, type: OrderType): boolean {
    const queue = type === OrderType.BUY ? this.buyQueues : this.sellQueues;
    const symbolQueue = queue.get(symbol) || [];
    
    const index = symbolQueue.findIndex(item => item.order.id === orderId);
    if (index !== -1) {
      symbolQueue.splice(index, 1);
      queue.set(symbol, symbolQueue);
      
      this.logger.debug(`Removed order ${orderId} from ${type} queue for ${symbol}`);
      return true;
    }
    
    return false;
  }

  getNextOrders(symbol: string, maxOrders: number = 100): {
    buyOrders: Order[];
    sellOrders: Order[];
  } {
    const buyQueue = this.buyQueues.get(symbol) || [];
    const sellQueue = this.sellQueues.get(symbol) || [];
    
    const buyOrders = buyQueue
      .slice(0, maxOrders)
      .map(item => item.order);
    
    const sellOrders = sellQueue
      .slice(0, maxOrders)
      .map(item => item.order);
    
    return { buyOrders, sellOrders };
  }

  peekNextOrders(symbol: string, count: number = 10): {
    buyOrders: Order[];
    sellOrders: Order[];
  } {
    const buyQueue = this.buyQueues.get(symbol) || [];
    const sellQueue = this.sellQueues.get(symbol) || [];
    
    const buyOrders = buyQueue
      .slice(0, count)
      .map(item => item.order);
    
    const sellOrders = sellQueue
      .slice(0, count)
      .map(item => item.order);
    
    return { buyOrders, sellOrders };
  }

  updateOrderPriority(orderId: string, symbol: string, type: OrderType, newPriority: OrderPriority): boolean {
    const queue = type === OrderType.BUY ? this.buyQueues : this.sellQueues;
    const symbolQueue = queue.get(symbol) || [];
    
    const index = symbolQueue.findIndex(item => item.order.id === orderId);
    if (index !== -1) {
      const queueItem = symbolQueue[index];
      
      // Remove from current position
      symbolQueue.splice(index, 1);
      
      // Update priority
      queueItem.priority = newPriority;
      queueItem.order.priority = newPriority;
      
      // Re-insert at new position
      const insertIndex = this.findInsertIndex(symbolQueue, queueItem);
      symbolQueue.splice(insertIndex, 0, queueItem);
      
      queue.set(symbol, symbolQueue);
      
      this.logger.debug(`Updated priority for order ${orderId} to ${newPriority}`);
      return true;
    }
    
    return false;
  }

  markOrdersProcessed(orders: Order[]): void {
    const processingTime = Date.now();
    
    orders.forEach(order => {
      const stats = this.processingStats.get(order.symbol) || {
        processedCount: 0,
        totalProcessingTime: 0,
        lastProcessed: 0
      };
      
      stats.processedCount++;
      stats.lastProcessed = processingTime;
      
      // Calculate processing time based on when order was added
      const queue = order.type === OrderType.BUY ? this.buyQueues : this.sellQueues;
      const symbolQueue = queue.get(order.symbol) || [];
      const queueItem = symbolQueue.find(item => item.order.id === order.id);
      
      if (queueItem) {
        const orderProcessingTime = processingTime - queueItem.timestamp;
        stats.totalProcessingTime += orderProcessingTime;
      }
      
      this.processingStats.set(order.symbol, stats);
      
      // Remove processed orders from queue
      this.removeOrder(order.id, order.symbol, order.type);
    });
  }

  getQueueMetrics(symbol?: string): Map<string, QueueMetrics> {
    const metrics = new Map<string, QueueMetrics>();
    
    const symbols = symbol ? [symbol] : [...new Set([...this.buyQueues.keys(), ...this.sellQueues.keys()])];
    
    symbols.forEach(s => {
      const buyQueue = this.buyQueues.get(s) || [];
      const sellQueue = this.sellQueues.get(s) || [];
      const stats = this.processingStats.get(s) || { processedCount: 0, totalProcessingTime: 0, lastProcessed: 0 };
      
      const totalOrders = buyQueue.length + sellQueue.length;
      const ordersByPriority = this.calculateOrdersByPriority(buyQueue, sellQueue);
      const ordersByType = this.calculateOrdersByType(buyQueue, sellQueue);
      
      const averageWaitTime = stats.processedCount > 0 
        ? stats.totalProcessingTime / stats.processedCount 
        : 0;
      
      const oldestOrderAge = this.calculateOldestOrderAge(buyQueue, sellQueue);
      const queueDepth = this.calculateQueueDepth(buyQueue, sellQueue);
      const processingRate = this.calculateProcessingRate(s);
      
      metrics.set(s, {
        totalOrders,
        ordersByPriority,
        ordersByType,
        averageWaitTime,
        oldestOrderAge,
        queueDepth,
        processingRate
      });
    });
    
    return metrics;
  }

  private findInsertIndex(queue: QueueItem[], newItem: QueueItem): number {
    // Binary search for insertion point based on priority and sequence
    let left = 0;
    let right = queue.length;
    
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const midItem = queue[mid];
      
      if (this.compareQueueItems(newItem, midItem) < 0) {
        right = mid;
      } else {
        left = mid + 1;
      }
    }
    
    return left;
  }

  private compareQueueItems(a: QueueItem, b: QueueItem): number {
    // Higher priority first
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    
    // Earlier timestamp first (FIFO within priority)
    if (a.timestamp !== b.timestamp) {
      return a.timestamp - b.timestamp;
    }
    
    // Lower sequence number first (tie-breaker)
    return a.sequenceNumber - b.sequenceNumber;
  }

  private calculateOrdersByPriority(buyQueue: QueueItem[], sellQueue: QueueItem[]): Record<OrderPriority, number> {
    const counts = {
      [OrderPriority.LOW]: 0,
      [OrderPriority.MEDIUM]: 0,
      [OrderPriority.HIGH]: 0,
      [OrderPriority.URGENT]: 0
    };
    
    [...buyQueue, ...sellQueue].forEach(item => {
      counts[item.priority]++;
    });
    
    return counts;
  }

  private calculateOrdersByType(buyQueue: QueueItem[], sellQueue: QueueItem[]): Record<OrderType, number> {
    return {
      [OrderType.BUY]: buyQueue.length,
      [OrderType.SELL]: sellQueue.length
    };
  }

  private calculateOldestOrderAge(buyQueue: QueueItem[], sellQueue: QueueItem[]): number {
    const allQueues = [...buyQueue, ...sellQueue];
    if (allQueues.length === 0) return 0;
    
    const oldestTimestamp = Math.min(...allQueues.map(item => item.timestamp));
    return Date.now() - oldestTimestamp;
  }

  private calculateQueueDepth(buyQueue: QueueItem[], sellQueue: QueueItem[]): number {
    // Calculate weighted depth based on priority
    let depth = 0;
    const priorityWeights = {
      [OrderPriority.LOW]: 1,
      [OrderPriority.MEDIUM]: 2,
      [OrderPriority.HIGH]: 3,
      [OrderPriority.URGENT]: 4
    };
    
    [...buyQueue, ...sellQueue].forEach(item => {
      depth += priorityWeights[item.priority] * item.order.remainingQuantity;
    });
    
    return depth;
  }

  private calculateProcessingRate(symbol: string): number {
    const stats = this.processingStats.get(symbol);
    if (!stats || stats.processedCount === 0) return 0;
    
    // Calculate orders per second over the last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentOrders = this.getRecentProcessedOrders(symbol, oneMinuteAgo);
    
    return recentOrders / 60; // Orders per second
  }

  private getRecentProcessedOrders(symbol: string, since: number): number {
    // This would typically be tracked in a database or time-series store
    // For now, return a placeholder
    return Math.floor(Math.random() * 100);
  }

  private cleanupExpiredOrders(): void {
    const now = Date.now();
    const expiryThreshold = 5 * 60 * 1000; // 5 minutes
    
    [...this.buyQueues.keys(), ...this.sellQueues.keys()].forEach(symbol => {
      const buyQueue = this.buyQueues.get(symbol) || [];
      const sellQueue = this.sellQueues.get(symbol) || [];
      
      // Remove expired orders from buy queue
      const filteredBuyQueue = buyQueue.filter(item => {
        const isExpired = item.order.expiryTime && item.order.expiryTime < now;
        const isOld = (now - item.timestamp) > expiryThreshold;
        
        if (isExpired || isOld) {
          this.logger.debug(`Removing expired/old order ${item.order.id} from buy queue`);
          return false;
        }
        return true;
      });
      
      // Remove expired orders from sell queue
      const filteredSellQueue = sellQueue.filter(item => {
        const isExpired = item.order.expiryTime && item.order.expiryTime < now;
        const isOld = (now - item.timestamp) > expiryThreshold;
        
        if (isExpired || isOld) {
          this.logger.debug(`Removing expired/old order ${item.order.id} from sell queue`);
          return false;
        }
        return true;
      });
      
      this.buyQueues.set(symbol, filteredBuyQueue);
      this.sellQueues.set(symbol, filteredSellQueue);
    });
  }

  private updateMetrics(): void {
    // Update performance metrics periodically
    // This could be extended to store historical data
  }

  clearQueue(symbol: string, type?: OrderType): void {
    if (type === OrderType.BUY) {
      this.buyQueues.delete(symbol);
    } else if (type === OrderType.SELL) {
      this.sellQueues.delete(symbol);
    } else {
      this.buyQueues.delete(symbol);
      this.sellQueues.delete(symbol);
    }
    
    this.logger.log(`Cleared queue for ${symbol} (${type || 'both'})`);
  }

  getQueueSize(symbol: string, type?: OrderType): number {
    if (type === OrderType.BUY) {
      return (this.buyQueues.get(symbol) || []).length;
    } else if (type === OrderType.SELL) {
      return (this.sellQueues.get(symbol) || []).length;
    } else {
      const buySize = (this.buyQueues.get(symbol) || []).length;
      const sellSize = (this.sellQueues.get(symbol) || []).length;
      return buySize + sellSize;
    }
  }

  isQueueEmpty(symbol: string, type?: OrderType): boolean {
    return this.getQueueSize(symbol, type) === 0;
  }
}

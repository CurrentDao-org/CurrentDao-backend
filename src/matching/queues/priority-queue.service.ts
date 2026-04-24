import { Injectable, Logger } from '@nestjs/common';

export interface Order {
  id: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  energyType: string;
  location: string;
  userId: string;
  status: string;
  createdAt: Date;
  priority?: number;
  isRenewable?: boolean;
}

export interface PriorityOrder {
  order: Order;
  priority: number;
  timestamp: number;
  sequence: number;
}

export interface QueueMetrics {
  totalOrders: number;
  buyOrders: number;
  sellOrders: number;
  averageWaitTime: number;
  maxWaitTime: number;
  processingRate: number;
  queueDepth: number;
}

export interface QueueStatistics {
  totalProcessed: number;
  totalEnqueued: number;
  totalDequeued: number;
  averageProcessingTime: number;
  peakQueueDepth: number;
  currentDepth: number;
  throughput: number;
}

@Injectable()
export class PriorityQueueService {
  private readonly logger = new Logger(PriorityQueueService.name);
  private buyQueue: PriorityOrder[] = [];
  private sellQueue: PriorityOrder[] = [];
  private sequenceCounter = 0;
  private readonly MAX_QUEUE_SIZE = 100000;
  private readonly TARGET_THROUGHPUT = 100000; // 100,000 orders/second

  // Statistics tracking
  private stats = {
    totalProcessed: 0,
    totalEnqueued: 0,
    totalDequeued: 0,
    totalProcessingTime: 0,
    peakQueueDepth: 0,
    startTime: Date.now(),
  };

  /**
   * Enqueue an order with priority
   * Higher priority values are processed first
   * Uses a binary heap for O(log n) insertion and O(1) extraction
   */
  enqueue(order: Order, priority: number = 0): boolean {
    if (this.buyQueue.length + this.sellQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn('Queue at maximum capacity, rejecting order');
      return false;
    }

    const priorityOrder: PriorityOrder = {
      order,
      priority,
      timestamp: Date.now(),
      sequence: this.sequenceCounter++,
    };

    if (order.type === 'buy') {
      this.insertIntoQueue(this.buyQueue, priorityOrder);
    } else {
      this.insertIntoQueue(this.sellQueue, priorityOrder);
    }

    this.stats.totalEnqueued++;
    this.updatePeakDepth();

    this.logger.debug(
      `Enqueued order ${order.id} with priority ${priority}. Queue depth: ${this.getCurrentDepth()}`
    );

    return true;
  }

  /**
   * Insert into priority queue using binary heap
   */
  private insertIntoQueue(queue: PriorityOrder[], item: PriorityOrder): void {
    queue.push(item);
    this.heapifyUp(queue, queue.length - 1);
  }

  /**
   * Heapify up for binary heap
   */
  private heapifyUp(queue: PriorityOrder[], index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(queue[index], queue[parentIndex]) > 0) {
        [queue[index], queue[parentIndex]] = [queue[parentIndex], queue[index]];
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Dequeue the highest priority order
   * Returns null if queue is empty
   */
  dequeue(type?: 'buy' | 'sell'): Order | null {
    const startTime = process.hrtime.bigint();

    let queue: PriorityOrder[];
    if (type === 'buy') {
      queue = this.buyQueue;
    } else if (type === 'sell') {
      queue = this.sellQueue;
    } else {
      // Dequeue from the queue with higher priority item
      queue = this.compare(this.buyQueue[0] || { priority: -Infinity }, this.sellQueue[0] || { priority: -Infinity }) > 0
        ? this.buyQueue
        : this.sellQueue;
    }

    if (queue.length === 0) {
      return null;
    }

    const priorityOrder = this.extractFromQueue(queue);
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // microseconds

    this.stats.totalDequeued++;
    this.stats.totalProcessed++;
    this.stats.totalProcessingTime += processingTime;

    this.logger.debug(
      `Dequeued order ${priorityOrder.order.id}. Processing time: ${processingTime.toFixed(2)}μs`
    );

    return priorityOrder.order;
  }

  /**
   * Extract from priority queue using binary heap
   */
  private extractFromQueue(queue: PriorityOrder[]): PriorityOrder {
    if (queue.length === 0) {
      throw new Error('Queue is empty');
    }

    const root = queue[0];
    const last = queue.pop()!;

    if (queue.length > 0) {
      queue[0] = last;
      this.heapifyDown(queue, 0);
    }

    return root;
  }

  /**
   * Heapify down for binary heap
   */
  private heapifyDown(queue: PriorityOrder[], index: number): void {
    const length = queue.length;
    while (true) {
      const leftChildIndex = 2 * index + 1;
      const rightChildIndex = 2 * index + 2;
      let largestIndex = index;

      if (leftChildIndex < length && this.compare(queue[leftChildIndex], queue[largestIndex]) > 0) {
        largestIndex = leftChildIndex;
      }

      if (rightChildIndex < length && this.compare(queue[rightChildIndex], queue[largestIndex]) > 0) {
        largestIndex = rightChildIndex;
      }

      if (largestIndex !== index) {
        [queue[index], queue[largestIndex]] = [queue[largestIndex], queue[index]];
        index = largestIndex;
      } else {
        break;
      }
    }
  }

  /**
   * Compare two priority orders
   * Returns positive if a has higher priority than b
   */
  private compare(a: PriorityOrder, b: PriorityOrder): number {
    // First compare by priority
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Then by timestamp (earlier orders get priority)
    if (a.timestamp !== b.timestamp) {
      return b.timestamp - a.timestamp;
    }

    // Finally by sequence (FIFO for same priority and time)
    return a.sequence - b.sequence;
  }

  /**
   * Peek at the highest priority order without removing it
   */
  peek(type?: 'buy' | 'sell'): Order | null {
    if (type === 'buy') {
      return this.buyQueue.length > 0 ? this.buyQueue[0].order : null;
    } else if (type === 'sell') {
      return this.sellQueue.length > 0 ? this.sellQueue[0].order : null;
    }

    // Return the highest priority from either queue
    if (this.buyQueue.length === 0 && this.sellQueue.length === 0) {
      return null;
    }

    if (this.buyQueue.length === 0) {
      return this.sellQueue[0].order;
    }

    if (this.sellQueue.length === 0) {
      return this.buyQueue[0].order;
    }

    return this.compare(this.buyQueue[0], this.sellQueue[0]) > 0
      ? this.buyQueue[0].order
      : this.sellQueue[0].order;
  }

  /**
   * Get multiple orders from the queue
   */
  dequeueBatch(count: number, type?: 'buy' | 'sell'): Order[] {
    const orders: Order[] = [];
    for (let i = 0; i < count; i++) {
      const order = this.dequeue(type);
      if (order === null) {
        break;
      }
      orders.push(order);
    }
    return orders;
  }

  /**
   * Remove a specific order from the queue
   */
  remove(orderId: string): boolean {
    const buyIndex = this.buyQueue.findIndex(po => po.order.id === orderId);
    if (buyIndex !== -1) {
      this.buyQueue.splice(buyIndex, 1);
      this.rebuildHeap(this.buyQueue);
      return true;
    }

    const sellIndex = this.sellQueue.findIndex(po => po.order.id === orderId);
    if (sellIndex !== -1) {
      this.sellQueue.splice(sellIndex, 1);
      this.rebuildHeap(this.sellQueue);
      return true;
    }

    return false;
  }

  /**
   * Rebuild heap after removal
   */
  private rebuildHeap(queue: PriorityOrder[]): void {
    for (let i = Math.floor(queue.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(queue, i);
    }
  }

  /**
   * Get current queue depth
   */
  getCurrentDepth(): number {
    return this.buyQueue.length + this.sellQueue.length;
  }

  /**
   * Get queue metrics
   */
  getMetrics(): QueueMetrics {
    const currentDepth = this.getCurrentDepth();
    const elapsedTime = Date.now() - this.stats.startTime;
    const throughput = elapsedTime > 0 ? (this.stats.totalProcessed / elapsedTime) * 1000 : 0;

    const buyOrders = this.buyQueue.length;
    const sellOrders = this.sellQueue.length;

    // Calculate wait times
    const now = Date.now();
    const buyWaitTimes = this.buyQueue.map(po => now - po.timestamp);
    const sellWaitTimes = this.sellQueue.map(po => now - po.timestamp);
    const allWaitTimes = [...buyWaitTimes, ...sellWaitTimes];

    const averageWaitTime = allWaitTimes.length > 0
      ? allWaitTimes.reduce((sum, time) => sum + time, 0) / allWaitTimes.length
      : 0;

    const maxWaitTime = allWaitTimes.length > 0
      ? Math.max(...allWaitTimes)
      : 0;

    return {
      totalOrders: currentDepth,
      buyOrders,
      sellOrders,
      averageWaitTime,
      maxWaitTime,
      processingRate: throughput,
      queueDepth: currentDepth,
    };
  }

  /**
   * Get queue statistics
   */
  getStatistics(): QueueStatistics {
    const elapsedTime = Date.now() - this.stats.startTime;
    const averageProcessingTime = this.stats.totalProcessed > 0
      ? this.stats.totalProcessingTime / this.stats.totalProcessed
      : 0;

    const throughput = elapsedTime > 0 ? (this.stats.totalProcessed / elapsedTime) * 1000 : 0;

    return {
      totalProcessed: this.stats.totalProcessed,
      totalEnqueued: this.stats.totalEnqueued,
      totalDequeued: this.stats.totalDequeued,
      averageProcessingTime,
      peakQueueDepth: this.stats.peakQueueDepth,
      currentDepth: this.getCurrentDepth(),
      throughput,
    };
  }

  /**
   * Update peak depth tracking
   */
  private updatePeakDepth(): void {
    const currentDepth = this.getCurrentDepth();
    if (currentDepth > this.stats.peakQueueDepth) {
      this.stats.peakQueueDepth = currentDepth;
    }
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.buyQueue = [];
    this.sellQueue = [];
    this.sequenceCounter = 0;
    this.logger.log('Queues cleared');
  }

  /**
   * Get orders by priority range
   */
  getOrdersByPriority(minPriority: number, maxPriority: number, type?: 'buy' | 'sell'): Order[] {
    const queue = type === 'buy' ? this.buyQueue : type === 'sell' ? this.sellQueue : [...this.buyQueue, ...this.sellQueue];

    return queue
      .filter(po => po.priority >= minPriority && po.priority <= maxPriority)
      .map(po => po.order)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Rebalance queue priorities
   */
  rebalancePriorities(priorityAdjustment: (order: Order, currentPriority: number) => number): void {
    for (const queue of [this.buyQueue, this.sellQueue]) {
      for (let i = 0; i < queue.length; i++) {
        queue[i].priority = priorityAdjustment(queue[i].order, queue[i].priority);
      }
      this.rebuildHeap(queue);
    }

    this.logger.log('Queue priorities rebalanced');
  }

  /**
   * Check if queue is empty
   */
  isEmpty(type?: 'buy' | 'sell'): boolean {
    if (type === 'buy') {
      return this.buyQueue.length === 0;
    }
    if (type === 'sell') {
      return this.sellQueue.length === 0;
    }
    return this.buyQueue.length === 0 && this.sellQueue.length === 0;
  }

  /**
   * Get queue size
   */
  size(type?: 'buy' | 'sell'): number {
    if (type === 'buy') {
      return this.buyQueue.length;
    }
    if (type === 'sell') {
      return this.sellQueue.length;
    }
    return this.buyQueue.length + this.sellQueue.length;
  }

  /**
   * Detect potential manipulation (e.g., order stuffing, priority abuse)
   */
  detectManipulation(userId: string): {
    isSuspicious: boolean;
    reasons: string[];
    orderCount: number;
  } {
    const buyOrders = this.buyQueue.filter(po => po.order.userId === userId);
    const sellOrders = this.sellQueue.filter(po => po.order.userId === userId);
    const totalOrders = buyOrders.length + sellOrders;

    const reasons: string[] = [];
    let isSuspicious = false;

    // Check for excessive orders
    if (totalOrders > 1000) {
      reasons.push('Excessive number of orders in queue');
      isSuspicious = true;
    }

    // Check for priority abuse
    const highPriorityOrders = [...buyOrders, ...sellOrders].filter(po => po.priority > 900);
    if (highPriorityOrders.length > 100) {
      reasons.push('Unusual concentration of high-priority orders');
      isSuspicious = true;
    }

    // Check for rapid order submission
    const recentOrders = [...buyOrders, ...sellOrders].filter(po => Date.now() - po.timestamp < 1000);
    if (recentOrders.length > 100) {
      reasons.push('Rapid order submission detected');
      isSuspicious = true;
    }

    return {
      isSuspicious,
      reasons,
      orderCount: totalOrders,
    };
  }

  /**
   * Get service information
   */
  getServiceInfo(): {
    maxQueueSize: number;
    targetThroughput: number;
    currentDepth: number;
    description: string;
  } {
    return {
      maxQueueSize: this.MAX_QUEUE_SIZE,
      targetThroughput: this.TARGET_THROUGHPUT,
      currentDepth: this.getCurrentDepth(),
      description: 'Priority queue service for high-frequency order processing with fair ordering',
    };
  }
}

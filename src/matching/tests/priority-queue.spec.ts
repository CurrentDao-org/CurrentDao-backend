import { Test, TestingModule } from '@nestjs/testing';
import { PriorityQueueService } from '../queues/priority-queue.service';
import { Order, OrderType, OrderStatus, OrderPriority } from '../entities/order.entity';

describe('PriorityQueueService', () => {
  let service: PriorityQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PriorityQueueService],
    }).compile();

    service = module.get<PriorityQueueService>(PriorityQueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Queue Management', () => {
    const createTestOrder = (
      id: string,
      type: OrderType,
      priority: OrderPriority = OrderPriority.MEDIUM
    ): Order => {
      const order = new Order();
      order.id = id;
      order.userId = 'test-user';
      order.symbol = 'TEST';
      order.type = type;
      order.quantity = 100;
      order.price = 100;
      order.filledQuantity = 0;
      order.remainingQuantity = 100;
      order.status = OrderStatus.PENDING;
      order.priority = priority;
      order.timestamp = Date.now();
      order.createdAt = new Date();
      order.updatedAt = new Date();
      return order;
    };

    it('should add orders to correct queues', () => {
      const buyOrder = createTestOrder('buy1', OrderType.BUY, OrderPriority.HIGH);
      const sellOrder = createTestOrder('sell1', OrderType.SELL, OrderPriority.LOW);

      service.addOrder(buyOrder);
      service.addOrder(sellOrder);

      expect(service.getQueueSize('TEST', OrderType.BUY)).toBe(1);
      expect(service.getQueueSize('TEST', OrderType.SELL)).toBe(1);
      expect(service.getQueueSize('TEST')).toBe(2);
    });

    it('should respect priority ordering', () => {
      const urgentOrder = createTestOrder('urgent', OrderType.BUY, OrderPriority.URGENT);
      const highOrder = createTestOrder('high', OrderType.BUY, OrderPriority.HIGH);
      const mediumOrder = createTestOrder('medium', OrderType.BUY, OrderPriority.MEDIUM);
      const lowOrder = createTestOrder('low', OrderType.BUY, OrderPriority.LOW);

      // Add in random order
      service.addOrder(mediumOrder);
      service.addOrder(lowOrder);
      service.addOrder(urgentOrder);
      service.addOrder(highOrder);

      const nextOrders = service.getNextOrders('TEST', 10);
      expect(nextOrders.buyOrders).toHaveLength(4);
      
      // Should be ordered by priority
      expect(nextOrders.buyOrders[0].id).toBe('urgent');
      expect(nextOrders.buyOrders[1].id).toBe('high');
      expect(nextOrders.buyOrders[2].id).toBe('medium');
      expect(nextOrders.buyOrders[3].id).toBe('low');
    });

    it('should respect FIFO within same priority level', () => {
      const timestamp = Date.now();
      const order1 = createTestOrder('order1', OrderType.BUY, OrderPriority.HIGH);
      const order2 = createTestOrder('order2', OrderType.BUY, OrderPriority.HIGH);
      const order3 = createTestOrder('order3', OrderType.BUY, OrderPriority.HIGH);

      order1.timestamp = timestamp;
      order2.timestamp = timestamp + 1000;
      order3.timestamp = timestamp + 2000;

      service.addOrder(order3);
      service.addOrder(order1);
      service.addOrder(order2);

      const nextOrders = service.getNextOrders('TEST', 10);
      expect(nextOrders.buyOrders[0].id).toBe('order1');
      expect(nextOrders.buyOrders[1].id).toBe('order2');
      expect(nextOrders.buyOrders[2].id).toBe('order3');
    });

    it('should remove orders correctly', () => {
      const order1 = createTestOrder('order1', OrderType.BUY);
      const order2 = createTestOrder('order2', OrderType.BUY);

      service.addOrder(order1);
      service.addOrder(order2);

      expect(service.getQueueSize('TEST', OrderType.BUY)).toBe(2);

      const removed = service.removeOrder('order1', 'TEST', OrderType.BUY);
      expect(removed).toBe(true);
      expect(service.getQueueSize('TEST', OrderType.BUY)).toBe(1);

      const nextOrders = service.getNextOrders('TEST', 10);
      expect(nextOrders.buyOrders[0].id).toBe('order2');
    });

    it('should update order priority correctly', () => {
      const order = createTestOrder('order1', OrderType.BUY, OrderPriority.LOW);
      service.addOrder(order);

      let nextOrders = service.getNextOrders('TEST', 10);
      expect(nextOrders.buyOrders[0].priority).toBe(OrderPriority.LOW);

      const updated = service.updateOrderPriority('order1', 'TEST', OrderType.BUY, OrderPriority.URGENT);
      expect(updated).toBe(true);

      nextOrders = service.getNextOrders('TEST', 10);
      expect(nextOrders.buyOrders[0].priority).toBe(OrderPriority.URGENT);
    });

    it('should handle multiple symbols separately', () => {
      const symbol1Order = createTestOrder('symbol1', OrderType.BUY);
      const symbol2Order = createTestOrder('symbol2', OrderType.BUY);

      symbol1Order.symbol = 'SYMBOL1';
      symbol2Order.symbol = 'SYMBOL2';

      service.addOrder(symbol1Order);
      service.addOrder(symbol2Order);

      expect(service.getQueueSize('SYMBOL1')).toBe(1);
      expect(service.getQueueSize('SYMBOL2')).toBe(1);

      const symbol1Orders = service.getNextOrders('SYMBOL1', 10);
      const symbol2Orders = service.getNextOrders('SYMBOL2', 10);

      expect(symbol1Orders.buyOrders[0].symbol).toBe('SYMBOL1');
      expect(symbol2Orders.buyOrders[0].symbol).toBe('SYMBOL2');
    });

    it('should limit orders returned by getNextOrders', () => {
      for (let i = 0; i < 10; i++) {
        const order = createTestOrder(`order${i}`, OrderType.BUY);
        service.addOrder(order);
      }

      const nextOrders = service.getNextOrders('TEST', 5);
      expect(nextOrders.buyOrders).toHaveLength(5);

      const allOrders = service.getNextOrders('TEST', 20);
      expect(allOrders.buyOrders).toHaveLength(10);
    });

    it('should mark orders as processed', () => {
      const order1 = createTestOrder('order1', OrderType.BUY);
      const order2 = createTestOrder('order2', OrderType.BUY);

      service.addOrder(order1);
      service.addOrder(order2);

      expect(service.getQueueSize('TEST', OrderType.BUY)).toBe(2);

      service.markOrdersProcessed([order1]);

      expect(service.getQueueSize('TEST', OrderType.BUY)).toBe(1);

      const nextOrders = service.getNextOrders('TEST', 10);
      expect(nextOrders.buyOrders[0].id).toBe('order2');
    });

    it('should clear queues correctly', () => {
      const buyOrder = createTestOrder('buy1', OrderType.BUY);
      const sellOrder = createTestOrder('sell1', OrderType.SELL);

      service.addOrder(buyOrder);
      service.addOrder(sellOrder);

      expect(service.getQueueSize('TEST')).toBe(2);

      service.clearQueue('TEST', OrderType.BUY);
      expect(service.getQueueSize('TEST', OrderType.BUY)).toBe(0);
      expect(service.getQueueSize('TEST', OrderType.SELL)).toBe(1);

      service.clearQueue('TEST');
      expect(service.getQueueSize('TEST')).toBe(0);
    });

    it('should check if queue is empty', () => {
      const order = createTestOrder('order1', OrderType.BUY);

      expect(service.isQueueEmpty('TEST')).toBe(true);

      service.addOrder(order);
      expect(service.isQueueEmpty('TEST')).toBe(false);

      service.removeOrder('order1', 'TEST', OrderType.BUY);
      expect(service.isQueueEmpty('TEST')).toBe(true);
    });
  });

  describe('Metrics', () => {
    const createTestOrder = (
      id: string,
      type: OrderType,
      priority: OrderPriority = OrderPriority.MEDIUM
    ): Order => {
      const order = new Order();
      order.id = id;
      order.userId = 'test-user';
      order.symbol = 'METRICS';
      order.type = type;
      order.quantity = 100;
      order.price = 100;
      order.filledQuantity = 0;
      order.remainingQuantity = 100;
      order.status = OrderStatus.PENDING;
      order.priority = priority;
      order.timestamp = Date.now();
      order.createdAt = new Date();
      order.updatedAt = new Date();
      return order;
    };

    it('should calculate queue metrics correctly', () => {
      // Add orders with different priorities and types
      service.addOrder(createTestOrder('buy1', OrderType.BUY, OrderPriority.URGENT));
      service.addOrder(createTestOrder('buy2', OrderType.BUY, OrderPriority.HIGH));
      service.addOrder(createTestOrder('buy3', OrderType.BUY, OrderPriority.MEDIUM));
      service.addOrder(createTestOrder('sell1', OrderType.SELL, OrderPriority.LOW));
      service.addOrder(createTestOrder('sell2', OrderType.SELL, OrderPriority.MEDIUM));

      const metrics = service.getQueueMetrics('METRICS');
      const symbolMetrics = metrics.get('METRICS');

      expect(symbolMetrics).toBeDefined();
      expect(symbolMetrics.totalOrders).toBe(5);
      expect(symbolMetrics.ordersByPriority[OrderPriority.URGENT]).toBe(1);
      expect(symbolMetrics.ordersByPriority[OrderPriority.HIGH]).toBe(1);
      expect(symbolMetrics.ordersByPriority[OrderPriority.MEDIUM]).toBe(2);
      expect(symbolMetrics.ordersByPriority[OrderPriority.LOW]).toBe(1);
      expect(symbolMetrics.ordersByType[OrderType.BUY]).toBe(3);
      expect(symbolMetrics.ordersByType[OrderType.SELL]).toBe(2);
    });

    it('should track processing statistics', () => {
      const order1 = createTestOrder('order1', OrderType.BUY);
      const order2 = createTestOrder('order2', OrderType.BUY);

      service.addOrder(order1);
      service.addOrder(order2);

      // Mark some orders as processed
      service.markOrdersProcessed([order1, order2]);

      const metrics = service.getQueueMetrics('METRICS');
      const symbolMetrics = metrics.get('METRICS');

      expect(symbolMetrics.processingRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high-volume order additions efficiently', () => {
      const startTime = performance.now();

      for (let i = 0; i < 10000; i++) {
        const order = new Order();
        order.id = `order${i}`;
        order.userId = 'test-user';
        order.symbol = 'PERF';
        order.type = i % 2 === 0 ? OrderType.BUY : OrderType.SELL;
        order.quantity = 100;
        order.price = 100;
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = Math.floor(Math.random() * 4) + 1 as OrderPriority;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();

        service.addOrder(order);
      }

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(1000); // Should add 10k orders in under 1 second
      expect(service.getQueueSize('PERF')).toBe(10000);
    });

    it('should handle efficient peek operations', () => {
      // Add many orders
      for (let i = 0; i < 1000; i++) {
        const order = new Order();
        order.id = `order${i}`;
        order.userId = 'test-user';
        order.symbol = 'PEEK';
        order.type = OrderType.BUY;
        order.quantity = 100;
        order.price = 100;
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();

        service.addOrder(order);
      }

      const startTime = performance.now();
      const peekedOrders = service.peekNextOrders('PEEK', 100);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(10); // Peek should be very fast
      expect(peekedOrders.buyOrders).toHaveLength(100);
    });

    it('should maintain performance with mixed priorities', () => {
      const startTime = performance.now();

      // Add orders with mixed priorities
      for (let i = 0; i < 5000; i++) {
        const order = new Order();
        order.id = `order${i}`;
        order.userId = 'test-user';
        order.symbol = 'MIXED';
        order.type = OrderType.BUY;
        order.quantity = 100;
        order.price = 100;
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = Math.floor(Math.random() * 4) + 1 as OrderPriority;
        order.timestamp = Date.now() + Math.random() * 1000; // Random timestamps
        order.createdAt = new Date();
        order.updatedAt = new Date();

        service.addOrder(order);
      }

      const endTime = performance.now();
      const addTime = endTime - startTime;

      expect(addTime).toBeLessThan(500); // Should add mixed priority orders efficiently

      // Test retrieval performance
      const retrieveStart = performance.now();
      const nextOrders = service.getNextOrders('MIXED', 1000);
      const retrieveEnd = performance.now();

      const retrieveTime = retrieveEnd - retrieveStart;

      expect(retrieveTime).toBeLessThan(50); // Retrieval should be fast
      expect(nextOrders.buyOrders).toHaveLength(1000);
    });
  });
});

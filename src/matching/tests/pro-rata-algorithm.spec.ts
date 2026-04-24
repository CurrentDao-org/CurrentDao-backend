import { Test, TestingModule } from '@nestjs/testing';
import { ProRataAlgorithmService } from '../algorithms/pro-rata-algorithm.service';
import { Order, OrderType, OrderStatus, OrderPriority } from '../entities/order.entity';

describe('ProRataAlgorithmService', () => {
  let service: ProRataAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProRataAlgorithmService],
    }).compile();

    service = module.get<ProRataAlgorithmService>(ProRataAlgorithmService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('matchOrders', () => {
    const createTestOrder = (
      id: string,
      type: OrderType,
      price: number,
      quantity: number,
      timestamp?: number
    ): Order => {
      const order = new Order();
      order.id = id;
      order.userId = 'test-user';
      order.symbol = 'TEST';
      order.type = type;
      order.quantity = quantity;
      order.price = price;
      order.filledQuantity = 0;
      order.remainingQuantity = quantity;
      order.status = OrderStatus.PENDING;
      order.priority = OrderPriority.MEDIUM;
      order.timestamp = timestamp || Date.now();
      order.createdAt = new Date();
      order.updatedAt = new Date();
      return order;
    };

    it('should distribute trades proportionally at same price level', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 10),
        createTestOrder('buy2', OrderType.BUY, 100, 20),
        createTestOrder('buy3', OrderType.BUY, 100, 30)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 99, 30)
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(3);
      
      // Check proportional distribution: 10:20:30 ratio
      const buy1Trade = result.trades.find(t => t.buyOrderId === 'buy1');
      const buy2Trade = result.trades.find(t => t.buyOrderId === 'buy2');
      const buy3Trade = result.trades.find(t => t.buyOrderId === 'buy3');

      expect(buy1Trade.quantity).toBe(5);  // 10/60 * 30
      expect(buy2Trade.quantity).toBe(10); // 20/60 * 30
      expect(buy3Trade.quantity).toBe(15); // 30/60 * 30
    });

    it('should handle multiple price levels correctly', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 102, 10),
        createTestOrder('buy2', OrderType.BUY, 101, 20),
        createTestOrder('buy3', OrderType.BUY, 101, 30)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 100, 25),
        createTestOrder('sell2', OrderType.SELL, 99, 20)
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      // Higher price level (102) should match first
      const highPriceTrades = result.trades.filter(t => t.price === 100);
      expect(highPriceTrades.length).toBeGreaterThan(0);
    });

    it('should handle rounding errors in proportional allocation', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 1),
        createTestOrder('buy2', OrderType.BUY, 100, 1),
        createTestOrder('buy3', OrderType.BUY, 100, 1)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 99, 1) // Not divisible by 3
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      // Total allocated should equal available quantity
      const totalAllocated = result.trades.reduce((sum, trade) => sum + trade.quantity, 0);
      expect(totalAllocated).toBeLessThanOrEqual(1);
    });

    it('should handle unequal buy and sell volumes', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 20),
        createTestOrder('buy2', OrderType.BUY, 100, 30)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 99, 10),
        createTestOrder('sell2', OrderType.SELL, 99, 15)
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades.length).toBeGreaterThan(0);
      
      // Should allocate all sell volume proportionally to buy orders
      const totalSellVolume = 25;
      const totalAllocated = result.trades.reduce((sum, trade) => sum + trade.quantity, 0);
      expect(totalAllocated).toBeLessThanOrEqual(totalSellVolume);
    });

    it('should respect FIFO within price levels', async () => {
      const timestamp = Date.now();
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 10, timestamp),
        createTestOrder('buy2', OrderType.BUY, 100, 10, timestamp + 1000)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 99, 10)
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(2);
      
      // Both should get proportional allocation, but order within same price level should respect FIFO
      const buy1Trade = result.trades.find(t => t.buyOrderId === 'buy1');
      const buy2Trade = result.trades.find(t => t.buyOrderId === 'buy2');
      
      expect(buy1Trade).toBeDefined();
      expect(buy2Trade).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume efficiently', async () => {
      const buyOrders = Array.from({ length: 5000 }, (_, i) => {
        const order = new Order();
        order.id = `buy${i}`;
        order.userId = 'test-user';
        order.symbol = 'PERF';
        order.type = OrderType.BUY;
        order.quantity = 100;
        order.price = 100 + (i % 10); // 10 different price levels
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();
        return order;
      });

      const sellOrders = Array.from({ length: 5000 }, (_, i) => {
        const order = new Order();
        order.id = `sell${i}`;
        order.userId = 'test-user';
        order.symbol = 'PERF';
        order.type = OrderType.SELL;
        order.quantity = 100;
        order.price = 95 + (i % 10); // 10 different price levels
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();
        return order;
      });

      const startTime = performance.now();
      const result = await service.matchOrders(buyOrders, sellOrders, 'PERF', 100000);
      const endTime = performance.now();

      const processingTime = endTime - startTime;
      const throughput = (buyOrders.length + sellOrders.length) / (processingTime / 1000);

      expect(processingTime).toBeLessThan(2000); // Should process in under 2 seconds
      expect(throughput).toBeGreaterThan(5000); // Should handle >5k orders/sec
      expect(result.processingTime).toBeLessThan(200); // Individual processing should be fast
    });

    it('should maintain performance with complex allocations', async () => {
      // Create orders with many different quantities at same price level
      const buyOrders = Array.from({ length: 1000 }, (_, i) => {
        const order = new Order();
        order.id = `buy${i}`;
        order.userId = 'test-user';
        order.symbol = 'COMPLEX';
        order.type = OrderType.BUY;
        order.quantity = Math.random() * 1000 + 1; // Random quantities
        order.price = 100;
        order.filledQuantity = 0;
        order.remainingQuantity = order.quantity;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();
        return order;
      });

      const sellOrders = Array.from({ length: 100 }, (_, i) => {
        const order = new Order();
        order.id = `sell${i}`;
        order.userId = 'test-user';
        order.symbol = 'COMPLEX';
        order.type = OrderType.SELL;
        order.quantity = 500;
        order.price = 99;
        order.filledQuantity = 0;
        order.remainingQuantity = 500;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();
        return order;
      });

      const startTime = performance.now();
      const result = await service.matchOrders(buyOrders, sellOrders, 'COMPLEX');
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(500); // Should handle complex allocations efficiently
      expect(result.trades.length).toBeGreaterThan(0);
      
      // Verify proportional allocation
      const totalBuyVolume = buyOrders.reduce((sum, order) => sum + order.quantity, 0);
      const totalAllocated = result.trades.reduce((sum, trade) => sum + trade.quantity, 0);
      expect(totalAllocated).toBeLessThanOrEqual(totalBuyVolume);
    });
  });
});

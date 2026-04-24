import { Test, TestingModule } from '@nestjs/testing';
import { FifoAlgorithmService } from '../algorithms/fifo-algorithm.service';
import { Order, OrderType, OrderStatus, OrderPriority } from '../entities/order.entity';
import { Trade } from '../entities/trade.entity';

describe('FifoAlgorithmService', () => {
  let service: FifoAlgorithmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FifoAlgorithmService],
    }).compile();

    service = module.get<FifoAlgorithmService>(FifoAlgorithmService);
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

    it('should match simple buy and sell orders', async () => {
      const buyOrders = [createTestOrder('buy1', OrderType.BUY, 100, 10)];
      const sellOrders = [createTestOrder('sell1', OrderType.SELL, 99, 10)];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].buyOrderId).toBe('buy1');
      expect(result.trades[0].sellOrderId).toBe('sell1');
      expect(result.trades[0].quantity).toBe(10);
      expect(result.trades[0].price).toBe(99); // Sell order price
      expect(result.updatedOrders).toHaveLength(2);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should not match when buy price is lower than sell price', async () => {
      const buyOrders = [createTestOrder('buy1', OrderType.BUY, 95, 10)];
      const sellOrders = [createTestOrder('sell1', OrderType.SELL, 100, 10)];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(0);
      expect(result.unmatchedOrders).toHaveLength(2);
    });

    it('should handle partial fills', async () => {
      const buyOrders = [createTestOrder('buy1', OrderType.BUY, 100, 15)];
      const sellOrders = [createTestOrder('sell1', OrderType.SELL, 99, 10)];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(1);
      expect(result.trades[0].quantity).toBe(10);
      
      const buyOrder = result.updatedOrders.find(o => o.id === 'buy1');
      expect(buyOrder.status).toBe(OrderStatus.PARTIALLY_FILLED);
      expect(buyOrder.remainingQuantity).toBe(5);
      
      const sellOrder = result.updatedOrders.find(o => o.id === 'sell1');
      expect(sellOrder.status).toBe(OrderStatus.FILLED);
      expect(sellOrder.remainingQuantity).toBe(0);
    });

    it('should respect FIFO ordering within same price level', async () => {
      const timestamp = Date.now();
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 5, timestamp),
        createTestOrder('buy2', OrderType.BUY, 100, 5, timestamp + 1000),
        createTestOrder('buy3', OrderType.BUY, 100, 5, timestamp + 2000)
      ];
      const sellOrders = [createTestOrder('sell1', OrderType.SELL, 99, 10)];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(2);
      expect(result.trades[0].buyOrderId).toBe('buy1'); // First buy order matched
      expect(result.trades[1].buyOrderId).toBe('buy2'); // Second buy order matched
      expect(result.unmatchedOrders).toHaveLength(1);
      expect(result.unmatchedOrders[0].id).toBe('buy3'); // Third buy order unmatched
    });

    it('should handle multiple price levels correctly', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 102, 5),
        createTestOrder('buy2', OrderType.BUY, 101, 5),
        createTestOrder('buy3', OrderType.BUY, 100, 5)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 99, 5),
        createTestOrder('sell2', OrderType.SELL, 98, 5)
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');

      expect(result.trades).toHaveLength(2);
      // Highest buy order (102) should match with lowest sell order (99)
      expect(result.trades[0].buyOrderId).toBe('buy1');
      expect(result.trades[0].sellOrderId).toBe('sell1');
      // Second highest buy order (101) should match with second lowest sell order (98)
      expect(result.trades[1].buyOrderId).toBe('buy2');
      expect(result.trades[1].sellOrderId).toBe('sell2');
    });

    it('should handle timeout correctly', async () => {
      const buyOrders = Array.from({ length: 1000 }, (_, i) => 
        createTestOrder(`buy${i}`, OrderType.BUY, 100 + i, 10)
      );
      const sellOrders = Array.from({ length: 1000 }, (_, i) => 
        createTestOrder(`sell${i}`, OrderType.SELL, 100 - i, 10)
      );

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST', 100, 1); // 1ms timeout

      expect(result.processingTime).toBeLessThan(10); // Should timeout quickly
    });

    it('should respect maxOrdersPerMatch limit', async () => {
      const buyOrders = Array.from({ length: 150 }, (_, i) => 
        createTestOrder(`buy${i}`, OrderType.BUY, 100, 10)
      );
      const sellOrders = Array.from({ length: 150 }, (_, i) => 
        createTestOrder(`sell${i}`, OrderType.SELL, 99, 10)
      );

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST', 50);

      expect(result.trades.length).toBeLessThanOrEqual(50);
    });

    it('should calculate liquidity metrics correctly', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 10),
        createTestOrder('buy2', OrderType.BUY, 99, 5)
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 101, 8),
        createTestOrder('sell2', OrderType.SELL, 102, 3)
      ];

      const result = await service.matchOrders(buyOrders, sellOrders, 'TEST');
      const metrics = service.calculateLiquidityMetrics(result.trades, buyOrders, sellOrders);

      expect(metrics.fillRate).toBeGreaterThanOrEqual(0);
      expect(metrics.fillRate).toBeLessThanOrEqual(100);
      expect(metrics.marketDepth).toBeGreaterThan(0);
      expect(metrics.spread).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle high volume of orders efficiently', async () => {
      const buyOrders = Array.from({ length: 10000 }, (_, i) => {
        const order = new Order();
        order.id = `buy${i}`;
        order.userId = 'test-user';
        order.symbol = 'PERF';
        order.type = OrderType.BUY;
        order.quantity = 100;
        order.price = 100 + Math.random() * 10;
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();
        return order;
      });

      const sellOrders = Array.from({ length: 10000 }, (_, i) => {
        const order = new Order();
        order.id = `sell${i}`;
        order.userId = 'test-user';
        order.symbol = 'PERF';
        order.type = OrderType.SELL;
        order.quantity = 100;
        order.price = 90 + Math.random() * 10;
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

      expect(processingTime).toBeLessThan(1000); // Should process in under 1 second
      expect(throughput).toBeGreaterThan(10000); // Should handle >10k orders/sec
      expect(result.processingTime).toBeLessThan(100); // Individual processing should be fast
    });

    it('should maintain sub-100 microsecond latency for 95% of orders', async () => {
      const latencies: number[] = [];
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const buyOrders = [new Order()];
        buyOrders[0].id = `buy${i}`;
        buyOrders[0].type = OrderType.BUY;
        buyOrders[0].price = 100;
        buyOrders[0].quantity = 10;
        buyOrders[0].remainingQuantity = 10;
        buyOrders[0].status = OrderStatus.PENDING;

        const sellOrders = [new Order()];
        sellOrders[0].id = `sell${i}`;
        sellOrders[0].type = OrderType.SELL;
        sellOrders[0].price = 99;
        sellOrders[0].quantity = 10;
        sellOrders[0].remainingQuantity = 10;
        sellOrders[0].status = OrderStatus.PENDING;

        const result = await service.matchOrders(buyOrders, sellOrders, 'LATENCY');
        latencies.push(result.processingTime);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      expect(p95Latency).toBeLessThan(0.1); // 95% should be under 100 microseconds
    });
  });
});

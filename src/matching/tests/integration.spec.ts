import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HighFrequencyMatchingService } from '../high-frequency-matching.service';
import { MatchingController } from '../matching.controller';
import { FifoAlgorithmService } from '../algorithms/fifo-algorithm.service';
import { ProRataAlgorithmService } from '../algorithms/pro-rata-algorithm.service';
import { LiquidityOptimizerService } from '../liquidity/liquidity-optimizer.service';
import { PriorityQueueService } from '../queues/priority-queue.service';
import { MatchingAnalyticsService } from '../monitoring/matching-analytics.service';
import { Order, OrderType, OrderStatus, OrderPriority } from '../entities/order.entity';
import { Trade } from '../entities/trade.entity';
import { OrderBook } from '../entities/order-book.entity';
import { MatchingAlgorithm } from '../dto/matching.dto';

describe('High-Frequency Matching Integration Tests', () => {
  let service: HighFrequencyMatchingService;
  let controller: MatchingController;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Order, Trade, OrderBook],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([Order, Trade, OrderBook]),
      ],
      controllers: [MatchingController],
      providers: [
        HighFrequencyMatchingService,
        FifoAlgorithmService,
        ProRataAlgorithmService,
        LiquidityOptimizerService,
        PriorityQueueService,
        MatchingAnalyticsService,
      ],
    }).compile();

    service = module.get<HighFrequencyMatchingService>(HighFrequencyMatchingService);
    controller = module.get<MatchingController>(MatchingController);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    // This would require repository access in a real implementation
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(controller).toBeDefined();
  });

  describe('End-to-End Matching Flow', () => {
    const createTestOrder = (
      id: string,
      type: OrderType,
      price: number,
      quantity: number,
      priority: OrderPriority = OrderPriority.MEDIUM
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
      order.priority = priority;
      order.timestamp = Date.now();
      order.createdAt = new Date();
      order.updatedAt = new Date();
      return order;
    };

    it('should process complete matching workflow', async () => {
      // Create test orders
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 10, OrderPriority.HIGH),
        createTestOrder('buy2', OrderType.BUY, 99, 15, OrderPriority.MEDIUM),
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 98, 12, OrderPriority.HIGH),
        createTestOrder('sell2', OrderType.SELL, 97, 8, OrderPriority.LOW),
      ];

      // Add orders to queue
      for (const order of buyOrders) {
        await service.addOrderToQueue(order);
      }
      for (const order of sellOrders) {
        await service.addOrderToQueue(order);
      }

      // Execute matching
      const matchingRequest = {
        symbol: 'TEST',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 100,
        timeoutMs: 100,
        enableLiquidityOptimization: true,
        enableAntiManipulation: true,
      };

      const result = await service.processMatchingRequest(matchingRequest);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toBeGreaterThan(0);
      expect(result.totalTrades).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeLessThan(100);
      expect(result.liquidityMetrics).toBeDefined();
    });

    it('should handle high-volume matching efficiently', async () => {
      const orderCount = 10000;
      const buyOrders: Order[] = [];
      const sellOrders: Order[] = [];

      // Generate high volume of orders
      for (let i = 0; i < orderCount; i++) {
        if (i % 2 === 0) {
          buyOrders.push(createTestOrder(`buy${i}`, OrderType.BUY, 100 + Math.random() * 5, 100));
        } else {
          sellOrders.push(createTestOrder(`sell${i}`, OrderType.SELL, 95 + Math.random() * 5, 100));
        }
      }

      const startTime = performance.now();

      // Add all orders to queue
      for (const order of [...buyOrders, ...sellOrders]) {
        await service.addOrderToQueue(order);
      }

      // Execute matching
      const matchingRequest = {
        symbol: 'HIGHVOL',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 10000,
        timeoutMs: 1000,
        enableLiquidityOptimization: true,
        enableAntiManipulation: true,
      };

      const result = await service.processMatchingRequest(matchingRequest);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.processedOrders).toBeGreaterThan(0);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingTimeMs).toBeLessThan(1000); // Individual matching should be fast

      // Check performance metrics
      const performanceMetrics = await service.getPerformanceMetrics();
      expect(performanceMetrics.totalOrdersProcessed).toBeGreaterThan(0);
      expect(performanceMetrics.averageLatency).toBeLessThan(100);
      expect(performanceMetrics.peakThroughput).toBeGreaterThan(1000);
    });

    it('should handle different matching algorithms', async () => {
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 10),
        createTestOrder('buy2', OrderType.BUY, 100, 20),
        createTestOrder('buy3', OrderType.BUY, 100, 30),
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 99, 30),
      ];

      // Add orders to queue
      for (const order of [...buyOrders, ...sellOrders]) {
        await service.addOrderToQueue(order);
      }

      // Test FIFO algorithm
      const fifoResult = await service.processMatchingRequest({
        symbol: 'ALGO1',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 100,
        timeoutMs: 100,
        enableLiquidityOptimization: false,
        enableAntiManipulation: false,
      });

      // Test Pro-Rata algorithm
      const proRataResult = await service.processMatchingRequest({
        symbol: 'ALGO2',
        algorithm: MatchingAlgorithm.PRO_RATA,
        maxOrdersPerMatch: 100,
        timeoutMs: 100,
        enableLiquidityOptimization: false,
        enableAntiManipulation: false,
      });

      expect(fifoResult.success).toBe(true);
      expect(proRataResult.success).toBe(true);
      expect(fifoResult.totalTrades).toBeGreaterThan(0);
      expect(proRataResult.totalTrades).toBeGreaterThan(0);

      // Results should be different due to different algorithms
      expect(fifoResult.trades.length).not.toBe(proRataResult.trades.length);
    });

    it('should detect and handle manipulation patterns', async () => {
      // Create orders that might indicate manipulation
      const suspiciousOrders = [
        createTestOrder('suspicious1', OrderType.BUY, 100, 10000, OrderPriority.HIGH), // Unusually large
        createTestOrder('suspicious2', OrderType.BUY, 99.5, 10000, OrderPriority.HIGH), // Layering
        createTestOrder('suspicious3', OrderType.BUY, 99, 10000, OrderPriority.HIGH), // Layering
      ];
      const normalSellOrders = [
        createTestOrder('sell1', OrderType.SELL, 98, 100),
      ];

      // Add orders to queue
      for (const order of [...suspiciousOrders, ...normalSellOrders]) {
        await service.addOrderToQueue(order);
      }

      // Execute matching with anti-manipulation enabled
      const result = await service.processMatchingRequest({
        symbol: 'MANIP',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 100,
        timeoutMs: 100,
        enableLiquidityOptimization: false,
        enableAntiManipulation: true,
      });

      expect(result.success).toBe(true);
      // Anti-manipulation should filter or modify suspicious orders
      expect(result.processedOrders).toBeGreaterThan(0);
    });

    it('should optimize liquidity effectively', async () => {
      // Create orders with poor liquidity characteristics
      const buyOrders = [
        createTestOrder('buy1', OrderType.BUY, 100, 100),
        createTestOrder('buy2', OrderType.BUY, 95, 100), // Wide spread
      ];
      const sellOrders = [
        createTestOrder('sell1', OrderType.SELL, 105, 100),
        createTestOrder('sell2', OrderType.SELL, 110, 100), // Wide spread
      ];

      // Add orders to queue
      for (const order of [...buyOrders, ...sellOrders]) {
        await service.addOrderToQueue(order);
      }

      // Execute matching with liquidity optimization
      const result = await service.processMatchingRequest({
        symbol: 'LIQ',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 100,
        timeoutMs: 100,
        enableLiquidityOptimization: true,
        enableAntiManipulation: false,
      });

      expect(result.success).toBe(true);
      expect(result.liquidityMetrics).toBeDefined();
      expect(result.liquidityMetrics.fillRate).toBeGreaterThanOrEqual(0);
      expect(result.liquidityMetrics.marketDepth).toBeGreaterThan(0);
      expect(result.liquidityMetrics.spread).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Controller Integration', () => {
    it('should handle order creation through API', async () => {
      const createOrderDto = {
        userId: 'test-user',
        symbol: 'API',
        type: OrderType.BUY,
        quantity: 100,
        price: 100,
        priority: OrderPriority.MEDIUM,
      };

      const result = await controller.createOrder(createOrderDto);

      expect(result.success).toBe(true);
      expect(result.orderId).toBeDefined();
      expect(result.message).toContain('Order created');
    });

    it('should handle bulk order creation', async () => {
      const bulkCreateOrderDto = {
        userId: 'test-user',
        orders: [
          {
            symbol: 'BULK',
            type: OrderType.BUY,
            quantity: 100,
            price: 100,
            priority: OrderPriority.MEDIUM,
          },
          {
            symbol: 'BULK',
            type: OrderType.SELL,
            quantity: 100,
            price: 99,
            priority: OrderPriority.MEDIUM,
          },
        ],
      };

      const result = await controller.createBulkOrders(bulkCreateOrderDto);

      expect(result.success).toBe(true);
      expect(result.totalOrders).toBe(2);
      expect(result.successfulOrders).toBe(2);
      expect(result.failedOrders).toBe(0);
    });

    it('should execute matching through API', async () => {
      // First add some orders
      await controller.createOrder({
        userId: 'test-user',
        symbol: 'MATCH-API',
        type: OrderType.BUY,
        quantity: 100,
        price: 100,
        priority: OrderPriority.MEDIUM,
      });

      await controller.createOrder({
        userId: 'test-user',
        symbol: 'MATCH-API',
        type: OrderType.SELL,
        quantity: 100,
        price: 99,
        priority: OrderPriority.MEDIUM,
      });

      const matchingRequest = {
        symbol: 'MATCH-API',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 100,
        timeoutMs: 100,
        enableLiquidityOptimization: true,
        enableAntiManipulation: true,
      };

      const result = await controller.executeMatching(matchingRequest);

      expect(result.success).toBe(true);
      expect(result.processedOrders).toBeGreaterThan(0);
      expect(result.totalTrades).toBeGreaterThan(0);
    });

    it('should provide analytics through API', async () => {
      const analyticsQuery = {
        symbol: 'ANALYTICS',
        startTime: Date.now() - 3600000, // 1 hour ago
        endTime: Date.now(),
        metrics: ['fillRate', 'latency', 'throughput'],
      };

      const result = await controller.getAnalytics('ANALYTICS', analyticsQuery);

      expect(result.symbol).toBe('ANALYTICS');
      expect(result.period).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.alerts).toBeDefined();
    });

    it('should provide system health status', async () => {
      const result = await controller.getHealthStatus();

      expect(result.status).toBeDefined();
      expect(result.systemHealth).toBeDefined();
      expect(result.performance).toBeDefined();
      expect(result.alerts).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should run stress tests through API', async () => {
      const stressTestConfig = {
        symbol: 'STRESS',
        orderCount: 1000,
        algorithm: 'FIFO',
        duration: 5, // 5 seconds
      };

      const result = await controller.runStressTest(stressTestConfig);

      expect(result.success).toBe(true);
      expect(result.testConfig).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.throughput).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet acceptance criteria for throughput', async () => {
      const targetOrdersPerSecond = 100000;
      const testDuration = 10; // seconds
      const totalOrders = targetOrdersPerSecond * testDuration;

      const startTime = performance.now();

      // Generate and process orders
      for (let i = 0; i < totalOrders; i++) {
        const order = new Order();
        order.id = `perf${i}`;
        order.userId = 'perf-user';
        order.symbol = 'PERF-BENCH';
        order.type = i % 2 === 0 ? OrderType.BUY : OrderType.SELL;
        order.quantity = 100;
        order.price = 100 + (Math.random() - 0.5) * 10;
        order.filledQuantity = 0;
        order.remainingQuantity = 100;
        order.status = OrderStatus.PENDING;
        order.priority = OrderPriority.MEDIUM;
        order.timestamp = Date.now();
        order.createdAt = new Date();
        order.updatedAt = new Date();

        await service.addOrderToQueue(order);

        // Process in batches to avoid memory issues
        if (i % 10000 === 0) {
          await service.processMatchingRequest({
            symbol: 'PERF-BENCH',
            algorithm: MatchingAlgorithm.FIFO,
            maxOrdersPerMatch: 10000,
            timeoutMs: 100,
            enableLiquidityOptimization: true,
            enableAntiManipulation: true,
          });
        }
      }

      // Final processing
      await service.processMatchingRequest({
        symbol: 'PERF-BENCH',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 10000,
        timeoutMs: 100,
        enableLiquidityOptimization: true,
        enableAntiManipulation: true,
      });

      const endTime = performance.now();
      const actualDuration = (endTime - startTime) / 1000; // Convert to seconds
      const actualThroughput = totalOrders / actualDuration;

      expect(actualThroughput).toBeGreaterThan(targetOrdersPerSecond * 0.8); // At least 80% of target
    });

    it('should meet acceptance criteria for latency', async () => {
      const targetLatency = 0.1; // 100 microseconds
      const testCount = 1000;
      const latencies: number[] = [];

      for (let i = 0; i < testCount; i++) {
        const startTime = performance.now();

        // Simple matching operation
        await service.processMatchingRequest({
          symbol: 'LATENCY-BENCH',
          algorithm: MatchingAlgorithm.FIFO,
          maxOrdersPerMatch: 10,
          timeoutMs: 100,
          enableLiquidityOptimization: false,
          enableAntiManipulation: false,
        });

        const endTime = performance.now();
        latencies.push(endTime - startTime);
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);
      const p95Latency = latencies[p95Index];

      expect(p95Latency).toBeLessThan(targetLatency); // 95% should be under 100 microseconds
    });

    it('should demonstrate liquidity optimization benefits', async () => {
      // Test without liquidity optimization
      const resultWithoutOpt = await service.processMatchingRequest({
        symbol: 'LIQ-OFF',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 1000,
        timeoutMs: 100,
        enableLiquidityOptimization: false,
        enableAntiManipulation: false,
      });

      // Test with liquidity optimization
      const resultWithOpt = await service.processMatchingRequest({
        symbol: 'LIQ-ON',
        algorithm: MatchingAlgorithm.FIFO,
        maxOrdersPerMatch: 1000,
        timeoutMs: 100,
        enableLiquidityOptimization: true,
        enableAntiManipulation: false,
      });

      // Liquidity optimization should improve fill rates
      if (resultWithOpt.liquidityMetrics && resultWithoutOpt.liquidityMetrics) {
        expect(resultWithOpt.liquidityMetrics.fillRate).toBeGreaterThanOrEqual(
          resultWithoutOpt.liquidityMetrics.fillRate * 0.9
        ); // Should be at least 90% as good
      }
    });
  });
});

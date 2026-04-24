import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { 
  CreateOrderDto, 
  CancelOrderDto, 
  ModifyOrderDto, 
  BulkCreateOrderDto,
  MatchingRequestDto,
  MatchingResultDto,
  OrderBookQueryDto,
  OrderBookResponseDto,
  MatchingAnalyticsDto,
  MatchingAnalyticsResponseDto
} from './dto/matching.dto';
import { HighFrequencyMatchingService } from './high-frequency-matching.service';
import { MatchingAnalyticsService } from './monitoring/matching-analytics.service';
import { PriorityQueueService } from './queues/priority-queue.service';

@ApiTags('matching')
@Controller('matching')
@UseGuards(ThrottlerGuard)
export class MatchingController {
  constructor(
    private readonly matchingService: HighFrequencyMatchingService,
    private readonly analytics: MatchingAnalyticsService,
    private readonly priorityQueue: PriorityQueueService
  ) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid order data' })
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...createOrderDto,
      filledQuantity: 0,
      remainingQuantity: createOrderDto.quantity,
      status: 'PENDING' as any,
      timestamp: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.matchingService.addOrderToQueue(order as any);
    
    return {
      success: true,
      orderId: order.id,
      message: 'Order created and added to queue',
      timestamp: Date.now()
    };
  }

  @Post('orders/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create multiple orders' })
  @ApiResponse({ status: 201, description: 'Orders created successfully' })
  async createBulkOrders(@Body() bulkCreateOrderDto: BulkCreateOrderDto) {
    const results = [];
    
    for (const orderDto of bulkCreateOrderDto.orders) {
      try {
        const order = {
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...orderDto,
          filledQuantity: 0,
          remainingQuantity: orderDto.quantity,
          status: 'PENDING' as any,
          timestamp: Date.now(),
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await this.matchingService.addOrderToQueue(order as any);
        results.push({ success: true, orderId: order.id });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return {
      success: true,
      results,
      totalOrders: bulkCreateOrderDto.orders.length,
      successfulOrders: results.filter(r => r.success).length,
      failedOrders: results.filter(r => !r.success).length
    };
  }

  @Put('orders/:orderId')
  @ApiOperation({ summary: 'Modify an existing order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order modified successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async modifyOrder(
    @Param('orderId') orderId: string,
    @Body() modifyOrderDto: ModifyOrderDto
  ) {
    // Implementation would modify the order in the queue
    return {
      success: true,
      message: 'Order modification not yet implemented',
      orderId
    };
  }

  @Delete('orders/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() cancelOrderDto: CancelOrderDto
  ) {
    const success = await this.matchingService.cancelOrder(orderId, cancelOrderDto.userId);
    
    return {
      success,
      message: success ? 'Order cancelled successfully' : 'Order not found or cannot be cancelled',
      orderId,
      timestamp: Date.now()
    };
  }

  @Post('match')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Execute order matching' })
  @ApiResponse({ status: 200, description: 'Matching completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid matching request' })
  async executeMatching(@Body() matchingRequest: MatchingRequestDto): Promise<MatchingResultDto> {
    return await this.matchingService.processMatchingRequest(matchingRequest);
  }

  @Get('orderbook/:symbol')
  @ApiOperation({ summary: 'Get order book for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'depth', required: false, description: 'Order book depth' })
  @ApiResponse({ status: 200, description: 'Order book retrieved successfully' })
  async getOrderBook(
    @Param('symbol') symbol: string,
    @Query() query: OrderBookQueryDto
  ): Promise<OrderBookResponseDto> {
    // Implementation would retrieve order book from database
    const mockOrderBook: OrderBookResponseDto = {
      symbol,
      timestamp: Date.now(),
      bestBid: 99.95,
      bestAsk: 100.05,
      spread: 0.10,
      midPrice: 100.00,
      totalBuyVolume: 10000,
      totalSellVolume: 8000,
      totalOrders: 150,
      depth: query.depth || 20,
      buyOrders: [
        { price: 99.95, quantity: 1000, orderCount: 5, totalVolume: 5000 },
        { price: 99.90, quantity: 800, orderCount: 3, totalVolume: 2400 }
      ],
      sellOrders: [
        { price: 100.05, quantity: 1200, orderCount: 4, totalVolume: 4800 },
        { price: 100.10, quantity: 600, orderCount: 2, totalVolume: 1200 }
      ]
    };

    return mockOrderBook;
  }

  @Get('queue/:symbol/metrics')
  @ApiOperation({ summary: 'Get queue metrics for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiResponse({ status: 200, description: 'Queue metrics retrieved successfully' })
  async getQueueMetrics(@Param('symbol') symbol: string) {
    const metrics = this.priorityQueue.getQueueMetrics(symbol);
    
    return {
      success: true,
      symbol,
      metrics: Object.fromEntries(metrics),
      timestamp: Date.now()
    };
  }

  @Get('analytics/:symbol')
  @ApiOperation({ summary: 'Get matching analytics for a symbol' })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'startTime', required: false, description: 'Start time for analytics period' })
  @ApiQuery({ name: 'endTime', required: false, description: 'End time for analytics period' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Param('symbol') symbol: string,
    @Query() query: MatchingAnalyticsDto
  ): Promise<MatchingAnalyticsResponseDto> {
    return this.analytics.getAnalytics(symbol, query.startTime, query.endTime);
  }

  @Get('analytics/system')
  @ApiOperation({ summary: 'Get system-wide analytics' })
  @ApiResponse({ status: 200, description: 'System analytics retrieved successfully' })
  async getSystemAnalytics() {
    return this.analytics.getSystemOverview();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by symbol' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved successfully' })
  async getAlerts(
    @Query('symbol') symbol?: string,
    @Query('severity') severity?: string
  ) {
    const alerts = this.analytics.getAlerts(symbol, severity);
    
    return {
      success: true,
      alerts,
      total: alerts.length,
      timestamp: Date.now()
    };
  }

  @Put('alerts/:alertId/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(@Param('alertId') alertId: string) {
    const success = this.analytics.resolveAlert(alertId);
    
    return {
      success,
      message: success ? 'Alert resolved successfully' : 'Alert not found',
      alertId,
      timestamp: Date.now()
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    const metrics = await this.matchingService.getPerformanceMetrics();
    
    return {
      success: true,
      metrics,
      timestamp: Date.now()
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get matching system health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getHealthStatus() {
    const systemOverview = this.analytics.getSystemOverview();
    const performanceMetrics = await this.matchingService.getPerformanceMetrics();
    
    const isHealthy = systemOverview.systemHealth === 'HEALTHY' && 
                     performanceMetrics.averageLatency < 100 &&
                     performanceMetrics.peakThroughput > 1000;

    return {
      status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
      systemHealth: systemOverview.systemHealth,
      performance: {
        averageLatency: performanceMetrics.averageLatency,
        peakThroughput: performanceMetrics.peakThroughput,
        currentThroughput: performanceMetrics.currentThroughput
      },
      alerts: {
        active: systemOverview.activeAlerts,
        critical: this.analytics.getAlerts(undefined, 'CRITICAL').length
      },
      timestamp: Date.now()
    };
  }

  @Post('stress-test')
  @ApiOperation({ summary: 'Run stress test on matching system' })
  @ApiResponse({ status: 200, description: 'Stress test completed' })
  async runStressTest(@Body() config: {
    symbol: string;
    orderCount: number;
    algorithm: string;
    duration: number; // seconds
  }) {
    const startTime = Date.now();
    const results = {
      ordersGenerated: 0,
      ordersProcessed: 0,
      tradesGenerated: 0,
      averageLatency: 0,
      peakThroughput: 0,
      errors: []
    };

    try {
      // Generate test orders
      const testOrders = [];
      for (let i = 0; i < config.orderCount; i++) {
        const isBuy = Math.random() > 0.5;
        testOrders.push({
          id: `test_order_${i}`,
          userId: `test_user_${Math.floor(Math.random() * 10)}`,
          symbol: config.symbol,
          type: isBuy ? 'BUY' : 'SELL',
          quantity: Math.random() * 1000 + 100,
          price: 100 + (Math.random() - 0.5) * 10, // ±5% around 100
          priority: 'MEDIUM' as any,
          timestamp: Date.now() + i,
          status: 'PENDING' as any,
          filledQuantity: 0,
          remainingQuantity: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }

      results.ordersGenerated = testOrders.length;

      // Process orders in batches
      const batchSize = 100;
      for (let i = 0; i < testOrders.length; i += batchSize) {
        const batch = testOrders.slice(i, i + batchSize);
        
        // Add orders to queue
        for (const order of batch) {
          order.remainingQuantity = order.quantity;
          await this.matchingService.addOrderToQueue(order as any);
        }

        // Execute matching
        const matchingResult = await this.matchingService.processMatchingRequest({
          symbol: config.symbol,
          algorithm: config.algorithm as any,
          maxOrdersPerMatch: batchSize,
          timeoutMs: 100,
          enableLiquidityOptimization: true,
          enableAntiManipulation: true
        });

        results.ordersProcessed += matchingResult.processedOrders;
        results.tradesGenerated += matchingResult.totalTrades;
        results.averageLatency = (results.averageLatency + matchingResult.processingTimeMs) / 2;
        
        const currentThroughput = matchingResult.processedOrders / (matchingResult.processingTimeMs / 1000);
        if (currentThroughput > results.peakThroughput) {
          results.peakThroughput = currentThroughput;
        }

        // Check if we've exceeded the duration
        if (Date.now() - startTime > config.duration * 1000) {
          break;
        }
      }

    } catch (error) {
      results.errors.push(error.message);
    }

    const totalTime = Date.now() - startTime;

    return {
      success: results.errors.length === 0,
      testConfig: config,
      results,
      duration: totalTime,
      throughput: results.ordersProcessed / (totalTime / 1000),
      timestamp: Date.now()
    };
  }
}

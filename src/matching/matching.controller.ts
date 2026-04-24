import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';

import { MatchingService } from './matching.service';
import { FIFOAlgorithmService } from './algorithms/fifo-algorithm.service';
import { ProRataAlgorithmService } from './algorithms/pro-rata-algorithm.service';
import { LiquidityOptimizerService } from './liquidity/liquidity-optimizer.service';
import { PriorityQueueService } from './queues/priority-queue.service';
import { MatchingAnalyticsService } from './monitoring/matching-analytics.service';

import { MatchingPreferencesDto } from './dto/matching-preferences.dto';

@ApiTags('matching')
@Controller('matching')
@UseGuards(ThrottlerGuard)
@UseInterceptors(ResponseInterceptor)
export class MatchingController {
  constructor(
    private readonly matchingService: MatchingService,
    private readonly fifoAlgorithm: FIFOAlgorithmService,
    private readonly proRataAlgorithm: ProRataAlgorithmService,
    private readonly liquidityOptimizer: LiquidityOptimizerService,
    private readonly priorityQueue: PriorityQueueService,
    private readonly analyticsService: MatchingAnalyticsService,
  ) {}

  @Post('match/fifo')
  @ApiOperation({ summary: 'Execute FIFO matching algorithm' })
  @ApiResponse({ status: 200, description: 'FIFO matching completed successfully' })
  async executeFIFOMatching(@Body() body: {
    buyOrders: any[];
    sellOrders: any[];
    preferences?: MatchingPreferencesDto;
  }) {
    const startTime = process.hrtime.bigint();
    const result = await this.fifoAlgorithm.findMatches(
      body.buyOrders,
      body.sellOrders,
      [],
      body.preferences || this.matchingService.getDefaultPreferences(),
    );
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // microseconds

    // Record analytics
    this.analyticsService.recordMatching(
      result.totalOrdersProcessed,
      result.matches.length,
      processingTime,
      'FIFO',
      result.matches,
    );

    return {
      success: true,
      data: {
        matches: result.matches,
        rejectedOrders: result.rejectedOrders,
        processingTimeUs: processingTime,
        totalOrdersProcessed: result.totalOrdersProcessed,
        matchRate: result.matchRate,
        algorithm: 'FIFO',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('match/pro-rata')
  @ApiOperation({ summary: 'Execute Pro-Rata matching algorithm' })
  @ApiResponse({ status: 200, description: 'Pro-Rata matching completed successfully' })
  async executeProRataMatching(@Body() body: {
    buyOrders: any[];
    sellOrders: any[];
    preferences?: MatchingPreferencesDto;
  }) {
    const startTime = process.hrtime.bigint();
    const result = await this.proRataAlgorithm.findMatches(
      body.buyOrders,
      body.sellOrders,
      [],
      body.preferences || this.matchingService.getDefaultPreferences(),
    );
    const endTime = process.hrtime.bigint();
    const processingTime = Number(endTime - startTime) / 1000; // microseconds

    // Record analytics
    this.analyticsService.recordMatching(
      result.totalOrdersProcessed,
      result.matches.length,
      processingTime,
      'PRO_RATA',
      result.matches,
    );

    return {
      success: true,
      data: {
        matches: result.matches,
        rejectedOrders: result.rejectedOrders,
        processingTimeUs: processingTime,
        totalOrdersProcessed: result.totalOrdersProcessed,
        matchRate: result.matchRate,
        allocationDetails: result.allocationDetails,
        algorithm: 'PRO_RATA',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('optimize-liquidity')
  @ApiOperation({ summary: 'Optimize order liquidity' })
  @ApiResponse({ status: 200, description: 'Liquidity optimization completed successfully' })
  async optimizeLiquidity(@Body() body: {
    buyOrders: any[];
    sellOrders: any[];
    preferences?: MatchingPreferencesDto;
  }) {
    const result = await this.liquidityOptimizer.optimizeLiquidity(
      body.buyOrders,
      body.sellOrders,
      body.preferences || this.matchingService.getDefaultPreferences(),
    );

    return {
      success: true,
      data: {
        optimizedBuyOrders: result.optimizedBuyOrders,
        optimizedSellOrders: result.optimizedSellOrders,
        liquidityPools: result.liquidityPools,
        aggregatedOrders: result.aggregatedOrders,
        fillRateImprovement: result.fillRateImprovement,
        liquidityScore: result.liquidityScore,
        processingTimeUs: result.processingTime,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('queue/enqueue')
  @ApiOperation({ summary: 'Enqueue order to priority queue' })
  @ApiResponse({ status: 200, description: 'Order enqueued successfully' })
  async enqueueOrder(@Body() body: {
    order: any;
    priority?: number;
  }) {
    const success = this.priorityQueue.enqueue(body.order, body.priority || 0);

    if (!success) {
      return {
        success: false,
        error: 'Queue at maximum capacity',
        timestamp: new Date().toISOString(),
      };
    }

    // Record analytics
    this.analyticsService.recordOrder(body.order);

    return {
      success: true,
      data: {
        orderId: body.order.id,
        priority: body.priority || 0,
        queueDepth: this.priorityQueue.getCurrentDepth(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('queue/dequeue')
  @ApiOperation({ summary: 'Dequeue highest priority order' })
  @ApiResponse({ status: 200, description: 'Order dequeued successfully' })
  async dequeueOrder(@Body() body: {
    type?: 'buy' | 'sell';
  }) {
    const order = this.priorityQueue.dequeue(body.type);

    if (!order) {
      return {
        success: false,
        error: 'Queue is empty',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: {
        order,
        queueDepth: this.priorityQueue.getCurrentDepth(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('queue/dequeue-batch')
  @ApiOperation({ summary: 'Dequeue multiple orders' })
  @ApiResponse({ status: 200, description: 'Orders dequeued successfully' })
  async dequeueBatch(@Body() body: {
    count: number;
    type?: 'buy' | 'sell';
  }) {
    const orders = this.priorityQueue.dequeueBatch(body.count, body.type);

    return {
      success: true,
      data: {
        orders,
        count: orders.length,
        queueDepth: this.priorityQueue.getCurrentDepth(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queue/metrics')
  @ApiOperation({ summary: 'Get queue metrics' })
  @ApiResponse({ status: 200, description: 'Queue metrics retrieved successfully' })
  getQueueMetrics() {
    const metrics = this.priorityQueue.getMetrics();

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queue/statistics')
  @ApiOperation({ summary: 'Get queue statistics' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  getQueueStatistics() {
    const statistics = this.priorityQueue.getStatistics();

    return {
      success: true,
      data: statistics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queue/peek')
  @ApiOperation({ summary: 'Peek at highest priority order' })
  @ApiResponse({ status: 200, description: 'Peek result retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, enum: ['buy', 'sell'] })
  peekQueue(@Query('type') type?: 'buy' | 'sell') {
    const order = this.priorityQueue.peek(type);

    if (!order) {
      return {
        success: false,
        error: 'Queue is empty',
        timestamp: new Date().toISOString(),
      };
    }

    return {
      success: true,
      data: { order },
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('queue/:orderId')
  @ApiOperation({ summary: 'Remove order from queue' })
  @ApiResponse({ status: 200, description: 'Order removed successfully' })
  @ApiParam({ name: 'orderId', description: 'Order ID to remove' })
  removeFromQueue(@Param('orderId') orderId: string) {
    const success = this.priorityQueue.remove(orderId);

    return {
      success,
      data: {
        orderId,
        queueDepth: this.priorityQueue.getCurrentDepth(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('analytics/current')
  @ApiOperation({ summary: 'Get current real-time metrics' })
  @ApiResponse({ status: 200, description: 'Current metrics retrieved successfully' })
  getCurrentMetrics() {
    const metrics = this.analyticsService.getCurrentMetrics();

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('analytics/efficiency')
  @ApiOperation({ summary: 'Get matching efficiency metrics' })
  @ApiResponse({ status: 200, description: 'Efficiency metrics retrieved successfully' })
  getEfficiencyMetrics() {
    const efficiency = this.analyticsService.getEfficiencyMetrics();

    return {
      success: true,
      data: efficiency,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('analytics/report')
  @ApiOperation({ summary: 'Generate analytics report for time period' })
  @ApiResponse({ status: 200, description: 'Report generated successfully' })
  @ApiQuery({ name: 'startTime', description: 'Start timestamp in milliseconds' })
  @ApiQuery({ name: 'endTime', description: 'End timestamp in milliseconds' })
  generateReport(
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
  ) {
    const report = this.analyticsService.generateReport(
      parseInt(startTime),
      parseInt(endTime),
    );

    return {
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('analytics/snapshot')
  @ApiOperation({ summary: 'Take performance snapshot' })
  @ApiResponse({ status: 200, description: 'Snapshot taken successfully' })
  takePerformanceSnapshot() {
    const snapshot = this.analyticsService.takePerformanceSnapshot();

    return {
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete('analytics/reset')
  @ApiOperation({ summary: 'Reset analytics counters and history' })
  @ApiResponse({ status: 200, description: 'Analytics reset successfully' })
  resetAnalytics() {
    this.analyticsService.reset();

    return {
      success: true,
      message: 'Analytics reset successfully',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('match/force')
  @ApiOperation({ summary: 'Force immediate matching of pending orders' })
  @ApiResponse({ status: 200, description: 'Matching completed successfully' })
  async forceMatching(@Body() body: {
    preferences?: MatchingPreferencesDto;
  }) {
    const matches = await this.matchingService.forceMatching(body.preferences);

    return {
      success: true,
      data: {
        matches,
        count: matches.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get overall matching metrics' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics() {
    const metrics = await this.matchingService.getMetrics();

    return {
      success: true,
      data: metrics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('matches/order/:orderId')
  @ApiOperation({ summary: 'Get matches for a specific order' })
  @ApiResponse({ status: 200, description: 'Matches retrieved successfully' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  async getMatchesByOrder(@Param('orderId') orderId: string) {
    const matches = await this.matchingService.getMatchesByOrder(orderId);

    return {
      success: true,
      data: {
        orderId,
        matches,
        count: matches.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('matches/active')
  @ApiOperation({ summary: 'Get all active matches' })
  @ApiResponse({ status: 200, description: 'Active matches retrieved successfully' })
  async getActiveMatches() {
    const matches = await this.matchingService.getActiveMatches();

    return {
      success: true,
      data: {
        matches,
        count: matches.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Put('matches/:matchId/confirm')
  @ApiOperation({ summary: 'Confirm a match' })
  @ApiResponse({ status: 200, description: 'Match confirmed successfully' })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  async confirmMatch(
    @Param('matchId') matchId: string,
    @Body() body: { userId: string },
  ) {
    const match = await this.matchingService.confirmMatch(matchId, body.userId);

    return {
      success: true,
      data: match,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('matches/:matchId/reject')
  @ApiOperation({ summary: 'Reject a match' })
  @ApiResponse({ status: 200, description: 'Match rejected successfully' })
  @ApiParam({ name: 'matchId', description: 'Match ID' })
  async rejectMatch(
    @Param('matchId') matchId: string,
    @Body() body: { userId: string; reason?: string },
  ) {
    const match = await this.matchingService.rejectMatch(
      matchId,
      body.userId,
      body.reason,
    );

    return {
      success: true,
      data: match,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('algorithms/statistics')
  @ApiOperation({ summary: 'Get statistics for all matching algorithms' })
  @ApiResponse({ status: 200, description: 'Algorithm statistics retrieved successfully' })
  getAlgorithmStatistics() {
    return {
      success: true,
      data: {
        fifo: this.fifoAlgorithm.getStatistics(),
        proRata: this.proRataAlgorithm.getStatistics(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liquidity/analyze')
  @ApiOperation({ summary: 'Analyze liquidity depth' })
  @ApiResponse({ status: 200, description: 'Liquidity analysis retrieved successfully' })
  @ApiQuery({ name: 'energyType', description: 'Energy type' })
  @ApiQuery({ name: 'location', description: 'Location' })
  analyzeLiquidity(
    @Query('energyType') energyType: string,
    @Query('location') location: string,
  ) {
    const analysis = this.liquidityOptimizer.analyzeLiquidityDepth(
      energyType,
      location,
    );

    return {
      success: true,
      data: analysis,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('liquidity/pools')
  @ApiOperation({ summary: 'Get all cached liquidity pools' })
  @ApiResponse({ status: 200, description: 'Liquidity pools retrieved successfully' })
  getLiquidityPools() {
    const pools = this.liquidityOptimizer.getAllLiquidityPools();

    return {
      success: true,
      data: {
        pools,
        count: pools.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('service-info')
  @ApiOperation({ summary: 'Get service information and capabilities' })
  @ApiResponse({ status: 200, description: 'Service information retrieved successfully' })
  getServiceInfo() {
    return {
      success: true,
      data: {
        fifo: this.fifoAlgorithm.getStatistics(),
        proRata: this.proRataAlgorithm.getStatistics(),
        liquidity: this.liquidityOptimizer.getStatistics(),
        queue: this.priorityQueue.getServiceInfo(),
        analytics: this.analyticsService.getStatistics(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('queue/detect-manipulation/:userId')
  @ApiOperation({ summary: 'Detect potential manipulation by user' })
  @ApiResponse({ status: 200, description: 'Manipulation detection completed' })
  @ApiParam({ name: 'userId', description: 'User ID to check' })
  detectManipulation(@Param('userId') userId: string) {
    const detection = this.priorityQueue.detectManipulation(userId);

    return {
      success: true,
      data: detection,
      timestamp: new Date().toISOString(),
    };
  }
}

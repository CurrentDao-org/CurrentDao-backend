import { Injectable, Logger } from '@nestjs/common';
import { Match, MatchStatus, MatchType } from '../entities/match.entity';

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

export interface MatchingMetrics {
  timestamp: number;
  totalOrdersProcessed: number;
  totalMatchesCreated: number;
  matchRate: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  fillRate: number;
  liquidityScore: number;
  algorithmPerformance: Record<string, AlgorithmMetrics>;
}

export interface AlgorithmMetrics {
  name: string;
  matchesCreated: number;
  averageProcessingTime: number;
  successRate: number;
  averageScore: number;
}

export interface PerformanceSnapshot {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  queueDepth: number;
  activeConnections: number;
  errorRate: number;
}

export interface AnalyticsReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalOrders: number;
    totalMatches: number;
    overallMatchRate: number;
    averageLatency: number;
    peakThroughput: number;
  };
  byAlgorithm: Record<string, AlgorithmMetrics>;
  byEnergyType: Record<string, EnergyTypeMetrics>;
  byLocation: Record<string, LocationMetrics>;
  performanceTrends: PerformanceSnapshot[];
  alerts: Alert[];
}

export interface EnergyTypeMetrics {
  energyType: string;
  totalOrders: number;
  totalMatches: number;
  matchRate: number;
  averagePrice: number;
  priceVolatility: number;
}

export interface LocationMetrics {
  location: string;
  totalOrders: number;
  totalMatches: number;
  matchRate: number;
  averageDistance: number;
}

export interface Alert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
  metric: string;
  value: number;
  threshold: number;
}

@Injectable()
export class MatchingAnalyticsService {
  private readonly logger = new Logger(MatchingAnalyticsService.name);
  private readonly TARGET_LATENCY_US = 100; // 100 microseconds
  private readonly TARGET_THROUGHPUT = 100000; // 100,000 orders/second
  private readonly TARGET_FILL_RATE = 0.7; // 70% fill rate

  private metricsHistory: MatchingMetrics[] = [];
  private performanceSnapshots: PerformanceSnapshot[] = [];
  private latencyHistory: number[] = [];
  private matchHistory: Match[] = [];
  private orderHistory: Order[] = [];

  private readonly MAX_HISTORY_SIZE = 10000;
  private readonly SNAPSHOT_INTERVAL = 1000; // 1 second

  // Real-time counters
  private counters = {
    ordersProcessed: 0,
    matchesCreated: 0,
    totalLatency: 0,
    errors: 0,
  };

  // Algorithm-specific tracking
  private algorithmMetrics = new Map<string, {
    matches: number;
    totalTime: number;
    totalScore: number;
    attempts: number;
  }>();

  /**
   * Record a matching operation
   */
  recordMatching(
    ordersProcessed: number,
    matchesCreated: number,
    processingTimeUs: number,
    algorithm: string,
    matches: Match[],
  ): void {
    this.counters.ordersProcessed += ordersProcessed;
    this.counters.matchesCreated += matchesCreated;
    this.counters.totalLatency += processingTimeUs;
    this.latencyHistory.push(processingTimeUs);

    // Track algorithm performance
    if (!this.algorithmMetrics.has(algorithm)) {
      this.algorithmMetrics.set(algorithm, {
        matches: 0,
        totalTime: 0,
        totalScore: 0,
        attempts: 0,
      });
    }

    const algMetrics = this.algorithmMetrics.get(algorithm)!;
    algMetrics.matches += matchesCreated;
    algMetrics.totalTime += processingTimeUs;
    algMetrics.attempts++;
    algMetrics.totalScore += matches.reduce((sum, m) => sum + (m.matchingScore || 0), 0);

    // Store match history
    this.matchHistory.push(...matches);

    // Trim history if needed
    if (this.matchHistory.length > this.MAX_HISTORY_SIZE) {
      this.matchHistory = this.matchHistory.slice(-this.MAX_HISTORY_SIZE);
    }
    if (this.latencyHistory.length > this.MAX_HISTORY_SIZE) {
      this.latencyHistory = this.latencyHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Record order submission
   */
  recordOrder(order: Order): void {
    this.orderHistory.push(order);

    if (this.orderHistory.length > this.MAX_HISTORY_SIZE) {
      this.orderHistory = this.orderHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.counters.errors++;
  }

  /**
   * Get current real-time metrics
   */
  getCurrentMetrics(): MatchingMetrics {
    const now = Date.now();
    const elapsedTime = (now - (this.performanceSnapshots[0]?.timestamp || now)) / 1000;
    const throughput = elapsedTime > 0 ? this.counters.ordersProcessed / elapsedTime : 0;
    const averageLatency = this.counters.ordersProcessed > 0
      ? this.counters.totalLatency / this.counters.ordersProcessed
      : 0;

    const sortedLatencies = [...this.latencyHistory].sort((a, b) => a - b);
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;

    const matchRate = this.counters.ordersProcessed > 0
      ? this.counters.matchesCreated / this.counters.ordersProcessed
      : 0;

    const fillRate = this.calculateFillRate();

    const algorithmPerformance: Record<string, AlgorithmMetrics> = {};
    for (const [name, metrics] of this.algorithmMetrics) {
      algorithmPerformance[name] = {
        name,
        matchesCreated: metrics.matches,
        averageProcessingTime: metrics.attempts > 0 ? metrics.totalTime / metrics.attempts : 0,
        successRate: metrics.attempts > 0 ? metrics.matches / metrics.attempts : 0,
        averageScore: metrics.matches > 0 ? metrics.totalScore / metrics.matches : 0,
      };
    }

    const currentMetrics: MatchingMetrics = {
      timestamp: now,
      totalOrdersProcessed: this.counters.ordersProcessed,
      totalMatchesCreated: this.counters.matchesCreated,
      matchRate,
      averageLatency,
      p95Latency,
      p99Latency,
      throughput,
      fillRate,
      liquidityScore: this.calculateLiquidityScore(),
      algorithmPerformance,
    };

    this.metricsHistory.push(currentMetrics);
    if (this.metricsHistory.length > this.MAX_HISTORY_SIZE) {
      this.metricsHistory = this.metricsHistory.slice(-this.MAX_HISTORY_SIZE);
    }

    return currentMetrics;
  }

  /**
   * Calculate fill rate
   */
  private calculateFillRate(): number {
    if (this.orderHistory.length === 0) {
      return 0;
    }

    const matchedOrderIds = new Set(
      this.matchHistory.flatMap(m => [m.buyerOrderId, m.sellerOrderId])
    );

    let matchedQuantity = 0;
    let totalQuantity = 0;

    for (const order of this.orderHistory) {
      totalQuantity += order.quantity;
      if (matchedOrderIds.has(order.id)) {
        matchedQuantity += order.quantity;
      }
    }

    return totalQuantity > 0 ? matchedQuantity / totalQuantity : 0;
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(): number {
    if (this.orderHistory.length === 0) {
      return 0;
    }

    const recentOrders = this.orderHistory.filter(
      o => Date.now() - o.createdAt.getTime() < 60000 // Last minute
    );

    if (recentOrders.length === 0) {
      return 0;
    }

    const buyOrders = recentOrders.filter(o => o.type === 'buy');
    const sellOrders = recentOrders.filter(o => o.type === 'sell');

    const totalBuyQuantity = buyOrders.reduce((sum, o) => sum + o.quantity, 0);
    const totalSellQuantity = sellOrders.reduce((sum, o) => sum + o.quantity, 0);

    const quantityBalance = 1 - Math.abs(totalBuyQuantity - totalSellQuantity) / 
                           (totalBuyQuantity + totalSellQuantity + 1);

    const depthScore = Math.min(recentOrders.length / 1000, 1);

    return (quantityBalance * 0.6 + depthScore * 0.4);
  }

  /**
   * Take a performance snapshot
   */
  takePerformanceSnapshot(): PerformanceSnapshot {
    const snapshot: PerformanceSnapshot = {
      timestamp: Date.now(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
      queueDepth: this.orderHistory.length,
      activeConnections: 0, // Would be populated from connection pool
      errorRate: this.counters.ordersProcessed > 0 
        ? this.counters.errors / this.counters.ordersProcessed 
        : 0,
    };

    this.performanceSnapshots.push(snapshot);
    if (this.performanceSnapshots.length > this.MAX_HISTORY_SIZE) {
      this.performanceSnapshots = this.performanceSnapshots.slice(-this.MAX_HISTORY_SIZE);
    }

    return snapshot;
  }

  /**
   * Generate analytics report for a time period
   */
  generateReport(startTime: number, endTime: number): AnalyticsReport {
    const periodMetrics = this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );

    const periodMatches = this.matchHistory.filter(
      m => m.createdAt.getTime() >= startTime && m.createdAt.getTime() <= endTime
    );

    const periodOrders = this.orderHistory.filter(
      o => o.createdAt.getTime() >= startTime && o.createdAt.getTime() <= endTime
    );

    const totalOrders = periodOrders.length;
    const totalMatches = periodMatches.length;
    const overallMatchRate = totalOrders > 0 ? totalMatches / totalOrders : 0;

    const averageLatency = periodMetrics.length > 0
      ? periodMetrics.reduce((sum, m) => sum + m.averageLatency, 0) / periodMetrics.length
      : 0;

    const peakThroughput = periodMetrics.length > 0
      ? Math.max(...periodMetrics.map(m => m.throughput))
      : 0;

    // Aggregate by algorithm
    const byAlgorithm: Record<string, AlgorithmMetrics> = {};
    for (const metrics of periodMetrics) {
      for (const [name, algMetrics] of Object.entries(metrics.algorithmPerformance)) {
        if (!byAlgorithm[name]) {
          byAlgorithm[name] = { ...algMetrics };
        } else {
          byAlgorithm[name].matchesCreated += algMetrics.matchesCreated;
        }
      }
    }

    // Aggregate by energy type
    const byEnergyType: Record<string, EnergyTypeMetrics> = {};
    for (const order of periodOrders) {
      if (!byEnergyType[order.energyType]) {
        byEnergyType[order.energyType] = {
          energyType: order.energyType,
          totalOrders: 0,
          totalMatches: 0,
          matchRate: 0,
          averagePrice: 0,
          priceVolatility: 0,
        };
      }
      byEnergyType[order.energyType].totalOrders++;
    }

    for (const match of periodMatches) {
      const energyType = match.metadata?.energyType || 'unknown';
      if (byEnergyType[energyType]) {
        byEnergyType[energyType].totalMatches++;
      }
    }

    for (const type of Object.keys(byEnergyType)) {
      const metrics = byEnergyType[type];
      metrics.matchRate = metrics.totalOrders > 0 ? metrics.totalMatches / metrics.totalOrders : 0;
    }

    // Aggregate by location
    const byLocation: Record<string, LocationMetrics> = {};
    for (const order of periodOrders) {
      if (!byLocation[order.location]) {
        byLocation[order.location] = {
          location: order.location,
          totalOrders: 0,
          totalMatches: 0,
          matchRate: 0,
          averageDistance: 0,
        };
      }
      byLocation[order.location].totalOrders++;
    }

    for (const match of periodMatches) {
      const location = match.metadata?.location || 'unknown';
      if (byLocation[location]) {
        byLocation[location].totalMatches++;
        byLocation[location].averageDistance += match.distance || 0;
      }
    }

    for (const loc of Object.keys(byLocation)) {
      const metrics = byLocation[loc];
      metrics.matchRate = metrics.totalOrders > 0 ? metrics.totalMatches / metrics.totalOrders : 0;
      metrics.averageDistance = metrics.totalMatches > 0 
        ? metrics.averageDistance / metrics.totalMatches 
        : 0;
    }

    // Performance trends
    const performanceTrends = this.performanceSnapshots.filter(
      s => s.timestamp >= startTime && s.timestamp <= endTime
    );

    // Generate alerts
    const alerts = this.generateAlerts();

    return {
      period: {
        start: startTime,
        end: endTime,
      },
      summary: {
        totalOrders,
        totalMatches,
        overallMatchRate,
        averageLatency,
        peakThroughput,
      },
      byAlgorithm,
      byEnergyType,
      byLocation,
      performanceTrends,
      alerts,
    };
  }

  /**
   * Generate alerts based on metrics
   */
  private generateAlerts(): Alert[] {
    const alerts: Alert[] = [];
    const currentMetrics = this.getCurrentMetrics();

    // Latency alert
    if (currentMetrics.p95Latency > this.TARGET_LATENCY_US) {
      alerts.push({
        type: 'warning',
        message: `P95 latency exceeds target: ${currentMetrics.p95Latency.toFixed(2)}μs > ${this.TARGET_LATENCY_US}μs`,
        timestamp: Date.now(),
        metric: 'p95Latency',
        value: currentMetrics.p95Latency,
        threshold: this.TARGET_LATENCY_US,
      });
    }

    // Throughput alert
    if (currentMetrics.throughput < this.TARGET_THROUGHPUT * 0.5) {
      alerts.push({
        type: 'warning',
        message: `Throughput below target: ${currentMetrics.throughput.toFixed(0)} orders/s < ${this.TARGET_THROUGHPUT} orders/s`,
        timestamp: Date.now(),
        metric: 'throughput',
        value: currentMetrics.throughput,
        threshold: this.TARGET_THROUGHPUT,
      });
    }

    // Fill rate alert
    if (currentMetrics.fillRate < this.TARGET_FILL_RATE) {
      alerts.push({
        type: 'warning',
        message: `Fill rate below target: ${(currentMetrics.fillRate * 100).toFixed(2)}% < ${(this.TARGET_FILL_RATE * 100).toFixed(0)}%`,
        timestamp: Date.now(),
        metric: 'fillRate',
        value: currentMetrics.fillRate,
        threshold: this.TARGET_FILL_RATE,
      });
    }

    // Error rate alert
    const errorRate = this.counters.ordersProcessed > 0 
      ? this.counters.errors / this.counters.ordersProcessed 
      : 0;
    if (errorRate > 0.01) { // 1% error rate threshold
      alerts.push({
        type: 'error',
        message: `Error rate exceeds threshold: ${(errorRate * 100).toFixed(2)}% > 1%`,
        timestamp: Date.now(),
        metric: 'errorRate',
        value: errorRate,
        threshold: 0.01,
      });
    }

    return alerts;
  }

  /**
   * Get matching efficiency metrics
   */
  getEfficiencyMetrics(): {
    latencyEfficiency: number;
    throughputEfficiency: number;
    fillRateEfficiency: number;
    overallEfficiency: number;
  } {
    const currentMetrics = this.getCurrentMetrics();

    const latencyEfficiency = Math.min(
      this.TARGET_LATENCY_US / (currentMetrics.p95Latency || 1),
      1
    );

    const throughputEfficiency = Math.min(
      currentMetrics.throughput / this.TARGET_THROUGHPUT,
      1
    );

    const fillRateEfficiency = Math.min(
      currentMetrics.fillRate / this.TARGET_FILL_RATE,
      1
    );

    const overallEfficiency = (latencyEfficiency * 0.4) + 
                              (throughputEfficiency * 0.3) + 
                              (fillRateEfficiency * 0.3);

    return {
      latencyEfficiency,
      throughputEfficiency,
      fillRateEfficiency,
      overallEfficiency,
    };
  }

  /**
   * Reset counters and history
   */
  reset(): void {
    this.counters = {
      ordersProcessed: 0,
      matchesCreated: 0,
      totalLatency: 0,
      errors: 0,
    };
    this.metricsHistory = [];
    this.performanceSnapshots = [];
    this.latencyHistory = [];
    this.matchHistory = [];
    this.orderHistory = [];
    this.algorithmMetrics.clear();

    this.logger.log('Analytics counters and history reset');
  }

  /**
   * Get service statistics
   */
  getStatistics(): {
    targetLatencyUs: number;
    targetThroughput: number;
    targetFillRate: number;
    maxHistorySize: number;
    currentHistorySize: number;
    description: string;
  } {
    return {
      targetLatencyUs: this.TARGET_LATENCY_US,
      targetThroughput: this.TARGET_THROUGHPUT,
      targetFillRate: this.TARGET_FILL_RATE,
      maxHistorySize: this.MAX_HISTORY_SIZE,
      currentHistorySize: this.metricsHistory.length,
      description: 'Matching analytics service for performance monitoring and efficiency tracking',
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Order, OrderType, OrderStatus } from '../entities/order.entity';
import { Trade } from '../entities/trade.entity';
import { MatchingAnalyticsResponseDto } from '../dto/matching.dto';

export interface PerformanceMetrics {
  timestamp: number;
  ordersProcessed: number;
  tradesGenerated: number;
  totalVolume: number;
  averageLatency: number;
  throughput: number;
  fillRate: number;
  priceImpact: number;
  spread: number;
  marketDepth: number;
  volatility: number;
  orderFlow: number;
  matchEfficiency: number;
}

export interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: number;
  resolved: boolean;
  metadata?: Record<string, any>;
}

@Injectable()
export class MatchingAnalyticsService {
  private readonly logger = new Logger(MatchingAnalyticsService.name);
  
  // Performance metrics storage
  private metricsHistory: Map<string, PerformanceMetrics[]> = new Map();
  
  // Alert management
  private alerts: Alert[] = [];
  private alertThresholds = {
    latency: { warning: 50, critical: 100 }, // milliseconds
    fillRate: { warning: 70, critical: 50 }, // percentage
    spread: { warning: 0.5, critical: 1.0 }, // percentage
    throughput: { warning: 1000, critical: 500 }, // orders per second
    volatility: { warning: 2.0, critical: 5.0 }, // percentage
    orderFlow: { warning: 10000, critical: 50000 } // orders per minute
  };

  constructor() {
    this.initializeAnalytics();
  }

  private initializeAnalytics(): void {
    // Start periodic analytics updates
    setInterval(() => {
      this.updateMetrics();
      this.checkAlerts();
      this.cleanupOldData();
    }, 1000); // Update every second
  }

  recordMatchingEvent(
    symbol: string,
    processedOrders: Order[],
    trades: Trade[],
    processingTimeMs: number
  ): void {
    const timestamp = Date.now();
    
    // Calculate metrics
    const metrics: PerformanceMetrics = {
      timestamp,
      ordersProcessed: processedOrders.length,
      tradesGenerated: trades.length,
      totalVolume: trades.reduce((sum, trade) => sum + trade.totalAmount, 0),
      averageLatency: processingTimeMs,
      throughput: processedOrders.length / (processingTimeMs / 1000), // orders per second
      fillRate: this.calculateFillRate(processedOrders, trades),
      priceImpact: this.calculatePriceImpact(trades, processedOrders),
      spread: this.calculateCurrentSpread(processedOrders),
      marketDepth: this.calculateMarketDepth(processedOrders),
      volatility: this.calculateVolatility(trades),
      orderFlow: this.calculateOrderFlow(symbol),
      matchEfficiency: this.calculateMatchEfficiency(processedOrders, trades)
    };

    // Store metrics
    const history = this.metricsHistory.get(symbol) || [];
    history.push(metrics);
    
    // Keep only last 10 minutes of data (600 seconds)
    const cutoffTime = timestamp - 600000;
    const filteredHistory = history.filter(m => m.timestamp > cutoffTime);
    
    this.metricsHistory.set(symbol, filteredHistory);

    this.logger.debug(
      `Recorded matching event for ${symbol}: ${processedOrders.length} orders, ` +
      `${trades.length} trades, ${processingTimeMs.toFixed(2)}ms latency`
    );
  }

  getAnalytics(symbol: string, startTime?: number, endTime?: number): MatchingAnalyticsResponseDto {
    const history = this.metricsHistory.get(symbol) || [];
    
    // Filter by time range
    let filteredHistory = history;
    if (startTime || endTime) {
      filteredHistory = history.filter(m => 
        (!startTime || m.timestamp >= startTime) &&
        (!endTime || m.timestamp <= endTime)
      );
    }

    if (filteredHistory.length === 0) {
      return this.createEmptyAnalyticsResponse(symbol, startTime, endTime);
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = this.aggregateMetrics(filteredHistory);
    const performanceMetrics = this.calculatePerformanceMetrics(filteredHistory);
    const activeAlerts = this.getActiveAlerts(symbol);

    return {
      symbol,
      period: {
        start: startTime || filteredHistory[0].timestamp,
        end: endTime || filteredHistory[filteredHistory.length - 1].timestamp,
        duration: (endTime || filteredHistory[filteredHistory.length - 1].timestamp) - 
                 (startTime || filteredHistory[0].timestamp)
      },
      metrics: aggregatedMetrics,
      performance: performanceMetrics,
      alerts: activeAlerts
    };
  }

  private calculateFillRate(orders: Order[], trades: Trade[]): number {
    if (orders.length === 0) return 0;
    
    const filledOrders = trades.length * 2; // Each trade fills 2 orders
    return (filledOrders / orders.length) * 100;
  }

  private calculatePriceImpact(trades: Trade[], orders: Order[]): number {
    if (trades.length === 0 || orders.length === 0) return 0;
    
    const avgTradePrice = trades.reduce((sum, trade) => sum + trade.price, 0) / trades.length;
    
    const buyOrders = orders.filter(o => o.type === OrderType.BUY);
    const sellOrders = orders.filter(o => o.type === OrderType.SELL);
    
    const avgBuyPrice = buyOrders.length > 0 
      ? buyOrders.reduce((sum, order) => sum + order.price, 0) / buyOrders.length 
      : 0;
    const avgSellPrice = sellOrders.length > 0 
      ? sellOrders.reduce((sum, order) => sum + order.price, 0) / sellOrders.length 
      : 0;
    
    const expectedPrice = (avgBuyPrice + avgSellPrice) / 2;
    
    return expectedPrice > 0 ? Math.abs(avgTradePrice - expectedPrice) / expectedPrice * 100 : 0;
  }

  private calculateCurrentSpread(orders: Order[]): number {
    const buyOrders = orders.filter(o => o.type === OrderType.BUY && o.status === OrderStatus.PENDING);
    const sellOrders = orders.filter(o => o.type === OrderType.SELL && o.status === OrderStatus.PENDING);
    
    if (buyOrders.length === 0 || sellOrders.length === 0) return 0;
    
    const bestBid = Math.max(...buyOrders.map(o => o.price));
    const bestAsk = Math.min(...sellOrders.map(o => o.price));
    const midPrice = (bestBid + bestAsk) / 2;
    
    return midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;
  }

  private calculateMarketDepth(orders: Order[]): number {
    const pendingOrders = orders.filter(o => o.status === OrderStatus.PENDING);
    return pendingOrders.reduce((sum, order) => sum + order.remainingQuantity, 0);
  }

  private calculateVolatility(trades: Trade[]): number {
    if (trades.length < 2) return 0;
    
    const prices = trades.map(trade => trade.price);
    const returns = [];
    
    for (let i = 1; i < prices.length; i++) {
      const return_ = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns.push(return_);
    }
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
    const standardDeviation = Math.sqrt(variance);
    
    return standardDeviation * 100; // Convert to percentage
  }

  private calculateOrderFlow(symbol: string): number {
    const history = this.metricsHistory.get(symbol) || [];
    if (history.length === 0) return 0;
    
    // Calculate orders per minute over the last minute
    const oneMinuteAgo = Date.now() - 60000;
    const recentMetrics = history.filter(m => m.timestamp > oneMinuteAgo);
    
    return recentMetrics.reduce((sum, m) => sum + m.ordersProcessed, 0);
  }

  private calculateMatchEfficiency(orders: Order[], trades: Trade[]): number {
    if (orders.length === 0) return 0;
    
    const totalOrderVolume = orders.reduce((sum, order) => sum + order.quantity, 0);
    const totalTradeVolume = trades.reduce((sum, trade) => sum + trade.quantity, 0);
    
    return totalOrderVolume > 0 ? (totalTradeVolume / totalOrderVolume) * 100 : 0;
  }

  private aggregateMetrics(history: PerformanceMetrics[]): any {
    const latest = history[history.length - 1];
    
    return {
      fillRate: latest.fillRate,
      averageLatency: latest.averageLatency,
      throughput: latest.throughput,
      priceImpact: latest.priceImpact,
      spread: latest.spread,
      marketDepth: latest.marketDepth,
      volatility: latest.volatility,
      orderFlow: latest.orderFlow,
      matchEfficiency: latest.matchEfficiency
    };
  }

  private calculatePerformanceMetrics(history: PerformanceMetrics[]): any {
    const totalOrders = history.reduce((sum, m) => sum + m.ordersProcessed, 0);
    const totalTrades = history.reduce((sum, m) => sum + m.tradesGenerated, 0);
    const totalVolume = history.reduce((sum, m) => sum + m.totalVolume, 0);
    const avgTradeSize = totalTrades > 0 ? totalVolume / totalTrades : 0;
    
    const latencies = history.map(m => m.averageLatency).sort((a, b) => a - b);
    const throughputs = history.map(m => m.throughput);
    
    return {
      ordersProcessed: totalOrders,
      tradesGenerated: totalTrades,
      totalVolume,
      averageTradeSize: avgTradeSize,
      peakThroughput: Math.max(...throughputs),
      latencyPercentiles: {
        p50: this.getPercentile(latencies, 50),
        p95: this.getPercentile(latencies, 95),
        p99: this.getPercentile(latencies, 99),
        p999: this.getPercentile(latencies, 99.9)
      }
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private getActiveAlerts(symbol: string): Alert[] {
    return this.alerts.filter(alert => 
      !alert.resolved && 
      (alert.metadata?.symbol === symbol || alert.message.includes(symbol))
    );
  }

  private createEmptyAnalyticsResponse(symbol: string, startTime?: number, endTime?: number): MatchingAnalyticsResponseDto {
    return {
      symbol,
      period: {
        start: startTime || Date.now(),
        end: endTime || Date.now(),
        duration: 0
      },
      metrics: {
        fillRate: 0,
        averageLatency: 0,
        throughput: 0,
        priceImpact: 0,
        spread: 0,
        marketDepth: 0,
        volatility: 0,
        orderFlow: 0,
        matchEfficiency: 0
      },
      performance: {
        ordersProcessed: 0,
        tradesGenerated: 0,
        totalVolume: 0,
        averageTradeSize: 0,
        peakThroughput: 0,
        latencyPercentiles: {
          p50: 0,
          p95: 0,
          p99: 0,
          p999: 0
        }
      },
      alerts: []
    };
  }

  private updateMetrics(): void {
    // This method can be extended to update metrics from external sources
    // For now, metrics are updated when matching events are recorded
  }

  private checkAlerts(): void {
    const symbols = [...this.metricsHistory.keys()];
    
    symbols.forEach(symbol => {
      const history = this.metricsHistory.get(symbol) || [];
      if (history.length === 0) return;
      
      const latest = history[history.length - 1];
      
      // Check various thresholds
      this.checkLatencyAlert(symbol, latest.averageLatency);
      this.checkFillRateAlert(symbol, latest.fillRate);
      this.checkSpreadAlert(symbol, latest.spread);
      this.checkThroughputAlert(symbol, latest.throughput);
      this.checkVolatilityAlert(symbol, latest.volatility);
      this.checkOrderFlowAlert(symbol, latest.orderFlow);
    });
  }

  private checkLatencyAlert(symbol: string, latency: number): void {
    const thresholds = this.alertThresholds.latency;
    
    if (latency >= thresholds.critical) {
      this.createAlert('HIGH_LATENCY', 'CRITICAL', 
        `Critical latency detected for ${symbol}: ${latency.toFixed(2)}ms`, 
        { symbol, latency });
    } else if (latency >= thresholds.warning) {
      this.createAlert('HIGH_LATENCY', 'MEDIUM', 
        `High latency detected for ${symbol}: ${latency.toFixed(2)}ms`, 
        { symbol, latency });
    }
  }

  private checkFillRateAlert(symbol: string, fillRate: number): void {
    const thresholds = this.alertThresholds.fillRate;
    
    if (fillRate <= thresholds.critical) {
      this.createAlert('LOW_FILL_RATE', 'CRITICAL', 
        `Critical fill rate for ${symbol}: ${fillRate.toFixed(2)}%`, 
        { symbol, fillRate });
    } else if (fillRate <= thresholds.warning) {
      this.createAlert('LOW_FILL_RATE', 'MEDIUM', 
        `Low fill rate for ${symbol}: ${fillRate.toFixed(2)}%`, 
        { symbol, fillRate });
    }
  }

  private checkSpreadAlert(symbol: string, spread: number): void {
    const thresholds = this.alertThresholds.spread;
    
    if (spread >= thresholds.critical) {
      this.createAlert('WIDE_SPREAD', 'CRITICAL', 
        `Critical spread for ${symbol}: ${spread.toFixed(2)}%`, 
        { symbol, spread });
    } else if (spread >= thresholds.warning) {
      this.createAlert('WIDE_SPREAD', 'MEDIUM', 
        `Wide spread for ${symbol}: ${spread.toFixed(2)}%`, 
        { symbol, spread });
    }
  }

  private checkThroughputAlert(symbol: string, throughput: number): void {
    const thresholds = this.alertThresholds.throughput;
    
    if (throughput <= thresholds.critical) {
      this.createAlert('LOW_THROUGHPUT', 'CRITICAL', 
        `Critical throughput for ${symbol}: ${throughput.toFixed(2)} orders/sec`, 
        { symbol, throughput });
    } else if (throughput <= thresholds.warning) {
      this.createAlert('LOW_THROUGHPUT', 'MEDIUM', 
        `Low throughput for ${symbol}: ${throughput.toFixed(2)} orders/sec`, 
        { symbol, throughput });
    }
  }

  private checkVolatilityAlert(symbol: string, volatility: number): void {
    const thresholds = this.alertThresholds.volatility;
    
    if (volatility >= thresholds.critical) {
      this.createAlert('HIGH_VOLATILITY', 'CRITICAL', 
        `Critical volatility for ${symbol}: ${volatility.toFixed(2)}%`, 
        { symbol, volatility });
    } else if (volatility >= thresholds.warning) {
      this.createAlert('HIGH_VOLATILITY', 'MEDIUM', 
        `High volatility for ${symbol}: ${volatility.toFixed(2)}%`, 
        { symbol, volatility });
    }
  }

  private checkOrderFlowAlert(symbol: string, orderFlow: number): void {
    const thresholds = this.alertThresholds.orderFlow;
    
    if (orderFlow >= thresholds.critical) {
      this.createAlert('HIGH_ORDER_FLOW', 'CRITICAL', 
        `Critical order flow for ${symbol}: ${orderFlow} orders/min`, 
        { symbol, orderFlow });
    } else if (orderFlow >= thresholds.warning) {
      this.createAlert('HIGH_ORDER_FLOW', 'MEDIUM', 
        `High order flow for ${symbol}: ${orderFlow} orders/min`, 
        { symbol, orderFlow });
    }
  }

  private createAlert(type: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', message: string, metadata?: Record<string, any>): void {
    const alert: Alert = {
      id: this.generateAlertId(),
      type,
      severity,
      message,
      timestamp: Date.now(),
      resolved: false,
      metadata
    };
    
    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
    
    this.logger.warn(`Alert created: ${message}`);
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - 3600000; // 1 hour ago
    
    // Clean up old metrics
    this.metricsHistory.forEach((history, symbol) => {
      const filteredHistory = history.filter(m => m.timestamp > cutoffTime);
      this.metricsHistory.set(symbol, filteredHistory);
    });
    
    // Clean up old resolved alerts
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || alert.timestamp > cutoffTime
    );
  }

  getAlerts(symbol?: string, severity?: string): Alert[] {
    let filtered = this.alerts;
    
    if (symbol) {
      filtered = filtered.filter(alert => 
        alert.metadata?.symbol === symbol || alert.message.includes(symbol)
      );
    }
    
    if (severity) {
      filtered = filtered.filter(alert => alert.severity === severity);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.info(`Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  getSystemOverview(): {
    totalSymbols: number;
    totalOrders: number;
    totalTrades: number;
    totalVolume: number;
    averageLatency: number;
    activeAlerts: number;
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  } {
    const symbols = [...this.metricsHistory.keys()];
    let totalOrders = 0;
    let totalTrades = 0;
    let totalVolume = 0;
    let totalLatency = 0;
    let latencyCount = 0;
    
    symbols.forEach(symbol => {
      const history = this.metricsHistory.get(symbol) || [];
      history.forEach(metrics => {
        totalOrders += metrics.ordersProcessed;
        totalTrades += metrics.tradesGenerated;
        totalVolume += metrics.totalVolume;
        totalLatency += metrics.averageLatency;
        latencyCount++;
      });
    });
    
    const averageLatency = latencyCount > 0 ? totalLatency / latencyCount : 0;
    const activeAlerts = this.alerts.filter(alert => !alert.resolved).length;
    
    let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
    
    if (activeAlerts > 10 || averageLatency > 100) {
      systemHealth = 'CRITICAL';
    } else if (activeAlerts > 5 || averageLatency > 50) {
      systemHealth = 'WARNING';
    }
    
    return {
      totalSymbols: symbols.length,
      totalOrders,
      totalTrades,
      totalVolume,
      averageLatency,
      activeAlerts,
      systemHealth
    };
  }
}

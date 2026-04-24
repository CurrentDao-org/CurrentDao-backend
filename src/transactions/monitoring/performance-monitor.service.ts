import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Transaction } from '../entities/transaction.entity';
import { TransactionAuditLog, AuditAction } from '../entities/transaction-audit-log.entity';

export interface PerformanceMetrics {
  totalTransactions: number;
  averageProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  throughput: number; // transactions per second
  errorRate: number;
  successRate: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  overallScore: number;
  metrics: PerformanceMetrics;
  alerts: PerformanceAlert[];
  lastUpdated: Date;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly performanceData: Array<{
    timestamp: Date;
    processingTime: number;
    success: boolean;
    transactionId: string;
  }> = [];
  
  private readonly alerts: PerformanceAlert[] = [];
  private readonly PERFORMANCE_TARGETS = {
    MAX_PROCESSING_TIME: 100, // 100ms target
    MAX_P95_PROCESSING_TIME: 200, // P95 under 200ms
    MAX_P99_PROCESSING_TIME: 500, // P99 under 500ms
    MIN_THROUGHPUT: 100000, // 100k transactions/second
    MAX_ERROR_RATE: 0.1, // 0.1% error rate
    MIN_SUCCESS_RATE: 99.9, // 99.9% success rate
    MAX_MEMORY_USAGE: 80, // 80% memory usage
    MAX_CPU_USAGE: 70, // 70% CPU usage
    MIN_CACHE_HIT_RATE: 95, // 95% cache hit rate
  };

  private readonly ALERT_THRESHOLDS = {
    PROCESSING_TIME_WARNING: 150,
    PROCESSING_TIME_CRITICAL: 300,
    ERROR_RATE_WARNING: 0.5,
    ERROR_RATE_CRITICAL: 1.0,
    THROUGHPUT_WARNING: 80000,
    THROUGHPUT_CRITICAL: 50000,
    MEMORY_WARNING: 70,
    MEMORY_CRITICAL: 85,
    CPU_WARNING: 60,
    CPU_CRITICAL: 80,
  };

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionAuditLog)
    private readonly auditLogRepository: Repository<TransactionAuditLog>,
  ) {}

  recordTransactionMetrics(
    transactionId: string,
    processingTime: number,
    success: boolean
  ): void {
    this.performanceData.push({
      timestamp: new Date(),
      processingTime,
      success,
      transactionId,
    });

    // Keep only last 10,000 records for memory efficiency
    if (this.performanceData.length > 10000) {
      this.performanceData.splice(0, this.performanceData.length - 10000);
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(processingTime, success);

    // Log if processing time exceeds target
    if (processingTime > this.PERFORMANCE_TARGETS.MAX_PROCESSING_TIME) {
      this.logger.warn(
        `Transaction ${transactionId} exceeded 100ms processing target: ${processingTime}ms`
      );
    }
  }

  private checkPerformanceAlerts(processingTime: number, success: boolean): void {
    // Check processing time alerts
    if (processingTime > this.ALERT_THRESHOLDS.PROCESSING_TIME_CRITICAL) {
      this.createAlert(
        'critical',
        'processing_time',
        processingTime,
        this.ALERT_THRESHOLDS.PROCESSING_TIME_CRITICAL,
        `Critical: Processing time ${processingTime}ms exceeds threshold`
      );
    } else if (processingTime > this.ALERT_THRESHOLDS.PROCESSING_TIME_WARNING) {
      this.createAlert(
        'warning',
        'processing_time',
        processingTime,
        this.ALERT_THRESHOLDS.PROCESSING_TIME_WARNING,
        `Warning: Processing time ${processingTime}ms exceeds threshold`
      );
    }

    // Check error rate alerts (calculated from recent data)
    const recentData = this.getRecentData(1000); // Last 1000 transactions
    if (recentData.length >= 100) {
      const errorRate = this.calculateErrorRate(recentData);
      
      if (errorRate > this.ALERT_THRESHOLDS.ERROR_RATE_CRITICAL) {
        this.createAlert(
          'critical',
          'error_rate',
          errorRate,
          this.ALERT_THRESHOLDS.ERROR_RATE_CRITICAL,
          `Critical: Error rate ${errorRate}% exceeds threshold`
        );
      } else if (errorRate > this.ALERT_THRESHOLDS.ERROR_RATE_WARNING) {
        this.createAlert(
          'warning',
          'error_rate',
          errorRate,
          this.ALERT_THRESHOLDS.ERROR_RATE_WARNING,
          `Warning: Error rate ${errorRate}% exceeds threshold`
        );
      }
    }
  }

  private createAlert(
    type: 'warning' | 'critical',
    metric: string,
    currentValue: number,
    threshold: number,
    message: string
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      metric,
      currentValue,
      threshold,
      message,
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(alert);
    
    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000);
    }

    this.logger.warn(`Performance alert created: ${message}`);
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const recentData = this.getRecentData(10000); // Last 10,000 transactions
    
    if (recentData.length === 0) {
      return this.getEmptyMetrics();
    }

    const processingTimes = recentData.map(d => d.processingTime).sort((a, b) => a - b);
    const successCount = recentData.filter(d => d.success).length;
    
    // Calculate percentiles
    const p95Index = Math.floor(processingTimes.length * 0.95);
    const p99Index = Math.floor(processingTimes.length * 0.99);
    
    // Calculate throughput (transactions per second in last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const lastMinuteData = recentData.filter(d => d.timestamp >= oneMinuteAgo);
    const throughput = lastMinuteData.length / 60; // per second

    // Get system metrics
    const systemMetrics = await this.getSystemMetrics();

    return {
      totalTransactions: recentData.length,
      averageProcessingTime: this.calculateAverage(processingTimes),
      p95ProcessingTime: processingTimes[p95Index] || 0,
      p99ProcessingTime: processingTimes[p99Index] || 0,
      throughput,
      errorRate: this.calculateErrorRate(recentData),
      successRate: (successCount / recentData.length) * 100,
      ...systemMetrics,
    };
  }

  private getRecentData(limit: number): Array<{
    timestamp: Date;
    processingTime: number;
    success: boolean;
    transactionId: string;
  }> {
    return this.performanceData.slice(-limit);
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  private calculateErrorRate(data: Array<{ success: boolean }>): number {
    if (data.length === 0) return 0;
    const failures = data.filter(d => !d.success).length;
    return (failures / data.length) * 100;
  }

  private async getSystemMetrics(): Promise<{
    memoryUsage: number;
    cpuUsage: number;
    databaseConnections: number;
    cacheHitRate: number;
  }> {
    // In a real implementation, these would be actual system metrics
    // For now, returning simulated values
    const memoryUsage = Math.random() * 100;
    const cpuUsage = Math.random() * 100;
    const databaseConnections = Math.floor(Math.random() * 100) + 50;
    const cacheHitRate = 90 + Math.random() * 10; // 90-100%

    return {
      memoryUsage,
      cpuUsage,
      databaseConnections,
      cacheHitRate,
    };
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      totalTransactions: 0,
      averageProcessingTime: 0,
      p95ProcessingTime: 0,
      p99ProcessingTime: 0,
      throughput: 0,
      errorRate: 0,
      successRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      databaseConnections: 0,
      cacheHitRate: 0,
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const metrics = await this.getPerformanceMetrics();
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    let overallScore = 100;

    // Calculate overall health score
    if (metrics.averageProcessingTime > this.PERFORMANCE_TARGETS.MAX_PROCESSING_TIME) {
      overallScore -= 20;
      status = 'degraded';
    }

    if (metrics.errorRate > this.PERFORMANCE_TARGETS.MAX_ERROR_RATE) {
      overallScore -= 30;
      status = 'critical';
    }

    if (metrics.successRate < this.PERFORMANCE_TARGETS.MIN_SUCCESS_RATE) {
      overallScore -= 25;
      status = 'critical';
    }

    if (metrics.throughput < this.PERFORMANCE_TARGETS.MIN_THROUGHPUT) {
      overallScore -= 15;
      status = 'degraded';
    }

    if (activeAlerts.some(alert => alert.type === 'critical')) {
      status = 'critical';
      overallScore = Math.min(overallScore, 40);
    } else if (activeAlerts.some(alert => alert.type === 'warning')) {
      status = 'degraded';
      overallScore = Math.min(overallScore, 70);
    }

    return {
      status,
      overallScore,
      metrics,
      alerts: activeAlerts,
      lastUpdated: new Date(),
    };
  }

  async getPerformanceReport(timeRange: 'hour' | 'day' | 'week' | 'month'): Promise<{
    timeRange: string;
    metrics: PerformanceMetrics;
    trends: {
      processingTime: 'improving' | 'stable' | 'degrading';
      throughput: 'increasing' | 'stable' | 'decreasing';
      errorRate: 'decreasing' | 'stable' | 'increasing';
    };
    recommendations: string[];
  }> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get performance data for the time range
    const rangeData = this.performanceData.filter(d => d.timestamp >= startDate);
    const metrics = await this.calculateMetricsForRange(rangeData);
    const trends = this.calculateTrends(rangeData);
    const recommendations = this.generateRecommendations(metrics, trends);

    return {
      timeRange,
      metrics,
      trends,
      recommendations,
    };
  }

  private async calculateMetricsForRange(data: Array<{
    processingTime: number;
    success: boolean;
  }>): Promise<PerformanceMetrics> {
    if (data.length === 0) {
      return this.getEmptyMetrics();
    }

    const processingTimes = data.map(d => d.processingTime).sort((a, b) => a - b);
    const successCount = data.filter(d => d.success).length;
    
    const p95Index = Math.floor(processingTimes.length * 0.95);
    const p99Index = Math.floor(processingTimes.length * 0.99);
    
    const timeSpan = data.length > 0 ? (Date.now() - data[0].timestamp.getTime()) / 1000 : 1;
    const throughput = data.length / timeSpan;

    const systemMetrics = await this.getSystemMetrics();

    return {
      totalTransactions: data.length,
      averageProcessingTime: this.calculateAverage(processingTimes),
      p95ProcessingTime: processingTimes[p95Index] || 0,
      p99ProcessingTime: processingTimes[p99Index] || 0,
      throughput,
      errorRate: this.calculateErrorRate(data as any),
      successRate: (successCount / data.length) * 100,
      ...systemMetrics,
    };
  }

  private calculateTrends(data: Array<{
    processingTime: number;
    success: boolean;
    timestamp: Date;
  }>): {
    processingTime: 'improving' | 'stable' | 'degrading';
    throughput: 'increasing' | 'stable' | 'decreasing';
    errorRate: 'decreasing' | 'stable' | 'increasing';
  } {
    if (data.length < 100) {
      return {
        processingTime: 'stable',
        throughput: 'stable',
        errorRate: 'stable',
      };
    }

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfAvgTime = this.calculateAverage(firstHalf.map(d => d.processingTime));
    const secondHalfAvgTime = this.calculateAverage(secondHalf.map(d => d.processingTime));
    
    const firstHalfErrorRate = this.calculateErrorRate(firstHalf as any);
    const secondHalfErrorRate = this.calculateErrorRate(secondHalf as any);

    const firstHalfThroughput = firstHalf.length / ((firstHalf[firstHalf.length - 1].timestamp.getTime() - firstHalf[0].timestamp.getTime()) / 1000);
    const secondHalfThroughput = secondHalf.length / ((secondHalf[secondHalf.length - 1].timestamp.getTime() - secondHalf[0].timestamp.getTime()) / 1000);

    return {
      processingTime: secondHalfAvgTime < firstHalfAvgTime * 0.95 ? 'improving' : 
                   secondHalfAvgTime > firstHalfAvgTime * 1.05 ? 'degrading' : 'stable',
      throughput: secondHalfThroughput > firstHalfThroughput * 1.05 ? 'increasing' :
                secondHalfThroughput < firstHalfThroughput * 0.95 ? 'decreasing' : 'stable',
      errorRate: secondHalfErrorRate < firstHalfErrorRate * 0.95 ? 'decreasing' :
                secondHalfErrorRate > firstHalfErrorRate * 1.05 ? 'increasing' : 'stable',
    };
  }

  private generateRecommendations(metrics: PerformanceMetrics, trends: any): string[] {
    const recommendations: string[] = [];

    if (metrics.averageProcessingTime > this.PERFORMANCE_TARGETS.MAX_PROCESSING_TIME) {
      recommendations.push('Consider optimizing database queries and adding caching layers');
      recommendations.push('Review and optimize transaction processing logic');
    }

    if (metrics.throughput < this.PERFORMANCE_TARGETS.MIN_THROUGHPUT) {
      recommendations.push('Scale horizontally to increase throughput capacity');
      recommendations.push('Implement connection pooling and optimize resource usage');
    }

    if (metrics.errorRate > this.PERFORMANCE_TARGETS.MAX_ERROR_RATE) {
      recommendations.push('Investigate root causes of transaction failures');
      recommendations.push('Implement better error handling and retry mechanisms');
    }

    if (metrics.cacheHitRate < this.PERFORMANCE_TARGETS.MIN_CACHE_HIT_RATE) {
      recommendations.push('Optimize cache strategy and increase cache size');
      recommendations.push('Review cache invalidation policies');
    }

    if (trends.processingTime === 'degrading') {
      recommendations.push('Monitor system resources and consider scaling up');
    }

    if (trends.errorRate === 'increasing') {
      recommendations.push('Review recent deployments and configuration changes');
    }

    return recommendations;
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert ${alertId} resolved`);
    }
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  // Performance optimization monitoring
  @Cron('*/30 * * * * *') // Every 30 seconds
  async monitorPerformance(): Promise<void> {
    const metrics = await this.getPerformanceMetrics();
    
    // Log performance summary
    this.logger.log(
      `Performance Summary - Avg: ${metrics.averageProcessingTime.toFixed(2)}ms, ` +
      `P95: ${metrics.p95ProcessingTime.toFixed(2)}ms, ` +
      `Throughput: ${metrics.throughput.toFixed(2)} tx/s, ` +
      `Error Rate: ${metrics.errorRate.toFixed(3)}%`
    );

    // Check for critical performance issues
    if (metrics.averageProcessingTime > this.PERFORMANCE_TARGETS.MAX_PROCESSING_TIME * 2) {
      this.logger.error(`Critical performance degradation detected: ${metrics.averageProcessingTime}ms average processing time`);
    }

    if (metrics.errorRate > this.PERFORMANCE_TARGETS.MAX_ERROR_RATE * 2) {
      this.logger.error(`Critical error rate detected: ${metrics.errorRate}%`);
    }
  }

  // Clean up old data periodically
  @Cron('0 */6 * * *') // Every 6 hours
  async cleanupOldData(): Promise<void> {
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // Keep last 24 hours
    
    const beforeCount = this.performanceData.length;
    this.performanceData.splice(0, this.performanceData.findIndex(d => d.timestamp >= cutoffTime));
    const afterCount = this.performanceData.length;
    
    if (beforeCount !== afterCount) {
      this.logger.log(`Cleaned up ${beforeCount - afterCount} old performance records`);
    }
  }
}

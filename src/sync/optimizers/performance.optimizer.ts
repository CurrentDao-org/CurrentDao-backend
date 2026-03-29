import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SyncState } from '../entities/sync-state.entity';

export interface PerformanceMetrics {
  batchProcessingTime: number;
  transactionProcessingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  throughput: number;
  latency: number;
  errorRate: number;
}

export interface OptimizationStrategy {
  batchSize: number;
  parallelism: number;
  cacheSize: number;
  retryAttempts: number;
  timeoutMs: number;
}

export interface PerformanceReport {
  timestamp: Date;
  metrics: PerformanceMetrics;
  strategy: OptimizationStrategy;
  recommendations: string[];
}

@Injectable()
export class PerformanceOptimizer {
  private readonly logger = new Logger(PerformanceOptimizer.name);
  private metricsHistory: PerformanceMetrics[] = [];
  private currentStrategy: OptimizationStrategy;
  private cache = new Map<string, any>();
  private performanceThresholds = {
    maxLatencyMs: 5000,
    minThroughputTps: 100,
    maxMemoryUsageMB: 1024,
    maxCpuUsagePercent: 80,
    maxErrorRatePercent: 5,
  };

  constructor(
    private configService: ConfigService,
    @InjectRepository(SyncState)
    private syncStateRepository: Repository<SyncState>,
  ) {
    this.currentStrategy = this.initializeStrategy();
    this.startPerformanceMonitoring();
  }

  private initializeStrategy(): OptimizationStrategy {
    return {
      batchSize: parseInt(process.env.SYNC_BATCH_SIZE || '100'),
      parallelism: parseInt(process.env.SYNC_PARALLELISM || '4'),
      cacheSize: parseInt(process.env.SYNC_CACHE_SIZE || '1000'),
      retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS || '3'),
      timeoutMs: parseInt(process.env.SYNC_TIMEOUT_MS || '30000'),
    };
  }

  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.optimizeStrategy();
    }, 30000); // Monitor every 30 seconds
  }

  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      batchProcessingTime: this.getAverageBatchProcessingTime(),
      transactionProcessingTime: this.getAverageTransactionProcessingTime(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      throughput: this.getThroughput(),
      latency: this.getLatency(),
      errorRate: this.getErrorRate(),
    };

    this.metricsHistory.push(metrics);
    
    // Keep only last 100 measurements
    if (this.metricsHistory.length > 100) {
      this.metricsHistory.shift();
    }
  }

  private analyzePerformance(): void {
    if (this.metricsHistory.length < 5) return;

    const recentMetrics = this.metricsHistory.slice(-5);
    const avgMetrics = this.calculateAverageMetrics(recentMetrics);

    const issues: string[] = [];

    if (avgMetrics.latency > this.performanceThresholds.maxLatencyMs) {
      issues.push(`High latency: ${avgMetrics.latency}ms > ${this.performanceThresholds.maxLatencyMs}ms`);
    }

    if (avgMetrics.throughput < this.performanceThresholds.minThroughputTps) {
      issues.push(`Low throughput: ${avgMetrics.throughput} TPS < ${this.performanceThresholds.minThroughputTps} TPS`);
    }

    if (avgMetrics.memoryUsage > this.performanceThresholds.maxMemoryUsageMB) {
      issues.push(`High memory usage: ${avgMetrics.memoryUsage}MB > ${this.performanceThresholds.maxMemoryUsageMB}MB`);
    }

    if (avgMetrics.cpuUsage > this.performanceThresholds.maxCpuUsagePercent) {
      issues.push(`High CPU usage: ${avgMetrics.cpuUsage}% > ${this.performanceThresholds.maxCpuUsagePercent}%`);
    }

    if (avgMetrics.errorRate > this.performanceThresholds.maxErrorRatePercent) {
      issues.push(`High error rate: ${avgMetrics.errorRate}% > ${this.performanceThresholds.maxErrorRatePercent}%`);
    }

    if (issues.length > 0) {
      this.logger.warn('Performance issues detected:', issues);
      this.generatePerformanceReport(issues);
    }
  }

  private optimizeStrategy(): void {
    if (this.metricsHistory.length < 10) return;

    const recentMetrics = this.metricsHistory.slice(-10);
    const avgMetrics = this.calculateAverageMetrics(recentMetrics);

    let strategyChanged = false;

    // Optimize batch size based on latency and throughput
    if (avgMetrics.latency > this.performanceThresholds.maxLatencyMs) {
      if (this.currentStrategy.batchSize > 10) {
        this.currentStrategy.batchSize = Math.max(10, Math.floor(this.currentStrategy.batchSize * 0.8));
        strategyChanged = true;
        this.logger.log(`Reduced batch size to ${this.currentStrategy.batchSize} due to high latency`);
      }
    } else if (avgMetrics.throughput < this.performanceThresholds.minThroughputTps) {
      if (this.currentStrategy.batchSize < 500) {
        this.currentStrategy.batchSize = Math.min(500, Math.floor(this.currentStrategy.batchSize * 1.2));
        strategyChanged = true;
        this.logger.log(`Increased batch size to ${this.currentStrategy.batchSize} to improve throughput`);
      }
    }

    // Optimize parallelism based on CPU usage
    if (avgMetrics.cpuUsage > this.performanceThresholds.maxCpuUsagePercent) {
      if (this.currentStrategy.parallelism > 1) {
        this.currentStrategy.parallelism = Math.max(1, this.currentStrategy.parallelism - 1);
        strategyChanged = true;
        this.logger.log(`Reduced parallelism to ${this.currentStrategy.parallelism} due to high CPU usage`);
      }
    } else if (avgMetrics.cpuUsage < 50 && avgMetrics.throughput < this.performanceThresholds.minThroughputTps) {
      if (this.currentStrategy.parallelism < 8) {
        this.currentStrategy.parallelism = Math.min(8, this.currentStrategy.parallelism + 1);
        strategyChanged = true;
        this.logger.log(`Increased parallelism to ${this.currentStrategy.parallelism} to improve throughput`);
      }
    }

    // Optimize cache size based on memory usage
    if (avgMetrics.memoryUsage > this.performanceThresholds.maxMemoryUsageMB) {
      if (this.currentStrategy.cacheSize > 100) {
        this.currentStrategy.cacheSize = Math.max(100, Math.floor(this.currentStrategy.cacheSize * 0.8));
        this.trimCache();
        strategyChanged = true;
        this.logger.log(`Reduced cache size to ${this.currentStrategy.cacheSize} due to high memory usage`);
      }
    } else if (avgMetrics.memoryUsage < 512 && this.currentStrategy.cacheSize < 5000) {
      this.currentStrategy.cacheSize = Math.min(5000, Math.floor(this.currentStrategy.cacheSize * 1.2));
      strategyChanged = true;
      this.logger.log(`Increased cache size to ${this.currentStrategy.cacheSize} to improve performance`);
    }

    if (strategyChanged) {
      this.logger.log('Performance strategy optimized', this.currentStrategy);
    }
  }

  calculateOptimalBatchSize(ledgerCount: number): number {
    const baseBatchSize = this.currentStrategy.batchSize;
    
    // Adjust based on ledger count
    if (ledgerCount < 50) {
      return Math.min(ledgerCount, baseBatchSize);
    } else if (ledgerCount > 1000) {
      return Math.min(baseBatchSize * 2, 500);
    }
    
    return baseBatchSize;
  }

  async optimizeBatchProcessing(transactions: any[]): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      // Apply caching
      const cachedTransactions = await this.applyCaching(transactions);
      
      // Apply parallel processing
      const processedTransactions = await this.processInParallel(cachedTransactions);
      
      // Apply deduplication
      const deduplicatedTransactions = this.deduplicateTransactions(processedTransactions);
      
      const processingTime = Date.now() - startTime;
      this.updateBatchProcessingMetrics(processingTime, transactions.length);
      
      return deduplicatedTransactions;
    } catch (error) {
      this.logger.error('Error in batch processing optimization', error);
      throw error;
    }
  }

  private async applyCaching(transactions: any[]): Promise<any[]> {
    const uncachedTransactions = [];
    const cachedResults = [];

    for (const tx of transactions) {
      const cacheKey = this.generateCacheKey(tx);
      
      if (this.cache.has(cacheKey)) {
        cachedResults.push(this.cache.get(cacheKey));
      } else {
        uncachedTransactions.push(tx);
      }
    }

    // Process uncached transactions
    const processedUncached = await this.processTransactions(uncachedTransactions);
    
    // Cache results
    for (let i = 0; i < uncachedTransactions.length; i++) {
      const tx = uncachedTransactions[i];
      const result = processedUncached[i];
      const cacheKey = this.generateCacheKey(tx);
      
      this.cache.set(cacheKey, result);
    }

    return [...cachedResults, ...processedUncached];
  }

  private async processInParallel(transactions: any[]): Promise<any[]> {
    const chunkSize = Math.ceil(transactions.length / this.currentStrategy.parallelism);
    const chunks = [];
    
    for (let i = 0; i < transactions.length; i += chunkSize) {
      chunks.push(transactions.slice(i, i + chunkSize));
    }

    const promises = chunks.map(chunk => this.processTransactions(chunk));
    const results = await Promise.all(promises);
    
    return results.flat();
  }

  private async processTransactions(transactions: any[]): Promise<any[]> {
    // Placeholder for actual transaction processing
    return transactions.map(tx => ({
      ...tx,
      processed: true,
      timestamp: new Date(),
    }));
  }

  private deduplicateTransactions(transactions: any[]): any[] {
    const seen = new Set();
    return transactions.filter(tx => {
      const key = tx.id || tx.hash;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private generateCacheKey(transaction: any): string {
    return `${transaction.type}_${transaction.id}_${transaction.hash || ''}`;
  }

  private trimCache(): void {
    if (this.cache.size <= this.currentStrategy.cacheSize) {
      return;
    }

    // Remove oldest entries (simple LRU)
    const entries = Array.from(this.cache.entries());
    const toRemove = entries.slice(0, entries.length - this.currentStrategy.cacheSize);
    
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  private updateBatchProcessingMetrics(processingTime: number, transactionCount: number): void {
    // Update metrics for performance tracking
    const metrics: PerformanceMetrics = {
      batchProcessingTime: processingTime,
      transactionProcessingTime: processingTime / transactionCount,
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      throughput: (transactionCount * 1000) / processingTime,
      latency: processingTime / transactionCount,
      errorRate: this.getErrorRate(),
    };

    this.metricsHistory.push(metrics);
  }

  private calculateAverageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const sum = metrics.reduce((acc, metric) => ({
      batchProcessingTime: acc.batchProcessingTime + metric.batchProcessingTime,
      transactionProcessingTime: acc.transactionProcessingTime + metric.transactionProcessingTime,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      cpuUsage: acc.cpuUsage + metric.cpuUsage,
      throughput: acc.throughput + metric.throughput,
      latency: acc.latency + metric.latency,
      errorRate: acc.errorRate + metric.errorRate,
    }), {
      batchProcessingTime: 0,
      transactionProcessingTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      throughput: 0,
      latency: 0,
      errorRate: 0,
    });

    const count = metrics.length;
    return {
      batchProcessingTime: sum.batchProcessingTime / count,
      transactionProcessingTime: sum.transactionProcessingTime / count,
      memoryUsage: sum.memoryUsage / count,
      cpuUsage: sum.cpuUsage / count,
      throughput: sum.throughput / count,
      latency: sum.latency / count,
      errorRate: sum.errorRate / count,
    };
  }

  private generatePerformanceReport(issues: string[]): void {
    const report: PerformanceReport = {
      timestamp: new Date(),
      metrics: this.metricsHistory[this.metricsHistory.length - 1],
      strategy: this.currentStrategy,
      recommendations: this.generateRecommendations(issues),
    };

    this.logger.warn('Performance Report Generated', report);
  }

  private generateRecommendations(issues: string[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(issue => issue.includes('latency'))) {
      recommendations.push('Consider reducing batch size or increasing parallelism');
    }

    if (issues.some(issue => issue.includes('throughput'))) {
      recommendations.push('Consider increasing batch size or parallelism');
    }

    if (issues.some(issue => issue.includes('memory'))) {
      recommendations.push('Consider reducing cache size or implementing memory-efficient algorithms');
    }

    if (issues.some(issue => issue.includes('CPU'))) {
      recommendations.push('Consider reducing parallelism or optimizing CPU-intensive operations');
    }

    if (issues.some(issue => issue.includes('error rate'))) {
      recommendations.push('Review error handling and increase retry attempts');
    }

    return recommendations;
  }

  // Helper methods for metrics collection
  private getAverageBatchProcessingTime(): number {
    if (this.metricsHistory.length === 0) return 0;
    const recent = this.metricsHistory.slice(-10);
    return recent.reduce((sum, m) => sum + m.batchProcessingTime, 0) / recent.length;
  }

  private getAverageTransactionProcessingTime(): number {
    if (this.metricsHistory.length === 0) return 0;
    const recent = this.metricsHistory.slice(-10);
    return recent.reduce((sum, m) => sum + m.transactionProcessingTime, 0) / recent.length;
  }

  private getMemoryUsage(): number {
    const usage = process.memoryUsage();
    return usage.heapUsed / 1024 / 1024; // Convert to MB
  }

  private getCpuUsage(): number {
    // Simplified CPU usage calculation
    const usage = process.cpuUsage();
    return (usage.user + usage.system) / 1000000; // Convert to percentage (simplified)
  }

  private getThroughput(): number {
    if (this.metricsHistory.length === 0) return 0;
    const recent = this.metricsHistory.slice(-5);
    return recent.reduce((sum, m) => sum + m.throughput, 0) / recent.length;
  }

  private getLatency(): number {
    if (this.metricsHistory.length === 0) return 0;
    const recent = this.metricsHistory.slice(-5);
    return recent.reduce((sum, m) => sum + m.latency, 0) / recent.length;
  }

  private getErrorRate(): number {
    // This would be calculated based on actual error tracking
    return 0; // Placeholder
  }

  // Public API methods
  getCurrentStrategy(): OptimizationStrategy {
    return { ...this.currentStrategy };
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return this.metricsHistory[this.metricsHistory.length - 1] || {
      batchProcessingTime: 0,
      transactionProcessingTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      throughput: 0,
      latency: 0,
      errorRate: 0,
    };
  }

  updateStrategy(newStrategy: Partial<OptimizationStrategy>): void {
    this.currentStrategy = { ...this.currentStrategy, ...newStrategy };
    this.logger.log('Performance strategy updated', this.currentStrategy);
  }

  clearCache(): void {
    this.cache.clear();
    this.logger.log('Performance cache cleared');
  }

  getCacheStatistics(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.currentStrategy.cacheSize,
      hitRate: 0, // Would need to track hits/misses for accurate rate
    };
  }
}

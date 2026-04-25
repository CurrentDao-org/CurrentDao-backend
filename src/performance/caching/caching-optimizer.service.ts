import { Injectable } from '@nestjs/common';

export interface CachingMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
  evictionRate: number;
  averageResponseTime: number;
}

export interface CacheConfiguration {
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  maxSize: number;
  ttl: number; // seconds
  compressionEnabled: boolean;
  serializationFormat: 'json' | 'binary' | 'msgpack';
}

export interface CacheEntry {
  key: string;
  value: any;
  size: number;
  accessCount: number;
  lastAccessed: string;
  ttl: number;
  compressed: boolean;
}

export interface OptimizationResult {
  strategy: string;
  hitRate: number;
  memoryReduction: number;
  performanceImprovement: number;
  recommendations: string[];
  appliedChanges: string[];
}

@Injectable()
export class CachingOptimizerService {
  private readonly cacheEntries: Map<string, CacheEntry> = new Map();
  private readonly metrics: CachingMetrics = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    cacheSize: 0,
    memoryUsage: 0,
    evictionRate: 0,
    averageResponseTime: 0,
  };
  private readonly configurations: Map<string, CacheConfiguration> = new Map();

  constructor() {
    this.initializeDefaultConfigurations();
    this.initializeMockCache();
  }

  async getMetrics(): Promise<CachingMetrics> {
    await this.updateMetrics();
    return { ...this.metrics };
  }

  async optimizeCaching(strategy?: string, force = false): Promise<OptimizationResult> {
    const currentMetrics = await this.getMetrics();
    const targetStrategy = strategy || this.recommendStrategy(currentMetrics);
    
    const optimization = await this.performOptimization(targetStrategy, currentMetrics, force);
    
    return {
      strategy: targetStrategy,
      hitRate: optimization.hitRate,
      memoryReduction: optimization.memoryReduction,
      performanceImprovement: optimization.performanceImprovement,
      recommendations: optimization.recommendations,
      appliedChanges: optimization.appliedChanges,
    };
  }

  async analyzeCachePatterns(): Promise<any> {
    const patterns = {
      hotKeys: this.identifyHotKeys(),
      coldKeys: this.identifyColdKeys(),
      accessPatterns: this.analyzeAccessPatterns(),
      sizeDistribution: this.analyzeSizeDistribution(),
      ttlEffectiveness: this.analyzeTTLEffectiveness(),
    };

    return {
      timestamp: new Date().toISOString(),
      patterns,
      recommendations: this.generatePatternRecommendations(patterns),
    };
  }

  async configureCache(config: CacheConfiguration, name = 'default'): Promise<void> {
    this.configurations.set(name, config);
    await this.applyConfiguration(config);
  }

  async getConfiguration(name = 'default'): Promise<CacheConfiguration | undefined> {
    return this.configurations.get(name);
  }

  async clearCache(pattern?: string): Promise<any> {
    let clearedCount = 0;

    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key, entry] of this.cacheEntries.entries()) {
        if (regex.test(key)) {
          this.cacheEntries.delete(key);
          clearedCount++;
        }
      }
    } else {
      clearedCount = this.cacheEntries.size;
      this.cacheEntries.clear();
    }

    await this.updateMetrics();

    return {
      clearedCount,
      timestamp: new Date().toISOString(),
      pattern: pattern || 'all',
    };
  }

  async preloadCache(keys: string[]): Promise<any> {
    const preloaded: string[] = [];
    const failed: string[] = [];

    for (const key of keys) {
      try {
        // Simulate preloading
        const value = await this.simulateDataFetch(key);
        await this.setCacheEntry(key, value);
        preloaded.push(key);
      } catch (error) {
        failed.push(key);
      }
    }

    return {
      preloaded: preloaded.length,
      failed: failed.length,
      timestamp: new Date().toISOString(),
    };
  }

  private async performOptimization(strategy: string, currentMetrics: CachingMetrics, force: boolean): Promise<any> {
    const improvements = {
      hitRate: 0,
      memoryReduction: 0,
      performanceImprovement: 0,
      recommendations: [] as string[],
      appliedChanges: [] as string[],
    };

    switch (strategy) {
      case 'lru':
        improvements.appliedChanges.push('Switched to LRU eviction strategy');
        improvements.hitRate = Math.min(95, currentMetrics.hitRate + 5);
        improvements.recommendations.push('LRU strategy works well for temporal locality');
        break;

      case 'lfu':
        improvements.appliedChanges.push('Switched to LFU eviction strategy');
        improvements.hitRate = Math.min(95, currentMetrics.hitRate + 7);
        improvements.recommendations.push('LFU strategy works well for frequently accessed data');
        break;

      case 'ttl':
        improvements.appliedChanges.push('Optimized TTL values');
        improvements.memoryReduction = 15;
        improvements.recommendations.push('TTL optimization reduces memory usage');
        break;

      case 'adaptive':
        improvements.appliedChanges.push('Enabled adaptive caching');
        improvements.hitRate = Math.min(95, currentMetrics.hitRate + 8);
        improvements.memoryReduction = 10;
        improvements.recommendations.push('Adaptive caching provides optimal balance');
        break;
    }

    // Simulate performance improvement
    improvements.performanceImprovement = (improvements.hitRate - currentMetrics.hitRate) * 2;

    return improvements;
  }

  private recommendStrategy(metrics: CachingMetrics): string {
    if (metrics.hitRate < 70) {
      return 'adaptive'; // Low hit rate needs adaptive approach
    } else if (metrics.memoryUsage > 80) {
      return 'ttl'; // High memory usage needs TTL optimization
    } else if (metrics.evictionRate > 20) {
      return 'lfu'; // High eviction rate needs LFU
    } else {
      return 'lru'; // Default to LRU
    }
  }

  private identifyHotKeys(): Array<{ key: string; accessCount: number; percentage: number }> {
    const entries = Array.from(this.cacheEntries.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return entries
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(entry => ({
        key: entry.key,
        accessCount: entry.accessCount,
        percentage: totalAccess > 0 ? (entry.accessCount / totalAccess) * 100 : 0,
      }));
  }

  private identifyColdKeys(): Array<{ key: string; accessCount: number; lastAccessed: string }> {
    const entries = Array.from(this.cacheEntries.values());
    
    return entries
      .filter(entry => entry.accessCount <= 2)
      .sort((a, b) => new Date(a.lastAccessed).getTime() - new Date(b.lastAccessed).getTime())
      .slice(0, 10)
      .map(entry => ({
        key: entry.key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed,
      }));
  }

  private analyzeAccessPatterns(): any {
    const entries = Array.from(this.cacheEntries.values());
    const now = Date.now();
    
    const recentAccess = entries.filter(entry => 
      (now - new Date(entry.lastAccessed).getTime()) < 3600000 // Last hour
    ).length;

    const hourlyAccessRate = (recentAccess / entries.length) * 100;

    return {
      hourlyAccessRate,
      peakHours: this.identifyPeakHours(),
      accessFrequency: this.calculateAccessFrequency(entries),
    };
  }

  private analyzeSizeDistribution(): any {
    const entries = Array.from(this.cacheEntries.values());
    const sizes = entries.map(entry => entry.size);
    
    sizes.sort((a, b) => a - b);
    
    return {
      min: sizes[0] || 0,
      max: sizes[sizes.length - 1] || 0,
      average: sizes.reduce((sum, size) => sum + size, 0) / sizes.length,
      median: sizes[Math.floor(sizes.length / 2)] || 0,
      largeEntries: entries.filter(entry => entry.size > 10000).length,
      smallEntries: entries.filter(entry => entry.size < 1000).length,
    };
  }

  private analyzeTTLEffectiveness(): any {
    const entries = Array.from(this.cacheEntries.values());
    const now = Date.now();
    
    const expiredEntries = entries.filter(entry => {
      const entryAge = (now - new Date(entry.lastAccessed).getTime()) / 1000;
      return entryAge > entry.ttl;
    }).length;

    return {
      expiredEntries,
      expirationRate: (expiredEntries / entries.length) * 100,
      averageTTL: entries.reduce((sum, entry) => sum + entry.ttl, 0) / entries.length,
    };
  }

  private generatePatternRecommendations(patterns: any): string[] {
    const recommendations: string[] = [];

    if (patterns.hotKeys.length > 0 && patterns.hotKeys[0].percentage > 30) {
      recommendations.push('Consider increasing cache size for hot keys');
    }

    if (patterns.coldKeys.length > patterns.hotKeys.length) {
      recommendations.push('Consider aggressive eviction for cold keys');
    }

    if (patterns.accessPatterns.hourlyAccessRate < 50) {
      recommendations.push('Consider reducing TTL for infrequently accessed data');
    }

    if (patterns.sizeDistribution.largeEntries > patterns.sizeDistribution.smallEntries) {
      recommendations.push('Consider compression for large cache entries');
    }

    if (patterns.ttlEffectiveness.expirationRate > 20) {
      recommendations.push('Optimize TTL values to reduce expiration rate');
    }

    return recommendations;
  }

  private async updateMetrics(): Promise<void> {
    const entries = Array.from(this.cacheEntries.values());
    const totalAccess = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);

    this.metrics.hitRate = totalAccess > 0 ? ((totalAccess - entries.length) / totalAccess) * 100 : 0;
    this.metrics.missRate = 100 - this.metrics.hitRate;
    this.metrics.totalRequests = totalAccess;
    this.metrics.cacheSize = entries.length;
    this.metrics.memoryUsage = totalSize;
    this.metrics.evictionRate = Math.random() * 10; // Simulated
    this.metrics.averageResponseTime = this.metrics.hitRate > 80 ? 5 : 25; // Faster with higher hit rate
  }

  private async applyConfiguration(config: CacheConfiguration): Promise<void> {
    // Simulate applying configuration
    console.log(`Applied cache configuration: ${config.strategy}`);
  }

  private async setCacheEntry(key: string, value: any): Promise<void> {
    const entry: CacheEntry = {
      key,
      value,
      size: JSON.stringify(value).length,
      accessCount: 1,
      lastAccessed: new Date().toISOString(),
      ttl: 3600, // 1 hour default
      compressed: false,
    };

    this.cacheEntries.set(key, entry);
  }

  private async simulateDataFetch(key: string): Promise<any> {
    // Simulate data fetch from database or API
    return {
      id: key,
      data: `sample_data_for_${key}`,
      timestamp: new Date().toISOString(),
    };
  }

  private identifyPeakHours(): number[] {
    // Simulate peak hours analysis
    return [9, 10, 14, 15, 16]; // 9 AM, 10 AM, 2-4 PM
  }

  private calculateAccessFrequency(entries: CacheEntry[]): any {
    const frequencies = { low: 0, medium: 0, high: 0 };
    
    entries.forEach(entry => {
      if (entry.accessCount <= 5) frequencies.low++;
      else if (entry.accessCount <= 20) frequencies.medium++;
      else frequencies.high++;
    });

    return frequencies;
  }

  private initializeDefaultConfigurations(): void {
    const defaultConfig: CacheConfiguration = {
      strategy: 'lru',
      maxSize: 10000,
      ttl: 3600,
      compressionEnabled: false,
      serializationFormat: 'json',
    };

    this.configurations.set('default', defaultConfig);
  }

  private initializeMockCache(): void {
    // Initialize with some mock cache entries
    const mockEntries = [
      'user:123',
      'forecast:demand:24h',
      'forecast:supply:solar',
      'performance:metrics',
      'trading:signals:latest',
    ];

    mockEntries.forEach(async (key) => {
      await this.setCacheEntry(key, { data: `mock_data_${key}` });
    });
  }
}

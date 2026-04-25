import { Injectable } from '@nestjs/common';
import { AutoScalingService } from './auto-scaling/auto-scaling.service';
import { ResourceManagerService } from './resource-management/resource-manager.service';
import { PerformanceProfilerService } from './profiling/performance-profiler.service';
import { QueryOptimizerService } from './optimization/query-optimizer.service';
import { CachingOptimizerService } from './caching/caching-optimizer.service';
import { LoadBalancerService } from './load-balancing/load-balancer.service';
import { ResourceAnalyticsService } from './analytics/resource-analytics.service';

export interface PerformanceMetrics {
  timestamp: string;
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    heapUsed: number;
    heapTotal: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    iops: number;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requests: number;
    errors: number;
    rate: number;
  };
}

export interface Bottleneck {
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'database' | 'application';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: string;
  recommendation: string;
  metrics: Record<string, number>;
  timestamp: string;
}

@Injectable()
export class PerformanceService {
  constructor(
    private readonly autoScalingService: AutoScalingService,
    private readonly resourceManagerService: ResourceManagerService,
    private readonly performanceProfilerService: PerformanceProfilerService,
    private readonly queryOptimizerService: QueryOptimizerService,
    private readonly cachingOptimizerService: CachingOptimizerService,
    private readonly loadBalancerService: LoadBalancerService,
    private readonly resourceAnalyticsService: ResourceAnalyticsService,
  ) {}

  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    try {
      const cpu = await this.resourceManagerService.getCpuMetrics();
      const memory = await this.resourceManagerService.getMemoryMetrics();
      const network = await this.resourceManagerService.getNetworkMetrics();
      const disk = await this.resourceManagerService.getDiskMetrics();
      const responseTime = await this.performanceProfilerService.getResponseTimeMetrics();
      const throughput = await this.performanceProfilerService.getThroughputMetrics();

      return {
        timestamp: new Date().toISOString(),
        cpu,
        memory,
        network,
        disk,
        responseTime,
        throughput,
      };
    } catch (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }
  }

  async getProfilingData(durationMinutes: number): Promise<any> {
    try {
      return await this.performanceProfilerService.getProfilingData(durationMinutes);
    } catch (error) {
      throw new Error(`Failed to get profiling data: ${error.message}`);
    }
  }

  async identifyBottlenecks(): Promise<Bottleneck[]> {
    try {
      const bottlenecks: Bottleneck[] = [];
      const metrics = await this.getCurrentMetrics();

      // CPU bottlenecks
      if (metrics.cpu.usage > 80) {
        bottlenecks.push({
          type: 'cpu',
          severity: metrics.cpu.usage > 95 ? 'critical' : 'high',
          description: `High CPU usage detected: ${metrics.cpu.usage}%`,
          impact: 'System response time degradation',
          recommendation: 'Consider scaling up or optimizing CPU-intensive operations',
          metrics: { cpuUsage: metrics.cpu.usage },
          timestamp: new Date().toISOString(),
        });
      }

      // Memory bottlenecks
      if (metrics.memory.percentage > 85) {
        bottlenecks.push({
          type: 'memory',
          severity: metrics.memory.percentage > 95 ? 'critical' : 'high',
          description: `High memory usage detected: ${metrics.memory.percentage}%`,
          impact: 'Risk of out-of-memory errors',
          recommendation: 'Consider scaling memory or optimizing memory usage',
          metrics: { memoryUsage: metrics.memory.percentage },
          timestamp: new Date().toISOString(),
        });
      }

      // Response time bottlenecks
      if (metrics.responseTime.p95 > 1000) {
        bottlenecks.push({
          type: 'application',
          severity: metrics.responseTime.p95 > 5000 ? 'critical' : 'high',
          description: `High response time detected: ${metrics.responseTime.p95}ms`,
          impact: 'Poor user experience',
          recommendation: 'Optimize slow endpoints and database queries',
          metrics: { p95ResponseTime: metrics.responseTime.p95 },
          timestamp: new Date().toISOString(),
        });
      }

      // Database bottlenecks
      const dbMetrics = await this.queryOptimizerService.getDatabaseMetrics();
      if (dbMetrics.averageQueryTime > 500) {
        bottlenecks.push({
          type: 'database',
          severity: dbMetrics.averageQueryTime > 2000 ? 'critical' : 'medium',
          description: `Slow database queries detected: ${dbMetrics.averageQueryTime}ms average`,
          impact: 'Application performance degradation',
          recommendation: 'Optimize database queries and add proper indexes',
          metrics: { averageQueryTime: dbMetrics.averageQueryTime },
          timestamp: new Date().toISOString(),
        });
      }

      return bottlenecks;
    } catch (error) {
      throw new Error(`Failed to identify bottlenecks: ${error.message}`);
    }
  }

  async triggerAutoScaling(action: 'scale-up' | 'scale-down', target?: string): Promise<any> {
    try {
      return await this.autoScalingService.executeScaling(action, target);
    } catch (error) {
      throw new Error(`Failed to trigger auto-scaling: ${error.message}`);
    }
  }

  async triggerOptimization(type: string, force = false): Promise<any> {
    try {
      const results = [];

      switch (type) {
        case 'queries':
        case 'database':
          results.push(await this.queryOptimizerService.optimizeQueries(force));
          break;
        case 'caching':
        case 'cache':
          results.push(await this.cachingOptimizerService.optimizeCaching(force));
          break;
        case 'load-balancing':
        case 'load':
          results.push(await this.loadBalancerService.optimizeLoadBalancing(force));
          break;
        case 'all':
        default:
          results.push(await this.queryOptimizerService.optimizeQueries(force));
          results.push(await this.cachingOptimizerService.optimizeCaching(force));
          results.push(await this.loadBalancerService.optimizeLoadBalancing(force));
          break;
      }

      return {
        optimizationType: type,
        timestamp: new Date().toISOString(),
        results,
        summary: `Optimization completed for ${type}`,
      };
    } catch (error) {
      throw new Error(`Failed to trigger optimization: ${error.message}`);
    }
  }

  async getResourceAnalytics(periodHours: number): Promise<any> {
    try {
      return await this.resourceAnalyticsService.getAnalytics(periodHours);
    } catch (error) {
      throw new Error(`Failed to get resource analytics: ${error.message}`);
    }
  }

  async getLoadBalancingStatus(): Promise<any> {
    try {
      return await this.loadBalancerService.getStatus();
    } catch (error) {
      throw new Error(`Failed to get load balancing status: ${error.message}`);
    }
  }

  async updateLoadBalancing(config: any): Promise<any> {
    try {
      return await this.loadBalancerService.updateConfiguration(config);
    } catch (error) {
      throw new Error(`Failed to update load balancing: ${error.message}`);
    }
  }

  async getCachingMetrics(): Promise<any> {
    try {
      return await this.cachingOptimizerService.getMetrics();
    } catch (error) {
      throw new Error(`Failed to get caching metrics: ${error.message}`);
    }
  }

  async optimizeCaching(strategy?: string, force = false): Promise<any> {
    try {
      return await this.cachingOptimizerService.optimizeCaching(strategy, force);
    } catch (error) {
      throw new Error(`Failed to optimize caching: ${error.message}`);
    }
  }

  async getQueryPerformance(limit: number): Promise<any> {
    try {
      return await this.queryOptimizerService.getQueryPerformance(limit);
    } catch (error) {
      throw new Error(`Failed to get query performance: ${error.message}`);
    }
  }

  async optimizeQueries(queries?: string[], force = false): Promise<any> {
    try {
      return await this.queryOptimizerService.optimizeQueries(queries, force);
    } catch (error) {
      throw new Error(`Failed to optimize queries: ${error.message}`);
    }
  }

  async getAlerts(severity?: string): Promise<any> {
    try {
      const bottlenecks = await this.identifyBottlenecks();
      const alerts = bottlenecks.filter(b => !severity || b.severity === severity);
      
      return {
        timestamp: new Date().toISOString(),
        totalAlerts: alerts.length,
        alerts: alerts.map(alert => ({
          id: this.generateAlertId(),
          ...alert,
          acknowledged: false,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get alerts: ${error.message}`);
    }
  }

  async getDashboardData(): Promise<any> {
    try {
      const [metrics, bottlenecks, analytics, loadBalancing, caching] = await Promise.all([
        this.getCurrentMetrics(),
        this.identifyBottlenecks(),
        this.getResourceAnalytics(24),
        this.getLoadBalancingStatus(),
        this.getCachingMetrics(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        summary: {
          health: this.calculateOverallHealth(metrics, bottlenecks),
          performance: this.calculatePerformanceScore(metrics),
          alerts: bottlenecks.length,
          efficiency: this.calculateEfficiency(metrics),
        },
        metrics,
        bottlenecks,
        analytics,
        loadBalancing,
        caching,
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard data: ${error.message}`);
    }
  }

  private calculateOverallHealth(metrics: PerformanceMetrics, bottlenecks: Bottleneck[]): 'excellent' | 'good' | 'fair' | 'poor' {
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical').length;
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high').length;
    
    if (criticalBottlenecks > 0) return 'poor';
    if (highBottlenecks > 2) return 'fair';
    if (highBottlenecks > 0 || metrics.cpu.usage > 70 || metrics.memory.percentage > 80) return 'good';
    return 'excellent';
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    const cpuScore = Math.max(0, 100 - metrics.cpu.usage);
    const memoryScore = Math.max(0, 100 - metrics.memory.percentage);
    const responseScore = Math.max(0, 100 - (metrics.responseTime.p95 / 10)); // Scale to 100
    const throughputScore = Math.min(100, metrics.throughput.rate * 10); // Scale to 100
    
    return Math.round((cpuScore + memoryScore + responseScore + throughputScore) / 4);
  }

  private calculateEfficiency(metrics: PerformanceMetrics): number {
    // Calculate resource efficiency based on utilization vs performance
    const utilizationScore = (metrics.cpu.usage + metrics.memory.percentage) / 2;
    const performanceScore = Math.max(0, 100 - (metrics.responseTime.p95 / 20)); // Scale to 100
    
    return Math.round((utilizationScore * 0.4 + performanceScore * 0.6));
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

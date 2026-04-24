import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

interface AlertConfig {
  type: 'performance' | 'error' | 'warning' | 'info';
  threshold: number;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  message: string;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
}

interface Alert {
  id: string;
  type: string;
  severity: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

interface Bottleneck {
  id: string;
  type: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metric: string;
  value: number;
  baseline: number;
  deviation: number;
  timestamp: Date;
  suggestions: string[];
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  uptime: number;
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private redis: Redis;
  private activeAlerts = new Map<string, Alert>();
  private bottlenecks = new Map<string, Bottleneck>();
  private alertCounter = 0;
  private metrics: PerformanceMetrics;

  constructor(private readonly configService: ConfigService) {
    this.metrics = {
      responseTime: 35, // 35ms
      throughput: 150000, // 150K requests/min
      errorRate: 0.001, // 0.1%
      cpuUsage: 65, // 65%
      memoryUsage: 70, // 70%
      diskUsage: 45, // 45%
      networkLatency: 12, // 12ms
      uptime: process.uptime(),
    };
  }

  async onModuleInit() {
    await this.initializeRedis();
    this.startPerformanceMonitoring();
    this.startBottleneckDetection();
    this.logger.log('Performance monitor service initialized');
  }

  private async initializeRedis() {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for performance monitoring');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  private startPerformanceMonitoring() {
    // Monitor performance every 5 seconds
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 5000);

    // Check alerts every 10 seconds
    setInterval(() => {
      this.checkAlerts();
    }, 10000);
  }

  private startBottleneckDetection() {
    // Analyze for bottlenecks every 30 seconds
    setInterval(() => {
      this.detectBottlenecks();
    }, 30000);
  }

  private async collectPerformanceMetrics(): Promise<void> {
    try {
      const currentMetrics = await this.getCurrentSystemMetrics();
      
      // Update metrics with moving averages
      this.metrics.responseTime = (this.metrics.responseTime * 0.8) + (currentMetrics.responseTime * 0.2);
      this.metrics.throughput = (this.metrics.throughput * 0.9) + (currentMetrics.throughput * 0.1);
      this.metrics.errorRate = (this.metrics.errorRate * 0.9) + (currentMetrics.errorRate * 0.1);
      this.metrics.cpuUsage = currentMetrics.cpuUsage;
      this.metrics.memoryUsage = currentMetrics.memoryUsage;
      this.metrics.diskUsage = currentMetrics.diskUsage;
      this.metrics.networkLatency = currentMetrics.networkLatency;
      this.metrics.uptime = process.uptime();

      // Store metrics in Redis for time-series analysis
      await this.storeMetrics(this.metrics);

    } catch (error) {
      this.logger.error('Error collecting performance metrics:', error);
    }
  }

  private async getCurrentSystemMetrics(): Promise<Partial<PerformanceMetrics>> {
    // Simulate system metrics collection
    return {
      responseTime: Math.random() * 30 + 20, // 20-50ms
      throughput: Math.floor(Math.random() * 50000) + 100000, // 100K-150K
      errorRate: Math.random() * 0.002, // 0-0.2%
      cpuUsage: Math.random() * 40 + 50, // 50-90%
      memoryUsage: Math.random() * 30 + 60, // 60-90%
      diskUsage: Math.random() * 20 + 35, // 35-55%
      networkLatency: Math.random() * 15 + 5, // 5-20ms
    };
  }

  private async storeMetrics(metrics: PerformanceMetrics): Promise<void> {
    const timestamp = Date.now();
    
    // Store in time-series data
    await this.redis.zadd(
      'performance:metrics:response_time',
      timestamp,
      metrics.responseTime.toString()
    );

    await this.redis.zadd(
      'performance:metrics:throughput',
      timestamp,
      metrics.throughput.toString()
    );

    await this.redis.zadd(
      'performance:metrics:error_rate',
      timestamp,
      metrics.errorRate.toString()
    );

    await this.redis.zadd(
      'performance:metrics:cpu',
      timestamp,
      metrics.cpuUsage.toString()
    );

    await this.redis.zadd(
      'performance:metrics:memory',
      timestamp,
      metrics.memoryUsage.toString()
    );

    // Keep only last 1000 data points per metric
    await this.redis.zremrangebyrank('performance:metrics:response_time', 0, -1001);
    await this.redis.zremrangebyrank('performance:metrics:throughput', 0, -1001);
    await this.redis.zremrangebyrank('performance:metrics:error_rate', 0, -1001);
    await this.redis.zremrangebyrank('performance:metrics:cpu', 0, -1001);
    await this.redis.zremrangebyrank('performance:metrics:memory', 0, -1001);
  }

  private async checkAlerts(): Promise<void> {
    try {
      const activeAlertConfigs = await this.getActiveAlertConfigs();
      
      for (const config of activeAlertConfigs) {
        if (!config.enabled) continue;

        const currentValue = this.getMetricValue(config.metric);
        const shouldAlert = this.evaluateThreshold(currentValue, config);

        if (shouldAlert && !this.hasActiveAlert(config.metric, config.threshold)) {
          await this.createAlertFromConfig(config, currentValue);
        } else if (!shouldAlert && this.hasActiveAlert(config.metric, config.threshold)) {
          await this.resolveAlert(config.metric, config.threshold);
        }
      }
    } catch (error) {
      this.logger.error('Error checking alerts:', error);
    }
  }

  private async getActiveAlertConfigs(): Promise<AlertConfig[]> {
    // Get alert configurations from Redis
    const configs = await this.redis.hgetall('performance:alert_configs');
    
    return Object.entries(configs).map(([id, config]) => ({
      id,
      ...JSON.parse(config as string),
    }));
  }

  private getMetricValue(metric: string): number {
    switch (metric) {
      case 'response_time':
        return this.metrics.responseTime;
      case 'throughput':
        return this.metrics.throughput;
      case 'error_rate':
        return this.metrics.errorRate * 100; // Convert to percentage
      case 'cpu_usage':
        return this.metrics.cpuUsage;
      case 'memory_usage':
        return this.metrics.memoryUsage;
      case 'disk_usage':
        return this.metrics.diskUsage;
      case 'network_latency':
        return this.metrics.networkLatency;
      default:
        return 0;
    }
  }

  private evaluateThreshold(value: number, config: AlertConfig): boolean {
    switch (config.operator) {
      case '>':
        return value > config.threshold;
      case '<':
        return value < config.threshold;
      case '>=':
        return value >= config.threshold;
      case '<=':
        return value <= config.threshold;
      case '=':
        return value === config.threshold;
      default:
        return false;
    }
  }

  private hasActiveAlert(metric: string, threshold: number): boolean {
    for (const alert of this.activeAlerts.values()) {
      if (alert.metric === metric && alert.threshold === threshold && !alert.resolved) {
        return true;
      }
    }
    return false;
  }

  private async createAlertFromConfig(config: AlertConfig, currentValue: number): Promise<void> {
    const alert: Alert = {
      id: this.generateAlertId(),
      type: config.type,
      severity: config.severity,
      message: config.message.replace('{value}', currentValue.toString()),
      metric: config.metric,
      value: currentValue,
      threshold: config.threshold,
      timestamp: new Date(),
      resolved: false,
    };

    this.activeAlerts.set(alert.id, alert);

    // Store alert in Redis
    await this.redis.hset(
      'performance:alerts',
      alert.id,
      JSON.stringify(alert)
    );

    // Add to time-series for alert history
    await this.redis.zadd(
      'performance:alert_history',
      alert.timestamp.getTime(),
      JSON.stringify(alert)
    );

    this.logger.warn(`Alert created: ${alert.message}`);

    // Send notification (in real implementation, this would integrate with notification service)
    await this.sendNotification(alert);
  }

  private async resolveAlert(metric: string, threshold: number): Promise<void> {
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.metric === metric && alert.threshold === threshold && !alert.resolved) {
        alert.resolved = true;
        alert.resolvedAt = new Date();

        // Update in Redis
        await this.redis.hset(
          'performance:alerts',
          alertId,
          JSON.stringify(alert)
        );

        this.logger.log(`Alert resolved: ${alert.message}`);
        await this.sendResolutionNotification(alert);
        break;
      }
    }
  }

  private async detectBottlenecks(): Promise<void> {
    try {
      const recentMetrics = await this.getRecentMetrics();
      const bottlenecks = this.analyzeBottlenecks(recentMetrics);

      for (const bottleneck of bottlenecks) {
        if (!this.bottlenecks.has(bottleneck.id)) {
          this.bottlenecks.set(bottleneck.id, bottleneck);
          
          // Store bottleneck
          await this.redis.hset(
            'performance:bottlenecks',
            bottleneck.id,
            JSON.stringify(bottleneck)
          );

          this.logger.warn(`Bottleneck detected: ${bottleneck.description}`);
        }
      }

      // Clean old bottlenecks (older than 1 hour)
      this.cleanOldBottlenecks();

    } catch (error) {
      this.logger.error('Error detecting bottlenecks:', error);
    }
  }

  private async getRecentMetrics(): Promise<PerformanceMetrics[]> {
    const timeWindow = 3600000; // 1 hour in milliseconds
    const endTime = Date.now();
    const startTime = endTime - timeWindow;

    try {
      const [
        responseTimeData,
        throughputData,
        errorRateData,
        cpuData,
        memoryData,
      ] = await Promise.all([
        this.redis.zrangebyscore('performance:metrics:response_time', startTime, endTime),
        this.redis.zrangebyscore('performance:metrics:throughput', startTime, endTime),
        this.redis.zrangebyscore('performance:metrics:error_rate', startTime, endTime),
        this.redis.zrangebyscore('performance:metrics:cpu', startTime, endTime),
        this.redis.zrangebyscore('performance:metrics:memory', startTime, endTime),
      ]);

      // Combine metrics into objects
      const metrics: PerformanceMetrics[] = [];
      const dataPoints = Math.min(
        responseTimeData.length,
        throughputData.length,
        errorRateData.length,
        cpuData.length,
        memoryData.length
      );

      for (let i = 0; i < dataPoints; i++) {
        metrics.push({
          responseTime: parseFloat(responseTimeData[i] || '0'),
          throughput: parseFloat(throughputData[i] || '0'),
          errorRate: parseFloat(errorRateData[i] || '0'),
          cpuUsage: parseFloat(cpuData[i] || '0'),
          memoryUsage: parseFloat(memoryData[i] || '0'),
          diskUsage: 0,
          networkLatency: 0,
          uptime: 0,
        });
      }

      return metrics;

    } catch (error) {
      this.logger.error('Error getting recent metrics:', error);
      return [];
    }
  }

  private analyzeBottlenecks(metrics: PerformanceMetrics[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    if (metrics.length === 0) return bottlenecks;

    const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
    const avgThroughput = metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
    const avgCpuUsage = metrics.reduce((sum, m) => sum + m.cpuUsage, 0) / metrics.length;
    const avgMemoryUsage = metrics.reduce((sum, m) => sum + m.memoryUsage, 0) / metrics.length;

    // Response time bottleneck
    if (avgResponseTime > 100) {
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'response_time',
        description: 'High response time detected',
        impact: avgResponseTime > 200 ? 'high' : 'medium',
        metric: 'response_time',
        value: avgResponseTime,
        baseline: 50,
        deviation: ((avgResponseTime - 50) / 50) * 100,
        timestamp: new Date(),
        suggestions: [
          'Optimize database queries',
          'Add caching layers',
          'Scale horizontally',
        ],
      });
    }

    // Throughput bottleneck
    if (avgThroughput < 50000) {
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'throughput',
        description: 'Low throughput detected',
        impact: avgThroughput < 25000 ? 'high' : 'medium',
        metric: 'throughput',
        value: avgThroughput,
        baseline: 100000,
        deviation: ((100000 - avgThroughput) / 100000) * 100,
        timestamp: new Date(),
        suggestions: [
          'Increase server capacity',
          'Optimize application code',
          'Load balance traffic',
        ],
      });
    }

    // Error rate bottleneck
    if (avgErrorRate > 0.05) {
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'error_rate',
        description: 'High error rate detected',
        impact: avgErrorRate > 0.1 ? 'high' : 'medium',
        metric: 'error_rate',
        value: avgErrorRate,
        baseline: 0.01,
        deviation: ((avgErrorRate - 0.01) / 0.01) * 100,
        timestamp: new Date(),
        suggestions: [
          'Investigate application logs',
          'Fix reported bugs',
          'Improve error handling',
        ],
      });
    }

    // CPU usage bottleneck
    if (avgCpuUsage > 85) {
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'cpu_usage',
        description: 'High CPU usage detected',
        impact: avgCpuUsage > 95 ? 'high' : 'medium',
        metric: 'cpu_usage',
        value: avgCpuUsage,
        baseline: 70,
        deviation: ((avgCpuUsage - 70) / 70) * 100,
        timestamp: new Date(),
        suggestions: [
          'Optimize CPU-intensive operations',
          'Scale vertically',
          'Implement caching',
        ],
      });
    }

    // Memory usage bottleneck
    if (avgMemoryUsage > 85) {
      bottlenecks.push({
        id: this.generateBottleneckId(),
        type: 'memory_usage',
        description: 'High memory usage detected',
        impact: avgMemoryUsage > 95 ? 'high' : 'medium',
        metric: 'memory_usage',
        value: avgMemoryUsage,
        baseline: 70,
        deviation: ((avgMemoryUsage - 70) / 70) * 100,
        timestamp: new Date(),
        suggestions: [
          'Optimize memory usage',
          'Add more memory',
          'Fix memory leaks',
        ],
      });
    }

    return bottlenecks;
  }

  private cleanOldBottlenecks(): void {
    const oneHourAgo = Date.now() - 3600000;
    
    for (const [id, bottleneck] of this.bottlenecks.entries()) {
      if (bottleneck.timestamp.getTime() < oneHourAgo) {
        this.bottlenecks.delete(id);
      }
    }
  }

  async createAlert(alertConfig: AlertConfig): Promise<any> {
    const alertId = this.generateAlertId();
    
    // Store alert configuration
    await this.redis.hset(
      'performance:alert_configs',
      alertId,
      JSON.stringify(alertConfig)
    );

    this.logger.log(`Alert configuration created: ${alertConfig.type}`);

    return {
      alertId,
      status: 'created',
      config: alertConfig,
    };
  }

  async getPerformanceMetrics(params: any): Promise<any> {
    const timeWindow = params.timeWindow || 3600; // 1 hour default
    
    const [
      avgResponseTime,
      avgThroughput,
      avgErrorRate,
      avgCpuUsage,
      avgMemoryUsage,
    ] = await Promise.all([
        this.getAverageMetric('performance:metrics:response_time', timeWindow),
        this.getAverageMetric('performance:metrics:throughput', timeWindow),
        this.getAverageMetric('performance:metrics:error_rate', timeWindow),
        this.getAverageMetric('performance:metrics:cpu', timeWindow),
        this.getAverageMetric('performance:metrics:memory', timeWindow),
      ]);

    return {
      timestamp: new Date().toISOString(),
      timeWindow,
      metrics: {
        responseTime: {
          current: this.metrics.responseTime,
          average: avgResponseTime,
          trend: this.calculateTrend(avgResponseTime, 50),
        },
        throughput: {
          current: this.metrics.throughput,
          average: avgThroughput,
          trend: this.calculateTrend(avgThroughput, 100000),
        },
        errorRate: {
          current: this.metrics.errorRate * 100,
          average: avgErrorRate * 100,
          trend: this.calculateTrend(avgErrorRate, 0.01),
        },
        cpuUsage: {
          current: this.metrics.cpuUsage,
          average: avgCpuUsage,
          trend: this.calculateTrend(avgCpuUsage, 70),
        },
        memoryUsage: {
          current: this.metrics.memoryUsage,
          average: avgMemoryUsage,
          trend: this.calculateTrend(avgMemoryUsage, 70),
        },
      },
      system: {
        uptime: this.metrics.uptime,
        diskUsage: this.metrics.diskUsage,
        networkLatency: this.metrics.networkLatency,
      },
    };
  }

  async identifyBottlenecks(params: any): Promise<any> {
    const recentBottlenecks = Array.from(this.bottlenecks.values())
      .filter(b => b.timestamp > new Date(Date.now() - (params.timeWindow || 3600000)));

    return {
      timestamp: new Date().toISOString(),
      bottlenecks: recentBottlenecks,
      totalBottlenecks: this.bottlenecks.size,
      criticalBottlenecks: recentBottlenecks.filter(b => b.impact === 'high').length,
      recommendations: this.generateSystemRecommendations(recentBottlenecks),
    };
  }

  private async getAverageMetric(key: string, timeWindow: number): Promise<number> {
    const endTime = Date.now();
    const startTime = endTime - (timeWindow * 1000);
    
    try {
      const data = await this.redis.zrangebyscore(key, startTime, endTime);
      if (data.length === 0) return 0;
      
      const sum = data.reduce((total, value) => total + parseFloat(value), 0);
      return sum / data.length;
    } catch (error) {
      this.logger.error(`Error getting average metric for ${key}:`, error);
      return 0;
    }
  }

  private calculateTrend(current: number, baseline: number): 'up' | 'down' | 'stable' {
    const deviation = ((current - baseline) / baseline) * 100;
    
    if (deviation > 10) return 'up';
    if (deviation < -10) return 'down';
    return 'stable';
  }

  private generateSystemRecommendations(bottlenecks: Bottleneck[]): string[] {
    const recommendations = new Set<string>();
    
    bottlenecks.forEach(bottleneck => {
      bottleneck.suggestions.forEach(suggestion => recommendations.add(suggestion));
    });

    return Array.from(recommendations);
  }

  private async sendNotification(alert: Alert): Promise<void> {
    // Simulate notification sending
    this.logger.log(`Notification sent for alert: ${alert.id}`);
  }

  private async sendResolutionNotification(alert: Alert): Promise<void> {
    // Simulate resolution notification
    this.logger.log(`Resolution notification sent for alert: ${alert.id}`);
  }

  private generateAlertId(): string {
    return `alert_${++this.alertCounter}_${Date.now()}`;
  }

  private generateBottleneckId(): string {
    return `bottleneck_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved);
  }

  async getAlertHistory(limit: number = 100): Promise<Alert[]> {
    try {
      const historyData = await this.redis.zrevrange('performance:alert_history', 0, limit - 1);
      
      return historyData.map(data => JSON.parse(data));
    } catch (error) {
      this.logger.error('Error getting alert history:', error);
      return [];
    }
  }

  async getBottleneckHistory(limit: number = 50): Promise<Bottleneck[]> {
    try {
      const bottleneckData = await this.redis.hgetall('performance:bottlenecks');
      
      return Object.values(bottleneckData)
        .map(data => JSON.parse(data as string))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting bottleneck history:', error);
      return [];
    }
  }
}

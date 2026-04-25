import { Injectable } from '@nestjs/common';

export interface ModelPerformanceMetrics {
  modelId: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  latency: number;
  throughput: number;
  errorRate: number;
  lastUpdated: string;
  trend: 'improving' | 'degrading' | 'stable';
}

export interface ModelHealth {
  modelId: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  uptime: number;
  lastCheck: string;
  issues: string[];
  recommendations: string[];
}

export interface MonitoringAlert {
  id: string;
  modelId: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'performance' | 'accuracy' | 'latency' | 'error';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

@Injectable()
export class ModelMonitorService {
  private readonly performanceMetrics: Map<string, ModelPerformanceMetrics> = new Map();
  private readonly modelHealth: Map<string, ModelHealth> = new Map();
  private readonly alerts: MonitoringAlert[] = [];

  constructor() {
    this.initializeMonitoring();
  }

  async getMonitoringStatus(): Promise<any> {
    const totalModels = this.performanceMetrics.size;
    const healthyModels = Array.from(this.modelHealth.values()).filter(h => h.status === 'healthy').length;
    const criticalModels = Array.from(this.modelHealth.values()).filter(h => h.status === 'critical').length;
    const activeAlerts = this.alerts.filter(a => !a.acknowledged).length;

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalModels,
        healthyModels,
        criticalModels,
        activeAlerts,
        overallHealth: totalModels > 0 ? (healthyModels / totalModels) * 100 : 0,
      },
      models: Array.from(this.performanceMetrics.values()),
      health: Array.from(this.modelHealth.values()),
      recentAlerts: this.alerts.slice(-10).reverse(),
    };
  }

  async getModelPerformance(modelId: string): Promise<ModelPerformanceMetrics> {
    const metrics = this.performanceMetrics.get(modelId);
    if (!metrics) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Update metrics with latest data
    await this.updateModelMetrics(modelId);
    return this.performanceMetrics.get(modelId)!;
  }

  async checkModelHealth(modelId: string): Promise<ModelHealth> {
    const health = this.modelHealth.get(modelId);
    if (!health) {
      throw new Error(`Model not found: ${modelId}`);
    }

    await this.performHealthCheck(modelId);
    return this.modelHealth.get(modelId)!;
  }

  async createAlert(modelId: string, severity: MonitoringAlert['severity'], type: MonitoringAlert['type'], message: string): Promise<MonitoringAlert> {
    const alert: MonitoringAlert = {
      id: this.generateAlertId(),
      modelId,
      severity,
      type,
      message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    this.alerts.push(alert);

    // Update model health based on alert
    await this.updateHealthFromAlert(modelId, alert);

    return alert;
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  async getModelTrends(modelId: string, periodHours = 24): Promise<any> {
    const metrics = this.performanceMetrics.get(modelId);
    if (!metrics) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Generate trend data
    const trendData = this.generateTrendData(modelId, periodHours);

    return {
      modelId,
      period: periodHours,
      trends: trendData,
      summary: {
        averageAccuracy: this.calculateAverage(trendData, 'accuracy'),
        averageLatency: this.calculateAverage(trendData, 'latency'),
        errorTrend: this.calculateErrorTrend(trendData),
      },
    };
  }

  private async updateModelMetrics(modelId: string): Promise<void> {
    const current = this.performanceMetrics.get(modelId);
    if (!current) return;

    // Simulate metric updates
    const newMetrics: ModelPerformanceMetrics = {
      ...current,
      accuracy: Math.max(0.7, current.accuracy + (Math.random() - 0.5) * 0.05),
      precision: Math.max(0.7, current.precision + (Math.random() - 0.5) * 0.05),
      recall: Math.max(0.7, current.recall + (Math.random() - 0.5) * 0.05),
      f1Score: Math.max(0.7, current.f1Score + (Math.random() - 0.5) * 0.05),
      latency: Math.max(10, current.latency + (Math.random() - 0.5) * 20),
      throughput: Math.max(100, current.throughput + (Math.random() - 0.5) * 50),
      errorRate: Math.max(0, Math.min(0.1, current.errorRate + (Math.random() - 0.5) * 0.02)),
      lastUpdated: new Date().toISOString(),
      trend: this.calculateTrend(current),
    };

    this.performanceMetrics.set(modelId, newMetrics);

    // Check for performance issues
    await this.checkPerformanceIssues(modelId, newMetrics);
  }

  private async performHealthCheck(modelId: string): Promise<void> {
    const metrics = this.performanceMetrics.get(modelId);
    const health = this.modelHealth.get(modelId);
    
    if (!metrics || !health) return;

    const issues: string[] = [];
    const recommendations: string[] = [];
    let status: ModelHealth['status'] = 'healthy';

    // Check accuracy
    if (metrics.accuracy < 0.8) {
      issues.push('Model accuracy below threshold');
      recommendations.push('Retrain model with fresh data');
      status = 'warning';
    }

    if (metrics.accuracy < 0.7) {
      status = 'critical';
    }

    // Check latency
    if (metrics.latency > 1000) {
      issues.push('High latency detected');
      recommendations.push('Optimize model inference');
      status = status === 'healthy' ? 'warning' : status;
    }

    // Check error rate
    if (metrics.errorRate > 0.05) {
      issues.push('High error rate detected');
      recommendations.push('Check input data quality');
      status = status === 'healthy' ? 'warning' : status;
    }

    // Update health
    health.status = status;
    health.issues = issues;
    health.recommendations = recommendations;
    health.lastCheck = new Date().toISOString();
    health.uptime = this.calculateUptime(modelId);

    this.modelHealth.set(modelId, health);
  }

  private async checkPerformanceIssues(modelId: string, metrics: ModelPerformanceMetrics): Promise<void> {
    // Check for performance degradation
    if (metrics.accuracy < 0.75) {
      await this.createAlert(modelId, 'warning', 'accuracy', `Model accuracy dropped to ${metrics.accuracy.toFixed(3)}`);
    }

    if (metrics.latency > 500) {
      await this.createAlert(modelId, 'warning', 'latency', `Model latency increased to ${metrics.latency.toFixed(0)}ms`);
    }

    if (metrics.errorRate > 0.03) {
      await this.createAlert(modelId, 'error', 'error', `Model error rate increased to ${(metrics.errorRate * 100).toFixed(2)}%`);
    }
  }

  private async updateHealthFromAlert(modelId: string, alert: MonitoringAlert): Promise<void> {
    const health = this.modelHealth.get(modelId);
    if (!health) return;

    if (alert.severity === 'critical') {
      health.status = 'critical';
    } else if (alert.severity === 'error' && health.status === 'healthy') {
      health.status = 'warning';
    }

    if (!health.issues.includes(alert.message)) {
      health.issues.push(alert.message);
    }
  }

  private calculateTrend(metrics: ModelPerformanceMetrics): 'improving' | 'degrading' | 'stable' {
    // Simulate trend calculation based on recent changes
    const random = Math.random();
    if (random > 0.7) return 'improving';
    if (random < 0.3) return 'degrading';
    return 'stable';
  }

  private generateTrendData(modelId: string, periodHours: number): any[] {
    const data: any[] = [];
    const now = Date.now();

    for (let i = periodHours; i >= 0; i--) {
      const timestamp = new Date(now - i * 60 * 60 * 1000).toISOString();
      
      data.push({
        timestamp,
        accuracy: 0.85 + Math.random() * 0.1,
        latency: 50 + Math.random() * 100,
        throughput: 100 + Math.random() * 200,
        errorRate: Math.random() * 0.05,
      });
    }

    return data;
  }

  private calculateAverage(data: any[], field: string): number {
    return data.reduce((sum, item) => sum + item[field], 0) / data.length;
  }

  private calculateErrorTrend(data: any[]): 'increasing' | 'decreasing' | 'stable' {
    if (data.length < 2) return 'stable';

    const first = data[0].errorRate;
    const last = data[data.length - 1].errorRate;
    const change = (last - first) / first;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateUptime(modelId: string): number {
    // Simulate uptime calculation (percentage)
    return 95 + Math.random() * 5; // 95-100% uptime
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeMonitoring(): void {
    const models = [
      'energy-demand-predictor',
      'price-classifier',
      'supply-forecaster',
      'trading-signal-generator',
    ];

    models.forEach(modelId => {
      // Initialize performance metrics
      this.performanceMetrics.set(modelId, {
        modelId,
        accuracy: 0.85 + Math.random() * 0.1,
        precision: 0.83 + Math.random() * 0.12,
        recall: 0.87 + Math.random() * 0.08,
        f1Score: 0.85 + Math.random() * 0.1,
        latency: 50 + Math.random() * 100,
        throughput: 100 + Math.random() * 200,
        errorRate: Math.random() * 0.03,
        lastUpdated: new Date().toISOString(),
        trend: 'stable',
      });

      // Initialize health
      this.modelHealth.set(modelId, {
        modelId,
        status: 'healthy',
        uptime: 98 + Math.random() * 2,
        lastCheck: new Date().toISOString(),
        issues: [],
        recommendations: [],
      });
    });

    // Initialize some alerts
    this.alerts.push(
      {
        id: 'alert_1',
        modelId: 'energy-demand-predictor',
        severity: 'warning',
        type: 'performance',
        message: 'Model accuracy showing slight degradation',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        acknowledged: false,
      },
      {
        id: 'alert_2',
        modelId: 'price-classifier',
        severity: 'info',
        type: 'latency',
        message: 'Latency within acceptable range',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        acknowledged: true,
      }
    );
  }
}

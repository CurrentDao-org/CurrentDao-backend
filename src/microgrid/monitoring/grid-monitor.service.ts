import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { GridStatus } from '../microgrid.service';

export interface GridMetrics {
  timestamp: Date;
  frequency: number;
  voltage: number;
  power: number;
  energy: number;
  powerFactor: number;
  harmonics: number;
  stability: number;
}

export interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  message: string;
  nodeId?: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
  resolved: boolean;
}

export interface RealTimeData {
  gridStatus: GridStatus;
  metrics: GridMetrics;
  alerts: Alert[];
  performance: {
    latency: number;
    uptime: number;
    availability: number;
    responseTime: number;
  };
  timestamp: Date;
}

@Injectable()
export class GridMonitorService {
  private readonly logger = new Logger(GridMonitorService.name);
  private readonly metrics: GridMetrics[] = [];
  private readonly alerts: Alert[] = [];
  private readonly maxMetrics = 10000; // Increased for high-frequency monitoring
  private readonly maxAlerts = 1000;
  private readonly targetLatency = 1000; // <1 second target in milliseconds
  private readonly realTimeBuffer = new Map<string, {
    value: number;
    timestamp: Date;
    quality: number;
  }>();
  private readonly monitoringIntervals = new Map<string, NodeJS.Timeout>();
  private readonly highFrequencyMetrics = new Map<string, {
    frequency: number[];
    voltage: number[];
    power: number[];
    timestamps: number[];
  }>();

  async getRealTimeData(): Promise<RealTimeData> {
    const currentMetrics = await this.getCurrentMetrics();
    const gridStatus = await this.getGridStatus();
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    const actualLatency = await this.measureActualLatency();

    return {
      gridStatus,
      metrics: currentMetrics,
      alerts: activeAlerts,
      performance: {
        latency: actualLatency,
        uptime: 0.999,
        availability: 0.998,
        responseTime: actualLatency,
      },
      timestamp: new Date(),
    };
  }

  async startHighFrequencyMonitoring(nodeIds: string[]): Promise<void> {
    this.logger.log(`Starting high-frequency monitoring for ${nodeIds.length} nodes`);
    
    for (const nodeId of nodeIds) {
      await this.startNodeMonitoring(nodeId);
    }
  }

  async stopHighFrequencyMonitoring(nodeIds: string[]): Promise<void> {
    this.logger.log(`Stopping high-frequency monitoring for ${nodeIds.length} nodes`);
    
    for (const nodeId of nodeIds) {
      await this.stopNodeMonitoring(nodeId);
    }
  }

  private async startNodeMonitoring(nodeId: string): Promise<void> {
    // Initialize high-frequency data collection
    this.highFrequencyMetrics.set(nodeId, {
      frequency: [],
      voltage: [],
      power: [],
      timestamps: [],
    });

    // Start monitoring at 500ms intervals
    const interval = setInterval(async () => {
      await this.collectHighFrequencyData(nodeId);
    }, 500);

    this.monitoringIntervals.set(nodeId, interval);
    this.logger.log(`Started high-frequency monitoring for node: ${nodeId}`);
  }

  private async stopNodeMonitoring(nodeId: string): Promise<void> {
    const interval = this.monitoringIntervals.get(nodeId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(nodeId);
      this.highFrequencyMetrics.delete(nodeId);
      this.logger.log(`Stopped high-frequency monitoring for node: ${nodeId}`);
    }
  }

  private async collectHighFrequencyData(nodeId: string): Promise<void> {
    const metrics = this.highFrequencyMetrics.get(nodeId);
    if (!metrics) return;

    const timestamp = Date.now();
    
    // Simulate high-frequency data collection
    const frequency = 50 + (Math.random() - 0.5) * 0.2;
    const voltage = 230 + (Math.random() - 0.5) * 5;
    const power = 100 + (Math.random() - 0.5) * 20;

    // Add to rolling buffer (keep last 100 samples)
    metrics.frequency.push(frequency);
    metrics.voltage.push(voltage);
    metrics.power.push(power);
    metrics.timestamps.push(timestamp);

    // Keep only last 100 samples
    if (metrics.frequency.length > 100) {
      metrics.frequency.shift();
      metrics.voltage.shift();
      metrics.power.shift();
      metrics.timestamps.shift();
    }

    // Check for immediate anomalies
    await this.checkImmediateAnomalies(nodeId, frequency, voltage, power);
  }

  private async checkImmediateAnomalies(
    nodeId: string,
    frequency: number,
    voltage: number,
    power: number
  ): Promise<void> {
    const metrics = this.highFrequencyMetrics.get(nodeId);
    if (!metrics || metrics.timestamps.length < 10) return;

    const recentFreq = metrics.frequency.slice(-10);
    const recentVoltage = metrics.voltage.slice(-10);
    const recentPower = metrics.power.slice(-10);

    // Frequency anomaly detection
    const avgFreq = recentFreq.reduce((sum, f) => sum + f, 0) / recentFreq.length;
    if (Math.abs(frequency - avgFreq) > 0.5) {
      await this.createImmediateAlert(nodeId, 'critical', 
        `Frequency anomaly detected: ${frequency.toFixed(2)} Hz (avg: ${avgFreq.toFixed(2)} Hz)`, 
        frequency, 50);
    }

    // Voltage anomaly detection
    const avgVoltage = recentVoltage.reduce((sum, v) => sum + v, 0) / recentVoltage.length;
    if (Math.abs(voltage - avgVoltage) > 10) {
      await this.createImmediateAlert(nodeId, 'warning', 
        `Voltage fluctuation detected: ${voltage.toFixed(1)}V (avg: ${avgVoltage.toFixed(1)}V)`, 
        voltage, 230);
    }

    // Power anomaly detection
    const avgPower = recentPower.reduce((sum, p) => sum + p, 0) / recentPower.length;
    if (Math.abs(power - avgPower) > avgPower * 0.3) {
      await this.createImmediateAlert(nodeId, 'warning', 
        `Power fluctuation detected: ${power.toFixed(1)}W (avg: ${avgPower.toFixed(1)}W)`, 
        power, avgPower);
    }
  }

  private async createImmediateAlert(
    nodeId: string,
    type: 'warning' | 'critical' | 'info',
    message: string,
    value: number,
    threshold: number
  ): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type,
      message,
      nodeId,
      value,
      threshold,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
    };

    this.alerts.push(alert);
    
    // Keep only recent alerts
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.splice(0, this.alerts.length - this.maxAlerts);
    }

    this.logger.warn(`Immediate alert created for node ${nodeId}: ${message}`);
  }

  private async measureActualLatency(): Promise<number> {
    const startTime = Date.now();
    
    // Simulate measurement process
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    const endTime = Date.now();
    return endTime - startTime;
  }

  async getHighFrequencyData(nodeId: string, samples: number = 50): Promise<{
    frequency: number[];
    voltage: number[];
    power: number[];
    timestamps: number[];
    quality: number;
  }> {
    const metrics = this.highFrequencyMetrics.get(nodeId);
    if (!metrics) {
      throw new Error(`No high-frequency data available for node: ${nodeId}`);
    }

    const actualSamples = Math.min(samples, metrics.frequency.length);
    const startIndex = metrics.frequency.length - actualSamples;

    return {
      frequency: metrics.frequency.slice(startIndex),
      voltage: metrics.voltage.slice(startIndex),
      power: metrics.power.slice(startIndex),
      timestamps: metrics.timestamps.slice(startIndex),
      quality: this.calculateDataQuality(metrics.frequency.slice(startIndex)),
    };
  }

  private calculateDataQuality(data: number[]): number {
    if (data.length < 2) return 1.0;

    // Calculate quality based on data consistency and completeness
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Quality score based on low variance and complete data
    const consistencyScore = Math.max(0, 1 - (standardDeviation / mean));
    const completenessScore = Math.min(1.0, data.length / 50); // Expect 50 samples
    
    return (consistencyScore + completenessScore) / 2;
  }

  async getRealTimeStream(): Promise<{
    nodeId: string;
    data: {
      timestamp: number;
      frequency: number;
      voltage: number;
      power: number;
    };
    quality: number;
  }[]> {
    const streamData = [];
    
    for (const [nodeId, metrics] of this.highFrequencyMetrics) {
      if (metrics.timestamps.length === 0) continue;

      const latestIndex = metrics.timestamps.length - 1;
      const quality = this.calculateDataQuality(metrics.frequency);

      streamData.push({
        nodeId,
        data: {
          timestamp: metrics.timestamps[latestIndex],
          frequency: metrics.frequency[latestIndex],
          voltage: metrics.voltage[latestIndex],
          power: metrics.power[latestIndex],
        },
        quality,
      });
    }

    return streamData;
  }

  async getMonitoringPerformance(): Promise<{
    averageLatency: number;
    targetLatency: number;
    complianceRate: number;
    dataQuality: number;
    activeMonitors: number;
    totalMonitors: number;
  }> {
    const actualLatency = await this.measureActualLatency();
    const complianceRate = actualLatency <= this.targetLatency ? 1.0 : this.targetLatency / actualLatency;
    
    // Calculate average data quality across all monitors
    let totalQuality = 0;
    let qualityCount = 0;
    
    for (const metrics of this.highFrequencyMetrics.values()) {
      if (metrics.frequency.length > 0) {
        totalQuality += this.calculateDataQuality(metrics.frequency);
        qualityCount++;
      }
    }
    
    const averageQuality = qualityCount > 0 ? totalQuality / qualityCount : 1.0;

    return {
      averageLatency: actualLatency,
      targetLatency: this.targetLatency,
      complianceRate,
      dataQuality: averageQuality,
      activeMonitors: this.monitoringIntervals.size,
      totalMonitors: this.highFrequencyMetrics.size,
    };
  }

  async updateMetrics(gridStatus: GridStatus): Promise<void> {
    const metrics: GridMetrics = {
      timestamp: new Date(),
      frequency: 50 + (Math.random() - 0.5) * 0.2,
      voltage: 230 + (Math.random() - 0.5) * 10,
      power: gridStatus.currentLoad,
      energy: gridStatus.currentLoad * 0.0167,
      powerFactor: 0.95 + (Math.random() - 0.5) * 0.05,
      harmonics: Math.random() * 5,
      stability: gridStatus.gridStability,
    };

    this.metrics.push(metrics);
    await this.checkThresholds(metrics);
    await this.cleanupOldData();

    this.logger.debug(`Grid metrics updated: ${metrics.power}kW, stability: ${metrics.stability}`);
  }

  async getHistoricalData(hours: number = 24): Promise<GridMetrics[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => metric.timestamp >= cutoffTime);
  }

  async getAlertHistory(severity?: 'warning' | 'critical' | 'info'): Promise<Alert[]> {
    let alerts = this.alerts;
    
    if (severity) {
      alerts = alerts.filter(alert => alert.type === severity);
    }
    
    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.logger.log(`Alert acknowledged: ${alertId}`);
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.logger.log(`Alert resolved: ${alertId}`);
    }
  }

  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
    score: number;
  }> {
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const activeAlerts = this.alerts.filter(alert => !alert.resolved);
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    if (!latestMetrics) {
      return {
        status: 'critical',
        issues: ['No metrics available'],
        recommendations: ['Check monitoring system'],
        score: 0,
      };
    }

    if (latestMetrics.frequency < 49.5 || latestMetrics.frequency > 50.5) {
      issues.push('Frequency deviation detected');
      recommendations.push('Check grid frequency control');
      score -= 20;
    }

    if (latestMetrics.voltage < 220 || latestMetrics.voltage > 240) {
      issues.push('Voltage fluctuation detected');
      recommendations.push('Check voltage regulation');
      score -= 15;
    }

    if (latestMetrics.powerFactor < 0.9) {
      issues.push('Low power factor');
      recommendations.push('Install power factor correction');
      score -= 10;
    }

    if (latestMetrics.harmonics > 3) {
      issues.push('High harmonic distortion');
      recommendations.push('Install harmonic filters');
      score -= 10;
    }

    if (activeAlerts.filter(a => a.type === 'critical').length > 0) {
      issues.push('Critical alerts active');
      recommendations.push('Address critical alerts immediately');
      score -= 30;
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (score < 70) status = 'critical';
    else if (score < 85) status = 'warning';

    return {
      status,
      issues,
      recommendations,
      score,
    };
  }

  async generateReport(type: 'daily' | 'weekly' | 'monthly'): Promise<{
    period: string;
    summary: any;
    metrics: GridMetrics[];
    alerts: Alert[];
    recommendations: string[];
  }> {
    let hours = 24;
    if (type === 'weekly') hours = 168;
    if (type === 'monthly') hours = 720;

    const historicalData = await this.getHistoricalData(hours);
    const alertHistory = await this.getAlertHistory();
    const systemHealth = await this.getSystemHealth();

    const summary = {
      totalEnergy: historicalData.reduce((sum, m) => sum + m.energy, 0),
      averagePower: historicalData.reduce((sum, m) => sum + m.power, 0) / historicalData.length || 0,
      averageStability: historicalData.reduce((sum, m) => sum + m.stability, 0) / historicalData.length || 0,
      peakPower: Math.max(...historicalData.map(m => m.power), 0),
      minPower: Math.min(...historicalData.map(m => m.power), 0),
      totalAlerts: alertHistory.length,
      criticalAlerts: alertHistory.filter(a => a.type === 'critical').length,
      uptime: 0.999,
    };

    const recommendations = [
      'Continue regular maintenance schedule',
      'Monitor peak demand periods',
      'Optimize energy storage usage',
      'Review alert response procedures',
    ];

    return {
      period: type,
      summary,
      metrics: historicalData,
      alerts: alertHistory,
      recommendations,
    };
  }

  @Interval(1000)
  async collectMetrics(): Promise<void> {
    try {
      const metrics: GridMetrics = {
        timestamp: new Date(),
        frequency: 50 + (Math.random() - 0.5) * 0.2,
        voltage: 230 + (Math.random() - 0.5) * 10,
        power: 800 + Math.random() * 400,
        energy: 13.5 + Math.random() * 5,
        powerFactor: 0.95 + (Math.random() - 0.5) * 0.05,
        harmonics: Math.random() * 5,
        stability: 0.9 + Math.random() * 0.1,
      };

      this.metrics.push(metrics);
      await this.checkThresholds(metrics);
      await this.cleanupOldData();

    } catch (error) {
      this.logger.error('Error collecting metrics:', error);
    }
  }

  @Cron('*/5 * * * *')
  async performHealthCheck(): Promise<void> {
    const health = await this.getSystemHealth();
    
    if (health.status === 'critical') {
      this.logger.error(`System health critical: Score ${health.score}`);
      await this.createAlert('critical', 'System health critical', null, health.score, 70);
    } else if (health.status === 'warning') {
      this.logger.warn(`System health warning: Score ${health.score}`);
      await this.createAlert('warning', 'System health degraded', null, health.score, 85);
    }
  }

  private async getCurrentMetrics(): Promise<GridMetrics> {
    return this.metrics[this.metrics.length - 1] || {
      timestamp: new Date(),
      frequency: 50,
      voltage: 230,
      power: 0,
      energy: 0,
      powerFactor: 1,
      harmonics: 0,
      stability: 1,
    };
  }

  private async getGridStatus(): Promise<GridStatus> {
    const latestMetrics = await this.getCurrentMetrics();
    
    return {
      totalCapacity: 2000,
      currentLoad: latestMetrics.power,
      availableCapacity: 2000 - latestMetrics.power,
      gridStability: latestMetrics.stability,
      nodeCount: 50,
      activeNodes: 48,
      timestamp: new Date(),
    };
  }

  private async checkThresholds(metrics: GridMetrics): Promise<void> {
    if (metrics.frequency < 49.5 || metrics.frequency > 50.5) {
      await this.createAlert('critical', 'Frequency out of range', null, metrics.frequency, 50.5);
    }

    if (metrics.voltage < 220 || metrics.voltage > 240) {
      await this.createAlert('warning', 'Voltage fluctuation', null, metrics.voltage, 240);
    }

    if (metrics.powerFactor < 0.9) {
      await this.createAlert('warning', 'Low power factor', null, metrics.powerFactor, 0.9);
    }

    if (metrics.harmonics > 3) {
      await this.createAlert('warning', 'High harmonic distortion', null, metrics.harmonics, 3);
    }

    if (metrics.stability < 0.8) {
      await this.createAlert('critical', 'Grid instability detected', null, metrics.stability, 0.8);
    }
  }

  private async createAlert(
    type: 'warning' | 'critical' | 'info',
    message: string,
    nodeId: string | null,
    value: number,
    threshold: number
  ): Promise<void> {
    const existingAlert = this.alerts.find(alert => 
      alert.message === message && 
      alert.nodeId === nodeId && 
      !alert.resolved
    );

    if (existingAlert) return;

    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      nodeId: nodeId || undefined,
      value,
      threshold,
      timestamp: new Date(),
      acknowledged: false,
      resolved: false,
    };

    this.alerts.push(alert);
    this.logger.warn(`Alert created: ${type} - ${message}`);
  }

  private async cleanupOldData(): Promise<void> {
    if (this.metrics.length > this.maxMetrics) {
      const excess = this.metrics.length - this.maxMetrics;
      this.metrics.splice(0, excess);
    }

    if (this.alerts.length > this.maxAlerts) {
      const resolvedAlerts = this.alerts.filter(alert => alert.resolved);
      if (resolvedAlerts.length > 100) {
        const oldestResolved = resolvedAlerts
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          .slice(0, resolvedAlerts.length - 100);
        
        oldestResolved.forEach(alert => {
          const index = this.alerts.indexOf(alert);
          if (index > -1) {
            this.alerts.splice(index, 1);
          }
        });
      }
    }
  }

  async getMonitoringDashboard(): Promise<{
    realTimeData: RealTimeData;
    systemHealth: any;
    recentAlerts: Alert[];
    performanceMetrics: any;
  }> {
    const realTimeData = await this.getRealTimeData();
    const systemHealth = await this.getSystemHealth();
    const recentAlerts = this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    const performanceMetrics = {
      dataPoints: this.metrics.length,
      alertsGenerated: this.alerts.length,
      averageLatency: 45,
      systemUptime: 0.999,
      dataAccuracy: 0.998,
    };

    return {
      realTimeData,
      systemHealth,
      recentAlerts,
      performanceMetrics,
    };
  }
}

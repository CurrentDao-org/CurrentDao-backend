import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { BalancingData } from '../entities/balancing-data.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BalancingCommand, BalancingCommandType } from '../dto/balancing-command.dto';
import * as ss from 'simple-statistics';

export interface StabilityMetrics {
  frequency: number;
  voltage: number;
  phaseAngle: number;
  powerFlow: number;
  oscillationDamping: number;
  transientStability: number;
  voltageStability: number;
  frequencyStability: number;
  overallStability: number;
  timestamp: Date;
}

export interface StabilityThreshold {
  frequencyMin: number;
  frequencyMax: number;
  voltageMin: number;
  voltageMax: number;
  phaseAngleMax: number;
  powerFlowMax: number;
  dampingMin: number;
}

export interface StabilityAlert {
  id: string;
  regionId: string;
  timestamp: Date;
  alertType: 'frequency' | 'voltage' | 'angle' | 'power_flow' | 'damping' | 'transient';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentValue: number;
  threshold: number;
  deviation: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  predictedTimeToCritical: number | null;
  recommendations: string[];
  isActive: boolean;
}

export interface GridStabilityReport {
  regionId: string;
  timestamp: Date;
  currentMetrics: StabilityMetrics;
  stabilityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  activeAlerts: StabilityAlert[];
  predictedInstability: {
    probability: number;
    timeToEvent: number | null;
    contributingFactors: string[];
  };
  recommendations: string[];
}

@Injectable()
export class StabilityMonitorService {
  private readonly logger = new Logger(StabilityMonitorService.name);
  private readonly STABILITY_THRESHOLD = 0.95;
  private readonly CRITICAL_THRESHOLD = 0.8;
  private readonly EARLY_WARNING_MINUTES = 5;
  
  // Stability tracking
  private metricsHistory = new Map<string, StabilityMetrics[]>();
  private activeAlerts = new Map<string, StabilityAlert>();
  private stabilityTrends = new Map<string, 'improving' | 'stable' | 'deteriorating'>();
  
  // Default thresholds
  private readonly defaultThresholds: StabilityThreshold = {
    frequencyMin: 49.5,
    frequencyMax: 50.5,
    voltageMin: 0.95,
    voltageMax: 1.05,
    phaseAngleMax: 30, // degrees
    powerFlowMax: 1000, // MW
    dampingMin: 0.1,
  };

  constructor(
    @InjectRepository(BalancingData)
    private readonly balancingRepository: Repository<BalancingData>,
  ) {}

  async monitorGridStability(regionId: string): Promise<GridStabilityReport> {
    this.logger.log(`Monitoring grid stability for region ${regionId}`);
    
    try {
      // Collect current stability metrics
      const currentMetrics = await this.collectStabilityMetrics(regionId);
      
      // Analyze stability trends
      const trends = await this.analyzeStabilityTrends(regionId, currentMetrics);
      
      // Check for stability violations
      const alerts = await this.checkStabilityThresholds(regionId, currentMetrics);
      
      // Predict future stability
      const prediction = await this.predictStability(regionId, currentMetrics, trends);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(alerts, prediction);
      
      // Calculate overall stability score
      const stabilityScore = this.calculateStabilityScore(currentMetrics, alerts);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(stabilityScore, alerts);
      
      const report: GridStabilityReport = {
        regionId,
        timestamp: new Date(),
        currentMetrics,
        stabilityScore,
        riskLevel,
        activeAlerts: Array.from(this.activeAlerts.values()).filter(alert => alert.regionId === regionId),
        predictedInstability: prediction,
        recommendations,
      };
      
      // Store stability data
      await this.storeStabilityData(report);
      
      this.logger.log(`Stability monitoring completed for region ${regionId}. Score: ${stabilityScore}, Risk: ${riskLevel}`);
      return report;
      
    } catch (error) {
      this.logger.error(`Stability monitoring failed for region ${regionId}: ${error.message}`);
      throw error;
    }
  }

  private async collectStabilityMetrics(regionId: string): Promise<StabilityMetrics> {
    // Get recent grid data
    const recentData = await this.balancingRepository.find({
      where: {
        regionId,
        timestamp: MoreThan(new Date(Date.now() - 5 * 60 * 1000)), // Last 5 minutes
      },
      order: { timestamp: 'DESC' },
      take: 20,
    });
    
    if (recentData.length === 0) {
      // Return default metrics if no data available
      return this.getDefaultMetrics();
    }
    
    // Calculate metrics from recent data
    const frequencies = recentData.map(d => d.gridFrequency || 50);
    const voltages = recentData.map(d => d.voltageLevel || 1.0);
    const loads = recentData.map(d => d.actualValue);
    
    // Basic metrics
    const frequency = ss.mean(frequencies);
    const voltage = ss.mean(voltages);
    const powerFlow = ss.mean(loads);
    
    // Advanced metrics (simulated/calculated)
    const phaseAngle = this.calculatePhaseAngle(frequency, powerFlow);
    const oscillationDamping = this.calculateOscillationDamping(frequencies);
    const transientStability = this.calculateTransientStability(frequency, voltage);
    const voltageStability = this.calculateVoltageStability(voltage, powerFlow);
    const frequencyStability = this.calculateFrequencyStability(frequencies);
    
    const overallStability = this.calculateOverallStability({
      frequency,
      voltage,
      phaseAngle,
      powerFlow,
      oscillationDamping,
      transientStability,
      voltageStability,
      frequencyStability,
    });
    
    const metrics: StabilityMetrics = {
      frequency,
      voltage,
      phaseAngle,
      powerFlow,
      oscillationDamping,
      transientStability,
      voltageStability,
      frequencyStability,
      overallStability,
      timestamp: new Date(),
    };
    
    // Store in history
    if (!this.metricsHistory.has(regionId)) {
      this.metricsHistory.set(regionId, []);
    }
    const history = this.metricsHistory.get(regionId)!;
    history.push(metrics);
    
    // Keep only last 1000 data points
    if (history.length > 1000) {
      history.shift();
    }
    
    return metrics;
  }

  private getDefaultMetrics(): StabilityMetrics {
    return {
      frequency: 50.0,
      voltage: 1.0,
      phaseAngle: 15.0,
      powerFlow: 500.0,
      oscillationDamping: 0.8,
      transientStability: 0.9,
      voltageStability: 0.95,
      frequencyStability: 0.98,
      overallStability: 1.0,
      timestamp: new Date(),
    };
  }

  private calculatePhaseAngle(frequency: number, powerFlow: number): number {
    // Simplified phase angle calculation
    const frequencyDeviation = Math.abs(frequency - 50);
    const powerFactor = Math.min(1.0, powerFlow / 1000);
    return frequencyDeviation * 10 + powerFactor * 20; // Simplified formula
  }

  private calculateOscillationDamping(frequencies: number[]): number {
    if (frequencies.length < 2) return 0.8;
    
    // Calculate damping from frequency oscillations
    const variance = ss.variance(frequencies);
    const maxOscillation = Math.max(...frequencies) - Math.min(...frequencies);
    
    // Higher variance and oscillation = lower damping
    const damping = Math.max(0.1, 1.0 - (variance * 10 + maxOscillation * 2));
    return Math.min(1.0, damping);
  }

  private calculateTransientStability(frequency: number, voltage: number): number {
    // Transient stability based on frequency and voltage deviations
    const frequencyDeviation = Math.abs(frequency - 50);
    const voltageDeviation = Math.abs(voltage - 1.0);
    
    const frequencyScore = Math.max(0, 1.0 - frequencyDeviation * 2);
    const voltageScore = Math.max(0, 1.0 - voltageDeviation * 10);
    
    return (frequencyScore + voltageScore) / 2;
  }

  private calculateVoltageStability(voltage: number, powerFlow: number): number {
    // Voltage stability margin
    const voltageDeviation = Math.abs(voltage - 1.0);
    const loadingFactor = Math.min(1.0, powerFlow / 1000);
    
    const voltageScore = Math.max(0, 1.0 - voltageDeviation * 20);
    const loadingScore = Math.max(0, 1.0 - loadingFactor * 0.5);
    
    return (voltageScore + loadingScore) / 2;
  }

  private calculateFrequencyStability(frequencies: number[]): number {
    if (frequencies.length < 2) return 1.0;
    
    // Frequency stability based on variance and rate of change
    const variance = ss.variance(frequencies);
    const rateOfChange = Math.abs(frequencies[frequencies.length - 1] - frequencies[0]);
    
    const varianceScore = Math.max(0, 1.0 - variance * 100);
    const rateScore = Math.max(0, 1.0 - rateOfChange * 10);
    
    return (varianceScore + rateScore) / 2;
  }

  private calculateOverallStability(metrics: Partial<StabilityMetrics>): number {
    // Weighted combination of all stability metrics
    const weights = {
      frequency: 0.25,
      voltage: 0.25,
      oscillationDamping: 0.15,
      transientStability: 0.15,
      voltageStability: 0.1,
      frequencyStability: 0.1,
    };
    
    let score = 0;
    let totalWeight = 0;
    
    for (const [metric, weight] of Object.entries(weights)) {
      if (metrics[metric as keyof StabilityMetrics] !== undefined) {
        score += (metrics[metric as keyof StabilityMetrics] as number) * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? score / totalWeight : 1.0;
  }

  private async analyzeStabilityTrends(
    regionId: string,
    currentMetrics: StabilityMetrics,
  ): Promise<'improving' | 'stable' | 'deteriorating'> {
    const history = this.metricsHistory.get(regionId) || [];
    
    if (history.length < 10) {
      return 'stable'; // Not enough data for trend analysis
    }
    
    // Analyze trend over last 10 data points
    const recentHistory = history.slice(-10);
    const overallStabilityTrend = recentHistory.map(m => m.overallStability);
    
    // Calculate trend slope
    const slope = this.calculateTrendSlope(overallStabilityTrend);
    
    // Determine trend based on slope
    if (slope > 0.01) {
      return 'improving';
    } else if (slope < -0.01) {
      return 'deteriorating';
    } else {
      return 'stable';
    }
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = ss.sum(x);
    const sumY = ss.sum(y);
    const sumXY = ss.sum(x.map((xi, i) => xi * y[i]));
    const sumXX = ss.sum(x.map(xi => xi * xi));
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
  }

  private async checkStabilityThresholds(
    regionId: string,
    metrics: StabilityMetrics,
  ): Promise<StabilityAlert[]> {
    const alerts: StabilityAlert[] = [];
    const thresholds = await this.getRegionThresholds(regionId);
    
    // Check frequency thresholds
    if (metrics.frequency < thresholds.frequencyMin || metrics.frequency > thresholds.frequencyMax) {
      alerts.push(this.createAlert(
        regionId,
        'frequency',
        metrics.frequency,
        metrics.frequency < thresholds.frequencyMin ? thresholds.frequencyMin : thresholds.frequencyMax,
        metrics.frequency < thresholds.frequencyMin ? 'under-frequency' : 'over-frequency',
      ));
    }
    
    // Check voltage thresholds
    if (metrics.voltage < thresholds.voltageMin || metrics.voltage > thresholds.voltageMax) {
      alerts.push(this.createAlert(
        regionId,
        'voltage',
        metrics.voltage,
        metrics.voltage < thresholds.voltageMin ? thresholds.voltageMin : thresholds.voltageMax,
        metrics.voltage < thresholds.voltageMin ? 'under-voltage' : 'over-voltage',
      ));
    }
    
    // Check phase angle
    if (Math.abs(metrics.phaseAngle) > thresholds.phaseAngleMax) {
      alerts.push(this.createAlert(
        regionId,
        'angle',
        metrics.phaseAngle,
        thresholds.phaseAngleMax,
        'excessive phase angle',
      ));
    }
    
    // Check power flow
    if (Math.abs(metrics.powerFlow) > thresholds.powerFlowMax) {
      alerts.push(this.createAlert(
        regionId,
        'power_flow',
        metrics.powerFlow,
        thresholds.powerFlowMax,
        'excessive power flow',
      ));
    }
    
    // Check damping
    if (metrics.oscillationDamping < thresholds.dampingMin) {
      alerts.push(this.createAlert(
        regionId,
        'damping',
        metrics.oscillationDamping,
        thresholds.dampingMin,
        'insufficient oscillation damping',
      ));
    }
    
    // Check overall stability
    if (metrics.overallStability < this.CRITICAL_THRESHOLD) {
      alerts.push(this.createAlert(
        regionId,
        'transient',
        metrics.overallStability,
        this.CRITICAL_THRESHOLD,
        'critical stability level',
      ));
    }
    
    // Update active alerts
    for (const alert of alerts) {
      this.activeAlerts.set(alert.id, alert);
    }
    
    return alerts;
  }

  private createAlert(
    regionId: string,
    alertType: StabilityAlert['alertType'],
    currentValue: number,
    threshold: number,
    reason: string,
  ): StabilityAlert {
    const deviation = Math.abs(currentValue - threshold);
    const severity = this.calculateAlertSeverity(deviation, alertType);
    
    return {
      id: `alert-${regionId}-${alertType}-${Date.now()}`,
      regionId,
      timestamp: new Date(),
      alertType,
      severity,
      currentValue,
      threshold,
      deviation,
      trend: 'stable', // Will be updated in trend analysis
      predictedTimeToCritical: null, // Will be calculated in prediction
      recommendations: this.getAlertRecommendations(alertType, severity),
      isActive: true,
    };
  }

  private calculateAlertSeverity(deviation: number, alertType: string): StabilityAlert['severity'] {
    // Severity based on deviation magnitude and alert type
    const severityThresholds = {
      frequency: { low: 0.1, medium: 0.3, high: 0.5 },
      voltage: { low: 0.02, medium: 0.05, high: 0.08 },
      angle: { low: 5, medium: 15, high: 25 },
      power_flow: { low: 100, medium: 300, high: 500 },
      damping: { low: 0.05, medium: 0.1, high: 0.15 },
      transient: { low: 0.05, medium: 0.1, high: 0.15 },
    };
    
    const thresholds = severityThresholds[alertType as keyof typeof severityThresholds] || severityThresholds.frequency;
    
    if (deviation >= thresholds.high) return 'critical';
    if (deviation >= thresholds.medium) return 'high';
    if (deviation >= thresholds.low) return 'medium';
    return 'low';
  }

  private getAlertRecommendations(alertType: string, severity: string): string[] {
    const recommendations = {
      frequency: {
        low: ['Monitor frequency closely', 'Check generation-load balance'],
        medium: ['Prepare frequency response', 'Activate secondary control'],
        high: ['Activate primary frequency response', 'Prepare load shedding'],
        critical: ['Immediate load shedding required', 'Emergency generator activation'],
      },
      voltage: {
        low: ['Check voltage support', 'Monitor reactive power'],
        medium: ['Adjust transformer taps', 'Activate reactive power support'],
        high: ['Emergency voltage support', 'Reduce reactive power load'],
        critical: ['Immediate voltage correction', 'Consider system separation'],
      },
      angle: {
        low: ['Monitor power flows', 'Check transmission loading'],
        medium: ['Adjust generation dispatch', 'Reduce power transfers'],
        high: ['Redispatch generation', 'Reduce interface flows'],
        critical: ['System separation required', 'Emergency redispatch'],
      },
      power_flow: {
        low: ['Monitor transmission loading', 'Check thermal limits'],
        medium: ['Reduce parallel flows', 'Adjust generation pattern'],
        high: ['Emergency flow reduction', 'Activate FACTS devices'],
        critical: ['Immediate flow reduction', 'System separation'],
      },
      damping: {
        low: ['Monitor oscillations', 'Check PSS settings'],
        medium: ['Adjust PSS parameters', 'Reduce power transfers'],
        high: ['Emergency damping measures', 'System reconfiguration'],
        critical: ['Immediate system stabilization', 'Emergency separation'],
      },
      transient: {
        low: ['Monitor system stability', 'Check fault clearing'],
        medium: ['Adjust protection settings', 'Reduce system stress'],
        high: ['Emergency stabilization', 'Load reduction'],
        critical: ['Immediate emergency action', 'System separation'],
      },
    };
    
    return recommendations[alertType as keyof typeof recommendations]?.[severity as keyof typeof recommendations.frequency] || 
           ['Monitor situation closely', 'Prepare contingency actions'];
  }

  private async getRegionThresholds(regionId: string): Promise<StabilityThreshold> {
    // In a real implementation, this would fetch region-specific thresholds
    // For now, return default thresholds
    return { ...this.defaultThresholds };
  }

  private async predictStability(
    regionId: string,
    currentMetrics: StabilityMetrics,
    trend: 'improving' | 'stable' | 'deteriorating',
  ): Promise<{
    probability: number;
    timeToEvent: number | null;
    contributingFactors: string[];
  }> {
    const history = this.metricsHistory.get(regionId) || [];
    
    if (history.length < 20) {
      return {
        probability: 0.05,
        timeToEvent: null,
        contributingFactors: ['Insufficient historical data'],
      };
    }
    
    // Analyze contributing factors
    const factors: string[] = [];
    let riskScore = 0;
    
    if (currentMetrics.frequencyStability < 0.9) {
      factors.push('Frequency instability');
      riskScore += 0.3;
    }
    
    if (currentMetrics.voltageStability < 0.9) {
      factors.push('Voltage instability');
      riskScore += 0.3;
    }
    
    if (currentMetrics.oscillationDamping < 0.5) {
      factors.push('Poor oscillation damping');
      riskScore += 0.2;
    }
    
    if (trend === 'deteriorating') {
      factors.push('Deteriorating trend');
      riskScore += 0.2;
    }
    
    // Calculate probability based on risk score and trend
    let probability = riskScore;
    if (trend === 'deteriorating') {
      probability *= 1.5;
    } else if (trend === 'improving') {
      probability *= 0.5;
    }
    
    probability = Math.min(1.0, Math.max(0.0, probability));
    
    // Predict time to instability if probability is high
    let timeToEvent: number | null = null;
    if (probability > 0.3) {
      const recentTrend = history.slice(-10).map(m => m.overallStability);
      const trendSlope = this.calculateTrendSlope(recentTrend);
      
      if (trendSlope < 0) {
        const timeToCritical = (currentMetrics.overallStability - this.CRITICAL_THRESHOLD) / Math.abs(trendSlope);
        timeToEvent = Math.max(1, Math.round(timeToCritical * 60)); // Convert to minutes
      }
    }
    
    return {
      probability,
      timeToEvent,
      contributingFactors: factors,
    };
  }

  private generateRecommendations(
    alerts: StabilityAlert[],
    prediction: { probability: number; timeToEvent: number | null; contributingFactors: string[] },
  ): string[] {
    const recommendations: string[] = [];
    
    // Add alert-specific recommendations
    alerts.forEach(alert => {
      recommendations.push(...alert.recommendations);
    });
    
    // Add prediction-based recommendations
    if (prediction.probability > 0.5) {
      recommendations.push('High instability probability detected');
      recommendations.push('Prepare emergency response measures');
      
      if (prediction.timeToEvent && prediction.timeToEvent < 30) {
        recommendations.push(`Instability predicted in ${prediction.timeToEvent} minutes`);
        recommendations.push('Consider preventive load shedding');
      }
    }
    
    // Add factor-specific recommendations
    prediction.contributingFactors.forEach(factor => {
      switch (factor) {
        case 'Frequency instability':
          recommendations.push('Strengthen frequency control measures');
          break;
        case 'Voltage instability':
          recommendations.push('Enhance voltage support systems');
          break;
        case 'Poor oscillation damping':
          recommendations.push('Adjust power system stabilizers');
          break;
        case 'Deteriorating trend':
          recommendations.push('Implement corrective actions immediately');
          break;
      }
    });
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  private calculateStabilityScore(metrics: StabilityMetrics, alerts: StabilityAlert[]): number {
    let score = metrics.overallStability;
    
    // Penalize for active alerts
    alerts.forEach(alert => {
      switch (alert.severity) {
        case 'critical':
          score -= 0.3;
          break;
        case 'high':
          score -= 0.2;
          break;
        case 'medium':
          score -= 0.1;
          break;
        case 'low':
          score -= 0.05;
          break;
      }
    });
    
    return Math.max(0, Math.min(1, score));
  }

  private determineRiskLevel(
    stabilityScore: number,
    alerts: StabilityAlert[],
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    
    if (criticalAlerts > 0 || stabilityScore < 0.7) return 'critical';
    if (highAlerts > 2 || stabilityScore < 0.8) return 'high';
    if (alerts.length > 0 || stabilityScore < 0.9) return 'medium';
    return 'low';
  }

  private async storeStabilityData(report: GridStabilityReport): Promise<void> {
    // Store current stability metrics
    const stabilityData = this.balancingRepository.create({
      regionId: report.regionId,
      timestamp: report.timestamp,
      forecastType: 'stability',
      actualValue: report.currentMetrics.overallStability,
      predictedValue: report.predictedInstability.probability,
      confidence: 0.9,
      gridFrequency: report.currentMetrics.frequency,
      voltageLevel: report.currentMetrics.voltage,
      loadFactor: report.currentMetrics.powerFlow / 1000,
      metadata: {
        source: 'stability_monitor',
        algorithm: 'real_time_monitoring',
        parameters: {
          stabilityScore: report.stabilityScore,
          riskLevel: report.riskLevel,
          alertCount: report.activeAlerts.length,
          contributingFactors: report.predictedInstability.contributingFactors,
        },
      },
      status: report.riskLevel === 'critical' ? 'emergency' : 'active',
    });
    
    await this.balancingRepository.save(stabilityData);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async performContinuousMonitoring(): Promise<void> {
    try {
      const activeRegions = await this.getActiveRegions();
      
      for (const regionId of activeRegions) {
        await this.monitorGridStability(regionId);
      }
      
      // Clean up old alerts
      await this.cleanupOldAlerts();
      
      this.logger.log(`Continuous monitoring completed for ${activeRegions.length} regions`);
    } catch (error) {
      this.logger.error(`Continuous monitoring failed: ${error.message}`);
    }
  }

  private async getActiveRegions(): Promise<string[]> {
    const result = await this.balancingRepository
      .createQueryBuilder('data')
      .select('DISTINCT data.regionId', 'regionId')
      .where('data.timestamp > :date', { date: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .getRawMany();
    
    return result.map(r => r.regionId);
  }

  private async cleanupOldAlerts(): Promise<void> {
    const cutoff = Date.now() - 3600000; // 1 hour ago
    
    for (const [id, alert] of this.activeAlerts) {
      if (alert.timestamp.getTime() < cutoff) {
        alert.isActive = false;
        this.activeAlerts.delete(id);
      }
    }
  }

  async getStabilityReport(regionId: string): Promise<GridStabilityReport> {
    return this.monitorGridStability(regionId);
  }

  async getActiveAlerts(regionId?: string): Promise<StabilityAlert[]> {
    const alerts = Array.from(this.activeAlerts.values());
    return regionId ? alerts.filter(alert => alert.regionId === regionId) : alerts;
  }

  async getStabilityMetrics(regionId: string, hours: number = 24): Promise<StabilityMetrics[]> {
    const history = this.metricsHistory.get(regionId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return history.filter(metrics => metrics.timestamp > cutoff);
  }
}

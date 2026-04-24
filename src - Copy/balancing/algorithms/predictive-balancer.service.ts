import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { BalancingData } from '../entities/balancing-data.entity';
import { DemandForecastService, ForecastResult } from '../forecasting/demand-forecast.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as ss from 'simple-statistics';

export interface BalancingDecision {
  id: string;
  regionId: string;
  timestamp: Date;
  action: 'increase_supply' | 'decrease_supply' | 'load_shift' | 'emergency_shed';
  sourceId: string;
  amount: number;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  expectedImpact: number;
  duration: number;
  reason: string;
}

export interface GridState {
  frequency: number;
  voltage: number;
  loadFactor: number;
  reserveMargin: number;
  stabilityScore: number;
  timestamp: Date;
}

export interface BalancingMetrics {
  totalDecisions: number;
  successfulAdjustments: number;
  preventedInstabilities: number;
  averageResponseTime: number;
  gridStabilityScore: number;
}

@Injectable()
export class PredictiveBalancerService {
  private readonly logger = new Logger(PredictiveBalancerService.name);
  private readonly GRID_STABILITY_THRESHOLD = 0.95;
  private readonly EMERGENCY_THRESHOLD = 0.8;
  private readonly MAX_RESPONSE_TIME_MS = 30000;
  
  // Active balancing decisions
  private activeDecisions = new Map<string, BalancingDecision>();
  private decisionHistory: BalancingDecision[] = [];
  
  // Grid state tracking
  private gridStateHistory: GridState[] = [];
  private readonly GRID_STATE_WINDOW = 1000; // Keep last 1000 states

  constructor(
    @InjectRepository(BalancingData)
    private readonly balancingRepository: Repository<BalancingData>,
    private readonly demandForecastService: DemandForecastService,
  ) {}

  async performPredictiveBalancing(regionId: string): Promise<BalancingDecision[]> {
    this.logger.log(`Performing predictive balancing for region ${regionId}`);
    
    try {
      // Get current grid state
      const currentState = await this.getCurrentGridState(regionId);
      
      // Get demand forecasts
      const forecasts = await this.demandForecastService.generateDemandForecast(regionId, 24);
      
      // Analyze grid stability
      const stabilityAnalysis = await this.analyzeGridStability(regionId, forecasts);
      
      // Generate balancing decisions
      const decisions = await this.generateBalancingDecisions(
        regionId,
        currentState,
        forecasts,
        stabilityAnalysis,
      );
      
      // Execute high-priority decisions
      const executedDecisions = await this.executeBalancingDecisions(decisions);
      
      // Update metrics
      await this.updateBalancingMetrics(regionId, executedDecisions);
      
      this.logger.log(`Generated ${executedDecisions.length} balancing decisions`);
      return executedDecisions;
      
    } catch (error) {
      this.logger.error(`Predictive balancing failed: ${error.message}`);
      throw error;
    }
  }

  private async getCurrentGridState(regionId: string): Promise<GridState> {
    const latestData = await this.balancingRepository.find({
      where: {
        regionId,
        timestamp: MoreThan(new Date(Date.now() - 5 * 60 * 1000)), // Last 5 minutes
      },
      order: { timestamp: 'DESC' },
      take: 10,
    });
    
    if (latestData.length === 0) {
      // Return default state if no recent data
      return {
        frequency: 50.0,
        voltage: 1.0,
        loadFactor: 0.7,
        reserveMargin: 0.15,
        stabilityScore: 1.0,
        timestamp: new Date(),
      };
    }
    
    const mostRecent = latestData[0];
    const avgFrequency = ss.mean(latestData.map(d => d.gridFrequency || 50));
    const avgVoltage = ss.mean(latestData.map(d => d.voltageLevel || 1.0));
    const avgLoadFactor = ss.mean(latestData.map(d => d.loadFactor || 0.7));
    
    // Calculate reserve margin (simplified)
    const totalDemand = ss.mean(latestData.map(d => d.actualValue));
    const totalSupply = totalDemand * (1 + 0.15); // Assume 15% reserve
    const reserveMargin = (totalSupply - totalDemand) / totalSupply;
    
    // Calculate stability score
    const frequencyDeviation = Math.abs(avgFrequency - 50);
    const voltageDeviation = Math.abs(avgVoltage - 1.0);
    const stabilityScore = Math.max(0, 1 - (frequencyDeviation * 0.1 + voltageDeviation * 0.5));
    
    return {
      frequency: avgFrequency,
      voltage: avgVoltage,
      loadFactor: avgLoadFactor,
      reserveMargin,
      stabilityScore,
      timestamp: mostRecent.timestamp,
    };
  }

  private async analyzeGridStability(
    regionId: string,
    forecasts: ForecastResult[],
  ): Promise<{
    currentStability: number;
    predictedStability: number;
    riskFactors: string[];
    timeToInstability: number | null;
  }> {
    // Get historical stability data
    const historicalData = await this.balancingRepository.find({
      where: {
        regionId,
        forecastType: 'stability',
        timestamp: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // Last 7 days
      },
      order: { timestamp: 'ASC' },
    });
    
    // Current stability based on recent data
    const currentStability = historicalData.length > 0 
      ? ss.mean(historicalData.slice(-10).map(d => d.actualValue))
      : 1.0;
    
    // Predict future stability based on forecasts
    const predictedDemand = forecasts.map(f => f.predictedValue);
    const demandVolatility = ss.standardDeviation(predictedDemand) / ss.mean(predictedDemand);
    
    // Risk factors analysis
    const riskFactors: string[] = [];
    if (demandVolatility > 0.2) riskFactors.push('high_demand_volatility');
    if (currentStability < this.GRID_STABILITY_THRESHOLD) riskFactors.push('low_current_stability');
    if (forecasts.some(f => f.confidence < 0.7)) riskFactors.push('low_forecast_confidence');
    
    // Predict stability decay
    const stabilityDecay = demandVolatility * 0.3 + (1 - currentStability) * 0.4;
    const predictedStability = Math.max(0, currentStability - stabilityDecay);
    
    // Time to instability prediction
    let timeToInstability: number | null = null;
    if (predictedStability < this.EMERGENCY_THRESHOLD) {
      // Find when stability crosses emergency threshold
      for (let i = 0; i < forecasts.length; i++) {
        const futureStability = currentStability - (stabilityDecay * (i + 1) / 24);
        if (futureStability < this.EMERGENCY_THRESHOLD) {
          timeToInstability = i + 1; // hours
          break;
        }
      }
    }
    
    return {
      currentStability,
      predictedStability,
      riskFactors,
      timeToInstability,
    };
  }

  private async generateBalancingDecisions(
    regionId: string,
    currentState: GridState,
    forecasts: ForecastResult[],
    stabilityAnalysis: any,
  ): Promise<BalancingDecision[]> {
    const decisions: BalancingDecision[] = [];
    
    // Check for immediate stability issues
    if (currentState.stabilityScore < this.EMERGENCY_THRESHOLD) {
      decisions.push(...await this.generateEmergencyActions(regionId, currentState));
    }
    
    // Check for predicted instability
    if (stabilityAnalysis.predictedStability < this.GRID_STABILITY_THRESHOLD) {
      decisions.push(...await this.generatePreemptiveActions(
        regionId,
        currentState,
        forecasts,
        stabilityAnalysis,
      ));
    }
    
    // Check for optimization opportunities
    if (currentState.stabilityScore > this.GRID_STABILITY_THRESHOLD) {
      decisions.push(...await this.generateOptimizationActions(
        regionId,
        currentState,
        forecasts,
      ));
    }
    
    // Prioritize decisions
    return this.prioritizeDecisions(decisions);
  }

  private async generateEmergencyActions(
    regionId: string,
    currentState: GridState,
  ): Promise<BalancingDecision[]> {
    const decisions: BalancingDecision[] = [];
    
    // Emergency load shedding if frequency is critical
    if (Math.abs(currentState.frequency - 50) > 0.5) {
      decisions.push({
        id: `emergency-shed-${Date.now()}`,
        regionId,
        timestamp: new Date(),
        action: 'emergency_shed',
        sourceId: 'grid-operator',
        amount: 0.1, // 10% load reduction
        confidence: 0.95,
        priority: 'critical',
        expectedImpact: 0.8,
        duration: 15, // 15 minutes
        reason: 'Critical frequency deviation detected',
      });
    }
    
    // Rapid supply increase if under-frequency
    if (currentState.frequency < 49.5) {
      decisions.push({
        id: `emergency-supply-${Date.now()}`,
        regionId,
        timestamp: new Date(),
        action: 'increase_supply',
        sourceId: 'reserve-generator',
        amount: 0.15, // 15% supply increase
        confidence: 0.9,
        priority: 'critical',
        expectedImpact: 0.7,
        duration: 30, // 30 minutes
        reason: 'Under-frequency emergency response',
      });
    }
    
    return decisions;
  }

  private async generatePreemptiveActions(
    regionId: string,
    currentState: GridState,
    forecasts: ForecastResult[],
    stabilityAnalysis: any,
  ): Promise<BalancingDecision[]> {
    const decisions: BalancingDecision[] = [];
    
    // Find peak demand periods
    const peakForecasts = forecasts
      .filter(f => f.predictedValue > ss.mean(forecasts.map(f => f.predictedValue)) * 1.2)
      .slice(0, 6); // Next 6 peak periods
    
    for (const forecast of peakForecasts) {
      const hoursToPeak = (forecast.timestamp.getTime() - Date.now()) / (1000 * 60 * 60);
      
      if (hoursToPeak > 0 && hoursToPeak <= 6) {
        // Preemptive supply increase
        decisions.push({
          id: `preemptive-supply-${forecast.timestamp.getTime()}`,
          regionId,
          timestamp: new Date(Date.now() + (hoursToPeak - 1) * 60 * 60 * 1000), // 1 hour before peak
          action: 'increase_supply',
          sourceId: 'peaking-plant',
          amount: Math.min(0.2, (forecast.predictedValue - ss.mean(forecasts.map(f => f.predictedValue))) / forecast.predictedValue),
          confidence: forecast.confidence * 0.8,
          priority: 'high',
          expectedImpact: 0.6,
          duration: 4, // 4 hours
          reason: `Preemptive action for predicted peak demand in ${Math.round(hoursToPeak)}h`,
        });
      }
    }
    
    // Load shifting for demand management
    if (stabilityAnalysis.riskFactors.includes('high_demand_volatility')) {
      decisions.push({
        id: `load-shift-${Date.now()}`,
        regionId,
        timestamp: new Date(),
        action: 'load_shift',
        sourceId: 'demand-response',
        amount: 0.05, // 5% load shift
        confidence: 0.7,
        priority: 'medium',
        expectedImpact: 0.4,
        duration: 8, // 8 hours
        reason: 'Load shifting to reduce demand volatility',
      });
    }
    
    return decisions;
  }

  private async generateOptimizationActions(
    regionId: string,
    currentState: GridState,
    forecasts: ForecastResult[],
  ): Promise<BalancingDecision[]> {
    const decisions: BalancingDecision[] = [];
    
    // Optimize reserve margin if too high
    if (currentState.reserveMargin > 0.25) {
      decisions.push({
        id: `optimize-reserve-${Date.now()}`,
        regionId,
        timestamp: new Date(),
        action: 'decrease_supply',
        sourceId: 'efficient-generator',
        amount: Math.min(0.1, currentState.reserveMargin - 0.15),
        confidence: 0.8,
        priority: 'low',
        expectedImpact: 0.3,
        duration: 6, // 6 hours
        reason: 'Optimization of excessive reserve margin',
      });
    }
    
    // Distributed generation optimization
    const lowDemandPeriods = forecasts
      .filter(f => f.predictedValue < ss.mean(forecasts.map(f => f.predictedValue)) * 0.8)
      .slice(0, 3);
    
    for (const forecast of lowDemandPeriods) {
      decisions.push({
        id: `optimize-dg-${forecast.timestamp.getTime()}`,
        regionId,
        timestamp: forecast.timestamp,
        action: 'load_shift',
        sourceId: 'distributed-generation',
        amount: 0.03, // 3% optimization
        confidence: forecast.confidence * 0.9,
        priority: 'low',
        expectedImpact: 0.2,
        duration: 2, // 2 hours
        reason: 'Distributed generation optimization during low demand',
      });
    }
    
    return decisions;
  }

  private prioritizeDecisions(decisions: BalancingDecision[]): BalancingDecision[] {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return decisions.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by expected impact
      return b.expectedImpact - a.expectedImpact;
    });
  }

  private async executeBalancingDecisions(decisions: BalancingDecision[]): Promise<BalancingDecision[]> {
    const executed: BalancingDecision[] = [];
    const maxConcurrent = 10; // Limit concurrent adjustments
    
    for (let i = 0; i < Math.min(decisions.length, maxConcurrent); i++) {
      const decision = decisions[i];
      
      try {
        // Simulate execution time
        const startTime = Date.now();
        
        // Execute the balancing action
        await this.executeBalancingAction(decision);
        
        const responseTime = Date.now() - startTime;
        
        if (responseTime <= this.MAX_RESPONSE_TIME_MS) {
          // Track successful execution
          this.activeDecisions.set(decision.id, decision);
          this.decisionHistory.push(decision);
          executed.push(decision);
          
          this.logger.log(`Executed balancing decision ${decision.id} in ${responseTime}ms`);
        } else {
          this.logger.warn(`Balancing decision ${decision.id} exceeded response time limit`);
        }
        
      } catch (error) {
        this.logger.error(`Failed to execute balancing decision ${decision.id}: ${error.message}`);
      }
    }
    
    return executed;
  }

  private async executeBalancingAction(decision: BalancingDecision): Promise<void> {
    // Store the balancing action in database
    const balancingData = this.balancingRepository.create({
      regionId: decision.regionId,
      timestamp: decision.timestamp,
      forecastType: 'supply',
      actualValue: 0, // Will be updated when actual effect is known
      predictedValue: decision.amount,
      confidence: decision.confidence,
      metadata: {
        source: 'predictive_balancer',
        algorithm: 'predictive_balancing',
        parameters: {
          action: decision.action,
          sourceId: decision.sourceId,
          priority: decision.priority,
          reason: decision.reason,
        },
      },
      status: 'active',
      adjustments: [{
        type: decision.action.includes('supply') ? 'supply' : 'demand',
        amount: decision.amount,
        timestamp: decision.timestamp,
        reason: decision.reason,
      }],
    });
    
    await this.balancingRepository.save(balancingData);
  }

  private async updateBalancingMetrics(regionId: string, decisions: BalancingDecision[]): Promise<void> {
    // Store performance metrics
    const metricsData = this.balancingRepository.create({
      regionId,
      timestamp: new Date(),
      forecastType: 'stability',
      actualValue: this.calculateStabilityScore(decisions),
      predictedValue: this.GRID_STABILITY_THRESHOLD,
      confidence: 0.9,
      metadata: {
        source: 'predictive_balancer',
        algorithm: 'performance_metrics',
        parameters: {
          totalDecisions: decisions.length,
          successfulAdjustments: decisions.length,
          averageResponseTime: this.calculateAverageResponseTime(decisions),
        },
      },
      status: 'active',
    });
    
    await this.balancingRepository.save(metricsData);
  }

  private calculateStabilityScore(decisions: BalancingDecision[]): number {
    if (decisions.length === 0) return 1.0;
    
    const totalImpact = decisions.reduce((sum, d) => sum + d.expectedImpact, 0);
    const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;
    
    return Math.min(1.0, (totalImpact * avgConfidence) / decisions.length);
  }

  private calculateAverageResponseTime(decisions: BalancingDecision[]): number {
    // Simulate response times based on decision complexity
    return decisions.reduce((sum, d) => {
      const complexity = d.priority === 'critical' ? 5000 : 
                        d.priority === 'high' ? 10000 : 
                        d.priority === 'medium' ? 15000 : 20000;
      return sum + complexity;
    }, 0) / decisions.length;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async performContinuousBalancing(): Promise<void> {
    try {
      const activeRegions = await this.getActiveRegions();
      
      for (const regionId of activeRegions) {
        await this.performPredictiveBalancing(regionId);
      }
      
      this.logger.log(`Continuous balancing completed for ${activeRegions.length} regions`);
    } catch (error) {
      this.logger.error(`Continuous balancing failed: ${error.message}`);
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

  async getBalancingMetrics(regionId: string, days: number = 7): Promise<BalancingMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const decisions = await this.balancingRepository.find({
      where: {
        regionId,
        forecastType: 'supply',
        timestamp: MoreThan(startDate),
        status: 'active',
      },
    });
    
    const stabilityData = await this.balancingRepository.find({
      where: {
        regionId,
        forecastType: 'stability',
        timestamp: MoreThan(startDate),
      },
    });
    
    const totalDecisions = decisions.length;
    const successfulAdjustments = decisions.filter(d => d.predictedValue > 0).length;
    const preventedInstabilities = stabilityData.filter(d => d.actualValue > this.EMERGENCY_THRESHOLD).length;
    const averageResponseTime = this.calculateAverageResponseTime(this.decisionHistory.slice(-100));
    const gridStabilityScore = stabilityData.length > 0 
      ? ss.mean(stabilityData.map(d => d.actualValue))
      : 1.0;
    
    return {
      totalDecisions,
      successfulAdjustments,
      preventedInstabilities,
      averageResponseTime,
      gridStabilityScore,
    };
  }
}

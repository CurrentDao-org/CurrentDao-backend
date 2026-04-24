import { Injectable, Logger } from '@nestjs/common';
import { MicrogridNode, GridStatus, EnergyOptimizationResult } from '../microgrid.service';

export interface EnergyFlow {
  from: string;
  to: string;
  amount: number;
  cost: number;
  efficiency: number;
  timestamp: Date;
}

export interface EnergyForecast {
  timestamp: Date;
  demand: number;
  supply: number;
  price: number;
  confidence: number;
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  expectedSavings: number;
  implementation: string[];
  priority: 'high' | 'medium' | 'low';
}

@Injectable()
export class EnergyManagementService {
  private readonly logger = new Logger(EnergyManagementService.name);
  private readonly energyFlows: EnergyFlow[] = [];
  private readonly forecasts: EnergyForecast[] = [];

  async optimizeEnergyFlow(
    nodes: MicrogridNode[],
    gridStatus: GridStatus
  ): Promise<EnergyOptimizationResult> {
    this.logger.log('Starting energy flow optimization');

    const currentCost = this.calculateCurrentCost(nodes, gridStatus);
    const optimizationPlan = await this.generateOptimizationPlan(nodes, gridStatus);
    const optimizedCost = this.calculateOptimizedCost(optimizationPlan, gridStatus);

    const savings = currentCost - optimizedCost;
    const savingsPercentage = currentCost > 0 ? (savings / currentCost) * 100 : 0;

    await this.implementOptimization(optimizationPlan);

    const result: EnergyOptimizationResult = {
      originalCost: currentCost,
      optimizedCost,
      savings,
      savingsPercentage,
      recommendations: this.generateRecommendations(optimizationPlan),
      redistributionPlan: this.createRedistributionPlan(optimizationPlan),
    };

    this.logger.log(`Energy optimization completed: ${savingsPercentage.toFixed(2)}% savings`);
    return result;
  }

  async getCurrentMarketPrice(): Promise<number> {
    const basePrice = 0.12;
    const demandMultiplier = 1 + Math.random() * 0.5;
    const timeMultiplier = this.getTimeMultiplier();
    
    return basePrice * demandMultiplier * timeMultiplier;
  }

  async getTradingRecommendations(surplusEnergy: number): Promise<string[]> {
    const recommendations: string[] = [];
    const marketPrice = await this.getCurrentMarketPrice();

    if (surplusEnergy > 100) {
      recommendations.push(`Sell ${Math.min(surplusEnergy, 500)} kWh at current market rate $${marketPrice.toFixed(4)}/kWh`);
    }

    if (marketPrice > 0.15) {
      recommendations.push('Consider increasing generation capacity to capitalize on high market prices');
    }

    if (marketPrice < 0.08) {
      recommendations.push('Store excess energy rather than selling at low market prices');
    }

    return recommendations;
  }

  async generateEnergyForecast(hours: number = 24): Promise<EnergyForecast[]> {
    const forecasts: EnergyForecast[] = [];
    const currentTime = new Date();

    for (let i = 0; i < hours; i++) {
      const forecastTime = new Date(currentTime.getTime() + i * 60 * 60 * 1000);
      
      const demand = this.calculateDemandForecast(forecastTime);
      const supply = this.calculateSupplyForecast(forecastTime);
      const price = await this.getCurrentMarketPrice();
      const confidence = 0.7 + Math.random() * 0.3;

      forecasts.push({
        timestamp: forecastTime,
        demand,
        supply,
        price,
        confidence,
      });
    }

    this.forecasts.push(...forecasts);
    return forecasts;
  }

  async getOptimizationStrategies(): Promise<OptimizationStrategy[]> {
    return [
      {
        name: 'Peak Shaving',
        description: 'Reduce consumption during peak hours to minimize costs',
        expectedSavings: 0.15,
        implementation: [
          'Shift non-critical loads to off-peak hours',
          'Increase battery discharge during peaks',
          'Implement demand response programs',
        ],
        priority: 'high',
      },
      {
        name: 'Load Shifting',
        description: 'Move flexible loads to periods of high renewable generation',
        expectedSavings: 0.12,
        implementation: [
          'Schedule charging during solar peak hours',
          'Adjust HVAC setpoints based on generation',
          'Coordinate industrial processes with renewable availability',
        ],
        priority: 'medium',
      },
      {
        name: 'Storage Optimization',
        description: 'Optimize battery charging/discharging cycles',
        expectedSavings: 0.08,
        implementation: [
          'Charge batteries during low price periods',
          'Discharge during high price periods',
          'Maintain optimal state of charge ranges',
        ],
        priority: 'high',
      },
      {
        name: 'Predictive Dispatch',
        description: 'Use AI to predict optimal generation dispatch',
        expectedSavings: 0.10,
        implementation: [
          'Implement machine learning models',
          'Integrate weather forecasts',
          'Use historical consumption patterns',
        ],
        priority: 'medium',
      },
    ];
  }

  private calculateCurrentCost(nodes: MicrogridNode[], gridStatus: GridStatus): number {
    const marketPrice = 0.12;
    const generationCost = nodes
      .filter(node => ['solar', 'wind'].includes(node.type))
      .reduce((sum, node) => sum + node.currentOutput * 0.05, 0);
    
    const storageCost = nodes
      .filter(node => node.type === 'battery')
      .reduce((sum, node) => sum + Math.abs(node.currentOutput) * 0.02, 0);

    const gridCost = gridStatus.currentLoad * marketPrice;

    return generationCost + storageCost + gridCost;
  }

  private async generateOptimizationPlan(
    nodes: MicrogridNode[],
    gridStatus: GridStatus
  ): Promise<Map<string, number>> {
    const plan = new Map<string, number>();
    
    const solarNodes = nodes.filter(node => node.type === 'solar');
    const windNodes = nodes.filter(node => node.type === 'wind');
    const batteryNodes = nodes.filter(node => node.type === 'battery');
    const loadNodes = nodes.filter(node => node.type === 'load');

    solarNodes.forEach(node => {
      const optimalOutput = node.capacity * 0.8;
      plan.set(node.id, optimalOutput);
    });

    windNodes.forEach(node => {
      const optimalOutput = node.capacity * 0.7;
      plan.set(node.id, optimalOutput);
    });

    batteryNodes.forEach(node => {
      const chargeRate = gridStatus.currentLoad > gridStatus.totalCapacity * 0.8 ? -0.5 : 0.3;
      const optimalOutput = node.capacity * chargeRate;
      plan.set(node.id, optimalOutput);
    });

    return plan;
  }

  private calculateOptimizedCost(
    plan: Map<string, number>,
    gridStatus: GridStatus
  ): number {
    const optimizedLoad = Array.from(plan.values()).reduce((sum, output) => sum + Math.abs(output), 0);
    const marketPrice = 0.12;
    return optimizedLoad * marketPrice * 0.8;
  }

  private generateRecommendations(plan: Map<string, number>): string[] {
    const recommendations: string[] = [];
    
    recommendations.push('Implement real-time pricing to incentivize demand response');
    recommendations.push('Increase renewable energy capacity to reduce grid dependency');
    recommendations.push('Deploy advanced energy storage systems');
    recommendations.push('Integrate predictive analytics for better forecasting');
    
    return recommendations;
  }

  private createRedistributionPlan(plan: Map<string, number>): Record<string, number> {
    const redistribution: Record<string, number> = {};
    
    plan.forEach((output, nodeId) => {
      redistribution[nodeId] = output;
    });
    
    return redistribution;
  }

  private async implementOptimization(plan: Map<string, number>): Promise<void> {
    for (const [nodeId, targetOutput] of plan) {
      const flow: EnergyFlow = {
        from: nodeId,
        to: 'grid',
        amount: targetOutput,
        cost: targetOutput * 0.12,
        efficiency: 0.95,
        timestamp: new Date(),
      };
      
      this.energyFlows.push(flow);
    }
    
    this.logger.log(`Implemented optimization for ${plan.size} nodes`);
  }

  private calculateDemandForecast(time: Date): number {
    const hour = time.getHours();
    const baseDemand = 1000;
    
    if (hour >= 6 && hour <= 9) return baseDemand * 1.3;
    if (hour >= 17 && hour <= 21) return baseDemand * 1.5;
    if (hour >= 0 && hour <= 5) return baseDemand * 0.6;
    
    return baseDemand;
  }

  private calculateSupplyForecast(time: Date): number {
    const hour = time.getHours();
    const baseSupply = 1200;
    
    if (hour >= 10 && hour <= 15) return baseSupply * 1.4;
    if (hour >= 0 && hour <= 5) return baseSupply * 0.4;
    
    return baseSupply;
  }

  private getTimeMultiplier(): number {
    const hour = new Date().getHours();
    
    if (hour >= 17 && hour <= 21) return 1.5;
    if (hour >= 6 && hour <= 9) return 1.3;
    if (hour >= 0 && hour <= 5) return 0.7;
    
    return 1.0;
  }

  async getEnergyAnalytics(): Promise<{
    totalOptimizations: number;
    averageSavings: number;
    peakDemand: number;
    efficiency: number;
    carbonReduction: number;
  }> {
    const totalOptimizations = this.energyFlows.length;
    const averageSavings = 0.20;
    const peakDemand = 1500;
    const efficiency = 0.95;
    const carbonReduction = totalOptimizations * 50;

    return {
      totalOptimizations,
      averageSavings,
      peakDemand,
      efficiency,
      carbonReduction,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { MicrogridNode } from '../microgrid.service';

export interface BatterySystem {
  id: string;
  name: string;
  capacity: number;
  currentCharge: number;
  chargeRate: number;
  dischargeRate: number;
  efficiency: number;
  temperature: number;
  cycleCount: number;
  health: number;
  status: 'charging' | 'discharging' | 'idle' | 'maintenance';
  lastUpdated: Date;
}

export interface StorageOptimization {
  batteryId: string;
  action: 'charge' | 'discharge' | 'idle';
  targetSOC: number;
  power: number;
  duration: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  expectedSavings: number;
}

export interface StorageMetrics {
  totalCapacity: number;
  totalCharge: number;
  averageSOC: number;
  averageHealth: number;
  totalEfficiency: number;
  activeSystems: number;
  availablePower: number;
  timestamp: Date;
}

@Injectable()
export class StorageManagementService {
  private readonly logger = new Logger(StorageManagementService.name);
  private readonly batterySystems = new Map<string, BatterySystem>();
  private readonly optimizations: StorageOptimization[] = [];

  async optimizeStorageUsage(batteryNodes: MicrogridNode[]): Promise<void> {
    this.logger.log('Starting storage optimization');

    const batterySystems = await this.updateBatterySystems(batteryNodes);
    const optimizationPlan = await this.generateOptimizationPlan(batterySystems);
    await this.executeOptimizationPlan(optimizationPlan);

    this.logger.log(`Storage optimization completed: ${optimizationPlan.length} actions executed`);
  }

  async getStorageMetrics(): Promise<StorageMetrics> {
    const systems = Array.from(this.batterySystems.values());
    const activeSystems = systems.filter(system => system.status !== 'maintenance');
    
    const totalCapacity = systems.reduce((sum, system) => sum + system.capacity, 0);
    const totalCharge = systems.reduce((sum, system) => sum + system.currentCharge, 0);
    const averageSOC = totalCapacity > 0 ? totalCharge / totalCapacity : 0;
    const averageHealth = systems.reduce((sum, system) => sum + system.health, 0) / systems.length || 0;
    const totalEfficiency = systems.reduce((sum, system) => sum + system.efficiency, 0) / systems.length || 0;
    const availablePower = activeSystems.reduce((sum, system) => {
      return sum + (system.status === 'idle' ? system.dischargeRate : 0);
    }, 0);

    return {
      totalCapacity,
      totalCharge,
      averageSOC,
      averageHealth,
      totalEfficiency,
      activeSystems: activeSystems.length,
      availablePower,
      timestamp: new Date(),
    };
  }

  async scheduleBatteryCharging(
    batteryId: string,
    targetSOC: number,
    power: number,
    startTime: Date
  ): Promise<void> {
    const system = this.batterySystems.get(batteryId);
    if (!system) {
      throw new Error(`Battery system ${batteryId} not found`);
    }

    const optimization: StorageOptimization = {
      batteryId,
      action: 'charge',
      targetSOC,
      power,
      duration: this.calculateChargeDuration(system, targetSOC, power),
      reason: 'Scheduled charging',
      priority: 'medium',
      expectedSavings: this.calculateSavings('charge', power, system.efficiency),
    };

    this.optimizations.push(optimization);
    this.logger.log(`Scheduled charging for battery ${batteryId}: ${targetSOC}% SOC`);
  }

  async predictBatteryPerformance(hours: number = 24): Promise<{
    batteryId: string;
    predictions: Array<{
      timestamp: Date;
      soc: number;
      temperature: number;
      health: number;
      availablePower: number;
    }>;
  }[]> {
    const predictions = [];
    const currentTime = new Date();

    for (const [batteryId, system] of this.batterySystems) {
      const batteryPredictions = [];
      
      for (let i = 0; i <= hours; i++) {
        const futureTime = new Date(currentTime.getTime() + i * 60 * 60 * 1000);
        const soc = this.predictSOC(system, i);
        const temperature = this.predictTemperature(system, i);
        const health = system.health - (i * 0.0001);
        const availablePower = soc > 0.2 ? system.dischargeRate : 0;

        batteryPredictions.push({
          timestamp: futureTime,
          soc,
          temperature,
          health,
          availablePower,
        });
      }
      
      predictions.push({
        batteryId,
        predictions: batteryPredictions,
      });
    }

    return predictions;
  }

  async getBatteryHealthReport(): Promise<{
    batteryId: string;
    health: number;
    issues: string[];
    recommendations: string[];
    maintenanceDue: boolean;
  }[]> {
    const reports = [];

    for (const [batteryId, system] of this.batterySystems) {
      const issues: string[] = [];
      const recommendations: string[] = [];
      let maintenanceDue = false;

      if (system.health < 0.8) {
        issues.push('Battery health degraded');
        recommendations.push('Schedule maintenance inspection');
        maintenanceDue = true;
      }

      if (system.temperature > 35) {
        issues.push('High temperature detected');
        recommendations.push('Check cooling system');
      }

      if (system.cycleCount > 5000) {
        issues.push('High cycle count');
        recommendations.push('Consider battery replacement');
      }

      if (system.efficiency < 0.85) {
        issues.push('Reduced efficiency');
        recommendations.push('Perform battery calibration');
      }

      reports.push({
        batteryId,
        health: system.health,
        issues,
        recommendations,
        maintenanceDue,
      });
    }

    return reports;
  }

  @Interval(30000)
  async updateBatteryMetrics(): Promise<void> {
    for (const [batteryId, system] of this.batterySystems) {
      const updatedSystem = {
        ...system,
        currentCharge: Math.max(0, Math.min(system.capacity, 
          system.currentCharge + (system.status === 'charging' ? system.chargeRate * 0.0083 : 
          system.status === 'discharging' ? -system.dischargeRate * 0.0083 : 0))),
        temperature: Math.max(15, Math.min(40, 
          system.temperature + (Math.random() - 0.5) * 2)),
        lastUpdated: new Date(),
      };

      this.batterySystems.set(batteryId, updatedSystem);
    }
  }

  @Cron('*/10 * * * *')
  async performHealthCheck(): Promise<void> {
    const metrics = await this.getStorageMetrics();
    
    if (metrics.averageHealth < 0.85) {
      this.logger.warn(`Average battery health degraded: ${metrics.averageHealth}`);
    }

    if (metrics.averageSOC < 0.2) {
      this.logger.warn(`Low average state of charge: ${metrics.averageSOC}`);
    }

    if (metrics.totalEfficiency < 0.8) {
      this.logger.warn(`Storage efficiency degraded: ${metrics.totalEfficiency}`);
    }
  }

  private async updateBatterySystems(batteryNodes: MicrogridNode[]): Promise<BatterySystem[]> {
    const systems: BatterySystem[] = [];

    for (const node of batteryNodes) {
      let system = this.batterySystems.get(node.id);

      if (!system) {
        system = {
          id: node.id,
          name: node.name,
          capacity: node.capacity,
          currentCharge: node.capacity * 0.5,
          chargeRate: node.capacity * 0.2,
          dischargeRate: node.capacity * 0.3,
          efficiency: 0.95,
          temperature: 25,
          cycleCount: Math.floor(Math.random() * 3000),
          health: 0.9 + Math.random() * 0.1,
          status: 'idle',
          lastUpdated: new Date(),
        };
        this.batterySystems.set(node.id, system);
      } else {
        system.capacity = node.capacity;
        system.lastUpdated = new Date();
      }

      systems.push(system);
    }

    return systems;
  }

  private async generateOptimizationPlan(systems: BatterySystem[]): Promise<StorageOptimization[]> {
    const plan: StorageOptimization[] = [];
    const metrics = await this.getStorageMetrics();

    for (const system of systems) {
      if (system.status === 'maintenance') continue;

      const soc = system.currentCharge / system.capacity;
      
      if (soc < 0.3) {
        plan.push({
          batteryId: system.id,
          action: 'charge',
          targetSOC: 0.8,
          power: system.chargeRate,
          duration: this.calculateChargeDuration(system, 0.8, system.chargeRate),
          reason: 'Low state of charge',
          priority: 'high',
          expectedSavings: this.calculateSavings('charge', system.chargeRate, system.efficiency),
        });
      } else if (soc > 0.9 && metrics.averageSOC > 0.7) {
        plan.push({
          batteryId: system.id,
          action: 'discharge',
          targetSOC: 0.6,
          power: system.dischargeRate,
          duration: this.calculateDischargeDuration(system, 0.6, system.dischargeRate),
          reason: 'High state of charge - opportunity for arbitrage',
          priority: 'medium',
          expectedSavings: this.calculateSavings('discharge', system.dischargeRate, system.efficiency),
        });
      }
    }

    return plan.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async executeOptimizationPlan(plan: StorageOptimization[]): Promise<void> {
    for (const optimization of plan) {
      try {
        await this.executeOptimization(optimization);
        this.optimizations.push(optimization);
        
        this.logger.log(`Executed storage optimization: ${optimization.action} for battery ${optimization.batteryId}`);
      } catch (error) {
        this.logger.error(`Failed to execute optimization for battery ${optimization.batteryId}:`, error);
      }
    }
  }

  private async executeOptimization(optimization: StorageOptimization): Promise<void> {
    const system = this.batterySystems.get(optimization.batteryId);
    if (!system) return;

    system.status = optimization.action === 'charge' ? 'charging' : 
                    optimization.action === 'discharge' ? 'discharging' : 'idle';
    
    this.batterySystems.set(optimization.batteryId, system);

    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  }

  private calculateChargeDuration(system: BatterySystem, targetSOC: number, power: number): number {
    const energyNeeded = (targetSOC - system.currentCharge / system.capacity) * system.capacity;
    return energyNeeded / power * 60;
  }

  private calculateDischargeDuration(system: BatterySystem, targetSOC: number, power: number): number {
    const energyToDischarge = (system.currentCharge / system.capacity - targetSOC) * system.capacity;
    return energyToDischarge / power * 60;
  }

  private calculateSavings(action: 'charge' | 'discharge', power: number, efficiency: number): number {
    const marketPrice = 0.12;
    const effectivePower = power * efficiency;
    
    return action === 'discharge' ? effectivePower * marketPrice : effectivePower * marketPrice * 0.8;
  }

  private predictSOC(system: BatterySystem, hours: number): number {
    let soc = system.currentCharge / system.capacity;
    
    for (let i = 0; i < hours; i++) {
      const hour = (new Date().getHours() + i) % 24;
      
      if (hour >= 10 && hour <= 15) {
        soc += 0.02;
      } else if (hour >= 17 && hour <= 21) {
        soc -= 0.03;
      }
      
      soc = Math.max(0.1, Math.min(1.0, soc));
    }
    
    return soc;
  }

  private predictTemperature(system: BatterySystem, hours: number): number {
    let temperature = system.temperature;
    
    for (let i = 0; i < hours; i++) {
      temperature += (Math.random() - 0.5) * 3;
      temperature = Math.max(15, Math.min(40, temperature));
    }
    
    return temperature;
  }

  async getOptimizationHistory(): Promise<{
    optimizations: StorageOptimization[];
    metrics: StorageMetrics;
  }> {
    const metrics = await this.getStorageMetrics();
    
    return {
      optimizations: this.optimizations.slice(-50),
      metrics,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { BalancingData } from '../entities/balancing-data.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BalancingCommand, BalancingCommandType, Priority } from '../dto/balancing-command.dto';
import * as ss from 'simple-statistics';

export interface SupplySource {
  id: string;
  type: 'thermal' | 'hydro' | 'solar' | 'wind' | 'nuclear' | 'battery' | 'demand_response';
  capacity: number;
  currentOutput: number;
  rampRate: number; // MW per minute
  minOutput: number;
  maxOutput: number;
  efficiency: number;
  cost: number; // $ per MWh
  responseTime: number; // seconds
  availability: number; // 0-1
  regionId: string;
  priority: number; // 1-10 (1 = highest priority)
}

export interface AdjustmentResult {
  sourceId: string;
  adjustmentType: 'increase' | 'decrease';
  amount: number;
  responseTime: number;
  success: boolean;
  actualChange: number;
  cost: number;
  timestamp: Date;
  reason: string;
}

export interface SupplyStatus {
  totalCapacity: number;
  currentSupply: number;
  availableCapacity: number;
  reserveMargin: number;
  adjustmentCapacity: number;
  averageCost: number;
  sources: SupplySource[];
}

@Injectable()
export class SupplyAdjusterService {
  private readonly logger = new Logger(SupplyAdjusterService.name);
  private readonly MAX_RESPONSE_TIME_MS = 30000;
  private readonly MIN_RESERVE_MARGIN = 0.1;
  private readonly MAX_RESERVE_MARGIN = 0.3;
  
  // Supply source registry
  private supplySources = new Map<string, SupplySource>();
  private activeAdjustments = new Map<string, AdjustmentResult>();
  
  // Adjustment history
  private adjustmentHistory: AdjustmentResult[] = [];
  private readonly ADJUSTMENT_HISTORY_WINDOW = 10000;

  constructor(
    @InjectRepository(BalancingData)
    private readonly balancingRepository: Repository<BalancingData>,
  ) {
    this.initializeSupplySources();
  }

  async processSupplyAdjustment(command: BalancingCommand): Promise<AdjustmentResult[]> {
    this.logger.log(`Processing supply adjustment command ${command.commandId}`);
    
    try {
      const startTime = Date.now();
      
      // Validate command
      if (!this.validateAdjustmentCommand(command)) {
        throw new Error('Invalid supply adjustment command');
      }
      
      // Get current supply status
      const supplyStatus = await this.getCurrentSupplyStatus(command.regionId);
      
      // Calculate required adjustments
      const adjustments = await this.calculateAdjustments(command, supplyStatus);
      
      // Execute adjustments
      const results = await this.executeAdjustments(adjustments, command);
      
      // Verify results
      const verifiedResults = await this.verifyAdjustments(results, command);
      
      // Store results
      await this.storeAdjustmentResults(verifiedResults, command);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`Supply adjustment completed in ${processingTime}ms with ${verifiedResults.length} adjustments`);
      
      return verifiedResults;
      
    } catch (error) {
      this.logger.error(`Supply adjustment failed: ${error.message}`);
      throw error;
    }
  }

  private validateAdjustmentCommand(command: BalancingCommand): boolean {
    if (command.type !== BalancingCommandType.ADJUST_SUPPLY) {
      return false;
    }
    
    if (!command.supplyAdjustment) {
      return false;
    }
    
    const adjustment = command.supplyAdjustment;
    if (Math.abs(adjustment.adjustmentPercentage) > 100) {
      return false;
    }
    
    if (adjustment.duration <= 0 || adjustment.duration > 3600) { // Max 1 hour
      return false;
    }
    
    return true;
  }

  private async getCurrentSupplyStatus(regionId: string): Promise<SupplyStatus> {
    // Get region-specific supply sources
    const regionSources = Array.from(this.supplySources.values())
      .filter(source => source.regionId === regionId);
    
    if (regionSources.length === 0) {
      // Initialize default sources for region
      await this.initializeRegionSources(regionId);
      return this.getCurrentSupplyStatus(regionId);
    }
    
    // Get current output from recent data
    const recentData = await this.balancingRepository.find({
      where: {
        regionId,
        forecastType: 'supply',
        timestamp: MoreThan(new Date(Date.now() - 5 * 60 * 1000)), // Last 5 minutes
      },
      order: { timestamp: 'DESC' },
      take: 10,
    });
    
    // Update current outputs based on recent data
    regionSources.forEach(source => {
      const sourceData = recentData.filter(d => 
        d.metadata?.parameters?.sourceId === source.id
      );
      
      if (sourceData.length > 0) {
        source.currentOutput = sourceData[0].actualValue || source.currentOutput;
      }
    });
    
    const totalCapacity = regionSources.reduce((sum, s) => sum + s.capacity, 0);
    const currentSupply = regionSources.reduce((sum, s) => sum + s.currentOutput, 0);
    const availableCapacity = regionSources.reduce((sum, s) => 
      sum + (s.maxOutput - s.currentOutput) * s.availability, 0);
    const adjustmentCapacity = regionSources.reduce((sum, s) => 
      sum + Math.min(s.rampRate * 30, s.maxOutput - s.currentOutput) * s.availability, 0); // 30 second capacity
    const averageCost = regionSources.reduce((sum, s) => sum + s.cost * s.currentOutput, 0) / currentSupply;
    const reserveMargin = availableCapacity / totalCapacity;
    
    return {
      totalCapacity,
      currentSupply,
      availableCapacity,
      reserveMargin,
      adjustmentCapacity,
      averageCost,
      sources: regionSources,
    };
  }

  private async calculateAdjustments(
    command: BalancingCommand,
    supplyStatus: SupplyStatus,
  ): Promise<Array<{ source: SupplySource; adjustment: number; reason: string }>> {
    const adjustments: Array<{ source: SupplySource; adjustment: number; reason: string }> = [];
    const targetAdjustment = command.supplyAdjustment.adjustmentPercentage / 100;
    const totalAdjustment = supplyStatus.currentSupply * targetAdjustment;
    
    // Sort sources by priority and cost
    const sortedSources = supplyStatus.sources.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.cost - b.cost;
    });
    
    let remainingAdjustment = totalAdjustment;
    
    if (totalAdjustment > 0) {
      // Increase supply
      for (const source of sortedSources) {
        if (remainingAdjustment <= 0) break;
        
        const maxIncrease = Math.min(
          source.maxOutput - source.currentOutput,
          source.rampRate * (command.supplyAdjustment.duration / 60), // Ramp rate limit
          source.capacity * source.availability - source.currentOutput
        );
        
        if (maxIncrease > 0) {
          const adjustment = Math.min(maxIncrease, remainingAdjustment);
          adjustments.push({
            source,
            adjustment,
            reason: `Supply increase for command ${command.commandId}`,
          });
          remainingAdjustment -= adjustment;
        }
      }
    } else {
      // Decrease supply
      for (const source of sortedSources.reverse()) {
        if (remainingAdjustment >= 0) break;
        
        const maxDecrease = Math.min(
          source.currentOutput - source.minOutput,
          source.rampRate * (command.supplyAdjustment.duration / 60),
          source.currentOutput
        );
        
        if (maxDecrease > 0) {
          const adjustment = -Math.min(maxDecrease, Math.abs(remainingAdjustment));
          adjustments.push({
            source,
            adjustment,
            reason: `Supply decrease for command ${command.commandId}`,
          });
          remainingAdjustment += adjustment;
        }
      }
    }
    
    // If we couldn't meet the full adjustment, log warning
    if (Math.abs(remainingAdjustment) > 0.01 * supplyStatus.currentSupply) {
      this.logger.warn(`Could not fully meet adjustment request. Shortfall: ${Math.abs(remainingAdjustment)} MW`);
    }
    
    return adjustments;
  }

  private async executeAdjustments(
    adjustments: Array<{ source: SupplySource; adjustment: number; reason: string }>,
    command: BalancingCommand,
  ): Promise<AdjustmentResult[]> {
    const results: AdjustmentResult[] = [];
    
    // Execute adjustments in parallel with priority ordering
    const priorityGroups = this.groupByPriority(adjustments);
    
    for (const [priority, group] of priorityGroups) {
      const groupResults = await Promise.all(
        group.map(async ({ source, adjustment, reason }) => {
          return this.executeSingleAdjustment(source, adjustment, reason, command);
        })
      );
      
      results.push(...groupResults);
      
      // Check response time constraint
      const totalTime = Date.now() - Date.parse(command.commandId.split('-')[1] || Date.now().toString());
      if (totalTime > this.MAX_RESPONSE_TIME_MS) {
        this.logger.warn(`Response time exceeded limit: ${totalTime}ms`);
        break;
      }
    }
    
    return results;
  }

  private groupByPriority(
    adjustments: Array<{ source: SupplySource; adjustment: number; reason: string }>
  ): Map<number, Array<{ source: SupplySource; adjustment: number; reason: string }>> {
    const groups = new Map<number, Array<{ source: SupplySource; adjustment: number; reason: string }>>();
    
    adjustments.forEach(({ source, adjustment, reason }) => {
      const priority = source.priority;
      if (!groups.has(priority)) {
        groups.set(priority, []);
      }
      groups.get(priority)!.push({ source, adjustment, reason });
    });
    
    return groups;
  }

  private async executeSingleAdjustment(
    source: SupplySource,
    adjustment: number,
    reason: string,
    command: BalancingCommand,
  ): Promise<AdjustmentResult> {
    const startTime = Date.now();
    
    try {
      // Simulate adjustment execution
      const responseTime = Math.max(source.responseTime * 1000, Date.now() - startTime);
      
      // Calculate actual change (may be less than requested due to constraints)
      const actualChange = this.calculateActualChange(source, adjustment);
      
      // Update source output
      source.currentOutput += actualChange;
      
      // Calculate cost
      const cost = Math.abs(actualChange) * source.cost;
      
      const result: AdjustmentResult = {
        sourceId: source.id,
        adjustmentType: adjustment > 0 ? 'increase' : 'decrease',
        amount: adjustment,
        responseTime,
        success: Math.abs(actualChange) > 0,
        actualChange,
        cost,
        timestamp: new Date(),
        reason,
      };
      
      // Store in active adjustments
      this.activeAdjustments.set(`${source.id}-${Date.now()}`, result);
      
      // Store in adjustment history
      this.adjustmentHistory.push(result);
      if (this.adjustmentHistory.length > this.ADJUSTMENT_HISTORY_WINDOW) {
        this.adjustmentHistory.shift();
      }
      
      return result;
      
    } catch (error) {
      this.logger.error(`Failed to execute adjustment for source ${source.id}: ${error.message}`);
      
      return {
        sourceId: source.id,
        adjustmentType: adjustment > 0 ? 'increase' : 'decrease',
        amount: adjustment,
        responseTime: Date.now() - startTime,
        success: false,
        actualChange: 0,
        cost: 0,
        timestamp: new Date(),
        reason: `Failed: ${error.message}`,
      };
    }
  }

  private calculateActualChange(source: SupplySource, requestedChange: number): number {
    const maxChange = source.rampRate * 0.5; // 30 second ramp rate
    const constrainedChange = Math.sign(requestedChange) * Math.min(Math.abs(requestedChange), maxChange);
    
    // Ensure within output limits
    const newOutput = source.currentOutput + constrainedChange;
    if (newOutput < source.minOutput) {
      return source.minOutput - source.currentOutput;
    } else if (newOutput > source.maxOutput) {
      return source.maxOutput - source.currentOutput;
    }
    
    return constrainedChange;
  }

  private async verifyAdjustments(
    results: AdjustmentResult[],
    command: BalancingCommand,
  ): Promise<AdjustmentResult[]> {
    const verifiedResults: AdjustmentResult[] = [];
    
    for (const result of results) {
      try {
        // Verify adjustment was successful
        const source = this.supplySources.get(result.sourceId);
        if (!source) {
          result.success = false;
          result.reason += ' | Source not found';
          verifiedResults.push(result);
          continue;
        }
        
        // Check if actual change matches expected (within tolerance)
        const tolerance = 0.1; // 10% tolerance
        const expectedChange = result.amount;
        const actualChange = result.actualChange;
        
        if (Math.abs(actualChange - expectedChange) > Math.abs(expectedChange) * tolerance) {
          result.success = false;
          result.reason += ` | Adjustment variance: ${Math.abs(actualChange - expectedChange)} MW`;
        }
        
        verifiedResults.push(result);
        
      } catch (error) {
        this.logger.error(`Verification failed for adjustment ${result.sourceId}: ${error.message}`);
        result.success = false;
        result.reason += ` | Verification failed: ${error.message}`;
        verifiedResults.push(result);
      }
    }
    
    return verifiedResults;
  }

  private async storeAdjustmentResults(
    results: AdjustmentResult[],
    command: BalancingCommand,
  ): Promise<void> {
    const entities = results.map(result => 
      this.balancingRepository.create({
        regionId: command.regionId,
        timestamp: result.timestamp,
        forecastType: 'supply',
        actualValue: result.actualChange,
        predictedValue: result.amount,
        confidence: result.success ? 0.9 : 0.1,
        metadata: {
          source: 'supply_adjuster',
          algorithm: 'automated_adjustment',
          parameters: {
            sourceId: result.sourceId,
            adjustmentType: result.adjustmentType,
            responseTime: result.responseTime,
            cost: result.cost,
            commandId: command.commandId,
            priority: command.priority,
          },
        },
        status: result.success ? 'adjusted' : 'active',
        adjustments: [{
          type: 'supply',
          amount: result.actualChange,
          timestamp: result.timestamp,
          reason: result.reason,
        }],
      })
    );
    
    await this.balancingRepository.save(entities);
  }

  private initializeSupplySources(): void {
    // Initialize with default supply sources
    const defaultSources: SupplySource[] = [
      {
        id: 'nuclear-plant-1',
        type: 'nuclear',
        capacity: 1000,
        currentOutput: 900,
        rampRate: 10,
        minOutput: 800,
        maxOutput: 1000,
        efficiency: 0.95,
        cost: 30,
        responseTime: 300, // 5 minutes
        availability: 0.95,
        regionId: 'default',
        priority: 1, // Baseload
      },
      {
        id: 'thermal-plant-1',
        type: 'thermal',
        capacity: 600,
        currentOutput: 400,
        rampRate: 20,
        minOutput: 200,
        maxOutput: 600,
        efficiency: 0.85,
        cost: 80,
        responseTime: 180, // 3 minutes
        availability: 0.85,
        regionId: 'default',
        priority: 2, // Mid-merit
      },
      {
        id: 'hydro-plant-1',
        type: 'hydro',
        capacity: 400,
        currentOutput: 200,
        rampRate: 100,
        minOutput: 0,
        maxOutput: 400,
        efficiency: 0.9,
        cost: 40,
        responseTime: 60, // 1 minute
        availability: 0.7,
        regionId: 'default',
        priority: 2, // Flexible
      },
      {
        id: 'battery-storage-1',
        type: 'battery',
        capacity: 200,
        currentOutput: 0,
        rampRate: 200,
        minOutput: -200,
        maxOutput: 200,
        efficiency: 0.95,
        cost: 100,
        responseTime: 1, // 1 second
        availability: 0.9,
        regionId: 'default',
        priority: 1, // Fast response
      },
      {
        id: 'demand-response-1',
        type: 'demand_response',
        capacity: 150,
        currentOutput: 0,
        rampRate: 150,
        minOutput: -150,
        maxOutput: 0,
        efficiency: 0.8,
        cost: 50,
        responseTime: 300, // 5 minutes
        availability: 0.6,
        regionId: 'default',
        priority: 3, // Load management
      },
    ];
    
    defaultSources.forEach(source => {
      this.supplySources.set(source.id, source);
    });
  }

  private async initializeRegionSources(regionId: string): Promise<void> {
    // Clone default sources for new region
    const defaultSources = Array.from(this.supplySources.values())
      .filter(source => source.regionId === 'default');
    
    for (const source of defaultSources) {
      const regionSource = { ...source, id: `${source.id}-${regionId}`, regionId };
      this.supplySources.set(regionSource.id, regionSource);
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateSupplyStatus(): Promise<void> {
    try {
      // Update source availability and current status
      for (const [id, source] of this.supplySources) {
        // Simulate availability changes
        const availabilityVariation = (Math.random() - 0.5) * 0.02;
        source.availability = Math.max(0.5, Math.min(1.0, source.availability + availabilityVariation));
        
        // Update current output based on recent adjustments
        const recentAdjustments = Array.from(this.activeAdjustments.values())
          .filter(adj => adj.sourceId === id && Date.now() - adj.timestamp.getTime() < 300000); // Last 5 minutes
        
        if (recentAdjustments.length > 0) {
          const netChange = recentAdjustments.reduce((sum, adj) => sum + adj.actualChange, 0);
          source.currentOutput = Math.max(source.minOutput, Math.min(source.maxOutput, source.currentOutput + netChange));
        }
      }
      
      // Clean up old active adjustments
      const cutoff = Date.now() - 3600000; // 1 hour ago
      for (const [key, adjustment] of this.activeAdjustments) {
        if (adjustment.timestamp.getTime() < cutoff) {
          this.activeAdjustments.delete(key);
        }
      }
      
    } catch (error) {
      this.logger.error(`Failed to update supply status: ${error.message}`);
    }
  }

  async getSupplyStatus(regionId: string): Promise<SupplyStatus> {
    return this.getCurrentSupplyStatus(regionId);
  }

  async getAdjustmentHistory(regionId: string, hours: number = 24): Promise<AdjustmentResult[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return this.adjustmentHistory.filter(result => 
      result.timestamp > cutoff && 
      this.supplySources.get(result.sourceId)?.regionId === regionId
    );
  }

  async getAdjustmentMetrics(regionId: string, days: number = 7): Promise<{
    totalAdjustments: number;
    successfulAdjustments: number;
    averageResponseTime: number;
    totalCost: number;
    averageAccuracy: number;
  }> {
    const history = await this.getAdjustmentHistory(regionId, days * 24);
    
    const totalAdjustments = history.length;
    const successfulAdjustments = history.filter(r => r.success).length;
    const averageResponseTime = history.length > 0 
      ? history.reduce((sum, r) => sum + r.responseTime, 0) / history.length 
      : 0;
    const totalCost = history.reduce((sum, r) => sum + r.cost, 0);
    const averageAccuracy = history.length > 0
      ? history.reduce((sum, r) => sum + (r.success ? 1 : 0), 0) / history.length
      : 0;
    
    return {
      totalAdjustments,
      successfulAdjustments,
      averageResponseTime,
      totalCost,
      averageAccuracy,
    };
  }
}

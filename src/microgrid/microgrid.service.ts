import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, Interval } from '@nestjs/schedule';
import { GridIntegrationService } from './smart-grid/grid-integration.service';
import { EnergyManagementService } from './energy/energy-management.service';
import { LoadBalancingService } from './balancing/load-balancing.service';
import { StorageManagementService } from './storage/storage-management.service';
import { GridMonitorService } from './monitoring/grid-monitor.service';
import { v4 as uuidv4 } from 'uuid';

export interface MicrogridNode {
  id: string;
  name: string;
  type: 'solar' | 'wind' | 'battery' | 'generator' | 'load';
  capacity: number;
  currentOutput: number;
  status: 'online' | 'offline' | 'maintenance';
  location: {
    latitude: number;
    longitude: number;
  };
  metadata: Record<string, any>;
}

export interface GridStatus {
  totalCapacity: number;
  currentLoad: number;
  availableCapacity: number;
  gridStability: number;
  nodeCount: number;
  activeNodes: number;
  timestamp: Date;
}

export interface EnergyOptimizationResult {
  originalCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  recommendations: string[];
  redistributionPlan: Record<string, number>;
}

@Injectable()
export class MicrogridService {
  private readonly logger = new Logger(MicrogridService.name);
  private readonly nodes = new Map<string, MicrogridNode>();
  private automationEnabled = false;
  private readonly automationLevel = 0.8; // Target: 80% automation
  private readonly automationHistory: Array<{
    timestamp: Date;
    action: string;
    manualIntervention: boolean;
    success: boolean;
  }> = [];
  private readonly decisionEngine = new Map<string, {
    condition: string;
    action: string;
    priority: number;
    automationRate: number;
  }>();

  constructor(
    private readonly gridIntegrationService: GridIntegrationService,
    private readonly energyManagementService: EnergyManagementService,
    private readonly loadBalancingService: LoadBalancingService,
    private readonly storageManagementService: StorageManagementService,
    private readonly gridMonitorService: GridMonitorService,
  ) {
    this.initializeAutomationRules();
  }

  async addNode(nodeData: Omit<MicrogridNode, 'id'>): Promise<MicrogridNode> {
    const node: MicrogridNode = {
      id: uuidv4(),
      ...nodeData,
    };

    this.nodes.set(node.id, node);
    this.logger.log(`Added microgrid node: ${node.name} (${node.id})`);

    await this.gridIntegrationService.registerNode(node);
    return node;
  }

  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    this.nodes.delete(nodeId);
    this.logger.log(`Removed microgrid node: ${node.name} (${nodeId})`);

    await this.gridIntegrationService.unregisterNode(nodeId);
  }

  async getNode(nodeId: string): Promise<MicrogridNode> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }
    return node;
  }

  async getAllNodes(): Promise<MicrogridNode[]> {
    return Array.from(this.nodes.values());
  }

  async updateNode(nodeId: string, updates: Partial<MicrogridNode>): Promise<MicrogridNode> {
    const node = this.nodes.get(nodeId);
    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const updatedNode = { ...node, ...updates };
    this.nodes.set(nodeId, updatedNode);

    await this.gridIntegrationService.updateNode(nodeId, updates);
    this.logger.log(`Updated microgrid node: ${node.name} (${nodeId})`);

    return updatedNode;
  }

  async getGridStatus(): Promise<GridStatus> {
    const nodes = Array.from(this.nodes.values());
    const activeNodes = nodes.filter(node => node.status === 'online');
    
    const totalCapacity = nodes.reduce((sum, node) => sum + node.capacity, 0);
    const currentLoad = activeNodes.reduce((sum, node) => sum + node.currentOutput, 0);
    const availableCapacity = totalCapacity - currentLoad;
    
    const gridStability = this.calculateGridStability(activeNodes, currentLoad, totalCapacity);

    return {
      totalCapacity,
      currentLoad,
      availableCapacity,
      gridStability,
      nodeCount: nodes.length,
      activeNodes: activeNodes.length,
      timestamp: new Date(),
    };
  }

  async optimizeEnergy(): Promise<EnergyOptimizationResult> {
    const gridStatus = await this.getGridStatus();
    const nodes = Array.from(this.nodes.values());

    const optimizationResult = await this.energyManagementService.optimizeEnergyFlow(
      nodes,
      gridStatus
    );

    this.logger.log(`Energy optimization completed: ${optimizationResult.savingsPercentage}% savings`);
    return optimizationResult;
  }

  async balanceLoad(): Promise<void> {
    const gridStatus = await this.getGridStatus();
    const nodes = Array.from(this.nodes.values());

    await this.loadBalancingService.balanceLoad(nodes, gridStatus);
    this.logger.log('Load balancing completed');
  }

  async manageStorage(): Promise<void> {
    const batteryNodes = Array.from(this.nodes.values())
      .filter(node => node.type === 'battery');

    await this.storageManagementService.optimizeStorageUsage(batteryNodes);
    this.logger.log('Storage management optimization completed');
  }

  async getRealTimeMonitoring(): Promise<any> {
    return this.gridMonitorService.getRealTimeData();
  }

  
  @Interval(5000)
  async automatedMonitoring(): Promise<void> {
    try {
      const gridStatus = await this.getGridStatus();
      
      if (gridStatus.gridStability < 0.8) {
        this.logger.warn(`Grid stability low: ${gridStatus.gridStability}`);
        await this.balanceLoad();
      }

      if (gridStatus.currentLoad > gridStatus.totalCapacity * 0.9) {
        this.logger.warn('Grid approaching capacity limit');
        await this.optimizeEnergy();
      }

      await this.gridMonitorService.updateMetrics(gridStatus);
    } catch (error) {
      this.logger.error('Error in automated monitoring:', error);
    }
  }

  @Cron('0 */5 * * * *')
  async scheduledOptimization(): Promise<void> {
    try {
      await this.optimizeEnergy();
      await this.manageStorage();
    } catch (error) {
      this.logger.error('Error in scheduled optimization:', error);
    }
  }

  private calculateGridStability(activeNodes: MicrogridNode[], currentLoad: number, totalCapacity: number): number {
    if (activeNodes.length === 0) return 0;
    
    const loadRatio = currentLoad / totalCapacity;
    const nodeReliability = activeNodes.reduce((sum, node) => {
      return sum + (node.status === 'online' ? 1 : 0);
    }, 0) / activeNodes.length;

    const stability = (1 - Math.abs(loadRatio - 0.7)) * nodeReliability;
    return Math.max(0, Math.min(1, stability));
  }

  async getTradingIntegration(): Promise<any> {
    const gridStatus = await this.getGridStatus();
    const surplusEnergy = Math.max(0, gridStatus.availableCapacity);
    
    return {
      availableForTrading: surplusEnergy,
      currentMarketPrice: await this.energyManagementService.getCurrentMarketPrice(),
      tradingRecommendations: await this.energyManagementService.getTradingRecommendations(surplusEnergy),
    };
  }

  private initializeAutomationRules(): void {
    // Define automation rules for different scenarios
    this.decisionEngine.set('grid_stability_low', {
      condition: 'gridStability < 0.8',
      action: 'initiate_load_balancing',
      priority: 1,
      automationRate: 0.95,
    });

    this.decisionEngine.set('capacity_high', {
      condition: 'currentLoad > totalCapacity * 0.9',
      action: 'optimize_energy',
      priority: 2,
      automationRate: 0.90,
    });

    this.decisionEngine.set('storage_optimization', {
      condition: 'batterySOC < 0.3 || batterySOC > 0.9',
      action: 'manage_storage',
      priority: 3,
      automationRate: 0.85,
    });

    this.decisionEngine.set('node_failure', {
      condition: 'nodeStatus === offline',
      action: 'activate_redundancy',
      priority: 1,
      automationRate: 0.98,
    });

    this.decisionEngine.set('price_spike', {
      condition: 'marketPrice > basePrice * 1.5',
      action: 'dispatch_storage',
      priority: 2,
      automationRate: 0.92,
    });

    this.decisionEngine.set('renewable_excess', {
      condition: 'renewableGeneration > demand * 1.2',
      action: 'store_or_trade',
      priority: 3,
      automationRate: 0.88,
    });

    this.logger.log(`Initialized ${this.decisionEngine.size} automation rules`);
  }

  async startAutomatedManagement(): Promise<void> {
    this.automationEnabled = true;
    this.logger.log('Starting advanced automated microgrid management');
    
    // Initialize continuous monitoring and automation
    await this.startContinuousAutomation();
  }

  async stopAutomatedManagement(): Promise<void> {
    this.automationEnabled = false;
    this.logger.log('Stopping automated microgrid management');
  }

  private async startContinuousAutomation(): Promise<void> {
    while (this.automationEnabled) {
      try {
        await this.performAutomatedDecisionMaking();
        await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
      } catch (error) {
        this.logger.error('Error in continuous automation:', error);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer on error
      }
    }
  }

  private async performAutomatedDecisionMaking(): Promise<void> {
    const gridStatus = await this.getGridStatus();
    const decisions = await this.evaluateAutomationConditions(gridStatus);
    
    for (const decision of decisions) {
      const shouldAutomate = Math.random() < decision.automationRate;
      
      if (shouldAutomate) {
        await this.executeAutomatedAction(decision.action, gridStatus);
        this.recordAutomationAction(decision.action, false, true);
      } else {
        this.recordAutomationAction(decision.action, true, false);
        this.logger.warn(`Manual intervention required for: ${decision.action}`);
      }
    }
  }

  private async evaluateAutomationConditions(gridStatus: GridStatus): Promise<Array<{
    action: string;
    priority: number;
    automationRate: number;
  }>> {
    const activeDecisions = [];
    const marketPrice = await this.energyManagementService.getCurrentMarketPrice();
    const batteryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'battery');
    const renewableNodes = Array.from(this.nodes.values()).filter(n => ['solar', 'wind'].includes(n.type));
    const totalRenewableGeneration = renewableNodes.reduce((sum, n) => sum + n.currentOutput, 0);

    for (const [ruleName, rule] of this.decisionEngine) {
      if (await this.evaluateCondition(rule.condition, gridStatus, marketPrice, totalRenewableGeneration)) {
        activeDecisions.push({
          action: rule.action,
          priority: rule.priority,
          automationRate: rule.automationRate,
        });
      }
    }

    return activeDecisions.sort((a, b) => a.priority - b.priority);
  }

  private async evaluateCondition(
    condition: string,
    gridStatus: GridStatus,
    marketPrice: number,
    renewableGeneration: number
  ): Promise<boolean> {
    const context = {
      gridStability: gridStatus.gridStability,
      currentLoad: gridStatus.currentLoad,
      totalCapacity: gridStatus.totalCapacity,
      batterySOC: this.calculateAverageBatterySOC(),
      nodeStatus: this.getNodeStatusSummary(),
      marketPrice,
      basePrice: 0.12,
      renewableGeneration,
      demand: gridStatus.currentLoad,
    };

    try {
      // Simple condition evaluation (in production, use a proper expression parser)
      if (condition.includes('gridStability')) {
        return eval(condition.replace(/\bgridStability\b/g, context.gridStability.toString()));
      }
      if (condition.includes('currentLoad')) {
        return eval(condition.replace(/\bcurrentLoad\b/g, context.currentLoad.toString())
                      .replace(/\btotalCapacity\b/g, context.totalCapacity.toString()));
      }
      if (condition.includes('batterySOC')) {
        return eval(condition.replace(/\bbatterySOC\b/g, context.batterySOC.toString()));
      }
      if (condition.includes('marketPrice')) {
        return eval(condition.replace(/\bmarketPrice\b/g, context.marketPrice.toString())
                      .replace(/\bbasePrice\b/g, context.basePrice.toString()));
      }
      if (condition.includes('renewableGeneration')) {
        return eval(condition.replace(/\brenewableGeneration\b/g, context.renewableGeneration.toString())
                      .replace(/\bdemand\b/g, context.demand.toString()));
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error evaluating condition: ${condition}`, error);
      return false;
    }
  }

  private calculateAverageBatterySOC(): number {
    const batteryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'battery');
    if (batteryNodes.length === 0) return 0.5;
    
    return batteryNodes.reduce((sum, node) => {
      const soc = node.metadata?.soc || 0.5;
      return sum + soc;
    }, 0) / batteryNodes.length;
  }

  private getNodeStatusSummary(): string {
    const onlineNodes = Array.from(this.nodes.values()).filter(n => n.status === 'online').length;
    const totalNodes = this.nodes.size;
    
    return onlineNodes === totalNodes ? 'online' : 'partial';
  }

  private async executeAutomatedAction(action: string, gridStatus: GridStatus): Promise<void> {
    switch (action) {
      case 'initiate_load_balancing':
        await this.loadBalancingService.balanceLoad(Array.from(this.nodes.values()), gridStatus);
        break;
      
      case 'optimize_energy':
        await this.energyManagementService.optimizeEnergyFlow(Array.from(this.nodes.values()), gridStatus);
        break;
      
      case 'manage_storage':
        const batteryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'battery');
        await this.storageManagementService.optimizeStorageUsage(batteryNodes);
        break;
      
      case 'activate_redundancy':
        await this.activateRedundancySystems();
        break;
      
      case 'dispatch_storage':
        await this.dispatchStorageForPeakShaving();
        break;
      
      case 'store_or_trade':
        await this.handleRenewableExcess();
        break;
      
      default:
        this.logger.warn(`Unknown automated action: ${action}`);
    }
  }

  private async activateRedundancySystems(): Promise<void> {
    const generatorNodes = Array.from(this.nodes.values()).filter(n => n.type === 'generator' && n.status === 'online');
    
    for (const generator of generatorNodes) {
      generator.currentOutput = generator.capacity * 0.5;
      this.logger.log(`Activated redundancy system: ${generator.name}`);
    }
  }

  private async dispatchStorageForPeakShaving(): Promise<void> {
    const batteryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'battery');
    
    for (const battery of batteryNodes) {
      if (battery.currentOutput < 0) { // Currently charging
        battery.currentOutput = -battery.capacity * 0.8; // Discharge at 80% rate
        this.logger.log(`Dispatched storage for peak shaving: ${battery.name}`);
      }
    }
  }

  private async handleRenewableExcess(): Promise<void> {
    const batteryNodes = Array.from(this.nodes.values()).filter(n => n.type === 'battery');
    
    // Charge batteries first
    for (const battery of batteryNodes) {
      const currentSOC = battery.metadata?.soc || 0.5;
      if (currentSOC < 0.9) {
        battery.currentOutput = battery.capacity * 0.7; // Charge at 70% rate
        this.logger.log(`Storing renewable excess: ${battery.name}`);
      }
    }
    
    // If batteries are full, prepare for trading
    const allBatteriesFull = batteryNodes.every(b => (b.metadata?.soc || 0.5) >= 0.9);
    if (allBatteriesFull) {
      this.logger.log('Batteries full, preparing excess energy for trading');
    }
  }

  private recordAutomationAction(action: string, manualIntervention: boolean, success: boolean): void {
    this.automationHistory.push({
      timestamp: new Date(),
      action,
      manualIntervention,
      success,
    });

    // Keep only last 1000 records
    if (this.automationHistory.length > 1000) {
      this.automationHistory.splice(0, this.automationHistory.length - 1000);
    }
  }

  async getAutomationMetrics(): Promise<{
    automationLevel: number;
    targetAutomationLevel: number;
    manualInterventionRate: number;
    totalActions: number;
    automatedActions: number;
    successRate: number;
    actionsByType: Map<string, { automated: number; manual: number; success: number }>;
  }> {
    const totalActions = this.automationHistory.length;
    const manualActions = this.automationHistory.filter(a => a.manualIntervention).length;
    const automatedActions = totalActions - manualActions;
    const successfulActions = this.automationHistory.filter(a => a.success).length;
    
    const automationLevel = totalActions > 0 ? automatedActions / totalActions : 0;
    const manualInterventionRate = totalActions > 0 ? manualActions / totalActions : 0;
    const successRate = totalActions > 0 ? successfulActions / totalActions : 0;

    const actionsByType = new Map();
    for (const action of this.automationHistory) {
      if (!actionsByType.has(action.action)) {
        actionsByType.set(action.action, { automated: 0, manual: 0, success: 0 });
      }
      
      const stats = actionsByType.get(action.action);
      if (action.manualIntervention) {
        stats.manual++;
      } else {
        stats.automated++;
      }
      if (action.success) {
        stats.success++;
      }
    }

    return {
      automationLevel,
      targetAutomationLevel: this.automationLevel,
      manualInterventionRate,
      totalActions,
      automatedActions,
      successRate,
      actionsByType,
    };
  }

  async optimizeAutomation(): Promise<{
    recommendations: string[];
    expectedAutomationImprovement: number;
    rulesToAdd: Array<{
      condition: string;
      action: string;
      priority: number;
      automationRate: number;
    }>;
  }> {
    const metrics = await this.getAutomationMetrics();
    const recommendations = [];
    const rulesToAdd = [];
    let expectedImprovement = 0;

    if (metrics.automationLevel < this.automationLevel) {
      recommendations.push('Increase automation rates for high-priority rules');
      expectedImprovement += 0.1;
    }

    if (metrics.successRate < 0.95) {
      recommendations.push('Improve action execution reliability');
      expectedImprovement += 0.05;
    }

    // Suggest new automation rules based on patterns
    if (metrics.actionsByType.has('initiate_load_balancing') && 
        metrics.actionsByType.get('initiate_load_balancing').manual > 10) {
      rulesToAdd.push({
        condition: 'gridStability < 0.7',
        action: 'emergency_balancing',
        priority: 1,
        automationRate: 0.99,
      });
      expectedImprovement += 0.08;
    }

    return {
      recommendations,
      expectedAutomationImprovement: expectedImprovement,
      rulesToAdd,
    };
  }
}

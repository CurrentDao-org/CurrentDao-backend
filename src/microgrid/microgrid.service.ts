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

  constructor(
    private readonly gridIntegrationService: GridIntegrationService,
    private readonly energyManagementService: EnergyManagementService,
    private readonly loadBalancingService: LoadBalancingService,
    private readonly storageManagementService: StorageManagementService,
    private readonly gridMonitorService: GridMonitorService,
  ) {}

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

  async startAutomatedManagement(): Promise<void> {
    this.logger.log('Starting automated microgrid management');
  }

  async stopAutomatedManagement(): Promise<void> {
    this.logger.log('Stopping automated microgrid management');
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
}

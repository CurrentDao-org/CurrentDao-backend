import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { MicrogridNode } from '../microgrid.service';

export interface GridNode {
  id: string;
  name: string;
  type: string;
  capacity: number;
  currentOutput: number;
  status: string;
  location: {
    latitude: number;
    longitude: number;
  };
  lastUpdated: Date;
  connectionQuality: number;
  latency: number;
}

export interface GridMetrics {
  totalNodes: number;
  activeNodes: number;
  totalCapacity: number;
  currentOutput: number;
  averageLatency: number;
  connectionQuality: number;
  gridEfficiency: number;
  timestamp: Date;
}

@Injectable()
export class GridIntegrationService {
  private readonly logger = new Logger(GridIntegrationService.name);
  private readonly gridNodes = new Map<string, GridNode>();
  private readonly maxNodes = 100;

  async registerNode(node: MicrogridNode): Promise<void> {
    if (this.gridNodes.size >= this.maxNodes) {
      throw new Error(`Maximum grid nodes (${this.maxNodes}) reached`);
    }

    const gridNode: GridNode = {
      ...node,
      lastUpdated: new Date(),
      connectionQuality: 1.0,
      latency: Math.random() * 100,
    };

    this.gridNodes.set(node.id, gridNode);
    this.logger.log(`Registered grid node: ${node.name} (${node.id})`);
  }

  async unregisterNode(nodeId: string): Promise<void> {
    const deleted = this.gridNodes.delete(nodeId);
    if (deleted) {
      this.logger.log(`Unregistered grid node: ${nodeId}`);
    }
  }

  async updateNode(nodeId: string, updates: Partial<MicrogridNode>): Promise<void> {
    const node = this.gridNodes.get(nodeId);
    if (!node) {
      throw new Error(`Grid node ${nodeId} not found`);
    }

    const updatedNode = { 
      ...node, 
      ...updates,
      lastUpdated: new Date(),
    };
    
    this.gridNodes.set(nodeId, updatedNode);
    this.logger.log(`Updated grid node: ${nodeId}`);
  }

  async getGridMetrics(): Promise<GridMetrics> {
    const nodes = Array.from(this.gridNodes.values());
    const activeNodes = nodes.filter(node => node.status === 'online');
    
    const totalCapacity = nodes.reduce((sum, node) => sum + node.capacity, 0);
    const currentOutput = activeNodes.reduce((sum, node) => sum + node.currentOutput, 0);
    const averageLatency = nodes.reduce((sum, node) => sum + node.latency, 0) / nodes.length || 0;
    const connectionQuality = nodes.reduce((sum, node) => sum + node.connectionQuality, 0) / nodes.length || 0;
    
    const gridEfficiency = totalCapacity > 0 ? currentOutput / totalCapacity : 0;

    return {
      totalNodes: nodes.length,
      activeNodes: activeNodes.length,
      totalCapacity,
      currentOutput,
      averageLatency,
      connectionQuality,
      gridEfficiency,
      timestamp: new Date(),
    };
  }

  async getNodeHealth(nodeId: string): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: any;
  }> {
    const node = this.gridNodes.get(nodeId);
    if (!node) {
      throw new Error(`Grid node ${nodeId} not found`);
    }

    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    if (node.connectionQuality < 0.8) {
      issues.push('Poor connection quality');
      status = 'warning';
    }

    if (node.latency > 200) {
      issues.push('High latency detected');
      status = 'critical';
    }

    if (node.status !== 'online') {
      issues.push('Node is offline');
      status = 'critical';
    }

    return {
      status,
      issues,
      metrics: {
        connectionQuality: node.connectionQuality,
        latency: node.latency,
        uptime: this.calculateUptime(node),
        lastUpdated: node.lastUpdated,
      },
    };
  }

  async optimizeGridTopology(): Promise<{
    optimizations: string[];
    expectedImprovement: number;
  }> {
    const metrics = await this.getGridMetrics();
    const optimizations: string[] = [];
    let expectedImprovement = 0;

    if (metrics.averageLatency > 100) {
      optimizations.push('Rebalance network topology to reduce latency');
      expectedImprovement += 0.15;
    }

    if (metrics.connectionQuality < 0.9) {
      optimizations.push('Upgrade connection infrastructure');
      expectedImprovement += 0.1;
    }

    if (metrics.gridEfficiency < 0.8) {
      optimizations.push('Redistribute load across nodes');
      expectedImprovement += 0.2;
    }

    this.logger.log(`Grid topology optimization: ${optimizations.length} improvements identified`);
    
    return {
      optimizations,
      expectedImprovement,
    };
  }

  async simulateGridFailure(nodeId: string): Promise<{
    impact: any;
    recoveryPlan: string[];
  }> {
    const node = this.gridNodes.get(nodeId);
    if (!node) {
      throw new Error(`Grid node ${nodeId} not found`);
    }

    const metrics = await this.getGridMetrics();
    const impact = {
      capacityLoss: node.capacity,
      outputLoss: node.currentOutput,
      gridEfficiencyImpact: node.currentOutput / metrics.currentOutput,
      affectedNodes: this.getAffectedNodes(nodeId),
    };

    const recoveryPlan = [
      `Activate backup power for ${node.name}`,
      'Redistribute load to neighboring nodes',
      'Engage demand response protocols',
      'Notify maintenance team',
    ];

    this.logger.warn(`Simulated failure for node ${nodeId}: Impact analysis completed`);

    return {
      impact,
      recoveryPlan,
    };
  }

  @Interval(30000)
  async updateNodeMetrics(): Promise<void> {
    for (const [nodeId, node] of this.gridNodes) {
      const connectionQuality = Math.max(0.1, Math.min(1.0, 
        node.connectionQuality + (Math.random() - 0.5) * 0.1
      ));
      
      const latency = Math.max(1, node.latency + (Math.random() - 0.5) * 20);

      this.gridNodes.set(nodeId, {
        ...node,
        connectionQuality,
        latency,
        lastUpdated: new Date(),
      });
    }
  }

  @Cron('*/2 * * * *')
  async performHealthCheck(): Promise<void> {
    const metrics = await this.getGridMetrics();
    
    if (metrics.connectionQuality < 0.8) {
      this.logger.warn(`Grid connection quality degraded: ${metrics.connectionQuality}`);
    }

    if (metrics.averageLatency > 150) {
      this.logger.warn(`Grid latency elevated: ${metrics.averageLatency}ms`);
    }

    if (metrics.activeNodes < metrics.totalNodes * 0.9) {
      this.logger.warn(`Multiple nodes offline: ${metrics.totalNodes - metrics.activeNodes} of ${metrics.totalNodes}`);
    }
  }

  private calculateUptime(node: GridNode): number {
    const timeDiff = Date.now() - node.lastUpdated.getTime();
    return Math.max(0, 1 - timeDiff / (24 * 60 * 60 * 1000));
  }

  private getAffectedNodes(nodeId: string): string[] {
    const targetNode = this.gridNodes.get(nodeId);
    if (!targetNode) return [];

    return Array.from(this.gridNodes.values())
      .filter(node => {
        const distance = this.calculateDistance(
          targetNode.location,
          node.location
        );
        return distance < 50 && node.id !== nodeId;
      })
      .map(node => node.id);
  }

  private calculateDistance(
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ): number {
    const R = 6371;
    const dLat = (loc2.latitude - loc1.latitude) * Math.PI / 180;
    const dLon = (loc2.longitude - loc1.longitude) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(loc1.latitude * Math.PI / 180) * Math.cos(loc2.latitude * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async getGridTopology(): Promise<{
    nodes: GridNode[];
    connections: Array<{
      from: string;
      to: string;
      strength: number;
      latency: number;
    }>;
  }> {
    const nodes = Array.from(this.gridNodes.values());
    const connections = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const distance = this.calculateDistance(nodes[i].location, nodes[j].location);
        if (distance < 100) {
          connections.push({
            from: nodes[i].id,
            to: nodes[j].id,
            strength: Math.max(0.1, 1 - distance / 100),
            latency: distance * 2 + Math.random() * 10,
          });
        }
      }
    }

    return {
      nodes,
      connections,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { MicrogridNode, GridStatus } from '../microgrid.service';

export interface LoadBalanceAction {
  nodeId: string;
  action: 'increase' | 'decrease' | 'maintain';
  amount: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export interface DemandResponse {
  id: string;
  type: 'shed' | 'shift' | 'dispatch';
  amount: number;
  duration: number;
  participants: string[];
  status: 'pending' | 'active' | 'completed';
  timestamp: Date;
}

export interface BalancingMetrics {
  totalLoad: number;
  targetLoad: number;
  imbalance: number;
  responseTime: number;
  successRate: number;
  activeResponses: number;
  timestamp: Date;
}

@Injectable()
export class LoadBalancingService {
  private readonly logger = new Logger(LoadBalancingService.name);
  private readonly balanceActions: LoadBalanceAction[] = [];
  private readonly demandResponses: DemandResponse[] = [];
  private readonly targetLoadRatio = 0.85;

  async balanceLoad(nodes: MicrogridNode[], gridStatus: GridStatus): Promise<void> {
    this.logger.log('Starting load balancing process');

    const currentLoad = gridStatus.currentLoad;
    const targetLoad = gridStatus.totalCapacity * this.targetLoadRatio;
    const imbalance = currentLoad - targetLoad;

    if (Math.abs(imbalance) < gridStatus.totalCapacity * 0.05) {
      this.logger.log('Load is already balanced');
      return;
    }

    const actions = await this.calculateBalancingActions(nodes, imbalance, gridStatus);
    await this.executeBalancingActions(actions);

    this.logger.log(`Load balancing completed: ${actions.length} actions executed`);
  }

  async initiateDemandResponse(
    amount: number,
    duration: number,
    type: 'shed' | 'shift' | 'dispatch' = 'shed'
  ): Promise<DemandResponse> {
    const response: DemandResponse = {
      id: `dr_${Date.now()}`,
      type,
      amount,
      duration,
      participants: await this.selectParticipants(amount),
      status: 'pending',
      timestamp: new Date(),
    };

    this.demandResponses.push(response);
    this.logger.log(`Demand response initiated: ${type} ${amount}kW for ${duration}min`);

    await this.activateDemandResponse(response);
    return response;
  }

  async getBalancingMetrics(): Promise<BalancingMetrics> {
    const activeResponses = this.demandResponses.filter(dr => dr.status === 'active');
    const recentActions = this.balanceActions.slice(-10);
    
    const totalLoad = recentActions.reduce((sum, action) => {
      return sum + (action.action === 'increase' ? action.amount : -action.amount);
    }, 0);

    const targetLoad = 1000;
    const imbalance = totalLoad - targetLoad;
    const responseTime = 150;
    const successRate = recentActions.length > 0 ? 
      recentActions.filter(action => action.priority === 'high').length / recentActions.length : 1;

    return {
      totalLoad,
      targetLoad,
      imbalance,
      responseTime,
      successRate,
      activeResponses: activeResponses.length,
      timestamp: new Date(),
    };
  }

  async predictLoadImbalance(hours: number = 6): Promise<{
    timestamp: Date;
    predictedImbalance: number;
    confidence: number;
    recommendations: string[];
  }[]> {
    const predictions = [];
    const currentTime = new Date();

    for (let i = 1; i <= hours; i++) {
      const futureTime = new Date(currentTime.getTime() + i * 60 * 60 * 1000);
      const predictedLoad = this.predictLoad(futureTime);
      const predictedSupply = this.predictSupply(futureTime);
      const imbalance = predictedLoad - predictedSupply;
      const confidence = 0.8 - (i * 0.05);

      const recommendations = this.generateImbalanceRecommendations(imbalance);

      predictions.push({
        timestamp: futureTime,
        predictedImbalance: imbalance,
        confidence,
        recommendations,
      });
    }

    return predictions;
  }

  @Interval(60000)
  async monitorLoadBalance(): Promise<void> {
    const metrics = await this.getBalancingMetrics();
    
    if (Math.abs(metrics.imbalance) > metrics.targetLoad * 0.1) {
      this.logger.warn(`Load imbalance detected: ${metrics.imbalance}kW`);
      await this.initiateAutomaticBalancing(metrics.imbalance);
    }

    if (metrics.responseTime > 300) {
      this.logger.warn(`Slow response time: ${metrics.responseTime}ms`);
    }
  }

  @Cron('*/5 * * * *')
  async optimizeDemandResponse(): Promise<void> {
    const activeResponses = this.demandResponses.filter(dr => dr.status === 'active');
    
    for (const response of activeResponses) {
      if (Date.now() - response.timestamp.getTime() > response.duration * 60 * 1000) {
        response.status = 'completed';
        this.logger.log(`Demand response completed: ${response.id}`);
      }
    }

    this.cleanupCompletedResponses();
  }

  private async calculateBalancingActions(
    nodes: MicrogridNode[],
    imbalance: number,
    gridStatus: GridStatus
  ): Promise<LoadBalanceAction[]> {
    const actions: LoadBalanceAction[] = [];
    const actionNeeded = Math.abs(imbalance);

    if (imbalance > 0) {
      const batteryNodes = nodes.filter(node => node.type === 'battery' && node.status === 'online');
      const controllableLoads = nodes.filter(node => node.type === 'load' && node.status === 'online');

      for (const battery of batteryNodes) {
        const dischargeCapacity = battery.capacity * 0.8;
        if (dischargeCapacity > 0 && actionNeeded > 0) {
          const amount = Math.min(dischargeCapacity, actionNeeded);
          actions.push({
            nodeId: battery.id,
            action: 'increase',
            amount,
            reason: 'Discharge battery to reduce grid load',
            priority: 'high',
            timestamp: new Date(),
          });
        }
      }

      for (const load of controllableLoads) {
        if (actionNeeded > 0) {
          const reduction = Math.min(load.currentOutput * 0.3, actionNeeded);
          actions.push({
            nodeId: load.id,
            action: 'decrease',
            amount: reduction,
            reason: 'Reduce controllable load',
            priority: 'medium',
            timestamp: new Date(),
          });
        }
      }
    } else {
      const renewableNodes = nodes.filter(node => 
        ['solar', 'wind'].includes(node.type) && node.status === 'online'
      );

      for (const renewable of renewableNodes) {
        const availableCapacity = renewable.capacity - renewable.currentOutput;
        if (availableCapacity > 0 && actionNeeded > 0) {
          const amount = Math.min(availableCapacity, actionNeeded);
          actions.push({
            nodeId: renewable.id,
            action: 'increase',
            amount,
            reason: 'Increase renewable generation',
            priority: 'high',
            timestamp: new Date(),
          });
        }
      }
    }

    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private async executeBalancingActions(actions: LoadBalanceAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeAction(action);
        this.balanceActions.push(action);
        
        this.logger.log(`Executed balance action: ${action.action} ${action.amount}kW for node ${action.nodeId}`);
      } catch (error) {
        this.logger.error(`Failed to execute balance action for node ${action.nodeId}:`, error);
      }
    }
  }

  private async executeAction(action: LoadBalanceAction): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, Math.random() * 1000 + 500);
    });
  }

  private async selectParticipants(amount: number): Promise<string[]> {
    return [`participant_${Date.now()}`, `participant_${Date.now() + 1}`];
  }

  private async activateDemandResponse(response: DemandResponse): Promise<void> {
    response.status = 'active';
    this.logger.log(`Demand response activated: ${response.id}`);
  }

  private async initiateAutomaticBalancing(imbalance: number): Promise<void> {
    const amount = Math.abs(imbalance);
    const type = imbalance > 0 ? 'shed' : 'dispatch';
    const duration = 30;

    await this.initiateDemandResponse(amount, duration, type);
  }

  private predictLoad(time: Date): number {
    const hour = time.getHours();
    const baseLoad = 1000;
    
    if (hour >= 6 && hour <= 9) return baseLoad * 1.3;
    if (hour >= 17 && hour <= 21) return baseLoad * 1.5;
    if (hour >= 0 && hour <= 5) return baseLoad * 0.6;
    
    return baseLoad;
  }

  private predictSupply(time: Date): number {
    const hour = time.getHours();
    const baseSupply = 1200;
    
    if (hour >= 10 && hour <= 15) return baseSupply * 1.4;
    if (hour >= 0 && hour <= 5) return baseSupply * 0.4;
    
    return baseSupply;
  }

  private generateImbalanceRecommendations(imbalance: number): string[] {
    const recommendations: string[] = [];

    if (imbalance > 100) {
      recommendations.push('Initiate load shedding program');
      recommendations.push('Deploy battery storage');
      recommendations.push('Activate demand response');
    } else if (imbalance < -100) {
      recommendations.push('Increase renewable generation');
      recommendations.push('Charge battery systems');
      recommendations.push('Offer excess energy to market');
    } else {
      recommendations.push('Monitor grid conditions');
      recommendations.push('Prepare contingency plans');
    }

    return recommendations;
  }

  private cleanupCompletedResponses(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    
    for (let i = this.demandResponses.length - 1; i >= 0; i--) {
      if (this.demandResponses[i].timestamp.getTime() < cutoffTime) {
        this.demandResponses.splice(i, 1);
      }
    }
  }

  async getLoadBalancingHistory(): Promise<{
    actions: LoadBalanceAction[];
    responses: DemandResponse[];
    metrics: BalancingMetrics;
  }> {
    const metrics = await this.getBalancingMetrics();
    
    return {
      actions: this.balanceActions.slice(-50),
      responses: this.demandResponses.slice(-20),
      metrics,
    };
  }
}

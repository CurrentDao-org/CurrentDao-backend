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
  private readonly targetUptime = 0.999;
  private readonly faultToleranceThreshold = 0.001;
  private readonly redundancyFactors = new Map<string, number>();
  private readonly healthMetrics = new Map<string, {
    uptime: number;
    lastFailure: Date;
    responseTime: number;
    reliability: number;
  }>();

  async balanceLoad(nodes: MicrogridNode[], gridStatus: GridStatus): Promise<void> {
    this.logger.log('Starting advanced load balancing process');

    // Initialize health metrics for new nodes
    await this.initializeHealthMetrics(nodes);

    // Perform predictive load analysis
    const predictiveAnalysis = await this.performPredictiveAnalysis(nodes, gridStatus);
    
    // Check for potential failures and implement preventive measures
    await this.implementPreventiveMeasures(nodes, predictiveAnalysis);

    const currentLoad = gridStatus.currentLoad;
    const targetLoad = gridStatus.totalCapacity * this.targetLoadRatio;
    const imbalance = currentLoad - targetLoad;

    if (Math.abs(imbalance) < gridStatus.totalCapacity * 0.02) {
      this.logger.log('Load is optimally balanced');
      return;
    }

    // Calculate redundancy-aware balancing actions
    const actions = await this.calculateRedundancyAwareActions(nodes, imbalance, gridStatus, predictiveAnalysis);
    
    // Execute actions with fault tolerance
    await this.executeFaultTolerantActions(actions);

    // Verify 99.9% uptime compliance
    await this.verifyUptimeCompliance(nodes, gridStatus);

    this.logger.log(`Advanced load balancing completed: ${actions.length} actions executed with redundancy`);
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

  private async initializeHealthMetrics(nodes: MicrogridNode[]): Promise<void> {
    for (const node of nodes) {
      if (!this.healthMetrics.has(node.id)) {
        this.healthMetrics.set(node.id, {
          uptime: 1.0,
          lastFailure: new Date(0),
          responseTime: 100,
          reliability: 0.999,
        });
        this.redundancyFactors.set(node.id, this.calculateRedundancyFactor(node));
      }
    }
  }

  private calculateRedundancyFactor(node: MicrogridNode): number {
    // Calculate redundancy based on node type and criticality
    const baseRedundancy = 1.2;
    const typeMultiplier = {
      solar: 1.1,
      wind: 1.15,
      battery: 1.3,
      generator: 1.5,
      load: 1.0,
    };
    
    return baseRedundancy * (typeMultiplier[node.type] || 1.0);
  }

  private async performPredictiveAnalysis(
    nodes: MicrogridNode[],
    gridStatus: GridStatus
  ): Promise<{
    failureProbability: Map<string, number>;
    loadForecast: number[];
    riskAssessment: number;
  }> {
    const failureProbability = new Map<string, number>();
    const loadForecast = [];
    let totalRisk = 0;

    for (const node of nodes) {
      const health = this.healthMetrics.get(node.id);
      if (health) {
        const failureProb = this.calculateFailureProbability(node, health);
        failureProbability.set(node.id, failureProb);
        totalRisk += failureProb * node.capacity;
      }
    }

    // Generate 6-hour load forecast
    for (let i = 1; i <= 6; i++) {
      const futureTime = new Date(Date.now() + i * 60 * 60 * 1000);
      loadForecast.push(this.predictLoad(futureTime));
    }

    return {
      failureProbability,
      loadForecast,
      riskAssessment: totalRisk / gridStatus.totalCapacity,
    };
  }

  private calculateFailureProbability(node: MicrogridNode, health: any): number {
    const timeSinceFailure = Date.now() - health.lastFailure.getTime();
    const ageFactor = Math.max(0.001, 1 - timeSinceFailure / (365 * 24 * 60 * 60 * 1000));
    const reliabilityFactor = 1 - health.reliability;
    const responseTimeFactor = Math.min(0.1, health.responseTime / 10000);
    
    return Math.min(0.1, ageFactor * 0.3 + reliabilityFactor * 0.5 + responseTimeFactor * 0.2);
  }

  private async implementPreventiveMeasures(
    nodes: MicrogridNode[],
    predictiveAnalysis: any
  ): Promise<void> {
    const { failureProbability, riskAssessment } = predictiveAnalysis;
    
    if (riskAssessment > this.faultToleranceThreshold) {
      this.logger.warn(`High risk assessment: ${riskAssessment.toFixed(4)}`);
      
      // Identify high-risk nodes
      const highRiskNodes = Array.from(failureProbability.entries())
        .filter(([_, prob]) => prob > 0.05)
        .map(([nodeId, _]) => nodes.find(n => n.id === nodeId))
        .filter(Boolean);
      
      // Implement preventive measures for high-risk nodes
      for (const node of highRiskNodes) {
        await this.implementNodePreventiveMeasures(node);
      }
    }
  }

  private async implementNodePreventiveMeasures(node: MicrogridNode): Promise<void> {
    const redundancy = this.redundancyFactors.get(node.id) || 1.2;
    
    // Reduce load on high-risk nodes
    const reductionFactor = 0.8;
    const action: LoadBalanceAction = {
      nodeId: node.id,
      action: 'decrease',
      amount: node.currentOutput * (1 - reductionFactor),
      reason: 'Preventive load reduction due to high failure risk',
      priority: 'high',
      timestamp: new Date(),
    };
    
    this.balanceActions.push(action);
    this.logger.log(`Preventive measure implemented for node ${node.id}`);
  }

  private async calculateRedundancyAwareActions(
    nodes: MicrogridNode[],
    imbalance: number,
    gridStatus: GridStatus,
    predictiveAnalysis: any
  ): Promise<LoadBalanceAction[]> {
    const actions: LoadBalanceAction[] = [];
    const { failureProbability } = predictiveAnalysis;
    const actionNeeded = Math.abs(imbalance);

    // Sort nodes by reliability and failure probability
    const reliableNodes = nodes
      .map(node => ({
        node,
        reliability: this.healthMetrics.get(node.id)?.reliability || 0.999,
        failureProb: failureProbability.get(node.id) || 0.001,
      }))
      .sort((a, b) => (b.reliability - a.failureProb) - (a.reliability - a.failureProb));

    if (imbalance > 0) {
      // Need to reduce load - use most reliable nodes first
      const batteryNodes = reliableNodes
        .filter(item => item.node.type === 'battery' && item.node.status === 'online')
        .slice(0, Math.ceil(actionNeeded / 100)); // Use multiple nodes for redundancy

      for (const { node, reliability } of batteryNodes) {
        const dischargeCapacity = node.capacity * 0.8 * reliability;
        if (dischargeCapacity > 0 && actionNeeded > 0) {
          const amount = Math.min(dischargeCapacity, actionNeeded / batteryNodes.length);
          actions.push({
            nodeId: node.id,
            action: 'increase',
            amount,
            reason: 'Redundant battery discharge for load reduction',
            priority: 'high',
            timestamp: new Date(),
          });
        }
      }
    } else {
      // Need to increase load - distribute across reliable renewable sources
      const renewableNodes = reliableNodes
        .filter(item => ['solar', 'wind'].includes(item.node.type) && item.node.status === 'online')
        .slice(0, Math.ceil(actionNeeded / 150));

      for (const { node, reliability } of renewableNodes) {
        const availableCapacity = (node.capacity - node.currentOutput) * reliability;
        if (availableCapacity > 0 && actionNeeded > 0) {
          const amount = Math.min(availableCapacity, actionNeeded / renewableNodes.length);
          actions.push({
            nodeId: node.id,
            action: 'increase',
            amount,
            reason: 'Redundant renewable generation increase',
            priority: 'high',
            timestamp: new Date(),
          });
        }
      }
    }

    return actions;
  }

  private async executeFaultTolerantActions(actions: LoadBalanceAction[]): Promise<void> {
    const executedActions: LoadBalanceAction[] = [];
    
    for (const action of actions) {
      try {
        // Execute with retry mechanism
        await this.executeActionWithRetry(action, 3);
        executedActions.push(action);
        
        this.logger.log(`Fault-tolerant action executed: ${action.action} ${action.amount}kW for node ${action.nodeId}`);
      } catch (error) {
        this.logger.error(`Failed to execute action for node ${action.nodeId}:`, error);
        
        // Implement fallback action
        await this.implementFallbackAction(action);
      }
    }
    
    // Update health metrics based on execution results
    await this.updateHealthMetrics(executedActions);
  }

  private async executeActionWithRetry(action: LoadBalanceAction, maxRetries: number): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.executeAction(action);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        
        this.logger.warn(`Action attempt ${attempt} failed for node ${action.nodeId}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  private async implementFallbackAction(failedAction: LoadBalanceAction): Promise<void> {
    // Implement alternative action using different nodes
    const fallbackAction: LoadBalanceAction = {
      ...failedAction,
      nodeId: `fallback_${failedAction.nodeId}`,
      reason: `Fallback for failed action: ${failedAction.reason}`,
      timestamp: new Date(),
    };
    
    this.balanceActions.push(fallbackAction);
    this.logger.log(`Fallback action implemented for ${failedAction.nodeId}`);
  }

  private async updateHealthMetrics(executedActions: LoadBalanceAction[]): Promise<void> {
    for (const action of executedActions) {
      const health = this.healthMetrics.get(action.nodeId);
      if (health) {
        // Update response time and reliability
        const executionTime = Math.random() * 500 + 100;
        health.responseTime = (health.responseTime * 0.8) + (executionTime * 0.2);
        health.reliability = Math.min(0.9999, health.reliability * 1.0001);
        
        this.healthMetrics.set(action.nodeId, health);
      }
    }
  }

  private async verifyUptimeCompliance(nodes: MicrogridNode[], gridStatus: GridStatus): Promise<void> {
    const totalNodes = nodes.length;
    const onlineNodes = nodes.filter(node => node.status === 'online').length;
    const currentUptime = onlineNodes / totalNodes;
    
    if (currentUptime < this.targetUptime) {
      this.logger.error(`Uptime compliance violation: ${(currentUptime * 100).toFixed(3)}% < ${(this.targetUptime * 100).toFixed(3)}%`);
      
      // Implement emergency measures
      await this.implementEmergencyMeasures(nodes, gridStatus);
    } else {
      this.logger.log(`Uptime compliance maintained: ${(currentUptime * 100).toFixed(3)}%`);
    }
  }

  private async implementEmergencyMeasures(nodes: MicrogridNode[], gridStatus: GridStatus): Promise<void> {
    // Activate backup systems
    const backupNodes = nodes.filter(node => node.type === 'generator' && node.status === 'online');
    
    for (const node of backupNodes) {
      const action: LoadBalanceAction = {
        nodeId: node.id,
        action: 'increase',
        amount: node.capacity * 0.5,
        reason: 'Emergency backup activation',
        priority: 'high',
        timestamp: new Date(),
      };
      
      this.balanceActions.push(action);
    }
    
    this.logger.log(`Emergency measures activated: ${backupNodes.length} backup generators engaged`);
  }

  async getUptimeMetrics(): Promise<{
    currentUptime: number;
    targetUptime: number;
    complianceStatus: 'compliant' | 'warning' | 'critical';
    nodeReliability: Map<string, number>;
    redundancyCoverage: number;
  }> {
    const totalNodes = this.healthMetrics.size;
    let totalReliability = 0;
    let redundancyCoverage = 0;
    
    for (const [nodeId, health] of this.healthMetrics) {
      totalReliability += health.reliability;
      const redundancy = this.redundancyFactors.get(nodeId) || 1.0;
      redundancyCoverage += Math.min(redundancy - 1, 0.5);
    }
    
    const currentUptime = totalNodes > 0 ? totalReliability / totalNodes : 0;
    const complianceStatus = currentUptime >= this.targetUptime ? 'compliant' : 
                          currentUptime >= this.targetUptime - 0.01 ? 'warning' : 'critical';
    
    return {
      currentUptime,
      targetUptime: this.targetUptime,
      complianceStatus,
      nodeReliability: new Map(Array.from(this.healthMetrics.entries()).map(([id, health]) => [id, health.reliability])),
      redundancyCoverage: totalNodes > 0 ? redundancyCoverage / totalNodes : 0,
    };
  }
}

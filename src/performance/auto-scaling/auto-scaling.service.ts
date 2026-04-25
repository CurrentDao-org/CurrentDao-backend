import { Injectable } from '@nestjs/common';

export interface ScalingPolicy {
  name: string;
  resource: 'cpu' | 'memory' | 'network' | 'custom';
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  minInstances: number;
  maxInstances: number;
  cooldownPeriod: number; // seconds
  predictiveScaling: boolean;
  algorithm: 'linear' | 'exponential' | 'step';
}

export interface ScalingEvent {
  id: string;
  timestamp: string;
  action: 'scale-up' | 'scale-down';
  resource: string;
  fromInstances: number;
  toInstances: number;
  reason: string;
  metrics: Record<string, number>;
  duration: number;
  success: boolean;
}

export interface PredictiveModel {
  name: string;
  accuracy: number;
  horizon: number; // minutes
  lastTrained: string;
  predictions: PredictivePrediction[];
}

export interface PredictivePrediction {
  timestamp: string;
  predictedValue: number;
  confidence: number;
  resource: string;
}

@Injectable()
export class AutoScalingService {
  private readonly scalingPolicies: Map<string, ScalingPolicy> = new Map();
  private readonly scalingEvents: ScalingEvent[] = [];
  private readonly predictiveModels: Map<string, PredictiveModel> = new Map();
  private readonly cooldownTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultPolicies();
    this.initializePredictiveModels();
  }

  async executeScaling(action: 'scale-up' | 'scale-down', target?: string): Promise<any> {
    try {
      const startTime = Date.now();
      const policy = target ? this.scalingPolicies.get(target) : this.getDefaultPolicy();
      
      if (!policy) {
        throw new Error(`No scaling policy found for target: ${target}`);
      }

      // Check cooldown period
      if (this.isInCooldown(policy.name)) {
        return {
          success: false,
          reason: 'Scaling action blocked by cooldown period',
          policy: policy.name,
          remainingCooldown: this.getRemainingCooldown(policy.name),
        };
      }

      const currentInstances = await this.getCurrentInstances(policy);
      const newInstances = this.calculateNewInstances(action, currentInstances, policy);
      
      if (newInstances === currentInstances) {
        return {
          success: false,
          reason: 'No scaling needed',
          policy: policy.name,
          currentInstances,
        };
      }

      // Execute scaling
      const scalingResult = await this.performScaling(newInstances, policy);
      const duration = Date.now() - startTime;

      // Record scaling event
      const event: ScalingEvent = {
        id: this.generateEventId(),
        timestamp: new Date().toISOString(),
        action,
        resource: policy.resource,
        fromInstances: currentInstances,
        toInstances: newInstances,
        reason: `${action} triggered by ${policy.resource} threshold`,
        metrics: await this.getCurrentMetrics(),
        duration,
        success: scalingResult.success,
      };

      this.scalingEvents.push(event);
      this.setCooldown(policy.name);

      return {
        success: scalingResult.success,
        event,
        policy: policy.name,
        scalingTime: duration,
      };
    } catch (error) {
      throw new Error(`Failed to execute scaling: ${error.message}`);
    }
  }

  async checkAutoScaling(): Promise<any> {
    try {
      const metrics = await this.getCurrentMetrics();
      const recommendations: any[] = [];

      for (const [name, policy] of this.scalingPolicies) {
        const recommendation = await this.evaluatePolicy(policy, metrics);
        if (recommendation.action) {
          recommendations.push({
            policy: name,
            ...recommendation,
          });
        }
      }

      // Execute predictive scaling if enabled
      const predictiveRecommendations = await this.getPredictiveRecommendations();
      recommendations.push(...predictiveRecommendations);

      return {
        timestamp: new Date().toISOString(),
        currentMetrics: metrics,
        recommendations,
        totalRecommendations: recommendations.length,
      };
    } catch (error) {
      throw new Error(`Failed to check auto-scaling: ${error.message}`);
    }
  }

  async createPolicy(policy: ScalingPolicy): Promise<ScalingPolicy> {
    this.scalingPolicies.set(policy.name, policy);
    return policy;
  }

  async updatePolicy(name: string, updates: Partial<ScalingPolicy>): Promise<ScalingPolicy> {
    const existing = this.scalingPolicies.get(name);
    if (!existing) {
      throw new Error(`Policy not found: ${name}`);
    }

    const updated = { ...existing, ...updates };
    this.scalingPolicies.set(name, updated);
    return updated;
  }

  async deletePolicy(name: string): Promise<boolean> {
    return this.scalingPolicies.delete(name);
  }

  async getScalingHistory(limit = 50): Promise<ScalingEvent[]> {
    return this.scalingEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async getPredictiveModels(): Promise<PredictiveModel[]> {
    return Array.from(this.predictiveModels.values());
  }

  async trainPredictiveModel(modelName: string): Promise<any> {
    const model = this.predictiveModels.get(modelName);
    if (!model) {
      throw new Error(`Predictive model not found: ${modelName}`);
    }

    // Simulate model training
    const trainingTime = Math.random() * 300 + 60; // 1-6 minutes
    const newAccuracy = 0.85 + Math.random() * 0.1; // 85-95% accuracy

    // Update model
    model.lastTrained = new Date().toISOString();
    model.accuracy = newAccuracy;

    // Generate new predictions
    model.predictions = this.generatePredictions(model);

    return {
      model: modelName,
      trainingTime: Math.round(trainingTime),
      accuracy: newAccuracy,
      predictions: model.predictions.length,
      timestamp: new Date().toISOString(),
    };
  }

  private async evaluatePolicy(policy: ScalingPolicy, metrics: any): Promise<any> {
    const currentValue = metrics[policy.resource] || 0;
    let action: 'scale-up' | 'scale-down' | null = null;
    let reason = '';

    if (currentValue >= policy.scaleUpThreshold) {
      action = 'scale-up';
      reason = `${policy.resource} usage (${currentValue}%) exceeds scale-up threshold (${policy.scaleUpThreshold}%)`;
    } else if (currentValue <= policy.scaleDownThreshold) {
      action = 'scale-down';
      reason = `${policy.resource} usage (${currentValue}%) below scale-down threshold (${policy.scaleDownThreshold}%)`;
    }

    if (!action) {
      return { action: null, reason: 'No action needed' };
    }

    const currentInstances = await this.getCurrentInstances(policy);
    const newInstances = this.calculateNewInstances(action, currentInstances, policy);

    if (newInstances === currentInstances) {
      return { action: null, reason: 'Instance limits reached' };
    }

    return {
      action,
      reason,
      currentInstances,
      recommendedInstances: newInstances,
      confidence: this.calculateConfidence(currentValue, policy),
    };
  }

  private async getPredictiveRecommendations(): Promise<any[]> {
    const recommendations: any[] = [];

    for (const [name, model] of this.predictiveModels) {
      if (model.accuracy < 0.8) continue; // Skip low-accuracy models

      for (const prediction of model.predictions) {
        if (prediction.confidence < 0.7) continue; // Skip low-confidence predictions

        const timeToEvent = (new Date(prediction.timestamp).getTime() - Date.now()) / (1000 * 60); // minutes
        if (timeToEvent < 0 || timeToEvent > 60) continue; // Only consider events within next hour

        const policy = this.findPolicyForResource(prediction.resource);
        if (!policy) continue;

        let action: 'scale-up' | 'scale-down' | null = null;
        if (prediction.predictedValue >= policy.scaleUpThreshold) {
          action = 'scale-up';
        } else if (prediction.predictedValue <= policy.scaleDownThreshold) {
          action = 'scale-down';
        }

        if (action) {
          recommendations.push({
            type: 'predictive',
            model: name,
            action,
            resource: prediction.resource,
            predictedValue: prediction.predictedValue,
            confidence: prediction.confidence,
            timeToEvent: Math.round(timeToEvent),
            reason: `Predictive scaling based on ${name} model`,
          });
        }
      }
    }

    return recommendations;
  }

  private calculateNewInstances(action: 'scale-up' | 'scale-down', current: number, policy: ScalingPolicy): number {
    let newInstances: number;

    switch (policy.algorithm) {
      case 'linear':
        newInstances = action === 'scale-up' ? current + 1 : current - 1;
        break;
      case 'exponential':
        newInstances = action === 'scale-up' ? current * 2 : Math.floor(current / 2);
        break;
      case 'step':
        const step = Math.ceil(current * 0.25); // 25% steps
        newInstances = action === 'scale-up' ? current + step : current - step;
        break;
      default:
        newInstances = current;
    }

    // Apply bounds
    return Math.max(policy.minInstances, Math.min(policy.maxInstances, newInstances));
  }

  private async getCurrentInstances(policy: ScalingPolicy): Promise<number> {
    // Simulate getting current instance count
    return 3 + Math.floor(Math.random() * 5); // 3-7 instances
  }

  private async getCurrentMetrics(): Promise<any> {
    // Simulate getting current metrics
    return {
      cpu: 20 + Math.random() * 60, // 20-80%
      memory: 30 + Math.random() * 50, // 30-80%
      network: 10 + Math.random() * 70, // 10-80%
    };
  }

  private async performScaling(instances: number, policy: ScalingPolicy): Promise<any> {
    // Simulate scaling operation
    const scalingTime = Math.random() * 30 + 10; // 10-40 seconds
    const success = Math.random() > 0.05; // 95% success rate

    return {
      success,
      instances,
      scalingTime: Math.round(scalingTime),
      policy: policy.name,
    };
  }

  private isInCooldown(policyName: string): boolean {
    const timer = this.cooldownTimers.get(policyName);
    return timer !== undefined;
  }

  private setCooldown(policyName: string): void {
    const policy = this.scalingPolicies.get(policyName);
    if (!policy) return;

    // Clear existing timer
    const existingTimer = this.cooldownTimers.get(policyName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.cooldownTimers.delete(policyName);
    }, policy.cooldownPeriod * 1000);

    this.cooldownTimers.set(policyName, timer);
  }

  private getRemainingCooldown(policyName: string): number {
    // This would need to be implemented with actual timer tracking
    return 30; // Placeholder
  }

  private calculateConfidence(currentValue: number, policy: ScalingPolicy): number {
    const distance = Math.abs(currentValue - policy.scaleUpThreshold);
    const maxDistance = Math.max(policy.scaleUpThreshold, policy.scaleDownThreshold);
    return Math.max(0.5, Math.min(1.0, 1 - (distance / maxDistance)));
  }

  private findPolicyForResource(resource: string): ScalingPolicy | undefined {
    for (const policy of this.scalingPolicies.values()) {
      if (policy.resource === resource) {
        return policy;
      }
    }
    return undefined;
  }

  private generatePredictions(model: PredictiveModel): PredictivePrediction[] {
    const predictions: PredictivePrediction[] = [];
    const now = Date.now();

    for (let i = 1; i <= model.horizon; i++) {
      const timestamp = new Date(now + i * 60 * 1000).toISOString();
      const predictedValue = 20 + Math.random() * 60; // 20-80%
      const confidence = Math.max(0.5, Math.min(0.95, model.accuracy + (Math.random() - 0.5) * 0.1));

      predictions.push({
        timestamp,
        predictedValue,
        confidence,
        resource: 'cpu', // Default to CPU for demo
      });
    }

    return predictions;
  }

  private getDefaultPolicy(): ScalingPolicy {
    return this.scalingPolicies.get('default')!;
  }

  private generateEventId(): string {
    return `scaling_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: ScalingPolicy[] = [
      {
        name: 'default',
        resource: 'cpu',
        scaleUpThreshold: 75,
        scaleDownThreshold: 25,
        minInstances: 2,
        maxInstances: 10,
        cooldownPeriod: 300, // 5 minutes
        predictiveScaling: true,
        algorithm: 'linear',
      },
      {
        name: 'memory-based',
        resource: 'memory',
        scaleUpThreshold: 80,
        scaleDownThreshold: 30,
        minInstances: 2,
        maxInstances: 8,
        cooldownPeriod: 240, // 4 minutes
        predictiveScaling: false,
        algorithm: 'step',
      },
    ];

    defaultPolicies.forEach(policy => {
      this.scalingPolicies.set(policy.name, policy);
    });
  }

  private initializePredictiveModels(): void {
    const models: PredictiveModel[] = [
      {
        name: 'cpu-predictor',
        accuracy: 0.88,
        horizon: 60, // 60 minutes
        lastTrained: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
        predictions: [],
      },
      {
        name: 'memory-predictor',
        accuracy: 0.85,
        horizon: 45, // 45 minutes
        lastTrained: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        predictions: [],
      },
    ];

    models.forEach(model => {
      model.predictions = this.generatePredictions(model);
      this.predictiveModels.set(model.name, model);
    });
  }
}

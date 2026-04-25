import { Injectable } from '@nestjs/common';

export interface ResourceAnalytics {
  timestamp: string;
  period: number; // hours
  cpu: {
    average: number;
    peak: number;
    min: number;
    utilization: number;
  };
  memory: {
    average: number;
    peak: number;
    min: number;
    utilization: number;
    leaks: number;
  };
  network: {
    bandwidth: {
      in: number;
      out: number;
    };
    connections: {
      average: number;
      peak: number;
    };
    latency: {
      average: number;
      p95: number;
    };
  };
  disk: {
    usage: number;
    throughput: {
      read: number;
      write: number;
    };
    iops: {
      read: number;
      write: number;
    };
  };
  cost: {
    compute: number;
    storage: number;
    network: number;
    total: number;
    savings: number;
  };
  predictions: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
    confidence: number;
  };
}

export interface ResourceTrend {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  rate: number;
  prediction: number;
  recommendation: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface OptimizationInsight {
  type: 'cost' | 'performance' | 'capacity' | 'efficiency';
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  savings: number;
  implementation: string[];
}

@Injectable()
export class ResourceAnalyticsService {
  private readonly historicalData: ResourceAnalytics[] = [];
  private readonly trends: ResourceTrend[] = [];
  private readonly insights: OptimizationInsight[] = [];

  constructor() {
    this.initializeHistoricalData();
    this.initializeInsights();
  }

  async getAnalytics(periodHours: number): Promise<ResourceAnalytics> {
    const recentData = this.getRecentData(periodHours);
    
    if (recentData.length === 0) {
      return this.generateMockAnalytics(periodHours);
    }

    return this.aggregateAnalytics(recentData, periodHours);
  }

  async getTrends(): Promise<ResourceTrend[]> {
    await this.updateTrends();
    return [...this.trends];
  }

  async getInsights(): Promise<OptimizationInsight[]> {
    await this.updateInsights();
    return [...this.insights];
  }

  async predictResourceUsage(horizonHours: number): Promise<any> {
    const currentData = await this.getAnalytics(1);
    const predictions = this.generatePredictions(currentData, horizonHours);
    
    return {
      timestamp: new Date().toISOString(),
      horizon: horizonHours,
      predictions,
      confidence: this.calculatePredictionConfidence(),
      recommendations: this.generatePredictionRecommendations(predictions),
    };
  }

  async getCostAnalysis(): Promise<any> {
    const currentData = await this.getAnalytics(24);
    const monthlyCost = this.calculateMonthlyCost(currentData);
    const optimizationOpportunities = this.identifyCostOptimizations(currentData);
    
    return {
      timestamp: new Date().toISOString(),
      current: currentData.cost,
      monthly: monthlyCost,
      yearly: monthlyCost * 12,
      optimizations: optimizationOpportunities,
      potentialSavings: optimizationOpportunities.reduce((sum, opt) => sum + opt.savings, 0),
    };
  }

  async getCapacityPlanning(): Promise<any> {
    const currentUsage = await this.getAnalytics(24);
    const predictions = await this.predictResourceUsage(168); // 1 week
    const capacityNeeds = this.calculateCapacityNeeds(currentUsage, predictions);
    
    return {
      timestamp: new Date().toISOString(),
      current: currentUsage,
      predictions,
      capacity: capacityNeeds,
      recommendations: this.generateCapacityRecommendations(capacityNeeds),
      timeline: this.generateCapacityTimeline(capacityNeeds),
    };
  }

  private generateMockAnalytics(periodHours: number): ResourceAnalytics {
    const baseCpu = 30 + Math.random() * 40;
    const baseMemory = 40 + Math.random() * 30;
    const baseNetwork = 20 + Math.random() * 60;
    const baseDisk = 50 + Math.random() * 30;

    return {
      timestamp: new Date().toISOString(),
      period: periodHours,
      cpu: {
        average: baseCpu,
        peak: baseCpu + 20 + Math.random() * 20,
        min: Math.max(5, baseCpu - 15),
        utilization: baseCpu / 100,
      },
      memory: {
        average: baseMemory,
        peak: baseMemory + 15 + Math.random() * 15,
        min: Math.max(10, baseMemory - 20),
        utilization: baseMemory / 100,
        leaks: Math.floor(Math.random() * 5),
      },
      network: {
        bandwidth: {
          in: baseNetwork * 1000000, // Convert to bytes
          out: baseNetwork * 800000,
        },
        connections: {
          average: 100 + Math.random() * 400,
          peak: 500 + Math.random() * 500,
        },
        latency: {
          average: 50 + Math.random() * 100,
          p95: 150 + Math.random() * 200,
        },
      },
      disk: {
        usage: baseDisk,
        throughput: {
          read: 50000000 + Math.random() * 100000000, // bytes/sec
          write: 30000000 + Math.random() * 80000000,
        },
        iops: {
          read: 1000 + Math.random() * 2000,
          write: 800 + Math.random() * 1500,
        },
      },
      cost: {
        compute: baseCpu * 0.01 * periodHours, // $0.01 per CPU hour
        storage: baseDisk * 0.0001 * periodHours, // $0.0001 per GB hour
        network: baseNetwork * 0.00002 * periodHours, // $0.00002 per GB
        total: 0,
        savings: Math.random() * 10,
      },
      predictions: {
        cpu: baseCpu + (Math.random() - 0.5) * 10,
        memory: baseMemory + (Math.random() - 0.5) * 10,
        network: baseNetwork + (Math.random() - 0.5) * 15,
        disk: baseDisk + Math.random() * 5,
        confidence: 0.8 + Math.random() * 0.15,
      },
    };
  }

  private aggregateAnalytics(data: ResourceAnalytics[], periodHours: number): ResourceAnalytics {
    const cpu = this.aggregateCpu(data);
    const memory = this.aggregateMemory(data);
    const network = this.aggregateNetwork(data);
    const disk = this.aggregateDisk(data);
    const cost = this.aggregateCost(data);
    const predictions = this.aggregatePredictions(data);

    return {
      timestamp: new Date().toISOString(),
      period: periodHours,
      cpu,
      memory,
      network,
      disk,
      cost,
      predictions,
    };
  }

  private aggregateCpu(data: ResourceAnalytics[]) {
    const cpus = data.map(d => d.cpu);
    return {
      average: cpus.reduce((sum, c) => sum + c.average, 0) / cpus.length,
      peak: Math.max(...cpus.map(c => c.peak)),
      min: Math.min(...cpus.map(c => c.min)),
      utilization: cpus.reduce((sum, c) => sum + c.utilization, 0) / cpus.length,
    };
  }

  private aggregateMemory(data: ResourceAnalytics[]) {
    const memories = data.map(d => d.memory);
    return {
      average: memories.reduce((sum, m) => sum + m.average, 0) / memories.length,
      peak: Math.max(...memories.map(m => m.peak)),
      min: Math.min(...memories.map(m => m.min)),
      utilization: memories.reduce((sum, m) => sum + m.utilization, 0) / memories.length,
      leaks: memories.reduce((sum, m) => sum + m.leaks, 0),
    };
  }

  private aggregateNetwork(data: ResourceAnalytics[]) {
    const networks = data.map(d => d.network);
    return {
      bandwidth: {
        in: networks.reduce((sum, n) => sum + n.bandwidth.in, 0) / networks.length,
        out: networks.reduce((sum, n) => sum + n.bandwidth.out, 0) / networks.length,
      },
      connections: {
        average: networks.reduce((sum, n) => sum + n.connections.average, 0) / networks.length,
        peak: Math.max(...networks.map(n => n.connections.peak)),
      },
      latency: {
        average: networks.reduce((sum, n) => sum + n.latency.average, 0) / networks.length,
        p95: networks.reduce((sum, n) => sum + n.latency.p95, 0) / networks.length,
      },
    };
  }

  private aggregateDisk(data: ResourceAnalytics[]) {
    const disks = data.map(d => d.disk);
    return {
      usage: disks.reduce((sum, d) => sum + d.usage, 0) / disks.length,
      throughput: {
        read: disks.reduce((sum, d) => sum + d.throughput.read, 0) / disks.length,
        write: disks.reduce((sum, d) => sum + d.throughput.write, 0) / disks.length,
      },
      iops: {
        read: disks.reduce((sum, d) => sum + d.iops.read, 0) / disks.length,
        write: disks.reduce((sum, d) => sum + d.iops.write, 0) / disks.length,
      },
    };
  }

  private aggregateCost(data: ResourceAnalytics[]) {
    const costs = data.map(d => d.cost);
    return {
      compute: costs.reduce((sum, c) => sum + c.compute, 0),
      storage: costs.reduce((sum, c) => sum + c.storage, 0),
      network: costs.reduce((sum, c) => sum + c.network, 0),
      total: costs.reduce((sum, c) => sum + c.total, 0),
      savings: costs.reduce((sum, c) => sum + c.savings, 0),
    };
  }

  private aggregatePredictions(data: ResourceAnalytics[]) {
    const predictions = data.map(d => d.predictions);
    return {
      cpu: predictions.reduce((sum, p) => sum + p.cpu, 0) / predictions.length,
      memory: predictions.reduce((sum, p) => sum + p.memory, 0) / predictions.length,
      network: predictions.reduce((sum, p) => sum + p.network, 0) / predictions.length,
      disk: predictions.reduce((sum, p) => sum + p.disk, 0) / predictions.length,
      confidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
    };
  }

  private generatePredictions(current: ResourceAnalytics, horizonHours: number) {
    const growthRate = 0.02; // 2% growth per hour
    const factor = 1 + (growthRate * horizonHours);
    
    return {
      cpu: Math.min(100, current.cpu.average * factor),
      memory: Math.min(100, current.memory.average * factor),
      network: current.network.bandwidth.in * factor,
      disk: Math.min(100, current.disk.usage * factor),
      confidence: Math.max(0.5, 0.9 - (horizonHours * 0.01)),
    };
  }

  private calculatePredictionConfidence(): number {
    return 0.8 + Math.random() * 0.15; // 80-95% confidence
  }

  private generatePredictionRecommendations(predictions: any): string[] {
    const recommendations: string[] = [];
    
    if (predictions.cpu > 80) {
      recommendations.push('CPU usage predicted to exceed 80% - consider scaling up');
    }
    
    if (predictions.memory > 85) {
      recommendations.push('Memory usage predicted to exceed 85% - consider adding memory');
    }
    
    if (predictions.disk > 90) {
      recommendations.push('Disk usage predicted to exceed 90% - consider cleanup or expansion');
    }
    
    return recommendations;
  }

  private calculateMonthlyCost(current: ResourceAnalytics): any {
    const hoursInMonth = 730; // Average
    return {
      compute: current.cost.compute * hoursInMonth,
      storage: current.cost.storage * hoursInMonth,
      network: current.cost.network * hoursInMonth,
      total: (current.cost.compute + current.cost.storage + current.cost.network) * hoursInMonth,
    };
  }

  private identifyCostOptimizations(current: ResourceAnalytics): OptimizationInsight[] {
    const optimizations: OptimizationInsight[] = [];
    
    if (current.cpu.average < 30) {
      optimizations.push({
        type: 'cost',
        title: 'Reduce CPU Resources',
        description: 'CPU utilization is low, consider downsizing',
        impact: 'Reduce compute costs by 30-40%',
        effort: 'medium',
        savings: 100,
        implementation: ['Resize instances', 'Enable auto-scaling', 'Use spot instances'],
      });
    }
    
    if (current.memory.utilization < 50) {
      optimizations.push({
        type: 'cost',
        title: 'Optimize Memory Allocation',
        description: 'Memory utilization is below 50%',
        impact: 'Reduce memory costs by 20-30%',
        effort: 'low',
        savings: 50,
        implementation: ['Reduce memory allocation', 'Enable memory compression'],
      });
    }
    
    return optimizations;
  }

  private calculateCapacityNeeds(current: ResourceAnalytics, predictions: any): any {
    return {
      cpu: {
        current: current.cpu.average,
        predicted: predictions.cpu,
        recommended: Math.ceil(predictions.cpu * 1.2), // 20% buffer
        action: predictions.cpu > 80 ? 'scale-up' : 'maintain',
      },
      memory: {
        current: current.memory.average,
        predicted: predictions.memory,
        recommended: Math.ceil(predictions.memory * 1.2),
        action: predictions.memory > 85 ? 'scale-up' : 'maintain',
      },
      disk: {
        current: current.disk.usage,
        predicted: predictions.disk,
        recommended: Math.ceil(predictions.disk * 1.15), // 15% buffer
        action: predictions.disk > 90 ? 'expand' : 'maintain',
      },
    };
  }

  private generateCapacityRecommendations(capacity: any): string[] {
    const recommendations: string[] = [];
    
    if (capacity.cpu.action === 'scale-up') {
      recommendations.push('Scale up CPU resources within 2 weeks');
    }
    
    if (capacity.memory.action === 'scale-up') {
      recommendations.push('Add memory resources within 1 week');
    }
    
    if (capacity.disk.action === 'expand') {
      recommendations.push('Expand disk storage within 3 days');
    }
    
    return recommendations;
  }

  private generateCapacityTimeline(capacity: any): any[] {
    const timeline = [];
    const now = Date.now();
    
    if (capacity.cpu.action === 'scale-up') {
      timeline.push({
        action: 'CPU Scale-up',
        timeline: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
        priority: 'high',
      });
    }
    
    if (capacity.memory.action === 'scale-up') {
      timeline.push({
        action: 'Memory Scale-up',
        timeline: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
        priority: 'medium',
      });
    }
    
    return timeline;
  }

  private getRecentData(periodHours: number): ResourceAnalytics[] {
    const cutoffTime = Date.now() - (periodHours * 60 * 60 * 1000);
    return this.historicalData.filter(d => 
      new Date(d.timestamp).getTime() >= cutoffTime
    );
  }

  private async updateTrends(): Promise<void> {
    // Simulate trend analysis
    this.trends.length = 0;
    
    this.trends.push(
      {
        metric: 'cpu',
        direction: 'increasing',
        rate: 2.5,
        prediction: 75,
        recommendation: 'Monitor CPU usage closely',
        urgency: 'medium',
      },
      {
        metric: 'memory',
        direction: 'stable',
        rate: 0.5,
        prediction: 60,
        recommendation: 'Memory usage is stable',
        urgency: 'low',
      },
      {
        metric: 'disk',
        direction: 'increasing',
        rate: 1.8,
        prediction: 85,
        recommendation: 'Plan disk expansion soon',
        urgency: 'high',
      }
    );
  }

  private async updateInsights(): Promise<void> {
    // Insights are already initialized in constructor
  }

  private initializeHistoricalData(): void {
    // Generate some historical data for demonstration
    for (let i = 23; i >= 0; i--) {
      const data = this.generateMockAnalytics(1);
      data.timestamp = new Date(Date.now() - i * 60 * 60 * 1000).toISOString();
      this.historicalData.push(data);
    }
  }

  private initializeInsights(): void {
    this.insights.push(
      {
        type: 'performance',
        title: 'Database Query Optimization',
        description: 'Several slow queries detected',
        impact: 'Improve response times by 40%',
        effort: 'medium',
        savings: 0,
        implementation: ['Add indexes', 'Optimize queries', 'Enable query cache'],
      },
      {
        type: 'cost',
        title: 'Right-size Instances',
        description: 'Current instances are over-provisioned',
        impact: 'Reduce costs by 25%',
        effort: 'low',
        savings: 150,
        implementation: ['Analyze usage patterns', 'Resize to appropriate instances'],
      },
      {
        type: 'efficiency',
        title: 'Enable Auto-scaling',
        description: 'Manual scaling is inefficient',
        impact: 'Improve resource utilization by 30%',
        effort: 'medium',
        savings: 80,
        implementation: ['Configure auto-scaling policies', 'Set up monitoring alerts'],
      }
    );
  }
}

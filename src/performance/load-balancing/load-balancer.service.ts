import { Injectable } from '@nestjs/common';

export interface LoadBalancerConfig {
  algorithm: 'round-robin' | 'least-connections' | 'weighted' | 'ip-hash' | 'adaptive';
  healthCheckInterval: number; // seconds
  maxRetries: number;
  timeout: number; // milliseconds
  stickySessions: boolean;
  weights: Record<string, number>;
}

export interface ServerInstance {
  id: string;
  host: string;
  port: number;
  weight: number;
  connections: number;
  healthy: boolean;
  lastHealthCheck: string;
  responseTime: number;
  throughput: number;
}

export interface LoadBalancingMetrics {
  totalRequests: number;
  activeConnections: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  distributionEfficiency: number;
}

export interface LoadBalancingStatus {
  algorithm: string;
  servers: ServerInstance[];
  metrics: LoadBalancingMetrics;
  configuration: LoadBalancerConfig;
  timestamp: string;
}

@Injectable()
export class LoadBalancerService {
  private readonly servers: ServerInstance[] = [];
  private readonly config: LoadBalancerConfig;
  private readonly metrics: LoadBalancingMetrics;
  private requestCounter = 0;

  constructor() {
    this.config = this.getDefaultConfiguration();
    this.metrics = this.initializeMetrics();
    this.initializeServers();
  }

  async getStatus(): Promise<LoadBalancingStatus> {
    await this.updateMetrics();
    await this.performHealthChecks();

    return {
      algorithm: this.config.algorithm,
      servers: [...this.servers],
      metrics: { ...this.metrics },
      configuration: { ...this.config },
      timestamp: new Date().toISOString(),
    };
  }

  async updateConfiguration(updates: Partial<LoadBalancerConfig>): Promise<void> {
    Object.assign(this.config, updates);
    
    if (updates.algorithm || updates.weights) {
      await this.rebalanceLoad();
    }
  }

  async optimizeLoadBalancing(force = false): Promise<any> {
    const currentEfficiency = this.calculateDistributionEfficiency();
    
    if (currentEfficiency > 90 && !force) {
      return {
        optimized: false,
        reason: 'Current configuration is already efficient',
        efficiency: currentEfficiency,
      };
    }

    const optimization = await this.performOptimization();
    
    return {
      optimized: true,
      previousEfficiency: currentEfficiency,
      newEfficiency: optimization.efficiency,
      improvements: optimization.improvements,
      algorithm: optimization.algorithm,
      timestamp: new Date().toISOString(),
    };
  }

  async addServer(server: Omit<ServerInstance, 'id' | 'connections' | 'healthy' | 'lastHealthCheck'>): Promise<ServerInstance> {
    const newServer: ServerInstance = {
      ...server,
      id: this.generateServerId(),
      connections: 0,
      healthy: true,
      lastHealthCheck: new Date().toISOString(),
    };

    this.servers.push(newServer);
    await this.rebalanceLoad();
    
    return newServer;
  }

  async removeServer(serverId: string): Promise<boolean> {
    const index = this.servers.findIndex(s => s.id === serverId);
    if (index === -1) return false;

    this.servers.splice(index, 1);
    await this.rebalanceLoad();
    
    return true;
  }

  async routeRequest(): Promise<ServerInstance> {
    const healthyServers = this.servers.filter(s => s.healthy);
    
    if (healthyServers.length === 0) {
      throw new Error('No healthy servers available');
    }

    const selectedServer = this.selectServer(healthyServers);
    selectedServer.connections++;
    this.requestCounter++;
    
    return selectedServer;
  }

  private async performOptimization(): Promise<any> {
    const improvements: string[] = [];
    let bestAlgorithm = this.config.algorithm;
    let bestEfficiency = this.calculateDistributionEfficiency();

    // Test different algorithms
    const algorithms: LoadBalancerConfig['algorithm'][] = ['round-robin', 'least-connections', 'weighted', 'adaptive'];
    
    for (const algorithm of algorithms) {
      const tempConfig = { ...this.config, algorithm };
      const efficiency = this.simulateAlgorithmEfficiency(algorithm);
      
      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestAlgorithm = algorithm;
        improvements.push(`Switched to ${algorithm} algorithm for better efficiency`);
      }
    }

    // Optimize weights if using weighted algorithm
    if (bestAlgorithm === 'weighted') {
      const optimizedWeights = this.optimizeWeights();
      this.config.weights = optimizedWeights;
      improvements.push('Optimized server weights based on performance');
    }

    // Apply optimizations
    this.config.algorithm = bestAlgorithm;
    await this.rebalanceLoad();

    return {
      algorithm: bestAlgorithm,
      efficiency: bestEfficiency,
      improvements,
    };
  }

  private selectServer(servers: ServerInstance[]): ServerInstance {
    switch (this.config.algorithm) {
      case 'round-robin':
        return this.roundRobinSelect(servers);
      case 'least-connections':
        return this.leastConnectionsSelect(servers);
      case 'weighted':
        return this.weightedSelect(servers);
      case 'ip-hash':
        return this.ipHashSelect(servers);
      case 'adaptive':
        return this.adaptiveSelect(servers);
      default:
        return servers[0];
    }
  }

  private roundRobinSelect(servers: ServerInstance[]): ServerInstance {
    return servers[this.requestCounter % servers.length];
  }

  private leastConnectionsSelect(servers: ServerInstance[]): ServerInstance {
    return servers.reduce((min, server) => 
      server.connections < min.connections ? server : min
    );
  }

  private weightedSelect(servers: ServerInstance[]): ServerInstance {
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }
    
    return servers[0];
  }

  private ipHashSelect(servers: ServerInstance[]): ServerInstance {
    // Simulate IP hash (would use real client IP in production)
    const hash = this.requestCounter % servers.length;
    return servers[hash];
  }

  private adaptiveSelect(servers: ServerInstance[]): ServerInstance {
    // Adaptive algorithm based on server performance
    return servers.reduce((best, server) => {
      const serverScore = this.calculateServerScore(server);
      const bestScore = this.calculateServerScore(best);
      return serverScore > bestScore ? server : best;
    });
  }

  private calculateServerScore(server: ServerInstance): number {
    // Score based on response time, connections, and throughput
    const responseScore = 100 / (server.responseTime + 1);
    const connectionScore = 100 / (server.connections + 1);
    const throughputScore = server.throughput;
    
    return (responseScore * 0.4) + (connectionScore * 0.3) + (throughputScore * 0.3);
  }

  private calculateDistributionEfficiency(): number {
    if (this.servers.length === 0) return 0;

    const totalConnections = this.servers.reduce((sum, s) => sum + s.connections, 0);
    const averageConnections = totalConnections / this.servers.length;
    
    // Calculate variance from average
    const variance = this.servers.reduce((sum, s) => {
      return sum + Math.pow(s.connections - averageConnections, 2);
    }, 0) / this.servers.length;

    // Efficiency is inverse of variance (normalized)
    const maxVariance = Math.pow(averageConnections, 2);
    const efficiency = maxVariance > 0 ? Math.max(0, 100 - (variance / maxVariance) * 100) : 100;
    
    return Math.round(efficiency);
  }

  private simulateAlgorithmEfficiency(algorithm: LoadBalancerConfig['algorithm']): number {
    // Simulate efficiency for different algorithms based on current load
    const baseEfficiency = 85;
    
    switch (algorithm) {
      case 'adaptive':
        return baseEfficiency + 10; // Best efficiency
      case 'least-connections':
        return baseEfficiency + 7;
      case 'weighted':
        return baseEfficiency + 5;
      case 'round-robin':
        return baseEfficiency + 3;
      case 'ip-hash':
        return baseEfficiency + 2;
      default:
        return baseEfficiency;
    }
  }

  private optimizeWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    
    this.servers.forEach(server => {
      // Weight based on server capacity and performance
      const performanceScore = this.calculateServerScore(server);
      weights[server.id] = Math.max(1, Math.round(performanceScore));
    });
    
    return weights;
  }

  private async rebalanceLoad(): Promise<void> {
    // Simulate load rebalancing
    const totalConnections = this.servers.reduce((sum, s) => sum + s.connections, 0);
    const connectionsPerServer = Math.floor(totalConnections / this.servers.length);
    
    this.servers.forEach(server => {
      server.connections = connectionsPerServer + Math.floor(Math.random() * 10);
    });
  }

  private async performHealthChecks(): Promise<void> {
    for (const server of this.servers) {
      const isHealthy = await this.checkServerHealth(server);
      server.healthy = isHealthy;
      server.lastHealthCheck = new Date().toISOString();
    }
  }

  private async checkServerHealth(server: ServerInstance): Promise<boolean> {
    // Simulate health check
    return Math.random() > 0.05; // 95% healthy
  }

  private async updateMetrics(): Promise<void> {
    this.metrics.totalRequests = this.requestCounter;
    this.metrics.activeConnections = this.servers.reduce((sum, s) => sum + s.connections, 0);
    this.metrics.averageResponseTime = this.calculateAverageResponseTime();
    this.metrics.throughput = this.calculateThroughput();
    this.metrics.errorRate = this.calculateErrorRate();
    this.metrics.distributionEfficiency = this.calculateDistributionEfficiency();
  }

  private calculateAverageResponseTime(): number {
    const healthyServers = this.servers.filter(s => s.healthy);
    if (healthyServers.length === 0) return 0;
    
    const totalResponseTime = healthyServers.reduce((sum, s) => sum + s.responseTime, 0);
    return totalResponseTime / healthyServers.length;
  }

  private calculateThroughput(): number {
    return this.servers.reduce((sum, s) => sum + s.throughput, 0);
  }

  private calculateErrorRate(): number {
    // Simulate error rate based on server health
    const unhealthyServers = this.servers.filter(s => !s.healthy).length;
    return this.servers.length > 0 ? (unhealthyServers / this.servers.length) * 100 : 0;
  }

  private getDefaultConfiguration(): LoadBalancerConfig {
    return {
      algorithm: 'round-robin',
      healthCheckInterval: 30,
      maxRetries: 3,
      timeout: 5000,
      stickySessions: false,
      weights: {},
    };
  }

  private initializeMetrics(): LoadBalancingMetrics {
    return {
      totalRequests: 0,
      activeConnections: 0,
      averageResponseTime: 0,
      throughput: 0,
      errorRate: 0,
      distributionEfficiency: 100,
    };
  }

  private initializeServers(): void {
    const serverConfigs = [
      { host: '192.168.1.10', port: 3000, weight: 1, responseTime: 120, throughput: 100 },
      { host: '192.168.1.11', port: 3000, weight: 1, responseTime: 95, throughput: 120 },
      { host: '192.168.1.12', port: 3000, weight: 2, responseTime: 85, throughput: 150 },
    ];

    serverConfigs.forEach(config => {
      this.servers.push({
        ...config,
        id: this.generateServerId(),
        connections: 0,
        healthy: true,
        lastHealthCheck: new Date().toISOString(),
      });
    });
  }

  private generateServerId(): string {
    return `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

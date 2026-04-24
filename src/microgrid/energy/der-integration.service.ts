import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { MicrogridNode } from '../microgrid.service';

export interface DistributedEnergyResource {
  id: string;
  name: string;
  type: 'solar' | 'wind' | 'hydro' | 'biomass' | 'geothermal' | 'ev_charger' | 'smart_home';
  capacity: number;
  currentOutput: number;
  location: {
    latitude: number;
    longitude: number;
  };
  status: 'online' | 'offline' | 'maintenance' | 'curtailed';
  efficiency: number;
  availability: number;
  forecastAccuracy: number;
  integrationLevel: 'basic' | 'intermediate' | 'advanced' | 'full';
  gridConnection: {
    pointOfCommonCoupling: string;
    ratedCapacity: number;
    protectionSettings: any;
  };
  communicationProtocol: 'modbus' | 'dnp3' | 'iec61850' | 'mqtt' | 'http';
  lastUpdated: Date;
}

export interface DERIntegrationMetrics {
  totalResources: number;
  onlineResources: number;
  totalCapacity: number;
  currentGeneration: number;
  averageEfficiency: number;
  integrationLevel: Map<string, number>;
  availabilityFactor: number;
  curtailmentRate: number;
  forecastAccuracy: number;
  timestamp: Date;
}

export interface DERForecast {
  resourceId: string;
  timestamp: Date;
  predictedOutput: number;
  confidence: number;
  weatherConditions: any;
  marketSignals: any;
}

export interface DERControlCommand {
  resourceId: string;
  command: 'set_output' | 'curtail' | 'dispatch' | 'maintain' | 'connect' | 'disconnect';
  value: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  duration?: number;
  reason: string;
  timestamp: Date;
}

@Injectable()
export class DERIntegrationService {
  private readonly logger = new Logger(DERIntegrationService.name);
  private readonly derResources = new Map<string, DistributedEnergyResource>();
  private readonly forecasts: DERForecast[] = [];
  private readonly controlCommands: DERControlCommand[] = [];
  private readonly integrationProtocols = new Map<string, {
    protocol: string;
    endpoint: string;
    authentication: any;
    pollingInterval: number;
  }>();

  async registerDER(resourceData: Omit<DistributedEnergyResource, 'id' | 'lastUpdated'>): Promise<DistributedEnergyResource> {
    const resource: DistributedEnergyResource = {
      id: `der_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date(),
      ...resourceData,
    };

    this.derResources.set(resource.id, resource);
    
    // Initialize communication protocol
    await this.initializeCommunication(resource);
    
    // Validate grid connection
    await this.validateGridConnection(resource);
    
    // Set up monitoring
    await this.setupDERMonitoring(resource);

    this.logger.log(`Registered DER: ${resource.name} (${resource.id}) - Type: ${resource.type}`);
    return resource;
  }

  async integrateDERs(derNodes: MicrogridNode[]): Promise<{
    integratedResources: number;
    integrationLevel: string;
    totalCapacity: number;
    issues: string[];
  }> {
    const integrationResults = {
      integratedResources: 0,
      integrationLevel: 'basic' as string,
      totalCapacity: 0,
      issues: [] as string[],
    };

    for (const node of derNodes) {
      try {
        const derResource = await this.convertNodeToDER(node);
        await this.registerDER(derResource);
        integrationResults.integratedResources++;
        integrationResults.totalCapacity += derResource.capacity;
      } catch (error) {
        integrationResults.issues.push(`Failed to integrate ${node.name}: ${error.message}`);
      }
    }

    // Calculate overall integration level
    integrationResults.integrationLevel = this.calculateOverallIntegrationLevel();

    this.logger.log(`DER integration completed: ${integrationResults.integratedResources} resources integrated`);
    return integrationResults;
  }

  async optimizeDERGeneration(): Promise<{
    optimizationActions: DERControlCommand[];
    expectedIncrease: number;
    efficiencyGain: number;
  }> {
    const resources = Array.from(this.derResources.values());
    const optimizationActions: DERControlCommand[] = [];
    let expectedIncrease = 0;
    let efficiencyGain = 0;

    // Analyze current generation patterns
    const currentConditions = await this.getCurrentGridConditions();
    const forecasts = await this.getDERForecasts(24);

    for (const resource of resources) {
      if (resource.status !== 'online') continue;

      const optimization = await this.calculateDEROptimization(resource, currentConditions, forecasts);
      
      if (optimization.recommendedAction !== 'maintain') {
        const command: DERControlCommand = {
          resourceId: resource.id,
          command: optimization.recommendedAction,
          value: optimization.targetValue,
          priority: optimization.priority,
          duration: optimization.duration,
          reason: optimization.reason,
          timestamp: new Date(),
        };

        optimizationActions.push(command);
        expectedIncrease += optimization.expectedIncrease;
        efficiencyGain += optimization.efficiencyGain;
      }
    }

    // Execute optimization commands
    await this.executeDERCommands(optimizationActions);

    return {
      optimizationActions,
      expectedIncrease,
      efficiencyGain,
    };
  }

  async manageDERCurtailment(curtailedPower: number): Promise<{
    curtailmentPlan: DERControlCommand[];
    actualCurtailment: number;
    economicImpact: number;
  }> {
    const onlineResources = Array.from(this.derResources.values())
      .filter(r => r.status === 'online')
      .sort((a, b) => b.efficiency - a.efficiency); // Prioritize less efficient resources

    const curtailmentPlan: DERControlCommand[] = [];
    let remainingCurtailment = curtailedPower;
    let actualCurtailment = 0;
    let economicImpact = 0;

    for (const resource of onlineResources) {
      if (remainingCurtailment <= 0) break;

      const maxCurtailment = resource.currentOutput * 0.8; // Don't curtail more than 80%
      const curtailAmount = Math.min(maxCurtailment, remainingCurtailment);

      if (curtailAmount > 0) {
        const command: DERControlCommand = {
          resourceId: resource.id,
          command: 'curtail',
          value: curtailAmount,
          priority: 'high',
          reason: 'Grid congestion management',
          timestamp: new Date(),
        };

        curtailmentPlan.push(command);
        remainingCurtailment -= curtailAmount;
        actualCurtailment += curtailAmount;
        
        // Calculate economic impact based on market price
        const marketPrice = await this.getCurrentMarketPrice();
        economicImpact += curtailAmount * marketPrice * 0.001; // Convert to appropriate units
      }
    }

    await this.executeDERCommands(curtailmentPlan);

    return {
      curtailmentPlan,
      actualCurtailment,
      economicImpact,
    };
  }

  async getDERIntegrationMetrics(): Promise<DERIntegrationMetrics> {
    const resources = Array.from(this.derResources.values());
    const onlineResources = resources.filter(r => r.status === 'online');
    
    const totalCapacity = resources.reduce((sum, r) => sum + r.capacity, 0);
    const currentGeneration = onlineResources.reduce((sum, r) => sum + r.currentOutput, 0);
    const averageEfficiency = resources.length > 0 ? 
      resources.reduce((sum, r) => sum + r.efficiency, 0) / resources.length : 0;
    
    const integrationLevel = new Map<string, number>();
    const levels = ['basic', 'intermediate', 'advanced', 'full'];
    levels.forEach(level => {
      const count = resources.filter(r => r.integrationLevel === level).length;
      integrationLevel.set(level, count);
    });

    const availabilityFactor = resources.length > 0 ? 
      onlineResources.reduce((sum, r) => sum + r.availability, 0) / resources.length : 0;
    
    const curtailedResources = resources.filter(r => r.status === 'curtailed');
    const curtailmentRate = resources.length > 0 ? curtailedResources.length / resources.length : 0;
    
    const forecastAccuracy = resources.length > 0 ? 
      resources.reduce((sum, r) => sum + r.forecastAccuracy, 0) / resources.length : 0;

    return {
      totalResources: resources.length,
      onlineResources: onlineResources.length,
      totalCapacity,
      currentGeneration,
      averageEfficiency,
      integrationLevel,
      availabilityFactor,
      curtailmentRate,
      forecastAccuracy,
      timestamp: new Date(),
    };
  }

  async generateDERForecasts(hours: number = 48): Promise<DERForecast[]> {
    const forecasts: DERForecast[] = [];
    const resources = Array.from(this.derResources.values());
    const currentTime = new Date();

    for (let i = 1; i <= hours; i++) {
      const forecastTime = new Date(currentTime.getTime() + i * 60 * 60 * 1000);

      for (const resource of resources) {
        const forecast = await this.generateResourceForecast(resource, forecastTime);
        forecasts.push(forecast);
      }
    }

    this.forecasts.push(...forecasts);
    
    // Keep only last 7 days of forecasts
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.forecasts.splice(0, this.forecasts.filter(f => f.timestamp.getTime() < cutoffTime).length);

    return forecasts;
  }

  private async convertNodeToDER(node: MicrogridNode): Promise<DistributedEnergyResource> {
    const integrationLevel = this.determineIntegrationLevel(node);
    const communicationProtocol = this.determineCommunicationProtocol(node);

    return {
      id: node.id,
      name: node.name,
      type: node.type as any,
      capacity: node.capacity,
      currentOutput: node.currentOutput,
      location: node.location,
      status: node.status as any,
      efficiency: 0.85 + Math.random() * 0.1,
      availability: 0.9 + Math.random() * 0.1,
      forecastAccuracy: 0.8 + Math.random() * 0.15,
      integrationLevel,
      gridConnection: {
        pointOfCommonCoupling: `poc_${node.id}`,
        ratedCapacity: node.capacity,
        protectionSettings: {
          overcurrent: node.capacity * 1.2,
          undervoltage: 0.9,
          overvoltage: 1.1,
        },
      },
      communicationProtocol,
      lastUpdated: new Date(),
    };
  }

  private determineIntegrationLevel(node: MicrogridNode): 'basic' | 'intermediate' | 'advanced' | 'full' {
    // Determine integration level based on node capabilities and metadata
    const hasAdvancedControls = node.metadata?.advancedControls === true;
    const hasForecasting = node.metadata?.forecasting === true;
    const hasRealTimeData = node.metadata?.realTimeData === true;
    const hasMarketParticipation = node.metadata?.marketParticipation === true;

    if (hasAdvancedControls && hasForecasting && hasRealTimeData && hasMarketParticipation) {
      return 'full';
    } else if (hasAdvancedControls && hasForecasting && hasRealTimeData) {
      return 'advanced';
    } else if (hasAdvancedControls && hasRealTimeData) {
      return 'intermediate';
    } else {
      return 'basic';
    }
  }

  private determineCommunicationProtocol(node: MicrogridNode): 'modbus' | 'dnp3' | 'iec61850' | 'mqtt' | 'http' {
    const protocol = node.metadata?.communicationProtocol;
    
    switch (protocol) {
      case 'modbus': return 'modbus';
      case 'dnp3': return 'dnp3';
      case 'iec61850': return 'iec61850';
      case 'mqtt': return 'mqtt';
      case 'http': return 'http';
      default: 
        // Determine based on node type and capabilities
        if (node.type === 'solar' || node.type === 'wind') return 'modbus';
        if (node.type === 'ev_charger') return 'mqtt';
        return 'http';
    }
  }

  private async initializeCommunication(resource: DistributedEnergyResource): Promise<void> {
    const protocolConfig = {
      protocol: resource.communicationProtocol,
      endpoint: `der://${resource.id}`,
      authentication: { type: 'bearer', token: 'der_token_' + resource.id },
      pollingInterval: this.getPollingInterval(resource.type),
    };

    this.integrationProtocols.set(resource.id, protocolConfig);
    this.logger.log(`Initialized communication for ${resource.name}: ${resource.communicationProtocol}`);
  }

  private getPollingInterval(resourceType: string): number {
    switch (resourceType) {
      case 'solar': return 30; // 30 seconds
      case 'wind': return 10; // 10 seconds (more variable)
      case 'ev_charger': return 5; // 5 seconds (fast changing)
      case 'smart_home': return 60; // 1 minute
      default: return 60;
    }
  }

  private async validateGridConnection(resource: DistributedEnergyResource): Promise<void> {
    // Simulate grid connection validation
    const validationResults = {
      voltageCompliance: true,
      frequencyCompliance: true,
      protectionSettings: true,
      communicationStability: true,
    };

    if (!validationResults.protectionSettings) {
      throw new Error(`Grid protection settings invalid for ${resource.name}`);
    }

    this.logger.log(`Grid connection validated for ${resource.name}`);
  }

  private async setupDERMonitoring(resource: DistributedEnergyResource): Promise<void> {
    // Set up real-time monitoring for the DER
    this.logger.log(`Monitoring set up for ${resource.name}`);
  }

  private async getCurrentGridConditions(): Promise<{
    frequency: number;
    voltage: number;
    loading: number;
    marketPrice: number;
  }> {
    return {
      frequency: 50.0 + (Math.random() - 0.5) * 0.2,
      voltage: 1.0 + (Math.random() - 0.5) * 0.05,
      loading: 0.7 + Math.random() * 0.2,
      marketPrice: 0.12 + Math.random() * 0.05,
    };
  }

  private async getDERForecasts(hours: number): Promise<DERForecast[]> {
    return this.forecasts.filter(f => 
      f.timestamp <= new Date(Date.now() + hours * 60 * 60 * 1000)
    );
  }

  private async calculateDEROptimization(
    resource: DistributedEnergyResource,
    currentConditions: any,
    forecasts: DERForecast[]
  ): Promise<{
    recommendedAction: 'set_output' | 'curtail' | 'dispatch' | 'maintain';
    targetValue: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    duration: number;
    reason: string;
    expectedIncrease: number;
    efficiencyGain: number;
  }> {
    const resourceForecast = forecasts.find(f => f.resourceId === resource.id);
    const currentOutput = resource.currentOutput;
    const maxOutput = resource.capacity * resource.efficiency;

    let recommendedAction: any = 'maintain';
    let targetValue = currentOutput;
    let priority: any = 'low';
    let reason = 'No optimization needed';
    let expectedIncrease = 0;
    let efficiencyGain = 0;

    // Optimization logic based on resource type and conditions
    if (resource.type === 'solar') {
      if (currentConditions.marketPrice > 0.15 && currentOutput < maxOutput * 0.9) {
        recommendedAction = 'set_output';
        targetValue = maxOutput * 0.95;
        priority = 'high';
        reason = 'High market price - maximize solar generation';
        expectedIncrease = targetValue - currentOutput;
        efficiencyGain = 0.05;
      }
    } else if (resource.type === 'wind') {
      if (resourceForecast && resourceForecast.predictedOutput > currentOutput * 1.2) {
        recommendedAction = 'set_output';
        targetValue = Math.min(maxOutput, resourceForecast.predictedOutput);
        priority = 'medium';
        reason = 'Expected wind increase - prepare for higher output';
        expectedIncrease = targetValue - currentOutput;
        efficiencyGain = 0.03;
      }
    } else if (resource.type === 'ev_charger') {
      if (currentConditions.loading > 0.9) {
        recommendedAction = 'curtail';
        targetValue = currentOutput * 0.5;
        priority = 'high';
        reason = 'Grid congestion - reduce EV charging load';
        expectedIncrease = -(currentOutput - targetValue);
        efficiencyGain = 0.02;
      }
    }

    return {
      recommendedAction,
      targetValue,
      priority,
      duration: 60, // 1 hour default
      reason,
      expectedIncrease,
      efficiencyGain,
    };
  }

  private async executeDERCommands(commands: DERControlCommand[]): Promise<void> {
    for (const command of commands) {
      try {
        await this.sendCommandToDER(command);
        this.controlCommands.push(command);
        this.logger.log(`Executed DER command: ${command.command} for ${command.resourceId}`);
      } catch (error) {
        this.logger.error(`Failed to execute command for ${command.resourceId}:`, error);
      }
    }
  }

  private async sendCommandToDER(command: DERControlCommand): Promise<void> {
    // Simulate sending command to DER
    const resource = this.derResources.get(command.resourceId);
    if (!resource) {
      throw new Error(`DER ${command.resourceId} not found`);
    }

    // Update resource state based on command
    switch (command.command) {
      case 'set_output':
        resource.currentOutput = command.value;
        break;
      case 'curtail':
        resource.currentOutput = Math.max(0, resource.currentOutput - command.value);
        resource.status = 'curtailed';
        break;
      case 'dispatch':
        resource.currentOutput = command.value;
        resource.status = 'online';
        break;
      case 'connect':
        resource.status = 'online';
        break;
      case 'disconnect':
        resource.status = 'offline';
        break;
    }

    resource.lastUpdated = new Date();
    this.derResources.set(command.resourceId, resource);
  }

  private async getCurrentMarketPrice(): Promise<number> {
    return 0.12 + Math.random() * 0.05;
  }

  private calculateOverallIntegrationLevel(): string {
    const resources = Array.from(this.derResources.values());
    
    if (resources.length === 0) return 'none';
    
    const fullIntegration = resources.filter(r => r.integrationLevel === 'full').length;
    const advancedIntegration = resources.filter(r => r.integrationLevel === 'advanced').length;
    const intermediateIntegration = resources.filter(r => r.integrationLevel === 'intermediate').length;
    
    const fullRatio = fullIntegration / resources.length;
    const advancedRatio = advancedIntegration / resources.length;
    const intermediateRatio = intermediateIntegration / resources.length;

    if (fullRatio > 0.7) return 'full';
    if (fullRatio > 0.3 || advancedRatio > 0.6) return 'advanced';
    if (advancedRatio > 0.3 || intermediateRatio > 0.6) return 'intermediate';
    return 'basic';
  }

  private async generateResourceForecast(
    resource: DistributedEnergyResource,
    forecastTime: Date
  ): Promise<DERForecast> {
    let predictedOutput = 0;
    let confidence = 0.8;

    const hour = forecastTime.getHours();
    
    switch (resource.type) {
      case 'solar':
        if (hour >= 6 && hour <= 18) {
          predictedOutput = resource.capacity * resource.efficiency * 
            Math.sin((hour - 6) * Math.PI / 12) * 0.8;
        }
        confidence = 0.85;
        break;
        
      case 'wind':
        predictedOutput = resource.capacity * resource.efficiency * 
          (0.3 + Math.random() * 0.7);
        confidence = 0.75;
        break;
        
      case 'ev_charger':
        predictedOutput = resource.capacity * 
          ((hour >= 18 && hour <= 22) ? 0.8 : 0.2);
        confidence = 0.9;
        break;
        
      default:
        predictedOutput = resource.capacity * resource.efficiency * 0.5;
        confidence = 0.8;
    }

    return {
      resourceId: resource.id,
      timestamp: forecastTime,
      predictedOutput,
      confidence,
      weatherConditions: {
        temperature: 20 + Math.random() * 15,
        windSpeed: Math.random() * 15,
        cloudCover: Math.random(),
      },
      marketSignals: {
        price: await this.getCurrentMarketPrice(),
        demand: 0.7 + Math.random() * 0.3,
      },
    };
  }

  @Interval(60000)
  async updateDERStatus(): Promise<void> {
    for (const [resourceId, resource] of this.derResources) {
      // Simulate status updates
      if (Math.random() < 0.02) { // 2% chance of status change
        const statuses = ['online', 'offline', 'maintenance'];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)] as any;
        resource.status = newStatus;
        resource.lastUpdated = new Date();
        
        this.derResources.set(resourceId, resource);
        this.logger.log(`DER status updated: ${resource.name} -> ${newStatus}`);
      }
    }
  }

  @Cron('*/15 * * * *')
  async performDERHealthCheck(): Promise<void> {
    const metrics = await this.getDERIntegrationMetrics();
    
    if (metrics.availabilityFactor < 0.9) {
      this.logger.warn(`DER availability degraded: ${metrics.availabilityFactor}`);
    }
    
    if (metrics.averageEfficiency < 0.8) {
      this.logger.warn(`DER efficiency degraded: ${metrics.averageEfficiency}`);
    }
    
    if (metrics.curtailmentRate > 0.3) {
      this.logger.warn(`High DER curtailment rate: ${metrics.curtailmentRate}`);
    }
  }
}

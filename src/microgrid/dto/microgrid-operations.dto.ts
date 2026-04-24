import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsOptional, 
  IsObject, 
  IsArray, 
  IsBoolean, 
  IsDate, 
  Min, 
  Max, 
  ValidateNested, 
  ArrayMinSize,
  ArrayMaxSize,
  IsNotEmpty 
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationDto } from './node.dto';

export class CreateMicrogridNodeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['solar', 'wind', 'battery', 'generator', 'load', 'ev_charger', 'smart_home'])
  type: 'solar' | 'wind' | 'battery' | 'generator' | 'load' | 'ev_charger' | 'smart_home';

  @IsNumber()
  @Min(0)
  @Max(1000000)
  capacity: number;

  @IsNumber()
  @Min(0)
  @Max(1000000)
  currentOutput: number;

  @IsEnum(['online', 'offline', 'maintenance', 'curtailed'])
  status: 'online' | 'offline' | 'maintenance' | 'curtailed';

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsEnum(['basic', 'intermediate', 'advanced', 'full'])
  integrationLevel?: 'basic' | 'intermediate' | 'advanced' | 'full';

  @IsOptional()
  @IsEnum(['modbus', 'dnp3', 'iec61850', 'mqtt', 'http'])
  communicationProtocol?: 'modbus' | 'dnp3' | 'iec61850' | 'mqtt' | 'http';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  efficiency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  availability?: number;
}

export class UpdateMicrogridNodeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(['solar', 'wind', 'battery', 'generator', 'load', 'ev_charger', 'smart_home'])
  type?: 'solar' | 'wind' | 'battery' | 'generator' | 'load' | 'ev_charger' | 'smart_home';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  capacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  currentOutput?: number;

  @IsOptional()
  @IsEnum(['online', 'offline', 'maintenance', 'curtailed'])
  status?: 'online' | 'offline' | 'maintenance' | 'curtailed';

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsEnum(['basic', 'intermediate', 'advanced', 'full'])
  integrationLevel?: 'basic' | 'intermediate' | 'advanced' | 'full';

  @IsOptional()
  @IsEnum(['modbus', 'dnp3', 'iec61850', 'mqtt', 'http'])
  communicationProtocol?: 'modbus' | 'dnp3' | 'iec61850' | 'mqtt' | 'http';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  efficiency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  availability?: number;
}

export class GridOptimizationDto {
  @IsOptional()
  @IsString()
  strategy?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  targetEfficiency?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1)
  targetSavings?: number;

  @IsOptional()
  @IsEnum(['conservative', 'balanced', 'aggressive', 'optimal'])
  riskTolerance?: 'conservative' | 'balanced' | 'aggressive' | 'optimal';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  durationHours?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  nodeIds?: string[];

  @IsOptional()
  @IsBoolean()
  forceExecution?: boolean;
}

export class LoadBalancingDto {
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(0.95)
  targetLoadRatio?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  maxResponseTime?: number;

  @IsOptional()
  @IsEnum(['shed', 'shift', 'dispatch'])
  demandResponseType?: 'shed' | 'shift' | 'dispatch';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  demandResponseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(300)
  demandResponseDuration?: number;

  @IsOptional()
  @IsBoolean()
  enablePredictiveBalancing?: boolean;

  @IsOptional()
  @IsBoolean()
  enableRedundancyActivation?: boolean;
}

export class StorageOptimizationDto {
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(0.95)
  targetSOC?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.8)
  @Max(0.99)
  targetEfficiency?: number;

  @IsOptional()
  @IsEnum(['performance', 'longevity', 'cost', 'balanced'])
  optimizationMode?: 'performance' | 'longevity' | 'cost' | 'balanced';

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(35)
  targetTemperature?: number;

  @IsOptional()
  @IsBoolean()
  enableThermalManagement?: boolean;

  @IsOptional()
  @IsBoolean()
  enableDegradationMitigation?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  batteryIds?: string[];
}

export class TradingOrderDto {
  @IsString()
  @IsNotEmpty()
  marketId: string;

  @IsEnum(['buy', 'sell'])
  type: 'buy' | 'sell';

  @IsNumber()
  @Min(0.1)
  @Max(100000)
  quantity: number;

  @IsNumber()
  @Min(0.01)
  @Max(1000)
  price: number;

  @IsNumber()
  @Min(5)
  @Max(8760)
  duration: number;

  @IsEnum(['firm', 'interruptible', 'curtailable'])
  flexibility: 'firm' | 'interruptible' | 'curtailable';

  @IsOptional()
  @IsEnum(['conservative', 'balanced', 'aggressive', 'optimal'])
  strategy?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000000)
  maxPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  minPrice?: number;
}

export class MarketParticipationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  marketIds: string[];

  @IsNumber()
  @Min(1)
  @Max(1000000)
  totalBudget: number;

  @IsString()
  @IsNotEmpty()
  strategy: string;

  @IsNumber()
  @Min(1)
  @Max(168)
  durationHours: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  riskTolerance?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsBoolean()
  enableAutoRebalancing?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePredictiveBidding?: boolean;
}

export class RealTimeMonitoringDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  nodeIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  samplingInterval?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  bufferSize?: number;

  @IsOptional()
  @IsBoolean()
  enableAnomalyDetection?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePredictiveAlerts?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  anomalyThreshold?: number;

  @IsOptional()
  @IsEnum(['info', 'warning', 'critical'])
  minimumAlertLevel?: 'info' | 'warning' | 'critical';
}

export class AutomationConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  automationLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(300)
  monitoringInterval?: number;

  @IsOptional()
  @IsBoolean()
  enablePredictiveActions?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSelfHealing?: boolean;

  @IsOptional()
  @IsArray()
  automationRules?: AutomationRuleDto[];
}

export class AutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  condition: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsEnum(['critical', 'high', 'medium', 'low'])
  priority: 'critical' | 'high' | 'medium' | 'low';

  @IsNumber()
  @Min(0.01)
  @Max(1)
  automationRate: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class DERIntegrationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  derNodes: CreateMicrogridNodeDto[];

  @IsOptional()
  @IsEnum(['basic', 'intermediate', 'advanced', 'full'])
  targetIntegrationLevel?: 'basic' | 'intermediate' | 'advanced' | 'full';

  @IsOptional()
  @IsBoolean()
  enableAutoDiscovery?: boolean;

  @IsOptional()
  @IsBoolean()
  enableForecasting?: boolean;

  @IsOptional()
  @IsBoolean()
  enableCurtailment?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1)
  minimumAvailability?: number;
}

export class MicrogridQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  types?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  statuses?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  minCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  maxCapacity?: number;

  @IsOptional()
  @IsString()
  sortBy?: 'name' | 'type' | 'capacity' | 'efficiency' | 'status';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}

export class MicrogridAnalyticsDto {
  @IsOptional()
  @IsString()
  @IsEnum(['1h', '6h', '24h', '7d', '30d'])
  period?: '1h' | '6h' | '24h' | '7d' | '30d';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  metrics?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  nodeIds?: string[];

  @IsOptional()
  @IsString()
  @IsEnum(['efficiency', 'cost', 'availability', 'performance', 'trading'])
  reportType?: 'efficiency' | 'cost' | 'availability' | 'performance' | 'trading';

  @IsOptional()
  @IsBoolean()
  includeForecasts?: boolean;

  @IsOptional()
  @IsBoolean()
  includeRecommendations?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['json', 'csv', 'xml'])
  format?: 'json' | 'csv' | 'xml';
}

export class AlertConfigurationDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  alertRules?: AlertRuleDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  notificationChannels?: string[];

  @IsOptional()
  @IsBoolean()
  enableEscalation?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(60)
  escalationDelayMinutes?: number;

  @IsOptional()
  @IsBoolean()
  enableAutoAcknowledgment?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePredictiveAlerts?: boolean;
}

export class AlertRuleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  metric: string;

  @IsEnum(['>', '<', '>=', '<=', '==', '!='])
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';

  @IsNumber()
  threshold: number;

  @IsEnum(['info', 'warning', 'critical'])
  severity: 'info' | 'warning' | 'critical';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  nodeIds?: string[];
}

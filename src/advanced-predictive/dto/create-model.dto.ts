import { IsString, IsArray, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModelType {
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  TIME_SERIES = 'time_series',
  ANOMALY_DETECTION = 'anomaly_detection',
  RECOMMENDATION = 'recommendation',
  DEEP_LEARNING = 'deep_learning',
  ENSEMBLE = 'ensemble',
}

export enum ModelStatus {
  CREATED = 'created',
  TRAINING = 'training',
  TRAINED = 'trained',
  EVALUATING = 'evaluating',
  EVALUATED = 'evaluated',
  DEPLOYED = 'deployed',
  FAILED = 'failed',
  ARCHIVED = 'archived',
}

export enum ModelArchitecture {
  LINEAR = 'linear',
  TREE_BASED = 'tree_based',
  NEURAL_NETWORK = 'neural_network',
  TRANSFORMER = 'transformer',
  CNN = 'cnn',
  RNN = 'rnn',
  LSTM = 'lstm',
  GRU = 'gru',
  ATTENTION = 'attention',
  AUTOENCODER = 'autoencoder',
  GAN = 'gan',
  VAE = 'vae',
}

export class CreateModelDto {
  @ApiProperty({ description: 'Model name', example: 'Energy Price Predictor' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Model description', example: 'Deep learning model for predicting energy prices' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Model type', enum: ModelType })
  @IsEnum(ModelType)
  type: ModelType;

  @ApiProperty({ description: 'Model architecture', enum: ModelArchitecture })
  @IsEnum(ModelArchitecture)
  architecture: ModelArchitecture;

  @ApiProperty({ description: 'Target variable', example: 'energy_price' })
  @IsString()
  targetVariable: string;

  @ApiPropertyOptional({ description: 'Feature variables', example: ['temperature', 'demand', 'supply'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureVariables?: string[];

  @ApiPropertyOptional({ description: 'Hyperparameters', example: { learning_rate: 0.001, epochs: 100 } })
  @IsOptional()
  hyperparameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Training dataset', example: 'energy_prices_2020_2023' })
  @IsString()
  @IsOptional()
  trainingDataset?: string;

  @ApiPropertyOptional({ description: 'Validation dataset', example: 'energy_prices_2024' })
  @IsString()
  @IsOptional()
  validationDataset?: string;

  @ApiPropertyOptional({ description: 'Test dataset', example: 'energy_prices_2024_q4' })
  @IsString()
  @IsOptional()
  testDataset?: string;

  @ApiPropertyOptional({ description: 'Performance metrics', example: ['accuracy', 'precision', 'recall', 'f1_score'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  performanceMetrics?: string[];

  @ApiPropertyOptional({ description: 'Model tags', example: ['energy', 'prediction', 'deep_learning'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Model version', example: '1.0.0' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: 'Model owner', example: 'data_science_team' })
  @IsString()
  @IsOptional()
  owner?: string;

  @ApiPropertyOptional({ description: 'Model priority', example: 'high' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: 'Deployment environment', example: 'production' })
  @IsString()
  @IsOptional()
  deploymentEnvironment?: string;

  @ApiPropertyOptional({ description: 'Monitoring enabled', example: true })
  @IsOptional()
  monitoringEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Explainability enabled', example: true })
  @IsOptional()
  explainabilityEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Retraining schedule', example: 'weekly' })
  @IsString()
  @IsOptional()
  retrainingSchedule?: string;

  @ApiPropertyOptional({ description: 'Drift detection enabled', example: true })
  @IsOptional()
  driftDetectionEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Model constraints', example: { max_latency: 100, max_memory: 512 } })
  @IsOptional()
  constraints?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Business requirements', example: { accuracy_threshold: 0.95, latency_threshold: 50 } })
  @IsOptional()
  businessRequirements?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Compliance requirements', example: { gdpr_compliant: true, audit_trail: true } })
  @IsOptional()
  complianceRequirements?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

import { IsString, IsArray, IsOptional, IsEnum, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TrainingMethod {
  SUPERVISED = 'supervised',
  UNSUPERVISED = 'unsupervised',
  SEMI_SUPERVISED = 'semi_supervised',
  REINFORCEMENT = 'reinforcement',
  TRANSFER_LEARNING = 'transfer_learning',
  FINE_TUNING = 'fine_tuning',
}

export enum OptimizationAlgorithm {
  SGD = 'sgd',
  ADAM = 'adam',
  RMSPROP = 'rmsprop',
  ADAGRAD = 'adagrad',
  ADADELTA = 'adadelta',
  ADAMW = 'adamw',
}

export class TrainingConfigDto {
  @ApiProperty({ description: 'Training method', enum: TrainingMethod })
  @IsEnum(TrainingMethod)
  method: TrainingMethod;

  @ApiPropertyOptional({ description: 'Number of epochs', example: 100 })
  @IsNumber()
  @IsOptional()
  epochs?: number;

  @ApiPropertyOptional({ description: 'Batch size', example: 32 })
  @IsNumber()
  @IsOptional()
  batchSize?: number;

  @ApiPropertyOptional({ description: 'Learning rate', example: 0.001 })
  @IsNumber()
  @IsOptional()
  learningRate?: number;

  @ApiPropertyOptional({ description: 'Optimization algorithm', enum: OptimizationAlgorithm })
  @IsEnum(OptimizationAlgorithm)
  @IsOptional()
  optimizer?: OptimizationAlgorithm;

  @ApiPropertyOptional({ description: 'Early stopping enabled', example: true })
  @IsBoolean()
  @IsOptional()
  earlyStopping?: boolean;

  @ApiPropertyOptional({ description: 'Patience for early stopping', example: 10 })
  @IsNumber()
  @IsOptional()
  patience?: number;

  @ApiPropertyOptional({ description: 'Validation split ratio', example: 0.2 })
  @IsNumber()
  @IsOptional()
  validationSplit?: number;

  @ApiPropertyOptional({ description: 'Cross-validation folds', example: 5 })
  @IsNumber()
  @IsOptional()
  cvFolds?: number;

  @ApiPropertyOptional({ description: 'Random seed', example: 42 })
  @IsNumber()
  @IsOptional()
  randomSeed?: number;

  @ApiPropertyOptional({ description: 'GPU training enabled', example: true })
  @IsBoolean()
  @IsOptional()
  gpuEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Distributed training enabled', example: false })
  @IsBoolean()
  @IsOptional()
  distributedTraining?: boolean;

  @ApiPropertyOptional({ description: 'Number of workers', example: 4 })
  @IsNumber()
  @IsOptional()
  numWorkers?: number;

  @ApiPropertyOptional({ description: 'Data augmentation enabled', example: false })
  @IsBoolean()
  @IsOptional()
  dataAugmentation?: boolean;

  @ApiPropertyOptional({ description: 'Feature scaling enabled', example: true })
  @IsBoolean()
  @IsOptional()
  featureScaling?: boolean;

  @ApiPropertyOptional({ description: 'Regularization technique', example: 'dropout' })
  @IsString()
  @IsOptional()
  regularization?: string;

  @ApiPropertyOptional({ description: 'Regularization strength', example: 0.01 })
  @IsNumber()
  @IsOptional()
  regularizationStrength?: number;

  @ApiPropertyOptional({ description: 'Class weights', example: { 'class_0': 1.0, 'class_1': 2.0 } })
  @IsOptional()
  classWeights?: Record<string, number>;

  @ApiPropertyOptional({ description: 'Evaluation metrics', example: ['accuracy', 'precision', 'recall', 'f1_score'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  evaluationMetrics?: string[];

  @ApiPropertyOptional({ description: 'Checkpoint frequency', example: 10 })
  @IsNumber()
  @IsOptional()
  checkpointFrequency?: number;

  @ApiPropertyOptional({ description: 'Save best model only', example: true })
  @IsBoolean()
  @IsOptional()
  saveBestOnly?: boolean;

  @ApiPropertyOptional({ description: 'Training log level', example: 'INFO' })
  @IsString()
  @IsOptional()
  logLevel?: string;

  @ApiPropertyOptional({ description: 'Additional hyperparameters' })
  @IsOptional()
  hyperparameters?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Training callbacks', example: ['early_stopping', 'model_checkpoint'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  callbacks?: string[];
}

import { IsString, IsArray, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PrototypeType {
  ALGORITHM = 'algorithm',
  MODEL = 'model',
  SYSTEM = 'system',
  PROTOTYPE = 'prototype',
  CONCEPT = 'concept',
}

export enum PrototypeStatus {
  CONCEPT = 'concept',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  VALIDATION = 'validation',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum InnovationCategory {
  AI_ML = 'ai_ml',
  BLOCKCHAIN = 'blockchain',
  ENERGY = 'energy',
  SUSTAINABILITY = 'sustainability',
  FINTECH = 'fintech',
  IOT = 'iot',
  QUANTUM = 'quantum',
}

export class InnovationLabDto {
  @ApiProperty({ description: 'Prototype title', example: 'Neural Network Energy Predictor' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Prototype description', example: 'Advanced neural network for predicting energy market trends' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Prototype type', enum: PrototypeType })
  @IsEnum(PrototypeType)
  type: PrototypeType;

  @ApiProperty({ description: 'Prototype status', enum: PrototypeStatus })
  @IsEnum(PrototypeStatus)
  status: PrototypeStatus;

  @ApiProperty({ description: 'Innovation category', enum: InnovationCategory })
  @IsEnum(InnovationCategory)
  category: InnovationCategory;

  @ApiProperty({ description: 'Lead researcher', example: 'researcher_12345' })
  @IsString()
  leadResearcher: string;

  @ApiPropertyOptional({ description: 'Team members', example: ['researcher_67890', 'researcher_11111'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamMembers?: string[];

  @ApiPropertyOptional({ description: 'Research hypothesis', example: 'Neural networks can predict energy prices with 95% accuracy' })
  @IsString()
  @IsOptional()
  hypothesis?: string;

  @ApiPropertyOptional({ description: 'Technical approach', example: 'Using LSTM networks with attention mechanisms' })
  @IsString()
  @IsOptional()
  technicalApproach?: string;

  @ApiPropertyOptional({ description: 'Required resources', example: ['GPU cluster', 'training data', 'software licenses'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredResources?: string[];

  @ApiPropertyOptional({ description: 'Budget', example: 75000 })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ description: 'Start date', example: '2024-01-01T00:00:00Z' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Expected completion date', example: '2024-06-30T23:59:59Z' })
  @IsString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Success criteria', example: ['95% accuracy', 'Real-time processing', 'Scalable architecture'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  successCriteria?: string[];

  @ApiPropertyOptional({ description: 'Testing methodology', example: 'Cross-validation with historical data' })
  @IsString()
  @IsOptional()
  testingMethodology?: string;

  @ApiPropertyOptional({ description: 'Validation approach', example: 'A/B testing against baseline models' })
  @IsString()
  @IsOptional()
  validationApproach?: string;

  @ApiPropertyOptional({ description: 'Potential applications', example: ['Energy trading', 'Risk management', 'Portfolio optimization'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  potentialApplications?: string[];

  @ApiPropertyOptional({ description: 'Market potential', example: 'High - addresses $10B market opportunity' })
  @IsString()
  @IsOptional()
  marketPotential?: string;

  @ApiPropertyOptional({ description: 'Competitive advantage', example: 'First-mover advantage with patented technology' })
  @IsString()
  @IsOptional()
  competitiveAdvantage?: string;

  @ApiPropertyOptional({ description: 'Risk factors', example: ['Technical complexity', 'Market adoption', 'Regulatory changes'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  riskFactors?: string[];

  @ApiPropertyOptional({ description: 'Mitigation strategies', example: ['Phased development', 'Pilot testing', 'Stakeholder engagement'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mitigationStrategies?: string[];

  @ApiPropertyOptional({ description: 'Intellectual property strategy', example: 'Patent filing and trade secret protection' })
  @IsString()
  @IsOptional()
  intellectualPropertyStrategy?: string;

  @ApiPropertyOptional({ description: 'Commercialization plan', example: 'Licensing to energy companies' })
  @IsString()
  @IsOptional()
  commercializationPlan?: string;

  @ApiPropertyOptional({ description: 'Milestones', example: ['Prototype ready', 'Testing complete', 'Validation successful'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  milestones?: string[];

  @ApiPropertyOptional({ description: 'Key performance indicators', example: ['Accuracy', 'Speed', 'Scalability', 'Cost efficiency'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keyPerformanceIndicators?: string[];

  @ApiPropertyOptional({ description: 'Stakeholders', example: ['Research team', 'Management', 'Potential investors'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  stakeholders?: string[];

  @ApiPropertyOptional({ description: 'Confidentiality level', example: 'confidential' })
  @IsString()
  @IsOptional()
  confidentialityLevel?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

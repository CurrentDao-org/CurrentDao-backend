import { IsString, IsArray, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ResearchCategory {
  ENERGY_RESEARCH = 'energy_research',
  BLOCKCHAIN = 'blockchain',
  AI_ML = 'ai_ml',
  SUSTAINABILITY = 'sustainability',
  FINANCIAL_TECHNOLOGY = 'financial_technology',
  DATA_SCIENCE = 'data_science',
  QUANTUM_COMPUTING = 'quantum_computing',
  MATERIALS_SCIENCE = 'materials_science',
}

export enum ProjectStatus {
  PROPOSED = 'proposed',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PriorityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class CreateResearchProjectDto {
  @ApiProperty({ description: 'Project title', example: 'Advanced Energy Trading Algorithms' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Project description', example: 'Research and development of advanced algorithms for energy trading optimization' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Research category', enum: ResearchCategory })
  @IsEnum(ResearchCategory)
  category: ResearchCategory;

  @ApiProperty({ description: 'Project status', enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  status: ProjectStatus;

  @ApiProperty({ description: 'Priority level', enum: PriorityLevel })
  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @ApiProperty({ description: 'Lead researcher ID', example: 'researcher_12345' })
  @IsString()
  leadResearcher: string;

  @ApiPropertyOptional({ description: 'Team members', example: ['researcher_67890', 'researcher_11111'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamMembers?: string[];

  @ApiPropertyOptional({ description: 'Research objectives', example: ['Optimize trading algorithms', 'Reduce energy consumption'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Expected outcomes', example: ['15% efficiency improvement', 'Reduced carbon footprint'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  expectedOutcomes?: string[];

  @ApiPropertyOptional({ description: 'Budget in USD', example: 100000 })
  @IsOptional()
  @Min(0)
  budget?: number;

  @ApiPropertyOptional({ description: 'Start date', example: '2024-01-01T00:00:00Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Expected completion date', example: '2024-12-31T23:59:59Z' })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiPropertyOptional({ description: 'Required datasets', example: ['energy_prices', 'weather_data', 'trading_volumes'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredDatasets?: string[];

  @ApiPropertyOptional({ description: 'Required equipment', example: ['high_performance_computing', 'data_storage'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredEquipment?: string[];

  @ApiPropertyOptional({ description: 'Collaboration partners', example: ['university_lab', 'industry_partner'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  collaborationPartners?: string[];

  @ApiPropertyOptional({ description: 'Funding sources', example: ['government_grant', 'private_investment'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fundingSources?: string[];

  @ApiPropertyOptional({ description: 'Risk assessment', example: 'Medium risk with proper mitigation strategies' })
  @IsString()
  @IsOptional()
  riskAssessment?: string;

  @ApiPropertyOptional({ description: 'Success metrics', example: ['Algorithm efficiency', 'Energy savings', 'Cost reduction'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  successMetrics?: string[];

  @ApiPropertyOptional({ description: 'Project tags', example: ['ai', 'energy', 'optimization'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Confidentiality level', example: 'confidential' })
  @IsString()
  @IsOptional()
  confidentialityLevel?: string;

  @ApiPropertyOptional({ description: 'Publication rights', example: true })
  @IsOptional()
  publicationRights?: boolean;

  @ApiPropertyOptional({ description: 'Intellectual property ownership', example: 'joint_ownership' })
  @IsString()
  @IsOptional()
  intellectualPropertyOwnership?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

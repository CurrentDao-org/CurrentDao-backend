import { IsString, IsArray, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CollaborationType {
  RESEARCH_PARTNERSHIP = 'research_partnership',
  ACADEMIC_COLLABORATION = 'academic_collaboration',
  INDUSTRY_PARTNERSHIP = 'industry_partnership',
  GOVERNMENT_PARTNERSHIP = 'government_partnership',
  CONSORTIUM = 'consortium',
}

export enum CollaborationStatus {
  PROPOSED = 'proposed',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export class CollaborationDto {
  @ApiProperty({ description: 'Collaboration title', example: 'AI-Enhanced Energy Trading Research' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Collaboration description', example: 'Joint research project on AI applications in energy trading' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Collaboration type', enum: CollaborationType })
  @IsEnum(CollaborationType)
  type: CollaborationType;

  @ApiProperty({ description: 'Collaboration status', enum: CollaborationStatus })
  @IsEnum(CollaborationStatus)
  status: CollaborationStatus;

  @ApiProperty({ description: 'Lead organization', example: 'CurrentDao Research Lab' })
  @IsString()
  leadOrganization: string;

  @ApiProperty({ description: 'Partner organizations', example: ['MIT Energy Lab', 'Stanford AI Lab'] })
  @IsArray()
  @IsString({ each: true })
  partnerOrganizations: string[];

  @ApiPropertyOptional({ description: 'Lead researcher', example: 'researcher_12345' })
  @IsString()
  @IsOptional()
  leadResearcher?: string;

  @ApiPropertyOptional({ description: 'Team members', example: ['researcher_67890', 'researcher_11111'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  teamMembers?: string[];

  @ApiPropertyOptional({ description: 'Start date', example: '2024-01-01T00:00:00Z' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date', example: '2024-12-31T23:59:59Z' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Budget', example: 500000 })
  @IsNumber()
  @IsOptional()
  budget?: number;

  @ApiPropertyOptional({ description: 'Research objectives', example: ['Develop AI models', 'Test on real data'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  objectives?: string[];

  @ApiPropertyOptional({ description: 'Expected outcomes', example: ['Published papers', 'Patent applications'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  expectedOutcomes?: string[];

  @ApiPropertyOptional({ description: 'Collaboration agreement', example: 'joint_ownership' })
  @IsString()
  @IsOptional()
  collaborationAgreement?: string;

  @ApiPropertyOptional({ description: 'Data sharing terms', example: 'shared_research_data' })
  @IsString()
  @IsOptional()
  dataSharingTerms?: string;

  @ApiPropertyOptional({ description: 'Intellectual property terms', example: 'joint_ip_ownership' })
  @IsString()
  @IsOptional()
  intellectualPropertyTerms?: string;

  @ApiPropertyOptional({ description: 'Publication rights', example: 'joint_publication_rights' })
  @IsString()
  @IsOptional()
  publicationRights?: string;

  @ApiPropertyOptional({ description: 'Confidentiality level', example: 'confidential' })
  @IsString()
  @IsOptional()
  confidentialityLevel?: string;

  @ApiPropertyOptional({ description: 'Meeting schedule', example: 'bi_weekly' })
  @IsString()
  @IsOptional()
  meetingSchedule?: string;

  @ApiPropertyOptional({ description: 'Communication channels', example: ['slack', 'email', 'video_conference'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  communicationChannels?: string[];

  @ApiPropertyOptional({ description: 'Milestones', example: ['Phase 1 complete', 'Model trained', 'Results published'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  milestones?: string[];

  @ApiPropertyOptional({ description: 'Risk assessment', example: 'Low risk with proper management' })
  @IsString()
  @IsOptional()
  riskAssessment?: string;

  @ApiPropertyOptional({ description: 'Success metrics', example: ['Publications', 'Patents', 'Citations'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  successMetrics?: string[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

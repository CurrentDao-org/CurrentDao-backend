import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobType,
  JobPriority,
  RetryStrategy,
} from '../entities/scheduled-job.entity';

export class ExecutionContextDto {
  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timeZone?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  locale?: string;

  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ example: 'v1.2.3' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional({ example: 'node-01' })
  @IsOptional()
  @IsString()
  nodeId?: string;
}

export class JobNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  onSuccess?: {
    enabled: boolean;
    channels: string[];
    recipients: string[];
    template?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  onFailure?: {
    enabled: boolean;
    channels: string[];
    recipients: string[];
    template?: string;
    includeStackTrace?: boolean;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  onRetry?: {
    enabled: boolean;
    channels: string[];
    recipients: string[];
    template?: string;
  };
}

export class JobDependencyDto {
  @ApiPropertyOptional({ example: ['job-uuid-1', 'job-uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  conditions?: Array<{
    type: 'job_status' | 'time_based' | 'data_based';
    jobId?: string;
    status?: string;
    condition?: string;
    value?: any;
  }>;
}

export class ResourceLimitsDto {
  @ApiPropertyOptional({ example: 1024 })
  @IsOptional()
  @IsNumber()
  @Min(64)
  maxMemory?: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxCpu?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxConcurrentJobs?: number;
}

export class SchedulingDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxRuns?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  skipIfRunning?: boolean;

  @ApiPropertyOptional({
    enum: ['allow', 'forbid', 'replace'],
    example: 'forbid',
  })
  @IsOptional()
  @IsEnum(['allow', 'forbid', 'replace'])
  concurrency?: 'allow' | 'forbid' | 'replace';
}

export class ScheduleTradeDto {
  @ApiProperty({ example: 'Execute Trade #12345' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Scheduled execution for trade settlement' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: JobType, example: JobType.TRADE_EXECUTION })
  @IsEnum(JobType)
  type: JobType;

  @ApiPropertyOptional({ enum: JobPriority, example: JobPriority.HIGH })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiProperty({ example: '0 15 14 * * 1-5' })
  @IsString()
  cronExpression: string;

  @ApiProperty({ example: '2024-02-20T14:15:00.000Z' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: {
    tradeId?: string;
    settlementId?: string;
    batchSize?: number;
    timeout?: number;
    retries?: number;
    customData?: Record<string, any>;
  };

  @ApiPropertyOptional({
    enum: RetryStrategy,
    example: RetryStrategy.EXPONENTIAL_BACKOFF,
  })
  @IsOptional()
  @IsEnum(RetryStrategy)
  retryStrategy?: RetryStrategy;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  retryDelay?: number;

  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  timeoutSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ExecutionContextDto)
  executionContext?: ExecutionContextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => JobDependencyDto)
  dependencies?: JobDependencyDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => JobNotificationDto)
  notifications?: JobNotificationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ResourceLimitsDto)
  resourceLimits?: ResourceLimitsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => SchedulingDto)
  scheduling?: SchedulingDto;

  @ApiPropertyOptional({ example: ['urgent', 'settlement', 'batch-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  marketHoursOnly?: boolean;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timeZone?: string;
}

export class UpdateScheduleDto {
  @ApiPropertyOptional({ example: 'Updated Trade Execution' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: JobPriority, example: JobPriority.CRITICAL })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiPropertyOptional({ example: '0 30 15 * * 1-5' })
  @IsOptional()
  @IsString()
  cronExpression?: string;

  @ApiPropertyOptional({ example: '2024-02-20T15:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({ example: 600 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(3600)
  timeoutSeconds?: number;
}

export class BulkScheduleDto {
  @ApiProperty({ example: [ScheduleTradeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleTradeDto)
  jobs: ScheduleTradeDto[];

  @ApiPropertyOptional({ example: 'batch-trade-execution' })
  @IsOptional()
  @IsString()
  batchName?: string;

  @ApiPropertyOptional({ example: 'Bulk trade execution for settlement batch' })
  @IsOptional()
  @IsString()
  batchDescription?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  executeSequentially?: boolean;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  delayBetweenJobs?: number;
}

export class EmergencyStopDto {
  @ApiProperty({ example: 'Critical system maintenance' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    enum: ['all', 'type', 'priority', 'specific'],
    example: 'all',
  })
  @IsOptional()
  @IsEnum(['all', 'type', 'priority', 'specific'])
  scope?: 'all' | 'type' | 'priority' | 'specific';

  @ApiPropertyOptional({
    example: [JobType.TRADE_EXECUTION, JobType.SETTLEMENT],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(JobType, { each: true })
  jobTypes?: JobType[];

  @ApiPropertyOptional({
    example: [JobPriority.CRITICAL, JobPriority.EMERGENCY],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(JobPriority, { each: true })
  priorities?: JobPriority[];

  @ApiPropertyOptional({ example: ['job-uuid-1', 'job-uuid-2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobIds?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowRestart?: boolean;

  @ApiPropertyOptional({ example: '2024-02-20T18:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  restartAt?: string;
}

export class JobQueryDto {
  @ApiPropertyOptional({ enum: JobType })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiPropertyOptional({
    enum: [
      'pending',
      'running',
      'completed',
      'failed',
      'cancelled',
      'retrying',
    ],
  })
  @IsOptional()
  @IsEnum([
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'retrying',
  ])
  status?: string;

  @ApiPropertyOptional({ enum: JobPriority })
  @IsOptional()
  @IsEnum(JobPriority)
  priority?: JobPriority;

  @ApiPropertyOptional({ example: 'trade-123' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ example: ['urgent', 'batch-1'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: '2024-02-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledAfter?: string;

  @ApiPropertyOptional({ example: '2024-02-20T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledBefore?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isEmergencyStop?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ['createdAt', 'scheduledAt', 'priority', 'status'],
    example: 'scheduledAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'scheduledAt', 'priority', 'status'])
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'ASC' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

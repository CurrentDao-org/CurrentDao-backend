import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum JobType {
  TRADE_EXECUTION = 'trade_execution',
  SETTLEMENT = 'settlement',
  MAINTENANCE = 'maintenance',
  MARKET_OPEN = 'market_open',
  MARKET_CLOSE = 'market_close',
  DATA_CLEANUP = 'data_cleanup',
  REPORT_GENERATION = 'report_generation',
  NOTIFICATION = 'notification',
}

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

export enum JobPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
  EMERGENCY = 5,
}

export enum RetryStrategy {
  IMMEDIATE = 'immediate',
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  FIXED_INTERVAL = 'fixed_interval',
}

@Entity('scheduled_jobs')
export class ScheduledJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: JobType,
  })
  type: JobType;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.PENDING,
  })
  status: JobStatus;

  @Column({
    type: 'enum',
    enum: JobPriority,
    default: JobPriority.MEDIUM,
  })
  priority: JobPriority;

  @Column({ type: 'text' })
  cronExpression: string;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ name: 'next_run_at', type: 'datetime', nullable: true })
  nextRunAt?: Date;

  @Column({ name: 'last_run_at', type: 'datetime', nullable: true })
  lastRunAt?: Date;

  @Column({ type: 'json', nullable: true })
  parameters: {
    tradeId?: string;
    settlementId?: string;
    batchSize?: number;
    timeout?: number;
    retries?: number;
    customData?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  result: {
    success: boolean;
    data?: any;
    output?: string;
    processedCount?: number;
    errorCount?: number;
    duration?: number;
  };

  @Column({ type: 'json', nullable: true })
  error: {
    message: string;
    stack?: string;
    code?: string;
    timestamp: Date;
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: Date;
  };

  @Column({
    type: 'enum',
    enum: RetryStrategy,
    default: RetryStrategy.EXPONENTIAL_BACKOFF,
  })
  retryStrategy: RetryStrategy;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({
    name: 'retry_delay',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  retryDelay?: number;

  @Column({ name: 'timeout_seconds', default: 300 })
  timeoutSeconds: number;

  @Column({ type: 'json', nullable: true })
  executionContext: {
    timeZone?: string;
    locale?: string;
    environment?: string;
    version?: string;
    nodeId?: string;
  };

  @Column({ type: 'json', nullable: true })
  dependencies: {
    jobIds?: string[];
    conditions?: Array<{
      type: 'job_status' | 'time_based' | 'data_based';
      jobId?: string;
      status?: JobStatus;
      condition?: string;
      value?: any;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  notifications: {
    onSuccess?: {
      enabled: boolean;
      channels: string[];
      recipients: string[];
      template?: string;
    };
    onFailure?: {
      enabled: boolean;
      channels: string[];
      recipients: string[];
      template?: string;
      includeStackTrace?: boolean;
    };
    onRetry?: {
      enabled: boolean;
      channels: string[];
      recipients: string[];
      template?: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  metrics: {
    executionCount: number;
    successCount: number;
    failureCount: number;
    avgExecutionTime: number;
    minExecutionTime: number;
    maxExecutionTime: number;
    lastExecutionTime?: number;
    totalExecutionTime: number;
  };

  @Column({ type: 'json', nullable: true })
  scheduling: {
    isActive: boolean;
    isRecurring: boolean;
    endDate?: Date;
    maxRuns?: number;
    runCount: number;
    skipIfRunning: boolean;
    concurrency: 'allow' | 'forbid' | 'replace';
  };

  @Column({ type: 'json', nullable: true })
  resourceLimits: {
    maxMemory?: number;
    maxCpu?: number;
    maxConcurrentJobs?: number;
  };

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ name: 'executed_by', nullable: true })
  executedBy?: string;

  @Column({ name: 'is_emergency_stop', default: false })
  isEmergencyStop: boolean;

  @Column({ name: 'emergency_stop_reason', nullable: true })
  emergencyStopReason?: string;

  @Column({ name: 'emergency_stopped_at', type: 'datetime', nullable: true })
  emergencyStoppedAt?: Date;

  @Column({ type: 'json', nullable: true })
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    userId?: string;
    reason?: string;
    previousStatus?: JobStatus;
    newStatus?: JobStatus;
    details?: any;
  }>;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_system_job', default: false })
  isSystemJob: boolean;

  @Column({ name: 'market_hours_only', default: false })
  marketHoursOnly: boolean;

  @Column({ name: 'time_zone', default: 'UTC' })
  timeZone: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

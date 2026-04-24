import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  REJECT = 'reject',
  CANCEL = 'cancel',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ACCESS_DENIED = 'access_denied',
  SYSTEM_ERROR = 'system_error',
  DATA_EXPORT = 'data_export',
  CONFIG_CHANGE = 'config_change',
  SECURITY_EVENT = 'security_event',
  COMPLIANCE_CHECK = 'compliance_check',
}

export enum AuditResource {
  USER = 'user',
  TRADE = 'trade',
  LISTING = 'listing',
  BID = 'bid',
  MATCH = 'match',
  TRANSACTION = 'transaction',
  PAYMENT = 'payment',
  SETTLEMENT = 'settlement',
  CONTRACT = 'contract',
  SYSTEM = 'system',
  AUDIT = 'audit',
  REPORT = 'report',
  CONFIGURATION = 'configuration',
}

export enum AuditSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AuditStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'enum', enum: AuditResource })
  resource: AuditResource;

  @Column({ type: 'enum', enum: AuditSeverity, default: AuditSeverity.MEDIUM })
  severity: AuditSeverity;

  @Column({ type: 'enum', enum: AuditStatus, default: AuditStatus.ACTIVE })
  status: AuditStatus;

  @Column({ name: 'resource_id', nullable: true })
  resourceId?: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'session_id', nullable: true })
  sessionId?: string;

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'request_method', length: 10, nullable: true })
  requestMethod?: string;

  @Column({ name: 'request_url', type: 'text', nullable: true })
  requestUrl?: string;

  @Column({ name: 'request_body', type: 'json', nullable: true })
  requestBody?: any;

  @Column({ name: 'response_body', type: 'json', nullable: true })
  responseBody?: any;

  @Column({ name: 'response_status', nullable: true })
  responseStatus?: number;

  @Column({ name: 'execution_time', type: 'decimal', precision: 8, scale: 3, nullable: true })
  executionTime?: number;

  @Column({ name: 'memory_usage', type: 'decimal', precision: 10, scale: 2, nullable: true })
  memoryUsage?: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    previousState?: any;
    newState?: any;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
    tags?: string[];
    category?: string;
    subcategory?: string;
    compliance?: {
      regulation?: string;
      requirement?: string;
      classification?: string;
    };
    risk?: {
      level: 'low' | 'medium' | 'high' | 'critical';
      factors?: string[];
      score?: number;
    };
    privacy?: {
      dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
      redactionLevel?: number;
      consentRequired?: boolean;
    };
  };

  @Column({ name: 'checksum', length: 64, nullable: true })
  checksum?: string;

  @Column({ name: 'signature', length: 512, nullable: true })
  signature?: string;

  @Column({ name: 'signed_at', type: 'datetime', nullable: true })
  signedAt?: Date;

  @Column({ name: 'signed_by', nullable: true })
  signedBy?: string;

  @Column({ name: 'retention_until', type: 'datetime', nullable: true })
  retentionUntil?: Date;

  @Column({ name: 'archived_at', type: 'datetime', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ type: 'json', nullable: true })
  chainOfCustody: Array<{
    timestamp: Date;
    userId: string;
    action: string;
    previousHash?: string;
    currentHash: string;
    signature?: string;
  }>;

  @Column({ type: 'json', nullable: true })
  verification: {
    integrityVerified: boolean;
    lastVerifiedAt?: Date;
    verificationMethod?: string;
    verificationResult?: string;
    tamperDetected?: boolean;
    tamperDetails?: string;
  };

  @Column({ type: 'json', nullable: true })
  compliance: {
    regulations: Array<{
      name: string;
      version: string;
      requirements: string[];
      compliant: boolean;
      lastChecked: Date;
      evidence?: string;
    }>;
    classifications: Array<{
      type: string;
      category: string;
      level: string;
      description: string;
    }>;
    reports: Array<{
      reportId: string;
      reportType: string;
      generatedAt: Date;
      status: string;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  privacy: {
    dataSubjectId?: string;
    consentRecords: Array<{
      consentType: string;
      givenAt: Date;
      expiresAt?: Date;
      purpose: string;
      legalBasis: string;
    }>;
    dataProcessing: {
      purpose: string;
      legalBasis: string;
      retentionPeriod: string;
      categories: string[];
    };
    redactionRules: Array<{
      field: string;
      condition: string;
      action: string;
      applied: boolean;
    }>;
  };

  @Column({ name: 'correlation_id', length: 64, nullable: true })
  correlationId?: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  @Column({ name: 'batch_id', nullable: true })
  batchId?: string;

  @Column({ type: 'json', nullable: true })
  performance: {
    cpuTime?: number;
    memoryPeak?: number;
    diskIO?: number;
    networkIO?: number;
    cacheHits?: number;
    cacheMisses?: number;
  };

  @Column({ type: 'json', nullable: true })
  security: {
    authenticationMethod?: string;
    authorizationResult?: string;
    permissionsChecked: string[];
    rolesChecked: string[];
    violations: Array<{
      type: string;
      description: string;
      severity: string;
      timestamp: Date;
    }>;
    threats: Array<{
      type: string;
      level: string;
      description: string;
      detected: boolean;
      confidence: number;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  integration: {
    sourceSystem?: string;
    sourceEventId?: string;
    sourceEventType?: string;
    processingPipeline?: string[];
    transformations?: Array<{
      type: string;
      timestamp: Date;
      details: any;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  error: {
    code?: string;
    message?: string;
    stack?: string;
    type?: string;
    severity?: string;
    recoverable?: boolean;
    retryCount?: number;
  };

  @Column({ name: 'is_sensitive', default: false })
  isSensitive: boolean;

  @Column({ name: 'is_encrypted', default: false })
  isEncrypted: boolean;

  @Column({ name: 'encryption_key_id', nullable: true })
  encryptionKeyId?: string;

  @Column({ name: 'compression_algorithm', nullable: true })
  compressionAlgorithm?: string;

  @Column({ name: 'storage_location', nullable: true })
  storageLocation?: string;

  @Column({ name: 'backup_location', nullable: true })
  backupLocation?: string;

  @Column({ name: 'restore_point', nullable: true })
  restorePoint?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Index(['userId', 'createdAt'])
  @Index(['resource', 'resourceId'])
  @Index(['action', 'createdAt'])
  @Index(['severity', 'createdAt'])
  @Index(['status', 'createdAt'])
  @Index(['createdAt'])
  @Index(['correlationId'])
  @Index(['batchId'])
  @Index(['retentionUntil'])
}

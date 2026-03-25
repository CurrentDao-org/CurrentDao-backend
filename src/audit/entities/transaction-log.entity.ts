import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export enum TransactionType {
  TRADE_EXECUTION = 'trade_execution',
  PAYMENT_PROCESSING = 'payment_processing',
  SETTLEMENT = 'settlement',
  ESCROW_RELEASE = 'escrow_release',
  REFUND = 'refund',
  CANCELLATION = 'cancellation',
  MODIFICATION = 'modification',
  APPROVAL = 'approval',
  REJECTION = 'rejection',
  VERIFICATION = 'verification',
  COMPLIANCE_CHECK = 'compliance_check',
}

export enum TransactionStatus {
  INITIATED = 'initiated',
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REVERSED = 'reversed',
  HELD = 'held',
  EXPIRED = 'expired',
}

export enum TransactionCategory {
  ENERGY_TRADE = 'energy_trade',
  FINANCIAL = 'financial',
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
  SYSTEM = 'system',
  USER_MANAGEMENT = 'user_management',
  DATA_MANAGEMENT = 'data_management',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
  ESCROW = 'escrow',
  WIRE_TRANSFER = 'wire_transfer',
  CHECK = 'check',
}

export enum ComplianceLevel {
  STANDARD = 'standard',
  ENHANCED = 'enhanced',
  STRICT = 'strict',
  REGULATED = 'regulated',
}

@Entity('transaction_logs')
export class TransactionLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.INITIATED })
  status: TransactionStatus;

  @Column({ type: 'enum', enum: TransactionCategory })
  category: TransactionCategory;

  @Column({ name: 'transaction_id', unique: true, length: 64 })
  transactionId: string;

  @Column({ name: 'parent_transaction_id', nullable: true })
  parentTransactionId?: string;

  @Column({ name: 'root_transaction_id', nullable: true })
  rootTransactionId?: string;

  @Column({ name: 'batch_id', nullable: true })
  batchId?: string;

  @Column({ name: 'correlation_id', nullable: true })
  correlationId?: string;

  @Column({ name: 'source_account_id', nullable: true })
  sourceAccountId?: string;

  @Column({ name: 'destination_account_id', nullable: true })
  destinationAccountId?: string;

  @Column({ name: 'intermediate_accounts', type: 'json', nullable: true })
  intermediateAccounts?: string[];

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  originalAmount?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  feeAmount?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  taxAmount?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  exchangeRate?: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ length: 3, nullable: true })
  originalCurrency?: string;

  @Column({ type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ name: 'payment_reference', length: 128, nullable: true })
  paymentReference?: string;

  @Column({ name: 'payment_gateway', length: 64, nullable: true })
  paymentGateway?: string;

  @Column({ name: 'gateway_transaction_id', length: 128, nullable: true })
  gatewayTransactionId?: string;

  @Column({ name: 'gateway_response', type: 'json', nullable: true })
  gatewayResponse?: any;

  @Column({ type: 'json', nullable: true })
  participants: {
    buyer?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      address?: any;
      verificationStatus?: string;
    };
    seller?: {
      id: string;
      name: string;
      email?: string;
      phone?: string;
      address?: any;
      verificationStatus?: string;
    };
    intermediary?: {
      id: string;
      name: string;
      role: string;
      fees?: number;
    };
  };

  @Column({ type: 'json', nullable: true })
  energyDetails: {
    energyType?: string;
    quantity?: number;
    unit?: string;
    deliveryLocation?: any;
    deliveryDate?: Date;
    quality?: {
      certification?: string[];
      specifications?: Record<string, any>;
    };
    carbonFootprint?: number;
    renewablePercentage?: number;
  };

  @Column({ type: 'json', nullable: true })
  contractDetails: {
    contractId?: string;
    contractType?: string;
    terms?: string[];
    conditions?: Record<string, any>;
    expirationDate?: Date;
    autoRenewal?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  compliance: {
    level: ComplianceLevel;
    regulations: Array<{
      name: string;
      jurisdiction: string;
      requirements: string[];
      satisfied: boolean;
      evidence?: string;
    }>;
    amlCheck: {
      status: 'pending' | 'passed' | 'failed' | 'manual_review';
      score?: number;
      flags?: string[];
      reviewedBy?: string;
      reviewedAt?: Date;
    };
    kycCheck: {
      status: 'pending' | 'passed' | 'failed' | 'manual_review';
      verified?: boolean;
      documents?: Array<{
        type: string;
        status: string;
        uploadedAt: Date;
        verifiedAt?: Date;
      }>;
      reviewedBy?: string;
      reviewedAt?: Date;
    };
    sanctions: {
      screened: boolean;
      result: 'clear' | 'flagged' | 'blocked';
      matches?: Array<{
        list: string;
        confidence: number;
        details: string;
      }>;
      reviewedBy?: string;
      reviewedAt?: Date;
    };
  };

  @Column({ type: 'json', nullable: true })
  risk: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{
      type: string;
      weight: number;
      score: number;
      description: string;
    }>;
    mitigation: Array<{
      measure: string;
      implemented: boolean;
      effectiveness?: number;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  timeline: {
    initiated: Date;
    pending?: Date;
    processing?: Date;
    completed?: Date;
    failed?: Date;
    cancelled?: Date;
    reversed?: Date;
    milestones: Array<{
      name: string;
      status: string;
      timestamp: Date;
      details?: any;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  state: {
    current: string;
    previous?: string;
    transitions: Array<{
      from: string;
      to: string;
      timestamp: Date;
      reason?: string;
      userId?: string;
    }>;
    data: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    source?: string;
    channel?: string;
    campaign?: string;
    tags?: string[];
    attributes?: Record<string, any>;
    customFields?: Record<string, any>;
  };

  @Column({ type: 'json', nullable: true })
  audit: {
    created: {
      by: string;
      at: Date;
      ip?: string;
      userAgent?: string;
    };
    modified?: {
      by: string;
      at: Date;
      ip?: string;
      userAgent?: string;
    };
    approvals?: Array<{
      by: string;
      at: Date;
      status: 'pending' | 'approved' | 'rejected';
      comments?: string;
    }>;
    reviews?: Array<{
      by: string;
      at: Date;
      type: string;
      result: string;
      comments?: string;
    }>;
    notifications?: Array<{
      type: string;
      recipient: string;
      sentAt: Date;
      status: string;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  security: {
    encryption: {
      algorithm?: string;
      keyId?: string;
      encryptedAt?: Date;
    };
    access: {
      read: Array<{
        userId: string;
        accessedAt: Date;
        ip?: string;
        purpose?: string;
      }>;
      write: Array<{
        userId: string;
        accessedAt: Date;
        ip?: string;
        purpose?: string;
      }>;
    };
    integrity: {
      checksum: string;
      algorithm: string;
      verified: boolean;
      verifiedAt?: Date;
    };
    tamperDetection: {
      detected: boolean;
      detectedAt?: Date;
      details?: string;
      actionTaken?: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  privacy: {
    dataSubjectId?: string;
    consent: {
      given: boolean;
      at: Date;
      purpose: string;
      legalBasis: string;
      expiresAt?: Date;
    };
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    retention: {
      policy: string;
      expiresAt?: Date;
      autoDelete: boolean;
    };
    redaction: {
      fields: string[];
      applied: boolean;
      method: string;
    };
  };

  @Column({ type: 'json', nullable: true })
  reconciliation: {
    sourceSystem?: string;
    sourceTransactionId?: string;
    matched: boolean;
    discrepancies?: Array<{
      field: string;
      expected: any;
      actual: any;
      variance: number;
    }>;
    lastReconciled?: Date;
  };

  @Column({ type: 'json', nullable: true })
  reporting: {
    included: boolean;
    reports: Array<{
      type: string;
      period: string;
      generatedAt: Date;
      fileId?: string;
    }>;
    metrics: {
      processingTime?: number;
      cost?: number;
      revenue?: number;
      riskScore?: number;
    };
  };

  @Column({ name: 'error_code', nullable: true })
  errorCode?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  errorDetails: {
    type: string;
    category: string;
      severity: string;
      recoverable: boolean;
      retryCount?: number;
      maxRetries?: number;
      nextRetryAt?: Date;
    };

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'max_retries', default: 3 })
  maxRetries: number;

  @Column({ name: 'next_retry_at', type: 'datetime', nullable: true })
  nextRetryAt?: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  @Column({ name: 'approved_at', type: 'datetime', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'rejected_by', nullable: true })
  rejectedBy?: string;

  @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
  rejectedAt?: Date;

  @Column({ name: 'completed_by', nullable: true })
  completedBy?: string;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'retention_until', type: 'datetime', nullable: true })
  retentionUntil?: Date;

  @Column({ name: 'archived_at', type: 'datetime', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'is_reversible', default: false })
  isReversible: boolean;

  @Column({ name: 'is_reversible_until', type: 'datetime', nullable: true })
  isReversibleUntil?: Date;

  @Column({ name: 'reversed_by', nullable: true })
  reversedBy?: string;

  @Column({ name: 'reversed_at', type: 'datetime', nullable: true })
  reversedAt?: Date;

  @Column({ name: 'reversal_reason', type: 'text', nullable: true })
  reversalReason?: string;

  @Column({ name: 'external_reference', nullable: true })
  externalReference?: string;

  @Column({ name: 'internal_reference', nullable: true })
  internalReference?: string;

  @Column({ name: 'blockchain_tx_hash', length: 64, nullable: true })
  blockchainTxHash?: string;

  @Column({ name: 'blockchain_block_number', nullable: true })
  blockchainBlockNumber?: number;

  @Column({ name: 'blockchain_confirmations', default: 0 })
  blockchainConfirmations?: number;

  @Column({ type: 'json', nullable: true })
  blockchain: {
    contractAddress?: string;
    functionCalled?: string;
    gasUsed?: number;
    gasPrice?: number;
    eventLogs?: Array<{
      event: string;
      address: string;
      topics: string[];
      data: string;
      blockNumber: number;
      transactionHash: string;
      logIndex: number;
    }>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => AuditLog, { nullable: true })
  @JoinColumn({ name: 'audit_log_id' })
  auditLog?: AuditLog;

  @Index(['transactionId'])
  @Index(['status', 'createdAt'])
  @Index(['type', 'createdAt'])
  @Index(['category', 'createdAt'])
  @Index(['sourceAccountId'])
  @Index(['destinationAccountId'])
  @Index(['amount', 'currency'])
  @Index(['createdAt'])
  @Index(['correlationId'])
  @Index(['batchId'])
  @Index(['parentTransactionId'])
  @Index(['rootTransactionId'])
  @Index(['retentionUntil'])
  @Index(['expiresAt'])
  @Index(['blockchainTxHash'])
}

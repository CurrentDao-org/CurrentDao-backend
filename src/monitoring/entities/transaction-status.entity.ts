import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  TIMEOUT = 'timeout'
}

export enum TransactionPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

@Entity('transaction_status')
@Index(['transactionHash'])
@Index(['status'])
@Index(['createdAt'])
@Index(['priority'])
export class TransactionStatusEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING
  })
  status: TransactionStatus;

  @Column({
    type: 'enum',
    enum: TransactionPriority,
    default: TransactionPriority.MEDIUM
  })
  priority: TransactionPriority;

  @Column({ nullable: true })
  sourceAccount: string;

  @Column({ nullable: true })
  destinationAccount: string;

  @Column({ type: 'decimal', precision: 20, scale: 7, nullable: true })
  amount: number;

  @Column({ nullable: true })
  assetCode: string;

  @Column({ nullable: true })
  assetIssuer: string;

  @Column({ nullable: true })
  memo: string;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ default: 3 })
  maxRetries: number;

  @Column({ type: 'bigint', nullable: true })
  ledgerSequence: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastRetryAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  timeoutAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ default: false })
  isArchived: boolean;

  @Column({ type: 'json', nullable: true })
  alerts: Array<{
    type: string;
    message: string;
    severity: string;
    sentAt: Date;
  }>;
}

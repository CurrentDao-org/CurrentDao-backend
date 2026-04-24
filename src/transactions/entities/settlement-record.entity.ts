import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { SettlementStatus } from '../enums/transaction.enum';

@Entity('settlement_records')
@Index(['settlementId'], { unique: true })
@Index(['transactionId'])
@Index(['status'])
@Index(['createdAt'])
export class SettlementRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  settlementId: string;

  @Column()
  @Index()
  transactionId: string;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.PENDING })
  status: SettlementStatus;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ length: 100 })
  settlementMethod: string;

  @Column({ length: 56, nullable: true })
  sourceAccount: string;

  @Column({ length: 56, nullable: true })
  targetAccount: string;

  @Column({ length: 64, nullable: true })
  blockchainTransactionHash: string;

  @Column({ length: 64, nullable: true })
  externalReference: string;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  fee: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  exchangeRate: number;

  @Column({ type: 'jsonb', nullable: true })
  paymentDetails: {
    provider: string;
    providerTransactionId: string;
    providerStatus: string;
    providerResponse: any;
    webhookData?: any;
  };

  @Column({ type: 'jsonb', nullable: true })
  complianceData: {
    regulatoryChecks: string[];
    complianceFlags: string[];
    amlResult: string;
    kycStatus: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    processingTime?: number;
    retryCount?: number;
    lastRetryAt?: Date;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

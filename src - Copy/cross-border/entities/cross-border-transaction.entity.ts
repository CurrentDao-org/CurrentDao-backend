import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export enum TransactionType {
  IMPORT = 'import',
  EXPORT = 'export',
  TRANSIT = 'transit',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PENDING_REVIEW = 'pending_review',
  REQUIREMENTS_MET = 'requirements_met',
}

@Entity('cross_border_transactions')
@Index(['transactionId', 'status'])
@Index(['sourceCountry', 'targetCountry'])
@Index(['currency', 'status'])
export class CrossBorderTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionId: string;

  @Column()
  transactionType: TransactionType;

  @Column()
  sourceCountry: string;

  @Column()
  targetCountry: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  convertedAmount?: number;

  @Column({ length: 3, nullable: true })
  targetCurrency?: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  customsTariff?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  regulatoryFees?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalAmount?: number;

  @Column({ default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ default: ComplianceStatus.PENDING_REVIEW })
  complianceStatus: ComplianceStatus;

  @Column('json', { nullable: true })
  regulatoryData: Record<string, any>;

  @Column('json', { nullable: true })
  customsData: Record<string, any>;

  @Column('json', { nullable: true })
  complianceChecks: Record<string, any>;

  @Column({ nullable: true })
  regulatoryReportId?: string;

  @Column({ nullable: true })
  customsDeclarationId?: string;

  @Column({ nullable: true })
  disputeId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  processedAt?: Date;

  @Column({ nullable: true })
  completedAt?: Date;
}

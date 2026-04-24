import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, OneToMany } from 'typeorm';
import { TransactionStatus, TransactionType } from '../enums/transaction.enum';
import { TransactionAuditLog } from './transaction-audit-log.entity';

@Entity('transactions')
@Index(['transactionId'], { unique: true })
@Index(['status'])
@Index(['createdAt'])
@Index(['amount'])
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  transactionId: string;

  @Column({ type: 'enum', enum: TransactionType })
  transactionType: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ length: 3 })
  currency: string;

  @Column({ length: 56 })
  sourcePublicKey: string;

  @Column({ length: 56 })
  targetPublicKey: string;

  @Column({ length: 2 })
  sourceCountry: string;

  @Column({ length: 2 })
  targetCountry: string;

  @Column({ type: 'jsonb', nullable: true })
  energyData: {
    energyType: string;
    quantity: number;
    unit: string;
    sourceLocation: string;
    targetLocation: string;
  };

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  fee: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  exchangeRate: number;

  @Column({ length: 64, nullable: true })
  stellarTransactionHash: string;

  @Column({ type: 'jsonb', nullable: true })
  complianceData: {
    isCompliant: boolean;
    complianceScore: number;
    regulatoryChecks: string[];
    flags: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  settlementData: {
    settlementId: string;
    settlementStatus: string;
    settledAt: Date;
    settlementMethod: string;
  };

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => TransactionAuditLog, audit => audit.transaction)
  auditLogs: TransactionAuditLog[];
}

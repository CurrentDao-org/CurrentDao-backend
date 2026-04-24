import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne } from 'typeorm';
import { Transaction } from './transaction.entity';

export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  VALIDATED = 'validated',
  SETTLED = 'settled',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RECONCILED = 'reconciled',
  FLAGGED = 'flagged',
}

@Entity('transaction_audit_logs')
@Index(['transactionId'])
@Index(['action'])
@Index(['createdAt'])
export class TransactionAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  transactionId: string;

  @ManyToOne(() => Transaction, transaction => transaction.auditLogs)
  transaction: Transaction;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'jsonb', nullable: true })
  previousState: any;

  @Column({ type: 'jsonb', nullable: true })
  newState: any;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ length: 255, nullable: true })
  userId: string;

  @Column({ length: 50, nullable: true })
  ipAddress: string;

  @Column({ length: 100, nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    processingTime?: number;
    validationResults?: any;
    settlementDetails?: any;
    reconciliationResults?: any;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;
}

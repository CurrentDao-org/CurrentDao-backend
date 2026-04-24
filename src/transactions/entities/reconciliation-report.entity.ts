import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { ReconciliationStatus } from '../enums/transaction.enum';

@Entity('reconciliation_reports')
@Index(['reportId'], { unique: true })
@Index(['status'])
@Index(['reconciliationDate'])
export class ReconciliationReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  reportId: string;

  @Column({ type: 'enum', enum: ReconciliationStatus, default: ReconciliationStatus.PENDING })
  status: ReconciliationStatus;

  @Column({ type: 'date' })
  @Index()
  reconciliationDate: Date;

  @Column({ type: 'jsonb' })
  summary: {
    totalTransactions: number;
    matchedTransactions: number;
    unmatchedTransactions: number;
    discrepancyCount: number;
    totalAmount: number;
    matchedAmount: number;
    discrepancyAmount: number;
    matchRate: number;
    processingTime: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  discrepancies: Array<{
    transactionId: string;
    type: string;
    expectedAmount: number;
    actualAmount: number;
    expectedStatus: string;
    actualStatus: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
    resolutionAction?: string;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  matchedTransactions: Array<{
    transactionId: string;
    sourceSystem: string;
    targetSystem: string;
    amount: number;
    status: string;
    matchedAt: Date;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  analytics: {
    discrepancyPatterns: Array<{
      pattern: string;
      frequency: number;
      impact: number;
      suggestedAction: string;
    }>;
    systemHealth: {
      systemName: string;
      availability: number;
      responseTime: number;
      errorRate: number;
    }[];
    recommendations: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  autoResolutions: Array<{
    transactionId: string;
    action: string;
    reason: string;
    executedAt: Date;
    success: boolean;
  }>;

  @Column({ type: 'jsonb', nullable: true })
  manualActions: Array<{
    transactionId: string;
    action: string;
    assignedTo: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    dueDate: Date;
    status: string;
  }>;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracyRate: number;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ length: 255, nullable: true })
  generatedBy: string;

  @CreateDateColumn()
  createdAt: Date;
}

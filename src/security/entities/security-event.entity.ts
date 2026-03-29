import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum SecurityEventType {
  ANOMALY_DETECTED = 'anomaly_detected',
  FRAUD_SUSPECTED = 'fraud_suspected',
  SUSPICIOUS_TRANSACTION = 'suspicious_transaction',
  WASH_TRADING = 'wash_trading',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  INCIDENT_CREATED = 'incident_created',
  ALERT_TRIGGERED = 'alert_triggered',
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('security_events')
export class SecurityEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: SecurityEventType })
  @Index()
  eventType: SecurityEventType;

  @Column({ type: 'enum', enum: SeverityLevel, default: SeverityLevel.MEDIUM })
  @Index()
  severity: SeverityLevel;

  @Column('text')
  description: string;

  @Column('jsonb')
  metadata: any;

  @Column({ nullable: true })
  @Index()
  walletAddress?: string;

  @Column({ nullable: true })
  @Index()
  transactionHash?: string;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ nullable: true })
  resolvedAt?: Date;

  @Column({ nullable: true })
  resolvedBy?: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: 0 })
  falsePositiveCount: number;

  @Column({ default: 0 })
  truePositiveCount: number;

  getConfidenceScore(): number {
    const total = this.falsePositiveCount + this.truePositiveCount;
    if (total === 0) return 0.5; // Default confidence
    return this.truePositiveCount / total;
  }
}

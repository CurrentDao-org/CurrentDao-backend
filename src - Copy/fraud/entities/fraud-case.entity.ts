import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FraudType {
  WASH_TRADING = 'wash_trading',
  SPOOFING = 'spoofing',
  LAYERING = 'layering',
  MARKET_MANIPULATION = 'market_manipulation',
  FRONT_RUNNING = 'front_running',
  PUMP_AND_DUMP = 'pump_and_dump',
  CROSS_MARKET_MANIPULATION = 'cross_market_manipulation',
  INSIDER_TRADING = 'insider_trading',
  MOMENTUM_IGNITION = 'momentum_ignition',
  PAINTING_THE_TAPE = 'painting_the_tape',
  RAMPING = 'ramping',
  BANGING_THE_CLOSE = 'banging_the_close',
  CIRCULAR_TRADING = 'circular_trading',
  ORDER_BOOK_SPOOFING = 'order_book_spoofing',
  VELOCITY_ABUSE = 'velocity_abuse',
  UNKNOWN = 'unknown',
}

export enum FraudSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum FraudCaseStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive',
  ESCALATED = 'escalated',
  REGULATORY_REPORTED = 'regulatory_reported',
}

@Entity('fraud_cases')
@Index(['traderId', 'createdAt'])
@Index(['status', 'severity'])
export class FraudCaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'case_id', unique: true })
  caseId: string;

  @Column({ name: 'trade_id', nullable: true })
  tradeId: string;

  @Column({ name: 'trader_id' })
  @Index()
  traderId: string;

  @Column({ name: 'counterparty_id', nullable: true })
  counterpartyId: string;

  @Column({
    name: 'fraud_type',
    type: 'enum',
    enum: FraudType,
    default: FraudType.UNKNOWN,
  })
  fraudType: FraudType;

  @Column({
    name: 'severity',
    type: 'enum',
    enum: FraudSeverity,
    default: FraudSeverity.LOW,
  })
  severity: FraudSeverity;

  @Column({
    name: 'status',
    type: 'enum',
    enum: FraudCaseStatus,
    default: FraudCaseStatus.OPEN,
  })
  status: FraudCaseStatus;

  @Column({
    name: 'ml_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0,
  })
  mlScore: number;

  @Column({ name: 'pattern_matched', nullable: true })
  patternMatched: string;

  @Column({ name: 'patterns_triggered', type: 'json', default: '[]' })
  patternsTriggered: string[];

  @Column({ name: 'evidence', type: 'json', default: '[]' })
  evidence: object[];

  @Column({ name: 'trade_data', type: 'json', nullable: true })
  tradeData: object;

  @Column({ name: 'ml_features', type: 'json', nullable: true })
  mlFeatures: object;

  @Column({
    name: 'regulatory_reported',
    type: 'boolean',
    default: false,
  })
  regulatoryReported: boolean;

  @Column({
    name: 'prevention_applied',
    type: 'boolean',
    default: false,
  })
  preventionApplied: boolean;

  @Column({ name: 'prevention_action', nullable: true })
  preventionAction: string | null;

  @Column({ name: 'assigned_to', nullable: true })
  assignedTo: string;

  @Column({ name: 'investigation_notes', type: 'text', nullable: true })
  investigationNotes: string;

  @Column({
    name: 'false_positive_reason',
    nullable: true,
  })
  falsePositiveReason: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'sar_reference', nullable: true })
  sarReference: string;

  @Column({ name: 'market', nullable: true })
  market: string;

  @Column({ name: 'asset_type', nullable: true })
  assetType: string;

  @Column({
    name: 'trade_value',
    type: 'decimal',
    precision: 20,
    scale: 4,
    nullable: true,
  })
  tradeValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

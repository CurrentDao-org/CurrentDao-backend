import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum RecommendationType {
  BUY = 'buy',
  SELL = 'sell',
  HOLD = 'hold',
  DIVERSIFY = 'diversify',
}

export enum ConfidenceLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

@Entity('recommendations')
export class Recommendation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: RecommendationType })
  type: RecommendationType;

  @Column('text')
  description: string;

  @Column('text')
  reasoning: string;

  @Column({ type: 'float', default: 0 })
  confidenceScore: number;

  @Column({
    type: 'enum',
    enum: ConfidenceLevel,
    default: ConfidenceLevel.MEDIUM,
  })
  confidenceLevel: ConfidenceLevel;

  @Column('jsonb')
  metadata: any;

  @Column({ nullable: true })
  @Index()
  assetSymbol?: string;

  @Column({ nullable: true })
  targetPrice?: number;

  @Column({ nullable: true })
  stopLoss?: number;

  @Column({ default: false })
  isAccepted: boolean;

  @Column({ nullable: true })
  acceptedAt?: Date;

  @Column({ nullable: true })
  outcome?: 'profitable' | 'loss' | 'neutral';

  @Column({ nullable: true })
  actualReturn?: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ default: true })
  isActive: boolean;

  getAccuracyMetrics(): { accuracy: number; avgReturn: number } {
    // Calculate recommendation accuracy based on historical outcomes
    return {
      accuracy: this.confidenceScore,
      avgReturn: this.actualReturn || 0,
    };
  }
}

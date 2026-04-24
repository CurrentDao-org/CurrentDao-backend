import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('currency_risks')
@Index(['userId'])
@Index(['currencyCode'])
@Index(['riskType'])
export class CurrencyRisk {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 3 })
  currencyCode: string;

  @Column({ length: 50 })
  riskType: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  exposureAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  riskScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  volatility: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valueAtRisk: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  expectedShortfall: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hedgeRatio: number;

  @Column({ length: 50, default: 'active' })
  status: string;

  @Column({ type: 'json', nullable: true })
  hedgeStrategy: {
    type?: string;
    instruments?: string[];
    maturity?: Date;
    strikePrice?: number;
    notional?: number;
  };

  @Column({ type: 'json', nullable: true })
  metrics: {
    correlation?: number;
    beta?: number;
    duration?: number;
    convexity?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastAssessment: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextReview: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

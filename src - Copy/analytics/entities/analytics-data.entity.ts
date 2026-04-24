import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AnalyticsType {
  TRADING_VOLUME = 'trading_volume',
  PRICE_TREND = 'price_trend',
  USER_PERFORMANCE = 'user_performance',
  MARKET_EFFICIENCY = 'market_efficiency',
  GEOGRAPHIC_PATTERN = 'geographic_pattern',
  RENEWABLE_ENERGY = 'renewable_energy',
}

export enum AggregationPeriod {
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

@Entity('analytics_data')
@Index(['type', 'period', 'timestamp'])
@Index(['userId'])
@Index(['gridZoneId'])
export class AnalyticsData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AnalyticsType,
  })
  type: AnalyticsType;

  @Column({
    type: 'enum',
    enum: AggregationPeriod,
  })
  period: AggregationPeriod;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ nullable: true })
  userId?: string;

  @Column({ nullable: true })
  gridZoneId?: string;

  @Column({ nullable: true })
  country?: string;

  @Column({ type: 'json' })
  data: Record<string, any>;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalValue?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  averageValue?: number;

  @Column({ type: 'integer', nullable: true })
  count?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentage?: number;

  @Column({ type: 'json', nullable: true })
  metadata?: {
    source: string;
    version: string;
    confidence: number;
    lastUpdated: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

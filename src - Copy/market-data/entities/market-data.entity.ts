import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('market_data')
@Index(['symbol', 'timestamp'])
@Index(['source', 'timestamp'])
@Index(['qualityScore'])
export class MarketDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  @Index()
  symbol: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  price: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  volume: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  high: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  low: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  open: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  close: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  bid: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  ask: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  spread: number;

  @Column({ type: 'varchar', length: 50 })
  @Index()
  source: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  qualityScore: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 20, nullable: true })
  market: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'timestamp', nullable: true })
  sourceTimestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp' })
  @Index()
  timestamp: Date;
}

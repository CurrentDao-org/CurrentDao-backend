import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('balancing_data')
@Index(['timestamp', 'regionId'])
@Index(['forecastType', 'timestamp'])
export class BalancingData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  regionId: string;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 20 })
  forecastType: 'demand' | 'supply' | 'price' | 'stability';

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  actualValue: number;

  @Column({ type: 'decimal', precision: 15, scale: 6, nullable: true })
  predictedValue: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    source: string;
    algorithm: string;
    parameters?: Record<string, any>;
    externalFactors?: Record<string, any>;
  };

  @Column({ type: 'decimal', precision: 8, scale: 3, nullable: true })
  gridFrequency: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  voltageLevel: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  loadFactor: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'adjusted' | 'emergency' | 'shed';

  @Column({ type: 'json', nullable: true })
  adjustments: {
    type: 'supply' | 'demand' | 'price';
    amount: number;
    timestamp: Date;
    reason: string;
  }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

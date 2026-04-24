import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('bi_kpi_values')
@Index(['kpiId'])
@Index(['timestamp'])
@Index(['kpiId', 'timestamp'])
export class KPIValue {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  kpiId: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  value: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'json', nullable: true })
  dimensions: {
    [key: string]: any;
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    source: string;
    calculationTime: number;
    recordCount?: number;
    confidence?: number;
  };

  @CreateDateColumn()
  createdAt: Date;
}

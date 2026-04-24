import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DataSourceType {
  API = 'api',
  WEBSOCKET = 'websocket',
  FILE = 'file',
  DATABASE = 'database',
}

export enum DataSourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

@Entity('market_data_sources')
@Index(['name', 'type'])
export class MarketDataSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'enum', enum: DataSourceType })
  type: DataSourceType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  endpoint: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  apiKey: string;

  @Column({ type: 'int' })
  priority: number;

  @Column({ type: 'enum', enum: DataSourceStatus, default: DataSourceStatus.ACTIVE })
  status: DataSourceStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.8 })
  reliability: number;

  @Column({ type: 'json' })
  dataTypes: string[];

  @Column({ type: 'timestamp', nullable: true })
  lastUpdate: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  requestCount: number;

  @Column({ type: 'int', default: 0 })
  errorCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageResponseTime: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

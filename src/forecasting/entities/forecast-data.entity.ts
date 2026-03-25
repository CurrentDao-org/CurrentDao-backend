import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ForecastHorizon {
  ONE_HOUR = '1h',
  SIX_HOURS = '6h',
  TWENTY_FOUR_HOURS = '24h',
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  THREE_MONTHS = '3m',
  SIX_MONTHS = '6m',
  ONE_YEAR = '1y',
}

export enum ForecastStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('forecast_data')
@Index(['marketType', 'forecastHorizon', 'createdAt'])
export class ForecastData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  marketType: string;

  @Column({ type: 'enum', enum: ForecastHorizon })
  forecastHorizon: ForecastHorizon;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  predictedValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  confidenceIntervalLower: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  confidenceIntervalUpper: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  accuracy: number;

  @Column({ type: 'json', nullable: true })
  modelWeights: Record<string, number>;

  @Column({ type: 'json', nullable: true })
  inputData: Record<string, any>;

  @Column({
    type: 'enum',
    enum: ForecastStatus,
    default: ForecastStatus.PENDING,
  })
  status: ForecastStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  targetDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

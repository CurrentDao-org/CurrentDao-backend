import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ForecastModel {
  LINEAR = 'linear',
  POLYNOMIAL = 'polynomial',
  EXPONENTIAL = 'exponential',
  NEURAL = 'neural',
  ENSEMBLE = 'ensemble',
}

export enum ForecastStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('price_forecasts')
@Index(['energyType', 'location', 'targetTimestamp'])
export class PriceForecast {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  energyType: string;

  @Column({ type: 'varchar', length: 100 })
  location: string;

  @Column({ type: 'enum', enum: ForecastModel })
  model: ForecastModel;

  @Column({ type: 'timestamp' })
  targetTimestamp: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  predictedPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  confidenceIntervalLower: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  confidenceIntervalUpper: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidence: number;

  @Column({ type: 'int' })
  hoursAhead: number;

  @Column({ type: 'json', nullable: true })
  modelWeights: Record<string, number>;

  @Column({ type: 'json', nullable: true })
  inputData: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  factors: {
    supplyDemandRatio: number;
    seasonalFactor: number;
    timeOfDayFactor: number;
    weatherFactor: number;
    marketSentiment: number;
    externalEvents: number;
  };

  @Column({
    type: 'enum',
    enum: ForecastStatus,
    default: ForecastStatus.PENDING,
  })
  status: ForecastStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actualPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  accuracy: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  error: number;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

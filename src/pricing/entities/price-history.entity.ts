import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('price_history')
@Index(['timestamp', 'location'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  basePrice: number;

  @Column()
  finalPrice: number;

  @Column()
  location: string;

  @Column()
  energyType: string;

  @Column()
  supply: number;

  @Column()
  demand: number;

  @Column()
  supplyDemandRatio: number;

  @Column({ nullable: true })
  locationMultiplier: number;

  @Column({ nullable: true })
  timeMultiplier: number;

  @Column({ nullable: true })
  renewablePremium: number;

  @Column({ nullable: true })
  predictedPrice: number;

  @Column({ default: false })
  isPeakHour: boolean;

  @Column({ default: false })
  isRenewable: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  predictionAccuracy: number;

  @Column()
  @Index()
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;
}

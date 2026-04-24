import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('grid_zones')
@Index(['zoneCode'])
@Index(['country'])
export class GridZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  zoneCode: string;

  @Column({ length: 255 })
  zoneName: string;

  @Column({ length: 100 })
  country: string;

  @Column({ type: 'json' })
  boundaries: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  basePriceMultiplier: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.0 })
  renewableEnergyPercentage: number;

  @Column({ type: 'decimal', precision: 8, scale: 3 })
  averageDemand: number;

  @Column({ type: 'decimal', precision: 8, scale: 3 })
  peakDemand: number;

  @Column({ type: 'json', nullable: true })
  gridOperator: {
    name: string;
    contact: string;
    website: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  regulations: {
    maxTradeVolume: number;
    tradingHours: string;
    complianceRequirements: string[];
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

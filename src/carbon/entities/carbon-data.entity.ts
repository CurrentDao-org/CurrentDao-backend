import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum EmissionSource {
  ENERGY_PRODUCTION = 'energy_production',
  ENERGY_CONSUMPTION = 'energy_consumption',
  TRANSPORTATION = 'transportation',
  MANUFACTURING = 'manufacturing',
  GRID_MIX = 'grid_mix',
}

export enum UnitType {
  KG_CO2E = 'kg_co2e',
  TONNES_CO2E = 'tonnes_co2e',
  MWH = 'mwh',
  KWH = 'kwh',
}

@Entity('carbon_data')
export class CarbonData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: EmissionSource })
  source: EmissionSource;

  @Column('float')
  emissions: number; // in kg CO2e

  @Column({ type: 'enum', enum: UnitType, default: UnitType.KG_CO2E })
  unit: UnitType;

  @Column({ nullable: true })
  activityData?: number; // e.g., kWh consumed

  @Column({ nullable: true })
  emissionFactor?: number; // kg CO2e per unit

  @Column({ nullable: true })
  location?: string;

  @Column({ nullable: true })
  @Index()
  assetId?: string;

  @Column({ nullable: true })
  transactionId?: string;

  @Column('jsonb')
  metadata: any;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedBy?: string;

  @CreateDateColumn()
  @Index()
  timestamp: Date;

  @CreateDateColumn()
  createdAt: Date;

  toTonnes(): number {
    return this.emissions / 1000;
  }

  getEmissionIntensity(): number {
    if (!this.activityData) return 0;
    return this.emissions / this.activityData;
  }
}

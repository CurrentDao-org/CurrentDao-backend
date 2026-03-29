/**
 * Energy Category Entity
 *
 * Defines the taxonomy for different energy types with hierarchical classification.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EnergyQuality } from './energy-quality.entity';
import { Certification } from './certification.entity';

/**
 * Energy type enumeration
 */
export enum EnergyType {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  GEOTHERMAL = 'geothermal',
  BIOMASS = 'biomass',
  NATURAL_GAS = 'natural_gas',
  COAL = 'coal',
  NUCLEAR = 'nuclear',
  OIL = 'oil',
}

/**
 * Energy sub-type enumeration
 */
export enum EnergySubType {
  // Solar subtypes
  PHOTOVOLTAIC = 'photovoltaic',
  CONCENTRATED_SOLAR = 'concentrated_solar',
  SOLAR_THERMAL = 'solar_thermal',

  // Wind subtypes
  ONSHORE_WIND = 'onshore_wind',
  OFFSHORE_WIND = 'offshore_wind',

  // Hydro subtypes
  RUN_OF_RIVER = 'run_of_river',
  RESERVOIR = 'reservoir',
  PUMPED_STORAGE = 'pumped_storage',

  // Biomass subtypes
  SOLID_BIOMASS = 'solid_biomass',
  LIQUID_BIOMASS = 'liquid_biomass',
  BIOGAS = 'biogas',
}

/**
 * Energy category entity
 */
@Entity('energy_categories')
export class EnergyCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: EnergyType,
    unique: true,
  })
  energyType: EnergyType;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EnergySubType,
    nullable: true,
  })
  subType: EnergySubType;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @ManyToOne(() => EnergyCategory, (category) => category.children, {
    nullable: true,
  })
  @JoinColumn({ name: 'parent_id' })
  parent: EnergyCategory;

  @OneToMany(() => EnergyCategory, (category) => category.parent)
  children: EnergyCategory[];

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  priceMultiplier: number;

  @Column({ name: 'is_renewable', default: false })
  isRenewable: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relationships
  @OneToMany(() => EnergyQuality, (quality) => quality.category)
  qualities: EnergyQuality[];

  @OneToMany(() => Certification, (certification) => certification.category)
  certifications: Certification[];
}

/**
 * Default energy categories to seed
 */
export const DEFAULT_ENERGY_CATEGORIES = [
  {
    energyType: EnergyType.SOLAR,
    name: 'Solar Energy',
    description:
      'Energy derived from sunlight through photovoltaic or thermal means',
    subType: null,
    priceMultiplier: 1.25,
    isRenewable: true,
    sortOrder: 1,
    tags: ['renewable', 'solar', 'clean'],
  },
  {
    energyType: EnergyType.WIND,
    name: 'Wind Energy',
    description: 'Energy derived from wind using turbines',
    subType: null,
    priceMultiplier: 1.15,
    isRenewable: true,
    sortOrder: 2,
    tags: ['renewable', 'wind', 'clean'],
  },
  {
    energyType: EnergyType.HYDRO,
    name: 'Hydro Energy',
    description: 'Energy derived from water flow through hydroelectric plants',
    subType: null,
    priceMultiplier: 1.1,
    isRenewable: true,
    sortOrder: 3,
    tags: ['renewable', 'hydro', 'clean'],
  },
  {
    energyType: EnergyType.GEOTHERMAL,
    name: 'Geothermal Energy',
    description: "Energy derived from heat stored beneath the Earth's surface",
    subType: null,
    priceMultiplier: 1.2,
    isRenewable: true,
    sortOrder: 4,
    tags: ['renewable', 'geothermal', 'clean'],
  },
  {
    energyType: EnergyType.BIOMASS,
    name: 'Biomass Energy',
    description: 'Energy derived from organic materials',
    subType: null,
    priceMultiplier: 1.0,
    isRenewable: true,
    sortOrder: 5,
    tags: ['renewable', 'biomass', 'organic'],
  },
  {
    energyType: EnergyType.NATURAL_GAS,
    name: 'Natural Gas',
    description: 'Fossil fuel derived from underground deposits',
    subType: null,
    priceMultiplier: 0.95,
    isRenewable: false,
    sortOrder: 6,
    tags: ['fossil', 'gas', 'non-renewable'],
  },
  {
    energyType: EnergyType.COAL,
    name: 'Coal',
    description: 'Fossil fuel derived from ancient plant material',
    subType: null,
    priceMultiplier: 0.85,
    isRenewable: false,
    sortOrder: 7,
    tags: ['fossil', 'coal', 'non-renewable'],
  },
  {
    energyType: EnergyType.NUCLEAR,
    name: 'Nuclear Energy',
    description: 'Energy derived from nuclear fission',
    subType: null,
    priceMultiplier: 0.9,
    isRenewable: false,
    sortOrder: 8,
    tags: ['nuclear', 'atomic', 'low-carbon'],
  },
];

/**
 * Helper function to check if energy type is renewable
 */
export const isRenewableEnergy = (energyType: EnergyType): boolean => {
  return [
    EnergyType.SOLAR,
    EnergyType.WIND,
    EnergyType.HYDRO,
    EnergyType.GEOTHERMAL,
    EnergyType.BIOMASS,
  ].includes(energyType);
};

/**
 * Helper function to get price multiplier
 */
export const getPriceMultiplier = (energyType: EnergyType): number => {
  const multiplierMap: Record<EnergyType, number> = {
    [EnergyType.SOLAR]: 1.25,
    [EnergyType.WIND]: 1.15,
    [EnergyType.HYDRO]: 1.1,
    [EnergyType.GEOTHERMAL]: 1.2,
    [EnergyType.BIOMASS]: 1.0,
    [EnergyType.NATURAL_GAS]: 0.95,
    [EnergyType.COAL]: 0.85,
    [EnergyType.NUCLEAR]: 0.9,
    [EnergyType.OIL]: 0.8,
  };

  return multiplierMap[energyType] || 1.0;
};

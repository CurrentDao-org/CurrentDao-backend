/**
 * Energy Quality Entity
 *
 * Defines quality ratings for different energy sources.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EnergyCategory } from './energy-category.entity';

/**
 * Quality rating enumeration
 */
export enum QualityRating {
  PREMIUM = 'premium',
  STANDARD = 'standard',
  BASIC = 'basic',
}

/**
 * Quality tier for display
 */
export enum QualityTier {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

/**
 * Energy quality entity
 */
@Entity('energy_qualities')
export class EnergyQuality {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: QualityRating,
    unique: true,
  })
  rating: QualityRating;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: QualityTier,
  })
  tier: QualityTier;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => EnergyCategory, (category) => category.qualities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: EnergyCategory;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
  priceMultiplier: number;

  @Column({ name: 'efficiency_min', type: 'decimal', precision: 5, scale: 2 })
  efficiencyMin: number;

  @Column({ name: 'efficiency_max', type: 'decimal', precision: 5, scale: 2 })
  efficiencyMax: number;

  @Column({
    name: 'min_purity',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  minPurity: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verification_standard', nullable: true })
  verificationStandard: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  requirements: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Default quality ratings
 */
export const DEFAULT_QUALITY_RATINGS = [
  {
    rating: QualityRating.PREMIUM,
    name: 'Premium Quality',
    description: 'Highest quality energy with maximum efficiency and purity',
    tier: QualityTier.A,
    priceMultiplier: 1.5,
    efficiencyMin: 95,
    efficiencyMax: 100,
    minPurity: 99,
    isVerified: true,
    verificationStandard: 'ISO 50001',
    sortOrder: 1,
    tags: ['premium', 'high-efficiency', 'verified'],
    requirements: {
      minEfficiency: 95,
      requiresCertification: true,
      inspectionFrequency: 'monthly',
    },
  },
  {
    rating: QualityRating.STANDARD,
    name: 'Standard Quality',
    description: 'Good quality energy with standard efficiency levels',
    tier: QualityTier.B,
    priceMultiplier: 1.0,
    efficiencyMin: 80,
    efficiencyMax: 94,
    minPurity: 95,
    isVerified: true,
    verificationStandard: 'ISO 50001',
    sortOrder: 2,
    tags: ['standard', 'medium-efficiency', 'verified'],
    requirements: {
      minEfficiency: 80,
      requiresCertification: true,
      inspectionFrequency: 'quarterly',
    },
  },
  {
    rating: QualityRating.BASIC,
    name: 'Basic Quality',
    description: 'Entry-level energy with minimum acceptable standards',
    tier: QualityTier.C,
    priceMultiplier: 0.75,
    efficiencyMin: 60,
    efficiencyMax: 79,
    minPurity: 90,
    isVerified: false,
    verificationStandard: null,
    sortOrder: 3,
    tags: ['basic', 'low-efficiency'],
    requirements: {
      minEfficiency: 60,
      requiresCertification: false,
      inspectionFrequency: 'annually',
    },
  },
];

/**
 * Helper function to get quality by rating
 */
export const getQualityByRating = (
  rating: QualityRating,
): (typeof DEFAULT_QUALITY_RATINGS)[0] | undefined => {
  return DEFAULT_QUALITY_RATINGS.find((q) => q.rating === rating);
};

/**
 * Helper function to calculate adjusted price
 */
export const calculateAdjustedPrice = (
  basePrice: number,
  qualityRating: QualityRating,
): number => {
  const quality = getQualityByRating(qualityRating);
  if (!quality) return basePrice;

  return basePrice * Number(quality.priceMultiplier);
};

/**
 * Helper function to check if quality meets minimum requirements
 */
export const meetsQualityRequirements = (
  efficiency: number,
  purity: number,
  rating: QualityRating,
): boolean => {
  const quality = getQualityByRating(rating);
  if (!quality) return false;

  return (
    efficiency >= quality.efficiencyMin &&
    (quality.minPurity === null || purity >= quality.minPurity)
  );
};

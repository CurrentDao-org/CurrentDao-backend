/**
 * Certification Entity
 *
 * Defines certifications for energy sources (Green Energy, Carbon Neutral, etc.).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EnergyCategory } from './energy-category.entity';

/**
 * Certification type enumeration
 */
export enum CertificationType {
  GREEN_ENERGY = 'green_energy',
  CARBON_NEUTRAL = 'carbon_neutral',
  ORGANIC = 'organic',
  FAIR_TRADE = 'fair_trade',
  RENEWABLE_ENERGY = 'renewable_energy',
  LOW_CARBON = 'low_carbon',
  SUSTAINABLE = 'sustainable',
  ECO_FRIENDLY = 'eco_friendly',
}

/**
 * Certification status
 */
export enum CertificationStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

/**
 * Certification entity
 */
@Entity('certifications')
export class Certification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: CertificationType,
    unique: true,
  })
  type: CertificationType;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @ManyToOne(() => EnergyCategory, (category) => category.certifications, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: EnergyCategory;

  @Column({ name: 'issuing_authority', length: 150 })
  issuingAuthority: string;

  @Column({ name: 'certification_code', length: 100, unique: true })
  certificationCode: string;

  @Column({
    type: 'enum',
    enum: CertificationStatus,
    default: CertificationStatus.ACTIVE,
  })
  status: CertificationStatus;

  @Column({ name: 'valid_from', type: 'timestamp' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'timestamp', nullable: true })
  validUntil: Date;

  @Column({ name: 'is_recurring', default: false })
  isRecurring: boolean;

  @Column({ name: 'renewal_period_days', nullable: true })
  renewalPeriodDays: number;

  @Column({
    name: 'price_adjustment',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 1.0,
  })
  priceAdjustment: number;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verification_method', nullable: true })
  verificationMethod: string;

  @Column({ name: 'logo_url', nullable: true })
  logoUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'jsonb', nullable: true })
  requirements: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Default certifications
 */
export const DEFAULT_CERTIFICATIONS = [
  {
    type: CertificationType.GREEN_ENERGY,
    name: 'Green Energy Certification',
    description:
      'Certifies that energy is generated from renewable sources with minimal environmental impact',
    issuingAuthority: 'Green Energy Standards Board',
    certificationCode: 'GEC-001',
    status: CertificationStatus.ACTIVE,
    priceAdjustment: 1.25,
    isVerified: true,
    verificationMethod: 'Third-party audit',
    tags: ['green', 'renewable', 'eco-friendly'],
    requirements: {
      renewablePercentage: 100,
      emissionThreshold: 0,
      auditFrequency: 'annual',
    },
  },
  {
    type: CertificationType.CARBON_NEUTRAL,
    name: 'Carbon Neutral Certification',
    description:
      'Certifies that net carbon emissions are zero through offset programs',
    issuingAuthority: 'Carbon Neutral Alliance',
    certificationCode: 'CNC-001',
    status: CertificationStatus.ACTIVE,
    priceAdjustment: 1.15,
    isVerified: true,
    verificationMethod: 'Carbon accounting',
    tags: ['carbon-neutral', 'offset', 'climate'],
    requirements: {
      carbonOffsetRequired: true,
      netEmissions: 0,
      offsetVerification: 'required',
    },
  },
  {
    type: CertificationType.RENEWABLE_ENERGY,
    name: 'Renewable Energy Certification',
    description:
      'Certifies that energy is sourced entirely from renewable sources',
    issuingAuthority: 'International Renewable Energy Agency',
    certificationCode: 'REC-001',
    status: CertificationStatus.ACTIVE,
    priceAdjustment: 1.2,
    isVerified: true,
    verificationMethod: 'Source verification',
    tags: ['renewable', 'clean', 'sustainable'],
    requirements: {
      renewablePercentage: 100,
      sourceVerification: 'required',
    },
  },
  {
    type: CertificationType.LOW_CARBON,
    name: 'Low Carbon Certification',
    description: 'Certifies energy with reduced carbon footprint',
    issuingAuthority: 'Climate Action Network',
    certificationCode: 'LCC-001',
    status: CertificationStatus.ACTIVE,
    priceAdjustment: 1.1,
    isVerified: true,
    verificationMethod: 'Carbon intensity analysis',
    tags: ['low-carbon', 'reduced-emissions'],
    requirements: {
      maxCarbonIntensity: 50,
      emissionReductionTarget: 50,
    },
  },
  {
    type: CertificationType.SUSTAINABLE,
    name: 'Sustainable Energy Certification',
    description: 'Certifies energy production meets sustainability standards',
    issuingAuthority: 'Sustainable Energy Council',
    certificationCode: 'SEC-001',
    status: CertificationStatus.ACTIVE,
    priceAdjustment: 1.15,
    isVerified: true,
    verificationMethod: 'Sustainability assessment',
    tags: ['sustainable', 'responsible', 'green'],
    requirements: {
      sustainabilityScore: 80,
      environmentalImpact: 'low',
    },
  },
];

/**
 * Helper function to check if certification is valid
 */
export const isCertificationValid = (certification: Certification): boolean => {
  if (certification.status !== CertificationStatus.ACTIVE) {
    return false;
  }

  const now = new Date();

  if (certification.validUntil) {
    return now >= certification.validFrom && now <= certification.validUntil;
  }

  return now >= certification.validFrom;
};

/**
 * Helper function to check if certification needs renewal
 */
export const needsRenewal = (certification: Certification): boolean => {
  if (!certification.isRecurring || !certification.renewalPeriodDays) {
    return false;
  }

  if (!certification.validUntil) {
    return false;
  }

  const daysUntilExpiry = Math.ceil(
    (certification.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );

  return daysUntilExpiry <= 30;
};

/**
 * Helper function to calculate price with certification
 */
export const calculatePriceWithCertification = (
  basePrice: number,
  certifications: Certification[],
): number => {
  let multiplier = 1.0;

  for (const cert of certifications) {
    if (isCertificationValid(cert)) {
      multiplier *= Number(cert.priceAdjustment);
    }
  }

  return basePrice * multiplier;
};

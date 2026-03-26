import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RuleType {
  PRICE_PRIORITY = 'price_priority',
  TIME_PRIORITY = 'time_priority',
  GEOGRAPHIC_PROXIMITY = 'geographic_proximity',
  RENEWABLE_PREFERENCE = 'renewable_preference',
  QUANTITY_MATCH = 'quantity_match',
  MINIMUM_ORDER_SIZE = 'minimum_order_size',
  MAXIMUM_DISTANCE = 'maximum_distance',
  PRICE_TOLERANCE = 'price_tolerance',
  SUPPLIER_RELIABILITY = 'supplier_reliability',
  MARKET_SEGMENT = 'market_segment',
}

export enum RulePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum RuleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Entity('matching_rules')
export class MatchingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: RuleType,
  })
  type: RuleType;

  @Column({
    type: 'enum',
    enum: RulePriority,
    default: RulePriority.MEDIUM,
  })
  priority: RulePriority;

  @Column({
    type: 'enum',
    enum: RuleStatus,
    default: RuleStatus.ACTIVE,
  })
  status: RuleStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'json', nullable: true })
  parameters: {
    minPrice?: number;
    maxPrice?: number;
    priceTolerance?: number;
    maxDistance?: number;
    minOrderSize?: number;
    maxOrderSize?: number;
    renewablePreference?: boolean;
    renewablePercentage?: number;
    timeWindow?: number;
    reliabilityThreshold?: number;
    marketSegment?: string;
    customRules?: Array<{
      condition: string;
      value: any;
      weight: number;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  conditions: {
    buyerType?: string[];
    sellerType?: string[];
    energyType?: string[];
    geographicRegion?: string[];
    timeRestrictions?: {
      startHour?: number;
      endHour?: number;
      daysOfWeek?: number[];
    };
  };

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_system_rule', default: false })
  isSystemRule: boolean;

  @Column({ name: 'applies_to_buyer', default: true })
  appliesToBuyer: boolean;

  @Column({ name: 'applies_to_seller', default: true })
  appliesToSeller: boolean;

  @Column({ name: 'effective_from', type: 'datetime', nullable: true })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'datetime', nullable: true })
  effectiveTo: Date;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

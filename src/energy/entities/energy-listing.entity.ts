import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum ListingType {
  BUY = 'buy',
  SELL = 'sell',
}

export enum EnergyType {
  SOLAR = 'solar',
  WIND = 'wind',
  HYDRO = 'hydro',
  NUCLEAR = 'nuclear',
  FOSSIL = 'fossil',
  BIOMASS = 'biomass',
  GEOTHERMAL = 'geothermal',
}

export enum ListingStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum DeliveryType {
  IMMEDIATE = 'immediate',
  SCHEDULED = 'scheduled',
  FLEXIBLE = 'flexible',
}

@Entity('energy_listings')
export class EnergyListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ListingType,
  })
  type: ListingType;

  @Column({
    type: 'enum',
    enum: EnergyType,
  })
  energyType: EnergyType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  price: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  minPrice?: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  maxPrice?: number;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.ACTIVE,
  })
  status: ListingStatus;

  @Column({
    type: 'enum',
    enum: DeliveryType,
    default: DeliveryType.FLEXIBLE,
  })
  deliveryType: DeliveryType;

  @Column({ type: 'datetime', nullable: true })
  deliveryDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveryStartDate?: Date;

  @Column({ type: 'datetime', nullable: true })
  deliveryEndDate?: Date;

  @Column({ type: 'json', nullable: true })
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
  };

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  maxDeliveryDistance?: number;

  @Column({ type: 'json', nullable: true })
  qualitySpecifications: {
    voltage?: number;
    frequency?: number;
    certification?: string[];
    qualityScore?: number;
    renewablePercentage?: number;
    carbonFootprint?: number;
  };

  @Column({ type: 'json', nullable: true })
  paymentTerms: {
    method?: string;
    dueDays?: number;
    escrowRequired?: boolean;
    partialPayment?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  contractTerms: {
    duration?: number;
    terminationNotice?: number;
    penaltyClauses?: string[];
    forceMajeure?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  requirements: {
    minimumBidQuantity?: number;
    maximumBidQuantity?: number;
    bidIncrement?: number;
    preferredBuyers?: string[];
    excludedBuyers?: string[];
    verificationRequired?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    source?: string;
    gridConnection?: string;
    storageCapacity?: number;
    peakCapacity?: number;
    efficiency?: number;
    maintenanceSchedule?: string[];
    certifications?: string[];
    tags?: string[];
  };

  @Column({ name: 'seller_id', nullable: true })
  sellerId?: string;

  @Column({ name: 'buyer_id', nullable: true })
  buyerId?: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'filled_at', type: 'datetime', nullable: true })
  filledAt?: Date;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @Column({ name: 'bid_count', default: 0 })
  bidCount: number;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'is_premium', default: false })
  isPremium: boolean;

  @Column({
    name: 'visibility_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 1.0,
  })
  visibilityScore: number;

  @Column({
    name: 'match_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: true,
  })
  matchScore?: number;

  @Column({ type: 'json', nullable: true })
  analytics: {
    views?: number;
    clicks?: number;
    saves?: number;
    shares?: number;
    conversionRate?: number;
    avgBidPrice?: number;
    priceRange?: {
      min: number;
      max: number;
      avg: number;
    };
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Bid, (bid) => bid.listing)
  bids: Bid[];

  @OneToMany(() => Trade, (trade) => trade.listing)
  trades: Trade[];
}

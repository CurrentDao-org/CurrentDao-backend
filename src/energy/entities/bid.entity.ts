import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EnergyListing, ListingType } from './energy-listing.entity';

export enum BidStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
}

export enum BidType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  EMERGENCY = 'emergency',
}

@Entity('bids')
export class Bid {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ name: 'bidder_id' })
  bidderId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  price: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  totalPrice?: number;

  @Column({
    type: 'enum',
    enum: BidStatus,
    default: BidStatus.PENDING,
  })
  status: BidStatus;

  @Column({
    type: 'enum',
    enum: BidType,
    default: BidType.STANDARD,
  })
  type: BidType;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({ type: 'json', nullable: true })
  deliveryTerms: {
    deliveryDate?: Date;
    deliveryLocation?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    deliveryMethod?: string;
    deliveryCost?: number;
    flexibility?: number;
  };

  @Column({ type: 'json', nullable: true })
  paymentTerms: {
    method?: string;
    schedule?: string[];
    advancePayment?: number;
    escrowRequired?: boolean;
    paymentDays?: number;
  };

  @Column({ type: 'json', nullable: true })
  qualityRequirements: {
    minimumQuality?: number;
    certifications?: string[];
    testingRequired?: boolean;
    inspectionRequired?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  additionalTerms: {
    warrantyPeriod?: number;
    supportLevel?: string;
    penaltyClauses?: string[];
    bonusConditions?: string[];
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    source?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    confidence?: number;
    riskAssessment?: {
      financial: number;
      operational: number;
      regulatory: number;
    };
    competitiveAdvantage?: string[];
  };

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  matchScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  competitivenessScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  reliabilityScore?: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  overallScore?: number;

  @Column({ name: 'is_counter_offer', default: false })
  isCounterOffer: boolean;

  @Column({ name: 'original_bid_id', nullable: true })
  originalBidId?: string;

  @Column({ name: 'counter_bid_id', nullable: true })
  counterBidId?: string;

  @Column({ name: 'negotiation_round', default: 1 })
  negotiationRound: number;

  @Column({ name: 'auto_accept', default: false })
  autoAccept: boolean;

  @Column({ name: 'auto_reject_threshold', type: 'decimal', precision: 3, scale: 2, nullable: true })
  autoRejectThreshold?: number;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column({ name: 'responded_at', type: 'datetime', nullable: true })
  respondedAt?: Date;

  @Column({ name: 'accepted_at', type: 'datetime', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
  rejectedAt?: Date;

  @Column({ name: 'withdrawn_at', type: 'datetime', nullable: true })
  withdrawnAt?: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ name: 'responded_by', nullable: true })
  respondedBy?: string;

  @Column({ type: 'json', nullable: true })
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    userId?: string;
    reason?: string;
    previousStatus?: BidStatus;
    newStatus?: BidStatus;
  }>;

  @Column({ type: 'json', nullable: true })
  analytics: {
    viewCount?: number;
    responseTime?: number;
    negotiationDuration?: number;
    priceHistory?: Array<{
      timestamp: Date;
      price: number;
      changeReason: string;
    }>;
    competitorBids?: Array<{
      price: number;
      quantity: number;
      timestamp: Date;
    }>;
  };

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => EnergyListing, listing => listing.bids, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: EnergyListing;

  @ManyToOne(() => Bid, { nullable: true })
  @JoinColumn({ name: 'original_bid_id' })
  originalBid?: Bid;

  @ManyToOne(() => Bid, { nullable: true })
  @JoinColumn({ name: 'counter_bid_id' })
  counterBid?: Bid;
}

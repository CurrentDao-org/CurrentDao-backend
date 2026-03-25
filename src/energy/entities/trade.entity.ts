import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { EnergyListing } from './energy-listing.entity';
import { Bid } from './bid.entity';

export enum TradeStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
  REFUNDED = 'refunded',
}

export enum TradeType {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  EMERGENCY = 'emergency',
  BULK = 'bulk',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'listing_id' })
  listingId: string;

  @Column({ name: 'bid_id' })
  bidId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  quantity: number;

  @Column({ type: 'decimal', precision: 8, scale: 4 })
  price: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  finalPrice?: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  finalAmount?: number;

  @Column({
    type: 'enum',
    enum: TradeStatus,
    default: TradeStatus.PENDING,
  })
  status: TradeStatus;

  @Column({
    type: 'enum',
    enum: TradeType,
    default: TradeType.STANDARD,
  })
  type: TradeType;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus: PaymentStatus;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  deliveryStatus: DeliveryStatus;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  negotiatedDiscount?: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  serviceFee?: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  taxAmount?: number;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  deliveryCost?: number;

  @Column({ type: 'json', nullable: true })
  deliveryDetails: {
    deliveryAddress: {
      latitude: number;
      longitude: number;
      address: string;
      city: string;
      region: string;
      country: string;
      postalCode: string;
    };
    deliveryDate: Date;
    deliveryWindow: {
      start: Date;
      end: Date;
    };
    deliveryMethod: string;
    trackingNumber?: string;
    carrier?: string;
    specialInstructions?: string;
  };

  @Column({ type: 'json', nullable: true })
  paymentDetails: {
    method: string;
    currency: string;
    paymentSchedule: Array<{
      dueDate: Date;
      amount: number;
      status: PaymentStatus;
      transactionId?: string;
    }>;
    escrowReleased?: boolean;
    refundAmount?: number;
    refundReason?: string;
  };

  @Column({ type: 'json', nullable: true })
  contractTerms: {
    contractId?: string;
    contractUrl?: string;
    termsAccepted: boolean;
    termsAcceptedAt?: Date;
    terminationClause?: string;
    warrantyPeriod?: number;
    supportLevel?: string;
    penaltyClauses?: string[];
  };

  @Column({ type: 'json', nullable: true })
  qualityAssurance: {
    inspectionRequired: boolean;
    inspectionCompleted?: boolean;
    inspectionDate?: Date;
    inspectionResult?: 'pass' | 'fail' | 'conditional';
    qualityScore?: number;
    deficiencies?: string[];
    correctiveActions?: string[];
  };

  @Column({ type: 'json', nullable: true })
  compliance: {
    certifications: string[];
    regulatoryApproved: boolean;
    environmentalCompliance: boolean;
    safetyCompliance: boolean;
    complianceDocuments: Array<{
      type: string;
      url: string;
      verified: boolean;
      verifiedAt?: Date;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  milestones: Array<{
    id: string;
    name: string;
    description: string;
    dueDate: Date;
    completedDate?: Date;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo?: string;
    dependencies?: string[];
  }>;

  @Column({ type: 'json', nullable: true })
  riskManagement: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
    mitigationStrategies: string[];
    insuranceRequired: boolean;
    insurancePolicy?: string;
    contingencyPlans: string[];
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    source?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    priority?: number;
    tags?: string[];
    notes?: string[];
    attachments?: Array<{
      type: string;
      url: string;
      name: string;
      uploadedAt: Date;
    }>;
  };

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt?: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
  cancelledAt?: Date;

  @Column({ name: 'disputed_at', type: 'datetime', nullable: true })
  disputedAt?: Date;

  @Column({ name: 'refunded_at', type: 'datetime', nullable: true })
  refundedAt?: Date;

  @Column({ name: 'delivery_confirmed_at', type: 'datetime', nullable: true })
  deliveryConfirmedAt?: Date;

  @Column({ name: 'payment_completed_at', type: 'datetime', nullable: true })
  paymentCompletedAt?: Date;

  @Column({ name: 'created_by' })
  createdBy: string;

  @Column({ name: 'updated_by', nullable: true })
  updatedBy?: string;

  @Column({ name: 'confirmed_by', nullable: true })
  confirmedBy?: string;

  @Column({ name: 'cancelled_by', nullable: true })
  cancelledBy?: string;

  @Column({ name: 'disputed_by', nullable: true })
  disputedBy?: string;

  @Column({ type: 'json', nullable: true })
  auditTrail: Array<{
    timestamp: Date;
    action: string;
    userId?: string;
    reason?: string;
    previousStatus?: TradeStatus;
    newStatus?: TradeStatus;
    details?: any;
  }>;

  @Column({ type: 'json', nullable: true })
  analytics: {
    totalDuration?: number;
    paymentProcessingTime?: number;
    deliveryTime?: number;
    customerSatisfaction?: number;
    issues?: Array<{
      type: string;
      description: string;
      resolved: boolean;
      resolvedAt?: Date;
    }>;
    performanceMetrics?: {
      onTimeDelivery: boolean;
      qualityScore: number;
      communicationScore: number;
      overallRating: number;
    };
  };

  @Column({ name: 'is_disputed', default: false })
  isDisputed: boolean;

  @Column({ name: 'dispute_reason', nullable: true })
  disputeReason?: string;

  @Column({ name: 'dispute_resolution', nullable: true })
  disputeResolution?: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  refundAmount?: number;

  @Column({ name: 'penalty_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  penaltyAmount?: number;

  @Column({ name: 'bonus_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  bonusAmount?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => EnergyListing, listing => listing.trades, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: EnergyListing;

  @ManyToOne(() => Bid, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bid_id' })
  bid: Bid;
}

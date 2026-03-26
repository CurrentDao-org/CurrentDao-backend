import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from '../../modules/energy/entities/order.entity';

export enum MatchStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MatchType {
  FULL = 'full',
  PARTIAL = 'partial',
  SPLIT = 'split',
}

@Entity('matches')
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'buyer_order_id' })
  buyerOrderId: string;

  @Column({ name: 'seller_order_id' })
  sellerOrderId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  matchedQuantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  matchedPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  remainingQuantity: number;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.PENDING,
  })
  status: MatchStatus;

  @Column({
    type: 'enum',
    enum: MatchType,
    default: MatchType.FULL,
  })
  type: MatchType;

  @Column({ type: 'decimal', precision: 8, scale: 4, nullable: true })
  distance: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  matchingScore: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    algorithm?: string;
    priority?: number;
    renewablePreference?: boolean;
    conflictResolution?: string;
    auditTrail?: Array<{
      timestamp: Date;
      action: string;
      reason: string;
      userId?: string;
    }>;
  };

  @Column({ name: 'buyer_confirmed_at', type: 'datetime', nullable: true })
  buyerConfirmedAt: Date;

  @Column({ name: 'seller_confirmed_at', type: 'datetime', nullable: true })
  sellerConfirmedAt: Date;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'buyer_order_id' })
  buyerOrder: Order;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'seller_order_id' })
  sellerOrder: Order;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OrderType {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum OrderPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  URGENT = 4
}

@Entity()
@Index(['symbol', 'status'])
@Index(['userId', 'status'])
@Index(['price', 'status'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  symbol: string;

  @Column({
    type: 'enum',
    enum: OrderType,
  })
  type: OrderType;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
  })
  price: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  filledQuantity: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  remainingQuantity: number;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({
    type: 'enum',
    enum: OrderPriority,
    default: OrderPriority.MEDIUM,
  })
  priority: OrderPriority;

  @Column({ default: false })
  isIceberg: boolean;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  icebergVisibleQuantity: number;

  @Column({ default: false })
  isHidden: boolean;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column({ type: 'bigint', nullable: true })
  expiryTime: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

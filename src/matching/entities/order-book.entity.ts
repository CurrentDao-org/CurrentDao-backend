import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity()
@Index(['symbol'])
export class OrderBook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  symbol: string;

  @Column({ type: 'json' })
  buyOrders: Array<{
    price: number;
    quantity: number;
    orderIds: string[];
    totalOrders: number;
  }>;

  @Column({ type: 'json' })
  sellOrders: Array<{
    price: number;
    quantity: number;
    orderIds: string[];
    totalOrders: number;
  }>;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  totalBuyVolume: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  totalSellVolume: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  bestBid: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  bestAsk: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  spread: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  midPrice: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  totalOrders: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  depth: number;

  @Column({ type: 'bigint' })
  lastUpdate: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL'
}

@Entity()
@Index(['buyOrderId', 'sellOrderId'])
@Index(['symbol', 'timestamp'])
@Index(['makerOrderId', 'takerOrderId'])
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  symbol: string;

  @Column()
  buyOrderId: string;

  @Column()
  sellOrderId: string;

  @Column()
  makerOrderId: string;

  @Column()
  takerOrderId: string;

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
  })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: TradeType,
  })
  tradeType: TradeType;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  makerFee: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
  })
  takerFee: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Order, order => order.id)
  buyOrder: Order;

  @ManyToOne(() => Order, order => order.id)
  sellOrder: Order;

  @ManyToOne(() => Order, order => order.id)
  makerOrder: Order;

  @ManyToOne(() => Order, order => order.id)
  takerOrder: Order;
}

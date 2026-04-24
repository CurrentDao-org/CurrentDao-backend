import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('transactions')
@Index(['portfolioId'])
@Index(['assetId'])
@Index(['date'])
export class TransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @Column({ name: 'transaction_type', type: 'enum', enum: ['BUY', 'SELL', 'DIVIDEND', 'SPLIT', 'TRANSFER_IN', 'TRANSFER_OUT'] })
  transactionType: string;

  @Column({ name: 'quantity', type: 'decimal', precision: 18, scale: 8 })
  quantity: number;

  @Column({ name: 'price', type: 'decimal', precision: 15, scale: 2 })
  price: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2 })
  totalAmount: number;

  @Column({ name: 'fees', type: 'decimal', precision: 10, scale: 2, default: 0 })
  fees: number;

  @Column({ name: 'taxes', type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxes: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 15, scale: 2 })
  netAmount: number;

  @Column({ name: 'date' })
  date: Date;

  @Column({ name: 'settlement_date', nullable: true })
  settlementDate: Date;

  @Column({ name: 'exchange', nullable: true })
  exchange: string;

  @Column({ name: 'order_id', nullable: true })
  orderId: string;

  @Column({ name: 'external_transaction_id', nullable: true })
  externalTransactionId: string;

  @Column({ name: 'notes', nullable: true })
  notes: string;

  @Column({ name: 'status', default: 'COMPLETED' })
  status: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

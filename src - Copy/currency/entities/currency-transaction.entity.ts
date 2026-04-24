import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, ManyToOne } from 'typeorm';
import { CurrencyAccount } from './currency-account.entity';

@Entity('currency_transactions')
@Index(['accountId'])
@Index(['fromCurrency', 'toCurrency'])
@Index(['status'])
@Index(['transactionType'])
export class CurrencyTransaction {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 3 })
  fromCurrency: string;

  @Column({ length: 3 })
  toCurrency: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  fromAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  toAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  exchangeRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 4 })
  fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  feeAmount: number;

  @Column({ length: 50, default: 'conversion' })
  transactionType: string;

  @Column({ length: 50, default: 'pending' })
  status: string;

  @Column({ length: 255, nullable: true })
  reference: string;

  @Column({ length: 255, nullable: true })
  externalTransactionId: string;

  @Column({ type: 'json', nullable: true })
  metadata: {
    paymentProcessor?: string;
    riskAssessment?: any;
    complianceCheck?: any;
    source?: string;
    destination?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  failedAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => CurrencyAccount)
  account: CurrencyAccount;
}

import { Entity, PrimaryColumn, Column, CreateDateColumn, Index, ManyToOne } from 'typeorm';
import { Currency } from './currency.entity';

@Entity('fx_rates')
@Index(['fromCurrency', 'toCurrency', 'timestamp'])
@Index(['timestamp'])
export class FxRate {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 3 })
  fromCurrency: string;

  @Column({ length: 3 })
  toCurrency: string;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  rate: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  bidPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  askPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  spread: number;

  @Column({ type: 'timestamp' })
  timestamp: Date;

  @Column({ length: 50 })
  source: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  confidence: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    volume?: number;
    volatility?: number;
    provider?: string;
    latency?: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Currency, currency => currency.code)
  fromCurrencyEntity: Currency;

  @ManyToOne(() => Currency, currency => currency.code)
  toCurrencyEntity: Currency;
}

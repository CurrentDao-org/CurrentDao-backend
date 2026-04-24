import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne } from 'typeorm';
import { Currency } from './currency.entity';

@Entity('currency_accounts')
@Index(['userId', 'currencyCode'])
@Index(['accountNumber'])
export class CurrencyAccount {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 3 })
  currencyCode: string;

  @Column({ length: 100, unique: true })
  accountNumber: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  availableBalance: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  frozenBalance: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  pendingBalance: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  creditLimit: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  overdraftLimit: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'json', nullable: true })
  limits: {
    daily?: number;
    monthly?: number;
    transaction?: number;
  };

  @Column({ type: 'json', nullable: true })
  compliance: {
    kycLevel?: string;
    riskScore?: number;
    restrictions?: string[];
    lastAudit?: Date;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Currency, currency => currency.code)
  currency: Currency;
}

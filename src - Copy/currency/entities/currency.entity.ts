import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('currencies')
@Index(['code'])
@Index(['isActive'])
export class Currency {
  @PrimaryColumn({ length: 3 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 3 })
  symbol: string;

  @Column({ type: 'int', default: 2 })
  decimalPlaces: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 1 })
  exchangeRate: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isCrypto: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: {
    country?: string;
    region?: string;
    regulatoryInfo?: any;
    supportedPaymentProcessors?: string[];
  };

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minTransactionAmount: number;

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  maxTransactionAmount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

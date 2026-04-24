import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PositionEntity } from './position.entity';

@Entity('assets')
@Index(['symbol'])
@Index(['assetType'])
export class AssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'symbol', unique: true })
  symbol: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'asset_type', type: 'enum', enum: ['STOCK', 'BOND', 'CRYPTO', 'COMMODITY', 'FOREX', 'ETF', 'MUTUAL_FUND', 'REAL_ESTATE'] })
  assetType: string;

  @Column({ name: 'sector', nullable: true })
  sector: string;

  @Column({ name: 'industry', nullable: true })
  industry: string;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ name: 'current_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  currentPrice: number;

  @Column({ name: 'market_cap', type: 'decimal', precision: 20, scale: 2, nullable: true })
  marketCap: number;

  @Column({ name: 'volume', type: 'decimal', precision: 18, scale: 2, nullable: true })
  volume: number;

  @Column({ name: 'dividend_yield', type: 'decimal', precision: 8, scale: 4, nullable: true })
  dividendYield: number;

  @Column({ name: 'pe_ratio', type: 'decimal', precision: 10, scale: 2, nullable: true })
  peRatio: number;

  @Column({ name: 'beta', type: 'decimal', precision: 8, scale: 4, nullable: true })
  beta: number;

  @Column({ name: 'volatility', type: 'decimal', precision: 8, scale: 4, nullable: true })
  volatility: number;

  @Column({ name: 'exchange', nullable: true })
  exchange: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_price_update', nullable: true })
  lastPriceUpdate: Date;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: object;

  @OneToMany(() => PositionEntity, position => position.asset)
  positions: PositionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

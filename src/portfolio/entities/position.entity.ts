import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PortfolioEntity } from './portfolio.entity';
import { AssetEntity } from './asset.entity';

@Entity('positions')
@Index(['portfolioId'])
@Index(['assetId'])
export class PositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'asset_id' })
  assetId: string;

  @Column({ name: 'quantity', type: 'decimal', precision: 18, scale: 8 })
  quantity: number;

  @Column({ name: 'average_cost', type: 'decimal', precision: 15, scale: 2 })
  averageCost: number;

  @Column({ name: 'current_price', type: 'decimal', precision: 15, scale: 2 })
  currentPrice: number;

  @Column({ name: 'market_value', type: 'decimal', precision: 15, scale: 2 })
  marketValue: number;

  @Column({ name: 'unrealized_pnl', type: 'decimal', precision: 15, scale: 2, default: 0 })
  unrealizedPnl: number;

  @Column({ name: 'unrealized_pnl_percent', type: 'decimal', precision: 8, scale: 4, default: 0 })
  unrealizedPnlPercent: number;

  @Column({ name: 'realized_pnl', type: 'decimal', precision: 15, scale: 2, default: 0 })
  realizedPnl: number;

  @Column({ name: 'last_price_update' })
  lastPriceUpdate: Date;

  @Column({ name: 'status', default: 'ACTIVE' })
  status: string;

  @Column({ name: 'allocation_target', type: 'decimal', precision: 5, scale: 2, nullable: true })
  allocationTarget: number;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: object;

  @ManyToOne(() => PortfolioEntity, portfolio => portfolio.positions)
  @JoinColumn({ name: 'portfolio_id' })
  portfolio: PortfolioEntity;

  @ManyToOne(() => AssetEntity, asset => asset.positions)
  @JoinColumn({ name: 'asset_id' })
  asset: AssetEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('portfolio_performance')
@Index(['portfolioId'])
@Index(['date'])
export class PortfolioPerformanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'date', type: 'date' })
  date: Date;

  @Column({ name: 'total_value', type: 'decimal', precision: 15, scale: 2 })
  totalValue: number;

  @Column({ name: 'daily_return', type: 'decimal', precision: 10, scale: 4 })
  dailyReturn: number;

  @Column({ name: 'daily_return_percent', type: 'decimal', precision: 8, scale: 4 })
  dailyReturnPercent: number;

  @Column({ name: 'total_return', type: 'decimal', precision: 15, scale: 2 })
  totalReturn: number;

  @Column({ name: 'total_return_percent', type: 'decimal', precision: 8, scale: 4 })
  totalReturnPercent: number;

  @Column({ name: 'volatility', type: 'decimal', precision: 8, scale: 4 })
  volatility: number;

  @Column({ name: 'sharpe_ratio', type: 'decimal', precision: 8, scale: 4 })
  sharpeRatio: number;

  @Column({ name: 'max_drawdown', type: 'decimal', precision: 8, scale: 4 })
  maxDrawdown: number;

  @Column({ name: 'var_95', type: 'decimal', precision: 15, scale: 2 })
  var95: number;

  @Column({ name: 'beta', type: 'decimal', precision: 8, scale: 4 })
  beta: number;

  @Column({ name: 'alpha', type: 'decimal', precision: 8, scale: 4 })
  alpha: number;

  @Column({ name: 'allocation_data', type: 'json' })
  allocationData: object;

  @Column({ name: 'risk_metrics', type: 'json' })
  riskMetrics: object;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

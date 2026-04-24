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

@Entity('portfolios')
@Index(['userId'])
export class PortfolioEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'description', nullable: true })
  description: string;

  @Column({ name: 'total_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalValue: number;

  @Column({ name: 'initial_value', type: 'decimal', precision: 15, scale: 2, default: 0 })
  initialValue: number;

  @Column({ name: 'currency', default: 'USD' })
  currency: string;

  @Column({ name: 'status', default: 'ACTIVE' })
  status: string;

  @Column({ name: 'risk_tolerance', type: 'enum', enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' })
  riskTolerance: string;

  @Column({ name: 'investment_objective', nullable: true })
  investmentObjective: string;

  @Column({ name: 'auto_rebalance', default: false })
  autoRebalance: boolean;

  @Column({ name: 'rebalance_threshold', type: 'decimal', precision: 5, scale: 2, default: 5.0 })
  rebalanceThreshold: number;

  @Column({ name: 'last_rebalanced_at', nullable: true })
  lastRebalancedAt: Date;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata: object;

  @OneToMany(() => PositionEntity, position => position.portfolio)
  positions: PositionEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

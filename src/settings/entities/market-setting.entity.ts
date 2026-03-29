import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('market_settings')
@Index(['settingKey', 'isActive'])
@Index(['version'])
export class MarketSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, default: 'global' })
  settingKey: string;

  @Column({ type: 'varchar', length: 10 })
  marketStartTime: string; // HH:mm

  @Column({ type: 'varchar', length: 10 })
  marketEndTime: string;

  @Column({ type: 'varchar', length: 50 })
  timezone: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  minTradeAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  maxTradeAmount: number;

  @Column({ type: 'json' })
  defaultPriceRanges: Record<string, { min: number; max: number }>;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shard_metadata')
export class ShardMetadataEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'shard_id', unique: true })
  shardId: number;

  @Column({ name: 'current_load' })
  currentLoad: number;

  @Column({ name: 'total_records' })
  totalRecords: number;

  @Column({ default: 'HEALTHY' })
  status: string;

  @Column({ name: 'last_rebalanced', nullable: true })
  lastRebalanced: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

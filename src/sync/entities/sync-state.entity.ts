import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  CONFLICT = 'conflict',
  PARTITIONED = 'partitioned',
  RECOVERING = 'recovering',
  ERROR = 'error'
}

export enum SyncType {
  FULL = 'full',
  INCREMENTAL = 'incremental',
  RECOVERY = 'recovery'
}

@Entity('sync_states')
@Index(['entityType', 'entityId'])
@Index(['status'])
@Index(['lastSyncAt'])
export class SyncState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  entityType: string;

  @Column({ type: 'varchar', length: 255 })
  entityId: string;

  @Column({ type: 'enum', enum: SyncStatus, default: SyncStatus.IDLE })
  status: SyncStatus;

  @Column({ type: 'enum', enum: SyncType, default: SyncType.INCREMENTAL })
  syncType: SyncType;

  @Column({ type: 'bigint', name: 'last_ledger_sequence' })
  lastLedgerSequence: number;

  @Column({ type: 'bigint', name: 'target_ledger_sequence' })
  targetLedgerSequence: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'bigint', name: 'conflict_count', default: 0 })
  conflictCount: number;

  @Column({ type: 'bigint', name: 'partition_start_time', nullable: true })
  partitionStartTime: number;

  @Column({ type: 'int', name: 'sync_latency_ms', default: 0 })
  syncLatencyMs: number;

  @Column({ type: 'int', name: 'transactions_processed', default: 0 })
  transactionsProcessed: number;

  @Column({ type: 'int', name: 'transactions_per_hour', default: 0 })
  transactionsPerHour: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ type: 'datetime', name: 'last_sync_at', nullable: true })
  lastSyncAt: Date;

  @Column({ type: 'datetime', name: 'next_sync_at', nullable: true })
  nextSyncAt: Date;

  @Column({ type: 'datetime', name: 'last_successful_sync_at', nullable: true })
  lastSuccessfulSyncAt: Date;

  @Column({ type: 'boolean', name: 'is_healthy', default: true })
  isHealthy: boolean;
}

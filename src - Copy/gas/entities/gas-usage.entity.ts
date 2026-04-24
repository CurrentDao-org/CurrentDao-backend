import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ContractNetwork } from '../../contracts/entities/contract.entity';

export enum GasOperationType {
  CONTRACT_INVOKE = 'contract_invoke',
  CONTRACT_DEPLOY = 'contract_deploy',
  TOKEN_TRANSFER = 'token_transfer',
  BATCHED = 'batched',
}

@Entity('gas_usage')
@Index(['network', 'recordedAt'])
@Index(['operationType', 'network'])
export class GasUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ContractNetwork })
  network: ContractNetwork;

  @Column({ type: 'enum', enum: GasOperationType })
  operationType: GasOperationType;

  @Column({ nullable: true })
  contractId?: string;

  @Column({ nullable: true })
  transactionHash?: string;

  @Column({ type: 'bigint' })
  cpuInstructions: number;

  @Column({ type: 'bigint' })
  readBytes: number;

  @Column({ type: 'bigint' })
  writeBytes: number;

  @Column({ type: 'decimal', precision: 20, scale: 0 })
  feeCharged: string;

  @Column({ type: 'decimal', precision: 20, scale: 0, nullable: true })
  estimatedFee?: string;

  @Column({ type: 'boolean', default: false })
  wasBatched: boolean;

  @Column({ type: 'integer', default: 1 })
  batchSize: number;

  @Column({ type: 'integer', nullable: true })
  ledger?: number;

  @Column({ type: 'timestamp' })
  recordedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

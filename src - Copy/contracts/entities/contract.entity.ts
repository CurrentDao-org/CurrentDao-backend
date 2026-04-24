import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContractType {
  TOKEN = 'token',
  ESCROW = 'escrow',
  GOVERNANCE = 'governance',
}

export enum ContractNetwork {
  TESTNET = 'testnet',
  MAINNET = 'mainnet',
}

export enum ContractStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DEPLOYING = 'deploying',
  FAILED = 'failed',
  DEPRECATED = 'deprecated',
}

@Entity('contracts')
@Index(['contractType', 'network', 'isActive'])
@Index(['contractId', 'network'])
export class ContractEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ContractType })
  contractType: ContractType;

  @Column({ type: 'enum', enum: ContractNetwork })
  network: ContractNetwork;

  @Column()
  contractId: string;

  @Column({ nullable: true })
  alias?: string;

  @Column({ nullable: true })
  version?: string;

  @Column({ nullable: true })
  specHash?: string;

  @Column({ nullable: true })
  metadataCacheKey?: string;

  @Column({ nullable: true })
  deploymentTxHash?: string;

  @Column({ nullable: true })
  upgradeTxHash?: string;

  @Column({ nullable: true })
  previousContractId?: string;

  @Column({ nullable: true })
  deployedBy?: string;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.ACTIVE,
  })
  status: ContractStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'json', nullable: true })
  abi?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  deploymentMetadata?: Record<string, any>;

  @Column({ type: 'bigint', nullable: true })
  lastProcessedLedger?: string;

  @Column({ type: 'timestamp', nullable: true })
  lastEventAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

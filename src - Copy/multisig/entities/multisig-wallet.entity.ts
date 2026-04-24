import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Signature } from './signature.entity';

export enum WalletStatus {
  ACTIVE = 'active',
  LOCKED = 'locked',
  RECOVERY = 'recovery',
  TERMINATED = 'terminated',
}

@Entity('multisig_wallets')
@Index(['address'])
@Index(['creatorId'])
export class MultisigWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  address: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  creatorId: string;

  @Column({ type: 'json' })
  signers: string[];

  @Column()
  threshold: number;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  @Column({ type: 'bigint', default: 0 })
  nonce: number;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  recoveryThreshold: number;

  @Column({ type: 'timestamp', nullable: true })
  recoveryInitiatedAt: Date;

  @Column({ nullable: true })
  recoveryInitiatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Signature, (signature) => signature.wallet)
  signatures: Signature[];

  @Column({ type: 'timestamp', nullable: true })
  lastTransactionAt: Date;

  @Column({ default: 0 })
  transactionCount: number;

  get isRecoveryMode(): boolean {
    return this.status === WalletStatus.RECOVERY;
  }

  get requiredSignatures(): number {
    return this.isRecoveryMode && this.recoveryThreshold
      ? this.recoveryThreshold
      : this.threshold;
  }

  canExecute(signaturesCollected: number): boolean {
    return signaturesCollected >= this.requiredSignatures;
  }
}

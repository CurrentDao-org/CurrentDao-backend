import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MultisigWallet } from './multisig-wallet.entity';

export enum SignatureStatus {
  PENDING = 'pending',
  COLLECTED = 'collected',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  EXECUTED = 'executed',
}

export enum TransactionType {
  TRANSFER = 'transfer',
  CONTRACT_CALL = 'contract_call',
  DAO_VOTE = 'dao_vote',
  ENERGY_TRADE = 'energy_trade',
  EMERGENCY_RECOVERY = 'emergency_recovery',
}

@Entity('multisig_signatures')
@Index(['walletId', 'transactionHash'])
@Index(['signerId'])
@Index(['status'])
@Index(['expiresAt'])
export class Signature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletId: string;

  @ManyToOne(() => MultisigWallet, (wallet) => wallet.signatures, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'walletId' })
  wallet: MultisigWallet;

  @Column()
  transactionHash: string;

  @Column()
  signerId: string;

  @Column({ type: 'text' })
  signature: string;

  @Column({
    type: 'enum',
    enum: SignatureStatus,
    default: SignatureStatus.PENDING,
  })
  status: SignatureStatus;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  transactionType: TransactionType;

  @Column({ type: 'json' })
  transactionData: Record<string, any>;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  amount: string;

  @Column({ nullable: true })
  recipient: string;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  signedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  executedAt: Date;

  @Column({ type: 'text', nullable: true })
  executionTxHash: string;

  @Column({ type: 'json', nullable: true })
  auditData: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
    location?: string;
  };

  @Column({ type: 'text', nullable: true })
  revocationReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt: Date;

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return this.status === SignatureStatus.PENDING && !this.isExpired;
  }

  get canRevoke(): boolean {
    return this.status === SignatureStatus.PENDING && !this.isExpired;
  }

  get timeToExpiry(): number {
    return this.expiresAt.getTime() - Date.now();
  }
}

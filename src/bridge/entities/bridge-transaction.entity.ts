import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { BridgeTransactionStatus } from '../dto/bridge.dto';

@Entity('bridge_transactions')
@Index(['transactionId', 'status'])
@Index(['sourceChain', 'targetChain'])
export class BridgeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  transactionId: string;

  @Column()
  sourceChain: string;

  @Column()
  targetChain: string;

  @Column()
  sourceAsset: string;

  @Column()
  targetAsset: string;

  @Column('decimal', { precision: 24, scale: 12 })
  amount: number;

  @Column('decimal', { precision: 24, scale: 12, default: 0 })
  fee: number;

  @Column({ type: 'enum', enum: BridgeTransactionStatus, default: BridgeTransactionStatus.INITIATED })
  status: BridgeTransactionStatus;

  @Column({ nullable: true })
  fromAddress: string;

  @Column({ nullable: true })
  toAddress: string;

  @Column({ nullable: true, type: 'text' })
  memo?: string;

  @Column({ nullable: true, type: 'text' })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

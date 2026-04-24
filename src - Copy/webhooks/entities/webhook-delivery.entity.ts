import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Webhook } from './webhook.entity';

export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

@Entity('webhook_deliveries')
export class WebhookDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Webhook, (webhook) => webhook.deliveries)
  @JoinColumn({ name: 'webhook_id' })
  webhook: Webhook;

  @Column({ name: 'webhook_id' })
  webhookId: string;

  @Column()
  eventType: string;

  @Column('json')
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ nullable: true })
  responseCode: number;

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ nullable: true })
  attemptNumber: number;

  @Column({ nullable: true })
  nextRetryAt: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ default: 0 })
  duration: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  deliveredAt: Date;
}

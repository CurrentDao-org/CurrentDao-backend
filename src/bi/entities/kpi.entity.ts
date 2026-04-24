import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bi_kpis')
@Index(['userId'])
@Index(['category'])
@Index(['isActive'])
export class KPI {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 50 })
  category: string;

  @Column({ type: 'json' })
  definition: {
    metric: string;
    calculation: string;
    dataSource: string;
    filters?: Array<{ field: string; operator: string; value: any }>;
    aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'custom';
    timeWindow: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  };

  @Column({ type: 'json' })
  targets: {
    current?: number;
    target?: number;
    previous?: number;
    benchmark?: number;
    thresholds?: Array<{
      type: 'warning' | 'critical' | 'success';
      value: number;
      operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    }>;
  };

  @Column({ type: 'json' })
  formatting: {
    unit: string;
    decimals: number;
    prefix?: string;
    suffix?: string;
    formatType: 'number' | 'currency' | 'percentage' | 'duration' | 'custom';
  };

  @Column({ type: 'json' })
  alerts: {
    enabled: boolean;
    channels: Array<'email' | 'sms' | 'webhook' | 'push'>;
    conditions: Array<{
      threshold: number;
      operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
      severity: 'low' | 'medium' | 'high' | 'critical';
      cooldown: number; // minutes
    }>;
    recipients: Array<{ type: 'user' | 'role' | 'email'; value: string }>;
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    tags?: string[];
    owner?: string;
    department?: string;
    frequency?: string;
    sensitivity?: 'public' | 'internal' | 'confidential';
  };

  @Column({ type: 'timestamp', nullable: true })
  lastCalculated: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextCalculation: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

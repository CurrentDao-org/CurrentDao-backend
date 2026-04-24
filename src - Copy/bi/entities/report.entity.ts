import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bi_reports')
@Index(['userId'])
@Index(['templateId'])
@Index(['status'])
@Index(['schedule'])
export class Report {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 255, nullable: true })
  templateId: string;

  @Column({ type: 'json' })
  configuration: {
    dataSource: string;
    query: string;
    parameters?: Array<{ name: string; type: string; defaultValue?: any; required?: boolean }>;
    formatting: {
      orientation: 'portrait' | 'landscape';
      pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
      margins: { top: number; right: number; bottom: number; left: number };
    };
    sections: Array<{
      type: 'header' | 'content' | 'footer' | 'chart' | 'table';
      content: any;
      styling: any;
    }>;
  };

  @Column({ length: 50, default: 'draft' })
  status: string;

  @Column({ type: 'json', nullable: true })
  schedule: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
    cronExpression?: string;
    timezone: string;
    recipients: Array<{ email: string; format: 'PDF' | 'Excel' | 'CSV' }>;
    nextRun?: Date;
    lastRun?: Date;
  };

  @Column({ type: 'json', nullable: true })
  output: {
    format: 'PDF' | 'Excel' | 'CSV' | 'JSON';
    path?: string;
    url?: string;
    size?: number;
    generatedAt?: Date;
  };

  @Column({ type: 'json', nullable: true })
  permissions: {
    canView: string[];
    canEdit: string[];
    canShare: string[];
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    tags?: string[];
    category?: string;
    version?: number;
    executionTime?: number;
    recordCount?: number;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

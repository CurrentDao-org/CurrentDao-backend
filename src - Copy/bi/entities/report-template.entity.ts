import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bi_report_templates')
@Index(['category'])
@Index(['isPublic'])
@Index(['isActive'])
export class ReportTemplate {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 50 })
  category: string;

  @Column({ type: 'json' })
  template: {
    sections: Array<{
      name: string;
      type: 'header' | 'content' | 'footer' | 'chart' | 'table' | 'kpi';
      configuration: any;
      requiredData: string[];
    }>;
    parameters: Array<{
      name: string;
      type: string;
      label: string;
      defaultValue?: any;
      required?: boolean;
      options?: any[];
    }>;
    styling: {
      theme: string;
      colors: string[];
      fonts: string[];
      layout: any;
    };
  };

  @Column({ type: 'json' })
  dataSourceMapping: {
    [key: string]: {
      table: string;
      fields: string[];
      joins?: Array<{
        table: string;
        on: string;
        type: 'inner' | 'left' | 'right';
      }>;
    };
  };

  @Column({ type: 'json', nullable: true })
  preview: {
    thumbnail?: string;
    sampleData?: any;
    description?: string;
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    tags?: string[];
    author?: string;
    version?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    estimatedTime?: number;
  };

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

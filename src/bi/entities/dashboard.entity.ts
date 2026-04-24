import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('bi_dashboards')
@Index(['userId'])
@Index(['isPublic'])
@Index(['category'])
export class Dashboard {
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
  layout: {
    components: Array<{
      id: string;
      type: string;
      position: { x: number; y: number; w: number; h: number };
      config: any;
      dataSource: string;
    }>;
    grid: { cols: number; rows: number };
  };

  @Column({ type: 'json' })
  filters: {
    dateRange?: { start: Date; end: Date };
    currencies?: string[];
    regions?: string[];
    customFilters?: Array<{ key: string; value: any; operator: string }>;
  };

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'json', nullable: true })
  sharing: {
    users?: string[];
    roles?: string[];
    permissions?: ('view' | 'edit' | 'share')[];
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    tags?: string[];
    lastModifiedBy?: string;
    version?: number;
    refreshInterval?: number;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastRefreshed: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

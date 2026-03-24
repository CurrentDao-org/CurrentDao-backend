import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('risk_data')
export class RiskDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'portfolio_id' })
  portfolioId: string;

  @Column({ name: 'risk_type' })
  riskType: string;

  @Column({ name: 'risk_level', type: 'decimal', precision: 10, scale: 2 })
  riskLevel: number;

  @Column({ name: 'var_value', type: 'decimal', precision: 15, scale: 2 })
  varValue: number;

  @Column({ name: 'var_confidence', type: 'decimal', precision: 5, scale: 2 })
  varConfidence: number;

  @Column({ name: 'stress_test_result', type: 'json' })
  stressTestResult: object;

  @Column({ name: 'hedging_strategy', type: 'json' })
  hedgingStrategy: object;

  @Column({ name: 'mitigation_actions', type: 'json' })
  mitigationActions: object;

  @Column({ name: 'compliance_status', default: 'pending' })
  complianceStatus: string;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

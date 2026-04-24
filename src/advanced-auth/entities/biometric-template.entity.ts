import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('biometric_templates')
@Index(['userId'])
@Index(['type'])
@Index(['isActive'])
export class BiometricTemplate {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 50 })
  type: 'face' | 'voice' | 'fingerprint' | 'iris' | 'behavioral';

  @Column({ type: 'text' })
  template: string; // Encrypted biometric template

  @Column({ type: 'json' })
  metadata: {
    deviceInfo?: any;
    captureQuality: number;
    confidence: number;
    algorithm: string;
    version: string;
    captureDate: Date;
    location?: string;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  accuracy: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  falseAcceptanceRate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  falseRejectionRate: number;

  @Column({ type: 'json', nullable: true })
  securityFeatures: {
    livenessDetection: boolean;
    antiSpoofing: boolean;
    encryption: string;
    hashAlgorithm: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFailure: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

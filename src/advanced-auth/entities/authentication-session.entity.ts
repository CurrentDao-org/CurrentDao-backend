import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('authentication_sessions')
@Index(['userId'])
@Index(['sessionId'])
@Index(['status'])
@Index(['expiresAt'])
export class AuthenticationSession {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255, nullable: true })
  userId: string;

  @Column({ length: 255, unique: true })
  sessionId: string;

  @Column({ length: 50 })
  type: 'password' | 'biometric' | 'webauthn' | 'mfa' | 'sso' | 'passwordless';

  @Column({ length: 50, default: 'active' })
  status: 'active' | 'expired' | 'terminated' | 'suspended' | 'compromised';

  @Column({ type: 'json' })
  authentication: {
    method: string;
    factors: Array<{
      type: string;
      verified: boolean;
      timestamp: Date;
      confidence: number;
    }>;
    riskScore: number;
    adaptiveLevel: 'low' | 'medium' | 'high' | 'critical';
    requiredMFA: boolean;
    mfaCompleted: boolean;
  };

  @Column({ type: 'json' })
  context: {
    ipAddress: string;
    userAgent: string;
    deviceId: string;
    location: {
      country: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    time: Date;
    timezone: string;
    language: string;
    platform: string;
  };

  @Column({ type: 'json' })
  behavior: {
    typingSpeed: number;
    mouseMovement: number;
    clickPattern: string;
    scrollPattern: string;
    sessionDuration: number;
    pageViews: number;
    anomalies: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      timestamp: Date;
      description: string;
    }>;
  };

  @Column({ type: 'json', nullable: true })
  continuousAuth: {
    enabled: boolean;
    lastVerification: Date;
    verificationInterval: number; // minutes
    failedVerifications: number;
    maxFailures: number;
    currentScore: number;
    threshold: number;
  };

  @Column({ type: 'json', nullable: true })
  adaptiveAuth: {
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    requiredFactors: string[];
    dynamicMFA: boolean;
    stepUpAuth: boolean;
    monitoring: boolean;
  };

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  terminatedAt: Date;

  @Column({ type: 'text', nullable: true })
  terminationReason: string;

  @Column({ type: 'json', nullable: true })
  security: {
    encryption: string;
    signing: string;
    integrity: string;
    antiCSRF: string;
    antiReplay: string;
  };

  @Column({ type: 'json', nullable: true })
  audit: {
    loginAttempts: number;
    failedAttempts: number;
    lastActivity: Date;
    activityLog: Array<{
      action: string;
      timestamp: Date;
      details: any;
    }>;
    compliance: {
      gdpr: boolean;
      ccpa: boolean;
      hipaa: boolean;
      sox: boolean;
    };
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    source: string;
    campaign?: string;
    referrer?: string;
    deviceTrust: number;
    userRisk: number;
    contextRisk: number;
    overallRisk: number;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

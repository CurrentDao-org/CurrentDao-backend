import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('device_fingerprints')
@Index(['userId'])
@Index(['deviceId'])
@Index(['trustScore'])
export class DeviceFingerprint {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255, nullable: true })
  userId: string;

  @Column({ length: 255, unique: true })
  deviceId: string;

  @Column({ type: 'json' })
  fingerprint: {
    userAgent: string;
    language: string;
    platform: string;
    vendor: string;
    hardware: {
      cores: number;
      memory: number;
      screen: {
        width: number;
        height: number;
        colorDepth: number;
        pixelRatio: number;
      };
    };
    browser: {
      name: string;
      version: string;
      plugins: string[];
      cookies: boolean;
      doNotTrack: boolean;
    };
    network: {
      connection: string;
      effectiveType: string;
      downlink: number;
      rtt: number;
    };
    canvas: string;
    webgl: string;
    audio: string;
    fonts: string[];
    timezone: string;
    timezoneOffset: number;
    screenResolution: string;
    colorGamut: string;
    reducedMotion: boolean;
    hdr: boolean;
  };

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.5 })
  trustScore: number;

  @Column({ type: 'json' })
  riskFactors: {
    isNewDevice: boolean;
    isTor: boolean;
    isVPN: boolean;
    isEmulator: boolean;
    isBot: boolean;
    suspiciousIP: boolean;
    locationMismatch: boolean;
    timeAnomaly: boolean;
    deviceAnomaly: boolean;
  };

  @Column({ type: 'json', nullable: true })
  location: {
    country: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
    timezone: string;
    isp: string;
    organization: string;
  };

  @Column({ type: 'json', nullable: true })
  behavior: {
    typingSpeed: number;
    mouseMovement: number;
    clickPattern: string;
    scrollPattern: string;
    sessionDuration: number;
    pageViews: number;
    bounceRate: number;
  };

  @Column({ type: 'json', nullable: true })
  security: {
    hasWebAuthn: boolean;
    hasBiometrics: boolean;
    hasScreenLock: boolean;
    hasAntivirus: boolean;
    firewallEnabled: boolean;
    osVersion: string;
    browserVersion: string;
    lastSecurityScan: Date;
  };

  @Column({ type: 'timestamp', nullable: true })
  firstSeen: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date;

  @Column({ type: 'int', default: 0 })
  sessionCount: number;

  @Column({ type: 'int', default: 0 })
  authenticationCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFailure: Date;

  @Column({ type: 'json', nullable: true })
  reputation: {
    score: number;
    factors: string[];
    lastUpdated: Date;
    source: string;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isBlocked: boolean;

  @Column({ type: 'text', nullable: true })
  blockReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

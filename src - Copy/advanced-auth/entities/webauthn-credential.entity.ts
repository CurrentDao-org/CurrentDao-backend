import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('webauthn_credentials')
@Index(['userId'])
@Index(['type'])
@Index(['isActive'])
export class WebAuthnCredential {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255, unique: true })
  credentialId: string;

  @Column({ length: 255 })
  type: 'public-key';

  @Column({ type: 'text' })
  publicKey: string; // COSE key

  @Column({ length: 255 })
  algorithm: string;

  @Column({ type: 'json' })
  transports: Array<'usb' | 'nfc' | 'ble' | 'internal'>;

  @Column({ type: 'json' })
  authenticator: {
    aaguid: string;
    name: string;
    icon?: string;
    isUserVerifying: boolean;
    isUserPresent: boolean;
    attachment: 'platform' | 'cross-platform';
  };

  @Column({ type: 'json' })
  user: {
    id: string;
    name: string;
    displayName: string;
  };

  @Column({ type: 'json' })
  rp: {
    id: string;
    name: string;
  };

  @Column({ type: 'json', nullable: true })
  extensions: {
    credProps?: boolean;
    uvm?: boolean;
    appid?: boolean;
    appidExclude?: boolean;
  };

  @Column({ type: 'json', nullable: true })
  clientExtensionResults: any;

  @Column({ type: 'timestamp', nullable: true })
  lastUsed: Date;

  @Column({ type: 'int', default: 0 })
  usageCount: number;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastFailure: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isBackup: boolean;

  @Column({ type: 'boolean', default: false })
  isMFA: boolean;

  @Column({ type: 'json', nullable: true })
  deviceFingerprint: {
    userAgent: string;
    platform: string;
    ip: string;
    deviceId: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

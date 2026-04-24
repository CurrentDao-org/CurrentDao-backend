import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('identity_providers')
@Index(['provider'])
@Index(['isActive'])
@Index(['type'])
export class IdentityProvider {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ length: 100 })
  provider: string; // google, microsoft, apple, facebook, github, etc.

  @Column({ length: 50 })
  type: 'oauth2' | 'oidc' | 'saml' | 'ldap' | 'custom';

  @Column({ length: 255 })
  displayName: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'json' })
  configuration: {
    clientId: string;
    clientSecret: string;
    scope: string[];
    redirectUri: string;
    responseType: string;
    grantType: string[];
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    revocationUrl?: string;
    jwksUrl?: string;
    issuer?: string;
    audience?: string;
  };

  @Column({ type: 'json' })
  mapping: {
    userId: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
    locale?: string;
    timezone?: string;
    phone?: string;
    groups?: string;
    roles?: string;
    custom?: Record<string, string>;
  };

  @Column({ type: 'json', nullable: true })
  samlConfig?: {
    entryPoint: string;
    issuer: string;
    cert: string;
    privateKey?: string;
    signatureAlgorithm: string;
    digestAlgorithm: string;
    nameIdFormat: string;
    attributeConsumingServiceIndex?: number;
    attributeMapping?: Record<string, string>;
  };

  @Column({ type: 'json', nullable: true })
  ldapConfig?: {
    url: string;
    baseDN: string;
    bindDN?: string;
    bindCredentials?: string;
    searchFilter: string;
    searchAttributes: string[];
    groupSearchFilter?: string;
    groupSearchBase?: string;
    groupMemberAttribute?: string;
    tlsOptions?: {
      rejectUnauthorized: boolean;
      ca?: string;
    };
  };

  @Column({ type: 'json' })
  features: {
    mfa: boolean;
    groups: boolean;
    roles: boolean;
    profileSync: boolean;
    passwordPolicy: boolean;
    sessionManagement: boolean;
    auditLogging: boolean;
    compliance: boolean;
  };

  @Column({ type: 'json' })
  security: {
    encryption: string;
    signing: string;
    tokenValidation: string;
    sessionTimeout: number;
    maxSessionTime: number;
    requireMFA: boolean;
    allowedDomains: string[];
    blockedDomains: string[];
    ipWhitelist: string[];
    ipBlacklist: string[];
  };

  @Column({ type: 'json', nullable: true })
  branding: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCSS?: string;
    consentText?: string;
    privacyPolicy?: string;
    termsOfService?: string;
  };

  @Column({ type: 'json', nullable: true })
  compliance: {
    gdpr: boolean;
    ccpa: boolean;
    hipaa: boolean;
    sox: boolean;
    pci: boolean;
    iso27001: boolean;
    soc2: boolean;
  };

  @Column({ type: 'json' })
  statistics: {
    totalUsers: number;
    activeUsers: number;
    dailyLogins: number;
    weeklyLogins: number;
    monthlyLogins: number;
    failedLogins: number;
    successRate: number;
    avgSessionDuration: number;
    lastUpdated: Date;
  };

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ type: 'boolean', default: false })
  isRequired: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: {
    version: string;
    lastSync: Date;
    syncStatus: 'success' | 'failed' | 'pending';
    errorMessage?: string;
    webhookUrl?: string;
    webhookSecret?: string;
  };

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

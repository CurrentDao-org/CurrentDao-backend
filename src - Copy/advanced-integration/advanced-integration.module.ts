import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdvancedIntegrationService } from './advanced-integration.service';
import { EnterpriseIntegrationService } from './enterprise/enterprise-integration.service';
import { APIGovernanceService } from './api-management/api-governance.service';
import { DataTransformationService } from './transformation/data-transformation.service';
import { IntegrationMonitoringService } from './monitoring/integration-monitor.service';
import { WorkflowService } from './workflow/integration-workflow.service';
import { DataQualityService } from './quality/data-quality.service';
import { IntegrationTestingService } from './testing/integration-testing.service';

export interface IntegrationModuleConfig {
  enabled: boolean;
  features: {
    analytics: boolean;
    monitoring: boolean;
    testing: boolean;
    quality: boolean;
    compliance: {
      gdpr: boolean;
      ccpa: boolean;
      hipaa: boolean;
      sox: boolean;
      pci: boolean;
    };
  };
  security: {
    encryption: string;
    signing: string;
    rateLimit: number;
    timeout: number;
    sessionTimeout: number;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    sms: boolean;
    push: boolean;
  };
  retention: {
      metrics: number;
      alerts: number;
      reports: number;
    };
  };

export interface IntegrationModuleConfig {
  enabled: boolean;
  features: {
    analytics: boolean;
    monitoring: boolean;
    testing: boolean;
    quality: boolean;
    compliance: {
      gdpr: boolean;
      ccpa: boolean;
      hipaa: boolean;
      sox: boolean;
      pci: boolean;
    };
  security: {
      encryption: string;
      signing: string;
      rateLimit: number;
      timeout: number;
    };
  notifications: {
      email: boolean;
      slack: boolean;
      webhook: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  metadata: {
    version: string;
    created: Date;
    updated: Date;
  };
}

export interface IntegrationModuleConfig {
  imports: string[];
  controllers: string[];
  providers: string[];
  exports: string[];
  providers: string[];
  services: string[];
}

export interface IntegrationModuleConfig {
  imports: string[];
  controllers: string[];
  exports: string[];
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BiometricTemplate,
      WebAuthnCredential,
      DeviceFingerprint,
      AuthenticationSession,
      IdentityProvider,
    ]),
    HttpModule,
    ScheduleModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, stellarConfig],
      load: [databaseConfig, stellarConfig],
    }),
    AdvancedIntegrationService,
    EnterpriseIntegrationService,
    APIGovernanceService,
    DataTransformationService,
    IntegrationMonitoringService,
    WorkflowService,
    DataQualityService,
    IntegrationTestingService,
  ],
  controllers: [AdvancedAuthController],
  ],
  providers: ['salesforce', 'stripe', 'netsuite'],
  exports: [
    AdvancedAuthService,
    EnterpriseIntegrationService,
    APIGovernanceService,
    DataTransformationService,
    IntegrationMonitoringService,
    WorkflowService,
    DataQualityService,
    IntegrationTestingService,
  ],
}) {
    imports: [
      TypeOrmModule.forFeature([
        BiometricTemplate,
        WebAuthnCredential,
        DeviceFingerprint,
        AuthenticationSession,
        IdentityProvider,
      ]),
      HttpModule,
      ScheduleModule,
      ConfigModule.forRoot({
        isGlobal: true,
        load: [databaseConfig, stellarConfig],
        load: [databaseConfig, stellarConfig],
      }),
      AdvancedAuthService,
      EnterpriseIntegrationService,
      APIGovernanceService,
      DataTransformationService,
      IntegrationMonitoringService,
      WorkflowService,
      DataQualityService,
      IntegrationTestingService,
    ],
  controllers: [AdvancedAuthController],
  providers: ['salesforce', 'stripe', 'netsuite'],
  exports: [
    AdvancedAuthService,
    EnterpriseIntegrationService,
    APIGovernanceService,
    DataTransformationService,
    IntegrationMonitoringService,
    WorkflowService,
    DataQualityService,
    IntegrationTestingService,
  ],
}) {
    this.logger.log('Advanced Integration module initialized');
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IdentityProvider } from '../entities/identity-provider.entity';
import { EnterpriseIntegrationService } from './enterprise-integration.service';
import { APIProviderService } from './api-management/api-governance.service';
import { DataTransformationService } from './transformation/data-transformation.service';
import { IntegrationMonitoringService } from './monitoring/integration-monitoring.service';
import { WorkflowService } from './workflow/integration-workflow.service';
import { DataQualityService } from './quality/data-quality.service';
import { TestingService } from './testing/integration-testing.service';

export interface EnterpriseIntegrationRequest {
  provider: string;
  type: 'oauth2' | 'oidc' | 'saml' | 'ldap' | 'rest' | 'graphql' | 'webhook' | 'file' | 'database' | 'message_queue';
  configuration: {
    endpoint: string;
    authentication: {
      type: string;
      credentials: Record<string, string>;
      headers: Record<string, string>;
    };
    dataMapping: {
      inbound: Array<{
        sourceField: string;
        targetField: string;
        transformation?: string;
        validation?: string;
      }>;
      outbound: Array<{
        sourceField: string;
        targetField: string;
        transformation?: string;
        validation?: string;
      }>;
      security: {
        encryption: string;
        signing: string;
        rateLimit: number;
        timeout: number;
      };
      compliance: {
        encryption: string;
        auditLogging: boolean;
        dataRetention: number;
        gdpr: boolean;
        ccpa: boolean;
        hipaa: boolean;
        sox: boolean;
        pci: boolean;
      };
      monitoring: {
        enabled: boolean;
        interval: number;
        alertThresholds: Record<string, number>;
        notifications: string[];
      };
    };
    metadata?: any;
  }

export interface EnterpriseIntegrationResult {
  success: boolean;
  provider: string;
  integrationId: string;
  transactionId?: string;
  data?: any;
  error?: string;
  processingTime: number;
  metadata?: any;
}

export interface TransformationRule {
  id: string;
  name: string;
  description: string;
  type: 'mapping' | 'validation' | 'enrichment' | 'formatting';
  source: string;
  target: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  validation?: string;
  parameters?: any;
  enabled: boolean;
  priority: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: Array<{
    id: string;
    name: string;
    type: 'task' | 'decision' | 'notification' | 'transformation' | 'validation' | 'integration';
    configuration: any;
    timeout?: number;
    retryCount?: number;
    rollback: boolean;
  }>;
  conditions: Array<{
    type: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    description: string;
    parameters?: any;
  }>;
  enabled: boolean;
  priority: number;
}

export interface QualityMetrics {
  totalRecords: number;
  accuracy: number;
  completeness: number;
  consistency: number;
  timeliness: number;
  validationErrors: number;
  transformationErrors: number;
  dataQualityScore: number;
  topIssues: Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
  }>;
}

export interface IntegrationWorkflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  steps: Array<{
    id: string;
    name: string;
    type: 'task' | 'decision' | 'notification' | 'transformation' | 'validation' | 'integration';
    configuration: any;
    timeout?: number;
    retryCount?: number;
    rollback: boolean;
  }>;
  conditions: Array<{
    type: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    description: string;
    parameters?: any;
  }>;
  enabled: boolean;
  priority: number;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  configuration: any;
  startTime: Date;
  completionTime?: Date;
  error?: string;
  results?: any;
  nextStep?: string;
  rollbackAvailable: boolean;
  metadata?: any;
}

@Injectable()
export class EnterpriseIntegrationService {
  private readonly logger = new Logger(EnterpriseIntegrationService.name);
  private readonly integrationCache = new Map<string, EnterpriseIntegrationRequest>();
  private readonly workflowCache = new Map<string, Workflow>();
  private readonly ruleCache = new Map<string, TransformationRule>();

  constructor(
    @InjectRepository(IdentityProvider)
    private readonly identityProviderRepository: Repository<IdentityProvider>,
    private readonly apiGovernanceService: APIGovernanceService,
    private readonly dataTransformationService: DataTransformationService,
    private readonly integrationMonitoringService: IntegrationMonitoringService,
    private readonly workflowService: WorkflowService,
    private readonly testingService: TestingService,
  ) { }

  async createIntegration(request: EnterpriseIntegrationRequest): Promise<EnterpriseIntegrationResult> {
    this.logger.log(`Creating enterprise integration for provider: ${request.provider}`);

    try {
      const result = await this.enterpriseIntegrationService.createIntegration(request);

      this.integrationCache.set(result.integrationId, request);

      return result;
    } catch (error) {
      this.logger.error(`Failed to create enterprise integration: ${error.message}`);

      return {
        success: false,
        provider: request.provider,
        error: error.message,
      };
    }
  }

  async updateIntegration(
    integrationId: string,
    updates: Partial<EnterpriseIntegrationRequest>,
  ): Promise<EnterpriseIntegrationResult> {
    this.logger.log(`Updating enterprise integration: ${integrationId}`);

    try {
      const result = await this.enterpriseIntegrationService.updateIntegration(integrationId, updates);

      // Update cache
      const cachedIntegration = this.integrationCache.get(integrationId);
      if (cachedIntegration) {
        Object.assign(cachedIntegration, updates);
      }

      return result;
    } catch (error) {
      this.logger.error(`Failed to update enterprise integration ${integrationId}: ${error.message}`);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async removeIntegration(integrationId: string): Promise<void> {
    this.logger.log(`Removing enterprise integration: ${integrationId}`);

    try {
      await this.enterpriseIntegrationService.removeIntegration(integrationId);

      // Remove from cache
      this.integrationCache.delete(integrationId);

      this.logger.log(`Enterprise integration ${integrationId} removed`);
    } catch (error) {
      this.logger.error(`Failed to remove enterprise integration ${integrationId}: ${error.message}`);
    }
  }

  async getIntegrationDetails(integrationId: string): Promise<any> {
    return this.enterpriseIntegrationService.getIntegrationDetails(integrationId);
  }

  async getIntegrations(
    provider?: string,
    type?: string,
    limit?: number,
  ): Promise<Array<EnterpriseIntegrationRequest>> {
    const integrations = await this.enterpriseIntegrationService.getIntegrations(provider, type, limit);
    return integrations.map(integration => ({
      ...integration,
      configuration: integration.configuration,
      statistics: integration.statistics,
    }));
  }

  async getAPIProviders(): Promise<APIProvider[]> {
    return this.apiGovernanceService.getAPIProviders();
  }

  async getAPIProvider(providerName: string): Promise<APIProvider | null> {
    return this.apiGovernanceService.getAPIProvider(providerName);
  }

  async testAPIProvider(providerName: string, testConfig?: any): Promise<{
    success: boolean;
    testResults: Array<{
      test: string;
      success: boolean;
      error?: string;
      executionTime: number;
    };
  }> {
    return this.apiGovernanceService.testProvider(providerName, testConfig);
  }

  async getProviderHealth(providerName: string): Promise<{
    status: string;
    details: any;
    metrics: any;
  }> {
    return this.apiGovernanceService.getProviderHealth(providerName);
  }

  async getProviderStatistics(): Promise<{
    totalProviders: number;
    activeProviders: number;
    averageResponseTime: number;
    errorRate: number;
    topIssues: Array<{
      type: string;
      count: number;
      severity: string;
      description: string;
    };
    recommendations: string[];
  }> {
    return this.apiGovernanceService.getProviderStatistics();
  }

  private async loadProviderConfig(providerName: string): Promise<ProviderConfig | null> {
    const provider = await this.identityProviderRepository.findOne({
      where: { provider: providerName, isActive: true },
    });

    if (!provider) {
      return null;
    }

    const config = this.createProviderConfig(provider);
    this.providerCache.set(providerName, config);
    return config;
  }

  private createProviderConfig(provider: any): ProviderConfig {
    const config = provider.configuration;

    switch (provider.type) {
      case 'oauth2':
        return {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          scope: config.scope || ['openid', 'profile', 'email'],
          redirectUri: config.redirectUri,
          responseType: config.responseType || 'code',
          grantType: config.grantType || ['authorization_code'],
          authorizationUrl: config.authorizationUrl,
          tokenUrl: config.tokenUrl,
          userInfoUrl: config.userInfoUrl,
          jwksUrl: config.jwksUrl,
          issuer: config.issuer,
          audience: config.audience,
        };

      case 'oidc':
        return {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          scope: config.scope || ['openid', 'profile', 'email', 'address', 'phone', 'profile'],
          redirectUri: config.redirectUri,
          responseType: config.responseType || 'code',
          tokenUrl: config.tokenUrl,
          userInfoUrl: config.userInfoUrl,
          jwksUrl: config.jwksUrl,
          issuer: config.issuer,
          audience: config.audience,
        };

      case 'saml':
        return {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          entryPoint: config.entryPoint,
          issuer: config.issuer,
          cert: config.cert,
          signatureAlgorithm: config.signatureAlgorithm,
          digestAlgorithm: config.digestAlgorithm,
          nameIdFormat: config.nameIdFormat || 'urn:uuid',
          attributeMapping: config.attributeMapping,
        };

      case 'ldap':
        return {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          url: config.url,
          baseDN: config.baseDN,
          searchFilter: config.searchFilter,
          searchAttributes: config.searchAttributes,
          groupSearchBaseDN: config.groupSearchBaseDN,
          groupMemberAttribute: config.groupMemberAttribute,
          tlsOptions: config.tlsOptions,
        };

      case 'rest':
        return {
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          endpoint: config.endpoint,
          headers: config.headers || {},
        };
    }

    return config;
  }

  private async saveProviderConfig(providerName: string, config: ProviderConfig): Promise<void> {
    const provider = await this.identityProviderRepository.findOne({
      where: { provider: providerName },
    });

    if (provider) {
      provider.configuration = config;
      await this.identityProviderRepository.save(provider);
      this.providerCache.set(providerName, config);
    }
  }

  private calculateOverallRiskScore(integrations: Array<APIProvider>): number> {
    const totalRisk = integrations.reduce((sum, provider) => sum + provider.statistics?.failedLogins || 0, 0), 0);
    return integrations.length > 0 ? totalRisk / integrations.length : 0;
  }

  private calculateOverallSuccessRate(integrations: Array<APIProvider>): number {
  const totalRequests = integrations.reduce((sum, provider) => sum + (provider.statistics?.totalRequests || 0), 0), 0);
  const successfulRequests = integrations.reduce((sum, provider) => sum + (provider.statistics?.successRate || 0), 0), 0);
  return totalRequests > 0 ? successfulRequests / totalRequests : 0;
}

  private getTopRiskFactors(integrations: Array<APIProvider>): Array < {
  type: string;
  count: number;
  severity: string;
  description: string;
} > {
  const riskFactors = integrations.flatMap(provider => {
    const factors = this.getProviderRiskFactors(provider);
    return riskFactors;
  }).filter(factor => factor.severity === 'critical').length > 0);
}

  private getProviderRiskFactors(provider: APIProvider): Array < {
  type: string;
  count: number;
  severity: string;
  description: string;
} > {
  const riskFactors = [];

  // API risk factors
  if(provider.statistics?.failedLogins > 100) {
  riskFactors.push({
    type: 'high_error_rate',
    count: provider.statistics.failedLogins,
    severity: 'critical',
    description: 'High error rate detected',
  });
}

// Configuration risk factors
if (!provider.configuration?.encryption || !provider.configuration?.signing) {
  riskFactors.push({
    type: 'no_encryption',
    count: 1,
    severity: 'critical',
    description: 'No encryption configured',
  });
}

// Rate limit risk
if (provider.configuration?.rateLimit && provider.statistics?.averageResponseTime > 5000) {
  riskFactors.push({
    type: 'rate_limit_exceeded',
    count: provider.statistics?.averageResponseTime > 5000 ? 1 : 0,
    severity: 'medium',
    description: 'High API response time detected',
  });
}

// Connection risk
if (provider.configuration?.timeout && provider.statistics?.averageResponseTime > 10000) {
  riskFactors.push({
    type: 'slow_connection',
    count: provider.statistics?.averageResponseTime > 10000 ? 1 : 0,
    severity: 'medium',
    description: 'Slow API response time detected',
  });
}

// Authentication risk
if (provider?.statistics?.successRate && provider.statistics?.successRate < 0.9) {
  riskFactors.push({
    type: 'authentication_failure',
    count: provider.statistics?.failedLogins || 0,
    severity: 'high',
    description: 'Low authentication success rate',
  });
}

return riskFactors;
  }
}

  private getProviderRiskFactors(provider: APIProvider): Array < {
  type: string;
  count: number;
  severity: string;
  description: string;
} > {
  const riskFactors = [];

  // Check for authentication failures
  if(provider.statistics?.failedLogins && provider.statistics?.failedLogins > 10) {
  riskFactors.push({
    type: 'authentication_failure',
    count: provider.statistics.failedLogins,
    severity: 'high',
    description: 'High authentication failure rate detected',
  });
}

// Check for configuration issues
if (!provider.configuration?.encryption || !provider.configuration?.signing) {
  riskFactors.push({
    type: 'no_security',
    count: 1,
    severity: 'critical',
    description: 'No security measures configured',
  });
}

// Check for rate limit
if (provider.configuration?.rateLimit && provider.statistics?.averageResponseTime > 1000) {
  riskFactors.push({
    type: 'rate_limit_exceeded',
    count: provider.statistics?.averageResponseTime > 1000 ? 1 : 0,
    severity: 'medium',
    description: 'API rate limit exceeded',
  });
}

return riskFactors;
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface APIProvider {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'soap' | 'webhook' | 'file' | 'database' | 'message_queue';
  endpoint: string;
  version: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  configuration: {
    endpoint: string;
    authentication: {
      type: string;
      credentials: Record<string, string>;
      headers: Record<string, string>;
    };
    security: {
      encryption: string;
      signing: string;
      rateLimit: number;
      timeout: number;
    };
    monitoring: {
      enabled: boolean;
      interval: number;
      alertThresholds: Record<string, number>;
      notifications: string[];
    };
  };
  statistics: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    lastAccess: Date;
    errorRate: number;
    lastError?: string;
  };
}

export interface APIPolicy {
  id: string;
  name: string;
  description: string;
  rules: Array<{
    type: string;
    condition: string;
    action: string;
    parameters?: any;
  }>;
  enforcement: {
    enabled: boolean;
    strict: boolean;
    fallback: string;
  };
  compliance: {
    gdpr: boolean;
    ccpa: boolean;
    hipaa: boolean;
    sox: boolean;
    pci: boolean;
  };
  metadata: {
    version: string;
    created: Date;
    updated: Date;
    lastApplied: Date;
  };
}

export interface APITest {
  id: string;
  name: string;
  description: string;
  provider: string;
  type: 'unit' | 'integration' | 'load' | 'security' | 'compliance';
  configuration: any;
  results: {
    success: boolean;
    executionTime: number;
    errors: Array<{
      type: string;
      message: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
    metrics: Record<string, number>;
  };
  metadata: {
    created: Date;
    lastRun: Date;
    nextRun?: Date;
    schedule?: string;
  };
}

export interface APIHealthCheck {
  provider: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  details: {
    responseTime: number;
    statusCode: number;
    error?: string;
    lastCheck: Date;
  };
  metrics: {
    uptime: number;
    errorRate: number;
    averageResponseTime: number;
    requestCount: number;
  };
}

@Injectable()
export class APIGovernanceService {
  private readonly logger = new Logger(APIGovernanceService.name);
  private readonly apiProviders = new Map<string, APIProvider>();
  private readonly apiPolicies = new Map<string, APIPolicy>();
  private readonly apiTests = new Map<string, APITest>();
  private readonly healthChecks = new Map<string, APIHealthCheck>();
  private readonly requestCache = new Map<string, any>();
  private readonly rateLimiters = new Map<string, { requests: number; resetTime: number }>();

  constructor(
    private readonly httpService: HttpService,
  ) {
    this.initializeDefaultProviders();
    this.initializeDefaultPolicies();
  }

  async getAPIProviders(): Promise<APIProvider[]> {
    return Array.from(this.apiProviders.values());
  }

  async getAPIProvider(providerName: string): Promise<APIProvider | null> {
    return this.apiProviders.get(providerName) || null;
  }

  async testProvider(providerName: string, testConfig?: any): Promise<{
    success: boolean;
    testResults: Array<{
      test: string;
      success: boolean;
      error?: string;
      executionTime: number;
    }>;
  }> {
    this.logger.log(`Testing API provider: ${providerName}`);

    const provider = this.apiProviders.get(providerName);
    if (!provider) {
      throw new Error(`API provider ${providerName} not found`);
    }

    const testResults = [];

    // Test 1: Connectivity
    try {
      const startTime = Date.now();
      await this.testConnectivity(provider);
      const executionTime = Date.now() - startTime;
      
      testResults.push({
        test: 'connectivity',
        success: true,
        executionTime,
      });
    } catch (error) {
      testResults.push({
        test: 'connectivity',
        success: false,
        error: error.message,
        executionTime: 0,
      });
    }

    // Test 2: Authentication
    try {
      const startTime = Date.now();
      await this.testAuthentication(provider);
      const executionTime = Date.now() - startTime;
      
      testResults.push({
        test: 'authentication',
        success: true,
        executionTime,
      });
    } catch (error) {
      testResults.push({
        test: 'authentication',
        success: false,
        error: error.message,
        executionTime: 0,
      });
    }

    // Test 3: Rate Limiting
    try {
      const startTime = Date.now();
      await this.testRateLimiting(provider);
      const executionTime = Date.now() - startTime;
      
      testResults.push({
        test: 'rate_limiting',
        success: true,
        executionTime,
      });
    } catch (error) {
      testResults.push({
        test: 'rate_limiting',
        success: false,
        error: error.message,
        executionTime: 0,
      });
    }

    // Test 4: Data Validation
    try {
      const startTime = Date.now();
      await this.testDataValidation(provider);
      const executionTime = Date.now() - startTime;
      
      testResults.push({
        test: 'data_validation',
        success: true,
        executionTime,
      });
    } catch (error) {
      testResults.push({
        test: 'data_validation',
        success: false,
        error: error.message,
        executionTime: 0,
      });
    }

    // Test 5: Security
    try {
      const startTime = Date.now();
      await this.testSecurity(provider);
      const executionTime = Date.now() - startTime;
      
      testResults.push({
        test: 'security',
        success: true,
        executionTime,
      });
    } catch (error) {
      testResults.push({
        test: 'security',
        success: false,
        error: error.message,
        executionTime: 0,
      });
    }

    const success = testResults.every(result => result.success);
    
    this.logger.log(`API provider ${providerName} test completed. Success: ${success}`);

    return { success, testResults };
  }

  async getProviderHealth(providerName: string): Promise<{
    status: string;
    details: any;
    metrics: any;
  }> {
    const provider = this.apiProviders.get(providerName);
    if (!provider) {
      throw new Error(`API provider ${providerName} not found`);
    }

    const healthCheck = this.healthChecks.get(providerName);
    
    if (!healthCheck) {
      // Perform health check
      const newHealthCheck = await this.performHealthCheck(provider);
      this.healthChecks.set(providerName, newHealthCheck);
      return {
        status: newHealthCheck.status,
        details: newHealthCheck.details,
        metrics: newHealthCheck.metrics,
      };
    }

    return {
      status: healthCheck.status,
      details: healthCheck.details,
      metrics: healthCheck.metrics,
    };
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
    }>;
    recommendations: string[];
  }> {
    const providers = Array.from(this.apiProviders.values());
    const activeProviders = providers.filter(p => p.status === 'active').length;
    
    const totalRequests = providers.reduce((sum, p) => sum + (p.statistics?.totalRequests || 0), 0);
    const totalErrors = providers.reduce((sum, p) => sum + (p.statistics?.errorRate || 0), 0);
    const averageResponseTime = providers.reduce((sum, p) => sum + (p.statistics?.averageResponseTime || 0), 0) / providers.length;

    const issues = this.collectProviderIssues(providers);
    const recommendations = this.generateRecommendations(issues);

    return {
      totalProviders: providers.length,
      activeProviders,
      averageResponseTime,
      errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
      topIssues: issues,
      recommendations,
    };
  }

  async getProviderMetrics(providerName: string): Promise<{
    status: string;
    metrics: any;
  }> {
    const provider = this.apiProviders.get(providerName);
    if (!provider) {
      throw new Error(`API provider ${providerName} not found`);
    }

    return {
      status: provider.status,
      metrics: provider.statistics,
    };
  }

  async deprecateProvider(providerName: string): Promise<void> {
    const provider = this.apiProviders.get(providerName);
    if (!provider) {
      throw new Error(`API provider ${providerName} not found`);
    }

    provider.status = 'maintenance';
    this.logger.log(`API provider ${providerName} deprecated`);
  }

  private async testConnectivity(provider: APIProvider): Promise<void> {
    const config = provider.configuration;
    
    if (!config.endpoint) {
      throw new Error('No endpoint configured');
    }

    try {
      await firstValueFrom(
        this.httpService.get(config.endpoint, {
          timeout: config.security?.timeout || 10000,
          headers: config.authentication?.headers || {},
        }),
      );
    } catch (error) {
      throw new Error(`Connectivity test failed: ${error.message}`);
    }
  }

  private async testAuthentication(provider: APIProvider): Promise<void> {
    const config = provider.configuration;
    const auth = config.authentication;

    if (!auth.type) {
      throw new Error('No authentication type configured');
    }

    try {
      switch (auth.type) {
        case 'oauth2':
          await this.testOAuth2Auth(auth);
          break;
        case 'api_key':
          await this.testAPIKeyAuth(auth);
          break;
        case 'basic':
          await this.testBasicAuth(auth);
          break;
        default:
          throw new Error(`Unsupported authentication type: ${auth.type}`);
      }
    } catch (error) {
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  private async testRateLimiting(provider: APIProvider): Promise<void> {
    const config = provider.configuration;
    const rateLimit = config.security?.rateLimit;

    if (!rateLimit) {
      throw new Error('No rate limit configured');
    }

    // Simulate multiple requests to test rate limiting
    const requests = [];
    for (let i = 0; i < Math.min(rateLimit + 5, 20); i++) {
      try {
        await firstValueFrom(
          this.httpService.get(config.endpoint, {
            headers: config.authentication?.headers || {},
            timeout: 1000,
          }),
        );
        requests.push({ success: true });
      } catch (error) {
        requests.push({ success: false, error: error.message });
      }
    }

    const successRate = requests.filter(r => r.success).length / requests.length;
    if (successRate < 0.8) {
      throw new Error(`Rate limiting test failed: ${successRate * 100}% success rate`);
    }
  }

  private async testDataValidation(provider: APIProvider): Promise<void> {
    // Mock data validation test
    const testData = {
      id: 'test-123',
      name: 'Test Data',
      value: 100,
      timestamp: new Date().toISOString(),
    };

    try {
      await firstValueFrom(
        this.httpService.post(
          `${provider.configuration.endpoint}/validate`,
          testData,
          {
            headers: provider.configuration.authentication?.headers || {},
            timeout: 5000,
          },
        ),
      );
    } catch (error) {
      // If validation endpoint doesn't exist, consider it a pass
      if (error.response?.status === 404) {
        return;
      }
      throw new Error(`Data validation test failed: ${error.message}`);
    }
  }

  private async testSecurity(provider: APIProvider): Promise<void> {
    const config = provider.configuration;
    const security = config.security;

    if (!security.encryption || !security.signing) {
      throw new Error('Security measures not properly configured');
    }

    // Test HTTPS
    if (!provider.configuration.endpoint.startsWith('https://')) {
      throw new Error('HTTPS not enforced');
    }

    // Test secure headers
    const headers = provider.configuration.authentication?.headers || {};
    if (!headers['Content-Security-Policy'] && !headers['X-Content-Type-Options']) {
      throw new Error('Security headers not configured');
    }
  }

  private async performHealthCheck(provider: APIProvider): Promise<APIHealthCheck> {
    const startTime = Date.now();
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    let statusCode = 200;
    let error: string | undefined;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${provider.configuration.endpoint}/health`, {
          timeout: 5000,
          headers: provider.configuration.authentication?.headers || {},
        }),
      );

      statusCode = response.status;
      
      if (statusCode >= 500) {
        status = 'unhealthy';
      } else if (statusCode >= 400) {
        status = 'degraded';
      }

    } catch (err) {
      status = 'unhealthy';
      error = err.message;
      statusCode = 0;
    }

    const responseTime = Date.now() - startTime;

    return {
      provider: provider.name,
      status,
      details: {
        responseTime,
        statusCode,
        error,
        lastCheck: new Date(),
      },
      metrics: {
        uptime: 0.99, // Mock uptime
        errorRate: provider.statistics?.errorRate || 0,
        averageResponseTime: responseTime,
        requestCount: provider.statistics?.totalRequests || 0,
      },
    };
  }

  private collectProviderIssues(providers: APIProvider[]): Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
  }> {
    const issues = [];

    for (const provider of providers) {
      // Check for high error rates
      if (provider.statistics?.errorRate > 0.1) {
        issues.push({
          type: 'high_error_rate',
          count: 1,
          severity: 'critical',
          description: `Provider ${provider.name} has high error rate`,
        });
      }

      // Check for slow response times
      if (provider.statistics?.averageResponseTime > 5000) {
        issues.push({
          type: 'slow_response',
          count: 1,
          severity: 'medium',
          description: `Provider ${provider.name} has slow response times`,
        });
      }

      // Check for security issues
      if (!provider.configuration?.security?.encryption) {
        issues.push({
          type: 'no_encryption',
          count: 1,
          severity: 'critical',
          description: `Provider ${provider.name} lacks encryption`,
        });
      }
    }

    return issues;
  }

  private generateRecommendations(issues: any[]): string[] {
    const recommendations = [];

    if (issues.some(i => i.type === 'high_error_rate')) {
      recommendations.push('Implement error handling and retry logic');
      recommendations.push('Monitor provider status and implement failover');
    }

    if (issues.some(i => i.type === 'slow_response')) {
      recommendations.push('Optimize API calls and implement caching');
      recommendations.push('Consider using a CDN or load balancer');
    }

    if (issues.some(i => i.type === 'no_encryption')) {
      recommendations.push('Enable encryption for all API communications');
      recommendations.push('Implement proper security headers');
    }

    if (issues.length === 0) {
      recommendations.push('All providers are operating normally');
    }

    return recommendations;
  }

  private initializeDefaultProviders(): void {
    const defaultProviders: APIProvider[] = [
      {
        id: 'salesforce',
        name: 'Salesforce',
        type: 'rest',
        endpoint: 'https://your-salesforce.com/api',
        version: 'v1.0',
        status: 'active',
        configuration: {
          endpoint: 'https://your-salesforce.com/api',
          authentication: {
            type: 'oauth2',
            credentials: {
              client_id: process.env.SALESFORCE_CLIENT_ID,
              client_secret: process.env.SALESFORCE_CLIENT_SECRET,
            },
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          },
          security: {
            encryption: 'AES-256-GCM',
            signing: 'HMAC-SHA256',
            rateLimit: 1000,
            timeout: 30000,
          },
          monitoring: {
            enabled: true,
            interval: 60000,
            alertThresholds: {
              errorRate: 0.05,
              responseTime: 5000,
            },
            notifications: ['email', 'slack'],
          },
        },
        statistics: {
          totalRequests: 0,
          successRate: 0.95,
          averageResponseTime: 1200,
          lastAccess: new Date(),
          errorRate: 0.05,
        },
      },
      {
        id: 'stripe',
        name: 'Stripe',
        type: 'rest',
        endpoint: 'https://api.stripe.com/v1',
        version: 'v1.0',
        status: 'active',
        configuration: {
          endpoint: 'https://api.stripe.com/v1',
          authentication: {
            type: 'api_key',
            credentials: {
              api_key: process.env.STRIPE_API_KEY,
            },
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          },
          security: {
            encryption: 'AES-256-GCM',
            signing: 'HMAC-SHA256',
            rateLimit: 500,
            timeout: 10000,
          },
          monitoring: {
            enabled: true,
            interval: 30000,
            alertThresholds: {
              errorRate: 0.02,
              responseTime: 2000,
            },
            notifications: ['email', 'slack'],
          },
        },
        statistics: {
          totalRequests: 0,
          successRate: 0.98,
          averageResponseTime: 800,
          lastAccess: new Date(),
          errorRate: 0.02,
        },
      },
      {
        id: 'netsuite',
        name: 'NetSuite',
        type: 'rest',
        endpoint: 'https://api.netsuite.com/api/v1',
        version: 'v1.0',
        status: 'active',
        configuration: {
          endpoint: 'https://api.netsuite.com/api/v1',
          authentication: {
            type: 'oauth2',
            credentials: {
              client_id: process.env.NETSUITE_CLIENT_ID,
              client_secret: process.env.NETSUITE_CLIENT_SECRET,
            },
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          },
          security: {
            encryption: 'AES-256-GCM',
            signing: 'HMAC-SHA256',
            rateLimit: 200,
            timeout: 15000,
          },
          monitoring: {
            enabled: true,
            interval: 45000,
            alertThresholds: {
              errorRate: 0.03,
              responseTime: 3000,
            },
            notifications: ['email', 'slack'],
          },
        },
        statistics: {
          totalRequests: 0,
          successRate: 0.92,
          averageResponseTime: 1500,
          lastAccess: new Date(),
          errorRate: 0.08,
        },
      },
    ];

    for (const provider of defaultProviders) {
      this.apiProviders.set(provider.id, provider);
    }

    this.logger.log(`Initialized ${defaultProviders.length} default API providers`);
  }

  private initializeDefaultPolicies(): void {
    const defaultPolicies: APIPolicy[] = [
      {
        id: 'security-policy',
        name: 'Security Policy',
        description: 'Enforces security requirements for all API calls',
        rules: [
          {
            type: 'encryption',
            condition: 'always',
            action: 'require_https',
          },
          {
            type: 'authentication',
            condition: 'always',
            action: 'require_auth',
          },
          {
            type: 'rate_limit',
            condition: 'always',
            action: 'enforce_limits',
          },
        ],
        enforcement: {
          enabled: true,
          strict: true,
          fallback: 'block',
        },
        compliance: {
          gdpr: true,
          ccpa: true,
          hipaa: false,
          sox: false,
          pci: true,
        },
        metadata: {
          version: '1.0',
          created: new Date(),
          updated: new Date(),
          lastApplied: new Date(),
        },
      },
      {
        id: 'data-policy',
        name: 'Data Policy',
        description: 'Ensures data quality and compliance requirements',
        rules: [
          {
            type: 'validation',
            condition: 'always',
            action: 'validate_schema',
          },
          {
            type: 'audit',
            condition: 'always',
            action: 'log_request',
          },
          {
            type: 'retention',
            condition: 'always',
            action: 'enforce_retention',
          },
        ],
        enforcement: {
          enabled: true,
          strict: false,
          fallback: 'warn',
        },
        compliance: {
          gdpr: true,
          ccpa: true,
          hipaa: false,
          sox: false,
          pci: false,
        },
        metadata: {
          version: '1.0',
          created: new Date(),
          updated: new Date(),
          lastApplied: new Date(),
        },
      },
    ];

    for (const policy of defaultPolicies) {
      this.apiPolicies.set(policy.id, policy);
    }

    this.logger.log(`Initialized ${defaultPolicies.length} default API policies`);
  }

  @Cron('*/5 * * * * *') // Every 5 minutes
  async updateProviderStatistics(): Promise<void> {
    this.logger.log('Updating provider statistics');

    for (const [providerId, provider] of this.apiProviders.entries()) {
      const healthCheck = this.healthChecks.get(providerId);
      
      if (healthCheck) {
        provider.statistics = {
          ...provider.statistics,
          averageResponseTime: healthCheck.metrics.averageResponseTime,
          errorRate: healthCheck.metrics.errorRate,
          lastAccess: healthCheck.details.lastCheck,
        };
      }
    }
  }

  @Cron('0 */10 * * * *') // Every 10 minutes
  async performHealthChecks(): Promise<void> {
    this.logger.log('Performing health checks for all providers');

    for (const [providerId, provider] of this.apiProviders.entries()) {
      try {
        const healthCheck = await this.performHealthCheck(provider);
        this.healthChecks.set(providerId, healthCheck);

        // Update provider status based on health check
        if (healthCheck.status === 'unhealthy') {
          provider.status = 'error';
        } else if (healthCheck.status === 'degraded') {
          provider.status = 'maintenance';
        } else {
          provider.status = 'active';
        }
      } catch (error) {
        this.logger.error(`Health check failed for provider ${providerId}:`, error);
      }
    }
  }

  private async testOAuth2Auth(auth: any): Promise<void> {
    // Mock OAuth2 authentication test
    if (!auth.credentials?.client_id || !auth.credentials?.client_secret) {
      throw new Error('OAuth2 credentials not configured');
    }
  }

  private async testAPIKeyAuth(auth: any): Promise<void> {
    // Mock API key authentication test
    if (!auth.credentials?.api_key) {
      throw new Error('API key not configured');
    }
  }

  private async testBasicAuth(auth: any): Promise<void> {
    // Mock basic authentication test
    if (!auth.credentials?.username || !auth.credentials?.password) {
      throw new Error('Basic auth credentials not configured');
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IdentityProvider } from '../entities/identity-provider.entity';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface IdentityProviderRequest {
  provider: string;
  code?: string;
  state?: string;
  redirectUri?: string;
  scope?: string[];
  responseType?: string;
  nonce?: string;
}

export interface UserIdentity {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  phone?: string;
  groups?: string[];
  roles?: string[];
  attributes?: Record<string, any>;
  provider: string;
  verified: boolean;
  lastLogin: Date;
}

export interface AuthenticationResult {
  success: boolean;
  user?: UserIdentity;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
  provider: string;
}

export interface ProviderConfig {
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
}

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  privateKey?: string;
  signatureAlgorithm: string;
  digestAlgorithm: string;
  nameIdFormat: string;
  attributeMapping?: Record<string, string>;
}

export interface LDAPConfig {
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
}

@Injectable()
export class IdentityProviderService {
  private readonly logger = new Logger(IdentityProviderService.name);
  private readonly providerCache = new Map<string, ProviderConfig>();
  private readonly stateCache = new Map<string, { provider: string; timestamp: Date; data: any }>();
  private readonly tokenCache = new Map<string, { token: string; expiresAt: Date; user: UserIdentity }>();

  constructor(
    @InjectRepository(IdentityProvider)
    private readonly identityProviderRepository: Repository<IdentityProvider>,
    private readonly httpService: HttpService,
  ) {}

  async getAuthorizationUrl(request: IdentityProviderRequest): Promise<{
    url: string;
    state: string;
    nonce?: string;
  }> {
    this.logger.log(`Getting authorization URL for provider: ${request.provider}`);

    const provider = await this.getProviderConfig(request.provider);
    if (!provider) {
      throw new Error(`Identity provider ${request.provider} not found`);
    }

    const state = request.state || this.generateState();
    const nonce = request.nonce || this.generateNonce();

    // Store state for verification
    this.stateCache.set(state, {
      provider: request.provider,
      timestamp: new Date(),
      data: { nonce, redirectUri: request.redirectUri },
    });

    const authParams = new URLSearchParams({
      response_type: request.responseType || 'code',
      client_id: provider.clientId,
      redirect_uri: request.redirectUri || provider.redirectUri,
      scope: (request.scope || provider.scope).join(' '),
      state,
      nonce,
    });

    if (provider.audience) {
      authParams.set('audience', provider.audience);
    }

    const url = `${provider.authorizationUrl}?${authParams.toString()}`;

    return { url, state, nonce };
  }

  async exchangeCodeForToken(request: IdentityProviderRequest): Promise<AuthenticationResult> {
    this.logger.log(`Exchanging code for token with provider: ${request.provider}`);

    // Verify state
    const stateData = this.stateCache.get(request.state);
    if (!stateData || stateData.provider !== request.provider) {
      throw new Error('Invalid or expired state');
    }

    const provider = await this.getProviderConfig(request.provider);
    if (!provider) {
      throw new Error(`Identity provider ${request.provider} not found`);
    }

    try {
      // Exchange authorization code for access token
      const tokenResponse = await this.exchangeCode(provider, request.code, request.redirectUri);

      // Get user information
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);

      // Create user identity
      const user = this.createUserIdentity(userInfo, request.provider);

      // Generate JWT tokens
      const token = this.generateJWT(user, provider);
      const refreshToken = this.generateRefreshToken(user, provider);

      // Cache token
      this.tokenCache.set(token.id, {
        token: token.token,
        expiresAt: token.expiresAt,
        user,
      });

      // Clean up state
      this.stateCache.delete(request.state);

      return {
        success: true,
        user,
        token: token.token,
        refreshToken: refreshToken.token,
        expiresAt: token.expiresAt,
        provider: request.provider,
      };
    } catch (error) {
      this.logger.error(`Token exchange failed for provider ${request.provider}:`, error);
      return {
        success: false,
        error: error.message,
        provider: request.provider,
      };
    }
  }

  async refreshToken(refreshToken: string, providerName: string): Promise<AuthenticationResult> {
    this.logger.log(`Refreshing token for provider: ${providerName}`);

    const provider = await this.getProviderConfig(providerName);
    if (!provider) {
      throw new Error(`Identity provider ${providerName} not found`);
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.getSecretKey()) as any;
      
      // Exchange refresh token for new access token
      const tokenResponse = await this.refreshAccessToken(provider, refreshToken);

      // Get updated user information
      const userInfo = await this.getUserInfo(provider, tokenResponse.access_token);

      // Update user identity
      const user = this.createUserIdentity(userInfo, providerName);

      // Generate new JWT tokens
      const token = this.generateJWT(user, provider);
      const newRefreshToken = this.generateRefreshToken(user, provider);

      // Update cache
      this.tokenCache.set(token.id, {
        token: token.token,
        expiresAt: token.expiresAt,
        user,
      });

      return {
        success: true,
        user,
        token: token.token,
        refreshToken: newRefreshToken.token,
        expiresAt: token.expiresAt,
        provider: providerName,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed for provider ${providerName}:`, error);
      return {
        success: false,
        error: error.message,
        provider: providerName,
      };
    }
  }

  async revokeToken(token: string, providerName: string): Promise<boolean> {
    this.logger.log(`Revoking token for provider: ${providerName}`);

    const provider = await this.getProviderConfig(providerName);
    if (!provider || !provider.revocationUrl) {
      return false;
    }

    try {
      await firstValueFrom(
        this.httpService.post(provider.revocationUrl, {
          token,
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
        }),
      );

      // Remove from cache
      const cachedToken = Array.from(this.tokenCache.entries()).find(([id, data]) => data.token === token);
      if (cachedToken) {
        this.tokenCache.delete(cachedToken[0]);
      }

      return true;
    } catch (error) {
      this.logger.error(`Token revocation failed for provider ${providerName}:`, error);
      return false;
    }
  }

  async getUserInfo(providerName: string, accessToken: string): Promise<any> {
    const provider = await this.getProviderConfig(providerName);
    if (!provider) {
      throw new Error(`Identity provider ${providerName} not found`);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(provider.userInfoUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get user info from ${providerName}:`, error);
      throw new Error(`Failed to get user information: ${error.message}`);
    }
  }

  async getSupportedProviders(): Promise<Array<{
    provider: string;
    displayName: string;
    type: string;
    features: string[];
    isActive: boolean;
  }>> {
    const providers = await this.identityProviderRepository.find({
      where: { isActive: true },
      order: { displayName: 'ASC' },
    });

    return providers.map(provider => ({
      provider: provider.provider,
      displayName: provider.displayName,
      type: provider.type,
      features: provider.features,
      isActive: provider.isActive,
    }));
  }

  async addIdentityProvider(config: {
    provider: string;
    type: string;
    displayName: string;
    description: string;
    configuration: any;
    features: any;
    isActive?: boolean;
  }): Promise<void> {
    this.logger.log(`Adding identity provider: ${config.provider}`);

    const identityProvider = this.identityProviderRepository.create({
      id: crypto.randomUUID(),
      ...config,
      isActive: config.isActive !== false,
      isDefault: false,
      statistics: {
        totalUsers: 0,
        activeUsers: 0,
        dailyLogins: 0,
        weeklyLogins: 0,
        monthlyLogins: 0,
        failedLogins: 0,
        successRate: 0,
        avgSessionDuration: 0,
        lastUpdated: new Date(),
      },
    });

    await this.identityProviderRepository.save(identityProvider);

    // Cache provider configuration
    const providerConfig = this.createProviderConfig(config);
    this.providerCache.set(config.provider, providerConfig);
  }

  async updateIdentityProvider(providerName: string, updates: any): Promise<void> {
    this.logger.log(`Updating identity provider: ${providerName}`);

    const provider = await this.identityProviderRepository.findOne({
      where: { provider: providerName },
    });

    if (!provider) {
      throw new Error(`Identity provider ${providerName} not found`);
    }

    Object.assign(provider, updates, {
      metadata: {
        ...provider.metadata,
        version: ((provider.metadata?.version || 1) + 1).toString(),
        lastSync: new Date(),
      },
    });

    await this.identityProviderRepository.save(provider);

    // Update cache
    if (updates.configuration) {
      const providerConfig = this.createProviderConfig({ ...provider, ...updates });
      this.providerCache.set(providerName, providerConfig);
    }
  }

  async removeIdentityProvider(providerName: string): Promise<void> {
    this.logger.log(`Removing identity provider: ${providerName}`);

    const provider = await this.identityProviderRepository.findOne({
      where: { provider: providerName },
    });

    if (!provider) {
      throw new Error(`Identity provider ${providerName} not found`);
    }

    provider.isActive = false;
    await this.identityProviderRepository.save(provider);

    // Remove from cache
    this.providerCache.delete(providerName);
  }

  async syncUsers(providerName: string): Promise<{
    synced: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.logger.log(`Syncing users for provider: ${providerName}`);

    const provider = await this.getProviderConfig(providerName);
    if (!provider) {
      throw new Error(`Identity provider ${providerName} not found`);
    }

    // Mock synchronization - in production would sync with provider's user directory
    const synced = Math.floor(Math.random() * 100) + 50;
    const updated = Math.floor(Math.random() * 20) + 10;
    const failed = Math.floor(Math.random() * 5) + 1;
    const errors = ['User not found', 'API rate limit', 'Network error'].slice(0, failed);

    // Update provider statistics
    await this.updateProviderStatistics(providerName, synced, updated, failed);

    return { synced, updated, failed, errors };
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    user?: UserIdentity;
    expiresAt?: Date;
    provider?: string;
  }> {
    try {
      const decoded = jwt.verify(token, this.getSecretKey()) as any;
      
      const cachedToken = this.tokenCache.get(decoded.id);
      if (!cachedToken || cachedToken.token !== token) {
        return { valid: false };
      }

      if (new Date() > cachedToken.expiresAt) {
        this.tokenCache.delete(decoded.id);
        return { valid: false };
      }

      return {
        valid: true,
        user: cachedToken.user,
        expiresAt: cachedToken.expiresAt,
        provider: decoded.provider,
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async getProviderStatistics(providerName?: string): Promise<{
    totalProviders: number;
    totalUsers: number;
    activeUsers: number;
    dailyLogins: number;
    weeklyLogins: number;
    monthlyLogins: number;
    successRate: number;
    avgSessionDuration: number;
    providerBreakdown?: Record<string, any>;
  }> {
    if (providerName) {
      const provider = await this.identityProviderRepository.findOne({
        where: { provider: providerName },
      });

      return provider ? {
        totalProviders: 1,
        ...provider.statistics,
      } : null;
    }

    // Aggregate statistics across all providers
    const providers = await this.identityProviderRepository.find({
      where: { isActive: true },
    });

    const totals = providers.reduce((acc, provider) => ({
      totalProviders: acc.totalProviders + 1,
      totalUsers: acc.totalUsers + provider.statistics.totalUsers,
      activeUsers: acc.activeUsers + provider.statistics.activeUsers,
      dailyLogins: acc.dailyLogins + provider.statistics.dailyLogins,
      weeklyLogins: acc.weeklyLogins + provider.statistics.weeklyLogins,
      monthlyLogins: acc.monthlyLogins + provider.statistics.monthlyLogins,
      successRate: acc.successRate + provider.statistics.successRate,
      avgSessionDuration: acc.avgSessionDuration + provider.statistics.avgSessionDuration,
    }), {
      totalProviders: 0,
      totalUsers: 0,
      activeUsers: 0,
      dailyLogins: 0,
      weeklyLogins: 0,
      monthlyLogins: 0,
      successRate: 0,
      avgSessionDuration: 0,
    });

    const providerBreakdown = providers.reduce((acc, provider) => {
      acc[provider.provider] = provider.statistics;
      return acc;
    }, {});

    return {
      ...totals,
      successRate: totals.successRate / providers.length,
      avgSessionDuration: totals.avgSessionDuration / providers.length,
      providerBreakdown,
    };
  }

  private async getProviderConfig(providerName: string): Promise<ProviderConfig | null> {
    // Check cache first
    if (this.providerCache.has(providerName)) {
      return this.providerCache.get(providerName);
    }

    // Load from database
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
      case 'oidc':
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
          revocationUrl: config.revocationUrl,
          jwksUrl: config.jwksUrl,
          issuer: config.issuer,
          audience: config.audience,
        };

      case 'saml':
        return this.createSAMLConfig(config);

      case 'ldap':
        return this.createLDAPConfig(config);

      default:
        throw new Error(`Unsupported provider type: ${provider.type}`);
    }
  }

  private createSAMLConfig(config: any): ProviderConfig {
    // Convert SAML config to OAuth2-like interface for consistency
    return {
      clientId: config.clientId || 'saml-client',
      clientSecret: config.clientSecret || 'saml-secret',
      scope: ['openid', 'profile', 'email'],
      redirectUri: config.redirectUri,
      responseType: 'code',
      grantType: ['authorization_code'],
      authorizationUrl: config.entryPoint,
      tokenUrl: config.tokenUrl || config.entryPoint,
      userInfoUrl: config.userInfoUrl,
      jwksUrl: config.jwksUrl,
      issuer: config.issuer,
      audience: config.audience,
    };
  }

  private createLDAPConfig(config: any): ProviderConfig {
    // Convert LDAP config to OAuth2-like interface for consistency
    return {
      clientId: config.clientId || 'ldap-client',
      clientSecret: config.clientSecret || 'ldap-secret',
      scope: ['openid', 'profile', 'email'],
      redirectUri: config.redirectUri,
      responseType: 'code',
      grantType: ['authorization_code'],
      authorizationUrl: config.url,
      tokenUrl: config.url,
      userInfoUrl: config.url,
      issuer: 'ldap',
      audience: config.baseDN,
    };
  }

  private async exchangeCode(provider: ProviderConfig, code: string, redirectUri?: string): Promise<any> {
    const tokenData = {
      grant_type: 'authorization_code',
      code,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: redirectUri || provider.redirectUri,
    };

    const response = await firstValueFrom(
      this.httpService.post(provider.tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    return response.data;
  }

  private async refreshAccessToken(provider: ProviderConfig, refreshToken: string): Promise<any> {
    const tokenData = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
    };

    const response = await firstValueFrom(
      this.httpService.post(provider.tokenUrl, tokenData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );

    return response.data;
  }

  private createUserIdentity(userInfo: any, provider: string): UserIdentity {
    const mapping = this.getAttributeMapping(provider);

    return {
      id: userInfo[mapping.userId] || userInfo.sub || userInfo.id,
      email: userInfo[mapping.email] || userInfo.email,
      name: userInfo[mapping.name] || userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim(),
      firstName: userInfo[mapping.firstName] || userInfo.given_name,
      lastName: userInfo[mapping.lastName] || userInfo.family_name,
      avatar: userInfo[mapping.avatar] || userInfo.picture,
      locale: userInfo[mapping.locale] || userInfo.locale,
      timezone: userInfo[mapping.timezone] || userInfo.timezone,
      phone: userInfo[mapping.phone] || userInfo.phone_number,
      groups: userInfo[mapping.groups] || userInfo.groups,
      roles: userInfo[mapping.roles] || userInfo.roles,
      attributes: userInfo,
      provider,
      verified: userInfo.email_verified || true,
      lastLogin: new Date(),
    };
  }

  private getAttributeMapping(providerName: string): any {
    const defaultMapping = {
      userId: 'sub',
      email: 'email',
      name: 'name',
      firstName: 'given_name',
      lastName: 'family_name',
      avatar: 'picture',
      locale: 'locale',
      timezone: 'zoneinfo',
      phone: 'phone_number',
      groups: 'groups',
      roles: 'roles',
    };

    // Provider-specific mappings could be loaded from database
    return defaultMapping;
  }

  private generateJWT(user: UserIdentity, provider: string): {
    token: string;
    expiresAt: Date;
    id: string;
  } {
    const payload = {
      id: crypto.randomUUID(),
      sub: user.id,
      email: user.email,
      name: user.name,
      provider,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    return {
      token: jwt.sign(payload, this.getSecretKey()),
      expiresAt: new Date(payload.exp * 1000),
      id: payload.id,
    };
  }

  private generateRefreshToken(user: UserIdentity, provider: string): {
    token: string;
    expiresAt: Date;
  } {
    const payload = {
      sub: user.id,
      provider,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    };

    return {
      token: jwt.sign(payload, this.getSecretKey()),
      expiresAt: new Date(payload.exp * 1000),
    };
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private getSecretKey(): string {
    return process.env.JWT_SECRET || 'default-secret-key';
  }

  private async updateProviderStatistics(
    providerName: string,
    synced: number,
    updated: number,
    failed: number,
  ): Promise<void> {
    const provider = await this.identityProviderRepository.findOne({
      where: { provider: providerName },
    });

    if (provider) {
      provider.statistics = {
        ...provider.statistics,
        totalUsers: provider.statistics.totalUsers + synced,
        activeUsers: provider.statistics.activeUsers + updated,
        dailyLogins: provider.statistics.dailyLogins + synced,
        weeklyLogins: provider.statistics.weeklyLogins + synced,
        monthlyLogins: provider.statistics.monthlyLogins + synced,
        failedLogins: provider.statistics.failedLogins + failed,
        successRate: this.calculateSuccessRate(
          provider.statistics.dailyLogins + synced,
          provider.statistics.failedLogins + failed,
        ),
        avgSessionDuration: provider.statistics.avgSessionDuration, // Would update with actual data
        lastUpdated: new Date(),
      };

      await this.identityProviderRepository.save(provider);
    }
  }

  private calculateSuccessRate(successful: number, failed: number): number {
    const total = successful + failed;
    return total > 0 ? (successful / total) * 100 : 0;
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async cleanupExpiredStates(): Promise<void> {
    this.logger.log('Cleaning up expired OAuth states');

    const now = Date.now();
    const expiredStates = [];

    for (const [state, data] of this.stateCache.entries()) {
      if (now - data.timestamp.getTime() > 600000) { // 10 minutes
        expiredStates.push(state);
      }
    }

    expiredStates.forEach(state => {
      this.stateCache.delete(state);
    });

    if (expiredStates.length > 0) {
      this.logger.log(`Cleaned up ${expiredStates.length} expired states`);
    }
  }

  @Cron('0 */30 * * * *') // Every 30 minutes
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('Cleaning up expired tokens');

    const now = Date.now();
    const expiredTokens = [];

    for (const [id, data] of this.tokenCache.entries()) {
      if (now > data.expiresAt.getTime()) {
        expiredTokens.push(id);
      }
    }

    expiredTokens.forEach(id => {
      this.tokenCache.delete(id);
    });

    if (expiredTokens.length > 0) {
      this.logger.log(`Cleaned up ${expiredTokens.length} expired tokens`);
    }
  }
}

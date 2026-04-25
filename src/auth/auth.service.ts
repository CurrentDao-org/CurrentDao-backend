import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  MfaSetupDto,
  MfaVerifyDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  CreateApiKeyDto,
  AuthResponseDto,
  UserResponseDto,
  SessionDto,
  ApiKeyDto,
  AuditLogDto,
  Role,
  MfaType,
} from './dto/auth.dto';
import { MfaService } from './mfa/mfa.service';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: Role;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface Session {
  id: string;
  userId: string;
  deviceType: string;
  userAgent: string;
  ipAddress: string;
  createdAt: Date;
  lastActiveAt: Date;
  isActive: boolean;
  refreshToken: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  keyHash: string;
  permissions: string[];
  rateLimit: number;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  lastUsedAt?: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  details?: any;
  errorMessage?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly users = new Map<string, User>();
  private readonly sessions = new Map<string, Session>();
  private readonly apiKeys = new Map<string, ApiKey>();
  private readonly auditLogs = new Map<string, AuditLog[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly mfaService: MfaService,
  ) {
    this.initializeSampleData();
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log(`Registering new user: ${registerDto.email}`);

    // Check if user already exists
    if (this.users.has(registerDto.email)) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user: User = {
      id: this.generateUserId(),
      email: registerDto.email,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      passwordHash,
      role: registerDto.role || Role.USER,
      emailVerified: false,
      mfaEnabled: false,
      phoneNumber: registerDto.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(user.email, user);

    // Log audit event
    await this.logAuditEvent(user.id, 'USER_REGISTERED', 'auth', '', '', true);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    await this.createSession(user.id, 'web', '', '', tokens.refreshToken);

    return {
      ...tokens,
      user: this.mapUserToResponse(user),
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log(`Login attempt for user: ${loginDto.email}`);

    // Find user
    const user = this.users.get(loginDto.email);
    if (!user) {
      await this.logAuditEvent('', 'LOGIN_FAILED', 'auth', '', '', false, { email: loginDto.email }, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.logAuditEvent(user.id, 'LOGIN_FAILED', 'auth', '', '', false, {}, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check MFA if enabled
    if (user.mfaEnabled && !loginDto.mfaCode) {
      return {
        accessToken: '',
        refreshToken: '',
        expiresIn: 0,
        user: this.mapUserToResponse(user),
        requiresMfa: true,
        availableMfaMethods: await this.getAvailableMfaMethods(user.id),
      };
    }

    // Verify MFA code if provided
    if (user.mfaEnabled && loginDto.mfaCode) {
      const mfaValid = await this.verifyMfaCode(user.id, loginDto.mfaCode);
      if (!mfaValid) {
        await this.logAuditEvent(user.id, 'MFA_FAILED', 'auth', '', '', false, {}, 'Invalid MFA code');
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Update last login
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Create session
    await this.createSession(user.id, loginDto.deviceType || 'web', loginDto.userAgent || '', '', tokens.refreshToken);

    // Log successful login
    await this.logAuditEvent(user.id, 'LOGIN_SUCCESS', 'auth', '', '', true);

    return {
      ...tokens,
      user: this.mapUserToResponse(user),
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<any> {
    this.logger.log('Token refresh request');

    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
      
      // Find session
      const session = Array.from(this.sessions.values()).find(s => s.refreshToken === refreshTokenDto.refreshToken);
      if (!session || !session.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Find user
      const user = Array.from(this.users.values()).find(u => u.id === session.userId);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update session
      session.refreshToken = tokens.refreshToken;
      session.lastActiveAt = new Date();

      await this.logAuditEvent(user.id, 'TOKEN_REFRESHED', 'auth', '', '', true);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<any> {
    this.logger.log(`Logout request for user: ${userId}`);

    // Deactivate all user sessions
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId && s.isActive);
    for (const session of userSessions) {
      session.isActive = false;
    }

    await this.logAuditEvent(userId, 'LOGOUT_SUCCESS', 'auth', '', '', true);

    return { message: 'Logout successful' };
  }

  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapUserToResponse(user);
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<any> {
    this.logger.log(`Password change request for user: ${userId}`);

    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      await this.logAuditEvent(userId, 'PASSWORD_CHANGE_FAILED', 'auth', '', '', false, {}, 'Invalid current password');
      throw new UnauthorizedException('Invalid current password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(changePasswordDto.newPassword, 12);
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();

    // Revoke all sessions except current
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === userId && s.isActive);
    for (const session of userSessions.slice(1)) {
      session.isActive = false;
    }

    await this.logAuditEvent(userId, 'PASSWORD_CHANGED', 'auth', '', '', true);

    return { message: 'Password changed successfully' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<any> {
    this.logger.log(`Password reset request for: ${forgotPasswordDto.email}`);

    const user = this.users.get(forgotPasswordDto.email);
    if (!user) {
      // Don't reveal that user doesn't exist
      return { message: 'Password reset email sent' };
    }

    // Generate reset token (in real implementation, send email)
    const resetToken = this.generateResetToken();
    
    await this.logAuditEvent(user.id, 'PASSWORD_RESET_REQUESTED', 'auth', '', '', true, { email: forgotPasswordDto.email });

    return { message: 'Password reset email sent', resetToken }; // In production, don't return token
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<any> {
    this.logger.log('Password reset with token');

    // In real implementation, verify reset token and find user
    // For demo, we'll find user by some logic
    const user = Array.from(this.users.values()).find(u => u.email.includes('example')); // Demo logic
    
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(resetPasswordDto.newPassword, 12);
    user.passwordHash = newPasswordHash;
    user.updatedAt = new Date();

    // Revoke all sessions
    const userSessions = Array.from(this.sessions.values()).filter(s => s.userId === user.id);
    for (const session of userSessions) {
      session.isActive = false;
    }

    await this.logAuditEvent(user.id, 'PASSWORD_RESET_COMPLETED', 'auth', '', '', true);

    return { message: 'Password reset successful' };
  }

  async setupMfa(userId: string, mfaSetupDto: MfaSetupDto): Promise<any> {
    this.logger.log(`MFA setup request for user: ${userId}`);

    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mfaService.setupMfa(userId, mfaSetupDto);
  }

  async verifyMfa(userId: string, mfaVerifyDto: MfaVerifyDto): Promise<any> {
    this.logger.log(`MFA verification for user: ${userId}`);

    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isValid = await this.mfaService.verifyMfa(userId, mfaVerifyDto.code);
    
    if (isValid) {
      user.mfaEnabled = true;
      user.updatedAt = new Date();
      await this.logAuditEvent(userId, 'MFA_ENABLED', 'auth', '', '', true);
      return { message: 'MFA verification successful' };
    } else {
      await this.logAuditEvent(userId, 'MFA_VERIFICATION_FAILED', 'auth', '', '', false);
      throw new UnauthorizedException('Invalid MFA code');
    }
  }

  async disableMfa(userId: string): Promise<any> {
    this.logger.log(`MFA disable request for user: ${userId}`);

    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.mfaEnabled = false;
    user.mfaSecret = undefined;
    user.updatedAt = new Date();

    await this.logAuditEvent(userId, 'MFA_DISABLED', 'auth', '', '', true);

    return { message: 'MFA disabled successfully' };
  }

  async getMfaQrCode(userId: string): Promise<any> {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mfaService.generateQrCode(userId, user.email);
  }

  async getActiveSessions(userId: string): Promise<SessionDto[]> {
    const sessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.isActive)
      .map(s => this.mapSessionToDto(s));

    return sessions;
  }

  async revokeSession(userId: string, sessionId: string): Promise<any> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    session.isActive = false;
    session.lastActiveAt = new Date();

    await this.logAuditEvent(userId, 'SESSION_REVOKED', 'auth', '', '', true, { sessionId });

    return { message: 'Session revoked successfully' };
  }

  async oauthLogin(provider: string): Promise<any> {
    this.logger.log(`OAuth login request for provider: ${provider}`);

    // In real implementation, redirect to OAuth provider
    const oauthUrl = `https://oauth.${provider}.com/authorize?client_id=...&redirect_uri=...`;
    
    return { oauthUrl };
  }

  async oauthCallback(provider: string, code: string, state: string): Promise<any> {
    this.logger.log(`OAuth callback for provider: ${provider}`);

    // In real implementation, exchange code for access token and get user info
    // For demo, we'll simulate OAuth user creation/login
    const oauthUser = {
      email: `oauth_user_${provider}@example.com`,
      firstName: 'OAuth',
      lastName: 'User',
    };

    let user = this.users.get(oauthUser.email);
    if (!user) {
      // Create new user from OAuth
      user = {
        id: this.generateUserId(),
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        passwordHash: '', // OAuth users don't have passwords
        role: Role.USER,
        emailVerified: true,
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(user.email, user);
    }

    const tokens = await this.generateTokens(user);
    await this.createSession(user.id, 'oauth', '', '', tokens.refreshToken);

    await this.logAuditEvent(user.id, 'OAUTH_LOGIN_SUCCESS', 'auth', '', '', true, { provider });

    return {
      ...tokens,
      user: this.mapUserToResponse(user),
    };
  }

  async getApiKeys(userId: string): Promise<ApiKeyDto[]> {
    const apiKeys = Array.from(this.apiKeys.values())
      .filter(k => k.userId === userId && k.isActive)
      .map(k => this.mapApiKeyToDto(k));

    return apiKeys;
  }

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto): Promise<ApiKeyDto> {
    this.logger.log(`API key creation request for user: ${userId}`);

    const apiKey: ApiKey = {
      id: this.generateApiKeyId(),
      userId,
      name: createApiKeyDto.name,
      key: this.generateApiKey(),
      keyHash: '', // In real implementation, hash the key
      permissions: createApiKeyDto.permissions || ['read'],
      rateLimit: createApiKeyDto.rateLimit || 1000,
      createdAt: new Date(),
      expiresAt: createApiKeyDto.expiresAt ? new Date(createApiKeyDto.expiresAt) : undefined,
      isActive: true,
    };

    this.apiKeys.set(apiKey.id, apiKey);

    await this.logAuditEvent(userId, 'API_KEY_CREATED', 'auth', '', '', true, { keyId: apiKey.id });

    return this.mapApiKeyToDto(apiKey);
  }

  async deleteApiKey(userId: string, keyId: string): Promise<any> {
    this.logger.log(`API key deletion request: ${keyId} for user: ${userId}`);

    const apiKey = this.apiKeys.get(keyId);
    if (!apiKey || apiKey.userId !== userId) {
      throw new BadRequestException('API key not found');
    }

    apiKey.isActive = false;

    await this.logAuditEvent(userId, 'API_KEY_DELETED', 'auth', '', '', true, { keyId });

    return { message: 'API key deleted successfully' };
  }

  async getAuditLog(
    userId: string,
    page: number,
    limit: number,
    startDate?: string,
    endDate?: string,
  ): Promise<{ logs: AuditLogDto[], total: number }> {
    const userLogs = this.auditLogs.get(userId) || [];
    
    let filteredLogs = userLogs;
    
    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp <= end);
    }

    const total = filteredLogs.length;
    const startIndex = (page - 1) * limit;
    const paginatedLogs = filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(startIndex, startIndex + limit)
      .map(log => this.mapAuditLogToDto(log));

    return { logs: paginatedLogs, total };
  }

  private async generateTokens(user: User): Promise<{ accessToken: string, refreshToken: string, expiresIn: number }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
    };
  }

  private async createSession(
    userId: string,
    deviceType: string,
    userAgent: string,
    ipAddress: string,
    refreshToken: string,
  ): Promise<void> {
    const session: Session = {
      id: this.generateSessionId(),
      userId,
      deviceType,
      userAgent,
      ipAddress,
      createdAt: new Date(),
      lastActiveAt: new Date(),
      isActive: true,
      refreshToken,
    };

    this.sessions.set(session.id, session);

    // Check session limit (max 3 concurrent sessions)
    const userSessions = Array.from(this.sessions.values())
      .filter(s => s.userId === userId && s.isActive)
      .sort((a, b) => b.lastActiveAt.getTime() - a.lastActiveAt.getTime());

    if (userSessions.length > 3) {
      // Deactivate oldest session
      const oldestSession = userSessions[userSessions.length - 1];
      oldestSession.isActive = false;
    }
  }

  private async verifyMfaCode(userId: string, code: string): Promise<boolean> {
    return this.mfaService.verifyMfa(userId, code);
  }

  private async getAvailableMfaMethods(userId: string): Promise<MfaType[]> {
    return this.mfaService.getAvailableMethods(userId);
  }

  private async logAuditEvent(
    userId: string,
    action: string,
    resource: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    details?: any,
    errorMessage?: string,
  ): Promise<void> {
    const auditLog: AuditLog = {
      id: this.generateAuditLogId(),
      userId,
      action,
      resource,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      success,
      details,
      errorMessage,
    };

    const userLogs = this.auditLogs.get(userId) || [];
    userLogs.push(auditLog);
    this.auditLogs.set(userId, userLogs);
  }

  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      lastLoginAt: user.lastLoginAt?.toISOString(),
    };
  }

  private mapSessionToDto(session: Session): SessionDto {
    return {
      id: session.id,
      deviceType: session.deviceType,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      isActive: session.isActive,
    };
  }

  private mapApiKeyToDto(apiKey: ApiKey): ApiKeyDto {
    const now = new Date();
    const lastUsedDaysAgo = apiKey.lastUsedAt 
      ? Math.floor((now.getTime() - apiKey.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: apiKey.key,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      createdAt: apiKey.createdAt.toISOString(),
      expiresAt: apiKey.expiresAt?.toISOString(),
      isActive: apiKey.isActive,
      lastUsedDaysAgo,
    };
  }

  private mapAuditLogToDto(log: AuditLog): AuditLogDto {
    return {
      id: log.id,
      action: log.action,
      resource: log.resource,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      timestamp: log.timestamp.toISOString(),
      success: log.success,
      details: log.details,
      errorMessage: log.errorMessage,
    };
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateApiKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateApiKey(): string {
    return `ak_live_${Math.random().toString(36).substr(2, 32)}`;
  }

  private generateResetToken(): string {
    return `reset_${Math.random().toString(36).substr(2, 32)}`;
  }

  private generateAuditLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSampleData(): void {
    // Initialize with sample user
    const sampleUser: User = {
      id: 'user_001',
      email: 'demo@example.com',
      firstName: 'Demo',
      lastName: 'User',
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6QJf/8Ee7a', // 'DemoUser123!'
      role: Role.USER,
      emailVerified: true,
      mfaEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(sampleUser.email, sampleUser);
  }
}

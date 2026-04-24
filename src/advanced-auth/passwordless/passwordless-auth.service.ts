import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WebAuthnCredential } from '../entities/webauthn-credential.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

export interface WebAuthnRegistrationRequest {
  userId: string;
  username: string;
  displayName: string;
  authenticatorSelection?: any;
  attestation?: string;
  extensions?: any;
}

export interface WebAuthnAuthenticationRequest {
  userId: string;
  userVerification?: 'required' | 'preferred' | 'discouraged';
  allowCredentials?: any[];
  userPresence?: 'required' | 'preferred' | 'discouraged';
}

export interface WebAuthnRegistrationResult {
  credentialId: string;
  type: string;
  publicKey: string;
  algorithm: string;
  transports: string[];
  authenticator: any;
  registrationTime: number;
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
}

export interface WebAuthnAuthenticationResult {
  authenticated: boolean;
  credentialId: string;
  authenticator: any;
  authenticationTime: number;
  userVerified: boolean;
  signatureCounter: number;
  securityFlags: {
    userPresent: boolean;
    userVerified: boolean;
    backupEligible: boolean;
    backupState: boolean;
  };
}

export interface PasswordlessOptions {
  enableWebAuthn: boolean;
  enableMagicLinks: boolean;
  enableBiometrics: boolean;
  enableOTP: boolean;
  sessionTimeout: number;
  maxAttempts: number;
  requireUserVerification: boolean;
  allowedAuthenticators: string[];
}

@Injectable()
export class PasswordlessAuthService {
  private readonly logger = new Logger(PasswordlessAuthService.name);
  private readonly rpId = process.env.WEBAUTHN_RP_ID || 'localhost';
  private readonly rpName = process.env.WEBAUTHN_RP_NAME || 'CurrentDao';
  private readonly rpOrigin = process.env.WEBAUTHN_RP_ORIGIN || 'https://localhost:3000';
  private readonly challengeTimeout = 60000; // 1 minute
  private readonly challengeCache = new Map<string, { challenge: string; timestamp: Date; userId: string }>();

  constructor(
    @InjectRepository(WebAuthnCredential)
    private readonly webAuthnCredentialRepository: Repository<WebAuthnCredential>,
    private readonly httpService: HttpService,
  ) {}

  async generateRegistrationOptions(request: WebAuthnRegistrationRequest): Promise<{
    options: any;
    challenge: string;
  }> {
    this.logger.log(`Generating WebAuthn registration options for user ${request.userId}`);

    const challenge = this.generateChallenge();
    const options = {
      rp: {
        id: this.rpId,
        name: this.rpName,
      },
      user: {
        id: Buffer.from(request.userId).toString('base64url'),
        name: request.username,
        displayName: request.displayName,
      },
      challenge: challenge,
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
        { alg: -8, type: 'public-key' }, // Ed25519
      ],
      authenticatorSelection: request.authenticatorSelection || {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      attestation: request.attestation || 'direct',
      extensions: request.extensions || {},
      timeout: this.challengeTimeout,
    };

    // Store challenge for verification
    this.challengeCache.set(challenge, {
      challenge,
      timestamp: new Date(),
      userId: request.userId,
    });

    this.logger.log(`WebAuthn registration options generated with challenge: ${challenge}`);

    return { options, challenge };
  }

  async verifyRegistration(
    credential: any,
    expectedChallenge: string,
    expectedUserId: string,
  ): Promise<WebAuthnRegistrationResult> {
    this.logger.log('Verifying WebAuthn registration');

    const startTime = Date.now();

    // Verify challenge
    const cachedChallenge = this.challengeCache.get(expectedChallenge);
    if (!cachedChallenge || cachedChallenge.userId !== expectedUserId) {
      throw new Error('Invalid or expired challenge');
    }

    // Verify client data
    const clientDataJSON = Buffer.from(credential.response.clientDataJSON, 'base64url').toString();
    const clientData = JSON.parse(clientDataJSON);

    if (clientData.challenge !== expectedChallenge) {
      throw new Error('Challenge mismatch');
    }

    if (clientData.origin !== this.rpOrigin) {
      throw new Error('Origin mismatch');
    }

    if (clientData.type !== 'webauthn.create') {
      throw new Error('Invalid ceremony type');
    }

    // Verify authenticator data
    const authenticatorData = Buffer.from(credential.response.authenticatorData, 'base64url');
    const attestationObject = Buffer.from(credential.response.attestationObject, 'base64url');

    // Parse authenticator data
    const rpIdHash = authenticatorData.slice(0, 32);
    const flags = authenticatorData.readUInt8(32);
    const counter = authenticatorData.readUInt32BE(33);

    const userPresent = !!(flags & 0x01);
    const userVerified = !!(flags & 0x04);
    const backupEligible = !!(flags & 0x08);
    const backupState = !!(flags & 0x10);

    // Verify attestation (simplified - in production, would use proper attestation verification)
    const attestationVerified = await this.verifyAttestation(attestationObject, clientData);

    if (!attestationVerified) {
      throw new Error('Attestation verification failed');
    }

    // Extract public key
    const publicKey = await this.extractPublicKey(attestationObject);

    // Create credential record
    const webAuthnCredential = this.webAuthnCredentialRepository.create({
      id: crypto.randomUUID(),
      userId: expectedUserId,
      credentialId: credential.rawId,
      type: credential.type,
      publicKey: publicKey,
      algorithm: credential.response.publicKeyAlgorithm.toString(),
      transports: credential.response.transports || [],
      authenticator: {
        aaguid: this.extractAAGUID(attestationObject),
        name: this.getAuthenticatorName(credential),
        icon: this.getAuthenticatorIcon(credential),
        isUserVerifying: userVerified,
        isUserPresent: userPresent,
        attachment: this.getAttachmentType(credential),
      },
      user: {
        id: expectedUserId,
        name: clientData.displayName || expectedUserId,
        displayName: clientData.displayName || expectedUserId,
      },
      rp: {
        id: this.rpId,
        name: this.rpName,
      },
      extensions: credential.clientExtensionResults || {},
      clientExtensionResults: credential.clientExtensionResults || {},
      isActive: true,
      isBackup: backupState,
      isMFA: true,
      deviceFingerprint: this.extractDeviceFingerprint(credential),
    });

    await this.webAuthnCredentialRepository.save(webAuthnCredential);

    // Clean up challenge
    this.challengeCache.delete(expectedChallenge);

    const registrationTime = Date.now() - startTime;

    this.logger.log(`WebAuthn registration completed in ${registrationTime}ms`);

    return {
      credentialId: credential.id,
      type: credential.type,
      publicKey,
      algorithm: credential.response.publicKeyAlgorithm.toString(),
      transports: credential.response.transports || [],
      authenticator: webAuthnCredential.authenticator,
      registrationTime,
      securityLevel: this.calculateSecurityLevel(credential, userVerified, backupEligible),
    };
  }

  async generateAuthenticationOptions(request: WebAuthnAuthenticationRequest): Promise<{
    options: any;
    challenge: string;
  }> {
    this.logger.log(`Generating WebAuthn authentication options for user ${request.userId}`);

    // Get user's credentials
    const credentials = await this.webAuthnCredentialRepository.find({
      where: { userId: request.userId, isActive: true },
    });

    if (credentials.length === 0) {
      throw new Error('No credentials found for user');
    }

    const challenge = this.generateChallenge();
    const allowCredentials = credentials.map(cred => ({
      id: cred.credentialId,
      type: cred.type,
      transports: cred.transports,
    }));

    const options = {
      challenge: challenge,
      allowCredentials: allowCredentials,
      userVerification: request.userVerification || 'required',
      timeout: this.challengeTimeout,
      extensions: {},
    };

    // Store challenge for verification
    this.challengeCache.set(challenge, {
      challenge,
      timestamp: new Date(),
      userId: request.userId,
    });

    return { options, challenge };
  }

  async verifyAuthentication(
    credential: any,
    expectedChallenge: string,
    expectedUserId: string,
  ): Promise<WebAuthnAuthenticationResult> {
    this.logger.log('Verifying WebAuthn authentication');

    const startTime = Date.now();

    // Verify challenge
    const cachedChallenge = this.challengeCache.get(expectedChallenge);
    if (!cachedChallenge || cachedChallenge.userId !== expectedUserId) {
      throw new Error('Invalid or expired challenge');
    }

    // Find credential
    const storedCredential = await this.webAuthnCredentialRepository.findOne({
      where: { credentialId: credential.id, userId: expectedUserId, isActive: true },
    });

    if (!storedCredential) {
      throw new Error('Credential not found');
    }

    // Verify client data
    const clientDataJSON = Buffer.from(credential.response.clientDataJSON, 'base64url').toString();
    const clientData = JSON.parse(clientDataJSON);

    if (clientData.challenge !== expectedChallenge) {
      throw new Error('Challenge mismatch');
    }

    if (clientData.origin !== this.rpOrigin) {
      throw new Error('Origin mismatch');
    }

    if (clientData.type !== 'webauthn.get') {
      throw new Error('Invalid ceremony type');
    }

    // Verify authenticator data
    const authenticatorData = Buffer.from(credential.response.authenticatorData, 'base64url');
    const signature = Buffer.from(credential.response.signature, 'base64url');
    const clientDataHash = this.sha256(Buffer.from(clientDataJSON));

    // Parse authenticator data
    const rpIdHash = authenticatorData.slice(0, 32);
    const flags = authenticatorData.readUInt8(32);
    const counter = authenticatorData.readUInt32BE(33);
    const authenticatorDataExtension = authenticatorData.slice(37);

    const userPresent = !!(flags & 0x01);
    const userVerified = !!(flags & 0x04);
    const backupEligible = !!(flags & 0x08);
    const backupState = !!(flags & 0x10);

    // Verify signature (simplified - in production, would use proper signature verification)
    const signatureVerified = await this.verifySignature(
      storedCredential.publicKey,
      authenticatorData,
      clientDataHash,
      signature,
    );

    if (!signatureVerified) {
      throw new Error('Signature verification failed');
    }

    // Update credential usage
    await this.webAuthnCredentialRepository.update(storedCredential.id, {
      lastUsed: new Date(),
      usageCount: () => 'usageCount + 1',
    });

    // Clean up challenge
    this.challengeCache.delete(expectedChallenge);

    const authenticationTime = Date.now() - startTime;

    this.logger.log(`WebAuthn authentication completed in ${authenticationTime}ms`);

    return {
      authenticated: true,
      credentialId: credential.id,
      authenticator: storedCredential.authenticator,
      authenticationTime,
      userVerified,
      signatureCounter: counter,
      securityFlags: {
        userPresent,
        userVerified,
        backupEligible,
        backupState,
      },
    };
  }

  async getUserCredentials(userId: string): Promise<WebAuthnCredential[]> {
    return this.webAuthnCredentialRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteCredential(credentialId: string, userId: string): Promise<void> {
    const credential = await this.webAuthnCredentialRepository.findOne({
      where: { id: credentialId, userId },
    });

    if (!credential) {
      throw new Error('Credential not found');
    }

    credential.isActive = false;
    await this.webAuthnCredentialRepository.save(credential);

    this.logger.log(`WebAuthn credential ${credentialId} deleted for user ${userId}`);
  }

  async generateMagicLink(userId: string, email: string, expiresIn: number = 3600000): Promise<{
    link: string;
    token: string;
    expiresAt: Date;
  }> {
    this.logger.log(`Generating magic link for user ${userId}`);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn);
    
    const link = `${this.rpOrigin}/auth/magic-link?token=${token}&userId=${userId}`;

    // In production, store token in database with expiration
    // For now, just return the link

    return { link, token, expiresAt };
  }

  async verifyMagicLink(token: string, userId: string): Promise<{
    valid: boolean;
    userId: string;
    expiresAt?: Date;
  }> {
    // In production, verify token against database
    // For now, just mock verification
    return {
      valid: true,
      userId,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  async generateOTP(userId: string, method: 'email' | 'sms' = 'email'): Promise<{
    otp: string;
    expiresAt: Date;
    method: string;
  }> {
    this.logger.log(`Generating OTP for user ${userId} via ${method}`);

    const otp = this.generateOTPCode();
    const expiresAt = new Date(Date.now() + 300000); // 5 minutes

    // In production, send OTP via email/SMS
    if (method === 'email') {
      await this.sendOTPByEmail(userId, otp);
    } else {
      await this.sendOTPBySMS(userId, otp);
    }

    return { otp, expiresAt, method };
  }

  async verifyOTP(userId: string, otp: string): Promise<{
    valid: boolean;
    attempts: number;
    remainingAttempts: number;
  }> {
    // In production, verify OTP against database
    // For now, just mock verification
    return {
      valid: otp === '123456', // Mock OTP
      attempts: 1,
      remainingAttempts: 2,
    };
  }

  async getPasswordlessStatistics(userId: string): Promise<{
    webAuthn: {
      totalCredentials: number;
      authenticatorTypes: Record<string, number>;
      averageVerificationTime: number;
      successRate: number;
      lastUsed: Date;
    };
    magicLinks: {
      totalGenerated: number;
      totalUsed: number;
      successRate: number;
      averageTimeToUse: number;
    };
    otp: {
      totalGenerated: number;
      totalVerified: number;
      successRate: number;
      averageVerificationTime: number;
    };
  }> {
    const credentials = await this.getUserCredentials(userId);

    const authenticatorTypes = credentials.reduce((acc, cred) => {
      const type = cred.authenticator.attachment || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    const totalVerifications = credentials.reduce((sum, cred) => sum + cred.usageCount, 0);
    const totalFailures = credentials.reduce((sum, cred) => sum + cred.failureCount, 0);
    const successRate = totalVerifications > 0 ? ((totalVerifications - totalFailures) / totalVerifications) * 100 : 0;

    return {
      webAuthn: {
        totalCredentials: credentials.length,
        authenticatorTypes,
        averageVerificationTime: 1200, // Mock time
        successRate,
        lastUsed: credentials.reduce((latest, cred) => 
          cred.lastUsed && (!latest || cred.lastUsed > latest) ? cred.lastUsed : latest, null),
      },
      magic_links: {
        totalGenerated: 0, // Would track from database
        totalUsed: 0,
        successRate: 0,
        averageTimeToUse: 0,
      },
      otp: {
        totalGenerated: 0, // Would track from database
        totalVerified: 0,
        successRate: 0,
        averageVerificationTime: 0,
      },
    };
  }

  private generateChallenge(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private sha256(data: Buffer): Buffer {
    return crypto.createHash('sha256').update(data).digest();
  }

  private async verifyAttestation(attestationObject: Buffer, clientData: any): Promise<boolean> {
    // Mock attestation verification - in production, would verify actual attestation
    return true;
  }

  private async extractPublicKey(attestationObject: Buffer): string {
    // Mock public key extraction - in production, would extract actual public key
    return 'mock-public-key';
  }

  private extractAAGUID(attestationObject: Buffer): string {
    // Mock AAGUID extraction
    return '00000000-0000-0000-0000-000000000000';
  }

  private getAuthenticatorName(credential: any): string {
    // Mock authenticator name detection
    return 'Platform Authenticator';
  }

  private getAuthenticatorIcon(credential: any): string {
    // Mock authenticator icon
    return 'fingerprint';
  }

  private getAttachmentType(credential: any): 'platform' | 'cross-platform' {
    // Mock attachment type detection
    return 'platform';
  }

  private extractDeviceFingerprint(credential: any): any {
    // Mock device fingerprint extraction
    return {
      userAgent: 'mock-user-agent',
      platform: 'mock-platform',
      ip: '127.0.0.1',
      deviceId: 'mock-device-id',
    };
  }

  private calculateSecurityLevel(credential: any, userVerified: boolean, backupEligible: boolean): 'low' | 'medium' | 'high' | 'maximum' {
    let score = 0;

    if (userVerified) score += 2;
    if (backupEligible) score += 1;
    if (credential.authenticator.isUserVerifying) score += 2;
    if (credential.authenticator.attachment === 'platform') score += 1;

    if (score >= 5) return 'maximum';
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  private async verifySignature(publicKey: string, authenticatorData: Buffer, clientDataHash: Buffer, signature: Buffer): Promise<boolean> {
    // Mock signature verification - in production, would use actual cryptographic verification
    return true;
  }

  private generateOTPCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async sendOTPByEmail(userId: string, otp: string): Promise<void> {
    // Mock email sending
    this.logger.log(`Sending OTP ${otp} to user ${userId} via email`);
  }

  private async sendOTPBySMS(userId: string, otp: string): Promise<void> {
    // Mock SMS sending
    this.logger.log(`Sending OTP ${otp} to user ${userId} via SMS`);
  }

  // Clean up expired challenges
  @Cron('0 * * * * *') // Every hour
  async cleanupExpiredChallenges(): Promise<void> {
    const now = new Date();
    const expiredChallenges = [];

    for (const [challenge, data] of this.challengeCache.entries()) {
      if (now.getTime() - data.timestamp.getTime() > this.challengeTimeout) {
        expiredChallenges.push(challenge);
      }
    }

    expiredChallenges.forEach(challenge => {
      this.challengeCache.delete(challenge);
    });

    if (expiredChallenges.length > 0) {
      this.logger.log(`Cleaned up ${expiredChallenges.length} expired challenges`);
    }
  }
}

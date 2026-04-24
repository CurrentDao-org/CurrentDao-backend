import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity';
import { AuthenticationSession } from '../entities/authentication-session.entity';

export interface AdaptiveAuthRequest {
  userId: string;
  context: {
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
    location?: {
      country: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    time: Date;
    timezone: string;
    platform: string;
  };
  authentication: {
    method: string;
    factors: string[];
    previousSuccess?: boolean;
    recentFailures?: number;
  };
  behavior?: {
    typingSpeed?: number;
    mouseMovement?: number;
    sessionDuration?: number;
    pageViews?: number;
  };
}

export interface AdaptiveAuthResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  requiredFactors: string[];
  stepUpAuth: boolean;
  additionalVerification: boolean;
  recommendations: string[];
  securityMeasures: {
    sessionTimeout: number;
    mfaRequired: boolean;
    deviceVerification: boolean;
    locationVerification: boolean;
    behavioralVerification: boolean;
  };
  riskFactors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    weight: number;
  }>;
}

export interface AdaptiveAuthPolicy {
  userId?: string;
  name: string;
  rules: Array<{
    condition: string;
    action: string;
    parameters?: any;
    weight: number;
  }>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  enabled: boolean;
  priority: number;
}

export interface RiskAssessment {
  overallRisk: number;
  riskFactors: Array<{
    category: 'device' | 'location' | 'behavior' | 'context' | 'history';
    score: number;
    description: string;
    mitigation?: string;
  }>;
  recommendations: string[];
  securityActions: string[];
}

@Injectable()
export class AdaptiveAuthService {
  private readonly logger = new Logger(AdaptiveAuthService.name);
  private readonly defaultThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 0.9,
  };

  constructor(
    @InjectRepository(DeviceFingerprint)
    private readonly deviceFingerprintRepository: Repository<DeviceFingerprint>,
    @InjectRepository(AuthenticationSession)
    private readonly authenticationSessionRepository: Repository<AuthenticationSession>,
  ) {}

  async assessRisk(request: AdaptiveAuthRequest): Promise<AdaptiveAuthResult> {
    this.logger.log(`Assessing adaptive authentication risk for user ${request.userId}`);

    // Get user's device fingerprint
    const deviceFingerprint = await this.getOrCreateDeviceFingerprint(request);
    
    // Analyze various risk factors
    const riskAssessment = await this.performRiskAssessment(request, deviceFingerprint);
    
    // Calculate overall risk level
    const riskLevel = this.calculateRiskLevel(riskAssessment.overallRisk);
    
    // Determine required authentication factors
    const requiredFactors = this.determineRequiredFactors(riskLevel, riskAssessment);
    
    // Generate security measures
    const securityMeasures = this.generateSecurityMeasures(riskLevel, riskAssessment);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(riskAssessment, riskLevel);

    const result: AdaptiveAuthResult = {
      riskLevel,
      riskScore: riskAssessment.overallRisk,
      requiredFactors,
      stepUpAuth: riskLevel === 'high' || riskLevel === 'critical',
      additionalVerification: riskLevel !== 'low',
      recommendations,
      securityMeasures,
      riskFactors: riskAssessment.riskFactors.map(factor => ({
        type: factor.category,
        severity: this.getSeverityFromScore(factor.score),
        description: factor.description,
        weight: factor.score,
      })),
    };

    this.logger.log(`Adaptive auth assessment completed. Risk level: ${riskLevel}, Score: ${riskAssessment.overallRisk}`);

    return result;
  }

  async createPolicy(policy: AdaptiveAuthPolicy): Promise<AdaptiveAuthPolicy> {
    this.logger.log(`Creating adaptive auth policy: ${policy.name}`);

    // In production, this would save to database
    // For now, just return the policy
    return policy;
  }

  async updatePolicy(policyId: string, updates: Partial<AdaptiveAuthPolicy>): Promise<AdaptiveAuthPolicy> {
    this.logger.log(`Updating adaptive auth policy: ${policyId}`);

    // In production, this would update in database
    // For now, just return mock updated policy
    return {
      ...updates,
      id: policyId,
      name: updates.name || 'Updated Policy',
      rules: updates.rules || [],
      thresholds: updates.thresholds || this.defaultThresholds,
      enabled: updates.enabled !== false,
      priority: updates.priority || 1,
    } as AdaptiveAuthPolicy;
  }

  async getPolicy(userId?: string): Promise<AdaptiveAuthPolicy> {
    // In production, this would fetch from database
    // For now, return default policy
    return {
      userId,
      name: 'Default Adaptive Auth Policy',
      rules: [
        {
          condition: 'new_device',
          action: 'require_mfa',
          weight: 0.3,
        },
        {
          condition: 'suspicious_location',
          action: 'step_up_auth',
          weight: 0.4,
        },
        {
          condition: 'multiple_failures',
          action: 'block_temporarily',
          weight: 0.5,
        },
      ],
      thresholds: this.defaultThresholds,
      enabled: true,
      priority: 1,
    };
  }

  async evaluatePolicy(request: AdaptiveAuthRequest, policy: AdaptiveAuthPolicy): Promise<{
    actions: string[];
    riskScore: number;
    appliedRules: Array<{
      rule: string;
      condition: string;
      action: string;
      matched: boolean;
    }>;
  }> {
    this.logger.log(`Evaluating adaptive auth policy for user ${request.userId}`);

    const actions: string[] = [];
    const appliedRules = [];
    let totalRiskScore = 0;

    for (const rule of policy.rules) {
      const matched = await this.evaluateRuleCondition(rule.condition, request);
      
      appliedRules.push({
        rule: rule.condition,
        condition: rule.condition,
        action: rule.action,
        matched,
      });

      if (matched) {
        actions.push(rule.action);
        totalRiskScore += rule.weight;
      }
    }

    return {
      actions,
      riskScore: Math.min(totalRiskScore, 1),
      appliedRules,
    };
  }

  async getRiskHistory(userId: string, timeRange: { start: Date; end: Date }): Promise<{
    assessments: Array<{
      timestamp: Date;
      riskScore: number;
      riskLevel: string;
      factors: string[];
      actions: string[];
    }>;
    trends: {
      averageRisk: number;
      riskDistribution: Record<string, number>;
      topRiskFactors: Array<{ factor: string; count: number; avgScore: number }>;
    };
  }> {
    this.logger.log(`Getting risk history for user ${userId}`);

    // Mock implementation - in production would fetch from database
    const assessments = Array.from({ length: 30 }, (_, i) => ({
      timestamp: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000),
      riskScore: 0.2 + Math.random() * 0.6,
      riskLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      factors: ['new_device', 'suspicious_location', 'behavioral_anomaly'],
      actions: ['mfa_required', 'step_up_auth'],
    }));

    const averageRisk = assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length;
    
    const riskDistribution = assessments.reduce((acc, a) => {
      acc[a.riskLevel] = (acc[a.riskLevel] || 0) + 1;
      return acc;
    }, {});

    return {
      assessments,
      trends: {
        averageRisk,
        riskDistribution,
        topRiskFactors: [
          { factor: 'new_device', count: 15, avgScore: 0.4 },
          { factor: 'suspicious_location', count: 8, avgScore: 0.6 },
          { factor: 'behavioral_anomaly', count: 5, avgScore: 0.3 },
        ],
      },
    };
  }

  async getAdaptiveAuthStatistics(): Promise<{
    totalAssessments: number;
    riskDistribution: Record<string, number>;
    averageRiskScore: number;
    topRiskFactors: Array<{
      factor: string;
      frequency: number;
      averageScore: number;
    }>;
    policyEffectiveness: {
      blockedAttempts: number;
      falsePositives: number;
      falseNegatives: number;
      accuracy: number;
    };
  }> {
    // Mock implementation - in production would fetch from database
    return {
      totalAssessments: 10000,
      riskDistribution: {
        low: 6000,
        medium: 2500,
        high: 1200,
        critical: 300,
      },
      averageRiskScore: 0.35,
      topRiskFactors: [
        { factor: 'new_device', frequency: 3500, averageScore: 0.3 },
        { factor: 'suspicious_location', frequency: 2000, averageScore: 0.6 },
        { factor: 'behavioral_anomaly', frequency: 1500, averageScore: 0.4 },
        { factor: 'time_anomaly', frequency: 1200, averageScore: 0.2 },
        { factor: 'multiple_failures', frequency: 800, averageScore: 0.7 },
      ],
      policyEffectiveness: {
        blockedAttempts: 450,
        falsePositives: 25,
        falseNegatives: 30,
        accuracy: 0.988,
      },
    };
  }

  private async getOrCreateDeviceFingerprint(request: AdaptiveAuthRequest): Promise<DeviceFingerprint> {
    const deviceId = request.context.deviceId || this.generateDeviceId(request);
    
    let fingerprint = await this.deviceFingerprintRepository.findOne({
      where: { deviceId },
    });

    if (!fingerprint) {
      fingerprint = this.deviceFingerprintRepository.create({
        id: crypto.randomUUID(),
        userId: request.userId,
        deviceId,
        fingerprint: this.generateFingerprint(request),
        trustScore: 0.5,
        riskFactors: this.evaluateDeviceRisk(request),
        location: request.context.location,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        authenticationCount: 1,
        isActive: true,
        isBlocked: false,
      });
      
      await this.deviceFingerprintRepository.save(fingerprint);
    } else {
      // Update existing fingerprint
      fingerprint.lastSeen = new Date();
      fingerprint.sessionCount += 1;
      fingerprint.authenticationCount += 1;
      await this.deviceFingerprintRepository.save(fingerprint);
    }

    return fingerprint;
  }

  private async performRiskAssessment(request: AdaptiveAuthRequest, deviceFingerprint: DeviceFingerprint): Promise<RiskAssessment> {
    const riskFactors = [];

    // Device risk assessment
    const deviceRisk = this.assessDeviceRisk(request, deviceFingerprint);
    riskFactors.push(deviceRisk);

    // Location risk assessment
    const locationRisk = this.assessLocationRisk(request, deviceFingerprint);
    riskFactors.push(locationRisk);

    // Behavioral risk assessment
    const behaviorRisk = this.assessBehavioralRisk(request, deviceFingerprint);
    riskFactors.push(behaviorRisk);

    // Context risk assessment
    const contextRisk = this.assessContextRisk(request);
    riskFactors.push(contextRisk);

    // Historical risk assessment
    const historyRisk = await this.assessHistoricalRisk(request, deviceFingerprint);
    riskFactors.push(historyRisk);

    // Calculate overall risk
    const overallRisk = riskFactors.reduce((sum, factor) => sum + factor.score, 0) / riskFactors.length;

    // Generate recommendations
    const recommendations = this.generateRiskRecommendations(riskFactors);
    
    // Generate security actions
    const securityActions = this.generateSecurityActions(riskFactors);

    return {
      overallRisk,
      riskFactors,
      recommendations,
      securityActions,
    };
  }

  private assessDeviceRisk(request: AdaptiveAuthRequest, deviceFingerprint: DeviceFingerprint): {
    category: 'device';
    score: number;
    description: string;
    mitigation?: string;
  } {
    let score = 0;
    const factors = [];

    // New device risk
    if (deviceFingerprint.sessionCount <= 1) {
      score += 0.3;
      factors.push('New device detected');
    }

    // Low trust score
    if (deviceFingerprint.trustScore < 0.3) {
      score += 0.4;
      factors.push('Low device trust score');
    }

    // Suspicious device characteristics
    if (deviceFingerprint.riskFactors.isTor || deviceFingerprint.riskFactors.isVPN) {
      score += 0.3;
      factors.push('Suspicious network (Tor/VPN)');
    }

    // Emulator or bot detection
    if (deviceFingerprint.riskFactors.isEmulator || deviceFingerprint.riskFactors.isBot) {
      score += 0.5;
      factors.push('Emulator or bot detected');
    }

    const description = factors.length > 0 ? factors.join(', ') : 'No device risks detected';

    return {
      category: 'device',
      score,
      description,
      mitigation: score > 0.3 ? 'Require additional verification' : undefined,
    };
  }

  private assessLocationRisk(request: AdaptiveAuthRequest, deviceFingerprint: DeviceFingerprint): {
    category: 'location';
    score: number;
    description: string;
    mitigation?: string;
  } {
    let score = 0;
    const factors = [];

    // New location
    if (deviceFingerprint.location && request.context.location) {
      const distance = this.calculateDistance(
        deviceFingerprint.location,
        request.context.location,
      );
      
      if (distance > 1000) { // > 1000km
        score += 0.4;
        factors.push('Unusual location (far from usual locations)');
      }
    }

    // High-risk countries
    const highRiskCountries = ['CN', 'RU', 'IR', 'KP'];
    if (request.context.location?.country && highRiskCountries.includes(request.context.location.country)) {
      score += 0.3;
      factors.push('High-risk country');
    }

    // Location mismatch
    if (deviceFingerprint.riskFactors.locationMismatch) {
      score += 0.2;
      factors.push('Location mismatch detected');
    }

    const description = factors.length > 0 ? factors.join(', ') : 'No location risks detected';

    return {
      category: 'location',
      score,
      description,
      mitigation: score > 0.3 ? 'Verify location via additional factors' : undefined,
    };
  }

  private assessBehavioralRisk(request: AdaptiveAuthRequest, deviceFingerprint: DeviceFingerprint): {
    category: 'behavior';
    score: number;
    description: string;
    mitigation?: string;
  } {
    let score = 0;
    const factors = [];

    // Unusual typing speed
    if (request.behavior?.typingSpeed) {
      const avgTypingSpeed = deviceFingerprint.behavior?.typingSpeed || 200; // chars/min
      const deviation = Math.abs(request.behavior.typingSpeed - avgTypingSpeed) / avgTypingSpeed;
      
      if (deviation > 0.5) { // >50% deviation
        score += 0.2;
        factors.push('Unusual typing speed');
      }
    }

    // Unusual session duration
    if (request.behavior?.sessionDuration) {
      const avgSessionDuration = deviceFingerprint.behavior?.sessionDuration || 1800; // seconds
      const deviation = Math.abs(request.behavior.sessionDuration - avgSessionDuration) / avgSessionDuration;
      
      if (deviation > 0.7) { // >70% deviation
        score += 0.15;
        factors.push('Unusual session duration');
      }
    }

    // Behavioral anomalies
    if (deviceFingerprint.riskFactors.deviceAnomaly) {
      score += 0.25;
      factors.push('Behavioral anomaly detected');
    }

    const description = factors.length > 0 ? factors.join(', ') : 'No behavioral risks detected';

    return {
      category: 'behavior',
      score,
      description,
      mitigation: score > 0.3 ? 'Monitor behavior patterns' : undefined,
    };
  }

  private assessContextRisk(request: AdaptiveAuthRequest): {
    category: 'context';
    score: number;
    description: string;
    mitigation?: string;
  } {
    let score = 0;
    const factors = [];

    // Time-based risk
    const hour = new Date(request.context.time).getHours();
    if (hour < 6 || hour > 22) { // Unusual hours
      score += 0.1;
      factors.push('Unusual access time');
    }

    // Recent failures
    if (request.authentication.recentFailures && request.authentication.recentFailures > 3) {
      score += 0.3;
      factors.push('Multiple recent failures');
    }

    // Suspicious IP
    if (this.isSuspiciousIP(request.context.ipAddress)) {
      score += 0.4;
      factors.push('Suspicious IP address');
    }

    // User agent anomalies
    if (this.isSuspiciousUserAgent(request.context.userAgent)) {
      score += 0.2;
      factors.push('Suspicious user agent');
    }

    const description = factors.length > 0 ? factors.join(', ') : 'No contextual risks detected';

    return {
      category: 'context',
      score,
      description,
      mitigation: score > 0.3 ? 'Require additional context verification' : undefined,
    };
  }

  private async assessHistoricalRisk(request: AdaptiveAuthRequest, deviceFingerprint: DeviceFingerprint): {
    category: 'history';
    score: number;
    description: string;
    mitigation?: string;
  } {
    let score = 0;
    const factors = [];

    // Recent authentication failures
    if (deviceFingerprint.failureCount > 5) {
      score += 0.3;
      factors.push('High failure rate on this device');
    }

    // Recent account compromise
    const recentSessions = await this.authenticationSessionRepository.find({
      where: { userId: request.userId, status: 'compromised' },
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (recentSessions.length > 0) {
      score += 0.5;
      factors.push('Recent account compromise detected');
    }

    // Unusual authentication patterns
    const recentAuths = await this.authenticationSessionRepository.find({
      where: { userId: request.userId, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      order: { createdAt: 'DESC' },
      take: 10,
    });

    const uniqueDevices = new Set(recentAuths.map(auth => auth.context.deviceId)).size;
    if (uniqueDevices > 5) {
      score += 0.2;
      factors.push('Multiple devices used recently');
    }

    const description = factors.length > 0 ? factors.join(', ') : 'No historical risks detected';

    return {
      category: 'history',
      score,
      description,
      mitigation: score > 0.3 ? 'Review account activity' : undefined,
    };
  }

  private calculateRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore < this.defaultThresholds.low) return 'low';
    if (riskScore < this.defaultThresholds.medium) return 'medium';
    if (riskScore < this.defaultThresholds.high) return 'high';
    return 'critical';
  }

  private determineRequiredFactors(riskLevel: string, riskAssessment: RiskAssessment): string[] {
    const factors = ['password']; // Always require password

    switch (riskLevel) {
      case 'medium':
        factors.push('otp');
        break;
      case 'high':
        factors.push('otp', 'biometric');
        break;
      case 'critical':
        factors.push('otp', 'biometric', 'hardware_token');
        break;
    }

    // Add contextual factors based on risk assessment
    if (riskAssessment.riskFactors.some(f => f.category === 'location' && f.score > 0.3)) {
      factors.push('location_verification');
    }

    if (riskAssessment.riskFactors.some(f => f.category === 'device' && f.score > 0.4)) {
      factors.push('device_verification');
    }

    return factors;
  }

  private generateSecurityMeasures(riskLevel: string, riskAssessment: RiskAssessment): {
    sessionTimeout: number;
    mfaRequired: boolean;
    deviceVerification: boolean;
    locationVerification: boolean;
    behavioralVerification: boolean;
  } {
    const baseTimeouts = {
      low: 3600000,    // 1 hour
      medium: 1800000, // 30 minutes
      high: 900000,    // 15 minutes
      critical: 300000, // 5 minutes
    };

    return {
      sessionTimeout: baseTimeouts[riskLevel] || baseTimeouts.low,
      mfaRequired: riskLevel !== 'low',
      deviceVerification: riskAssessment.riskFactors.some(f => f.category === 'device' && f.score > 0.3),
      locationVerification: riskAssessment.riskFactors.some(f => f.category === 'location' && f.score > 0.3),
      behavioralVerification: riskAssessment.riskFactors.some(f => f.category === 'behavior' && f.score > 0.3),
    };
  }

  private generateRecommendations(riskAssessment: RiskAssessment, riskLevel: string): string[] {
    const recommendations = [];

    if (riskLevel === 'critical') {
      recommendations.push('Block authentication attempt');
      recommendations.push('Notify security team');
      recommendations.push('Require manual review');
    } else if (riskLevel === 'high') {
      recommendations.push('Require step-up authentication');
      recommendations.push('Monitor session closely');
      recommendations.push('Consider temporary account lock');
    } else if (riskLevel === 'medium') {
      recommendations.push('Require additional verification');
      recommendations.push('Reduce session timeout');
      recommendations.push('Monitor for anomalies');
    }

    // Add specific recommendations based on risk factors
    riskAssessment.riskFactors.forEach(factor => {
      if (factor.mitigation) {
        recommendations.push(factor.mitigation);
      }
    });

    return recommendations;
  }

  private generateRiskRecommendations(riskFactors: any[]): string[] {
    const recommendations = [];

    riskFactors.forEach(factor => {
      switch (factor.category) {
        case 'device':
          if (factor.score > 0.3) {
            recommendations.push('Implement device-based authentication');
            recommendations.push('Consider device fingerprinting');
          }
          break;
        case 'location':
          if (factor.score > 0.3) {
            recommendations.push('Implement location-based verification');
            recommendations.push('Consider geofencing');
          }
          break;
        case 'behavior':
          if (factor.score > 0.3) {
            recommendations.push('Implement behavioral biometrics');
            recommendations.push('Monitor user behavior patterns');
          }
          break;
        case 'context':
          if (factor.score > 0.3) {
            recommendations.push('Implement contextual authentication');
            recommendations.push('Monitor access patterns');
          }
          break;
        case 'history':
          if (factor.score > 0.3) {
            recommendations.push('Review account history');
            recommendations.push('Consider account recovery');
          }
          break;
      }
    });

    return recommendations;
  }

  private generateSecurityActions(riskFactors: any[]): string[] {
    const actions = [];

    const highRiskFactors = riskFactors.filter(f => f.score > 0.4);
    
    if (highRiskFactors.length > 0) {
      actions.push('Enable enhanced monitoring');
      actions.push('Log security events');
    }

    if (riskFactors.some(f => f.category === 'device' && f.score > 0.5)) {
      actions.push('Quarantine device');
    }

    if (riskFactors.some(f => f.category === 'location' && f.score > 0.5)) {
      actions.push('Block location');
    }

    return actions;
  }

  private getSeverityFromScore(score: number): 'low' | 'medium' | 'high' {
    if (score < 0.3) return 'low';
    if (score < 0.6) return 'medium';
    return 'high';
  }

  private generateDeviceId(request: AdaptiveAuthRequest): string {
    const hash = crypto.createHash('sha256');
    hash.update(request.context.userAgent);
    hash.update(request.context.ipAddress);
    hash.update(request.context.platform);
    return hash.digest('hex').substring(0, 32);
  }

  private generateFingerprint(request: AdaptiveAuthRequest): any {
    // Mock fingerprint generation - in production, would use actual fingerprinting library
    return {
      userAgent: request.context.userAgent,
      language: 'en-US',
      platform: request.context.platform,
      vendor: 'Unknown',
      hardware: {
        cores: 4,
        memory: 8192,
        screen: {
          width: 1920,
          height: 1080,
          colorDepth: 24,
          pixelRatio: 1,
        },
      },
      browser: {
        name: 'Chrome',
        version: '120.0.0.0',
        plugins: [],
        cookies: true,
        doNotTrack: false,
      },
      network: {
        connection: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 50,
      },
      canvas: 'mock-canvas-hash',
      webgl: 'mock-webgl-hash',
      audio: 'mock-audio-hash',
      fonts: ['Arial', 'Times New Roman'],
      timezone: 'America/New_York',
      timezoneOffset: -300,
      screenResolution: '1920x1080',
      colorGamut: 'srgb',
      reducedMotion: false,
      hdr: false,
    };
  }

  private evaluateDeviceRisk(request: AdaptiveAuthRequest): any {
    return {
      isNewDevice: false,
      isTor: false,
      isVPN: false,
      isEmulator: false,
      isBot: false,
      suspiciousIP: false,
      locationMismatch: false,
      timeAnomaly: false,
      deviceAnomaly: false,
    };
  }

  private calculateDistance(loc1: any, loc2: any): number {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(loc2.latitude - loc1.latitude);
    const dLon = this.toRadians(loc2.longitude - loc1.longitude);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(loc1.latitude)) * Math.cos(this.toRadians(loc2.latitude)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private isSuspiciousIP(ip: string): boolean {
    // Mock IP checking - in production, would use IP reputation services
    const suspiciousRanges = ['10.0.0.', '192.168.', '172.16.'];
    return suspiciousRanges.some(range => ip.startsWith(range));
  }

  private isSuspiciousUserAgent(userAgent: string): boolean {
    // Mock user agent checking - in production, would use bot detection
    const suspiciousStrings = ['bot', 'crawler', 'spider', 'scraper'];
    return suspiciousStrings.some(str => userAgent.toLowerCase().includes(str));
  }

  private async evaluateRuleCondition(condition: string, request: AdaptiveAuthRequest): Promise<boolean> {
    // Mock rule evaluation - in production, would use rule engine
    switch (condition) {
      case 'new_device':
        return request.context.deviceId === undefined;
      case 'suspicious_location':
        return this.isSuspiciousIP(request.context.ipAddress);
      case 'multiple_failures':
        return (request.authentication.recentFailures || 0) > 3;
      default:
        return false;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticationSession } from '../entities/authentication-session.entity';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity';

export interface ContextualMFARequest {
  userId: string;
  sessionId: string;
  context: {
    ipAddress: string;
    userAgent: string;
    location?: {
      country: string;
      city: string;
      latitude: number;
      longitude: number;
    };
    time: Date;
    deviceFingerprint?: string;
    accessMethod: string;
    riskScore: number;
  };
  authentication: {
    primaryMethod: string;
    previousSuccess: boolean;
    recentFailures: number;
    timeSinceLastAuth: number;
  };
  transaction?: {
    type: string;
    amount?: number;
    recipient?: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export interface MFAResult {
  required: boolean;
  factors: Array<{
    type: string;
    priority: number;
    description: string;
    methods: string[];
  }>;
  adaptiveLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
  reasoning: string[];
  recommendations: string[];
  nextSteps: string[];
}

export interface MFAContext {
  riskFactors: Array<{
    type: string;
    score: number;
    description: string;
    weight: number;
  }>;
  contextualFactors: {
    location: {
      isKnown: boolean;
      distance: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    device: {
      isKnown: boolean;
      trustScore: number;
      riskLevel: 'low' | 'medium' | 'high';
    };
    time: {
      isUsual: boolean;
      riskLevel: 'low' | 'medium' | 'high';
    };
    behavior: {
      isNormal: boolean;
      riskLevel: 'low' | 'medium' | 'high';
    };
    transaction: {
      isNormal: boolean;
      riskLevel: 'low' | 'medium' | 'high';
    };
  };
  policies: Array<{
    name: string;
    enabled: boolean;
    conditions: string[];
    actions: string[];
  }>;
}

export interface MFAFactor {
  id: string;
  type: 'sms' | 'email' | 'totp' | 'push' | 'biometric' | 'hardware' | 'knowledge' | 'location';
  name: string;
  description: string;
  enabled: boolean;
  priority: number;
  methods: string[];
  conditions: Array<{
    type: string;
    operator: string;
    value: any;
  }>;
  securityLevel: 'basic' | 'enhanced' | 'maximum';
  userFriendly: boolean;
  fallbackOptions: string[];
}

@Injectable()
export class ContextualMFAService {
  private readonly logger = new Logger(ContextualMFAService.name);
  private readonly mfaFactors = new Map<string, MFAFactor[]>();
  private readonly userPreferences = new Map<string, { preferredFactors: string[]; exemptions: string[] }>();

  constructor(
    @InjectRepository(AuthenticationSession)
    private readonly sessionRepository: Repository<AuthenticationSession>,
    @InjectRepository(DeviceFingerprint)
    private readonly deviceFingerprintRepository: Repository<DeviceFingerprint>,
  ) {
    this.initializeDefaultFactors();
  }

  async assessContextualMFA(request: ContextualMFARequest): Promise<MFAResult> {
    this.logger.log(`Assessing contextual MFA for user ${request.userId}`);

    // Analyze context
    const context = await this.analyzeContext(request);

    // Calculate overall risk
    const overallRisk = this.calculateOverallRisk(context);

    // Determine MFA requirements
    const mfaRequirements = this.determineMFARequirements(overallRisk, context);

    // Generate reasoning
    const reasoning = this.generateReasoning(context, overallRisk);

    // Generate recommendations
    const recommendations = this.generateRecommendations(context, overallRisk);

    // Generate next steps
    const nextSteps = this.generateNextSteps(mfaRequirements);

    return {
      required: mfaRequirements.required,
      factors: mfaRequirements.factors,
      adaptiveLevel: mfaRequirements.adaptiveLevel,
      reasoning,
      recommendations,
      nextSteps,
    };
  }

  async getAvailableFactors(userId: string, context: any): Promise<MFAFactor[]> {
    const userPrefs = this.userPreferences.get(userId);
    const allFactors = Array.from(this.mfaFactors.values()).flat();

    // Filter factors based on user preferences and context
    return allFactors.filter(factor => {
      if (!factor.enabled) return false;

      // Check user exemptions
      if (userPrefs?.exemptions?.includes(factor.type)) return false;

      // Check contextual conditions
      return this.evaluateFactorConditions(factor, context);
    });
  }

  async executeFactor(factorId: string, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    const factor = this.findFactor(factorId);
    if (!factor) {
      throw new Error(`MFA factor ${factorId} not found`);
    }

    this.logger.log(`Executing MFA factor ${factor.name} for user ${userId}`);

    switch (factor.type) {
      case 'sms':
        return await this.executeSMSFactor(factor, userId, context);
      case 'email':
        return await this.executeEmailFactor(factor, userId, context);
      case 'totp':
        return await this.executeTOTPFactor(factor, userId, context);
      case 'push':
        return await this.executePushFactor(factor, userId, context);
      case 'biometric':
        return await this.executeBiometricFactor(factor, userId, context);
      case 'hardware':
        return await this.executeHardwareFactor(factor, userId, context);
      case 'knowledge':
        return await this.executeKnowledgeFactor(factor, userId, context);
      case 'location':
        return await this.executeLocationFactor(factor, userId, context);
      default:
        throw new Error(`Unsupported MFA factor type: ${factor.type}`);
    }
  }

  async setUserPreferences(userId: string, preferences: {
    preferredFactors: string[];
    exemptions: string[];
  }): Promise<void> {
    this.logger.log(`Setting MFA preferences for user ${userId}`);
    this.userPreferences.set(userId, preferences);
  }

  async getUserPreferences(userId: string): Promise<{
    preferredFactors: string[];
    exemptions: string[];
  }> {
    return this.userPreferences.get(userId) || { preferredFactors: [], exemptions: [] };
  }

  async getMFAPolicies(): Promise<Array<{
    name: string;
    description: string;
    enabled: boolean;
    conditions: string[];
    actions: string[];
  }>> {
    return [
      {
        name: 'High-Risk Transaction Policy',
        description: 'Requires additional verification for high-value transactions',
        enabled: true,
        conditions: ['transaction.amount > 1000', 'transaction.riskLevel = high'],
        actions: ['require_additional_mfa', 'enhanced_verification'],
      },
      {
        name: 'New Device Policy',
        description: 'Requires step-up authentication for new devices',
        enabled: true,
        conditions: ['device.isKnown = false'],
        actions: ['require_device_verification', 'identity_confirmation'],
      },
      {
        name: 'Unusual Location Policy',
        description: 'Requires verification for unusual access locations',
        enabled: true,
        conditions: ['location.isKnown = false', 'location.distance > 100'],
        actions: ['require_location_verification', 'additional_factors'],
      },
      {
        name: 'Time-Based Policy',
        description: 'Enhanced security during off-hours',
        enabled: true,
        conditions: ['time.isUsual = false'],
        actions: ['require_additional_factors', 'reduced_session_timeout'],
      },
    ];
  }

  async getMFAStrategies(userId: string, context: any): Promise<Array<{
    name: string;
    description: string;
    factors: string[];
    conditions: string[];
    effectiveness: number;
    userExperience: 'low' | 'medium' | 'high';
  }>> {
    return [
      {
        name: 'Adaptive Security',
        description: 'Dynamically adjusts security based on risk',
        factors: ['sms', 'email', 'push'],
        conditions: ['riskScore > 0.3'],
        effectiveness: 0.95,
        userExperience: 'high',
      },
      {
        name: 'Zero Trust',
        description: 'Always requires multiple factors',
        factors: ['biometric', 'hardware', 'knowledge'],
        conditions: ['always'],
        effectiveness: 0.99,
        userExperience: 'low',
      },
      {
        name: 'Risk-Based',
        description: 'Factors based on transaction risk',
        factors: ['sms', 'push', 'totp'],
        conditions: ['transaction.riskLevel = high'],
        effectiveness: 0.90,
        userExperience: 'medium',
      },
      {
        name: 'Context-Aware',
        description: 'Considers location, device, and time',
        factors: ['location', 'biometric', 'push'],
        conditions: ['context.risk > 0.4'],
        effectiveness: 0.92,
        userExperience: 'medium',
      },
    ];
  }

  private async analyzeContext(request: ContextualMFARequest): Promise<MFAContext> {
    // Analyze location context
    const locationContext = await this.analyzeLocationContext(request);

    // Analyze device context
    const deviceContext = await this.analyzeDeviceContext(request);

    // Analyze time context
    const timeContext = this.analyzeTimeContext(request);

    // Analyze behavior context
    const behaviorContext = await this.analyzeBehaviorContext(request);

    // Analyze transaction context
    const transactionContext = this.analyzeTransactionContext(request);

    // Get applicable policies
    const policies = await this.getApplicablePolicies(request);

    return {
      riskFactors: this.calculateRiskFactors(request, locationContext, deviceContext, timeContext),
      contextualFactors: {
        location: locationContext,
        device: deviceContext,
        time: timeContext,
        behavior: behaviorContext,
        transaction: transactionContext,
      },
      policies,
    };
  }

  private calculateOverallRisk(context: MFAContext): number {
    let totalRisk = 0;
    let totalWeight = 0;

    // Location risk
    const locationRisk = this.getContextualRisk(context.contextualFactors.location);
    totalRisk += locationRisk * 0.25;
    totalWeight += 0.25;

    // Device risk
    const deviceRisk = this.getContextualRisk(context.contextualFactors.device);
    totalRisk += deviceRisk * 0.25;
    totalWeight += 0.25;

    // Time risk
    const timeRisk = this.getContextualRisk(context.contextualFactors.time);
    totalRisk += timeRisk * 0.15;
    totalWeight += 0.15;

    // Behavior risk
    const behaviorRisk = this.getContextualRisk(context.contextualFactors.behavior);
    totalRisk += behaviorRisk * 0.15;
    totalWeight += 0.15;

    // Transaction risk
    const transactionRisk = this.getContextualRisk(context.contextualFactors.transaction);
    totalRisk += transactionRisk * 0.20;
    totalWeight += 0.20;

    return totalWeight > 0 ? totalRisk / totalWeight : 0;
  }

  private determineMFARequirements(riskScore: number, context: MFAContext): {
    required: boolean;
    factors: Array<{
      type: string;
      priority: number;
      description: string;
      methods: string[];
    }>;
    adaptiveLevel: 'none' | 'basic' | 'enhanced' | 'maximum';
  } {
    const factors = [];
    let adaptiveLevel: 'none' | 'basic' | 'enhanced' | 'maximum' = 'none';

    // Determine if MFA is required
    const required = riskScore > 0.3 || this.hasHighRiskContext(context);

    if (required) {
      adaptiveLevel = riskScore > 0.8 ? 'maximum' : riskScore > 0.6 ? 'enhanced' : riskScore > 0.3 ? 'basic' : 'basic';

      // Add factors based on risk level and context
      if (adaptiveLevel === 'maximum') {
        factors.push({
          type: 'biometric',
          priority: 1,
          description: 'Biometric verification required',
          methods: ['fingerprint', 'face', 'voice'],
        });
        factors.push({
          type: 'hardware',
          priority: 2,
          description: 'Hardware token verification',
          methods: ['yubikey', 'solokey'],
        });
        factors.push({
          type: 'knowledge',
          priority: 3,
          description: 'Knowledge-based verification',
          methods: ['password', 'pin', 'security_question'],
        });
      } else if (adaptiveLevel === 'enhanced') {
        factors.push({
          type: 'push',
          priority: 1,
          description: 'Push notification verification',
          methods: ['mobile_app', 'authenticator'],
        });
        factors.push({
          type: 'totp',
          priority: 2,
          description: 'Time-based one-time password',
          methods: ['google_authenticator', 'microsoft_authenticator'],
        });
      } else {
        factors.push({
          type: 'sms',
          priority: 1,
          description: 'SMS verification',
          methods: ['text_message'],
        });
        factors.push({
          type: 'email',
          priority: 2,
          description: 'Email verification',
          methods: ['email_link', 'email_code'],
        });
      }

      // Add contextual factors
      if (context.contextualFactors.location.riskLevel === 'high') {
        factors.push({
          type: 'location',
          priority: 1,
          description: 'Location-based verification',
          methods: ['gps_verification', 'ip_geolocation'],
        });
      }

      if (context.contextualFactors.device.riskLevel === 'high') {
        factors.push({
          type: 'device',
          priority: 1,
          description: 'Device verification',
          methods: ['device_fingerprint', 'device_trust'],
        });
      }
    }

    return { required, factors, adaptiveLevel };
  }

  private generateReasoning(context: MFAContext, riskScore: number): string[] {
    const reasoning = [];

    if (riskScore > 0.8) {
      reasoning.push('High overall risk score detected');
    }

    if (context.contextualFactors.location.riskLevel === 'high') {
      reasoning.push('Unusual access location detected');
    }

    if (context.contextualFactors.device.riskLevel === 'high') {
      reasoning.push('Unknown or suspicious device detected');
    }

    if (context.contextualFactors.time.riskLevel === 'high') {
      reasoning.push('Unusual access time detected');
    }

    if (context.contextualFactors.transaction.riskLevel === 'high') {
      reasoning.push('High-risk transaction detected');
    }

    if (context.policies.some(p => p.enabled)) {
      reasoning.push('Security policies require additional verification');
    }

    return reasoning;
  }

  private generateRecommendations(context: MFAContext, riskScore: number): string[] {
    const recommendations = [];

    if (riskScore > 0.7) {
      recommendations.push('Consider blocking access attempt');
      recommendations.push('Notify security team');
    }

    if (context.contextualFactors.device.riskLevel === 'high') {
      recommendations.push('Implement device registration');
      recommendations.push('Enhance device monitoring');
    }

    if (context.contextualFactors.location.riskLevel === 'high') {
      recommendations.push('Implement geofencing');
      recommendations.push('Require location verification');
    }

    if (riskScore > 0.5) {
      recommendations.push('Reduce session timeout');
      recommendations.push('Enable continuous monitoring');
    }

    return recommendations;
  }

  private generateNextSteps(mfaRequirements: any): string[] {
    const steps = [];

    if (mfaRequirements.required) {
      steps.push('Complete multi-factor authentication');
      steps.push('Verify identity through required factors');
      
      if (mfaRequirements.adaptiveLevel === 'maximum') {
        steps.push('Wait for security team review');
        steps.push('Provide additional documentation');
      }
    } else {
      steps.push('Proceed with normal authentication');
      steps.push('Monitor session for anomalies');
    }

    return steps;
  }

  private async analyzeLocationContext(request: ContextualMFARequest): Promise<{
    isKnown: boolean;
    distance: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    // Mock location analysis
    const isKnown = Math.random() > 0.3; // 70% known locations
    const distance = Math.random() * 5000; // 0-5000km
    const riskLevel = distance > 1000 ? 'high' : distance > 100 ? 'medium' : 'low';

    return { isKnown, distance, riskLevel };
  }

  private async analyzeDeviceContext(request: ContextualMFARequest): Promise<{
    isKnown: boolean;
    trustScore: number;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    // Mock device analysis
    const isKnown = Math.random() > 0.2; // 80% known devices
    const trustScore = isKnown ? 0.7 + Math.random() * 0.3 : 0.2 + Math.random() * 0.3;
    const riskLevel = trustScore > 0.7 ? 'low' : trustScore > 0.4 ? 'medium' : 'high';

    return { isKnown, trustScore, riskLevel };
  }

  private analyzeTimeContext(request: ContextualMFARequest): {
    isUsual: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const hour = new Date(request.context.time).getHours();
    const isUsual = hour >= 8 && hour <= 18; // Business hours
    const riskLevel = isUsual ? 'low' : hour >= 6 && hour <= 22 ? 'medium' : 'high';

    return { isUsual, riskLevel };
  }

  private async analyzeBehaviorContext(request: ContextualMFARequest): Promise<{
    isNormal: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    // Mock behavior analysis
    const isNormal = Math.random() > 0.1; // 90% normal behavior
    const riskLevel = isNormal ? 'low' : Math.random() > 0.5 ? 'medium' : 'high';

    return { isNormal, riskLevel };
  }

  private analyzeTransactionContext(request: ContextualMFARequest): {
    isNormal: boolean;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    if (!request.transaction) {
      return { isNormal: true, riskLevel: 'low' };
    }

    const isNormal = request.transaction.riskLevel === 'low';
    const riskLevel = request.transaction.riskLevel;

    return { isNormal, riskLevel };
  }

  private async getApplicablePolicies(request: ContextualMFARequest): Promise<Array<{
    name: string;
    enabled: boolean;
    conditions: string[];
    actions: string[];
  }>> {
    const allPolicies = await this.getMFAPolicies();
    
    return allPolicies.filter(policy => {
      if (!policy.enabled) return false;
      
      // Check if policy conditions are met
      return policy.conditions.some(condition => this.evaluatePolicyCondition(condition, request));
    });
  }

  private calculateRiskFactors(request: ContextualMFARequest, locationContext: any, deviceContext: any, timeContext: any): Array<{
    type: string;
    score: number;
    description: string;
    weight: number;
  }> {
    const factors = [];

    // Location risk factor
    if (locationContext.riskLevel === 'high') {
      factors.push({
        type: 'location',
        score: 0.4,
        description: 'High-risk location detected',
        weight: 0.25,
      });
    }

    // Device risk factor
    if (deviceContext.riskLevel === 'high') {
      factors.push({
        type: 'device',
        score: 0.3,
        description: 'Unknown or suspicious device',
        weight: 0.25,
      });
    }

    // Time risk factor
    if (timeContext.riskLevel === 'high') {
      factors.push({
        type: 'time',
        score: 0.2,
        description: 'Unusual access time',
        weight: 0.15,
      });
    }

    // Transaction risk factor
    if (request.transaction?.riskLevel === 'high') {
      factors.push({
        type: 'transaction',
        score: 0.5,
        description: 'High-risk transaction',
        weight: 0.35,
      });
    }

    return factors;
  }

  private getContextualRisk(context: any): number {
    const riskLevels = { low: 0.1, medium: 0.5, high: 0.8 };
    return riskLevels[context.riskLevel] || 0.1;
  }

  private hasHighRiskContext(context: MFAContext): boolean {
    return (
      context.contextualFactors.location.riskLevel === 'high' ||
      context.contextualFactors.device.riskLevel === 'high' ||
      context.contextualFactors.time.riskLevel === 'high' ||
      context.contextualFactors.transaction.riskLevel === 'high' ||
      context.policies.some(p => p.enabled)
    );
  }

  private findFactor(factorId: string): MFAFactor | undefined {
    for (const factors of this.mfaFactors.values()) {
      const factor = factors.find(f => f.id === factorId);
      if (factor) return factor;
    }
    return undefined;
  }

  private evaluateFactorConditions(factor: MFAFactor, context: any): boolean {
    return factor.conditions.every(condition => {
      // Mock condition evaluation
      return true;
    });
  }

  private evaluatePolicyCondition(condition: string, request: ContextualMFARequest): boolean {
    // Mock policy condition evaluation
    if (condition.includes('transaction.amount > 1000')) {
      return request.transaction?.amount && request.transaction.amount > 1000;
    }
    if (condition.includes('device.isKnown = false')) {
      return false; // Mock - would check actual device
    }
    return false;
  }

  private async executeSMSFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock SMS factor execution
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In production, would send SMS via SMS service
    this.logger.log(`Sending SMS OTP to user ${userId}: ${otp}`);

    return {
      success: true,
      confidence: 0.85,
      metadata: {
        method: 'sms',
        otpLength: 6,
        expiresAt: new Date(Date.now() + 300000), // 5 minutes
        maskedPhone: '***-***-1234',
      },
    };
  }

  private async executeEmailFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock email factor execution
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // In production, would send email via email service
    this.logger.log(`Sending email OTP to user ${userId}: ${otp}`);

    return {
      success: true,
      confidence: 0.80,
      metadata: {
        method: 'email',
        otpLength: 6,
        expiresAt: new Date(Date.now() + 600000), // 10 minutes
        maskedEmail: 'u***@e***.com',
      },
    };
  }

  private async executeTOTPFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock TOTP factor execution
    return {
      success: true,
      confidence: 0.90,
      metadata: {
        method: 'totp',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      },
    };
  }

  private async executePushFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock push factor execution
    return {
      success: true,
      confidence: 0.95,
      metadata: {
        method: 'push',
        deviceType: 'mobile',
        appVersion: '2.1.0',
        expiresAt: new Date(Date.now() + 120000), // 2 minutes
      },
    };
  }

  private async executeBiometricFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock biometric factor execution
    return {
      success: true,
      confidence: 0.98,
      metadata: {
        method: 'biometric',
        type: 'fingerprint',
        accuracy: 0.99,
        livenessDetected: true,
      },
    };
  }

  private async executeHardwareFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock hardware factor execution
    return {
      success: true,
      confidence: 0.99,
      metadata: {
        method: 'hardware',
        type: 'yubikey',
        version: '5.4.3',
        serial: '12345678',
      },
    };
  }

  private async executeKnowledgeFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock knowledge factor execution
    return {
      success: true,
      confidence: 0.75,
      metadata: {
        method: 'knowledge',
        type: 'security_question',
        question: 'What was your first pet\'s name?',
      },
    };
  }

  private async executeLocationFactor(factor: MFAFactor, userId: string, context: any): Promise<{
    success: boolean;
    confidence: number;
    metadata: any;
  }> {
    // Mock location factor execution
    return {
      success: true,
      confidence: 0.85,
      metadata: {
        method: 'location',
        verificationType: 'gps',
        accuracy: 10, // meters
        location: 'Known office location',
      },
    };
  }

  private initializeDefaultFactors(): void {
    const factors: MFAFactor[] = [
      {
        id: 'sms-1',
        type: 'sms',
        name: 'SMS Verification',
        description: 'Receive verification code via SMS',
        enabled: true,
        priority: 1,
        methods: ['text_message'],
        conditions: [],
        securityLevel: 'basic',
        userFriendly: true,
        fallbackOptions: ['email', 'voice'],
      },
      {
        id: 'email-1',
        type: 'email',
        name: 'Email Verification',
        description: 'Receive verification code via email',
        enabled: true,
        priority: 2,
        methods: ['email_link', 'email_code'],
        conditions: [],
        securityLevel: 'basic',
        userFriendly: true,
        fallbackOptions: ['sms', 'push'],
      },
      {
        id: 'totp-1',
        type: 'totp',
        name: 'Time-based OTP',
        description: 'Use authenticator app for verification',
        enabled: true,
        priority: 3,
        methods: ['google_authenticator', 'microsoft_authenticator'],
        conditions: [],
        securityLevel: 'enhanced',
        userFriendly: true,
        fallbackOptions: ['sms', 'email'],
      },
      {
        id: 'push-1',
        type: 'push',
        name: 'Push Notification',
        description: 'Receive push notification for verification',
        enabled: true,
        priority: 4,
        methods: ['mobile_app', 'authenticator'],
        conditions: [],
        securityLevel: 'enhanced',
        userFriendly: true,
        fallbackOptions: ['sms', 'email', 'totp'],
      },
      {
        id: 'biometric-1',
        type: 'biometric',
        name: 'Biometric Verification',
        description: 'Use biometric data for verification',
        enabled: true,
        priority: 5,
        methods: ['fingerprint', 'face', 'voice'],
        conditions: [],
        securityLevel: 'maximum',
        userFriendly: true,
        fallbackOptions: ['push', 'totp', 'hardware'],
      },
      {
        id: 'hardware-1',
        type: 'hardware',
        name: 'Hardware Token',
        description: 'Use hardware token for verification',
        enabled: true,
        priority: 6,
        methods: ['yubikey', 'solokey'],
        conditions: [],
        securityLevel: 'maximum',
        userFriendly: false,
        fallbackOptions: ['biometric', 'push', 'totp'],
      },
    ];

    this.mfaFactors.set('default', factors);
  }
}

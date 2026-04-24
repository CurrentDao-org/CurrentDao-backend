import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthenticationSession } from '../entities/authentication-session.entity';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity';

export interface ContinuousAuthRequest {
  sessionId: string;
  userId: string;
  activity: {
    type: 'mouse_move' | 'keyboard' | 'scroll' | 'click' | 'touch' | 'page_view';
    timestamp: Date;
    data: any;
  };
  context: {
    ipAddress: string;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    battery?: number;
    memory?: number;
  };
}

export interface ContinuousAuthResult {
  verified: boolean;
  confidence: number;
  riskScore: number;
  anomalies: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Date;
  }>;
  recommendations: string[];
  nextVerification: Date;
  sessionStatus: 'active' | 'warning' | 'suspended' | 'terminated';
}

export interface BehaviorProfile {
  userId: string;
  deviceId: string;
  patterns: {
    typingSpeed: {
      average: number;
      variance: number;
      distribution: number[];
    };
    mouseMovement: {
      averageSpeed: number;
      acceleration: number;
      pausePatterns: number[];
    };
    scrolling: {
      averageSpeed: number;
      direction: 'smooth' | 'jerky';
      patterns: number[];
    };
    clickPatterns: {
      averageInterval: number;
      hotspots: Array<{ x: number; y: number; frequency: number }>;
      pressure: number;
    };
    session: {
      averageDuration: number;
      peakHours: number[];
      breakPatterns: number[];
    };
  };
  lastUpdated: Date;
  confidence: number;
}

export interface SessionRisk {
  sessionId: string;
  userId: string;
  currentRisk: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  riskFactors: Array<{
    type: string;
    score: number;
    description: string;
    timestamp: Date;
  }>;
  anomalies: Array<{
    type: string;
    severity: string;
    description: string;
    detectedAt: Date;
    resolved: boolean;
  }>;
  verificationHistory: Array<{
    timestamp: Date;
    method: string;
    result: boolean;
    confidence: number;
  }>;
}

@Injectable()
export class ContinuousAuthService {
  private readonly logger = new Logger(ContinuousAuthService.name);
  private readonly behaviorProfiles = new Map<string, BehaviorProfile>();
  private readonly sessionRisks = new Map<string, SessionRisk>();
  private readonly activityBuffer = new Map<string, ContinuousAuthRequest[]>();
  private readonly verificationIntervals = new Map<string, NodeJS.Timeout>();
  private readonly defaultVerificationInterval = 300000; // 5 minutes
  private readonly maxAnomaliesBeforeSuspension = 5;
  private readonly maxRiskScoreBeforeTermination = 0.8;

  constructor(
    @InjectRepository(AuthenticationSession)
    private readonly sessionRepository: Repository<AuthenticationSession>,
    @InjectRepository(DeviceFingerprint)
    private readonly deviceFingerprintRepository: Repository<DeviceFingerprint>,
  ) {}

  async initializeContinuousAuth(sessionId: string, userId: string): Promise<{
    enabled: boolean;
    verificationInterval: number;
    initialRisk: number;
    nextVerification: Date;
  }> {
    this.logger.log(`Initializing continuous authentication for session ${sessionId}`);

    // Get session details
    const session = await this.sessionRepository.findOne({
      where: { sessionId, userId, status: 'active' },
    });

    if (!session) {
      throw new Error('Active session not found');
    }

    // Initialize session risk tracking
    const sessionRisk: SessionRisk = {
      sessionId,
      userId,
      currentRisk: 0.1, // Start with low risk
      riskTrend: 'stable',
      riskFactors: [],
      anomalies: [],
      verificationHistory: [],
    };

    this.sessionRisks.set(sessionId, sessionRisk);

    // Initialize activity buffer
    this.activityBuffer.set(sessionId, []);

    // Load or create behavior profile
    await this.loadBehaviorProfile(userId, session.context.deviceId);

    // Set up continuous verification
    const verificationInterval = this.calculateVerificationInterval(sessionRisk.currentRisk);
    this.scheduleNextVerification(sessionId, verificationInterval);

    return {
      enabled: true,
      verificationInterval,
      initialRisk: sessionRisk.currentRisk,
      nextVerification: new Date(Date.now() + verificationInterval),
    };
  }

  async processActivity(request: ContinuousAuthRequest): Promise<ContinuousAuthResult> {
    this.logger.log(`Processing continuous auth activity for session ${request.sessionId}`);

    // Buffer activity for analysis
    this.bufferActivity(request);

    // Get session risk
    const sessionRisk = this.sessionRisks.get(request.sessionId);
    if (!sessionRisk) {
      throw new Error('Session risk tracking not initialized');
    }

    // Analyze activity for anomalies
    const anomalies = await this.analyzeActivity(request);

    // Update risk assessment
    await this.updateRiskAssessment(request.sessionId, anomalies);

    // Perform continuous verification if needed
    const verificationResult = await this.performContinuousVerification(request);

    // Generate recommendations
    const recommendations = this.generateRecommendations(anomalies, sessionRisk.currentRisk);

    // Determine session status
    const sessionStatus = this.determineSessionStatus(sessionRisk.currentRisk, anomalies);

    // Schedule next verification
    const nextVerification = this.scheduleNextVerification(
      request.sessionId,
      this.calculateVerificationInterval(sessionRisk.currentRisk),
    );

    return {
      verified: verificationResult.verified,
      confidence: verificationResult.confidence,
      riskScore: sessionRisk.currentRisk,
      anomalies,
      recommendations,
      nextVerification,
      sessionStatus,
    };
  }

  async verifySession(sessionId: string, method: 'behavioral' | 'biometric' | 'contextual' = 'behavioral'): Promise<{
    verified: boolean;
    confidence: number;
    riskScore: number;
    verificationTime: number;
    anomalies: any[];
  }> {
    this.logger.log(`Performing continuous verification for session ${sessionId} using ${method}`);

    const startTime = Date.now();
    const sessionRisk = this.sessionRisks.get(sessionId);

    if (!sessionRisk) {
      throw new Error('Session risk tracking not found');
    }

    let verified = false;
    let confidence = 0;
    const anomalies = [];

    switch (method) {
      case 'behavioral':
        const behavioralResult = await this.performBehavioralVerification(sessionId);
        verified = behavioralResult.verified;
        confidence = behavioralResult.confidence;
        anomalies.push(...behavioralResult.anomalies);
        break;

      case 'biometric':
        const biometricResult = await this.performBiometricVerification(sessionId);
        verified = biometricResult.verified;
        confidence = biometricResult.confidence;
        anomalies.push(...biometricResult.anomalies);
        break;

      case 'contextual':
        const contextualResult = await this.performContextualVerification(sessionId);
        verified = contextualResult.verified;
        confidence = contextualResult.confidence;
        anomalies.push(...contextualResult.anomalies);
        break;
    }

    // Update verification history
    sessionRisk.verificationHistory.push({
      timestamp: new Date(),
      method,
      result: verified,
      confidence,
    });

    // Update session risk based on verification result
    if (!verified) {
      sessionRisk.currentRisk = Math.min(1, sessionRisk.currentRisk + 0.2);
      sessionRisk.riskTrend = 'increasing';
    } else {
      sessionRisk.currentRisk = Math.max(0, sessionRisk.currentRisk - 0.1);
      sessionRisk.riskTrend = 'decreasing';
    }

    const verificationTime = Date.now() - startTime;

    this.logger.log(`Continuous verification completed in ${verificationTime}ms. Verified: ${verified}`);

    return {
      verified,
      confidence,
      riskScore: sessionRisk.currentRisk,
      verificationTime,
      anomalies,
    };
  }

  async terminateSession(sessionId: string, reason: string): Promise<void> {
    this.logger.log(`Terminating continuous authentication for session ${sessionId}. Reason: ${reason}`);

    // Clear verification interval
    const interval = this.verificationIntervals.get(sessionId);
    if (interval) {
      clearInterval(interval);
      this.verificationIntervals.delete(sessionId);
    }

    // Clear activity buffer
    this.activityBuffer.delete(sessionId);

    // Clear session risk tracking
    this.sessionRisks.delete(sessionId);

    // Update session in database
    await this.sessionRepository.update(sessionId, {
      status: 'terminated',
      terminatedAt: new Date(),
      terminationReason: reason,
    });
  }

  async getSessionRisk(sessionId: string): Promise<SessionRisk | null> {
    return this.sessionRisks.get(sessionId) || null;
  }

  async getBehaviorProfile(userId: string, deviceId: string): Promise<BehaviorProfile | null> {
    const key = `${userId}-${deviceId}`;
    return this.behaviorProfiles.get(key) || null;
  }

  async updateBehaviorProfile(userId: string, deviceId: string, activities: ContinuousAuthRequest[]): Promise<void> {
    this.logger.log(`Updating behavior profile for user ${userId}, device ${deviceId}`);

    const key = `${userId}-${deviceId}`;
    const existingProfile = this.behaviorProfiles.get(key);

    const newProfile = this.analyzeBehaviorPatterns(activities, existingProfile);
    this.behaviorProfiles.set(key, newProfile);
  }

  async getContinuousAuthStatistics(userId?: string): Promise<{
    totalSessions: number;
    activeSessions: number;
    averageRiskScore: number;
    verificationRate: number;
    anomalyRate: number;
    terminationRate: number;
    averageSessionDuration: number;
    topAnomalies: Array<{
      type: string;
      count: number;
      severity: string;
    }>;
  }> {
    // Mock implementation - in production would fetch from database
    return {
      totalSessions: 1000,
      activeSessions: 150,
      averageRiskScore: 0.25,
      verificationRate: 0.95,
      anomalyRate: 0.08,
      terminationRate: 0.02,
      averageSessionDuration: 3600000, // 1 hour
      topAnomalies: [
        { type: 'unusual_typing_speed', count: 45, severity: 'medium' },
        { type: 'suspicious_mouse_movement', count: 32, severity: 'low' },
        { type: 'location_change', count: 18, severity: 'high' },
        { type: 'device_change', count: 12, severity: 'critical' },
      ],
    };
  }

  private async loadBehaviorProfile(userId: string, deviceId: string): Promise<void> {
    const key = `${userId}-${deviceId}`;
    
    // Try to load from database (mock implementation)
    // For now, create a default profile
    if (!this.behaviorProfiles.has(key)) {
      const defaultProfile: BehaviorProfile = {
        userId,
        deviceId,
        patterns: {
          typingSpeed: {
            average: 200, // chars/min
            variance: 25,
            distribution: [180, 190, 200, 210, 220],
          },
          mouseMovement: {
            averageSpeed: 500, // pixels/sec
            acceleration: 100,
            pausePatterns: [0.5, 1.0, 1.5],
          },
          scrolling: {
            averageSpeed: 800, // pixels/sec
            direction: 'smooth',
            patterns: [400, 600, 800, 1000],
          },
          clickPatterns: {
            averageInterval: 2000, // ms
            hotspots: [],
            pressure: 0.8,
          },
          session: {
            averageDuration: 3600000, // 1 hour
            peakHours: [9, 14, 16],
            breakPatterns: [300000, 600000], // 5, 10 minutes
          },
        },
        lastUpdated: new Date(),
        confidence: 0.8,
      };

      this.behaviorProfiles.set(key, defaultProfile);
    }
  }

  private bufferActivity(request: ContinuousAuthRequest): void {
    const buffer = this.activityBuffer.get(request.sessionId) || [];
    buffer.push(request);

    // Keep only last 100 activities
    if (buffer.length > 100) {
      buffer.shift();
    }

    this.activityBuffer.set(request.sessionId, buffer);
  }

  private async analyzeActivity(request: ContinuousAuthRequest): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    timestamp: Date;
  }>> {
    const anomalies = [];
    const key = `${request.userId}-${request.context.deviceId}`;
    const profile = this.behaviorProfiles.get(key);

    if (!profile) {
      return anomalies;
    }

    // Analyze typing speed
    if (request.activity.type === 'keyboard') {
      const typingSpeed = this.calculateTypingSpeed(request.activity.data);
      const deviation = Math.abs(typingSpeed - profile.patterns.typingSpeed.average) / profile.patterns.typingSpeed.average;
      
      if (deviation > 0.5) {
        anomalies.push({
          type: 'unusual_typing_speed',
          severity: deviation > 0.8 ? 'high' : 'medium',
          description: `Typing speed deviation: ${(deviation * 100).toFixed(1)}%`,
          timestamp: request.activity.timestamp,
        });
      }
    }

    // Analyze mouse movement
    if (request.activity.type === 'mouse_move') {
      const mouseSpeed = this.calculateMouseSpeed(request.activity.data);
      const deviation = Math.abs(mouseSpeed - profile.patterns.mouseMovement.averageSpeed) / profile.patterns.mouseMovement.averageSpeed;
      
      if (deviation > 0.6) {
        anomalies.push({
          type: 'suspicious_mouse_movement',
          severity: deviation > 0.8 ? 'high' : 'medium',
          description: `Mouse movement deviation: ${(deviation * 100).toFixed(1)}%`,
          timestamp: request.activity.timestamp,
        });
      }
    }

    // Analyze scrolling patterns
    if (request.activity.type === 'scroll') {
      const scrollSpeed = this.calculateScrollSpeed(request.activity.data);
      const deviation = Math.abs(scrollSpeed - profile.patterns.scrolling.averageSpeed) / profile.patterns.scrolling.averageSpeed;
      
      if (deviation > 0.7) {
        anomalies.push({
          type: 'unusual_scrolling_pattern',
          severity: 'medium',
          description: `Scrolling pattern deviation: ${(deviation * 100).toFixed(1)}%`,
          timestamp: request.activity.timestamp,
        });
      }
    }

    // Analyze time-based anomalies
    const currentHour = new Date(request.activity.timestamp).getHours();
    if (!profile.patterns.session.peakHours.includes(currentHour)) {
      anomalies.push({
        type: 'unusual_access_time',
        severity: 'low',
        description: `Access outside usual hours: ${currentHour}:00`,
        timestamp: request.activity.timestamp,
      });
    }

    return anomalies;
  }

  private async updateRiskAssessment(sessionId: string, anomalies: any[]): Promise<void> {
    const sessionRisk = this.sessionRisks.get(sessionId);
    if (!sessionRisk) return;

    // Add risk factors for anomalies
    anomalies.forEach(anomaly => {
      const severityScore = {
        low: 0.1,
        medium: 0.3,
        high: 0.5,
        critical: 0.8,
      };

      sessionRisk.riskFactors.push({
        type: anomaly.type,
        score: severityScore[anomaly.severity],
        description: anomaly.description,
        timestamp: anomaly.timestamp,
      });

      sessionRisk.anomalies.push({
        type: anomaly.type,
        severity: anomaly.severity,
        description: anomaly.description,
        detectedAt: anomaly.timestamp,
        resolved: false,
      });
    });

    // Calculate new risk score
    const recentRiskFactors = sessionRisk.riskFactors.filter(
      factor => Date.now() - factor.timestamp.getTime() < 300000 // Last 5 minutes
    );

    if (recentRiskFactors.length > 0) {
      const avgRisk = recentRiskFactors.reduce((sum, factor) => sum + factor.score, 0) / recentRiskFactors.length;
      sessionRisk.currentRisk = Math.min(1, avgRisk);
    }

    // Update risk trend
    if (sessionRisk.riskFactors.length > 1) {
      const recent = sessionRisk.riskFactors.slice(-5);
      const older = sessionRisk.riskFactors.slice(-10, -5);
      
      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, f) => sum + f.score, 0) / recent.length;
        const olderAvg = older.reduce((sum, f) => sum + f.score, 0) / older.length;
        
        if (recentAvg > olderAvg + 0.1) {
          sessionRisk.riskTrend = 'increasing';
        } else if (recentAvg < olderAvg - 0.1) {
          sessionRisk.riskTrend = 'decreasing';
        } else {
          sessionRisk.riskTrend = 'stable';
        }
      }
    }

    // Check for session suspension/termination
    if (sessionRisk.currentRisk > this.maxRiskScoreBeforeTermination) {
      await this.terminateSession(sessionId, 'High risk score detected');
    } else if (sessionRisk.anomalies.filter(a => !a.resolved).length > this.maxAnomaliesBeforeSuspension) {
      await this.suspendSession(sessionId, 'Too many anomalies detected');
    }
  }

  private async performContinuousVerification(request: ContinuousAuthRequest): Promise<{
    verified: boolean;
    confidence: number;
  }> {
    const sessionRisk = this.sessionRisks.get(request.sessionId);
    
    // Perform verification based on risk level
    if (sessionRisk && sessionRisk.currentRisk > 0.5) {
      // High risk - perform verification
      const result = await this.verifySession(request.sessionId, 'behavioral');
      return { verified: result.verified, confidence: result.confidence };
    }

    // Low risk - implicit verification
    return { verified: true, confidence: 0.9 };
  }

  private generateRecommendations(anomalies: any[], riskScore: number): string[] {
    const recommendations = [];

    if (anomalies.length > 0) {
      recommendations.push('Monitor user behavior closely');
    }

    if (riskScore > 0.6) {
      recommendations.push('Consider step-up authentication');
    }

    if (anomalies.some(a => a.severity === 'critical')) {
      recommendations.push('Terminate session immediately');
    }

    if (anomalies.some(a => a.type === 'unusual_typing_speed')) {
      recommendations.push('Update typing speed profile');
    }

    if (anomalies.some(a => a.type === 'suspicious_mouse_movement')) {
      recommendations.push('Enhance mouse movement monitoring');
    }

    return recommendations;
  }

  private determineSessionStatus(riskScore: number, anomalies: any[]): 'active' | 'warning' | 'suspended' | 'terminated' {
    if (riskScore > this.maxRiskScoreBeforeTermination) {
      return 'terminated';
    }

    if (anomalies.filter(a => !a.resolved).length > this.maxAnomaliesBeforeSuspension) {
      return 'suspended';
    }

    if (riskScore > 0.6 || anomalies.some(a => a.severity === 'high')) {
      return 'warning';
    }

    return 'active';
  }

  private scheduleNextVerification(sessionId: string, interval: number): Date {
    // Clear existing interval
    const existingInterval = this.verificationIntervals.get(sessionId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Schedule new verification
    const timeout = setTimeout(async () => {
      try {
        await this.verifySession(sessionId, 'behavioral');
      } catch (error) {
        this.logger.error(`Continuous verification failed for session ${sessionId}:`, error);
      }
    }, interval);

    this.verificationIntervals.set(sessionId, timeout);

    return new Date(Date.now() + interval);
  }

  private calculateVerificationInterval(riskScore: number): number {
    // Higher risk = more frequent verification
    const baseInterval = this.defaultVerificationInterval;
    const multiplier = Math.max(0.25, 1 - riskScore); // 0.25x to 1x
    
    return baseInterval * multiplier;
  }

  private async performBehavioralVerification(sessionId: string): Promise<{
    verified: boolean;
    confidence: number;
    anomalies: any[];
  }> {
    const activities = this.activityBuffer.get(sessionId) || [];
    const anomalies = [];

    // Analyze recent activities
    const recentActivities = activities.slice(-20); // Last 20 activities
    
    if (recentActivities.length < 5) {
      return { verified: true, confidence: 0.5, anomalies };
    }

    // Perform behavioral analysis
    const key = `${recentActivities[0].userId}-${recentActivities[0].context.deviceId}`;
    const profile = this.behaviorProfiles.get(key);

    if (!profile) {
      return { verified: false, confidence: 0, anomalies: [{ type: 'no_profile', severity: 'high', description: 'No behavior profile found' }] };
    }

    // Compare with profile
    const confidence = this.calculateBehavioralConfidence(recentActivities, profile);
    const verified = confidence > 0.7;

    return { verified, confidence, anomalies };
  }

  private async performBiometricVerification(sessionId: string): Promise<{
    verified: boolean;
    confidence: number;
    anomalies: any[];
  }> {
    // Mock biometric verification
    return { verified: true, confidence: 0.95, anomalies: [] };
  }

  private async performContextualVerification(sessionId: string): Promise<{
    verified: boolean;
    confidence: number;
    anomalies: any[];
  }> {
    // Mock contextual verification
    return { verified: true, confidence: 0.85, anomalies: [] };
  }

  private analyzeBehaviorPatterns(activities: ContinuousAuthRequest[], existingProfile?: BehaviorProfile): BehaviorProfile {
    // Mock behavior pattern analysis
    const typingSpeeds = activities
      .filter(a => a.activity.type === 'keyboard')
      .map(a => this.calculateTypingSpeed(a.activity.data));

    const mouseSpeeds = activities
      .filter(a => a.activity.type === 'mouse_move')
      .map(a => this.calculateMouseSpeed(a.activity.data));

    const scrollSpeeds = activities
      .filter(a => a.activity.type === 'scroll')
      .map(a => this.calculateScrollSpeed(a.activity.data));

    return {
      userId: activities[0]?.userId || 'unknown',
      deviceId: activities[0]?.context.deviceId || 'unknown',
      patterns: {
        typingSpeed: {
          average: typingSpeeds.length > 0 ? typingSpeeds.reduce((sum, speed) => sum + speed, 0) / typingSpeeds.length : 200,
          variance: this.calculateVariance(typingSpeeds),
          distribution: this.calculateDistribution(typingSpeeds),
        },
        mouseMovement: {
          averageSpeed: mouseSpeeds.length > 0 ? mouseSpeeds.reduce((sum, speed) => sum + speed, 0) / mouseSpeeds.length : 500,
          acceleration: 100,
          pausePatterns: [0.5, 1.0, 1.5],
        },
        scrolling: {
          averageSpeed: scrollSpeeds.length > 0 ? scrollSpeeds.reduce((sum, speed) => sum + speed, 0) / scrollSpeeds.length : 800,
          direction: 'smooth',
          patterns: [400, 600, 800, 1000],
        },
        clickPatterns: {
          averageInterval: 2000,
          hotspots: [],
          pressure: 0.8,
        },
        session: {
          averageDuration: 3600000,
          peakHours: [9, 14, 16],
          breakPatterns: [300000, 600000],
        },
      },
      lastUpdated: new Date(),
      confidence: existingProfile ? Math.min(0.95, existingProfile.confidence + 0.05) : 0.8,
    };
  }

  private calculateTypingSpeed(data: any): number {
    // Mock typing speed calculation
    return 180 + Math.random() * 40; // 180-220 chars/min
  }

  private calculateMouseSpeed(data: any): number {
    // Mock mouse speed calculation
    return 400 + Math.random() * 200; // 400-600 pixels/sec
  }

  private calculateScrollSpeed(data: any): number {
    // Mock scroll speed calculation
    return 600 + Math.random() * 400; // 600-1000 pixels/sec
  }

  private calculateBehavioralConfidence(activities: ContinuousAuthRequest[], profile: BehaviorProfile): number {
    // Mock confidence calculation
    return 0.7 + Math.random() * 0.25; // 0.7-0.95
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateDistribution(values: number[]): number[] {
    // Mock distribution calculation
    return [180, 190, 200, 210, 220];
  }

  private async suspendSession(sessionId: string, reason: string): Promise<void> {
    this.logger.log(`Suspending continuous authentication for session ${sessionId}. Reason: ${reason}`);

    await this.sessionRepository.update(sessionId, {
      status: 'suspended',
    });
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async cleanupExpiredSessions(): Promise<void> {
    this.logger.log('Cleaning up expired continuous authentication sessions');

    const now = new Date();
    const expiredSessions = [];

    for (const [sessionId, sessionRisk] of this.sessionRisks.entries()) {
      // Clean up old risk factors
      sessionRisk.riskFactors = sessionRisk.riskFactors.filter(
        factor => now.getTime() - factor.timestamp.getTime() < 3600000 // Keep last hour
      );

      // Clean up resolved anomalies
      sessionRisk.anomalies = sessionRisk.anomalies.filter(
        anomaly => !anomaly.resolved || now.getTime() - anomaly.detectedAt.getTime() < 86400000 // Keep unresolved for 24 hours
      );
    }

    if (expiredSessions.length > 0) {
      this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  @Cron('0 0 * * * *') // Every hour
  async updateBehaviorProfiles(): Promise<void> {
    this.logger.log('Updating behavior profiles based on recent activity');

    for (const [sessionId, activities] of this.activityBuffer.entries()) {
      if (activities.length > 10) {
        const userId = activities[0].userId;
        const deviceId = activities[0].context.deviceId;
        
        await this.updateBehaviorProfile(userId, deviceId, activities);
      }
    }
  }
}

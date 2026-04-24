import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceFingerprint } from '../entities/device-fingerprint.entity';
import * as crypto from 'crypto';

export interface FingerprintRequest {
  userId?: string;
  userAgent: string;
  language: string;
  platform: string;
  vendor: string;
  hardware: {
    cores: number;
    memory: number;
    screen: {
      width: number;
      height: number;
      colorDepth: number;
      pixelRatio: number;
    };
  };
  browser: {
    name: string;
    version: string;
    plugins: string[];
    cookies: boolean;
    doNotTrack: boolean;
  };
  network: {
    connection: string;
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  canvas: string;
  webgl: string;
  audio: string;
  fonts: string[];
  timezone: string;
  timezoneOffset: number;
  screenResolution: string;
  colorGamut: string;
  reducedMotion: boolean;
  hdr: boolean;
  ipAddress: string;
  location?: {
    country: string;
    city: string;
    region: string;
    latitude: number;
    longitude: number;
  };
}

export interface FingerprintResult {
  fingerprintId: string;
  confidence: number;
  trustScore: number;
  riskScore: number;
  isNewDevice: boolean;
  riskFactors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }>;
  deviceInfo: {
    category: 'desktop' | 'mobile' | 'tablet' | 'unknown';
    os: string;
    browser: string;
    isBot: boolean;
    isEmulator: boolean;
    isTor: boolean;
    isVPN: boolean;
  };
  recommendations: string[];
}

export interface FingerprintComparison {
  match: boolean;
  similarity: number;
  differences: Array<{
    component: string;
    expected: string;
    actual: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  confidence: number;
}

export interface DeviceProfile {
  deviceId: string;
  userId?: string;
  fingerprint: Partial<FingerprintRequest>;
  trustScore: number;
  riskFactors: any;
  behavior: {
    typingSpeed: number;
    mouseMovement: number;
    sessionDuration: number;
    pageViews: number;
    lastSeen: Date;
  };
  security: {
    hasWebAuthn: boolean;
    hasBiometrics: boolean;
    lastSecurityScan: Date;
    vulnerabilities: string[];
  };
}

@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);
  private readonly fingerprintCache = new Map<string, DeviceProfile>();
  private readonly knownBots = new Set([
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
    'whatsapp', 'telegrambot', 'applebot', 'microsoftbot',
  ]);
  private readonly suspiciousIPRanges = [
    '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
    '127.0.0.0/8', '169.254.0.0/16',
  ];

  constructor(
    @InjectRepository(DeviceFingerprint)
    private readonly deviceFingerprintRepository: Repository<DeviceFingerprint>,
  ) {}

  async generateFingerprint(request: FingerprintRequest): Promise<FingerprintResult> {
    this.logger.log('Generating device fingerprint');

    // Generate unique device ID
    const fingerprintId = this.generateDeviceId(request);

    // Analyze device characteristics
    const deviceInfo = this.analyzeDeviceInfo(request);

    // Calculate confidence and risk scores
    const confidence = this.calculateConfidence(request);
    const riskScore = this.calculateRiskScore(request, deviceInfo);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(request, deviceInfo);

    // Check if device is known
    const existingProfile = await this.getDeviceProfile(fingerprintId);
    const isNewDevice = !existingProfile;

    // Calculate trust score
    let trustScore = 0.5; // Default trust score
    if (!isNewDevice && existingProfile) {
      trustScore = existingProfile.trustScore;
    } else {
      trustScore = this.calculateInitialTrustScore(riskScore, confidence);
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskFactors, trustScore, isNewDevice);

    // Create or update device profile
    await this.createOrUpdateDeviceProfile(fingerprintId, request, trustScore, riskFactors);

    return {
      fingerprintId,
      confidence,
      trustScore,
      riskScore,
      isNewDevice,
      riskFactors,
      deviceInfo,
      recommendations,
    };
  }

  async compareFingerprints(fingerprintId: string, request: FingerprintRequest): Promise<FingerprintComparison> {
    this.logger.log(`Comparing fingerprint with device ${fingerprintId}`);

    const existingProfile = await this.getDeviceProfile(fingerprintId);
    if (!existingProfile) {
      return {
        match: false,
        similarity: 0,
        differences: [{ component: 'device_id', expected: fingerprintId, actual: 'new', severity: 'high' }],
        confidence: 0,
      };
    }

    const differences = this.compareFingerprintData(existingProfile.fingerprint, request);
    const similarity = this.calculateSimilarity(differences);
    const match = similarity > 0.8; // 80% similarity threshold

    return {
      match,
      similarity,
      differences,
      confidence: match ? similarity : 0,
    };
  }

  async updateDeviceProfile(deviceId: string, updates: Partial<DeviceProfile>): Promise<void> {
    this.logger.log(`Updating device profile for ${deviceId}`);

    const existingProfile = await this.deviceFingerprintRepository.findOne({
      where: { deviceId },
    });

    if (existingProfile) {
      Object.assign(existingProfile, updates, {
        lastSeen: new Date(),
        updatedAt: new Date(),
      });

      await this.deviceFingerprintRepository.save(existingProfile);

      // Update cache
      if (this.fingerprintCache.has(deviceId)) {
        const cachedProfile = this.fingerprintCache.get(deviceId);
        Object.assign(cachedProfile, updates);
      }
    }
  }

  async getDeviceProfile(deviceId: string): Promise<DeviceProfile | null> {
    // Check cache first
    if (this.fingerprintCache.has(deviceId)) {
      return this.fingerprintCache.get(deviceId);
    }

    // Fetch from database
    const deviceFingerprint = await this.deviceFingerprintRepository.findOne({
      where: { deviceId },
    });

    if (!deviceFingerprint) {
      return null;
    }

    const profile: DeviceProfile = {
      deviceId: deviceFingerprint.deviceId,
      userId: deviceFingerprint.userId,
      fingerprint: deviceFingerprint.fingerprint,
      trustScore: deviceFingerprint.trustScore,
      riskFactors: deviceFingerprint.riskFactors,
      behavior: deviceFingerprint.behavior || {
        typingSpeed: 0,
        mouseMovement: 0,
        sessionDuration: 0,
        pageViews: 0,
        lastSeen: deviceFingerprint.lastSeen,
      },
      security: deviceFingerprint.security || {
        hasWebAuthn: false,
        hasBiometrics: false,
        lastSecurityScan: new Date(),
        vulnerabilities: [],
      },
    };

    // Cache the profile
    this.fingerprintCache.set(deviceId, profile);

    return profile;
  }

  async getDeviceHistory(deviceId: string, limit: number = 50): Promise<Array<{
      timestamp: Date;
      action: string;
      userId?: string;
      ipAddress: string;
      location?: any;
      riskScore: number;
    }>> {
    // Mock implementation - in production would fetch from audit logs
    const history = Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 3600000), // Every hour
      action: i === 0 ? 'login' : i % 3 === 0 ? 'logout' : 'activity',
      userId: 'user-' + Math.floor(Math.random() * 100),
      ipAddress: `192.168.1.${Math.floor(Math.random() * 254)}`,
      location: {
        country: 'US',
        city: 'New York',
        region: 'NY',
        latitude: 40.7128,
        longitude: -74.0060,
      },
      riskScore: Math.random() * 0.5,
    }));

    return history;
  }

  async getFingerprintStatistics(): Promise<{
    totalDevices: number;
    uniqueUsers: number;
    deviceCategories: Record<string, number>;
    riskDistribution: Record<string, number>;
    averageTrustScore: number;
    topRiskFactors: Array<{
      factor: string;
      count: number;
      severity: string;
    }>;
    botDetectionRate: number;
    emulatorDetectionRate: number;
  }> {
    // Mock implementation - in production would fetch from database
    return {
      totalDevices: 10000,
      uniqueUsers: 7500,
      deviceCategories: {
        desktop: 6000,
        mobile: 3500,
        tablet: 400,
        unknown: 100,
      },
      riskDistribution: {
        low: 7000,
        medium: 2000,
        high: 800,
        critical: 200,
      },
      averageTrustScore: 0.75,
      topRiskFactors: [
        { factor: 'suspicious_ip', count: 1500, severity: 'medium' },
        { factor: 'bot_detected', count: 800, severity: 'high' },
        { factor: 'emulator_detected', count: 300, severity: 'high' },
        { factor: 'tor_network', count: 200, severity: 'critical' },
        { factor: 'vpn_detected', count: 1200, severity: 'low' },
      ],
      botDetectionRate: 0.08, // 8%
      emulatorDetectionRate: 0.03, // 3%
    };
  }

  async blockDevice(deviceId: string, reason: string, duration?: number): Promise<void> {
    this.logger.log(`Blocking device ${deviceId}. Reason: ${reason}`);

    const device = await this.deviceFingerprintRepository.findOne({
      where: { deviceId },
    });

    if (device) {
      device.isBlocked = true;
      device.blockReason = reason;
      
      if (duration) {
        // In production, would set unblock time
        device.metadata = {
          ...device.metadata,
          blockedAt: new Date(),
          blockDuration: duration,
          unblockAt: new Date(Date.now() + duration),
        };
      }

      await this.deviceFingerprintRepository.save(device);
    }
  }

  async unblockDevice(deviceId: string): Promise<void> {
    this.logger.log(`Unblocking device ${deviceId}`);

    const device = await this.deviceFingerprintRepository.findOne({
      where: { deviceId },
    });

    if (device) {
      device.isBlocked = false;
      device.blockReason = null;
      device.metadata = {
        ...device.metadata,
        unblockedAt: new Date(),
      };

      await this.deviceFingerprintRepository.save(device);
    }
  }

  private generateDeviceId(request: FingerprintRequest): string {
    // Create a hash of various device characteristics
    const components = [
      request.userAgent,
      request.platform,
      request.vendor,
      JSON.stringify(request.hardware),
      JSON.stringify(request.browser),
      request.canvas,
      request.webgl,
      request.fonts.join(','),
      request.timezone,
      request.screenResolution,
      request.colorGamut,
    ];

    const hash = crypto.createHash('sha256');
    components.forEach(component => hash.update(component));
    
    return hash.digest('hex').substring(0, 32);
  }

  private analyzeDeviceInfo(request: FingerprintRequest): any {
    const userAgent = request.userAgent.toLowerCase();
    
    // Detect device category
    let category: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      category = 'mobile';
    } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
      category = 'tablet';
    } else if (userAgent.includes('windows') || userAgent.includes('mac') || userAgent.includes('linux')) {
      category = 'desktop';
    }

    // Detect OS
    let os = 'unknown';
    if (userAgent.includes('windows')) os = 'Windows';
    else if (userAgent.includes('mac')) os = 'macOS';
    else if (userAgent.includes('linux')) os = 'Linux';
    else if (userAgent.includes('android')) os = 'Android';
    else if (userAgent.includes('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) os = 'iOS';

    // Detect browser
    let browser = 'unknown';
    if (userAgent.includes('chrome')) browser = 'Chrome';
    else if (userAgent.includes('firefox')) browser = 'Firefox';
    else if (userAgent.includes('safari')) browser = 'Safari';
    else if (userAgent.includes('edge')) browser = 'Edge';
    else if (userAgent.includes('opera')) browser = 'Opera';

    // Detect bots
    const isBot = this.knownBots.some(bot => userAgent.includes(bot));

    // Detect emulators
    const isEmulator = this.detectEmulator(request);

    // Detect Tor
    const isTor = this.detectTor(request);

    // Detect VPN
    const isVPN = this.detectVPN(request);

    return {
      category,
      os,
      browser,
      isBot,
      isEmulator,
      isTor,
      isVPN,
    };
  }

  private calculateConfidence(request: FingerprintRequest): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on available data
    if (request.canvas && request.canvas.length > 100) confidence += 0.1;
    if (request.webgl && request.webgl.length > 100) confidence += 0.1;
    if (request.fonts && request.fonts.length > 10) confidence += 0.1;
    if (request.hardware && request.hardware.cores > 0) confidence += 0.05;
    if (request.network && request.network.connection) confidence += 0.05;
    if (request.timezone && request.timezoneOffset !== undefined) confidence += 0.05;

    // Decrease confidence for suspicious indicators
    const deviceInfo = this.analyzeDeviceInfo(request);
    if (deviceInfo.isBot) confidence -= 0.3;
    if (deviceInfo.isEmulator) confidence -= 0.2;
    if (deviceInfo.isTor) confidence -= 0.2;
    if (deviceInfo.isVPN) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  private calculateRiskScore(request: FingerprintRequest, deviceInfo: any): number {
    let riskScore = 0;

    // Bot detection
    if (deviceInfo.isBot) riskScore += 0.8;

    // Emulator detection
    if (deviceInfo.isEmulator) riskScore += 0.6;

    // Tor detection
    if (deviceInfo.isTor) riskScore += 0.7;

    // VPN detection
    if (deviceInfo.isVPN) riskScore += 0.3;

    // Suspicious IP
    if (this.isSuspiciousIP(request.ipAddress)) riskScore += 0.4;

    // Missing common browser features
    if (!request.browser.cookies) riskScore += 0.2;
    if (!request.browser.plugins || request.browser.plugins.length === 0) riskScore += 0.1;

    // Unusual hardware configuration
    if (request.hardware.cores > 32) riskScore += 0.2;
    if (request.hardware.memory > 64000) riskScore += 0.1;

    // Privacy settings
    if (request.browser.doNotTrack) riskScore += 0.05;

    return Math.min(1, riskScore);
  }

  private identifyRiskFactors(request: FingerprintRequest, deviceInfo: any): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
  }> {
    const riskFactors = [];

    if (deviceInfo.isBot) {
      riskFactors.push({
        type: 'bot_detected',
        severity: 'critical',
        description: 'Bot or automated tool detected',
      });
    }

    if (deviceInfo.isEmulator) {
      riskFactors.push({
        type: 'emulator_detected',
        severity: 'high',
        description: 'Emulator or virtual environment detected',
      });
    }

    if (deviceInfo.isTor) {
      riskFactors.push({
        type: 'tor_network',
        severity: 'critical',
        description: 'Tor network detected',
      });
    }

    if (deviceInfo.isVPN) {
      riskFactors.push({
        type: 'vpn_detected',
        severity: 'medium',
        description: 'VPN or proxy detected',
      });
    }

    if (this.isSuspiciousIP(request.ipAddress)) {
      riskFactors.push({
        type: 'suspicious_ip',
        severity: 'medium',
        description: 'Suspicious IP address detected',
      });
    }

    if (!request.browser.cookies) {
      riskFactors.push({
        type: 'no_cookies',
        severity: 'low',
        description: 'Cookies disabled',
      });
    }

    if (!request.browser.plugins || request.browser.plugins.length === 0) {
      riskFactors.push({
        type: 'no_plugins',
        severity: 'low',
        description: 'No browser plugins detected',
      });
    }

    if (request.hardware.cores > 32) {
      riskFactors.push({
        type: 'unusual_hardware',
        severity: 'medium',
        description: 'Unusual hardware configuration',
      });
    }

    return riskFactors;
  }

  private calculateInitialTrustScore(riskScore: number, confidence: number): number {
    // Base trust score adjusted by risk and confidence
    let trustScore = 0.5;

    // Adjust based on risk score
    trustScore -= riskScore * 0.5;

    // Adjust based on confidence
    trustScore += (confidence - 0.5) * 0.3;

    return Math.max(0, Math.min(1, trustScore));
  }

  private generateRecommendations(riskFactors: any[], trustScore: number, isNewDevice: boolean): string[] {
    const recommendations = [];

    if (isNewDevice) {
      recommendations.push('Complete device verification process');
      recommendations.push('Enable additional authentication factors');
    }

    if (trustScore < 0.3) {
      recommendations.push('Require step-up authentication');
      recommendations.push('Limit session duration');
    }

    if (riskFactors.some(f => f.severity === 'critical')) {
      recommendations.push('Block access attempt');
      recommendations.push('Notify security team');
    }

    if (riskFactors.some(f => f.type === 'bot_detected')) {
      recommendations.push('Implement CAPTCHA');
      recommendations.push('Rate limiting recommended');
    }

    if (riskFactors.some(f => f.type === 'emulator_detected')) {
      recommendations.push('Enhanced device verification');
      recommendations.push('Monitor for automated behavior');
    }

    return recommendations;
  }

  private async createOrUpdateDeviceProfile(
    fingerprintId: string,
    request: FingerprintRequest,
    trustScore: number,
    riskFactors: any[],
  ): Promise<void> {
    const existingDevice = await this.deviceFingerprintRepository.findOne({
      where: { deviceId: fingerprintId },
    });

    if (existingDevice) {
      // Update existing device
      existingDevice.trustScore = trustScore;
      existingDevice.riskFactors = riskFactors;
      existingDevice.lastSeen = new Date();
      existingDevice.sessionCount += 1;
      
      await this.deviceFingerprintRepository.save(existingDevice);
    } else {
      // Create new device
      const newDevice = this.deviceFingerprintRepository.create({
        id: crypto.randomUUID(),
        deviceId: fingerprintId,
        userId: request.userId,
        fingerprint: request,
        trustScore,
        riskFactors,
        location: request.location,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sessionCount: 1,
        authenticationCount: 1,
        isActive: true,
        isBlocked: false,
      });

      await this.deviceFingerprintRepository.save(newDevice);
    }
  }

  private compareFingerprintData(existing: Partial<FingerprintRequest>, current: FingerprintRequest): Array<{
    component: string;
    expected: string;
    actual: string;
    severity: 'low' | 'medium' | 'high';
  }> {
    const differences = [];

    // Compare user agent
    if (existing.userAgent !== current.userAgent) {
      differences.push({
        component: 'user_agent',
        expected: existing.userAgent,
        actual: current.userAgent,
        severity: 'medium',
      });
    }

    // Compare platform
    if (existing.platform !== current.platform) {
      differences.push({
        component: 'platform',
        expected: existing.platform,
        actual: current.platform,
        severity: 'high',
      });
    }

    // Compare screen resolution
    if (existing.screenResolution !== current.screenResolution) {
      differences.push({
        component: 'screen_resolution',
        expected: existing.screenResolution,
        actual: current.screenResolution,
        severity: 'low',
      });
    }

    // Compare fonts
    const existingFonts = existing.fonts?.sort().join(',') || '';
    const currentFonts = current.fonts.sort().join(',');
    if (existingFonts !== currentFonts) {
      differences.push({
        component: 'fonts',
        expected: existingFonts,
        actual: currentFonts,
        severity: 'low',
      });
    }

    // Compare timezone
    if (existing.timezone !== current.timezone) {
      differences.push({
        component: 'timezone',
        expected: existing.timezone,
        actual: current.timezone,
        severity: 'medium',
      });
    }

    return differences;
  }

  private calculateSimilarity(differences: any[]): number {
    if (differences.length === 0) return 1.0;

    const severityWeights = { low: 0.1, medium: 0.3, high: 0.5 };
    const totalWeight = differences.reduce((sum, diff) => sum + severityWeights[diff.severity], 0);
    const maxWeight = 5 * 0.5; // Assuming max 5 differences with high severity

    return Math.max(0, 1 - (totalWeight / maxWeight));
  }

  private detectEmulator(request: FingerprintRequest): boolean {
    const userAgent = request.userAgent.toLowerCase();
    
    // Common emulator indicators
    const emulatorIndicators = [
      'android sdk', 'genymotion', 'bluestacks', 'nox', 'memu',
      'virtualbox', 'vmware', 'qemu', 'xen', 'hyper-v',
      'sdk', 'emulator', 'simulator'
    ];

    return emulatorIndicators.some(indicator => userAgent.includes(indicator));
  }

  private detectTor(request: FingerprintRequest): boolean {
    const userAgent = request.userAgent.toLowerCase();
    
    // Tor browser indicators
    const torIndicators = ['tor browser', 'tor-browser'];
    
    // Check for Tor exit nodes (simplified)
    const torIPRanges = ['192.0.2.0/24']; // Mock Tor IP range
    
    return torIndicators.some(indicator => userAgent.includes(indicator)) ||
           this.isIPInRange(request.ipAddress, torIPRanges);
  }

  private detectVPN(request: FingerprintRequest): boolean {
    const userAgent = request.userAgent.toLowerCase();
    
    // VPN indicators
    const vpnIndicators = ['vpn', 'proxy', 'tunnel', 'anonymizer'];
    
    // Common VPN providers
    const vpnProviders = ['nordvpn', 'expressvpn', 'cyberghost', 'hotspot shield'];
    
    return vpnIndicators.some(indicator => userAgent.includes(indicator)) ||
           vpnProviders.some(provider => userAgent.includes(provider));
  }

  private isSuspiciousIP(ip: string): boolean {
    // Check against known suspicious IP ranges
    return this.suspiciousIPRanges.some(range => this.isIPInRange(ip, range));
  }

  private isIPInRange(ip: string, range: string): boolean {
    // Simplified IP range checking
    // In production, would use proper IP range parsing
    return range.split('/')[0] === ip.split('.')[0] + '.' + ip.split('.')[1];
  }

  @Cron('0 0 * * * *') // Daily cleanup
  async cleanupOldProfiles(): Promise<void> {
    this.logger.log('Cleaning up old device fingerprint profiles');

    // Remove profiles not seen in 90 days
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    
    // In production, would query and delete old profiles
    // For now, just log the action
    this.logger.log(`Profiles older than ${cutoffDate.toISOString()} would be cleaned up`);
  }

  @Cron('0 */6 * * * *') // Every 6 hours
  async updateTrustScores(): Promise<void> {
    this.logger.log('Updating device trust scores');

    // In production, would recalculate trust scores based on recent activity
    // For now, just log the action
    this.logger.log('Device trust scores would be updated based on recent activity');
  }
}

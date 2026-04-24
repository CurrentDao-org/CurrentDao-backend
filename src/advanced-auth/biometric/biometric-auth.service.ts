import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BiometricTemplate } from '../entities/biometric-template.entity';
import * as crypto from 'crypto';

export interface BiometricEnrollmentRequest {
  userId: string;
  type: 'face' | 'voice' | 'fingerprint' | 'iris' | 'behavioral';
  template: string;
  metadata: any;
  deviceInfo: any;
}

export interface BiometricVerificationRequest {
  userId: string;
  type: 'face' | 'voice' | 'fingerprint' | 'iris' | 'behavioral';
  sample: string;
  deviceId: string;
  context: any;
}

export interface BiometricEnrollmentResult {
  templateId: string;
  type: string;
  accuracy: number;
  confidence: number;
  securityLevel: 'low' | 'medium' | 'high' | 'maximum';
  enrollmentTime: number;
  recommendations: string[];
}

export interface BiometricVerificationResult {
  verified: boolean;
  confidence: number;
  accuracy: number;
  templateId: string;
  verificationTime: number;
  livenessDetected: boolean;
  antiSpoofingScore: number;
  riskScore: number;
  recommendations: string[];
}

export interface BiometricTemplate {
  id: string;
  userId: string;
  type: string;
  accuracy: number;
  confidence: number;
  securityFeatures: any;
  lastUsed: Date;
  usageCount: number;
  isActive: boolean;
}

@Injectable()
export class BiometricAuthService {
  private readonly logger = new Logger(BiometricAuthService.name);
  private readonly encryptionKey = process.env.BIOMETRIC_ENCRYPTION_KEY || 'default-key';
  private readonly maxTemplatesPerUser = 5;
  private readonly minAccuracyThreshold = 0.85;
  private readonly minConfidenceThreshold = 0.90;

  constructor(
    @InjectRepository(BiometricTemplate)
    private readonly biometricTemplateRepository: Repository<BiometricTemplate>,
  ) {}

  async enrollBiometric(request: BiometricEnrollmentRequest): Promise<BiometricEnrollmentResult> {
    this.logger.log(`Enrolling ${request.type} biometric for user ${request.userId}`);

    const startTime = Date.now();

    // Validate enrollment request
    await this.validateEnrollmentRequest(request);

    // Check user's existing templates
    const existingTemplates = await this.biometricTemplateRepository.find({
      where: { userId: request.userId, type: request.type, isActive: true },
    });

    if (existingTemplates.length >= this.maxTemplatesPerUser) {
      throw new Error(`Maximum ${this.maxTemplatesPerUser} templates per user for ${request.type}`);
    }

    // Process biometric template
    const processedTemplate = await this.processBiometricTemplate(request);

    // Create biometric template record
    const template = this.biometricTemplateRepository.create({
      id: crypto.randomUUID(),
      userId: request.userId,
      type: request.type,
      template: this.encryptTemplate(processedTemplate.template),
      metadata: {
        ...request.metadata,
        deviceInfo: request.deviceInfo,
        captureQuality: processedTemplate.quality,
        confidence: processedTemplate.confidence,
        algorithm: processedTemplate.algorithm,
        version: '1.0',
        captureDate: new Date(),
      },
      accuracy: processedTemplate.accuracy,
      falseAcceptanceRate: processedTemplate.falseAcceptanceRate,
      falseRejectionRate: processedTemplate.falseRejectionRate,
      securityFeatures: processedTemplate.securityFeatures,
      isActive: true,
      isPrimary: existingTemplates.length === 0,
    });

    await this.biometricTemplateRepository.save(template);

    const enrollmentTime = Date.now() - startTime;

    this.logger.log(`Biometric enrollment completed in ${enrollmentTime}ms with accuracy ${processedTemplate.accuracy}`);

    return {
      templateId: template.id,
      type: request.type,
      accuracy: processedTemplate.accuracy,
      confidence: processedTemplate.confidence,
      securityLevel: this.calculateSecurityLevel(processedTemplate),
      enrollmentTime,
      recommendations: this.generateEnrollmentRecommendations(processedTemplate),
    };
  }

  async verifyBiometric(request: BiometricVerificationRequest): Promise<BiometricVerificationResult> {
    this.logger.log(`Verifying ${request.type} biometric for user ${request.userId}`);

    const startTime = Date.now();

    // Get user's active templates
    const templates = await this.biometricTemplateRepository.find({
      where: { userId: request.userId, type: request.type, isActive: true },
    });

    if (templates.length === 0) {
      throw new Error(`No active ${request.type} templates found for user ${request.userId}`);
    }

    // Process verification sample
    const processedSample = await this.processBiometricSample(request);

    let bestMatch = null;
    let bestScore = 0;

    // Compare against all templates
    for (const template of templates) {
      const decryptedTemplate = this.decryptTemplate(template.template);
      const matchResult = await this.compareBiometrics(
        processedSample,
        decryptedTemplate,
        template.metadata,
      );

      if (matchResult.score > bestScore && matchResult.score >= this.minAccuracyThreshold) {
        bestScore = matchResult.score;
        bestMatch = template;
      }
    }

    const verificationTime = Date.now() - startTime;
    const verified = bestMatch !== null;

    if (verified && bestMatch) {
      // Update template usage statistics
      await this.updateTemplateUsage(bestMatch.id);
    }

    const result: BiometricVerificationResult = {
      verified,
      confidence: verified ? bestScore : 0,
      accuracy: verified ? bestScore : 0,
      templateId: bestMatch?.id || '',
      verificationTime,
      livenessDetected: processedSample.livenessDetected,
      antiSpoofingScore: processedSample.antiSpoofingScore,
      riskScore: this.calculateBiometricRisk(request, processedSample, verified),
      recommendations: this.generateVerificationRecommendations(verified, processedSample),
    };

    this.logger.log(`Biometric verification completed in ${verificationTime}ms. Verified: ${verified}`);

    return result;
  }

  async getUserBiometricTemplates(userId: string, type?: string): Promise<BiometricTemplate[]> {
    const whereClause: any = { userId, isActive: true };
    if (type) whereClause.type = type;

    const templates = await this.biometricTemplateRepository.find({
      where: whereClause,
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });

    return templates.map(template => ({
      id: template.id,
      userId: template.userId,
      type: template.type,
      accuracy: template.accuracy,
      confidence: template.metadata.confidence,
      securityFeatures: template.securityFeatures,
      lastUsed: template.lastUsed,
      usageCount: template.usageCount,
      isActive: template.isActive,
    }));
  }

  async deleteBiometricTemplate(templateId: string, userId: string): Promise<void> {
    const template = await this.biometricTemplateRepository.findOne({
      where: { id: templateId, userId },
    });

    if (!template) {
      throw new Error(`Biometric template ${templateId} not found`);
    }

    template.isActive = false;
    await this.biometricTemplateRepository.save(template);

    // If this was the primary template, promote another one
    if (template.isPrimary) {
      const remainingTemplates = await this.biometricTemplateRepository.find({
        where: { userId, type: template.type, isActive: true },
        order: { createdAt: 'DESC' },
      });

      if (remainingTemplates.length > 0) {
        remainingTemplates[0].isPrimary = true;
        await this.biometricTemplateRepository.save(remainingTemplates[0]);
      }
    }

    this.logger.log(`Biometric template ${templateId} deleted for user ${userId}`);
  }

  async updateBiometricTemplate(
    templateId: string,
    userId: string,
    updates: Partial<BiometricTemplate>,
  ): Promise<BiometricTemplate> {
    const template = await this.biometricTemplateRepository.findOne({
      where: { id: templateId, userId, isActive: true },
    });

    if (!template) {
      throw new Error(`Biometric template ${templateId} not found`);
    }

    if (updates.template) {
      // Process and encrypt new template
      const processedTemplate = await this.processBiometricTemplate({
        userId,
        type: template.type,
        template: updates.template,
        metadata: template.metadata,
        deviceInfo: {},
      });

      template.template = this.encryptTemplate(processedTemplate.template);
      template.accuracy = processedTemplate.accuracy;
      template.falseAcceptanceRate = processedTemplate.falseAcceptanceRate;
      template.falseRejectionRate = processedTemplate.falseRejectionRate;
      template.securityFeatures = processedTemplate.securityFeatures;
    }

    await this.biometricTemplateRepository.save(template);

    return {
      id: template.id,
      userId: template.userId,
      type: template.type,
      accuracy: template.accuracy,
      confidence: template.metadata.confidence,
      securityFeatures: template.securityFeatures,
      lastUsed: template.lastUsed,
      usageCount: template.usageCount,
      isActive: template.isActive,
    };
  }

  async getBiometricStatistics(userId: string): Promise<{
    totalTemplates: number;
    templatesByType: Record<string, number>;
    averageAccuracy: number;
    usageStatistics: {
      totalVerifications: number;
      averageTime: number;
      successRate: number;
      lastUsed: Date;
    };
    securityMetrics: {
      averageFalseAcceptanceRate: number;
      averageFalseRejectionRate: number;
      livenessDetectionRate: number;
      antiSpoofingSuccessRate: number;
    };
  }> {
    const templates = await this.biometricTemplateRepository.find({
      where: { userId, isActive: true },
    });

    const templatesByType = templates.reduce((acc, template) => {
      acc[template.type] = (acc[template.type] || 0) + 1;
      return acc;
    }, {});

    const averageAccuracy = templates.length > 0
      ? templates.reduce((sum, template) => sum + template.accuracy, 0) / templates.length
      : 0;

    const totalVerifications = templates.reduce((sum, template) => sum + template.usageCount, 0);
    const totalFailures = templates.reduce((sum, template) => sum + template.failureCount, 0);
    const successRate = totalVerifications > 0 ? ((totalVerifications - totalFailures) / totalVerifications) * 100 : 0;

    const avgFalseAcceptanceRate = templates.length > 0
      ? templates.reduce((sum, template) => sum + template.falseAcceptanceRate, 0) / templates.length
      : 0;

    const avgFalseRejectionRate = templates.length > 0
      ? templates.reduce((sum, template) => sum + template.falseRejectionRate, 0) / templates.length
      : 0;

    return {
      totalTemplates: templates.length,
      templatesByType,
      averageAccuracy,
      usageStatistics: {
        totalVerifications,
        averageTime: 850, // Mock average time
        successRate,
        lastUsed: templates.reduce((latest, template) => 
          template.lastUsed && (!latest || template.lastUsed > latest) ? template.lastUsed : latest, null),
      },
      securityMetrics: {
        averageFalseAcceptanceRate: avgFalseAcceptanceRate,
        averageFalseRejectionRate: avgFalseRejectionRate,
        livenessDetectionRate: 0.98, // Mock rate
        antiSpoofingSuccessRate: 0.95, // Mock rate
      },
    };
  }

  private async validateEnrollmentRequest(request: BiometricEnrollmentRequest): Promise<void> {
    if (!request.userId || !request.type || !request.template) {
      throw new Error('Missing required fields for biometric enrollment');
    }

    if (!['face', 'voice', 'fingerprint', 'iris', 'behavioral'].includes(request.type)) {
      throw new Error(`Unsupported biometric type: ${request.type}`);
    }

    // Validate template format and quality
    const templateValidation = await this.validateTemplateFormat(request.template, request.type);
    if (!templateValidation.isValid) {
      throw new Error(`Invalid biometric template: ${templateValidation.error}`);
    }
  }

  private async processBiometricTemplate(request: BiometricEnrollmentRequest): Promise<{
    template: string;
    quality: number;
    confidence: number;
    accuracy: number;
    falseAcceptanceRate: number;
    falseRejectionRate: number;
    algorithm: string;
    securityFeatures: any;
  }> {
    // Mock biometric processing - in production, this would integrate with actual biometric SDKs
    const algorithm = this.getAlgorithmForType(request.type);
    
    // Simulate template processing
    const processedTemplate = this.extractFeatures(request.template, request.type);
    const quality = this.assessTemplateQuality(processedTemplate, request.type);
    const confidence = Math.min(0.99, quality + Math.random() * 0.1);
    const accuracy = Math.min(0.999, confidence + Math.random() * 0.05);
    
    return {
      template: processedTemplate,
      quality,
      confidence,
      accuracy,
      falseAcceptanceRate: 0.001, // 0.1% FAR
      falseRejectionRate: 0.01, // 1% FRR
      algorithm,
      securityFeatures: {
        livenessDetection: true,
        antiSpoofing: true,
        encryption: 'AES-256-GCM',
        hashAlgorithm: 'SHA-256',
      },
    };
  }

  private async processBiometricSample(request: BiometricVerificationRequest): Promise<{
    template: string;
    livenessDetected: boolean;
    antiSpoofingScore: number;
    quality: number;
  }> {
    // Mock biometric sample processing
    const processedSample = this.extractFeatures(request.sample, request.type);
    const livenessDetected = this.detectLiveness(processedSample, request.type);
    const antiSpoofingScore = this.assessAntiSpoofing(processedSample, request.type);
    const quality = this.assessTemplateQuality(processedSample, request.type);

    return {
      template: processedSample,
      livenessDetected,
      antiSpoofingScore,
      quality,
    };
  }

  private async compareBiometrics(
    sample: any,
    template: any,
    metadata: any,
  ): Promise<{ score: number; match: boolean }> {
    // Mock biometric comparison - in production, this would use actual comparison algorithms
    const algorithm = metadata.algorithm;
    const score = this.calculateSimilarityScore(sample, template, algorithm);
    const match = score >= this.minAccuracyThreshold;

    return { score, match };
  }

  private encryptTemplate(template: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    cipher.setAAD(Buffer.from('biometric-template'));
    
    let encrypted = cipher.update(template, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  private decryptTemplate(encryptedTemplate: string): string {
    const parts = encryptedTemplate.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    decipher.setAAD(Buffer.from('biometric-template'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private async updateTemplateUsage(templateId: string): Promise<void> {
    await this.biometricTemplateRepository.update(templateId, {
      lastUsed: new Date(),
      usageCount: () => 'usageCount + 1',
    });
  }

  private calculateSecurityLevel(processedTemplate: any): 'low' | 'medium' | 'high' | 'maximum' {
    if (processedTemplate.accuracy >= 0.99 && processedTemplate.securityFeatures.livenessDetection) {
      return 'maximum';
    } else if (processedTemplate.accuracy >= 0.95) {
      return 'high';
    } else if (processedTemplate.accuracy >= 0.90) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  private generateEnrollmentRecommendations(processedTemplate: any): string[] {
    const recommendations = [];

    if (processedTemplate.accuracy < 0.95) {
      recommendations.push('Consider re-enrolling for higher accuracy');
    }

    if (processedTemplate.quality < 0.90) {
      recommendations.push('Improve capture conditions for better quality');
    }

    if (!processedTemplate.securityFeatures.livenessDetection) {
      recommendations.push('Enable liveness detection for enhanced security');
    }

    return recommendations;
  }

  private generateVerificationRecommendations(verified: boolean, processedSample: any): string[] {
    const recommendations = [];

    if (!verified) {
      recommendations.push('Biometric verification failed - please try again');
      recommendations.push('Ensure proper lighting and positioning');
    }

    if (processedSample.quality < 0.85) {
      recommendations.push('Sample quality is low - please recapture');
    }

    if (!processedSample.livenessDetected) {
      recommendations.push('Liveness detection failed - please ensure you are present');
    }

    return recommendations;
  }

  private calculateBiometricRisk(
    request: BiometricVerificationRequest,
    processedSample: any,
    verified: boolean,
  ): number {
    let risk = 0;

    // Risk from verification failure
    if (!verified) {
      risk += 0.5;
    }

    // Risk from low quality
    if (processedSample.quality < 0.80) {
      risk += 0.3;
    }

    // Risk from failed liveness detection
    if (!processedSample.livenessDetected) {
      risk += 0.4;
    }

    // Risk from suspicious context (mock)
    if (request.context?.suspicious) {
      risk += 0.2;
    }

    return Math.min(1.0, risk);
  }

  private getAlgorithmForType(type: string): string {
    const algorithms = {
      face: 'FaceNet-512',
      voice: 'MFCC-GMM',
      fingerprint: 'Minutiae-Extraction',
      iris: 'Daugman-Algorithm',
      behavioral: 'Keystroke-Dynamics',
    };
    return algorithms[type] || 'Generic-Algorithm';
  }

  private extractFeatures(template: string, type: string): string {
    // Mock feature extraction - in production, this would use actual biometric feature extraction
    return `extracted_${type}_${template.slice(0, 20)}`;
  }

  private assessTemplateQuality(template: string, type: string): number {
    // Mock quality assessment - in production, this would analyze actual biometric quality metrics
    return 0.85 + Math.random() * 0.14; // 85-99% quality
  }

  private detectLiveness(template: string, type: string): boolean {
    // Mock liveness detection - in production, this would use actual liveness detection algorithms
    return Math.random() > 0.02; // 98% liveness detection rate
  }

  private assessAntiSpoofing(template: string, type: string): number {
    // Mock anti-spoofing assessment - in production, this would use actual anti-spoofing techniques
    return 0.90 + Math.random() * 0.09; // 90-99% anti-spoofing score
  }

  private calculateSimilarityScore(sample: any, template: any, algorithm: string): number {
    // Mock similarity calculation - in production, this would use actual biometric comparison algorithms
    return 0.85 + Math.random() * 0.14; // 85-99% similarity score
  }

  private async validateTemplateFormat(template: string, type: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    // Mock template validation - in production, this would validate actual biometric template formats
    if (!template || template.length < 100) {
      return { isValid: false, error: 'Template too short or empty' };
    }

    return { isValid: true };
  }
}

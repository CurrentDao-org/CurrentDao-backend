import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface RiskAssessment {
  id: string;
  overallScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  categories: CategoryRisk[];
  jurisdictions: JurisdictionRisk[];
  recommendations: string[];
  flaggedEntities: string[];
  assessmentDate: Date;
  nextReviewDate: Date;
}

export interface CategoryRisk {
  category: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
}

export interface JurisdictionRisk {
  jurisdiction: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  regulatoryChanges: number;
  complianceIssues: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
}

@Injectable()
export class ComplianceRiskService implements OnModuleInit {
  private readonly logger = new Logger(ComplianceRiskService.name);
  private readonly assessments = new Map<string, RiskAssessment>();
  private readonly riskFactors = new Map<string, RiskFactor[]>();

  async onModuleInit() {
    this.logger.log('Compliance Risk Service initialized');
    await this.initializeRiskFactors();
  }

  private async initializeRiskFactors() {
    const defaultFactors: Record<string, RiskFactor[]> = {
      aml: [
        { name: 'Transaction Monitoring', weight: 0.3, score: 0.8, description: 'Effectiveness of transaction monitoring systems' },
        { name: 'Sanction Screening', weight: 0.25, score: 0.9, description: 'Coverage of sanction lists' },
        { name: 'Suspicious Activity Reporting', weight: 0.25, score: 0.7, description: 'Timeliness and quality of SARs' },
        { name: 'Customer Due Diligence', weight: 0.2, score: 0.85, description: 'CDD/KYC processes' },
      ],
      kyc: [
        { name: 'Identity Verification', weight: 0.4, score: 0.9, description: 'Identity verification processes' },
        { name: 'Document Verification', weight: 0.3, score: 0.8, description: 'Document verification systems' },
        { name: 'Ongoing Monitoring', weight: 0.3, score: 0.75, description: 'Customer monitoring procedures' },
      ],
      sanctions: [
        { name: 'List Coverage', weight: 0.5, score: 0.95, description: 'Coverage of international sanction lists' },
        { name: 'Screening Frequency', weight: 0.3, score: 0.85, description: 'Frequency of screenings' },
        { name: 'False Positive Rate', weight: 0.2, score: 0.7, description: 'Accuracy of screening systems' },
      ],
    };

    Object.entries(defaultFactors).forEach(([category, factors]) => {
      this.riskFactors.set(category, factors);
    });

    this.logger.log('Initialized default risk factors');
  }

  async getAssessment(): Promise<RiskAssessment> {
    const latestAssessment = this.getLatestAssessment();
    
    if (!latestAssessment || this.isAssessmentOutdated(latestAssessment)) {
      return this.performRiskAssessment();
    }

    return latestAssessment;
  }

  async updateAssessment(riskData: any): Promise<RiskAssessment> {
    const assessment = await this.performRiskAssessment(riskData);
    this.logger.log('Risk assessment updated with new data');
    return assessment;
  }

  private async performRiskAssessment(customData?: any): Promise<RiskAssessment> {
    const assessmentId = `assessment_${Date.now()}`;
    const assessmentDate = new Date();

    const categories = await this.assessCategories(customData);
    const jurisdictions = await this.assessJurisdictions(customData);
    const overallScore = this.calculateOverallScore(categories, jurisdictions);
    const riskLevel = this.determineRiskLevel(overallScore);
    const recommendations = this.generateRecommendations(categories, jurisdictions, riskLevel);
    const flaggedEntities = this.identifyFlaggedEntities(customData);

    const assessment: RiskAssessment = {
      id: assessmentId,
      overallScore,
      riskLevel,
      categories,
      jurisdictions,
      recommendations,
      flaggedEntities,
      assessmentDate,
      nextReviewDate: new Date(assessmentDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    this.assessments.set(assessmentId, assessment);
    this.logger.log(`Risk assessment completed: ${assessmentId} - Score: ${overallScore} - Risk Level: ${riskLevel}`);

    return assessment;
  }

  private async assessCategories(customData?: any): Promise<CategoryRisk[]> {
    const categories: CategoryRisk[] = [];

    for (const [category, factors] of this.riskFactors) {
      const categoryScore = this.calculateCategoryScore(factors, customData);
      const riskLevel = this.determineRiskLevel(categoryScore);

      categories.push({
        category,
        score: categoryScore,
        riskLevel,
        factors,
      });
    }

    return categories;
  }

  private calculateCategoryScore(factors: RiskFactor[], customData?: any): number {
    const weightedScore = factors.reduce((sum, factor) => {
      const adjustedScore = customData?.[factor.name] !== undefined 
        ? customData[factor.name] 
        : factor.score;
      return sum + (adjustedScore * factor.weight);
    }, 0);

    return Math.min(weightedScore, 1.0);
  }

  private async assessJurisdictions(customData?: any): Promise<JurisdictionRisk[]> {
    const jurisdictions = ['US', 'EU', 'UK', 'CA', 'AU', 'JP', 'SG'];
    const jurisdictionRisks: JurisdictionRisk[] = [];

    for (const jurisdiction of jurisdictions) {
      const score = this.calculateJurisdictionScore(jurisdiction, customData);
      const riskLevel = this.determineRiskLevel(score);

      jurisdictionRisks.push({
        jurisdiction,
        score,
        riskLevel,
        regulatoryChanges: Math.floor(Math.random() * 5),
        complianceIssues: Math.floor(Math.random() * 10),
      });
    }

    return jurisdictionRisks.sort((a, b) => b.score - a.score);
  }

  private calculateJurisdictionScore(jurisdiction: string, customData?: any): number {
    // Mock implementation - in production, this would use actual regulatory data
    const baseScores: Record<string, number> = {
      'US': 0.7,
      'EU': 0.8,
      'UK': 0.75,
      'CA': 0.85,
      'AU': 0.9,
      'JP': 0.8,
      'SG': 0.85,
    };

    return customData?.[jurisdiction] !== undefined 
      ? customData[jurisdiction] 
      : baseScores[jurisdiction] || 0.5;
  }

  private calculateOverallScore(categories: CategoryRisk[], jurisdictions: JurisdictionRisk[]): number {
    const categoryWeight = 0.6;
    const jurisdictionWeight = 0.4;

    const categoryScore = categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length;
    const jurisdictionScore = jurisdictions.reduce((sum, jur) => sum + jur.score, 0) / jurisdictions.length;

    return (categoryScore * categoryWeight) + (jurisdictionScore * jurisdictionWeight);
  }

  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.9) return 'low';
    if (score >= 0.7) return 'medium';
    if (score >= 0.5) return 'high';
    return 'critical';
  }

  private generateRecommendations(categories: CategoryRisk[], jurisdictions: JurisdictionRisk[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    // Category-based recommendations
    categories.forEach(category => {
      if (category.riskLevel === 'high' || category.riskLevel === 'critical') {
        recommendations.push(`Address high risk in ${category.category} compliance`);
        
        category.factors.forEach(factor => {
          if (factor.score < 0.7) {
            recommendations.push(`Improve ${factor.name}: ${factor.description}`);
          }
        });
      }
    });

    // Jurisdiction-based recommendations
    jurisdictions
      .filter(jur => jur.riskLevel === 'high' || jur.riskLevel === 'critical')
      .forEach(jur => {
        recommendations.push(`Review compliance procedures for ${jur.jurisdiction}`);
      });

    // Risk level-based recommendations
    if (riskLevel === 'critical') {
      recommendations.push('Immediate management attention required');
      recommendations.push('Consider suspending high-risk activities');
    } else if (riskLevel === 'high') {
      recommendations.push('Implement additional controls within 30 days');
      recommendations.push('Increase monitoring frequency');
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  private identifyFlaggedEntities(customData?: any): string[] {
    // Mock implementation - in production, this would query actual entity data
    return ['ENTITY_001', 'ENTITY_002', 'ENTITY_003'].filter(() => Math.random() > 0.7);
  }

  private getLatestAssessment(): RiskAssessment | undefined {
    const assessments = Array.from(this.assessments.values());
    return assessments.sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())[0];
  }

  private isAssessmentOutdated(assessment: RiskAssessment): boolean {
    const now = new Date();
    const daysSinceAssessment = (now.getTime() - assessment.assessmentDate.getTime()) / (24 * 60 * 60 * 1000);
    return daysSinceAssessment > 7; // Consider outdated after 7 days
  }

  async getAssessments(query: any): Promise<RiskAssessment[]> {
    let assessments = Array.from(this.assessments.values());

    if (query.riskLevel) {
      assessments = assessments.filter(assessment => assessment.riskLevel === query.riskLevel);
    }

    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      assessments = assessments.filter(assessment => 
        assessment.assessmentDate >= startDate && assessment.assessmentDate <= endDate
      );
    }

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return assessments
      .sort((a, b) => b.assessmentDate.getTime() - a.assessmentDate.getTime())
      .slice(offset, offset + limit);
  }

  async getAssessment(id: string): Promise<RiskAssessment | undefined> {
    return this.assessments.get(id);
  }

  async updateRiskFactor(category: string, factor: RiskFactor): Promise<void> {
    const factors = this.riskFactors.get(category) || [];
    const existingFactorIndex = factors.findIndex(f => f.name === factor.name);

    if (existingFactorIndex >= 0) {
      factors[existingFactorIndex] = factor;
    } else {
      factors.push(factor);
    }

    this.riskFactors.set(category, factors);
    this.logger.log(`Updated risk factor: ${category} - ${factor.name}`);
  }

  async getRiskFactors(category?: string): Promise<Record<string, RiskFactor[]>> {
    if (category) {
      const factors = this.riskFactors.get(category);
      return factors ? { [category]: factors } : {};
    }

    return Object.fromEntries(this.riskFactors);
  }

  async getRiskTrends(): Promise<any> {
    const assessments = Array.from(this.assessments.values());
    const recentAssessments = assessments.slice(-10); // Last 10 assessments

    return {
      trend: recentAssessments.map(assessment => ({
        date: assessment.assessmentDate,
        score: assessment.overallScore,
        riskLevel: assessment.riskLevel,
      })),
      averageScore: recentAssessments.reduce((sum, a) => sum + a.overallScore, 0) / recentAssessments.length,
      improving: recentAssessments.length > 1 && 
        recentAssessments[recentAssessments.length - 1].overallScore > recentAssessments[0].overallScore,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async performScheduledAssessment(): Promise<void> {
    try {
      await this.performRiskAssessment();
      this.logger.log('Scheduled risk assessment completed');
    } catch (error) {
      this.logger.error('Error in scheduled risk assessment:', error);
    }
  }

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async cleanupOldAssessments(): Promise<void> {
    try {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      let cleanedCount = 0;

      for (const [id, assessment] of this.assessments) {
        if (assessment.assessmentDate < oneYearAgo) {
          this.assessments.delete(id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old risk assessments`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up old assessments:', error);
    }
  }

  async assessPortfolioRisk() {
    const assessment = await this.getAssessment();
    return {
      score: assessment.overallScore,
      riskLevel: assessment.riskLevel.toUpperCase(),
      flaggedJurisdictions: assessment.jurisdictions
        .filter(j => j.riskLevel === 'high' || j.riskLevel === 'critical')
        .map(j => j.jurisdiction),
      recommendations: assessment.recommendations,
      timestamp: assessment.assessmentDate.toISOString(),
    };
  }
}

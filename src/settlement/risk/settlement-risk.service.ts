import { Injectable, Logger } from '@nestjs/common';
import { Party } from '../dto/settlement.dto';

export interface RiskAssessment {
  partyId: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  creditRating: string;
  collateralRequirement: number;
  availableCollateral: number;
  riskFactors: RiskFactor[];
  recommendation: string;
  lastAssessed: Date;
}

export interface RiskFactor {
  type: 'CREDIT_RISK' | 'MARKET_RISK' | 'OPERATIONAL_RISK' | 'LIQUIDITY_RISK' | 'CONCENTRATION_RISK';
  severity: number; // 0-1
  description: string;
  mitigation?: string;
}

export interface SettlementRisk {
  settlementId: string;
  overallRiskScore: number;
  partyRisks: Record<string, RiskAssessment>;
  riskMitigation: RiskMitigation[];
  monitoringRequired: boolean;
  alerts: RiskAlert[];
}

export interface RiskMitigation {
  type: 'COLLATERAL' | 'NETTING' | 'POSITION_LIMITS' | 'HAIRCUTS' | 'CONTINGENT_FUNDING';
  description: string;
  effectiveness: number; // 0-1
  implementation: string;
}

export interface RiskAlert {
  alertId: string;
  partyId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

@Injectable()
export class SettlementRiskService {
  private readonly logger = new Logger(SettlementRiskService.name);
  private readonly riskAssessments = new Map<string, RiskAssessment>();
  private readonly riskAlerts = new Map<string, RiskAlert[]>();

  constructor() {
    // Initialize sample data asynchronously
    this.initializeSampleData().catch(error => {
      this.logger.error('Failed to initialize sample data:', error);
    });
  }

  async getPartyRiskAssessment(partyId: string): Promise<RiskAssessment> {
    this.logger.log(`Getting risk assessment for party ${partyId}`);

    let assessment = this.riskAssessments.get(partyId);
    if (!assessment) {
      // Create new assessment if not exists
      assessment = await this.performRiskAssessment(partyId);
      this.riskAssessments.set(partyId, assessment);
    }

    // Update assessment with latest data
    const updatedAssessment = await this.updateRiskAssessment(assessment);
    this.riskAssessments.set(partyId, updatedAssessment);

    return updatedAssessment;
  }

  async assessSettlementRisk(
    settlementId: string,
    parties: Party[],
    transactions: any[],
  ): Promise<SettlementRisk> {
    this.logger.log(`Assessing settlement risk for ${settlementId}`);

    const partyRisks: Record<string, RiskAssessment> = {};
    let overallRiskScore = 0;
    const riskMitigation: RiskMitigation[] = [];
    const alerts: RiskAlert[] = [];
    let monitoringRequired = false;

    // Assess each party
    for (const party of parties) {
      const assessment = await this.getPartyRiskAssessment(party.id);
      partyRisks[party.id] = assessment;
      overallRiskScore += assessment.riskScore;

      // Check for alerts
      if (assessment.riskLevel === 'HIGH' || assessment.riskLevel === 'CRITICAL') {
        monitoringRequired = true;
        alerts.push(this.createRiskAlert(party.id, assessment));
      }
    }

    // Calculate overall risk score
    overallRiskScore = overallRiskScore / parties.length;

    // Determine risk mitigation strategies
    if (overallRiskScore > 70) {
      riskMitigation.push({
        type: 'COLLATERAL',
        description: 'Increase collateral requirements for high-risk parties',
        effectiveness: 0.8,
        implementation: 'Immediate',
      });
    }

    if (overallRiskScore > 50) {
      riskMitigation.push({
        type: 'NETTING',
        description: 'Apply multilateral netting to reduce exposure',
        effectiveness: 0.6,
        implementation: 'Standard',
      });
    }

    return {
      settlementId,
      overallRiskScore,
      partyRisks,
      riskMitigation,
      monitoringRequired,
      alerts,
    };
  }

  async monitorRiskLevels(): Promise<RiskAlert[]> {
    this.logger.log('Monitoring risk levels for all parties');

    const alerts: RiskAlert[] = [];
    const threshold = 70; // Risk score threshold for alerts

    for (const [partyId, assessment] of this.riskAssessments) {
      if (assessment.riskScore > threshold) {
        const alert = this.createRiskAlert(partyId, assessment);
        alerts.push(alert);

        // Store alert
        const partyAlerts = this.riskAlerts.get(partyId) || [];
        partyAlerts.push(alert);
        this.riskAlerts.set(partyId, partyAlerts);
      }
    }

    return alerts;
  }

  async updateRiskFactors(partyId: string, newFactors: RiskFactor[]): Promise<RiskAssessment> {
    this.logger.log(`Updating risk factors for party ${partyId}`);

    const assessment = this.riskAssessments.get(partyId);
    if (!assessment) {
      throw new Error(`Risk assessment not found for party ${partyId}`);
    }

    // Update risk factors
    assessment.riskFactors = [...assessment.riskFactors, ...newFactors];

    // Recalculate risk score
    const newRiskScore = this.calculateRiskScore(assessment.riskFactors);
    assessment.riskScore = newRiskScore;
    assessment.riskLevel = this.determineRiskLevel(newRiskScore);
    assessment.lastAssessed = new Date();

    // Update recommendation
    assessment.recommendation = this.generateRecommendation(assessment);

    this.riskAssessments.set(partyId, assessment);

    return assessment;
  }

  async getRiskMetrics(timeRange?: string): Promise<any> {
    const assessments = Array.from(this.riskAssessments.values());
    
    const riskDistribution = this.calculateRiskDistribution(assessments);
    const averageRiskScore = assessments.reduce((sum, a) => sum + a.riskScore, 0) / assessments.length;
    const highRiskParties = assessments.filter(a => a.riskLevel === 'HIGH' || a.riskLevel === 'CRITICAL');
    
    const allAlerts = Array.from(this.riskAlerts.values()).flat();
    const recentAlerts = this.filterAlertsByTimeRange(allAlerts, timeRange);

    return {
      totalAssessments: assessments.length,
      averageRiskScore,
      riskDistribution,
      highRiskParties: highRiskParties.length,
      totalAlerts: allAlerts.length,
      recentAlerts: recentAlerts.length,
      riskFactorBreakdown: this.calculateRiskFactorBreakdown(assessments),
      collateralCoverage: this.calculateCollateralCoverage(assessments),
      timestamp: new Date().toISOString(),
    };
  }

  async optimizeRiskModels(optimizationRequest: any): Promise<any> {
    this.logger.log('Optimizing risk models');

    // Simulate risk model optimization
    const optimization = {
      currentAccuracy: 82.5,
      optimizedAccuracy: 91.2,
      improvement: 10.6,
      modelUpdates: [
        {
          model: 'Credit Risk',
          currentAccuracy: 78.3,
          optimizedAccuracy: 87.5,
          improvement: 11.7,
        },
        {
          model: 'Market Risk',
          currentAccuracy: 85.1,
          optimizedAccuracy: 92.8,
          improvement: 9.1,
        },
        {
          model: 'Operational Risk',
          currentAccuracy: 79.8,
          optimizedAccuracy: 88.9,
          improvement: 11.4,
        },
      ],
      recommendations: [
        'Implement machine learning for risk prediction',
        'Add real-time market data integration',
        'Enhance counterparty risk scoring',
        'Implement dynamic risk thresholds',
      ],
      expectedBenefits: {
        improvedAccuracy: 10.6,
        reducedFalsePositives: 25.3,
        fasterProcessing: 35.7,
      },
    };

    return {
      optimization,
      timestamp: new Date().toISOString(),
    };
  }

  private async performRiskAssessment(partyId: string): Promise<RiskAssessment> {
    // Generate sample risk factors
    const riskFactors: RiskFactor[] = [
      {
        type: 'CREDIT_RISK',
        severity: Math.random() * 0.8,
        description: 'Credit worthiness assessment',
        mitigation: 'Regular credit monitoring',
      },
      {
        type: 'MARKET_RISK',
        severity: Math.random() * 0.6,
        description: 'Market volatility exposure',
        mitigation: 'Hedging strategies',
      },
      {
        type: 'OPERATIONAL_RISK',
        severity: Math.random() * 0.4,
        description: 'Operational capability',
        mitigation: 'Process improvements',
      },
      {
        type: 'LIQUIDITY_RISK',
        severity: Math.random() * 0.5,
        description: 'Liquidity position',
        mitigation: 'Liquidity buffers',
      },
    ];

    const riskScore = this.calculateRiskScore(riskFactors);
    const riskLevel = this.determineRiskLevel(riskScore);

    return {
      partyId,
      riskScore,
      riskLevel,
      creditRating: this.calculateCreditRating(riskScore),
      collateralRequirement: this.calculateCollateralRequirement(riskScore),
      availableCollateral: Math.random() * 1000000,
      riskFactors,
      recommendation: this.generateRecommendation({ riskScore, riskLevel } as any),
      lastAssessed: new Date(),
    };
  }

  private async updateRiskAssessment(assessment: RiskAssessment): Promise<RiskAssessment> {
    // Simulate real-time risk factor updates
    const updatedFactors = assessment.riskFactors.map(factor => ({
      ...factor,
      severity: Math.max(0, Math.min(1, factor.severity + (Math.random() - 0.5) * 0.1)),
    }));

    const newRiskScore = this.calculateRiskScore(updatedFactors);
    const newRiskLevel = this.determineRiskLevel(newRiskScore);

    return {
      ...assessment,
      riskScore: newRiskScore,
      riskLevel: newRiskLevel,
      riskFactors: updatedFactors,
      recommendation: this.generateRecommendation({ ...assessment, riskScore: newRiskScore, riskLevel: newRiskLevel }),
      lastAssessed: new Date(),
    };
  }

  private calculateRiskScore(riskFactors: RiskFactor[]): number {
    const weightedSum = riskFactors.reduce((sum, factor) => {
      const weight = this.getRiskFactorWeight(factor.type);
      return sum + (factor.severity * weight);
    }, 0);

    return Math.min(100, weightedSum * 100);
  }

  private getRiskFactorWeight(type: RiskFactor['type']): number {
    const weights = {
      CREDIT_RISK: 0.35,
      MARKET_RISK: 0.25,
      OPERATIONAL_RISK: 0.2,
      LIQUIDITY_RISK: 0.15,
      CONCENTRATION_RISK: 0.05,
    };
    return weights[type] || 0.1;
  }

  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score <= 30) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    if (score <= 80) return 'HIGH';
    return 'CRITICAL';
  }

  private calculateCreditRating(riskScore: number): string {
    if (riskScore <= 20) return 'AAA';
    if (riskScore <= 35) return 'AA';
    if (riskScore <= 50) return 'A';
    if (riskScore <= 65) return 'BBB';
    if (riskScore <= 80) return 'BB';
    return 'B';
  }

  private calculateCollateralRequirement(riskScore: number): number {
    const baseRequirement = 100000;
    const multiplier = 1 + (riskScore / 100) * 2;
    return baseRequirement * multiplier;
  }

  private generateRecommendation(assessment: RiskAssessment): string {
    switch (assessment.riskLevel) {
      case 'LOW':
        return 'Standard monitoring sufficient';
      case 'MEDIUM':
        return 'Increase monitoring frequency';
      case 'HIGH':
        return 'Require additional collateral';
      case 'CRITICAL':
        return 'Immediate action required - consider settlement limits';
      default:
        return 'Monitor closely';
    }
  }

  private createRiskAlert(partyId: string, assessment: RiskAssessment): RiskAlert {
    return {
      alertId: this.generateAlertId(),
      partyId,
      severity: assessment.riskLevel,
      message: `Risk score of ${assessment.riskScore} exceeds threshold for party ${partyId}`,
      timestamp: new Date(),
      acknowledged: false,
    };
  }

  private calculateRiskDistribution(assessments: RiskAssessment[]): any {
    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    
    for (const assessment of assessments) {
      distribution[assessment.riskLevel]++;
    }
    
    return distribution;
  }

  private calculateRiskFactorBreakdown(assessments: RiskAssessment[]): any {
    const breakdown: Record<string, number> = {};
    
    for (const assessment of assessments) {
      for (const factor of assessment.riskFactors) {
        breakdown[factor.type] = (breakdown[factor.type] || 0) + factor.severity;
      }
    }
    
    // Average the severities
    for (const type in breakdown) {
      breakdown[type] = breakdown[type] / assessments.length;
    }
    
    return breakdown;
  }

  private calculateCollateralCoverage(assessments: RiskAssessment[]): number {
    const totalRequired = assessments.reduce((sum, a) => sum + a.collateralRequirement, 0);
    const totalAvailable = assessments.reduce((sum, a) => sum + a.availableCollateral, 0);
    
    return totalRequired > 0 ? (totalAvailable / totalRequired) * 100 : 100;
  }

  private filterAlertsByTimeRange(alerts: RiskAlert[], timeRange?: string): RiskAlert[] {
    if (!timeRange) {
      // Default to last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return alerts.filter(a => a.timestamp >= cutoff);
    }

    const hours = parseInt(timeRange.replace('h', ''));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return alerts.filter(a => a.timestamp >= cutoff);
  }

  private async initializeSampleData(): Promise<void> {
    // Initialize with sample risk assessments
    const sampleParties = ['party_001', 'party_002', 'party_003'];
    
    for (const partyId of sampleParties) {
      const assessment = await this.performRiskAssessment(partyId);
      this.riskAssessments.set(partyId, assessment);
    }
  }

  private generateAlertId(): string {
    return `RA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

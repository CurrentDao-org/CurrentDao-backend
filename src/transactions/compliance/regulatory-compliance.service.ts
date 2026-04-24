import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Transaction } from '../entities/transaction.entity';
import { TransactionAuditLog } from '../entities/transaction-audit-log.entity';
import { ComplianceLevel } from '../enums/transaction.enum';

export interface ComplianceReport {
  reportId: string;
  reportType: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalTransactions: number;
    compliantTransactions: number;
    nonCompliantTransactions: number;
    pendingReviewTransactions: number;
    complianceRate: number;
    totalVolume: number;
    highRiskTransactions: number;
    suspiciousTransactions: number;
  };
  regulatoryChecks: {
    amlChecks: number;
    kycChecks: number;
    sanctionsScreening: number;
    crossBorderCompliance: number;
    energyTradingCompliance: number;
  };
  violations: Array<{
    transactionId: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    regulatoryReference: string;
    resolved: boolean;
  }>;
  recommendations: string[];
  generatedAt: Date;
}

export interface ComplianceMetrics {
  totalReports: number;
  averageComplianceRate: number;
  violationCount: number;
  resolvedViolations: number;
  pendingViolations: number;
  highRiskTransactions: number;
  suspiciousActivityReports: number;
  regulatoryFilings: number;
}

@Injectable()
export class RegulatoryComplianceService {
  private readonly logger = new Logger(RegulatoryComplianceService.name);
  private readonly complianceMetrics: ComplianceMetrics = {
    totalReports: 0,
    averageComplianceRate: 0,
    violationCount: 0,
    resolvedViolations: 0,
    pendingViolations: 0,
    highRiskTransactions: 0,
    suspiciousActivityReports: 0,
    regulatoryFilings: 0,
  };

  // Regulatory requirements and thresholds
  private readonly REGULATORY_REQUIREMENTS = {
    MIN_COMPLIANCE_RATE: 95, // 95% minimum compliance rate
    MAX_HIGH_RISK_PERCENTAGE: 5, // Maximum 5% high-risk transactions
    MAX_SUSPICIOUS_PERCENTAGE: 0.1, // Maximum 0.1% suspicious transactions
    REPORTING_THRESHOLDS: {
      DAILY: 10000, // Report daily for 10k+ transactions
      WEEKLY: 50000, // Report weekly for 50k+ transactions
      MONTHLY: 200000, // Report monthly for 200k+ transactions
    },
    AML_THRESHOLDS: {
      SINGLE_TRANSACTION: 10000, // $10k single transaction limit
      DAILY_AGGREGATE: 25000, // $25k daily aggregate limit
      MONTHLY_AGGREGATE: 100000, // $100k monthly aggregate limit
    },
  };

  // Regulatory jurisdictions and their requirements
  private readonly JURISDICTION_REQUIREMENTS = {
    US: {
      reportTypes: ['SAR', 'CTR', 'FBAR'],
      thresholds: { single: 10000, daily: 25000, monthly: 100000 },
    },
    EU: {
      reportTypes: ['AML', 'KYC', 'GDPR'],
      thresholds: { single: 10000, daily: 15000, monthly: 75000 },
    },
    UK: {
      reportTypes: ['SAR', 'MLR', 'PSR'],
      thresholds: { single: 10000, daily: 20000, monthly: 100000 },
    },
    CA: {
      reportTypes: ['STR', 'CTR', 'FINTRAC'],
      thresholds: { single: 10000, daily: 10000, monthly: 50000 },
    },
  };

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionAuditLog)
    private readonly auditLogRepository: Repository<TransactionAuditLog>,
  ) {}

  async generateComplianceReport(
    reportType: 'daily' | 'weekly' | 'monthly' | 'ad-hoc',
    startDate?: Date,
    endDate?: Date
  ): Promise<ComplianceReport> {
    const reportId = `compliance_${reportType}_${Date.now()}`;
    const period = this.calculateReportPeriod(reportType, startDate, endDate);
    
    this.logger.log(`Generating ${reportType} compliance report: ${reportId} for period ${period.startDate.toISOString()} to ${period.endDate.toISOString()}`);

    try {
      // Get transactions for the period
      const transactions = await this.getTransactionsForPeriod(period.startDate, period.endDate);
      
      // Perform compliance analysis
      const complianceAnalysis = await this.performComplianceAnalysis(transactions);
      
      // Identify violations
      const violations = await this.identifyViolations(transactions, period);
      
      // Generate regulatory checks summary
      const regulatoryChecks = await this.summarizeRegulatoryChecks(transactions);
      
      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(complianceAnalysis, violations);

      const report: ComplianceReport = {
        reportId,
        reportType,
        period,
        summary: {
          totalTransactions: transactions.length,
          compliantTransactions: complianceAnalysis.compliantCount,
          nonCompliantTransactions: complianceAnalysis.nonCompliantCount,
          pendingReviewTransactions: complianceAnalysis.pendingReviewCount,
          complianceRate: complianceAnalysis.complianceRate,
          totalVolume: complianceAnalysis.totalVolume,
          highRiskTransactions: complianceAnalysis.highRiskCount,
          suspiciousTransactions: complianceAnalysis.suspiciousCount,
        },
        regulatoryChecks,
        violations,
        recommendations,
        generatedAt: new Date(),
      };

      // Update metrics
      this.updateComplianceMetrics(report);

      this.logger.log(
        `Compliance report ${reportId} generated. ` +
        `Compliance rate: ${report.summary.complianceRate.toFixed(2)}%, ` +
        `Violations: ${violations.length}, ` +
        `High-risk: ${report.summary.highRiskTransactions}`
      );

      return report;
    } catch (error) {
      this.logger.error(`Failed to generate compliance report ${reportId}:`, error);
      throw error;
    }
  }

  private calculateReportPeriod(
    reportType: 'daily' | 'weekly' | 'monthly' | 'ad-hoc',
    startDate?: Date,
    endDate?: Date
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    
    if (reportType === 'ad-hoc' && startDate && endDate) {
      return { startDate, endDate };
    }

    switch (reportType) {
      case 'daily':
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        return { startDate: startOfDay, endDate: endOfDay };

      case 'weekly':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { startDate: startOfWeek, endDate: endOfWeek };

      case 'monthly':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return { startDate: startOfMonth, endDate: endOfMonth };

      default:
        throw new Error(`Invalid report type: ${reportType}`);
    }
  }

  private async getTransactionsForPeriod(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'ASC' },
    });
  }

  private async performComplianceAnalysis(transactions: Transaction[]): Promise<{
    compliantCount: number;
    nonCompliantCount: number;
    pendingReviewCount: number;
    complianceRate: number;
    totalVolume: number;
    highRiskCount: number;
    suspiciousCount: number;
  }> {
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let pendingReviewCount = 0;
    let totalVolume = 0;
    let highRiskCount = 0;
    let suspiciousCount = 0;

    for (const transaction of transactions) {
      totalVolume += transaction.amount;

      // Analyze compliance data
      if (transaction.complianceData) {
        switch (transaction.complianceData.isCompliant) {
          case true:
            compliantCount++;
            break;
          case false:
            nonCompliantCount++;
            break;
          default:
            pendingReviewCount++;
            break;
        }

        // Check for high-risk indicators
        if (transaction.complianceData.complianceScore < 70) {
          highRiskCount++;
        }

        // Check for suspicious activity flags
        if (transaction.complianceData.flags && transaction.complianceData.flags.length > 0) {
          suspiciousCount++;
        }
      } else {
        pendingReviewCount++;
      }
    }

    const totalProcessed = compliantCount + nonCompliantCount + pendingReviewCount;
    const complianceRate = totalProcessed > 0 ? (compliantCount / totalProcessed) * 100 : 0;

    return {
      compliantCount,
      nonCompliantCount,
      pendingReviewCount,
      complianceRate,
      totalVolume,
      highRiskCount,
      suspiciousCount,
    };
  }

  private async identifyViolations(
    transactions: Transaction[],
    period: { startDate: Date; endDate: Date }
  ): Promise<Array<{
    transactionId: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    regulatoryReference: string;
    resolved: boolean;
  }>> {
    const violations: Array<{
      transactionId: string;
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      description: string;
      regulatoryReference: string;
      resolved: boolean;
    }> = [];

    // Check AML violations
    violations.push(...await this.checkAMLViolations(transactions));

    // Check sanctions violations
    violations.push(...await this.checkSanctionsViolations(transactions));

    // Check cross-border compliance violations
    violations.push(...await this.checkCrossBorderViolations(transactions));

    // Check energy trading specific violations
    violations.push(...await this.checkEnergyTradingViolations(transactions));

    // Check reporting threshold violations
    violations.push(...await this.checkReportingViolations(transactions, period));

    return violations;
  }

  private async checkAMLViolations(transactions: Transaction[]): Promise<Array<any>> {
    const violations: Array<any> = [];
    const thresholds = this.REGULATORY_REQUIREMENTS.AML_THRESHOLDS;

    // Check single transaction thresholds
    for (const transaction of transactions) {
      if (transaction.amount >= thresholds.SINGLE_TRANSACTION) {
        violations.push({
          transactionId: transaction.transactionId,
          type: 'aml_single_transaction_threshold',
          severity: transaction.amount >= thresholds.DAILY_AGGREGATE ? 'high' : 'medium',
          description: `Transaction amount $${transaction.amount.toLocaleString()} exceeds single transaction threshold of $${thresholds.SINGLE_TRANSACTION.toLocaleString()}`,
          regulatoryReference: 'Bank Secrecy Act 31 CFR 103.11',
          resolved: false,
        });
      }
    }

    // Check daily aggregate thresholds
    const dailyAggregates = new Map<string, number>();
    for (const transaction of transactions) {
      const date = transaction.createdAt.toISOString().split('T')[0];
      const current = dailyAggregates.get(date) || 0;
      dailyAggregates.set(date, current + transaction.amount);
    }

    for (const [date, total] of dailyAggregates) {
      if (total >= thresholds.DAILY_AGGREGATE) {
        violations.push({
          transactionId: `daily_aggregate_${date}`,
          type: 'aml_daily_aggregate_threshold',
          severity: total >= thresholds.MONTHLY_AGGREGATE ? 'critical' : 'high',
          description: `Daily aggregate of $${total.toLocaleString()} for ${date} exceeds threshold of $${thresholds.DAILY_AGGREGATE.toLocaleString()}`,
          regulatoryReference: 'Bank Secrecy Act 31 CFR 103.11',
          resolved: false,
        });
      }
    }

    return violations;
  }

  private async checkSanctionsViolations(transactions: Transaction[]): Promise<Array<any>> {
    const violations: Array<any> = [];
    const sanctionedCountries = ['XX', 'YY', 'ZZ']; // Placeholder for actual sanctioned countries

    for (const transaction of transactions) {
      if (sanctionedCountries.includes(transaction.sourceCountry) || 
          sanctionedCountries.includes(transaction.targetCountry)) {
        violations.push({
          transactionId: transaction.transactionId,
          type: 'sanctions_violation',
          severity: 'critical',
          description: `Transaction involves sanctioned country: ${transaction.sourceCountry} -> ${transaction.targetCountry}`,
          regulatoryReference: 'OFAC Sanctions Regulations',
          resolved: false,
        });
      }
    }

    return violations;
  }

  private async checkCrossBorderViolations(transactions: Transaction[]): Promise<Array<any>> {
    const violations: Array<any> = [];

    for (const transaction of transactions) {
      if (transaction.sourceCountry !== transaction.targetCountry) {
        // Check if proper cross-border documentation exists
        if (!transaction.complianceData || 
            !transaction.complianceData.regulatoryChecks.includes('cross_border_compliance')) {
          violations.push({
            transactionId: transaction.transactionId,
            type: 'cross_border_compliance_missing',
            severity: 'high',
            description: `Cross-border transaction missing required compliance documentation`,
            regulatoryReference: 'International Trade Regulations',
            resolved: false,
          });
        }
      }
    }

    return violations;
  }

  private async checkEnergyTradingViolations(transactions: Transaction[]): Promise<Array<any>> {
    const violations: Array<any> = [];

    for (const transaction of transactions) {
      if (transaction.energyData) {
        // Check for renewable energy certificates
        if (transaction.energyData.energyType === 'renewable' && 
            (!transaction.notes || !transaction.notes.includes('certificate'))) {
          violations.push({
            transactionId: transaction.transactionId,
            type: 'renewable_energy_certificate_missing',
            severity: 'medium',
            description: `Renewable energy transaction missing certificate information`,
            regulatoryReference: 'Renewable Energy Certificate Requirements',
            resolved: false,
          });
        }

        // Check for proper energy trading licenses
        if (!transaction.complianceData || 
            !transaction.complianceData.regulatoryChecks.includes('energy_trading_license')) {
          violations.push({
            transactionId: transaction.transactionId,
            type: 'energy_trading_license_missing',
            severity: 'high',
            description: `Energy trading transaction missing required license verification`,
            regulatoryReference: 'Energy Trading License Requirements',
            resolved: false,
          });
        }
      }
    }

    return violations;
  }

  private async checkReportingViolations(
    transactions: Transaction[],
    period: { startDate: Date; endDate: Date }
  ): Promise<Array<any>> {
    const violations: Array<any> = [];
    const transactionCount = transactions.length;

    // Check if reporting thresholds are met
    const thresholds = this.REGULATORY_REQUIREMENTS.REPORTING_THRESHOLDS;
    const daysInPeriod = Math.ceil((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysInPeriod === 1 && transactionCount >= thresholds.DAILY) {
      violations.push({
        transactionId: 'reporting_threshold_daily',
        type: 'daily_reporting_required',
        severity: 'medium',
        description: `Daily transaction count (${transactionCount}) exceeds reporting threshold (${thresholds.DAILY})`,
        regulatoryReference: 'Regulatory Reporting Requirements',
        resolved: false,
      });
    }

    if (daysInPeriod === 7 && transactionCount >= thresholds.WEEKLY) {
      violations.push({
        transactionId: 'reporting_threshold_weekly',
        type: 'weekly_reporting_required',
        severity: 'medium',
        description: `Weekly transaction count (${transactionCount}) exceeds reporting threshold (${thresholds.WEEKLY})`,
        regulatoryReference: 'Regulatory Reporting Requirements',
        resolved: false,
      });
    }

    if (daysInPeriod >= 28 && transactionCount >= thresholds.MONTHLY) {
      violations.push({
        transactionId: 'reporting_threshold_monthly',
        type: 'monthly_reporting_required',
        severity: 'medium',
        description: `Monthly transaction count (${transactionCount}) exceeds reporting threshold (${thresholds.MONTHLY})`,
        regulatoryReference: 'Regulatory Reporting Requirements',
        resolved: false,
      });
    }

    return violations;
  }

  private async summarizeRegulatoryChecks(transactions: Transaction[]): Promise<{
    amlChecks: number;
    kycChecks: number;
    sanctionsScreening: number;
    crossBorderCompliance: number;
    energyTradingCompliance: number;
  }> {
    const summary = {
      amlChecks: 0,
      kycChecks: 0,
      sanctionsScreening: 0,
      crossBorderCompliance: 0,
      energyTradingCompliance: 0,
    };

    for (const transaction of transactions) {
      if (transaction.complianceData && transaction.complianceData.regulatoryChecks) {
        for (const check of transaction.complianceData.regulatoryChecks) {
          switch (check) {
            case 'aml_check':
              summary.amlChecks++;
              break;
            case 'kyc_check':
              summary.kycChecks++;
              break;
            case 'sanctions_screening':
              summary.sanctionsScreening++;
              break;
            case 'cross_border_compliance':
              summary.crossBorderCompliance++;
              break;
            case 'energy_trading_compliance':
              summary.energyTradingCompliance++;
              break;
          }
        }
      }
    }

    return summary;
  }

  private generateComplianceRecommendations(
    analysis: any,
    violations: Array<any>
  ): string[] {
    const recommendations: string[] = [];

    if (analysis.complianceRate < this.REGULATORY_REQUIREMENTS.MIN_COMPLIANCE_RATE) {
      recommendations.push(`Compliance rate (${analysis.complianceRate.toFixed(2)}%) is below required threshold (${this.REGULATORY_REQUIREMENTS.MIN_COMPLIANCE_RATE}%). Implement enhanced compliance controls.`);
    }

    if (analysis.highRiskCount > (analysis.compliantCount + analysis.nonCompliantCount + analysis.pendingReviewCount) * (this.REGULATORY_REQUIREMENTS.MAX_HIGH_RISK_PERCENTAGE / 100)) {
      recommendations.push(`High-risk transaction percentage exceeds acceptable limit. Implement additional risk monitoring and controls.`);
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      recommendations.push(`Address ${criticalViolations.length} critical compliance violations immediately to avoid regulatory penalties.`);
    }

    if (violations.some(v => v.type.includes('sanctions'))) {
      recommendations.push('Review and enhance sanctions screening procedures to prevent violations.');
    }

    if (violations.some(v => v.type.includes('aml'))) {
      recommendations.push('Strengthen AML monitoring and reporting procedures to meet regulatory requirements.');
    }

    if (violations.some(v => v.type.includes('cross_border'))) {
      recommendations.push('Ensure all cross-border transactions have proper documentation and compliance verification.');
    }

    if (violations.some(v => v.type.includes('energy_trading'))) {
      recommendations.push('Verify energy trading licenses and renewable energy certificates for all relevant transactions.');
    }

    return recommendations;
  }

  private updateComplianceMetrics(report: ComplianceReport): void {
    this.complianceMetrics.totalReports++;
    
    // Update average compliance rate
    const totalRate = this.complianceMetrics.averageComplianceRate * (this.complianceMetrics.totalReports - 1) + report.summary.complianceRate;
    this.complianceMetrics.averageComplianceRate = totalRate / this.complianceMetrics.totalReports;

    // Update violation counts
    this.complianceMetrics.violationCount += report.violations.length;
    this.complianceMetrics.pendingViolations += report.violations.filter(v => !v.resolved).length;
    this.complianceMetrics.resolvedViolations += report.violations.filter(v => v.resolved).length;

    // Update other metrics
    this.complianceMetrics.highRiskTransactions += report.summary.highRiskTransactions;
    this.complianceMetrics.suspiciousActivityReports += report.summary.suspiciousTransactions;
    this.complianceMetrics.regulatoryFilings++;
  }

  async getComplianceMetrics(): Promise<ComplianceMetrics> {
    return { ...this.complianceMetrics };
  }

  async generateSuspiciousActivityReport(transactionIds: string[]): Promise<{
    reportId: string;
    transactions: Transaction[];
    suspiciousActivity: Array<{
      transactionId: string;
      suspiciousPatterns: string[];
      riskScore: number;
      recommendedAction: string;
    }>;
    filingRequired: boolean;
    generatedAt: Date;
  }> {
    const reportId = `sar_${Date.now()}`;
    const transactions = await this.transactionRepository.find({
      where: { transactionId: transactionIds as any },
    });

    const suspiciousActivity = transactions.map(transaction => ({
      transactionId: transaction.transactionId,
      suspiciousPatterns: this.identifySuspiciousPatterns(transaction),
      riskScore: this.calculateRiskScore(transaction),
      recommendedAction: this.recommendAction(transaction),
    }));

    const filingRequired = suspiciousActivity.some(activity => activity.riskScore >= 80);

    return {
      reportId,
      transactions,
      suspiciousActivity,
      filingRequired,
      generatedAt: new Date(),
    };
  }

  private identifySuspiciousPatterns(transaction: Transaction): string[] {
    const patterns: string[] = [];

    if (transaction.amount > 50000) {
      patterns.push('large_amount');
    }

    if (transaction.sourceCountry !== transaction.targetCountry) {
      patterns.push('cross_border');
    }

    if (transaction.complianceData && transaction.complianceData.flags.length > 0) {
      patterns.push('compliance_flags');
    }

    if (transaction.energyData && transaction.energyData.energyType === 'renewable') {
      patterns.push('renewable_energy');
    }

    return patterns;
  }

  private calculateRiskScore(transaction: Transaction): number {
    let score = 0;

    // Amount-based risk
    if (transaction.amount > 100000) score += 40;
    else if (transaction.amount > 50000) score += 25;
    else if (transaction.amount > 10000) score += 15;

    // Cross-border risk
    if (transaction.sourceCountry !== transaction.targetCountry) score += 20;

    // Compliance flags risk
    if (transaction.complianceData && transaction.complianceData.flags.length > 0) {
      score += transaction.complianceData.flags.length * 10;
    }

    // Compliance score risk
    if (transaction.complianceData && transaction.complianceData.complianceScore < 70) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  private recommendAction(transaction: Transaction): string {
    const riskScore = this.calculateRiskScore(transaction);

    if (riskScore >= 80) return 'file_sar_immediately';
    if (riskScore >= 60) return 'enhanced_monitoring';
    if (riskScore >= 40) return 'additional_review';
    return 'standard_processing';
  }

  // Scheduled compliance reports
  @Cron('0 2 * * *') // 2:00 AM daily
  async generateDailyComplianceReport(): Promise<void> {
    try {
      await this.generateComplianceReport('daily');
      this.logger.log('Daily compliance report generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate daily compliance report:', error);
    }
  }

  @Cron('0 3 * * 1') // 3:00 AM every Monday
  async generateWeeklyComplianceReport(): Promise<void> {
    try {
      await this.generateComplianceReport('weekly');
      this.logger.log('Weekly compliance report generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate weekly compliance report:', error);
    }
  }

  @Cron('0 4 1 * *') // 4:00 AM on 1st of each month
  async generateMonthlyComplianceReport(): Promise<void> {
    try {
      await this.generateComplianceReport('monthly');
      this.logger.log('Monthly compliance report generated successfully');
    } catch (error) {
      this.logger.error('Failed to generate monthly compliance report:', error);
    }
  }
}

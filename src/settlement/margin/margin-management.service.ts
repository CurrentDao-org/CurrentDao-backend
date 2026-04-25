import { Injectable, Logger } from '@nestjs/common';
import { MarginCallDto } from '../dto/settlement.dto';

export interface MarginAccount {
  partyId: string;
  totalCollateral: number;
  requiredMargin: number;
  availableMargin: number;
  marginCalls: number;
  lastUpdated: Date;
}

export interface MarginRequirement {
  partyId: string;
  requiredMargin: number;
  currentCollateral: number;
  shortfall: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

@Injectable()
export class MarginManagementService {
  private readonly logger = new Logger(MarginManagementService.name);
  private readonly marginAccounts = new Map<string, MarginAccount>();

  constructor() {
    this.initializeSampleData();
  }

  async checkMarginRequirements(partyId: string): Promise<{ sufficient: boolean; details: MarginRequirement }> {
    this.logger.log(`Checking margin requirements for party ${partyId}`);

    const account = this.marginAccounts.get(partyId);
    if (!account) {
      throw new Error(`Margin account not found for party ${partyId}`);
    }

    const sufficient = account.availableMargin >= 0;
    const riskLevel = this.calculateRiskLevel(account);

    const requirement: MarginRequirement = {
      partyId,
      requiredMargin: account.requiredMargin,
      currentCollateral: account.totalCollateral,
      shortfall: Math.abs(account.availableMargin),
      riskLevel,
    };

    return { sufficient, details: requirement };
  }

  async issueMarginCall(marginCall: MarginCallDto): Promise<any> {
    this.logger.log(`Issuing margin call for party ${marginCall.partyId}`);

    const account = this.marginAccounts.get(marginCall.partyId);
    if (!account) {
      throw new Error(`Margin account not found for party ${marginCall.partyId}`);
    }

    // Update margin requirements
    account.requiredMargin = marginCall.requiredMargin;
    account.marginCalls++;
    account.lastUpdated = new Date();

    // Calculate deadline
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + (marginCall.deadlineHours || 24));

    const marginCallResponse = {
      marginCallId: this.generateMarginCallId(),
      partyId: marginCall.partyId,
      requiredMargin: marginCall.requiredMargin,
      currentMargin: marginCall.currentMargin,
      shortfall: marginCall.requiredMargin - marginCall.currentMargin,
      deadline: deadline.toISOString(),
      status: 'ISSUED',
      reason: marginCall.reason || 'Insufficient margin coverage',
      issuedAt: new Date().toISOString(),
    };

    this.logger.log(`Margin call ${marginCallResponse.marginCallId} issued for party ${marginCall.partyId}`);
    return marginCallResponse;
  }

  async calculateMarginRequirements(
    partyId: string,
    exposure: number,
    riskFactors: any[],
  ): Promise<MarginRequirement> {
    this.logger.log(`Calculating margin requirements for party ${partyId}`);

    const baseMargin = exposure * 0.1; // 10% base margin
    const riskMultiplier = this.calculateRiskMultiplier(riskFactors);
    const requiredMargin = baseMargin * riskMultiplier;

    const account = this.marginAccounts.get(partyId);
    const currentCollateral = account?.totalCollateral || 0;
    const shortfall = Math.max(0, requiredMargin - currentCollateral);

    return {
      partyId,
      requiredMargin,
      currentCollateral,
      shortfall,
      riskLevel: this.calculateRiskLevelFromShortfall(shortfall, requiredMargin),
    };
  }

  async updateCollateral(partyId: string, amount: number, type: 'DEPOSIT' | 'WITHDRAWAL'): Promise<any> {
    this.logger.log(`Updating collateral for party ${partyId}: ${type} ${amount}`);

    const account = this.marginAccounts.get(partyId);
    if (!account) {
      throw new Error(`Margin account not found for party ${partyId}`);
    }

    if (type === 'DEPOSIT') {
      account.totalCollateral += amount;
    } else {
      if (account.totalCollateral - amount < account.requiredMargin) {
        throw new Error('Insufficient collateral for withdrawal');
      }
      account.totalCollateral -= amount;
    }

    account.availableMargin = account.totalCollateral - account.requiredMargin;
    account.lastUpdated = new Date();

    return {
      partyId,
      type,
      amount,
      newBalance: account.totalCollateral,
      availableMargin: account.availableMargin,
      timestamp: account.lastUpdated.toISOString(),
    };
  }

  async getMarginAccount(partyId: string): Promise<MarginAccount> {
    const account = this.marginAccounts.get(partyId);
    if (!account) {
      throw new Error(`Margin account not found for party ${partyId}`);
    }
    return account;
  }

  async getMarginMetrics(timeRange?: string): Promise<any> {
    const accounts = Array.from(this.marginAccounts.values());
    
    const totalCollateral = accounts.reduce((sum, acc) => sum + acc.totalCollateral, 0);
    const totalRequiredMargin = accounts.reduce((sum, acc) => sum + acc.requiredMargin, 0);
    const totalAvailableMargin = accounts.reduce((sum, acc) => sum + acc.availableMargin, 0);
    const totalMarginCalls = accounts.reduce((sum, acc) => sum + acc.marginCalls, 0);

    const accountsWithShortfall = accounts.filter(acc => acc.availableMargin < 0);
    const criticalAccounts = accounts.filter(acc => this.calculateRiskLevel(acc) === 'CRITICAL');

    return {
      totalAccounts: accounts.length,
      totalCollateral,
      totalRequiredMargin,
      totalAvailableMargin,
      marginCallRatio: (totalMarginCalls / accounts.length) * 100,
      accountsWithShortfall: accountsWithShortfall.length,
      criticalAccounts: criticalAccounts.length,
      averageCoverageRatio: totalCollateral / totalRequiredMargin,
      riskDistribution: this.calculateRiskDistribution(accounts),
      timestamp: new Date().toISOString(),
    };
  }

  async optimizeMarginAllocation(optimizationRequest: any): Promise<any> {
    this.logger.log('Optimizing margin allocation');

    // Simulate margin optimization
    const optimization = {
      currentEfficiency: 78.5,
      optimizedEfficiency: 85.2,
      improvement: 8.5,
      recommendations: [
        'Implement dynamic margin requirements based on real-time risk',
        'Optimize collateral allocation across multiple asset classes',
        'Reduce margin buffers for low-risk counterparties',
      ],
      expectedSavings: 1250000, // USD
      implementationTime: '2-3 weeks',
    };

    return {
      optimization,
      timestamp: new Date().toISOString(),
    };
  }

  private initializeSampleData(): void {
    // Initialize sample margin accounts
    const sampleAccounts: MarginAccount[] = [
      {
        partyId: 'party_001',
        totalCollateral: 1000000,
        requiredMargin: 800000,
        availableMargin: 200000,
        marginCalls: 2,
        lastUpdated: new Date(),
      },
      {
        partyId: 'party_002',
        totalCollateral: 500000,
        requiredMargin: 450000,
        availableMargin: 50000,
        marginCalls: 1,
        lastUpdated: new Date(),
      },
      {
        partyId: 'party_003',
        totalCollateral: 2000000,
        requiredMargin: 1800000,
        availableMargin: 200000,
        marginCalls: 0,
        lastUpdated: new Date(),
      },
    ];

    for (const account of sampleAccounts) {
      this.marginAccounts.set(account.partyId, account);
    }
  }

  private calculateRiskLevel(account: MarginAccount): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const marginRatio = account.availableMargin / account.requiredMargin;
    
    if (marginRatio >= 0.5) return 'LOW';
    if (marginRatio >= 0.2) return 'MEDIUM';
    if (marginRatio >= 0) return 'HIGH';
    return 'CRITICAL';
  }

  private calculateRiskLevelFromShortfall(shortfall: number, requiredMargin: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const shortfallRatio = shortfall / requiredMargin;
    
    if (shortfallRatio <= 0.1) return 'LOW';
    if (shortfallRatio <= 0.3) return 'MEDIUM';
    if (shortfallRatio <= 0.5) return 'HIGH';
    return 'CRITICAL';
  }

  private calculateRiskMultiplier(riskFactors: any[]): number {
    // Simple risk calculation based on risk factors
    let multiplier = 1.0;
    
    for (const factor of riskFactors) {
      switch (factor.type) {
        case 'VOLATILITY':
          multiplier *= (1 + factor.severity * 0.5);
          break;
        case 'COUNTERPARTY_RISK':
          multiplier *= (1 + factor.severity * 0.3);
          break;
        case 'CONCENTRATION_RISK':
          multiplier *= (1 + factor.severity * 0.2);
          break;
        default:
          multiplier *= (1 + factor.severity * 0.1);
      }
    }
    
    return Math.min(multiplier, 3.0); // Cap at 3x
  }

  private calculateRiskDistribution(accounts: MarginAccount[]): any {
    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    
    for (const account of accounts) {
      const riskLevel = this.calculateRiskLevel(account);
      distribution[riskLevel]++;
    }
    
    return distribution;
  }

  private generateMarginCallId(): string {
    return `MC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

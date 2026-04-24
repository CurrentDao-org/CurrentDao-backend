import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CurrencyRisk } from '../entities/currency-risk.entity';
import { CurrencyAccount } from '../entities/currency-account.entity';
import { FxRateService } from '../rates/fx-rate.service';
import { ConversionRequest } from '../conversion/currency-conversion.service';

export interface RiskAssessment {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    volatility: number;
    exposure: number;
    liquidity: number;
    correlation: number;
  };
  recommendations: string[];
  hedgeStrategies: HedgeStrategy[];
}

export interface HedgeStrategy {
  type: 'forward' | 'option' | 'swap' | 'futures';
  description: string;
  effectiveness: number;
  cost: number;
  maturity: Date;
  notional: number;
}

export interface ConversionRisk {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    rateVolatility: number;
    amountRisk: number;
    currencyRisk: number;
    timingRisk: number;
  };
  mitigation: string[];
  approved: boolean;
}

@Injectable()
export class CurrencyRiskService {
  private readonly logger = new Logger(CurrencyRiskService.name);
  private readonly riskThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8,
    critical: 1.0,
  };

  constructor(
    @InjectRepository(CurrencyRisk)
    private readonly riskRepository: Repository<CurrencyRisk>,
    @InjectRepository(CurrencyAccount)
    private readonly accountRepository: Repository<CurrencyAccount>,
    private readonly fxRateService: FxRateService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async assessAllUserRisks(): Promise<void> {
    this.logger.log('Starting risk assessment for all users');
    
    const users = await this.getActiveUsers();
    const assessmentPromises = users.map(userId => this.assessUserRisk(userId));
    
    await Promise.allSettled(assessmentPromises);
    
    this.logger.log(`Completed risk assessment for ${users.length} users`);
  }

  async assessUserRisk(userId: string): Promise<RiskAssessment[]> {
    const userAccounts = await this.accountRepository.find({
      where: { userId, isActive: true },
    });

    const riskAssessments: RiskAssessment[] = [];

    for (const account of userAccounts) {
      const assessment = await this.assessCurrencyRisk(userId, account.currencyCode);
      riskAssessments.push(assessment);
    }

    return riskAssessments;
  }

  async assessCurrencyRisk(userId: string, currencyCode: string): Promise<RiskAssessment> {
    const account = await this.accountRepository.findOne({
      where: { userId, currencyCode, isActive: true },
    });

    if (!account) {
      throw new Error(`Account for currency ${currencyCode} not found`);
    }

    // Calculate risk factors
    const volatility = await this.calculateCurrencyVolatility(currencyCode);
    const exposure = await this.calculateCurrencyExposure(userId, currencyCode);
    const liquidity = await this.calculateCurrencyLiquidity(currencyCode);
    const correlation = await this.calculateCurrencyCorrelation(currencyCode);

    // Calculate overall risk score
    const riskScore = this.calculateRiskScore({
      volatility,
      exposure,
      liquidity,
      correlation,
    });

    const riskLevel = this.getRiskLevel(riskScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(riskLevel, {
      volatility,
      exposure,
      liquidity,
      correlation,
    });

    // Generate hedge strategies
    const hedgeStrategies = await this.generateHedgeStrategies(
      currencyCode,
      account.balance,
      riskScore,
    );

    // Save risk assessment
    await this.saveRiskAssessment({
      userId,
      currencyCode,
      riskType: 'currency_exposure',
      exposureAmount: account.balance,
      riskScore,
      volatility,
      valueAtRisk: await this.calculateValueAtRisk(currencyCode, account.balance),
      expectedShortfall: await this.calculateExpectedShortfall(currencyCode, account.balance),
      hedgeRatio: this.calculateOptimalHedgeRatio(riskScore),
      status: 'active',
      hedgeStrategy: hedgeStrategies[0] ? {
        type: hedgeStrategies[0].type,
        maturity: hedgeStrategies[0].maturity,
        notional: hedgeStrategies[0].notional,
      } : null,
      metrics: {
        correlation,
        beta: await this.calculateCurrencyBeta(currencyCode),
        duration: 30, // days
        convexity: 0.5,
      },
    });

    return {
      riskScore,
      riskLevel,
      factors: {
        volatility,
        exposure,
        liquidity,
        correlation,
      },
      recommendations,
      hedgeStrategies,
    };
  }

  async assessConversionRisk(request: ConversionRequest): Promise<ConversionRisk> {
    // Rate volatility risk
    const rateVolatility = await this.fxRateService.calculateVolatility(
      `${request.fromCurrency}/${request.toCurrency}`,
      7, // 7 days
    );

    // Amount risk (larger amounts have higher risk)
    const amountRisk = Math.min(request.amount / 1000000, 1); // Normalize to 0-1

    // Currency risk (based on currency stability)
    const currencyRisk = await this.getCurrencyRiskScore(request.fromCurrency) + 
                         await this.getCurrencyRiskScore(request.toCurrency);

    // Timing risk (market hours, news events)
    const timingRisk = this.calculateTimingRisk();

    // Calculate overall risk score
    const riskScore = (rateVolatility * 0.4 + amountRisk * 0.3 + currencyRisk * 0.2 + timingRisk * 0.1);

    const riskLevel = this.getRiskLevel(riskScore);
    const mitigation = this.generateConversionMitigation(riskLevel, {
      rateVolatility,
      amountRisk,
      currencyRisk,
      timingRisk,
    });

    // Auto-approve low to medium risk conversions
    const approved = riskScore <= this.riskThresholds.medium;

    return {
      riskScore,
      riskLevel,
      factors: {
        rateVolatility,
        amountRisk,
        currencyRisk,
        timingRisk,
      },
      mitigation,
      approved,
    };
  }

  async calculateValueAtRisk(currencyCode: string, amount: number, confidence: number = 0.95): Promise<number> {
    const volatility = await this.calculateCurrencyVolatility(currencyCode);
    const zScore = this.getZScore(confidence);
    
    // Simple VaR calculation: VaR = amount * volatility * zScore * sqrt(timeHorizon)
    const timeHorizon = 1; // 1 day
    return amount * volatility * zScore * Math.sqrt(timeHorizon);
  }

  async calculateExpectedShortfall(currencyCode: string, amount: number, confidence: number = 0.95): Promise<number> {
    // ES is typically 1.2-1.5 times VaR for normal distributions
    const varAmount = await this.calculateValueAtRisk(currencyCode, amount, confidence);
    return varAmount * 1.3;
  }

  private async calculateCurrencyVolatility(currencyCode: string): Promise<number> {
    try {
      // Calculate volatility against USD as base
      const volatility = await this.fxRateService.calculateVolatility(`USD/${currencyCode}`, 30);
      return Math.min(volatility, 1); // Cap at 1 (100%)
    } catch (error) {
      this.logger.warn(`Could not calculate volatility for ${currencyCode}:`, error);
      return 0.1; // Default moderate volatility
    }
  }

  private async calculateCurrencyExposure(userId: string, currencyCode: string): Promise<number> {
    const account = await this.accountRepository.findOne({
      where: { userId, currencyCode, isActive: true },
    });

    if (!account) return 0;

    // Calculate exposure as percentage of total portfolio value
    const totalPortfolioValue = await this.getTotalPortfolioValue(userId);
    return totalPortfolioValue > 0 ? account.balance / totalPortfolioValue : 0;
  }

  private async calculateCurrencyLiquidity(currencyCode: string): Promise<number> {
    // Liquidity score based on trading volume and market depth
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
    
    if (majorCurrencies.includes(currencyCode)) {
      return 0.9; // High liquidity
    } else if (currencyCode.length === 3) {
      return 0.6; // Medium liquidity for other fiat currencies
    } else {
      return 0.3; // Low liquidity for exotic currencies
    }
  }

  private async calculateCurrencyCorrelation(currencyCode: string): Promise<number> {
    // Calculate correlation with major currencies
    // This is a simplified version - in practice, you'd use historical correlation data
    const majorCurrencies = ['USD', 'EUR', 'GBP'];
    let totalCorrelation = 0;
    
    for (const majorCurrency of majorCurrencies) {
      if (currencyCode === majorCurrency) {
        totalCorrelation += 1;
      } else {
        // Simplified correlation based on currency type
        totalCorrelation += 0.3;
      }
    }
    
    return totalCorrelation / majorCurrencies.length;
  }

  private calculateRiskScore(factors: {
    volatility: number;
    exposure: number;
    liquidity: number;
    correlation: number;
  }): number {
    // Weighted risk score calculation
    const weights = {
      volatility: 0.35,
      exposure: 0.30,
      liquidity: 0.20, // Inverted (lower liquidity = higher risk)
      correlation: 0.15,
    };

    return (
      factors.volatility * weights.volatility +
      factors.exposure * weights.exposure +
      (1 - factors.liquidity) * weights.liquidity +
      (1 - factors.correlation) * weights.correlation
    );
  }

  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore <= this.riskThresholds.low) return 'low';
    if (riskScore <= this.riskThresholds.medium) return 'medium';
    if (riskScore <= this.riskThresholds.high) return 'high';
    return 'critical';
  }

  private generateRecommendations(
    riskLevel: string,
    factors: { volatility: number; exposure: number; liquidity: number; correlation: number },
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Consider reducing exposure to this currency');
      recommendations.push('Implement hedging strategies immediately');
    }

    if (factors.volatility > 0.5) {
      recommendations.push('Monitor currency volatility closely');
      recommendations.push('Consider stop-loss orders');
    }

    if (factors.exposure > 0.3) {
      recommendations.push('Diversify currency holdings');
      recommendations.push('Rebalance portfolio regularly');
    }

    if (factors.liquidity < 0.5) {
      recommendations.push('Be cautious with large transactions');
      recommendations.push('Consider market impact before trading');
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring risk factors');
    }

    return recommendations;
  }

  private async generateHedgeStrategies(
    currencyCode: string,
    amount: number,
    riskScore: number,
  ): Promise<HedgeStrategy[]> {
    const strategies: HedgeStrategy[] = [];

    if (riskScore > this.riskThresholds.medium) {
      // Forward contract hedge
      strategies.push({
        type: 'forward',
        description: 'Lock in exchange rate for future transaction',
        effectiveness: 0.85,
        cost: 0.002, // 0.2% of notional
        maturity: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        notional: amount * 0.8, // Hedge 80% of exposure
      });

      // Options hedge
      strategies.push({
        type: 'option',
        description: 'Protect against adverse movements while maintaining upside',
        effectiveness: 0.75,
        cost: 0.015, // 1.5% premium
        maturity: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        notional: amount * 0.5, // Hedge 50% of exposure
      });
    }

    if (riskScore > this.riskThresholds.high) {
      // Currency swap hedge
      strategies.push({
        type: 'swap',
        description: 'Exchange cash flows in different currencies',
        effectiveness: 0.90,
        cost: 0.005, // 0.5% of notional
        maturity: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        notional: amount * 0.6, // Hedge 60% of exposure
      });
    }

    return strategies;
  }

  private calculateOptimalHedgeRatio(riskScore: number): number {
    // Higher risk = higher hedge ratio
    return Math.min(riskScore * 1.2, 0.95); // Cap at 95%
  }

  private async saveRiskAssessment(riskData: Partial<CurrencyRisk>): Promise<void> {
    // Update existing risk record or create new one
    const existingRisk = await this.riskRepository.findOne({
      where: {
        userId: riskData.userId,
        currencyCode: riskData.currencyCode,
        riskType: riskData.riskType,
        status: 'active',
      },
    });

    if (existingRisk) {
      await this.riskRepository.update(existingRisk.id, {
        ...riskData,
        updatedAt: new Date(),
        lastAssessment: new Date(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
    } else {
      const newRisk = this.riskRepository.create({
        id: crypto.randomUUID(),
        ...riskData,
        lastAssessment: new Date(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await this.riskRepository.save(newRisk);
    }
  }

  private async getActiveUsers(): Promise<string[]> {
    const users = await this.accountRepository
      .createQueryBuilder('account')
      .select('DISTINCT account.userId')
      .where('account.isActive = :isActive', { isActive: true })
      .getRawMany();
    
    return users.map(user => user.userId);
  }

  private async getTotalPortfolioValue(userId: string): Promise<number> {
    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true },
    });

    let totalValue = 0;
    for (const account of accounts) {
      // Convert all balances to USD for comparison
      if (account.currencyCode === 'USD') {
        totalValue += account.balance;
      } else {
        try {
          const rateData = await this.fxRateService.getRate(account.currencyCode, 'USD');
          totalValue += account.balance * rateData.rate;
        } catch (error) {
          this.logger.warn(`Could not convert ${account.currencyCode} to USD for portfolio valuation`);
        }
      }
    }

    return totalValue;
  }

  private async getCurrencyRiskScore(currencyCode: string): Promise<number> {
    // Risk score based on currency type and historical performance
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
    const emergingMarkets = ['BRL', 'MXN', 'ZAR', 'TRY', 'INR', 'CNY'];
    
    if (majorCurrencies.includes(currencyCode)) return 0.1;
    if (emergingMarkets.includes(currencyCode)) return 0.4;
    return 0.6; // Default for other currencies
  }

  private calculateTimingRisk(): number {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    
    // Higher risk during off-market hours and weekends
    if (day === 0 || day === 6) return 0.6; // Weekend
    if (hour < 8 || hour > 18) return 0.3; // Off hours
    return 0.1; // Market hours
  }

  private generateConversionMitigation(
    riskLevel: string,
    factors: { rateVolatility: number; amountRisk: number; currencyRisk: number; timingRisk: number },
  ): string[] {
    const mitigation: string[] = [];

    if (riskLevel === 'critical') {
      mitigation.push('Manual review required');
      mitigation.push('Consider splitting transaction');
    }

    if (factors.rateVolatility > 0.5) {
      mitigation.push('Use limit order instead of market order');
    }

    if (factors.amountRisk > 0.7) {
      mitigation.push('Break into smaller transactions');
    }

    if (factors.timingRisk > 0.4) {
      mitigation.push('Wait for market hours');
    }

    return mitigation;
  }

  private getZScore(confidence: number): number {
    // Standard normal distribution z-scores
    const zScores: { [key: number]: number } = {
      0.90: 1.28,
      0.95: 1.65,
      0.99: 2.33,
    };
    return zScores[confidence] || 1.65;
  }

  private async calculateCurrencyBeta(currencyCode: string): Promise<number> {
    // Beta against a market index (simplified)
    try {
      const volatility = await this.calculateCurrencyVolatility(currencyCode);
      const marketVolatility = 0.15; // Assumed market volatility
      return volatility / marketVolatility;
    } catch (error) {
      return 1.0; // Default beta
    }
  }

  async getRiskReport(userId: string): Promise<{
    overallRiskScore: number;
    riskLevel: string;
    currencyRisks: Array<{
      currency: string;
      riskScore: number;
      riskLevel: string;
      exposure: number;
      recommendations: string[];
    }>;
    hedgeEffectiveness: number;
    lastUpdated: Date;
  }> {
    const risks = await this.riskRepository.find({
      where: { userId, status: 'active' },
    });

    if (risks.length === 0) {
      return {
        overallRiskScore: 0,
        riskLevel: 'low',
        currencyRisks: [],
        hedgeEffectiveness: 0,
        lastUpdated: new Date(),
      };
    }

    const totalExposure = risks.reduce((sum, risk) => sum + risk.exposureAmount, 0);
    const weightedRiskScore = risks.reduce(
      (sum, risk) => sum + (risk.riskScore * risk.exposureAmount) / totalExposure,
      0,
    );

    const currencyRisks = risks.map(risk => ({
      currency: risk.currencyCode,
      riskScore: risk.riskScore,
      riskLevel: this.getRiskLevel(risk.riskScore),
      exposure: risk.exposureAmount,
      recommendations: this.generateRecommendations(this.getRiskLevel(risk.riskScore), {
        volatility: risk.volatility,
        exposure: risk.exposureAmount / totalExposure,
        liquidity: 0.7, // Simplified
        correlation: 0.5, // Simplified
      }),
    }));

    const hedgeEffectiveness = risks.reduce(
      (sum, risk) => sum + (risk.hedgeRatio * risk.exposureAmount) / totalExposure,
      0,
    );

    return {
      overallRiskScore: weightedRiskScore,
      riskLevel: this.getRiskLevel(weightedRiskScore),
      currencyRisks,
      hedgeEffectiveness,
      lastUpdated: new Date(),
    };
  }
}

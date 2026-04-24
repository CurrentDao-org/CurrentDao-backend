import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CurrencyTransaction } from '../entities/currency-transaction.entity';
import { CurrencyAccount } from '../entities/currency-account.entity';
import { FxRate } from '../entities/fx-rate.entity';
import { CurrencyRisk } from '../entities/currency-risk.entity';

export interface CurrencyReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalTransactions: number;
    totalVolume: number;
    totalFees: number;
    successRate: number;
    averageTransactionSize: number;
  };
  currencyBreakdown: Array<{
    currency: string;
    volume: number;
    transactions: number;
    share: number;
    averageRate: number;
    volatility: number;
  }>;
  topCurrencyPairs: Array<{
    pair: string;
    volume: number;
    transactions: number;
    averageRate: number;
    rateChange: number;
  }>;
  riskMetrics: {
    totalExposure: number;
    averageRiskScore: number;
    hedgedExposure: number;
    hedgeEffectiveness: number;
  };
  performance: {
    conversionLatency: number;
    rateAccuracy: number;
    systemUptime: number;
    errorRate: number;
  };
}

export interface BalanceReport {
  userId: string;
  timestamp: Date;
  baseCurrency: string;
  totalBalance: number;
  currencyBalances: Array<{
    currency: string;
    balance: number;
    convertedBalance: number;
    share: number;
    lastUpdated: Date;
  }>;
  historicalPerformance: Array<{
    date: Date;
    totalBalance: number;
    change: number;
    changePercent: number;
  }>;
}

export interface ComplianceReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  transactions: {
    total: number;
    byCurrency: Array<{ currency: string; count: number; volume: number }>;
    byRiskLevel: Array<{ level: string; count: number; volume: number }>;
    flagged: Array<{
      transactionId: string;
      reason: string;
      riskScore: number;
      timestamp: Date;
    }>;
  };
  regulatoryMetrics: {
    kycCompliance: number;
    amlChecks: number;
    suspiciousActivityReports: number;
    complianceScore: number;
  };
  auditTrail: Array<{
    action: string;
    userId: string;
    timestamp: Date;
    details: any;
  }>;
}

@Injectable()
export class MultiCurrencyReportService {
  private readonly logger = new Logger(MultiCurrencyReportService.name);

  constructor(
    @InjectRepository(CurrencyTransaction)
    private readonly transactionRepository: Repository<CurrencyTransaction>,
    @InjectRepository(CurrencyAccount)
    private readonly accountRepository: Repository<CurrencyAccount>,
    @InjectRepository(FxRate)
    private readonly fxRateRepository: Repository<FxRate>,
    @InjectRepository(CurrencyRisk)
    private readonly riskRepository: Repository<CurrencyRisk>,
  ) {}

  async generateCurrencyReport(
    startDate: Date,
    endDate: Date,
    options: {
      userId?: string;
      currencies?: string[];
      includeRisk?: boolean;
      includePerformance?: boolean;
    } = {},
  ): Promise<CurrencyReport> {
    this.logger.log(`Generating currency report from ${startDate} to ${endDate}`);

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('transaction.transactionType = :type', { type: 'conversion' });

    if (options.userId) {
      queryBuilder.andWhere('transaction.userId = :userId', { userId: options.userId });
    }

    if (options.currencies?.length) {
      queryBuilder.andWhere(
        '(transaction.fromCurrency IN (:...currencies) OR transaction.toCurrency IN (:...currencies))',
        { currencies: options.currencies },
      );
    }

    const transactions = await queryBuilder.getMany();
    const successfulTransactions = transactions.filter(t => t.status === 'completed');

    // Calculate summary metrics
    const summary = {
      totalTransactions: transactions.length,
      totalVolume: successfulTransactions.reduce((sum, t) => sum + t.fromAmount, 0),
      totalFees: successfulTransactions.reduce((sum, t) => sum + t.feeAmount, 0),
      successRate: transactions.length > 0 ? (successfulTransactions.length / transactions.length) * 100 : 0,
      averageTransactionSize: successfulTransactions.length > 0 
        ? successfulTransactions.reduce((sum, t) => sum + t.fromAmount, 0) / successfulTransactions.length 
        : 0,
    };

    // Currency breakdown
    const currencyStats = new Map();
    successfulTransactions.forEach(transaction => {
      // From currency
      if (!currencyStats.has(transaction.fromCurrency)) {
        currencyStats.set(transaction.fromCurrency, { volume: 0, transactions: 0, rates: [] });
      }
      const fromStats = currencyStats.get(transaction.fromCurrency);
      fromStats.volume += transaction.fromAmount;
      fromStats.transactions += 1;
      fromStats.rates.push(transaction.exchangeRate);

      // To currency
      if (!currencyStats.has(transaction.toCurrency)) {
        currencyStats.set(transaction.toCurrency, { volume: 0, transactions: 0, rates: [] });
      }
      const toStats = currencyStats.get(transaction.toCurrency);
      toStats.volume += transaction.toAmount;
      toStats.transactions += 1;
    });

    const currencyBreakdown = Array.from(currencyStats.entries()).map(([currency, stats]) => ({
      currency,
      volume: stats.volume,
      transactions: stats.transactions,
      share: (stats.volume / summary.totalVolume) * 100,
      averageRate: stats.rates.reduce((sum, rate) => sum + rate, 0) / stats.rates.length,
      volatility: this.calculateVolatility(stats.rates),
    }));

    // Top currency pairs
    const pairStats = new Map();
    successfulTransactions.forEach(transaction => {
      const pair = `${transaction.fromCurrency}/${transaction.toCurrency}`;
      if (!pairStats.has(pair)) {
        pairStats.set(pair, { volume: 0, transactions: 0, rates: [] });
      }
      const stats = pairStats.get(pair);
      stats.volume += transaction.fromAmount;
      stats.transactions += 1;
      stats.rates.push(transaction.exchangeRate);
    });

    const topCurrencyPairs = Array.from(pairStats.entries())
      .map(([pair, stats]) => ({
        pair,
        volume: stats.volume,
        transactions: stats.transactions,
        averageRate: stats.rates.reduce((sum, rate) => sum + rate, 0) / stats.rates.length,
        rateChange: this.calculateRateChange(stats.rates),
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Risk metrics
    let riskMetrics = {
      totalExposure: 0,
      averageRiskScore: 0,
      hedgedExposure: 0,
      hedgeEffectiveness: 0,
    };

    if (options.includeRisk) {
      riskMetrics = await this.calculateRiskMetrics(options.userId);
    }

    // Performance metrics
    let performance = {
      conversionLatency: 0,
      rateAccuracy: 0,
      systemUptime: 99.9,
      errorRate: 0,
    };

    if (options.includePerformance) {
      performance = await this.calculatePerformanceMetrics(transactions);
    }

    return {
      period: { startDate, endDate },
      summary,
      currencyBreakdown,
      topCurrencyPairs,
      riskMetrics,
      performance,
    };
  }

  async generateBalanceReport(
    userId: string,
    baseCurrency: string = 'USD',
    days: number = 30,
  ): Promise<BalanceReport> {
    this.logger.log(`Generating balance report for user ${userId}`);

    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true },
    });

    const currencyBalances = [];
    let totalBalance = 0;

    for (const account of accounts) {
      let convertedBalance = account.balance;
      
      if (account.currencyCode !== baseCurrency) {
        try {
          const rateData = await this.fxRateRepository.findOne({
            where: {
              fromCurrency: account.currencyCode,
              toCurrency: baseCurrency,
            },
            order: { timestamp: 'DESC' },
          });
          
          if (rateData) {
            convertedBalance = account.balance * rateData.rate;
          }
        } catch (error) {
          this.logger.warn(`Could not convert ${account.currencyCode} to ${baseCurrency}`);
        }
      }

      totalBalance += convertedBalance;

      currencyBalances.push({
        currency: account.currencyCode,
        balance: account.balance,
        convertedBalance,
        share: 0, // Will be calculated after total is known
        lastUpdated: account.updatedAt,
      });
    }

    // Calculate shares
    currencyBalances.forEach(balance => {
      balance.share = totalBalance > 0 ? (balance.convertedBalance / totalBalance) * 100 : 0;
    });

    // Historical performance
    const historicalPerformance = await this.getHistoricalBalancePerformance(
      userId,
      baseCurrency,
      days,
    );

    return {
      userId,
      timestamp: new Date(),
      baseCurrency,
      totalBalance,
      currencyBalances,
      historicalPerformance,
    };
  }

  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
    options: {
      userId?: string;
      riskThreshold?: number;
    } = {},
  ): Promise<ComplianceReport> {
    this.logger.log(`Generating compliance report from ${startDate} to ${endDate}`);

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('transaction.transactionType = :type', { type: 'conversion' });

    if (options.userId) {
      queryBuilder.andWhere('transaction.userId = :userId', { userId: options.userId });
    }

    const transactions = await queryBuilder.getMany();
    const riskThreshold = options.riskThreshold || 0.7;

    // Transaction analysis
    const byCurrency = new Map();
    const byRiskLevel = new Map();
    const flagged = [];

    for (const transaction of transactions) {
      // By currency
      ['fromCurrency', 'toCurrency'].forEach(currencyField => {
        const currency = transaction[currencyField];
        if (!byCurrency.has(currency)) {
          byCurrency.set(currency, { count: 0, volume: 0 });
        }
        const stats = byCurrency.get(currency);
        stats.count += 1;
        stats.volume += transaction.fromAmount;
      });

      // By risk level (simplified)
      const riskLevel = this.getTransactionRiskLevel(transaction);
      if (!byRiskLevel.has(riskLevel)) {
        byRiskLevel.set(riskLevel, { count: 0, volume: 0 });
      }
      const riskStats = byRiskLevel.get(riskLevel);
      riskStats.count += 1;
      riskStats.volume += transaction.fromAmount;

      // Flagged transactions
      if (this.shouldFlagTransaction(transaction, riskThreshold)) {
        flagged.push({
          transactionId: transaction.id,
          reason: this.getFlagReason(transaction, riskThreshold),
          riskScore: this.getTransactionRiskScore(transaction),
          timestamp: transaction.createdAt,
        });
      }
    }

    // Regulatory metrics
    const regulatoryMetrics = await this.calculateRegulatoryMetrics(options.userId);

    // Audit trail (simplified)
    const auditTrail = await this.getAuditTrail(startDate, endDate, options.userId);

    return {
      period: { startDate, endDate },
      transactions: {
        total: transactions.length,
        byCurrency: Array.from(byCurrency.entries()).map(([currency, stats]) => ({
          currency,
          count: stats.count,
          volume: stats.volume,
        })),
        byRiskLevel: Array.from(byRiskLevel.entries()).map(([level, stats]) => ({
          level,
          count: stats.count,
          volume: stats.volume,
        })),
        flagged,
      },
      regulatoryMetrics,
      auditTrail,
    };
  }

  async exportReport(
    reportType: 'currency' | 'balance' | 'compliance',
    format: 'json' | 'csv' | 'pdf',
    parameters: any,
  ): Promise<Buffer> {
    this.logger.log(`Exporting ${reportType} report in ${format} format`);

    let reportData;
    
    switch (reportType) {
      case 'currency':
        reportData = await this.generateCurrencyReport(parameters.startDate, parameters.endDate, parameters.options);
        break;
      case 'balance':
        reportData = await this.generateBalanceReport(parameters.userId, parameters.baseCurrency, parameters.days);
        break;
      case 'compliance':
        reportData = await this.generateComplianceReport(parameters.startDate, parameters.endDate, parameters.options);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(reportData, null, 2));
      case 'csv':
        return this.convertToCSV(reportData, reportType);
      case 'pdf':
        return this.convertToPDF(reportData, reportType);
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  private calculateVolatility(rates: number[]): number {
    if (rates.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < rates.length; i++) {
      returns.push((rates[i] - rates[i - 1]) / rates[i - 1]);
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized
  }

  private calculateRateChange(rates: number[]): number {
    if (rates.length < 2) return 0;
    return ((rates[rates.length - 1] - rates[0]) / rates[0]) * 100;
  }

  private async calculateRiskMetrics(userId?: string) {
    const queryBuilder = this.riskRepository.createQueryBuilder('risk').where('risk.status = :status', { status: 'active' });
    
    if (userId) {
      queryBuilder.andWhere('risk.userId = :userId', { userId });
    }

    const risks = await queryBuilder.getMany();

    const totalExposure = risks.reduce((sum, risk) => sum + risk.exposureAmount, 0);
    const averageRiskScore = risks.length > 0 ? risks.reduce((sum, risk) => sum + risk.riskScore, 0) / risks.length : 0;
    const hedgedExposure = risks.reduce((sum, risk) => sum + (risk.exposureAmount * risk.hedgeRatio), 0);
    const hedgeEffectiveness = totalExposure > 0 ? (hedgedExposure / totalExposure) * 100 : 0;

    return {
      totalExposure,
      averageRiskScore,
      hedgedExposure,
      hedgeEffectiveness,
    };
  }

  private async calculatePerformanceMetrics(transactions: CurrencyTransaction[]) {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    
    // Calculate average conversion latency (time from creation to completion)
    const latencies = completedTransactions
      .filter(t => t.completedAt)
      .map(t => t.completedAt.getTime() - t.createdAt.getTime());
    
    const conversionLatency = latencies.length > 0 
      ? latencies.reduce((sum, latency) => sum + latency, 0) / latencies.length 
      : 0;

    // Rate accuracy (how close the executed rate was to the market rate at execution time)
    // This is simplified - in practice, you'd compare with actual market rates
    const rateAccuracy = 99.5; // Placeholder

    return {
      conversionLatency,
      rateAccuracy,
      systemUptime: 99.9, // Placeholder
      errorRate: transactions.length > 0 ? ((transactions.length - completedTransactions.length) / transactions.length) * 100 : 0,
    };
  }

  private async getHistoricalBalancePerformance(userId: string, baseCurrency: string, days: number) {
    const performance = [];
    const endDate = new Date();
    
    for (let i = days; i >= 0; i--) {
      const date = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateEnd = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      // This is simplified - in practice, you'd query historical balance snapshots
      const totalBalance = await this.calculateHistoricalBalance(userId, baseCurrency, date, dateEnd);
      
      performance.push({
        date,
        totalBalance,
        change: 0, // Would calculate from previous day
        changePercent: 0, // Would calculate from previous day
      });
    }

    // Calculate changes
    for (let i = 1; i < performance.length; i++) {
      performance[i].change = performance[i].totalBalance - performance[i - 1].totalBalance;
      performance[i].changePercent = performance[i - 1].totalBalance > 0 
        ? (performance[i].change / performance[i - 1].totalBalance) * 100 
        : 0;
    }

    return performance;
  }

  private async calculateHistoricalBalance(userId: string, baseCurrency: string, startDate: Date, endDate: Date) {
    // Simplified version - would query historical balance data
    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true },
    });

    let totalBalance = 0;
    for (const account of accounts) {
      if (account.currencyCode === baseCurrency) {
        totalBalance += account.balance;
      } else {
        // Get historical rate
        const rate = await this.fxRateRepository.findOne({
          where: {
            fromCurrency: account.currencyCode,
            toCurrency: baseCurrency,
            timestamp: Between(startDate, endDate),
          },
          order: { timestamp: 'DESC' },
        });
        
        if (rate) {
          totalBalance += account.balance * rate.rate;
        }
      }
    }

    return totalBalance;
  }

  private getTransactionRiskLevel(transaction: CurrencyTransaction): string {
    const riskScore = this.getTransactionRiskScore(transaction);
    
    if (riskScore < 0.3) return 'low';
    if (riskScore < 0.6) return 'medium';
    if (riskScore < 0.8) return 'high';
    return 'critical';
  }

  private getTransactionRiskScore(transaction: CurrencyTransaction): number {
    let riskScore = 0;
    
    // Amount risk
    riskScore += Math.min(transaction.fromAmount / 100000, 0.3);
    
    // Currency risk (simplified)
    const exoticCurrencies = ['ZAR', 'TRY', 'BRL', 'MXN'];
    if (exoticCurrencies.includes(transaction.fromCurrency) || exoticCurrencies.includes(transaction.toCurrency)) {
      riskScore += 0.2;
    }
    
    // Time risk
    const hour = transaction.createdAt.getHours();
    if (hour < 8 || hour > 18) riskScore += 0.1;
    
    // Fee risk
    if (transaction.fee > 0.01) riskScore += 0.1;
    
    return Math.min(riskScore, 1);
  }

  private shouldFlagTransaction(transaction: CurrencyTransaction, riskThreshold: number): boolean {
    return this.getTransactionRiskScore(transaction) > riskThreshold;
  }

  private getFlagReason(transaction: CurrencyTransaction, riskThreshold: number): string {
    const riskScore = this.getTransactionRiskScore(transaction);
    const reasons = [];
    
    if (transaction.fromAmount > 50000) reasons.push('High amount');
    if (transaction.fee > 0.02) reasons.push('High fee');
    if (riskScore > riskThreshold) reasons.push('High risk score');
    
    return reasons.join(', ') || 'Risk threshold exceeded';
  }

  private async calculateRegulatoryMetrics(userId?: string) {
    // Simplified regulatory metrics
    return {
      kycCompliance: 98.5,
      amlChecks: 1250,
      suspiciousActivityReports: 3,
      complianceScore: 97.2,
    };
  }

  private async getAuditTrail(startDate: Date, endDate: Date, userId?: string) {
    // Simplified audit trail
    return [
      {
        action: 'currency_conversion',
        userId: userId || 'system',
        timestamp: new Date(),
        details: { type: 'audit_log' },
      },
    ];
  }

  private convertToCSV(data: any, reportType: string): Buffer {
    // Simplified CSV conversion
    const csv = JSON.stringify(data, null, 2);
    return Buffer.from(csv);
  }

  private convertToPDF(data: any, reportType: string): Buffer {
    // Simplified PDF conversion
    const pdf = JSON.stringify(data, null, 2);
    return Buffer.from(pdf);
  }
}

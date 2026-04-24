import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { TransactionEntity } from '../entities/transaction.entity';
import { PortfolioPerformanceEntity } from '../entities/portfolio-performance.entity';
import { PerformanceAnalyticsDto } from '../dto/analytics.dto';

@Injectable()
export class PerformanceService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PositionEntity)
    private positionRepository: Repository<PositionEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(PortfolioPerformanceEntity)
    private performanceRepository: Repository<PortfolioPerformanceEntity>,
  ) {}

  async getPerformanceAnalytics(
    portfolioId: string,
    analyticsDto: PerformanceAnalyticsDto,
  ): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    const {
      startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // Default 1 year
      endDate = new Date(),
      benchmark,
      includeRiskMetrics = true,
      includeAttribution = false,
    } = analyticsDto;

    const performanceData = await this.calculatePerformanceMetrics(
      portfolioId,
      startDate,
      endDate,
    );

    const result: any = {
      portfolioId,
      period: { startDate, endDate },
      performance: performanceData,
    };

    if (benchmark) {
      result.benchmarkComparison = await this.getBenchmarkComparison(
        portfolioId,
        benchmark,
        startDate,
        endDate,
      );
    }

    if (includeRiskMetrics) {
      result.riskMetrics = await this.calculateRiskMetrics(portfolioId, startDate, endDate);
    }

    if (includeAttribution) {
      result.attribution = await this.calculateAttributionAnalysis(portfolioId, startDate, endDate);
    }

    return result;
  }

  async getPerformanceSummary(portfolioId: string): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const totalValue = portfolio.totalValue;
    const totalCost = positions.reduce((sum, pos) => sum + (pos.quantity * pos.averageCost), 0);
    const totalReturn = totalValue - totalCost;
    const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

    const unrealizedPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnl, 0);
    const realizedPnL = await this.getTotalRealizedPnL(portfolioId);

    // Calculate time-weighted return
    const timeWeightedReturn = await this.calculateTimeWeightedReturn(portfolioId);

    // Calculate money-weighted return (IRR)
    const moneyWeightedReturn = await this.calculateMoneyWeightedReturn(portfolioId);

    return {
      portfolioId,
      totalValue,
      totalCost,
      totalReturn,
      totalReturnPercent,
      unrealizedPnL,
      realizedPnL,
      totalPnL: unrealizedPnL + realizedPnL,
      timeWeightedReturn,
      moneyWeightedReturn,
      positionCount: positions.length,
      lastUpdated: portfolio.updatedAt,
    };
  }

  async calculateDailyReturns(portfolioId: string, startDate: Date, endDate: Date): Promise<any[]> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    // Get daily portfolio values from performance data
    const performanceData = await this.performanceRepository.find({
      where: {
        portfolioId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    const dailyReturns = [];
    let previousValue = null;

    for (const data of performanceData) {
      const dailyReturn = previousValue !== null 
        ? (data.totalValue - previousValue) / previousValue 
        : 0;

      dailyReturns.push({
        date: data.date,
        value: data.totalValue,
        dailyReturn,
        dailyReturnPercent: dailyReturn * 100,
      });

      previousValue = data.totalValue;
    }

    return dailyReturns;
  }

  async calculatePerformanceMetrics(
    portfolioId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const dailyReturns = await this.calculateDailyReturns(portfolioId, startDate, endDate);
    
    if (dailyReturns.length === 0) {
      return {
        totalReturn: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        calmarRatio: 0,
        sortinoRatio: 0,
        beta: 0,
        alpha: 0,
      };
    }

    const returns = dailyReturns.map(d => d.dailyReturn);
    const totalReturn = returns.reduce((sum, r) => sum + r, 0);
    
    // Calculate annualized return
    const days = dailyReturns.length;
    const annualizedReturn = Math.pow(1 + totalReturn, 252 / days) - 1;

    // Calculate volatility (standard deviation of returns)
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252); // Annualized volatility

    // Calculate Sharpe ratio (assuming risk-free rate of 2%)
    const riskFreeRate = 0.02;
    const sharpeRatio = volatility > 0 ? (annualizedReturn - riskFreeRate) / volatility : 0;

    // Calculate maximum drawdown
    const maxDrawdown = this.calculateMaxDrawdown(dailyReturns);

    // Calculate Calmar ratio
    const calmarRatio = maxDrawdown !== 0 ? Math.abs(annualizedReturn / maxDrawdown) : 0;

    // Calculate Sortino ratio (downside deviation)
    const downsideReturns = returns.filter(r => r < 0);
    const downsideDeviation = downsideReturns.length > 0 
      ? Math.sqrt(downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length) * Math.sqrt(252)
      : 0;
    const sortinoRatio = downsideDeviation > 0 ? (annualizedReturn - riskFreeRate) / downsideDeviation : 0;

    return {
      totalReturn,
      annualizedReturn,
      volatility,
      sharpeRatio,
      maxDrawdown,
      calmarRatio,
      sortinoRatio,
      period: { startDate, endDate, days },
    };
  }

  async calculateRiskMetrics(portfolioId: string, startDate: Date, endDate: Date): Promise<any> {
    const performanceMetrics = await this.calculatePerformanceMetrics(portfolioId, startDate, endDate);
    const dailyReturns = await this.calculateDailyReturns(portfolioId, startDate, endDate);

    // Calculate Value at Risk (VaR) at different confidence levels
    const var95 = this.calculateVaR(dailyReturns, 0.95);
    const var99 = this.calculateVaR(dailyReturns, 0.99);

    // Calculate Conditional Value at Risk (CVaR)
    const cvar95 = this.calculateCVaR(dailyReturns, 0.95);
    const cvar99 = this.calculateCVaR(dailyReturns, 0.99);

    // Calculate Beta and Alpha against market
    const { beta, alpha } = await this.calculateBetaAlpha(portfolioId, startDate, endDate);

    // Calculate tracking error
    const trackingError = await this.calculateTrackingError(portfolioId, startDate, endDate);

    // Calculate information ratio
    const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

    return {
      var95,
      var99,
      cvar95,
      cvar99,
      beta,
      alpha,
      trackingError,
      informationRatio,
      volatility: performanceMetrics.volatility,
      maxDrawdown: performanceMetrics.maxDrawdown,
      sharpeRatio: performanceMetrics.sharpeRatio,
    };
  }

  async getBenchmarkComparison(
    portfolioId: string,
    benchmark: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const portfolioReturns = await this.calculateDailyReturns(portfolioId, startDate, endDate);
    const benchmarkReturns = await this.getBenchmarkReturns(benchmark, startDate, endDate);

    // Calculate correlation
    const correlation = this.calculateCorrelation(
      portfolioReturns.map(r => r.dailyReturn),
      benchmarkReturns.map(r => r.dailyReturn),
    );

    // Calculate relative performance
    const portfolioTotalReturn = portfolioReturns.reduce((sum, r) => sum + r.dailyReturn, 0);
    const benchmarkTotalReturn = benchmarkReturns.reduce((sum, r) => sum + r.dailyReturn, 0);
    const excessReturn = portfolioTotalReturn - benchmarkTotalReturn;

    // Calculate up/down capture ratios
    const { upCapture, downCapture } = this.calculateCaptureRatios(
      portfolioReturns.map(r => r.dailyReturn),
      benchmarkReturns.map(r => r.dailyReturn),
    );

    return {
      benchmark,
      correlation,
      excessReturn,
      portfolioReturn: portfolioTotalReturn,
      benchmarkReturn: benchmarkTotalReturn,
      upCapture,
      downCapture,
    };
  }

  async calculateAttributionAnalysis(portfolioId: string, startDate: Date, endDate: Date): Promise<any> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const attribution = {
      assetAllocation: {},
      securitySelection: {},
      interaction: {},
      total: 0,
    };

    // Simplified attribution analysis
    for (const position of positions) {
      const assetReturn = await this.getAssetReturn(position.assetId, startDate, endDate);
      const portfolioWeight = position.marketValue / positions.reduce((sum, p) => sum + p.marketValue, 0);
      
      attribution.assetAllocation[position.asset.symbol] = portfolioWeight * assetReturn;
      attribution.securitySelection[position.asset.symbol] = position.unrealizedPnlPercent;
    }

    attribution.total = Object.values(attribution.assetAllocation).reduce((sum, val) => sum + val, 0);

    return attribution;
  }

  // Private helper methods
  private async getTotalRealizedPnL(portfolioId: string): Promise<number> {
    const sellTransactions = await this.transactionRepository.find({
      where: { portfolioId, transactionType: 'SELL' },
    });

    return sellTransactions.reduce((sum, transaction) => sum + transaction.netAmount, 0);
  }

  private async calculateTimeWeightedReturn(portfolioId: string): Promise<number> {
    // Simplified time-weighted return calculation
    const transactions = await this.transactionRepository.find({
      where: { portfolioId },
      order: { date: 'ASC' },
    });

    let twr = 1;
    let currentValue = 0;

    for (const transaction of transactions) {
      if (transaction.transactionType === 'BUY') {
        currentValue += transaction.netAmount;
      } else if (transaction.transactionType === 'SELL') {
        const periodReturn = transaction.netAmount / currentValue;
        twr *= periodReturn;
        currentValue = 0;
      }
    }

    return twr - 1;
  }

  private async calculateMoneyWeightedReturn(portfolioId: string): Promise<number> {
    // Simplified IRR calculation
    // In practice, you would use a proper IRR calculation method
    const transactions = await this.transactionRepository.find({
      where: { portfolioId },
      order: { date: 'ASC' },
    });

    // This is a simplified approximation
    const totalInvested = transactions
      .filter(t => t.transactionType === 'BUY')
      .reduce((sum, t) => sum + t.netAmount, 0);

    const currentValue = (await this.portfolioRepository.findOne({ where: { id: portfolioId } }))?.totalValue || 0;

    return totalInvested > 0 ? (currentValue / totalInvested) - 1 : 0;
  }

  private calculateMaxDrawdown(dailyReturns: any[]): number {
    let maxDrawdown = 0;
    let peak = dailyReturns[0]?.value || 0;

    for (const data of dailyReturns) {
      if (data.value > peak) {
        peak = data.value;
      }
      const drawdown = (peak - data.value) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return maxDrawdown;
  }

  private calculateVaR(returns: number[], confidence: number): number {
    const sortedReturns = returns.sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sortedReturns.length);
    return sortedReturns[index] || 0;
  }

  private calculateCVaR(returns: number[], confidence: number): number {
    const varValue = this.calculateVaR(returns, confidence);
    const tailReturns = returns.filter(r => r <= varValue);
    return tailReturns.length > 0 ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
  }

  private async calculateBetaAlpha(portfolioId: string, startDate: Date, endDate: Date): Promise<{ beta: number; alpha: number }> {
    // Simplified beta/alpha calculation
    // In practice, you would use market data for benchmark
    const portfolioReturns = await this.calculateDailyReturns(portfolioId, startDate, endDate);
    const marketReturns = await this.getBenchmarkReturns('SPY', startDate, endDate); // Using S&P 500 as default

    const covariance = this.calculateCovariance(
      portfolioReturns.map(r => r.dailyReturn),
      marketReturns.map(r => r.dailyReturn),
    );

    const marketVariance = this.calculateVariance(marketReturns.map(r => r.dailyReturn));
    const beta = marketVariance > 0 ? covariance / marketVariance : 1;

    const portfolioMeanReturn = portfolioReturns.reduce((sum, r) => sum + r.dailyReturn, 0) / portfolioReturns.length;
    const marketMeanReturn = marketReturns.reduce((sum, r) => sum + r.dailyReturn, 0) / marketReturns.length;
    const alpha = portfolioMeanReturn - (beta * marketMeanReturn);

    return { beta, alpha };
  }

  private async calculateTrackingError(portfolioId: string, startDate: Date, endDate: Date): Promise<number> {
    const portfolioReturns = await this.calculateDailyReturns(portfolioId, startDate, endDate);
    const benchmarkReturns = await this.getBenchmarkReturns('SPY', startDate, endDate);

    const excessReturns = portfolioReturns.map((r, i) => r.dailyReturn - benchmarkReturns[i]?.dailyReturn);
    return this.calculateStandardDeviation(excessReturns);
  }

  private async getBenchmarkReturns(benchmark: string, startDate: Date, endDate: Date): Promise<any[]> {
    // Mock benchmark returns - in practice, you would fetch from market data provider
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const returns = [];
    
    for (let i = 0; i < days; i++) {
      returns.push({
        date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
        dailyReturn: (Math.random() - 0.5) * 0.02, // Random daily return
      });
    }

    return returns;
  }

  private async getAssetReturn(assetId: string, startDate: Date, endDate: Date): Promise<number> {
    // Mock asset return calculation
    return Math.random() * 0.2 - 0.1; // Random return between -10% and +10%
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const covariance = this.calculateCovariance(x, y);
    const stdX = this.calculateStandardDeviation(x);
    const stdY = this.calculateStandardDeviation(y);
    
    return stdX * stdY !== 0 ? covariance / (stdX * stdY) : 0;
  }

  private calculateCovariance(x: number[], y: number[]): number {
    const meanX = x.reduce((sum, val) => sum + val, 0) / x.length;
    const meanY = y.reduce((sum, val) => sum + val, 0) / y.length;
    
    return x.reduce((sum, val, i) => sum + (val - meanX) * (y[i] - meanY), 0) / x.length;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private calculateStandardDeviation(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }

  private calculateCaptureRatios(portfolioReturns: number[], benchmarkReturns: number[]): { upCapture: number; downCapture: number } {
    let upPortfolio = 0, upBenchmark = 0, downPortfolio = 0, downBenchmark = 0;
    let upCount = 0, downCount = 0;

    for (let i = 0; i < portfolioReturns.length; i++) {
      if (benchmarkReturns[i] > 0) {
        upPortfolio += portfolioReturns[i];
        upBenchmark += benchmarkReturns[i];
        upCount++;
      } else if (benchmarkReturns[i] < 0) {
        downPortfolio += portfolioReturns[i];
        downBenchmark += benchmarkReturns[i];
        downCount++;
      }
    }

    const upCapture = upBenchmark > 0 ? (upPortfolio / upBenchmark) : 0;
    const downCapture = downBenchmark < 0 ? (downPortfolio / downBenchmark) : 0;

    return { upCapture, downCapture };
  }
}

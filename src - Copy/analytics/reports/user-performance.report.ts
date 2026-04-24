import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsData,
  AnalyticsType,
  AggregationPeriod,
} from '../entities/analytics-data.entity';
import { ReportParamsDto } from '../dto/report-params.dto';

export interface UserPerformanceMetrics {
  userId: string;
  totalTrades: number;
  totalVolume: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercent: number;
  winRate: number;
  averageTradeSize: number;
  averageProfitPerTrade: number;
  riskAdjustedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  tradingFrequency: number;
  renewableEnergyTrades: number;
  renewableEnergyPercentage: number;
}

export interface UserPerformanceReport {
  period: {
    start: Date;
    end: Date;
    aggregation: AggregationPeriod;
  };
  userMetrics: UserPerformanceMetrics;
  historicalData: {
    timestamp: Date;
    profitLoss: number;
    cumulativeValue: number;
    tradeCount: number;
  }[];
  leaderboard?: {
    rank: number;
    totalUsers: number;
    percentile: number;
  };
  performanceBreakdown?: {
    byGridZone: {
      zoneId: string;
      zoneName: string;
      profitLoss: number;
      tradeCount: number;
      winRate: number;
    }[];
    byEnergyType: {
      renewable: {
        profitLoss: number;
        tradeCount: number;
        percentage: number;
      };
      nonRenewable: {
        profitLoss: number;
        tradeCount: number;
        percentage: number;
      };
    };
  };
  recommendations: string[];
}

@Injectable()
export class UserPerformanceReport {
  constructor(
    @InjectRepository(AnalyticsData)
    private analyticsRepository: Repository<AnalyticsData>,
  ) {}

  async generateReport(
    params: ReportParamsDto,
  ): Promise<UserPerformanceReport> {
    if (!params.userId) {
      throw new Error('User ID is required for user performance report');
    }

    const startDate =
      params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = params.endDate || new Date();
    const period = params.period || AggregationPeriod.DAILY;

    // Fetch user performance data
    const userMetrics = await this.calculateUserMetrics(
      params.userId,
      startDate,
      endDate,
      params,
    );

    // Get historical performance data
    const historicalData = await this.getHistoricalPerformance(
      params.userId,
      startDate,
      endDate,
      period,
    );

    // Get leaderboard position if requested
    const leaderboard = await this.getLeaderboardPosition(
      params.userId,
      startDate,
      endDate,
    );

    // Get performance breakdown
    const performanceBreakdown = await this.getPerformanceBreakdown(
      params.userId,
      startDate,
      endDate,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(userMetrics);

    return {
      period: {
        start: startDate,
        end: endDate,
        aggregation: period,
      },
      userMetrics,
      historicalData,
      leaderboard,
      performanceBreakdown,
      recommendations,
    };
  }

  private async calculateUserMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
    params: ReportParamsDto,
  ): Promise<UserPerformanceMetrics> {
    // Get trading data
    const tradingData = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(analytics.id)', 'totalTrades')
      .addSelect('SUM(analytics.count)', 'totalVolume')
      .addSelect('SUM(analytics.totalValue)', 'totalValue')
      .addSelect('AVG(analytics.averageValue)', 'averageTradeSize')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // Get profit/loss data
    const profitLossData = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select("SUM(analytics.data->>'profitLoss')", 'totalProfitLoss')
      .addSelect(
        "COUNT(CASE WHEN analytics.data->>'isWinningTrade' = 'true' THEN 1 END)",
        'winningTrades',
      )
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    // Get renewable energy data
    const renewableData = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('SUM(analytics.count)', 'renewableTrades')
      .where('analytics.type = :type', { type: AnalyticsType.RENEWABLE_ENERGY })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const totalTrades = parseInt(tradingData?.totalTrades || '0');
    const totalVolume = parseFloat(tradingData?.totalVolume || '0');
    const totalValue = parseFloat(tradingData?.totalValue || '0');
    const averageTradeSize = parseFloat(tradingData?.averageTradeSize || '0');
    const totalProfitLoss = parseFloat(profitLossData?.totalProfitLoss || '0');
    const winningTrades = parseInt(profitLossData?.winningTrades || '0');
    const renewableTrades = parseInt(renewableData?.renewableTrades || '0');

    const profitLossPercent =
      totalValue > 0 ? (totalProfitLoss / totalValue) * 100 : 0;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const averageProfitPerTrade =
      totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
    const renewableEnergyPercentage =
      totalTrades > 0 ? (renewableTrades / totalTrades) * 100 : 0;

    // Calculate risk metrics
    const riskMetrics = await this.calculateRiskMetrics(
      userId,
      startDate,
      endDate,
    );
    const tradingFrequency = this.calculateTradingFrequency(
      totalTrades,
      startDate,
      endDate,
    );

    return {
      userId,
      totalTrades,
      totalVolume,
      totalValue,
      profitLoss: totalProfitLoss,
      profitLossPercent,
      winRate,
      averageTradeSize,
      averageProfitPerTrade,
      riskAdjustedReturn: riskMetrics.riskAdjustedReturn,
      sharpeRatio: riskMetrics.sharpeRatio,
      maxDrawdown: riskMetrics.maxDrawdown,
      tradingFrequency,
      renewableEnergyTrades: renewableTrades,
      renewableEnergyPercentage,
    };
  }

  private async calculateRiskMetrics(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    riskAdjustedReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  }> {
    // Get daily returns for risk calculations
    const dailyReturns = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select("analytics.data->>'dailyReturn'", 'dailyReturn')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('analytics.timestamp', 'ASC')
      .getRawMany();

    const returns = dailyReturns
      .map((r) => parseFloat(r.dailyReturn || '0'))
      .filter((r) => !isNaN(r));

    if (returns.length === 0) {
      return { riskAdjustedReturn: 0, sharpeRatio: 0, maxDrawdown: 0 };
    }

    // Calculate Sharpe Ratio
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) /
      returns.length;
    const standardDeviation = Math.sqrt(variance);
    const sharpeRatio =
      standardDeviation > 0 ? meanReturn / standardDeviation : 0;

    // Calculate maximum drawdown
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativeReturn = 0;

    for (const returnRate of returns) {
      cumulativeReturn += returnRate;
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = peak - cumulativeReturn;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    // Risk-adjusted return (simplified)
    const totalReturn = cumulativeReturn;
    const riskAdjustedReturn =
      standardDeviation > 0 ? totalReturn / standardDeviation : 0;

    return {
      riskAdjustedReturn,
      sharpeRatio,
      maxDrawdown,
    };
  }

  private calculateTradingFrequency(
    totalTrades: number,
    startDate: Date,
    endDate: Date,
  ): number {
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    return days > 0 ? totalTrades / days : 0;
  }

  private async getHistoricalPerformance(
    userId: string,
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
  ) {
    return this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.timestamp', 'timestamp')
      .addSelect("analytics.data->>'profitLoss'", 'profitLoss')
      .addSelect("analytics.data->>'cumulativeValue'", 'cumulativeValue')
      .addSelect('analytics.count', 'tradeCount')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.period = :period', { period })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('analytics.timestamp', 'ASC')
      .getRawMany();
  }

  private async getLeaderboardPosition(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    { rank: number; totalUsers: number; percentile: number } | undefined
  > {
    // Get user's total profit/loss
    const userProfitLoss = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select("SUM(analytics.data->>'profitLoss')", 'totalProfitLoss')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const userPL = parseFloat(userProfitLoss?.totalProfitLoss || '0');

    // Get all users' profit/loss and rank
    const leaderboard = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.userId', 'userId')
      .addSelect("SUM(analytics.data->>'profitLoss')", 'totalProfitLoss')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('analytics.userId')
      .orderBy("SUM(analytics.data->>'profitLoss')", 'DESC')
      .getRawMany();

    const totalUsers = leaderboard.length;
    const rank = leaderboard.findIndex((user) => user.userId === userId) + 1;
    const percentile =
      totalUsers > 0 ? ((totalUsers - rank) / totalUsers) * 100 : 0;

    return { rank, totalUsers, percentile };
  }

  private async getPerformanceBreakdown(
    userId: string,
    startDate: Date,
    endDate: Date,
  ) {
    // Performance by grid zone
    const byGridZone = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.gridZoneId', 'zoneId')
      .addSelect("analytics.data->>'zoneName'", 'zoneName')
      .addSelect("SUM(analytics.data->>'profitLoss')", 'profitLoss')
      .addSelect('COUNT(analytics.id)', 'tradeCount')
      .addSelect(
        "AVG(CASE WHEN analytics.data->>'isWinningTrade' = 'true' THEN 1 ELSE 0 END)",
        'winRate',
      )
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('analytics.gridZoneId IS NOT NULL')
      .groupBy("analytics.gridZoneId, analytics.data->>'zoneName'")
      .getRawMany();

    // Performance by energy type
    const totalTrades = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(analytics.id)', 'totalTrades')
      .addSelect("SUM(analytics.data->>'profitLoss')", 'totalProfitLoss')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const renewableTrades = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('COUNT(analytics.id)', 'renewableTrades')
      .addSelect("SUM(analytics.data->>'profitLoss')", 'renewableProfitLoss')
      .where('analytics.type = :type', { type: AnalyticsType.RENEWABLE_ENERGY })
      .andWhere('analytics.userId = :userId', { userId })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    const total = parseInt(totalTrades?.totalTrades || '0');
    const renewable = parseInt(renewableTrades?.renewableTrades || '0');
    const nonRenewable = total - renewable;

    return {
      byGridZone: byGridZone.map((zone) => ({
        zoneId: zone.zoneId,
        zoneName: zone.zoneName || 'Unknown',
        profitLoss: parseFloat(zone.profitLoss || '0'),
        tradeCount: parseInt(zone.tradeCount || '0'),
        winRate: parseFloat(zone.winRate || '0') * 100,
      })),
      byEnergyType: {
        renewable: {
          profitLoss: parseFloat(renewableTrades?.renewableProfitLoss || '0'),
          tradeCount: renewable,
          percentage: total > 0 ? (renewable / total) * 100 : 0,
        },
        nonRenewable: {
          profitLoss:
            parseFloat(totalTrades?.totalProfitLoss || '0') -
            parseFloat(renewableTrades?.renewableProfitLoss || '0'),
          tradeCount: nonRenewable,
          percentage: total > 0 ? (nonRenewable / total) * 100 : 0,
        },
      },
    };
  }

  private generateRecommendations(metrics: UserPerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.winRate < 40) {
      recommendations.push(
        'Consider refining your trading strategy to improve win rate. Current win rate is below optimal levels.',
      );
    }

    if (metrics.sharpeRatio < 1) {
      recommendations.push(
        'Your risk-adjusted returns could be improved. Consider diversifying your portfolio or adjusting position sizes.',
      );
    }

    if (metrics.maxDrawdown > 20) {
      recommendations.push(
        'High maximum drawdown detected. Consider implementing stricter risk management controls.',
      );
    }

    if (metrics.renewableEnergyPercentage < 30) {
      recommendations.push(
        'Consider increasing renewable energy trades to align with sustainability goals and potentially access green energy incentives.',
      );
    }

    if (metrics.tradingFrequency > 10) {
      recommendations.push(
        'High trading frequency may lead to increased transaction costs. Consider focusing on higher-quality trades.',
      );
    }

    if (metrics.profitLossPercent < 0) {
      recommendations.push(
        'Current strategy is showing losses. Consider reviewing your trading approach and market analysis methods.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Your trading performance is solid. Continue monitoring risk metrics and market conditions.',
      );
    }

    return recommendations;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  AnalyticsData,
  AnalyticsType,
  AggregationPeriod,
} from '../entities/analytics-data.entity';
import { ReportParamsDto } from '../dto/report-params.dto';

export interface TradingVolumeData {
  timestamp: Date;
  volume: number;
  value: number;
  transactions: number;
  averageTransactionSize: number;
  period: AggregationPeriod;
}

export interface TradingVolumeReport {
  period: {
    start: Date;
    end: Date;
    aggregation: AggregationPeriod;
  };
  summary: {
    totalVolume: number;
    totalValue: number;
    totalTransactions: number;
    averageTransactionSize: number;
    peakVolume: number;
    peakVolumeTime: Date;
    growthRate: number;
  };
  data: TradingVolumeData[];
  geographicBreakdown?: {
    country: string;
    volume: number;
    value: number;
    percentage: number;
  }[];
  renewableEnergyBreakdown?: {
    renewableVolume: number;
    totalVolume: number;
    percentage: number;
  };
}

@Injectable()
export class TradingVolumeReport {
  constructor(
    @InjectRepository(AnalyticsData)
    private analyticsRepository: Repository<AnalyticsData>,
  ) {}

  async generateReport(params: ReportParamsDto): Promise<TradingVolumeReport> {
    const startDate =
      params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = params.endDate || new Date();
    const period = params.period || AggregationPeriod.DAILY;

    // Fetch trading volume data
    const volumeData = await this.fetchTradingVolumeData(
      startDate,
      endDate,
      period,
      params,
    );

    // Calculate summary statistics
    const summary = this.calculateSummary(volumeData);

    // Get geographic breakdown if requested
    const geographicBreakdown = params.includeComparativeAnalysis
      ? await this.getGeographicBreakdown(startDate, endDate, params)
      : undefined;

    // Get renewable energy breakdown
    const renewableEnergyBreakdown = await this.getRenewableEnergyBreakdown(
      startDate,
      endDate,
      params,
    );

    return {
      period: {
        start: startDate,
        end: endDate,
        aggregation: period,
      },
      summary,
      data: volumeData,
      geographicBreakdown,
      renewableEnergyBreakdown,
    };
  }

  private async fetchTradingVolumeData(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
    params: ReportParamsDto,
  ): Promise<TradingVolumeData[]> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.type = :type', { type: AnalyticsType.TRADING_VOLUME })
      .andWhere('analytics.period = :period', { period })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (params.userId) {
      queryBuilder.andWhere('analytics.userId = :userId', {
        userId: params.userId,
      });
    }

    if (params.gridZoneId) {
      queryBuilder.andWhere('analytics.gridZoneId = :gridZoneId', {
        gridZoneId: params.gridZoneId,
      });
    }

    if (params.country) {
      queryBuilder.andWhere('analytics.country = :country', {
        country: params.country,
      });
    }

    queryBuilder.orderBy('analytics.timestamp', 'ASC');

    const analyticsData = await queryBuilder.getMany();

    return analyticsData.map((data) => ({
      timestamp: data.timestamp,
      volume: data.count || 0,
      value: parseFloat(data.totalValue?.toString() || '0'),
      transactions: data.count || 0,
      averageTransactionSize: parseFloat(data.averageValue?.toString() || '0'),
      period: data.period,
    }));
  }

  private calculateSummary(data: TradingVolumeData[]) {
    if (data.length === 0) {
      return {
        totalVolume: 0,
        totalValue: 0,
        totalTransactions: 0,
        averageTransactionSize: 0,
        peakVolume: 0,
        peakVolumeTime: new Date(),
        growthRate: 0,
      };
    }

    const totalVolume = data.reduce((sum, item) => sum + item.volume, 0);
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const totalTransactions = data.reduce(
      (sum, item) => sum + item.transactions,
      0,
    );
    const averageTransactionSize =
      totalTransactions > 0 ? totalValue / totalTransactions : 0;

    // Find peak volume
    const peakData = data.reduce(
      (max, item) => (item.volume > max.volume ? item : max),
      data[0],
    );

    // Calculate growth rate (comparing first and last periods)
    const growthRate =
      data.length > 1
        ? ((data[data.length - 1].volume - data[0].volume) / data[0].volume) *
          100
        : 0;

    return {
      totalVolume,
      totalValue,
      totalTransactions,
      averageTransactionSize,
      peakVolume: peakData.volume,
      peakVolumeTime: peakData.timestamp,
      growthRate,
    };
  }

  private async getGeographicBreakdown(
    startDate: Date,
    endDate: Date,
    params: ReportParamsDto,
  ) {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.country', 'country')
      .addSelect('SUM(analytics.count)', 'volume')
      .addSelect('SUM(analytics.totalValue)', 'value')
      .where('analytics.type = :type', { type: AnalyticsType.TRADING_VOLUME })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('analytics.country IS NOT NULL')
      .groupBy('analytics.country')
      .orderBy('SUM(analytics.count)', 'DESC');

    if (params.userId) {
      queryBuilder.andWhere('analytics.userId = :userId', {
        userId: params.userId,
      });
    }

    const results = await queryBuilder.getRawMany();

    const totalVolume = results.reduce(
      (sum, item) => sum + parseFloat(item.volume || '0'),
      0,
    );

    return results.map((item) => ({
      country: item.country,
      volume: parseFloat(item.volume || '0'),
      value: parseFloat(item.value || '0'),
      percentage:
        totalVolume > 0
          ? (parseFloat(item.volume || '0') / totalVolume) * 100
          : 0,
    }));
  }

  private async getRenewableEnergyBreakdown(
    startDate: Date,
    endDate: Date,
    params: ReportParamsDto,
  ) {
    // Get total trading volume
    const totalVolumeQuery = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('SUM(analytics.count)', 'totalVolume')
      .where('analytics.type = :type', { type: AnalyticsType.TRADING_VOLUME })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (params.userId) {
      totalVolumeQuery.andWhere('analytics.userId = :userId', {
        userId: params.userId,
      });
    }

    const totalVolumeResult = await totalVolumeQuery.getRawOne();
    const totalVolume = parseFloat(totalVolumeResult?.totalVolume || '0');

    // Get renewable energy volume
    const renewableVolumeQuery = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('SUM(analytics.count)', 'renewableVolume')
      .where('analytics.type = :type', { type: AnalyticsType.RENEWABLE_ENERGY })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    if (params.userId) {
      renewableVolumeQuery.andWhere('analytics.userId = :userId', {
        userId: params.userId,
      });
    }

    const renewableVolumeResult = await renewableVolumeQuery.getRawOne();
    const renewableVolume = parseFloat(
      renewableVolumeResult?.renewableVolume || '0',
    );

    return {
      renewableVolume,
      totalVolume,
      percentage: totalVolume > 0 ? (renewableVolume / totalVolume) * 100 : 0,
    };
  }

  async generateHourlyReport(
    params: ReportParamsDto,
  ): Promise<TradingVolumeReport> {
    return this.generateReport({
      ...params,
      period: AggregationPeriod.HOURLY,
    });
  }

  async generateDailyReport(
    params: ReportParamsDto,
  ): Promise<TradingVolumeReport> {
    return this.generateReport({
      ...params,
      period: AggregationPeriod.DAILY,
    });
  }

  async generateWeeklyReport(
    params: ReportParamsDto,
  ): Promise<TradingVolumeReport> {
    return this.generateReport({
      ...params,
      period: AggregationPeriod.WEEKLY,
    });
  }

  async generateMonthlyReport(
    params: ReportParamsDto,
  ): Promise<TradingVolumeReport> {
    return this.generateReport({
      ...params,
      period: AggregationPeriod.MONTHLY,
    });
  }
}

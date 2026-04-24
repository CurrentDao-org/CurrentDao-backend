import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import {
  AnalyticsData,
  AnalyticsType,
  AggregationPeriod,
} from './entities/analytics-data.entity';
import { ReportParamsDto, DashboardMetricsDto } from './dto/report-params.dto';
import { TradingVolumeReport } from './reports/trading-volume.report';
import { PriceTrendsReport } from './reports/price-trends.report';
import { UserPerformanceReport } from './reports/user-performance.report';
import { MarketEfficiencyReport } from './reports/market-efficiency.report';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsData)
    private analyticsRepository: Repository<AnalyticsData>,
    private tradingVolumeReport: TradingVolumeReport,
    private priceTrendsReport: PriceTrendsReport,
    private userPerformanceReport: UserPerformanceReport,
    private marketEfficiencyReport: MarketEfficiencyReport,
  ) {}

  /**
   * Generate trading volume report
   */
  async generateTradingVolumeReport(params: ReportParamsDto) {
    return this.tradingVolumeReport.generateReport(params);
  }

  /**
   * Generate price trends report
   */
  async generatePriceTrendsReport(params: ReportParamsDto) {
    return this.priceTrendsReport.generateReport(params);
  }

  /**
   * Generate user performance report
   */
  async generateUserPerformanceReport(params: ReportParamsDto) {
    return this.userPerformanceReport.generateReport(params);
  }

  /**
   * Generate market efficiency report
   */
  async generateMarketEfficiencyReport(params: ReportParamsDto) {
    return this.marketEfficiencyReport.generateReport(params);
  }

  /**
   * Get real-time dashboard metrics
   */
  async getDashboardMetrics(params: DashboardMetricsDto) {
    const timeWindow = params.timeWindowHours || 24;
    const startDate = new Date(Date.now() - timeWindow * 60 * 60 * 1000);
    const endDate = new Date();

    const metrics: any = {
      period: {
        start: startDate,
        end: endDate,
        timeWindowHours: timeWindow,
      },
      summary: {
        totalVolume: 0,
        totalValue: 0,
        totalTransactions: 0,
        averagePrice: 0,
        renewableEnergyPercentage: 0,
        marketEfficiencyScore: 0,
      },
    };

    // Get trading volume metrics
    const volumeMetrics = await this.getVolumeMetrics(startDate, endDate);
    metrics.summary.totalVolume = volumeMetrics.totalVolume;
    metrics.summary.totalValue = volumeMetrics.totalValue;
    metrics.summary.totalTransactions = volumeMetrics.totalTransactions;
    metrics.summary.averagePrice = volumeMetrics.averagePrice;

    // Get renewable energy percentage
    if (params.includeRenewableMetrics) {
      const renewableMetrics = await this.getRenewableEnergyMetrics(
        startDate,
        endDate,
      );
      metrics.summary.renewableEnergyPercentage = renewableMetrics.percentage;
    }

    // Get market efficiency
    if (params.includeMarketEfficiency) {
      const efficiencyMetrics = await this.getMarketEfficiencyMetrics(
        startDate,
        endDate,
      );
      metrics.summary.marketEfficiencyScore = efficiencyMetrics.score;
    }

    // Get geographic breakdown
    if (params.includeGeographicBreakdown) {
      metrics.geographicBreakdown = await this.getGeographicBreakdown(
        startDate,
        endDate,
      );
    }

    // Get top performers
    metrics.topPerformers = await this.getTopPerformers(startDate, endDate, 10);

    // Get recent trends
    metrics.recentTrends = await this.getRecentTrends(startDate, endDate);

    return metrics;
  }

  /**
   * Store analytics data
   */
  async storeAnalyticsData(
    data: Partial<AnalyticsData>,
  ): Promise<AnalyticsData> {
    const analyticsData = this.analyticsRepository.create(data);
    return this.analyticsRepository.save(analyticsData);
  }

  /**
   * Get analytics data by type and period
   */
  async getAnalyticsData(
    type: AnalyticsType,
    period: AggregationPeriod,
    startDate?: Date,
    endDate?: Date,
    userId?: string,
    gridZoneId?: string,
    country?: string,
  ): Promise<AnalyticsData[]> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.type = :type', { type })
      .andWhere('analytics.period = :period', { period });

    if (startDate && endDate) {
      queryBuilder.andWhere(
        'analytics.timestamp BETWEEN :startDate AND :endDate',
        {
          startDate,
          endDate,
        },
      );
    }

    if (userId) {
      queryBuilder.andWhere('analytics.userId = :userId', { userId });
    }

    if (gridZoneId) {
      queryBuilder.andWhere('analytics.gridZoneId = :gridZoneId', {
        gridZoneId,
      });
    }

    if (country) {
      queryBuilder.andWhere('analytics.country = :country', { country });
    }

    queryBuilder.orderBy('analytics.timestamp', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Export report to different formats
   */
  async exportReport(
    reportData: any,
    format: 'json' | 'csv' | 'pdf',
  ): Promise<Buffer | string> {
    switch (format) {
      case 'json':
        return JSON.stringify(reportData, null, 2);

      case 'csv':
        return this.convertToCSV(reportData);

      case 'pdf':
        return this.convertToPDF(reportData);

      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }
  }

  /**
   * Schedule automated report generation
   */
  async scheduleReport(
    reportType: AnalyticsType,
    schedule: string, // Cron expression
    recipients: string[],
    params: ReportParamsDto,
  ): Promise<void> {
    // This would integrate with a job scheduler like Bull Queue
    // For now, we'll just log the scheduling request
    console.log(`Scheduling ${reportType} report with schedule: ${schedule}`);
    console.log(`Recipients: ${recipients.join(', ')}`);
    console.log(`Params:`, params);
  }

  private async getVolumeMetrics(startDate: Date, endDate: Date) {
    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('SUM(analytics.count)', 'totalVolume')
      .addSelect('SUM(analytics.totalValue)', 'totalValue')
      .addSelect('COUNT(analytics.id)', 'totalTransactions')
      .addSelect('AVG(analytics.averageValue)', 'averagePrice')
      .where('analytics.type = :type', { type: AnalyticsType.TRADING_VOLUME })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      totalVolume: parseInt(result?.totalVolume || '0'),
      totalValue: parseFloat(result?.totalValue || '0'),
      totalTransactions: parseInt(result?.totalTransactions || '0'),
      averagePrice: parseFloat(result?.averagePrice || '0'),
    };
  }

  private async getRenewableEnergyMetrics(startDate: Date, endDate: Date) {
    const totalVolumeQuery = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('SUM(analytics.count)', 'totalVolume')
      .where('analytics.type = :type', { type: AnalyticsType.TRADING_VOLUME })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    const renewableVolumeQuery = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('SUM(analytics.count)', 'renewableVolume')
      .where('analytics.type = :type', { type: AnalyticsType.RENEWABLE_ENERGY })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

    const [totalVolumeResult, renewableVolumeResult] = await Promise.all([
      totalVolumeQuery.getRawOne(),
      renewableVolumeQuery.getRawOne(),
    ]);

    const totalVolume = parseInt(totalVolumeResult?.totalVolume || '0');
    const renewableVolume = parseInt(
      renewableVolumeResult?.renewableVolume || '0',
    );

    return {
      totalVolume,
      renewableVolume,
      percentage: totalVolume > 0 ? (renewableVolume / totalVolume) * 100 : 0,
    };
  }

  private async getMarketEfficiencyMetrics(startDate: Date, endDate: Date) {
    const result = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select("AVG(analytics.data->>'priceEfficiency')", 'efficiency')
      .where('analytics.type = :type', {
        type: AnalyticsType.MARKET_EFFICIENCY,
      })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      score: parseFloat(result?.efficiency || '0') * 100,
    };
  }

  private async getGeographicBreakdown(startDate: Date, endDate: Date) {
    return this.analyticsRepository
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
      .orderBy('SUM(analytics.count)', 'DESC')
      .limit(10)
      .getRawMany();
  }

  private async getTopPerformers(
    startDate: Date,
    endDate: Date,
    limit: number,
  ) {
    return this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.userId', 'userId')
      .addSelect("SUM(analytics.data->>'profitLoss')", 'totalProfitLoss')
      .addSelect('COUNT(analytics.id)', 'tradeCount')
      .where('analytics.type = :type', { type: AnalyticsType.USER_PERFORMANCE })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('analytics.userId IS NOT NULL')
      .groupBy('analytics.userId')
      .orderBy("SUM(analytics.data->>'profitLoss')", 'DESC')
      .limit(limit)
      .getRawMany();
  }

  private async getRecentTrends(startDate: Date, endDate: Date) {
    const hourlyData = await this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.timestamp', 'timestamp')
      .addSelect("analytics.data->>'price'", 'price')
      .addSelect('analytics.count', 'volume')
      .where('analytics.type = :type', { type: AnalyticsType.PRICE_TREND })
      .andWhere('analytics.period = :period', {
        period: AggregationPeriod.HOURLY,
      })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .orderBy('analytics.timestamp', 'ASC')
      .limit(24) // Last 24 hours
      .getRawMany();

    return hourlyData.map((item) => ({
      timestamp: item.timestamp,
      price: parseFloat(item.price || '0'),
      volume: parseInt(item.volume || '0'),
    }));
  }

  private convertToCSV(data: any): string {
    // Simple CSV conversion - in a real implementation, you'd use a library like csv-writer
    const headers = Object.keys(data).join(',');
    const values = Object.values(data).join(',');
    return `${headers}\n${values}`;
  }

  private convertToPDF(data: any): Buffer {
    // Simple PDF conversion - in a real implementation, you'd use a library like pdfkit
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(content, 'utf-8');
  }
}

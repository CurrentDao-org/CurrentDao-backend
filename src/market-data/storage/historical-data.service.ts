import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import { MarketDataEntity } from '../entities/market-data.entity';
import { MarketDataResponseDto } from '../dto/market-data-response.dto';

export interface HistoricalDataQuery {
  symbol: string;
  startTime?: Date;
  endTime?: Date;
  period?: string;
  limit?: number;
}

export interface HistoricalDataSummary {
  symbol: string;
  period: string;
  dataPoints: number;
  startTime: Date;
  endTime: Date;
  priceStats: {
    high: number;
    low: number;
    open: number;
    close: number;
    average: number;
    volume: number;
  };
}

export interface DataRetentionConfig {
  realtimeRetention: number; // hours
  hourlyRetention: number; // days
  dailyRetention: number; // months
  monthlyRetention: number; // years
}

@Injectable()
export class HistoricalDataService {
  private readonly logger = new Logger(HistoricalDataService.name);
  private readonly retentionConfig: DataRetentionConfig = {
    realtimeRetention: 24, // 24 hours
    hourlyRetention: 30, // 30 days
    dailyRetention: 12, // 12 months
    monthlyRetention: 5, // 5 years
  };

  constructor(
    @InjectRepository(MarketDataEntity)
    private readonly marketDataRepository: Repository<MarketDataEntity>,
  ) {}

  async storeHistoricalData(marketData: MarketDataEntity): Promise<void> {
    try {
      // Store the data - the entity is already handled by TypeORM
      this.logger.debug(`Stored historical data for ${marketData.symbol}`);
    } catch (error) {
      this.logger.error('Error storing historical data:', error);
      throw error;
    }
  }

  async getHistoricalData(
    symbol: string,
    period?: string,
    limit?: number,
  ): Promise<MarketDataResponseDto[]> {
    try {
      const query: HistoricalDataQuery = {
        symbol,
        period,
        limit: limit || 100,
      };

      const data = await this.queryHistoricalData(query);
      return data.map(item => this.mapToResponseDto(item));
    } catch (error) {
      this.logger.error('Error fetching historical data:', error);
      throw error;
    }
  }

  async queryHistoricalData(query: HistoricalDataQuery): Promise<MarketDataEntity[]> {
    const whereConditions: any = { symbol: query.symbol };

    if (query.startTime && query.endTime) {
      whereConditions.timestamp = Between(query.startTime, query.endTime);
    } else if (query.startTime) {
      whereConditions.timestamp = MoreThan(query.startTime);
    } else if (query.endTime) {
      whereConditions.timestamp = LessThan(query.endTime);
    }

    let orderDirection: 'ASC' | 'DESC' = 'DESC';
    let groupByPeriod: string | null = null;

    // Determine period and aggregation
    switch (query.period) {
      case '1m':
        groupByPeriod = '1 minute';
        break;
      case '5m':
        groupByPeriod = '5 minutes';
        break;
      case '15m':
        groupByPeriod = '15 minutes';
        break;
      case '1h':
        groupByPeriod = '1 hour';
        break;
      case '4h':
        groupByPeriod = '4 hours';
        break;
      case '1d':
        groupByPeriod = '1 day';
        break;
      case '1w':
        groupByPeriod = '1 week';
        break;
      case '1M':
        groupByPeriod = '1 month';
        break;
      default:
        // No aggregation, return raw data
        break;
    }

    if (groupByPeriod) {
      return this.getAggregatedData(query, groupByPeriod);
    }

    const data = await this.marketDataRepository.find({
      where: whereConditions,
      order: { timestamp: orderDirection },
      take: query.limit || 100,
    });

    return data.reverse(); // Return in chronological order
  }

  private async getAggregatedData(
    query: HistoricalDataQuery,
    period: string,
  ): Promise<MarketDataEntity[]> {
    // This is a simplified aggregation - in production, you'd use proper SQL aggregation
    // or a time-series database for better performance

    const rawData = await this.marketDataRepository.find({
      where: {
        symbol: query.symbol,
        ...(query.startTime && query.endTime && {
          timestamp: Between(query.startTime, query.endTime),
        }),
      },
      order: { timestamp: 'ASC' },
    });

    const aggregatedData = this.aggregateDataByPeriod(rawData, period);
    
    return aggregatedData
      .slice(- (query.limit || 100))
      .map(data => this.createAggregatedEntity(data));
  }

  private aggregateDataByPeriod(data: MarketDataEntity[], period: string): any[] {
    const periodMs = this.getPeriodInMilliseconds(period);
    const aggregated = new Map<number, MarketDataEntity[]>();

    // Group data by period
    data.forEach(item => {
      const timestamp = item.timestamp.getTime();
      const periodStart = Math.floor(timestamp / periodMs) * periodMs;
      
      if (!aggregated.has(periodStart)) {
        aggregated.set(periodStart, []);
      }
      aggregated.get(periodStart)!.push(item);
    });

    // Aggregate each period
    return Array.from(aggregated.entries()).map(([periodStart, items]) => {
      const sortedItems = items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      return {
        timestamp: new Date(periodStart),
        open: sortedItems[0].open || sortedItems[0].price,
        high: Math.max(...items.map(item => item.high || item.price)),
        low: Math.min(...items.map(item => item.low || item.price)),
        close: sortedItems[sortedItems.length - 1].close || sortedItems[sortedItems.length - 1].price,
        volume: items.reduce((sum, item) => sum + (item.volume || 0), 0),
        price: sortedItems[sortedItems.length - 1].price,
        symbol: items[0].symbol,
        source: 'aggregated',
        qualityScore: items.reduce((sum, item) => sum + item.qualityScore, 0) / items.length,
      };
    });
  }

  private getPeriodInMilliseconds(period: string): number {
    const periods: Record<string, number> = {
      '1 minute': 60 * 1000,
      '5 minutes': 5 * 60 * 1000,
      '15 minutes': 15 * 60 * 1000,
      '1 hour': 60 * 60 * 1000,
      '4 hours': 4 * 60 * 60 * 1000,
      '1 day': 24 * 60 * 60 * 1000,
      '1 week': 7 * 24 * 60 * 60 * 1000,
      '1 month': 30 * 24 * 60 * 60 * 1000,
    };

    return periods[period] || 60 * 1000; // Default to 1 minute
  }

  private createAggregatedEntity(data: any): MarketDataEntity {
    return this.marketDataRepository.create({
      ...data,
      id: undefined, // Will be generated
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async getHistoricalDataSummary(
    symbol: string,
    startTime: Date,
    endTime: Date,
  ): Promise<HistoricalDataSummary> {
    try {
      const data = await this.marketDataRepository.find({
        where: {
          symbol,
          timestamp: Between(startTime, endTime),
        },
        order: { timestamp: 'ASC' },
      });

      if (data.length === 0) {
        throw new Error('No data found for the specified period');
      }

      const prices = data.map(item => item.price);
      const volumes = data.map(item => item.volume || 0);

      const summary: HistoricalDataSummary = {
        symbol,
        period: this.determinePeriod(startTime, endTime),
        dataPoints: data.length,
        startTime,
        endTime,
        priceStats: {
          high: Math.max(...prices),
          low: Math.min(...prices),
          open: data[0].open || data[0].price,
          close: data[data.length - 1].close || data[data.length - 1].price,
          average: prices.reduce((sum, price) => sum + price, 0) / prices.length,
          volume: volumes.reduce((sum, volume) => sum + volume, 0),
        },
      };

      return summary;
    } catch (error) {
      this.logger.error('Error generating historical data summary:', error);
      throw error;
    }
  }

  private determinePeriod(startTime: Date, endTime: Date): string {
    const duration = endTime.getTime() - startTime.getTime();
    const days = duration / (24 * 60 * 60 * 1000);

    if (days < 1) return 'intraday';
    if (days < 7) return 'daily';
    if (days < 30) return 'weekly';
    if (days < 365) return 'monthly';
    return 'yearly';
  }

  async cleanupOldData(): Promise<void> {
    try {
      const now = new Date();
      const cleanupStats = {
        realtime: 0,
        hourly: 0,
        daily: 0,
        monthly: 0,
      };

      // Clean up old real-time data
      const realtimeCutoff = new Date(now.getTime() - this.retentionConfig.realtimeRetention * 60 * 60 * 1000);
      const realtimeResult = await this.marketDataRepository.delete({
        timestamp: LessThan(realtimeCutoff),
        source: 'realtime',
      });
      cleanupStats.realtime = realtimeResult.affected || 0;

      // Clean up old hourly data
      const hourlyCutoff = new Date(now.getTime() - this.retentionConfig.hourlyRetention * 24 * 60 * 60 * 1000);
      const hourlyResult = await this.marketDataRepository.delete({
        timestamp: LessThan(hourlyCutoff),
        source: 'hourly',
      });
      cleanupStats.hourly = hourlyResult.affected || 0;

      // Clean up old daily data
      const dailyCutoff = new Date(now.getTime() - this.retentionConfig.dailyRetention * 30 * 24 * 60 * 60 * 1000);
      const dailyResult = await this.marketDataRepository.delete({
        timestamp: LessThan(dailyCutoff),
        source: 'daily',
      });
      cleanupStats.daily = dailyResult.affected || 0;

      // Clean up old monthly data
      const monthlyCutoff = new Date(now.getTime() - this.retentionConfig.monthlyRetention * 365 * 24 * 60 * 60 * 1000);
      const monthlyResult = await this.marketDataRepository.delete({
        timestamp: LessThan(monthlyCutoff),
        source: 'monthly',
      });
      cleanupStats.monthly = monthlyResult.affected || 0;

      this.logger.log('Data cleanup completed:', cleanupStats);
    } catch (error) {
      this.logger.error('Error during data cleanup:', error);
      throw error;
    }
  }

  async exportHistoricalData(
    symbol: string,
    startTime: Date,
    endTime: Date,
    format: 'csv' | 'json' = 'csv',
  ): Promise<string> {
    try {
      const data = await this.marketDataRepository.find({
        where: {
          symbol,
          timestamp: Between(startTime, endTime),
        },
        order: { timestamp: 'ASC' },
      });

      if (format === 'csv') {
        return this.exportToCsv(data);
      } else {
        return this.exportToJson(data);
      }
    } catch (error) {
      this.logger.error('Error exporting historical data:', error);
      throw error;
    }
  }

  private exportToCsv(data: MarketDataEntity[]): string {
    const headers = [
      'timestamp', 'symbol', 'price', 'volume', 'high', 'low', 'open', 'close',
      'bid', 'ask', 'spread', 'source', 'qualityScore'
    ];

    const csvRows = [
      headers.join(','),
      ...data.map(item => [
        item.timestamp.toISOString(),
        item.symbol,
        item.price,
        item.volume || '',
        item.high || '',
        item.low || '',
        item.open || '',
        item.close || '',
        item.bid || '',
        item.ask || '',
        item.spread || '',
        item.source,
        item.qualityScore,
      ].join(','))
    ];

    return csvRows.join('\n');
  }

  private exportToJson(data: MarketDataEntity[]): string {
    return JSON.stringify(data.map(item => this.mapToResponseDto(item)), null, 2);
  }

  async getDataRetentionStats(): Promise<any> {
    try {
      const now = new Date();
      const stats = {
        realtime: { count: 0, oldestDate: null },
        hourly: { count: 0, oldestDate: null },
        daily: { count: 0, oldestDate: null },
        monthly: { count: 0, oldestDate: null },
      };

      // Get stats for each data type
      for (const source of ['realtime', 'hourly', 'daily', 'monthly']) {
        const result = await this.marketDataRepository
          .createQueryBuilder('data')
          .select('COUNT(*)', 'count')
          .addSelect('MIN(timestamp)', 'oldestDate')
          .where('source = :source', { source })
          .getRawOne();

        stats[source] = {
          count: parseInt(result?.count || '0'),
          oldestDate: result?.oldestDate ? new Date(result.oldestDate) : null,
        };
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting data retention stats:', error);
      throw error;
    }
  }

  private mapToResponseDto(marketData: MarketDataEntity): MarketDataResponseDto {
    return {
      id: marketData.id,
      symbol: marketData.symbol,
      price: marketData.price,
      volume: marketData.volume,
      timestamp: marketData.timestamp,
      source: marketData.source,
      qualityScore: marketData.qualityScore,
      high: marketData.high,
      low: marketData.low,
      open: marketData.open,
      close: marketData.close,
      bid: marketData.bid,
      ask: marketData.ask,
      spread: marketData.spread,
    };
  }

  setRetentionConfig(config: Partial<DataRetentionConfig>): void {
    Object.assign(this.retentionConfig, config);
    this.logger.log('Updated retention config:', this.retentionConfig);
  }

  getRetentionConfig(): DataRetentionConfig {
    return { ...this.retentionConfig };
  }
}

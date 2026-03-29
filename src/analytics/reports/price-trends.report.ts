import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsData,
  AnalyticsType,
  AggregationPeriod,
} from '../entities/analytics-data.entity';
import { ReportParamsDto } from '../dto/report-params.dto';

export interface PriceDataPoint {
  timestamp: Date;
  price: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
}

export interface TechnicalIndicator {
  name: string;
  values: number[];
  signals: ('BUY' | 'SELL' | 'HOLD')[];
}

export interface PriceTrendsReport {
  period: {
    start: Date;
    end: Date;
    aggregation: AggregationPeriod;
  };
  summary: {
    currentPrice: number;
    priceChange: number;
    priceChangePercent: number;
    volatility: number;
    averagePrice: number;
    highestPrice: number;
    lowestPrice: number;
    trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  };
  data: PriceDataPoint[];
  technicalIndicators?: TechnicalIndicator[];
  comparativeAnalysis?: {
    region: string;
    averagePrice: number;
    priceChange: number;
    volatility: number;
  }[];
}

@Injectable()
export class PriceTrendsReport {
  constructor(
    @InjectRepository(AnalyticsData)
    private analyticsRepository: Repository<AnalyticsData>,
  ) {}

  async generateReport(params: ReportParamsDto): Promise<PriceTrendsReport> {
    const startDate =
      params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = params.endDate || new Date();
    const period = params.period || AggregationPeriod.DAILY;

    // Fetch price trend data
    const priceData = await this.fetchPriceData(
      startDate,
      endDate,
      period,
      params,
    );

    // Calculate summary statistics
    const summary = this.calculateSummary(priceData);

    // Generate technical indicators if requested
    const technicalIndicators = params.includeTechnicalIndicators
      ? this.generateTechnicalIndicators(priceData)
      : undefined;

    // Get comparative analysis if requested
    const comparativeAnalysis = params.includeComparativeAnalysis
      ? await this.getComparativeAnalysis(startDate, endDate, period, params)
      : undefined;

    return {
      period: {
        start: startDate,
        end: endDate,
        aggregation: period,
      },
      summary,
      data: priceData,
      technicalIndicators,
      comparativeAnalysis,
    };
  }

  private async fetchPriceData(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
    params: ReportParamsDto,
  ): Promise<PriceDataPoint[]> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.type = :type', { type: AnalyticsType.PRICE_TREND })
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

    return analyticsData.map((data) => {
      const priceData = data.data as any;
      return {
        timestamp: data.timestamp,
        price: parseFloat(priceData.price || '0'),
        volume: parseFloat(priceData.volume || '0'),
        high: parseFloat(priceData.high || '0'),
        low: parseFloat(priceData.low || '0'),
        open: parseFloat(priceData.open || '0'),
        close: parseFloat(priceData.close || '0'),
      };
    });
  }

  private calculateSummary(data: PriceDataPoint[]) {
    if (data.length === 0) {
      return {
        currentPrice: 0,
        priceChange: 0,
        priceChangePercent: 0,
        volatility: 0,
        averagePrice: 0,
        highestPrice: 0,
        lowestPrice: 0,
        trend: 'SIDEWAYS' as const,
      };
    }

    const currentPrice = data[data.length - 1].close;
    const firstPrice = data[0].open;
    const priceChange = currentPrice - firstPrice;
    const priceChangePercent =
      firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

    const prices = data.map((d) => d.close);
    const averagePrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);

    // Calculate volatility (standard deviation of returns)
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] > 0) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      }
    }
    const volatility =
      returns.length > 0 ? this.calculateStandardDeviation(returns) * 100 : 0;

    // Determine trend
    let trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS' = 'SIDEWAYS';
    if (priceChangePercent > 2) trend = 'BULLISH';
    else if (priceChangePercent < -2) trend = 'BEARISH';

    return {
      currentPrice,
      priceChange,
      priceChangePercent,
      volatility,
      averagePrice,
      highestPrice,
      lowestPrice,
      trend,
    };
  }

  private generateTechnicalIndicators(
    data: PriceDataPoint[],
  ): TechnicalIndicator[] {
    const indicators: TechnicalIndicator[] = [];
    const prices = data.map((d) => d.close);

    // Simple Moving Average (SMA) - 20 period
    const sma20 = this.calculateSMA(prices, 20);
    indicators.push({
      name: 'SMA_20',
      values: sma20,
      signals: this.generateSMASignals(prices, sma20),
    });

    // Exponential Moving Average (EMA) - 50 period
    const ema50 = this.calculateEMA(prices, 50);
    indicators.push({
      name: 'EMA_50',
      values: ema50,
      signals: this.generateEMASignals(prices, ema50),
    });

    // Relative Strength Index (RSI) - 14 period
    const rsi = this.calculateRSI(prices, 14);
    indicators.push({
      name: 'RSI_14',
      values: rsi,
      signals: this.generateRSISignals(rsi),
    });

    // MACD
    const macd = this.calculateMACD(prices);
    indicators.push({
      name: 'MACD',
      values: macd.macdLine,
      signals: this.generateMACDSignals(macd),
    });

    return indicators;
  }

  private calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices
        .slice(i - period + 1, i + 1)
        .reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
    return sma;
  }

  private calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA
    const sma = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    ema.push(sma);

    for (let i = period; i < prices.length; i++) {
      const currentEMA =
        (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
      ema.push(currentEMA);
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number): number[] {
    const rsi: number[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    for (let i = period - 1; i < gains.length; i++) {
      const avgGain =
        gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss =
        losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }

    return rsi;
  }

  private calculateMACD(prices: number[]): {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);

    // MACD line = EMA12 - EMA26
    const macdLine = ema12.map(
      (val, i) => val - ema26[i + (ema12.length - ema26.length)],
    );

    // Signal line = 9-period EMA of MACD line
    const signalLine = this.calculateEMA(macdLine, 9);

    // Histogram = MACD line - Signal line
    const histogram = macdLine.map(
      (val, i) =>
        val - (signalLine[i - (signalLine.length - macdLine.length)] || 0),
    );

    return { macdLine, signalLine, histogram };
  }

  private generateSMASignals(
    prices: number[],
    sma: number[],
  ): ('BUY' | 'SELL' | 'HOLD')[] {
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
    for (let i = 0; i < sma.length; i++) {
      const priceIndex = i + (prices.length - sma.length);
      if (prices[priceIndex] > sma[i]) {
        signals.push('BUY');
      } else if (prices[priceIndex] < sma[i]) {
        signals.push('SELL');
      } else {
        signals.push('HOLD');
      }
    }
    return signals;
  }

  private generateEMASignals(
    prices: number[],
    ema: number[],
  ): ('BUY' | 'SELL' | 'HOLD')[] {
    return this.generateSMASignals(prices, ema);
  }

  private generateRSISignals(rsi: number[]): ('BUY' | 'SELL' | 'HOLD')[] {
    return rsi.map((value) => {
      if (value < 30) return 'BUY';
      if (value > 70) return 'SELL';
      return 'HOLD';
    });
  }

  private generateMACDSignals(macd: {
    macdLine: number[];
    signalLine: number[];
    histogram: number[];
  }): ('BUY' | 'SELL' | 'HOLD')[] {
    const signals: ('BUY' | 'SELL' | 'HOLD')[] = [];
    const minLength = Math.min(macd.macdLine.length, macd.signalLine.length);

    for (let i = 0; i < minLength; i++) {
      if (macd.macdLine[i] > macd.signalLine[i]) {
        signals.push('BUY');
      } else if (macd.macdLine[i] < macd.signalLine[i]) {
        signals.push('SELL');
      } else {
        signals.push('HOLD');
      }
    }

    return signals;
  }

  private async getComparativeAnalysis(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
    params: ReportParamsDto,
  ) {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.country', 'region')
      .addSelect('AVG(analytics.averageValue)', 'averagePrice')
      .where('analytics.type = :type', { type: AnalyticsType.PRICE_TREND })
      .andWhere('analytics.period = :period', { period })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('analytics.country IS NOT NULL')
      .groupBy('analytics.country');

    if (params.userId) {
      queryBuilder.andWhere('analytics.userId = :userId', {
        userId: params.userId,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((result) => ({
      region: result.region,
      averagePrice: parseFloat(result.averagePrice || '0'),
      priceChange: 0, // Would need historical data for this
      volatility: 0, // Would need historical data for this
    }));
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const squaredDifferences = values.map((value) => Math.pow(value - mean, 2));
    const variance =
      squaredDifferences.reduce((sum, diff) => sum + diff, 0) / values.length;
    return Math.sqrt(variance);
  }
}

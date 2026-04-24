import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AnalyticsData,
  AnalyticsType,
  AggregationPeriod,
} from '../entities/analytics-data.entity';
import { ReportParamsDto } from '../dto/report-params.dto';

export interface MarketEfficiencyMetrics {
  timestamp: Date;
  bidAskSpread: number;
  spreadPercent: number;
  volatility: number;
  liquidity: number;
  marketDepth: number;
  priceEfficiency: number;
  volumeWeightedAveragePrice: number;
  tradingVelocity: number;
  orderBookImbalance: number;
}

export interface MarketEfficiencyReport {
  period: {
    start: Date;
    end: Date;
    aggregation: AggregationPeriod;
  };
  summary: {
    averageSpread: number;
    averageVolatility: number;
    averageLiquidity: number;
    marketEfficiencyScore: number;
    priceDiscoveryEfficiency: number;
    informationAsymmetry: number;
  };
  metrics: MarketEfficiencyMetrics[];
  geographicComparison?: {
    country: string;
    efficiencyScore: number;
    spread: number;
    volatility: number;
    liquidity: number;
  }[];
  timeAnalysis?: {
    hour: number;
    efficiencyScore: number;
    volume: number;
    volatility: number;
  }[];
  recommendations: string[];
}

@Injectable()
export class MarketEfficiencyReport {
  constructor(
    @InjectRepository(AnalyticsData)
    private analyticsRepository: Repository<AnalyticsData>,
  ) {}

  async generateReport(
    params: ReportParamsDto,
  ): Promise<MarketEfficiencyReport> {
    const startDate =
      params.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = params.endDate || new Date();
    const period = params.period || AggregationPeriod.DAILY;

    // Fetch market efficiency data
    const metrics = await this.fetchMarketEfficiencyData(
      startDate,
      endDate,
      period,
      params,
    );

    // Calculate summary statistics
    const summary = this.calculateSummary(metrics);

    // Get geographic comparison if requested
    const geographicComparison = params.includeComparativeAnalysis
      ? await this.getGeographicComparison(startDate, endDate, params)
      : undefined;

    // Get time-based analysis
    const timeAnalysis = await this.getTimeBasedAnalysis(
      startDate,
      endDate,
      params,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(summary);

    return {
      period: {
        start: startDate,
        end: endDate,
        aggregation: period,
      },
      summary,
      metrics,
      geographicComparison,
      timeAnalysis,
      recommendations,
    };
  }

  private async fetchMarketEfficiencyData(
    startDate: Date,
    endDate: Date,
    period: AggregationPeriod,
    params: ReportParamsDto,
  ): Promise<MarketEfficiencyMetrics[]> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.type = :type', {
        type: AnalyticsType.MARKET_EFFICIENCY,
      })
      .andWhere('analytics.period = :period', { period })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });

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
      const efficiencyData = data.data as any;
      return {
        timestamp: data.timestamp,
        bidAskSpread: parseFloat(efficiencyData.bidAskSpread || '0'),
        spreadPercent: parseFloat(efficiencyData.spreadPercent || '0'),
        volatility: parseFloat(efficiencyData.volatility || '0'),
        liquidity: parseFloat(efficiencyData.liquidity || '0'),
        marketDepth: parseFloat(efficiencyData.marketDepth || '0'),
        priceEfficiency: parseFloat(efficiencyData.priceEfficiency || '0'),
        volumeWeightedAveragePrice: parseFloat(efficiencyData.vwap || '0'),
        tradingVelocity: parseFloat(efficiencyData.tradingVelocity || '0'),
        orderBookImbalance: parseFloat(
          efficiencyData.orderBookImbalance || '0',
        ),
      };
    });
  }

  private calculateSummary(metrics: MarketEfficiencyMetrics[]) {
    if (metrics.length === 0) {
      return {
        averageSpread: 0,
        averageVolatility: 0,
        averageLiquidity: 0,
        marketEfficiencyScore: 0,
        priceDiscoveryEfficiency: 0,
        informationAsymmetry: 0,
      };
    }

    const averageSpread =
      metrics.reduce((sum, m) => sum + m.bidAskSpread, 0) / metrics.length;
    const averageVolatility =
      metrics.reduce((sum, m) => sum + m.volatility, 0) / metrics.length;
    const averageLiquidity =
      metrics.reduce((sum, m) => sum + m.liquidity, 0) / metrics.length;
    const averagePriceEfficiency =
      metrics.reduce((sum, m) => sum + m.priceEfficiency, 0) / metrics.length;

    // Calculate market efficiency score (0-100)
    const spreadScore = Math.max(0, 100 - averageSpread * 1000); // Lower spread is better
    const volatilityScore = Math.max(0, 100 - averageVolatility * 100); // Lower volatility is better
    const liquidityScore = Math.min(100, averageLiquidity * 10); // Higher liquidity is better
    const priceEfficiencyScore = averagePriceEfficiency * 100;

    const marketEfficiencyScore =
      (spreadScore + volatilityScore + liquidityScore + priceEfficiencyScore) /
      4;

    // Price discovery efficiency (how quickly prices reflect new information)
    const priceDiscoveryEfficiency =
      this.calculatePriceDiscoveryEfficiency(metrics);

    // Information asymmetry (inverse of price efficiency)
    const informationAsymmetry = Math.max(0, 100 - priceDiscoveryEfficiency);

    return {
      averageSpread,
      averageVolatility,
      averageLiquidity,
      marketEfficiencyScore,
      priceDiscoveryEfficiency,
      informationAsymmetry,
    };
  }

  private calculatePriceDiscoveryEfficiency(
    metrics: MarketEfficiencyMetrics[],
  ): number {
    if (metrics.length < 2) return 0;

    // Calculate price efficiency based on how quickly prices converge
    let totalEfficiency = 0;
    for (let i = 1; i < metrics.length; i++) {
      const currentEfficiency = metrics[i].priceEfficiency;
      const previousEfficiency = metrics[i - 1].priceEfficiency;

      // Higher efficiency when prices are stable and reflect information quickly
      const convergenceRate = Math.abs(currentEfficiency - previousEfficiency);
      totalEfficiency += Math.max(0, 1 - convergenceRate);
    }

    return (totalEfficiency / (metrics.length - 1)) * 100;
  }

  private async getGeographicComparison(
    startDate: Date,
    endDate: Date,
    params: ReportParamsDto,
  ) {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('analytics.country', 'country')
      .addSelect("AVG(analytics.data->>'bidAskSpread')", 'spread')
      .addSelect("AVG(analytics.data->>'volatility')", 'volatility')
      .addSelect("AVG(analytics.data->>'liquidity')", 'liquidity')
      .addSelect("AVG(analytics.data->>'priceEfficiency')", 'priceEfficiency')
      .where('analytics.type = :type', {
        type: AnalyticsType.MARKET_EFFICIENCY,
      })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('analytics.country IS NOT NULL')
      .groupBy('analytics.country');

    if (params.gridZoneId) {
      queryBuilder.andWhere('analytics.gridZoneId = :gridZoneId', {
        gridZoneId: params.gridZoneId,
      });
    }

    const results = await queryBuilder.getRawMany();

    return results.map((result) => {
      const spread = parseFloat(result.spread || '0');
      const volatility = parseFloat(result.volatility || '0');
      const liquidity = parseFloat(result.liquidity || '0');
      const priceEfficiency = parseFloat(result.priceEfficiency || '0');

      // Calculate efficiency score for each region
      const spreadScore = Math.max(0, 100 - spread * 1000);
      const volatilityScore = Math.max(0, 100 - volatility * 100);
      const liquidityScore = Math.min(100, liquidity * 10);
      const priceEfficiencyScore = priceEfficiency * 100;

      const efficiencyScore =
        (spreadScore +
          volatilityScore +
          liquidityScore +
          priceEfficiencyScore) /
        4;

      return {
        country: result.country,
        efficiencyScore,
        spread,
        volatility,
        liquidity,
      };
    });
  }

  private async getTimeBasedAnalysis(
    startDate: Date,
    endDate: Date,
    params: ReportParamsDto,
  ) {
    // Get hourly efficiency patterns
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .select('EXTRACT(HOUR FROM analytics.timestamp)', 'hour')
      .addSelect("AVG(analytics.data->>'priceEfficiency')", 'efficiencyScore')
      .addSelect("AVG(analytics.data->>'volatility')", 'volatility')
      .addSelect('SUM(analytics.count)', 'volume')
      .where('analytics.type = :type', {
        type: AnalyticsType.MARKET_EFFICIENCY,
      })
      .andWhere('analytics.timestamp BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .groupBy('EXTRACT(HOUR FROM analytics.timestamp)')
      .orderBy('hour', 'ASC');

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

    const results = await queryBuilder.getRawMany();

    return results.map((result) => ({
      hour: parseInt(result.hour),
      efficiencyScore: parseFloat(result.efficiencyScore || '0') * 100,
      volume: parseInt(result.volume || '0'),
      volatility: parseFloat(result.volatility || '0'),
    }));
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations: string[] = [];

    if (summary.averageSpread > 0.05) {
      recommendations.push(
        'High bid-ask spread detected. Consider improving market maker incentives to reduce spreads.',
      );
    }

    if (summary.averageVolatility > 0.3) {
      recommendations.push(
        'High volatility observed. Implement circuit breakers or volatility controls to stabilize the market.',
      );
    }

    if (summary.averageLiquidity < 5) {
      recommendations.push(
        'Low liquidity detected. Consider liquidity provision programs or market maker incentives.',
      );
    }

    if (summary.marketEfficiencyScore < 60) {
      recommendations.push(
        'Market efficiency is below optimal levels. Review market structure and consider regulatory improvements.',
      );
    }

    if (summary.priceDiscoveryEfficiency < 50) {
      recommendations.push(
        'Price discovery is inefficient. Improve information dissemination and transparency requirements.',
      );
    }

    if (summary.informationAsymmetry > 40) {
      recommendations.push(
        'High information asymmetry detected. Implement better disclosure requirements and real-time data feeds.',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Market efficiency metrics are within acceptable ranges. Continue monitoring for improvements.',
      );
    }

    return recommendations;
  }

  async generateRealTimeMetrics(
    gridZoneId?: string,
    country?: string,
  ): Promise<MarketEfficiencyMetrics> {
    const queryBuilder = this.analyticsRepository
      .createQueryBuilder('analytics')
      .where('analytics.type = :type', {
        type: AnalyticsType.MARKET_EFFICIENCY,
      })
      .andWhere('analytics.period = :period', {
        period: AggregationPeriod.HOURLY,
      })
      .orderBy('analytics.timestamp', 'DESC')
      .limit(1);

    if (gridZoneId) {
      queryBuilder.andWhere('analytics.gridZoneId = :gridZoneId', {
        gridZoneId,
      });
    }

    if (country) {
      queryBuilder.andWhere('analytics.country = :country', { country });
    }

    const latestData = await queryBuilder.getOne();

    if (!latestData) {
      // Return default metrics if no data available
      const now = new Date();
      return {
        timestamp: now,
        bidAskSpread: 0.02,
        spreadPercent: 2.0,
        volatility: 0.15,
        liquidity: 7.5,
        marketDepth: 1000,
        priceEfficiency: 0.85,
        volumeWeightedAveragePrice: 50,
        tradingVelocity: 5.2,
        orderBookImbalance: 0.1,
      };
    }

    const efficiencyData = latestData.data as any;
    return {
      timestamp: latestData.timestamp,
      bidAskSpread: parseFloat(efficiencyData.bidAskSpread || '0'),
      spreadPercent: parseFloat(efficiencyData.spreadPercent || '0'),
      volatility: parseFloat(efficiencyData.volatility || '0'),
      liquidity: parseFloat(efficiencyData.liquidity || '0'),
      marketDepth: parseFloat(efficiencyData.marketDepth || '0'),
      priceEfficiency: parseFloat(efficiencyData.priceEfficiency || '0'),
      volumeWeightedAveragePrice: parseFloat(efficiencyData.vwap || '0'),
      tradingVelocity: parseFloat(efficiencyData.tradingVelocity || '0'),
      orderBookImbalance: parseFloat(efficiencyData.orderBookImbalance || '0'),
    };
  }
}

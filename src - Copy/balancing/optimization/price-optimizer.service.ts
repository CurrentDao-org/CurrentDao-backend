import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { BalancingData } from '../entities/balancing-data.entity';
import { DemandForecastService, ForecastResult } from '../forecasting/demand-forecast.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BalancingCommand, BalancingCommandType } from '../dto/balancing-command.dto';
import * as ss from 'simple-statistics';

export interface PriceSignal {
  timestamp: Date;
  price: number;
  demand: number;
  supply: number;
  congestion: number;
  volatility: number;
  confidence: number;
}

export interface OptimizationResult {
  timestamp: Date;
  marketId: string;
  originalPrice: number;
  optimizedPrice: number;
  priceChange: number;
  expectedDemandChange: number;
  expectedSupplyChange: number;
  volatilityReduction: number;
  efficiencyGain: number;
  recommendations: PriceRecommendation[];
}

export interface PriceRecommendation {
  type: 'peak_shaving' | 'valley_filling' | 'congestion_management' | 'volatility_reduction';
  targetPrice: number;
  expectedImpact: number;
  duration: number;
  participants: string[];
  confidence: number;
  reason: string;
}

export interface MarketMetrics {
  currentPrice: number;
  averagePrice: number;
  priceVolatility: number;
  demandElasticity: number;
  supplyElasticity: number;
  congestionLevel: number;
  marketEfficiency: number;
  timestamp: Date;
}

@Injectable()
export class PriceOptimizerService {
  private readonly logger = new Logger(PriceOptimizerService.name);
  private readonly VOLATILITY_REDUCTION_TARGET = 0.2; // 20% reduction target
  private readonly MAX_PRICE_CHANGE = 0.5; // 50% max price change
  private readonly OPTIMIZATION_HORIZON_HOURS = 24;
  
  // Price optimization history
  private optimizationHistory = new Map<string, OptimizationResult[]>();
  private priceSignals = new Map<string, PriceSignal[]>();
  private marketMetrics = new Map<string, MarketMetrics[]>();

  constructor(
    @InjectRepository(BalancingData)
    private readonly balancingRepository: Repository<BalancingData>,
    private readonly demandForecastService: DemandForecastService,
  ) {}

  async optimizeMarketPrices(
    marketId: string,
    targetPrice?: number,
    volatilityThreshold?: number,
  ): Promise<OptimizationResult> {
    this.logger.log(`Optimizing prices for market ${marketId}`);
    
    try {
      const startTime = Date.now();
      
      // Get current market data
      const currentMetrics = await this.getCurrentMarketMetrics(marketId);
      
      // Get demand forecasts
      const forecasts = await this.demandForecastService.generateDemandForecast(marketId, this.OPTIMIZATION_HORIZON_HOURS);
      
      // Analyze price patterns and volatility
      const priceAnalysis = await this.analyzePricePatterns(marketId, forecasts);
      
      // Calculate optimal prices
      const optimization = await this.calculateOptimalPrices(
        marketId,
        currentMetrics,
        forecasts,
        priceAnalysis,
        targetPrice,
        volatilityThreshold,
      );
      
      // Generate recommendations
      const recommendations = await this.generatePriceRecommendations(
        marketId,
        optimization,
        currentMetrics,
        forecasts,
      );
      
      // Create optimization result
      const result: OptimizationResult = {
        timestamp: new Date(),
        marketId,
        originalPrice: currentMetrics.currentPrice,
        optimizedPrice: optimization.targetPrice,
        priceChange: (optimization.targetPrice - currentMetrics.currentPrice) / currentMetrics.currentPrice,
        expectedDemandChange: optimization.expectedDemandChange,
        expectedSupplyChange: optimization.expectedSupplyChange,
        volatilityReduction: optimization.volatilityReduction,
        efficiencyGain: optimization.efficiencyGain,
        recommendations,
      };
      
      // Store optimization result
      await this.storeOptimizationResult(result);
      
      const processingTime = Date.now() - startTime;
      this.logger.log(`Price optimization completed in ${processingTime}ms. Price change: ${(result.priceChange * 100).toFixed(2)}%`);
      
      return result;
      
    } catch (error) {
      this.logger.error(`Price optimization failed for market ${marketId}: ${error.message}`);
      throw error;
    }
  }

  private async getCurrentMarketMetrics(marketId: string): Promise<MarketMetrics> {
    // Get recent price and demand data
    const recentData = await this.balancingRepository.find({
      where: {
        regionId: marketId,
        timestamp: MoreThan(new Date(Date.now() - 60 * 60 * 1000)), // Last hour
        forecastType: 'price',
      },
      order: { timestamp: 'DESC' },
      take: 60, // Last 60 data points
    });
    
    if (recentData.length === 0) {
      return this.getDefaultMarketMetrics();
    }
    
    const prices = recentData.map(d => d.actualValue);
    const demands = recentData.map(d => d.metadata?.parameters?.demand || 1000);
    const supplies = recentData.map(d => d.metadata?.parameters?.supply || 1000);
    
    const currentPrice = prices[0];
    const averagePrice = ss.mean(prices);
    const priceVolatility = ss.standardDeviation(prices) / averagePrice;
    
    // Calculate elasticities (simplified)
    const demandElasticity = this.calculateElasticity(demands, prices);
    const supplyElasticity = this.calculateElasticity(supplies, prices);
    
    // Calculate congestion level (simplified)
    const congestionLevel = Math.max(0, (ss.mean(demands) - ss.mean(supplies)) / ss.mean(supplies));
    
    // Market efficiency based on price volatility and congestion
    const marketEfficiency = Math.max(0, 1 - (priceVolatility + congestionLevel) / 2);
    
    const metrics: MarketMetrics = {
      currentPrice,
      averagePrice,
      priceVolatility,
      demandElasticity,
      supplyElasticity,
      congestionLevel,
      marketEfficiency,
      timestamp: new Date(),
    };
    
    // Store in history
    if (!this.marketMetrics.has(marketId)) {
      this.marketMetrics.set(marketId, []);
    }
    const history = this.marketMetrics.get(marketId)!;
    history.push(metrics);
    
    // Keep only last 1000 data points
    if (history.length > 1000) {
      history.shift();
    }
    
    return metrics;
  }

  private getDefaultMarketMetrics(): MarketMetrics {
    return {
      currentPrice: 50,
      averagePrice: 50,
      priceVolatility: 0.1,
      demandElasticity: -0.2,
      supplyElasticity: 0.3,
      congestionLevel: 0.05,
      marketEfficiency: 0.9,
      timestamp: new Date(),
    };
  }

  private calculateElasticity(quantities: number[], prices: number[]): number {
    if (quantities.length < 2 || prices.length < 2) return 0;
    
    // Simple elasticity calculation
    const quantityChange = (quantities[quantities.length - 1] - quantities[0]) / quantities[0];
    const priceChange = (prices[prices.length - 1] - prices[0]) / prices[0];
    
    return priceChange !== 0 ? quantityChange / priceChange : 0;
  }

  private async analyzePricePatterns(
    marketId: string,
    forecasts: ForecastResult[],
  ): Promise<{
    peakHours: number[];
    valleyHours: number[];
    trend: 'increasing' | 'decreasing' | 'stable';
    seasonalPattern: number[];
    volatilityPattern: number[];
  }> {
    const history = this.marketMetrics.get(marketId) || [];
    
    if (history.length < 24) {
      // Not enough data for pattern analysis
      return {
        peakHours: [8, 18], // Default peak hours
        valleyHours: [2, 14], // Default valley hours
        trend: 'stable',
        seasonalPattern: new Array(24).fill(1.0),
        volatilityPattern: new Array(24).fill(0.1),
      };
    }
    
    // Analyze hourly patterns
    const hourlyPrices = new Array(24).fill(0).map(() => [] as number[]);
    const hourlyVolatility = new Array(24).fill(0).map(() => [] as number[]);
    
    history.forEach(metric => {
      const hour = metric.timestamp.getHours();
      hourlyPrices[hour].push(metric.currentPrice);
      hourlyVolatility[hour].push(metric.priceVolatility);
    });
    
    // Calculate average hourly prices and volatility
    const avgHourlyPrices = hourlyPrices.map(prices => 
      prices.length > 0 ? ss.mean(prices) : 50
    );
    const avgHourlyVolatility = hourlyVolatility.map(vols => 
      vols.length > 0 ? ss.mean(vols) : 0.1
    );
    
    // Identify peak and valley hours
    const priceThreshold = ss.mean(avgHourlyPrices);
    const peakHours = avgHourlyPrices
      .map((price, hour) => ({ price, hour }))
      .filter(({ price }) => price > priceThreshold * 1.1)
      .map(({ hour }) => hour);
    
    const valleyHours = avgHourlyPrices
      .map((price, hour) => ({ price, hour }))
      .filter(({ price }) => price < priceThreshold * 0.9)
      .map(({ hour }) => hour);
    
    // Determine trend
    const recentPrices = history.slice(-24).map(m => m.currentPrice);
    const trend = this.determinePriceTrend(recentPrices);
    
    // Normalize patterns
    const seasonalPattern = avgHourlyPrices.map(price => price / ss.mean(avgHourlyPrices));
    const volatilityPattern = avgHourlyVolatility;
    
    return {
      peakHours,
      valleyHours,
      trend,
      seasonalPattern,
      volatilityPattern,
    };
  }

  private determinePriceTrend(prices: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (prices.length < 2) return 'stable';
    
    const slope = this.calculateTrendSlope(prices);
    const avgPrice = ss.mean(prices);
    const relativeChange = Math.abs(slope) / avgPrice;
    
    if (relativeChange > 0.01) {
      return slope > 0 ? 'increasing' : 'decreasing';
    }
    return 'stable';
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;
    
    const sumX = ss.sum(x);
    const sumY = ss.sum(y);
    const sumXY = ss.sum(x.map((xi, i) => xi * y[i]));
    const sumXX = ss.sum(x.map(xi => xi * xi));
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private async calculateOptimalPrices(
    marketId: string,
    currentMetrics: MarketMetrics,
    forecasts: ForecastResult[],
    priceAnalysis: any,
    targetPrice?: number,
    volatilityThreshold?: number,
  ): Promise<{
    targetPrice: number;
    expectedDemandChange: number;
    expectedSupplyChange: number;
    volatilityReduction: number;
    efficiencyGain: number;
  }> {
    let optimalPrice = currentMetrics.currentPrice;
    
    // Apply target price if specified
    if (targetPrice) {
      optimalPrice = targetPrice;
    } else {
      // Calculate optimal price based on forecasts and patterns
      optimalPrice = this.calculateOptimalPriceFromForecasts(
        currentMetrics,
        forecasts,
        priceAnalysis,
      );
    }
    
    // Limit price change to maximum allowed
    const maxPrice = currentMetrics.currentPrice * (1 + this.MAX_PRICE_CHANGE);
    const minPrice = currentMetrics.currentPrice * (1 - this.MAX_PRICE_CHANGE);
    optimalPrice = Math.max(minPrice, Math.min(maxPrice, optimalPrice));
    
    // Calculate expected changes
    const priceChange = (optimalPrice - currentMetrics.currentPrice) / currentMetrics.currentPrice;
    const expectedDemandChange = priceChange * currentMetrics.demandElasticity;
    const expectedSupplyChange = priceChange * currentMetrics.supplyElasticity;
    
    // Calculate volatility reduction
    const currentVolatility = currentMetrics.priceVolatility;
    const targetVolatility = volatilityThreshold || currentVolatility * (1 - this.VOLATILITY_REDUCTION_TARGET);
    const volatilityReduction = Math.max(0, (currentVolatility - targetVolatility) / currentVolatility);
    
    // Calculate efficiency gain
    const efficiencyGain = this.calculateEfficiencyGain(
      currentMetrics,
      priceChange,
      volatilityReduction,
    );
    
    return {
      targetPrice: optimalPrice,
      expectedDemandChange,
      expectedSupplyChange,
      volatilityReduction,
      efficiencyGain,
    };
  }

  private calculateOptimalPriceFromForecasts(
    currentMetrics: MarketMetrics,
    forecasts: ForecastResult[],
    priceAnalysis: any,
  ): number {
    // Base price on current market conditions
    let optimalPrice = currentMetrics.currentPrice;
    
    // Adjust based on demand forecasts
    const avgForecastDemand = ss.mean(forecasts.map(f => f.predictedValue));
    const demandPressure = avgForecastDemand / 1000; // Normalize
    
    if (demandPressure > 1.1) {
      optimalPrice *= 1.1; // Increase price for high demand
    } else if (demandPressure < 0.9) {
      optimalPrice *= 0.9; // Decrease price for low demand
    }
    
    // Adjust based on congestion
    if (currentMetrics.congestionLevel > 0.1) {
      optimalPrice *= 1 + currentMetrics.congestionLevel; // Increase price for congestion
    }
    
    // Adjust based on seasonal patterns
    const currentHour = new Date().getHours();
    const seasonalFactor = priceAnalysis.seasonalPattern[currentHour];
    optimalPrice *= seasonalFactor;
    
    // Adjust based on trend
    if (priceAnalysis.trend === 'increasing') {
      optimalPrice *= 1.05;
    } else if (priceAnalysis.trend === 'decreasing') {
      optimalPrice *= 0.95;
    }
    
    return optimalPrice;
  }

  private calculateEfficiencyGain(
    currentMetrics: MarketMetrics,
    priceChange: number,
    volatilityReduction: number,
  ): number {
    // Efficiency gain from reduced volatility and improved market balance
    const volatilityGain = volatilityReduction * 0.4;
    
    // Efficiency gain from improved supply-demand balance
    const balanceImprovement = Math.abs(priceChange) * currentMetrics.demandElasticity * 0.3;
    
    // Efficiency gain from reduced congestion
    const congestionReduction = Math.max(0, -priceChange * currentMetrics.congestionLevel) * 0.3;
    
    return volatilityGain + balanceImprovement + congestionReduction;
  }

  private async generatePriceRecommendations(
    marketId: string,
    optimization: any,
    currentMetrics: MarketMetrics,
    forecasts: ForecastResult[],
  ): Promise<PriceRecommendation[]> {
    const recommendations: PriceRecommendation[] = [];
    
    // Peak shaving recommendation
    const peakHours = [8, 18, 19, 20]; // Typical peak hours
    const currentHour = new Date().getHours();
    
    if (peakHours.includes(currentHour)) {
      recommendations.push({
        type: 'peak_shaving',
        targetPrice: optimization.targetPrice * 1.2,
        expectedImpact: 0.15,
        duration: 4,
        participants: ['industrial', 'commercial'],
        confidence: 0.8,
        reason: 'Peak demand period detected',
      });
    }
    
    // Valley filling recommendation
    const valleyHours = [2, 3, 4, 14, 15];
    if (valleyHours.includes(currentHour)) {
      recommendations.push({
        type: 'valley_filling',
        targetPrice: optimization.targetPrice * 0.8,
        expectedImpact: 0.1,
        duration: 3,
        participants: ['residential', 'storage'],
        confidence: 0.7,
        reason: 'Low demand period detected',
      });
    }
    
    // Congestion management
    if (currentMetrics.congestionLevel > 0.1) {
      recommendations.push({
        type: 'congestion_management',
        targetPrice: optimization.targetPrice * (1 + currentMetrics.congestionLevel),
        expectedImpact: currentMetrics.congestionLevel * 0.5,
        duration: 2,
        participants: ['generators', 'flexible_load'],
        confidence: 0.9,
        reason: 'Grid congestion detected',
      });
    }
    
    // Volatility reduction
    if (currentMetrics.priceVolatility > 0.15) {
      recommendations.push({
        type: 'volatility_reduction',
        targetPrice: currentMetrics.averagePrice,
        expectedImpact: optimization.volatilityReduction,
        duration: 6,
        participants: ['all'],
        confidence: 0.6,
        reason: 'High price volatility detected',
      });
    }
    
    return recommendations;
  }

  private async storeOptimizationResult(result: OptimizationResult): Promise<void> {
    // Store in optimization history
    if (!this.optimizationHistory.has(result.marketId)) {
      this.optimizationHistory.set(result.marketId, []);
    }
    const history = this.optimizationHistory.get(result.marketId)!;
    history.push(result);
    
    // Keep only last 1000 results
    if (history.length > 1000) {
      history.shift();
    }
    
    // Store in database
    const optimizationData = this.balancingRepository.create({
      regionId: result.marketId,
      timestamp: result.timestamp,
      forecastType: 'price',
      actualValue: result.originalPrice,
      predictedValue: result.optimizedPrice,
      confidence: 0.85,
      metadata: {
        source: 'price_optimizer',
        algorithm: 'market_optimization',
        parameters: {
          priceChange: result.priceChange,
          expectedDemandChange: result.expectedDemandChange,
          expectedSupplyChange: result.expectedSupplyChange,
          volatilityReduction: result.volatilityReduction,
          efficiencyGain: result.efficiencyGain,
          recommendations: result.recommendations,
        },
      },
      status: 'active',
      adjustments: [{
        type: 'price',
        amount: result.optimizedPrice - result.originalPrice,
        timestamp: result.timestamp,
        reason: 'Market optimization',
      }],
    });
    
    await this.balancingRepository.save(optimizationData);
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async performScheduledOptimizations(): Promise<void> {
    try {
      const activeMarkets = await this.getActiveMarkets();
      
      for (const marketId of activeMarkets) {
        await this.optimizeMarketPrices(marketId);
      }
      
      this.logger.log(`Scheduled optimizations completed for ${activeMarkets.length} markets`);
    } catch (error) {
      this.logger.error(`Scheduled optimizations failed: ${error.message}`);
    }
  }

  private async getActiveMarkets(): Promise<string[]> {
    const result = await this.balancingRepository
      .createQueryBuilder('data')
      .select('DISTINCT data.regionId', 'regionId')
      .where('data.forecastType = :type AND data.timestamp > :date', { 
        type: 'price', 
        date: new Date(Date.now() - 24 * 60 * 60 * 1000) 
      })
      .getRawMany();
    
    return result.map(r => r.regionId);
  }

  async getOptimizationHistory(marketId: string, days: number = 7): Promise<OptimizationResult[]> {
    const history = this.optimizationHistory.get(marketId) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return history.filter(result => result.timestamp > cutoff);
  }

  async getMarketMetrics(marketId: string, hours: number = 24): Promise<MarketMetrics[]> {
    const metrics = this.marketMetrics.get(marketId) || [];
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return metrics.filter(metric => metric.timestamp > cutoff);
  }

  async getOptimizationPerformance(marketId: string, days: number = 30): Promise<{
    totalOptimizations: number;
    averagePriceChange: number;
    averageVolatilityReduction: number;
    averageEfficiencyGain: number;
    successRate: number;
  }> {
    const history = await this.getOptimizationHistory(marketId, days);
    
    const totalOptimizations = history.length;
    const averagePriceChange = history.length > 0
      ? ss.mean(history.map(h => Math.abs(h.priceChange)))
      : 0;
    const averageVolatilityReduction = history.length > 0
      ? ss.mean(history.map(h => h.volatilityReduction))
      : 0;
    const averageEfficiencyGain = history.length > 0
      ? ss.mean(history.map(h => h.efficiencyGain))
      : 0;
    const successRate = history.length > 0
      ? history.filter(h => h.efficiencyGain > 0).length / history.length
      : 0;
    
    return {
      totalOptimizations,
      averagePriceChange,
      averageVolatilityReduction,
      averageEfficiencyGain,
      successRate,
    };
  }

  async processPriceOptimizationCommand(command: BalancingCommand): Promise<OptimizationResult> {
    if (command.type !== BalancingCommandType.OPTIMIZE_PRICE) {
      throw new Error('Invalid command type for price optimization');
    }
    
    const { marketId, targetPrice, volatilityThreshold } = command.priceOptimization!;
    
    return this.optimizeMarketPrices(marketId, targetPrice, volatilityThreshold);
  }
}

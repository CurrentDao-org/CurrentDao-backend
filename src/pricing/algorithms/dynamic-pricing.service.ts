import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface SupplyDemandData {
  supply: number;
  demand: number;
  timestamp: number;
  location: string;
  energyType: string;
  externalFactors?: {
    weatherCondition?: string;
    timeOfDay: number;
    dayOfWeek: number;
    season: string;
    economicIndicator?: number;
    competitorPrices?: number[];
  };
}

export interface DynamicPricingResult {
  basePrice: number;
  adjustedPrice: number;
  supplyDemandRatio: number;
  elasticity: number;
  marketPressure: 'high' | 'medium' | 'low';
  recommendedAction: 'increase' | 'decrease' | 'maintain';
  confidence: number;
  factors: {
    supplyScore: number;
    demandScore: number;
    timeMultiplier: number;
    seasonalMultiplier: number;
    competitiveMultiplier: number;
  };
}

@Injectable()
export class DynamicPricingService {
  private readonly logger = new Logger(DynamicPricingService.name);
  private readonly RESPONSE_TIME_MS = 1000; // 1 second requirement
  private historicalData: Map<string, SupplyDemandData[]> = new Map();
  
  // Pricing parameters
  private readonly ELASTICITY_COEFFICIENT = 0.5;
  private readonly MIN_PRICE = 0.01;
  private readonly MAX_PRICE = 10000;
  private readonly DEFAULT_BASE_PRICE = 100;

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async calculateDynamicPrice(
    data: SupplyDemandData,
    currentBasePrice?: number,
  ): Promise<DynamicPricingResult> {
    const startTime = Date.now();

    // Get historical context
    const historicalContext = await this.getHistoricalContext(data.location, data.energyType);
    
    // Calculate supply-demand metrics
    const supplyDemandRatio = data.supply / data.demand;
    const marketPressure = this.calculateMarketPressure(supplyDemandRatio);
    
    // Calculate elasticity based on historical data
    const elasticity = this.calculateElasticity(historicalContext, supplyDemandRatio);
    
    // Calculate base price adjustment
    const basePrice = currentBasePrice || this.DEFAULT_BASE_PRICE;
    const priceAdjustment = this.calculatePriceAdjustment(supplyDemandRatio, elasticity);
    
    // Apply time-based factors
    const timeMultiplier = this.calculateTimeMultiplier(data.externalFactors?.timeOfDay || 0);
    const seasonalMultiplier = this.calculateSeasonalMultiplier(data.externalFactors?.season || 'spring');
    
    // Apply competitive factors
    const competitiveMultiplier = this.calculateCompetitiveMultiplier(
      data.externalFactors?.competitorPrices || [],
      basePrice,
    );
    
    // Calculate final adjusted price
    const adjustedPrice = basePrice * priceAdjustment * timeMultiplier * seasonalMultiplier * competitiveMultiplier;
    
    // Apply price bounds
    const finalPrice = Math.max(this.MIN_PRICE, Math.min(this.MAX_PRICE, adjustedPrice));
    
    // Determine recommended action
    const recommendedAction = this.getRecommendedAction(finalPrice, basePrice);
    
    // Calculate confidence score
    const confidence = this.calculateConfidence(historicalContext, data);
    
    const result: DynamicPricingResult = {
      basePrice,
      adjustedPrice: finalPrice,
      supplyDemandRatio,
      elasticity,
      marketPressure,
      recommendedAction,
      confidence,
      factors: {
        supplyScore: this.calculateSupplyScore(data.supply, historicalContext),
        demandScore: this.calculateDemandScore(data.demand, historicalContext),
        timeMultiplier,
        seasonalMultiplier,
        competitiveMultiplier,
      },
    };

    // Ensure response time requirement
    const responseTime = Date.now() - startTime;
    if (responseTime > this.RESPONSE_TIME_MS) {
      this.logger.warn(`Dynamic pricing response time exceeded: ${responseTime}ms`);
    }

    // Store data for learning
    await this.updateHistoricalData(data, result);

    this.logger.log(
      `Dynamic price calculated for ${data.energyType} in ${data.location}: $${finalPrice.toFixed(2)} (${recommendedAction})`,
    );

    return result;
  }

  private calculateMarketPressure(supplyDemandRatio: number): 'high' | 'medium' | 'low' {
    if (supplyDemandRatio < 0.8) return 'high'; // High demand, low supply
    if (supplyDemandRatio > 1.2) return 'low';  // Low demand, high supply
    return 'medium';
  }

  private calculateElasticity(
    historicalContext: SupplyDemandData[],
    currentRatio: number,
  ): number {
    if (historicalContext.length < 2) {
      return this.ELASTICITY_COEFFICIENT;
    }

    // Calculate price elasticity from historical data
    const recentData = historicalContext.slice(-20);
    let totalElasticity = 0;
    let count = 0;

    for (let i = 1; i < recentData.length; i++) {
      const prev = recentData[i - 1];
      const curr = recentData[i];
      
      const ratioChange = (curr.supply / curr.demand) - (prev.supply / prev.demand);
      const priceChange = (curr.supply / curr.demand) - (prev.supply / prev.demand);
      
      if (Math.abs(priceChange) > 0.001) {
        const elasticity = ratioChange / priceChange;
        totalElasticity += Math.abs(elasticity);
        count++;
      }
    }

    return count > 0 ? totalElasticity / count : this.ELASTICITY_COEFFICIENT;
  }

  private calculatePriceAdjustment(supplyDemandRatio: number, elasticity: number): number {
    // Use logarithmic function for smooth price adjustments
    const logRatio = Math.log(supplyDemandRatio);
    const adjustment = 1 + (logRatio * elasticity * 0.1);
    
    // Limit adjustment to reasonable bounds
    return Math.max(0.1, Math.min(10, adjustment));
  }

  private calculateTimeMultiplier(timeOfDay: number): number {
    // Peak hours: 7-9 AM and 6-9 PM
    if ((timeOfDay >= 7 && timeOfDay <= 9) || (timeOfDay >= 18 && timeOfDay <= 21)) {
      return 1.3; // 30% premium during peak hours
    }
    
    // Off-peak hours: 11 PM - 6 AM
    if (timeOfDay >= 23 || timeOfDay <= 6) {
      return 0.8; // 20% discount during off-peak hours
    }
    
    return 1.0; // Normal pricing during regular hours
  }

  private calculateSeasonalMultiplier(season: string): number {
    const seasonalFactors = {
      winter: 1.4,    // Higher demand for heating
      summer: 1.3,    // Higher demand for cooling
      spring: 1.0,    // Normal demand
      autumn: 1.0,    // Normal demand
    };

    return seasonalFactors[season.toLowerCase()] || 1.0;
  }

  private calculateCompetitiveMultiplier(
    competitorPrices: number[],
    ourPrice: number,
  ): number {
    if (competitorPrices.length === 0) {
      return 1.0;
    }

    const avgCompetitorPrice = competitorPrices.reduce((sum, price) => sum + price, 0) / competitorPrices.length;
    
    // Adjust price to be competitive but not too low
    if (ourPrice > avgCompetitorPrice * 1.1) {
      return 0.95; // Reduce price if we're significantly higher
    } else if (ourPrice < avgCompetitorPrice * 0.9) {
      return 1.05; // Increase price if we're significantly lower
    }
    
    return 1.0;
  }

  private calculateSupplyScore(supply: number, historicalContext: SupplyDemandData[]): number {
    if (historicalContext.length === 0) {
      return 0.5; // Neutral score
    }

    const avgSupply = historicalContext.reduce((sum, data) => sum + data.supply, 0) / historicalContext.length;
    return Math.min(1.0, supply / avgSupply);
  }

  private calculateDemandScore(demand: number, historicalContext: SupplyDemandData[]): number {
    if (historicalContext.length === 0) {
      return 0.5; // Neutral score
    }

    const avgDemand = historicalContext.reduce((sum, data) => sum + data.demand, 0) / historicalContext.length;
    return Math.min(1.0, demand / avgDemand);
  }

  private getRecommendedAction(newPrice: number, basePrice: number): 'increase' | 'decrease' | 'maintain' {
    const changePercent = ((newPrice - basePrice) / basePrice) * 100;
    
    if (changePercent > 5) return 'increase';
    if (changePercent < -5) return 'decrease';
    return 'maintain';
  }

  private calculateConfidence(
    historicalContext: SupplyDemandData[],
    currentData: SupplyDemandData,
  ): number {
    if (historicalContext.length < 5) {
      return 50; // Low confidence with limited data
    }

    // Calculate confidence based on data quality and patterns
    let confidence = 70; // Base confidence

    // More historical data increases confidence
    if (historicalContext.length > 50) confidence += 10;
    if (historicalContext.length > 100) confidence += 10;

    // Check if current data follows expected patterns
    const recentTrend = this.analyzeRecentTrend(historicalContext);
    if (recentTrend.isStable) confidence += 10;

    return Math.min(95, confidence);
  }

  private analyzeRecentTrend(historicalContext: SupplyDemandData[]): {
    isStable: boolean;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if (historicalContext.length < 10) {
      return { isStable: false, trend: 'stable' };
    }

    const recent = historicalContext.slice(-10);
    const ratios = recent.map(data => data.supply / data.demand);
    
    // Calculate trend
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < ratios.length; i++) {
      if (ratios[i] > ratios[i - 1]) increasing++;
      else if (ratios[i] < ratios[i - 1]) decreasing++;
    }

    const isStable = Math.abs(increasing - decreasing) <= 2;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    
    if (increasing > decreasing + 2) trend = 'increasing';
    else if (decreasing > increasing + 2) trend = 'decreasing';

    return { isStable, trend };
  }

  private async getHistoricalContext(
    location: string,
    energyType: string,
  ): Promise<SupplyDemandData[]> {
    const key = `${location}-${energyType}`;
    
    if (!this.historicalData.has(key)) {
      // Load from database
      const priceHistory = await this.priceHistoryRepository.find({
        where: { location, energyType },
        order: { timestamp: 'DESC' },
        take: 200,
      });

      const historicalData: SupplyDemandData[] = priceHistory.map(record => ({
        supply: record.supply,
        demand: record.demand,
        timestamp: record.timestamp.getTime(),
        location: record.location,
        energyType: record.energyType,
      }));

      this.historicalData.set(key, historicalData);
    }

    return this.historicalData.get(key) || [];
  }

  private async updateHistoricalData(
    data: SupplyDemandData,
    result: DynamicPricingResult,
  ): Promise<void> {
    const key = `${data.location}-${data.energyType}`;
    const existing = this.historicalData.get(key) || [];
    
    existing.push(data);
    
    // Keep only recent data (last 1000 records)
    if (existing.length > 1000) {
      this.historicalData.set(key, existing.slice(-1000));
    } else {
      this.historicalData.set(key, existing);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async optimizePricingAlgorithms(): Promise<void> {
    // Analyze performance and adjust parameters
    this.logger.log('Optimizing dynamic pricing algorithms...');
    
    // Clean old data periodically
    for (const [key, data] of this.historicalData.entries()) {
      if (data.length > 1000) {
        this.historicalData.set(key, data.slice(-1000));
      }
    }
  }

  getPricingStatistics(): {
    totalMarkets: number;
    avgConfidence: number;
    highPressureMarkets: number;
    lowPressureMarkets: number;
  } {
    let totalMarkets = 0;
    let totalConfidence = 0;
    let highPressureCount = 0;
    let lowPressureCount = 0;

    for (const [key, data] of this.historicalData.entries()) {
      if (data.length > 0) {
        totalMarkets++;
        const latest = data[data.length - 1];
        const ratio = latest.supply / latest.demand;
        
        if (ratio < 0.8) highPressureCount++;
        else if (ratio > 1.2) lowPressureCount++;
      }
    }

    return {
      totalMarkets,
      avgConfidence: totalMarkets > 0 ? totalConfidence / totalMarkets : 0,
      highPressureMarkets: highPressureCount,
      lowPressureMarkets: lowPressureCount,
    };
  }
}

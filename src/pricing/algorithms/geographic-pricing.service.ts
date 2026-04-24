import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';

export interface GeographicPricingFactors {
  location: string;
  country: string;
  region: string;
  currency: string;
  timezone: string;
  localDemand: number;
  localSupply: number;
  importCost: number;
  exportCost: number;
  taxes: number;
  regulations: number;
  infrastructure: number;
  weatherRisk: number;
  politicalRisk: number;
}

export interface GeographicPriceAdjustment {
  location: string;
  basePrice: number;
  adjustedPrice: number;
  adjustmentFactor: number;
  factors: {
    currencyMultiplier: number;
    demandMultiplier: number;
    supplyMultiplier: number;
    importExportMultiplier: number;
    taxMultiplier: number;
    regulationMultiplier: number;
    infrastructureMultiplier: number;
    riskMultiplier: number;
  };
  confidence: number;
  lastUpdated: Date;
}

export interface RegionalComparison {
  region: string;
  averagePrice: number;
  priceIndex: number;
  marketShare: number;
  competitiveness: number;
  growthPotential: number;
  riskLevel: 'low' | 'medium' | 'high';
  opportunities: string[];
  challenges: string[];
}

@Injectable()
export class GeographicPricingService {
  private readonly logger = new Logger(GeographicPricingService.name);
  private geographicFactors: Map<string, GeographicPricingFactors> = new Map();
  private priceAdjustments: Map<string, GeographicPriceAdjustment> = new Map();

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {
    this.initializeGeographicFactors();
  }

  private initializeGeographicFactors(): void {
    // Initialize geographic pricing factors for major markets
    const regions: GeographicPricingFactors[] = [
      {
        location: 'US',
        country: 'United States',
        region: 'North America',
        currency: 'USD',
        timezone: 'UTC-5 to UTC-8',
        localDemand: 1000,
        localSupply: 950,
        importCost: 0.05,
        exportCost: 0.03,
        taxes: 0.15,
        regulations: 0.08,
        infrastructure: 0.95,
        weatherRisk: 0.3,
        politicalRisk: 0.2,
      },
      {
        location: 'EU',
        country: 'European Union',
        region: 'Europe',
        currency: 'EUR',
        timezone: 'UTC+0 to UTC+2',
        localDemand: 1200,
        localSupply: 1100,
        importCost: 0.08,
        exportCost: 0.05,
        taxes: 0.20,
        regulations: 0.12,
        infrastructure: 0.90,
        weatherRisk: 0.25,
        politicalRisk: 0.15,
      },
      {
        location: 'UK',
        country: 'United Kingdom',
        region: 'Europe',
        currency: 'GBP',
        timezone: 'UTC+0',
        localDemand: 800,
        localSupply: 750,
        importCost: 0.07,
        exportCost: 0.04,
        taxes: 0.18,
        regulations: 0.10,
        infrastructure: 0.88,
        weatherRisk: 0.35,
        politicalRisk: 0.25,
      },
      {
        location: 'Germany',
        country: 'Germany',
        region: 'Europe',
        currency: 'EUR',
        timezone: 'UTC+1',
        localDemand: 900,
        localSupply: 850,
        importCost: 0.06,
        exportCost: 0.04,
        taxes: 0.19,
        regulations: 0.14,
        infrastructure: 0.92,
        weatherRisk: 0.2,
        politicalRisk: 0.1,
      },
      {
        location: 'France',
        country: 'France',
        region: 'Europe',
        currency: 'EUR',
        timezone: 'UTC+1',
        localDemand: 850,
        localSupply: 900,
        importCost: 0.05,
        exportCost: 0.03,
        taxes: 0.17,
        regulations: 0.11,
        infrastructure: 0.89,
        weatherRisk: 0.22,
        politicalRisk: 0.12,
      },
      {
        location: 'Spain',
        country: 'Spain',
        region: 'Europe',
        currency: 'EUR',
        timezone: 'UTC+1',
        localDemand: 700,
        localSupply: 650,
        importCost: 0.07,
        exportCost: 0.05,
        taxes: 0.16,
        regulations: 0.09,
        infrastructure: 0.85,
        weatherRisk: 0.4,
        politicalRisk: 0.18,
      },
      {
        location: 'Italy',
        country: 'Italy',
        region: 'Europe',
        currency: 'EUR',
        timezone: 'UTC+1',
        localDemand: 750,
        localSupply: 700,
        importCost: 0.08,
        exportCost: 0.06,
        taxes: 0.18,
        regulations: 0.13,
        infrastructure: 0.82,
        weatherRisk: 0.3,
        politicalRisk: 0.2,
      },
      {
        location: 'Nordics',
        country: 'Scandinavian Countries',
        region: 'Europe',
        currency: 'NOK/SEK/DKK',
        timezone: 'UTC+1 to UTC+2',
        localDemand: 600,
        localSupply: 650,
        importCost: 0.09,
        exportCost: 0.07,
        taxes: 0.22,
        regulations: 0.08,
        infrastructure: 0.94,
        weatherRisk: 0.5,
        politicalRisk: 0.05,
      },
      {
        location: 'China',
        country: 'China',
        region: 'Asia',
        currency: 'CNY',
        timezone: 'UTC+8',
        localDemand: 1500,
        localSupply: 1400,
        importCost: 0.04,
        exportCost: 0.02,
        taxes: 0.13,
        regulations: 0.15,
        infrastructure: 0.78,
        weatherRisk: 0.35,
        politicalRisk: 0.3,
      },
      {
        location: 'Japan',
        country: 'Japan',
        region: 'Asia',
        currency: 'JPY',
        timezone: 'UTC+9',
        localDemand: 800,
        localSupply: 750,
        importCost: 0.06,
        exportCost: 0.04,
        taxes: 0.14,
        regulations: 0.10,
        infrastructure: 0.91,
        weatherRisk: 0.4,
        politicalRisk: 0.08,
      },
      {
        location: 'India',
        country: 'India',
        region: 'Asia',
        currency: 'INR',
        timezone: 'UTC+5:30',
        localDemand: 1100,
        localSupply: 900,
        importCost: 0.07,
        exportCost: 0.05,
        taxes: 0.12,
        regulations: 0.16,
        infrastructure: 0.65,
        weatherRisk: 0.45,
        politicalRisk: 0.35,
      },
      {
        location: 'Australia',
        country: 'Australia',
        region: 'Oceania',
        currency: 'AUD',
        timezone: 'UTC+8 to UTC+10',
        localDemand: 500,
        localSupply: 550,
        importCost: 0.08,
        exportCost: 0.06,
        taxes: 0.17,
        regulations: 0.09,
        infrastructure: 0.83,
        weatherRisk: 0.38,
        politicalRisk: 0.12,
      },
    ];

    regions.forEach(region => {
      this.geographicFactors.set(region.location, region);
    });

    this.logger.log(`Initialized geographic pricing factors for ${regions.length} regions`);
  }

  async calculateGeographicPriceAdjustment(
    basePrice: number,
    location: string,
    energyType: string,
  ): Promise<GeographicPriceAdjustment> {
    const factors = this.geographicFactors.get(location);
    
    if (!factors) {
      throw new Error(`No geographic factors found for location: ${location}`);
    }

    // Get historical data for this location
    const historicalData = await this.getLocationHistoricalData(location, energyType);
    
    // Calculate multipliers
    const currencyMultiplier = this.calculateCurrencyMultiplier(factors.currency);
    const demandMultiplier = this.calculateDemandMultiplier(factors.localDemand, factors.localSupply);
    const supplyMultiplier = this.calculateSupplyMultiplier(factors.localSupply, factors.localDemand);
    const importExportMultiplier = this.calculateImportExportMultiplier(factors.importCost, factors.exportCost);
    const taxMultiplier = 1 + factors.taxes;
    const regulationMultiplier = 1 + factors.regulations;
    const infrastructureMultiplier = factors.infrastructure;
    const riskMultiplier = this.calculateRiskMultiplier(factors.weatherRisk, factors.politicalRisk);

    // Apply all multipliers
    let adjustmentFactor = 1;
    adjustmentFactor *= currencyMultiplier;
    adjustmentFactor *= demandMultiplier;
    adjustmentFactor *= supplyMultiplier;
    adjustmentFactor *= importExportMultiplier;
    adjustmentFactor *= taxMultiplier;
    adjustmentFactor *= regulationMultiplier;
    adjustmentFactor *= infrastructureMultiplier;
    adjustmentFactor *= riskMultiplier;

    // Apply historical adjustment
    const historicalAdjustment = this.calculateHistoricalAdjustment(historicalData, basePrice);
    adjustmentFactor *= historicalAdjustment;

    const adjustedPrice = basePrice * adjustmentFactor;
    const confidence = this.calculateAdjustmentConfidence(factors, historicalData);

    const priceAdjustment: GeographicPriceAdjustment = {
      location,
      basePrice,
      adjustedPrice,
      adjustmentFactor,
      factors: {
        currencyMultiplier,
        demandMultiplier,
        supplyMultiplier,
        importExportMultiplier,
        taxMultiplier,
        regulationMultiplier,
        infrastructureMultiplier,
        riskMultiplier,
      },
      confidence,
      lastUpdated: new Date(),
    };

    // Cache the adjustment
    this.priceAdjustments.set(location, priceAdjustment);

    return priceAdjustment;
  }

  private calculateCurrencyMultiplier(currency: string): number {
    // Base currency is USD, calculate relative value
    const exchangeRates: Record<string, number> = {
      USD: 1.0,
      EUR: 0.92,
      GBP: 0.79,
      CNY: 7.2,
      JPY: 149.5,
      INR: 83.2,
      AUD: 1.53,
      NOK: 10.8,
      SEK: 10.7,
      DKK: 6.9,
    };

    const rate = exchangeRates[currency] || 1.0;
    
    // Adjust for purchasing power parity
    const pppAdjustments: Record<string, number> = {
      USD: 1.0,
      EUR: 0.95,
      GBP: 0.88,
      CNY: 0.35,
      JPY: 0.65,
      INR: 0.25,
      AUD: 0.85,
      NOK: 0.90,
      SEK: 0.92,
      DKK: 0.93,
    };

    return pppAdjustments[currency] || 1.0;
  }

  private calculateDemandMultiplier(demand: number, supply: number): number {
    const supplyDemandRatio = supply / demand;
    
    if (supplyDemandRatio < 0.8) return 1.3; // High demand
    if (supplyDemandRatio > 1.2) return 0.9; // Low demand
    return 1.0; // Balanced
  }

  private calculateSupplyMultiplier(supply: number, demand: number): number {
    const supplyDemandRatio = supply / demand;
    
    if (supplyDemandRatio > 1.2) return 0.95; // High supply
    if (supplyDemandRatio < 0.8) return 1.05; // Low supply
    return 1.0; // Balanced
  }

  private calculateImportExportMultiplier(importCost: number, exportCost: number): number {
    // Net import cost affects pricing
    const netCost = importCost - exportCost;
    return 1 + netCost;
  }

  private calculateRiskMultiplier(weatherRisk: number, politicalRisk: number): number {
    const totalRisk = weatherRisk + politicalRisk;
    
    if (totalRisk > 0.6) return 1.15; // High risk
    if (totalRisk > 0.4) return 1.08; // Medium risk
    if (totalRisk > 0.2) return 1.03; // Low risk
    return 1.0; // Minimal risk
  }

  private calculateHistoricalAdjustment(
    historicalData: PriceHistory[],
    basePrice: number,
  ): number {
    if (historicalData.length < 5) return 1.0;

    const recentPrices = historicalData.slice(-20).map(d => d.finalPrice);
    const avgRecentPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    // Adjust based on historical deviation
    const deviation = (avgRecentPrice - basePrice) / basePrice;
    
    // Limit adjustment to ±10%
    return Math.max(0.9, Math.min(1.1, 1 + deviation * 0.3));
  }

  private calculateAdjustmentConfidence(
    factors: GeographicPricingFactors,
    historicalData: PriceHistory[],
  ): number {
    let confidence = 70; // Base confidence

    // More historical data increases confidence
    if (historicalData.length > 100) confidence += 10;
    if (historicalData.length > 500) confidence += 10;

    // Lower risk increases confidence
    const totalRisk = factors.weatherRisk + factors.politicalRisk;
    if (totalRisk < 0.2) confidence += 10;
    else if (totalRisk > 0.6) confidence -= 10;

    // Better infrastructure increases confidence
    if (factors.infrastructure > 0.9) confidence += 5;
    else if (factors.infrastructure < 0.7) confidence -= 5;

    return Math.max(50, Math.min(95, confidence));
  }

  private async getLocationHistoricalData(
    location: string,
    energyType: string,
  ): Promise<PriceHistory[]> {
    return this.priceHistoryRepository.find({
      where: { location, energyType },
      order: { timestamp: 'DESC' },
      take: 1000,
    });
  }

  async getRegionalComparisons(energyType?: string): Promise<RegionalComparison[]> {
    const comparisons: RegionalComparison[] = [];
    const locations = Array.from(this.geographicFactors.keys());

    for (const location of locations) {
      const comparison = await this.generateRegionalComparison(location, energyType);
      comparisons.push(comparison);
    }

    return comparisons.sort((a, b) => b.marketShare - a.marketShare);
  }

  private async generateRegionalComparison(
    location: string,
    energyType?: string,
  ): Promise<RegionalComparison> {
    const factors = this.geographicFactors.get(location)!;
    const historicalData = await this.getLocationHistoricalData(location, energyType || 'solar');
    
    const averagePrice = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + d.finalPrice, 0) / historicalData.length
      : 100;

    // Calculate price index (relative to global average)
    const globalAverage = 100; // This would be calculated from all markets
    const priceIndex = (averagePrice / globalAverage) * 100;

    // Calculate market share (simplified)
    const totalDemand = Array.from(this.geographicFactors.values())
      .reduce((sum, f) => sum + f.localDemand, 0);
    const marketShare = (factors.localDemand / totalDemand) * 100;

    // Calculate competitiveness
    const competitiveness = this.calculateCompetitiveness(factors, averagePrice);

    // Calculate growth potential
    const growthPotential = this.calculateGrowthPotential(factors, historicalData);

    // Determine risk level
    const totalRisk = factors.weatherRisk + factors.politicalRisk;
    const riskLevel = totalRisk > 0.6 ? 'high' : totalRisk > 0.3 ? 'medium' : 'low';

    // Generate opportunities and challenges
    const opportunities = this.identifyOpportunities(factors, historicalData);
    const challenges = this.identifyChallenges(factors, historicalData);

    return {
      region: location,
      averagePrice,
      priceIndex,
      marketShare,
      competitiveness,
      growthPotential,
      riskLevel,
      opportunities,
      challenges,
    };
  }

  private calculateCompetitiveness(factors: GeographicPricingFactors, averagePrice: number): number {
    let score = 50;

    // Infrastructure quality
    score += factors.infrastructure * 20;

    // Risk level (lower is better)
    score -= (factors.weatherRisk + factors.politicalRisk) * 15;

    // Tax burden (lower is better)
    score -= factors.taxes * 50;

    // Regulatory burden (lower is better)
    score -= factors.regulations * 30;

    // Import/export costs
    score -= (factors.importCost + factors.exportCost) * 100;

    return Math.max(0, Math.min(100, score));
  }

  private calculateGrowthPotential(
    factors: GeographicPricingFactors,
    historicalData: PriceHistory[],
  ): number {
    let potential = 50;

    // Demand growth potential
    if (factors.localDemand > factors.localSupply) potential += 20;

    // Infrastructure gap
    if (factors.infrastructure < 0.8) potential += 15;

    // Market size
    if (factors.localDemand > 1000) potential += 10;

    // Historical growth
    if (historicalData.length > 10) {
      const recentPrices = historicalData.slice(-10).map(d => d.finalPrice);
      const olderPrices = historicalData.slice(-20, -10).map(d => d.finalPrice);
      
      if (recentPrices.length > 0 && olderPrices.length > 0) {
        const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
        
        if (recentAvg > olderAvg) potential += 10;
      }
    }

    return Math.max(0, Math.min(100, potential));
  }

  private identifyOpportunities(factors: GeographicPricingFactors, historicalData: PriceHistory[]): string[] {
    const opportunities: string[] = [];

    if (factors.localDemand > factors.localSupply) {
      opportunities.push('High demand relative to supply');
    }

    if (factors.infrastructure > 0.9) {
      opportunities.push('Excellent infrastructure quality');
    }

    if (factors.weatherRisk < 0.2) {
      opportunities.push('Low weather-related risks');
    }

    if (factors.politicalRisk < 0.1) {
      opportunities.push('Stable political environment');
    }

    if (factors.taxes < 0.15) {
      opportunities.push('Favorable tax environment');
    }

    return opportunities;
  }

  private identifyChallenges(factors: GeographicPricingFactors, historicalData: PriceHistory[]): string[] {
    const challenges: string[] = [];

    if (factors.localDemand < factors.localSupply) {
      challenges.push('Supply exceeds demand');
    }

    if (factors.infrastructure < 0.7) {
      challenges.push('Poor infrastructure quality');
    }

    if (factors.weatherRisk > 0.4) {
      challenges.push('High weather-related risks');
    }

    if (factors.politicalRisk > 0.3) {
      challenges.push('Political instability risks');
    }

    if (factors.taxes > 0.2) {
      challenges.push('High tax burden');
    }

    if (factors.regulations > 0.15) {
      challenges.push('Complex regulatory environment');
    }

    return challenges;
  }

  async getGeographicPricingInsights(
    location: string,
    energyType?: string,
  ): Promise<{
    currentAdjustment: GeographicPriceAdjustment;
    trends: {
      priceTrend: 'increasing' | 'decreasing' | 'stable';
      demandTrend: 'increasing' | 'decreasing' | 'stable';
      competitivenessTrend: 'improving' | 'declining' | 'stable';
    };
    recommendations: string[];
    riskFactors: string[];
    opportunities: string[];
  }> {
    const factors = this.geographicFactors.get(location);
    if (!factors) {
      throw new Error(`No geographic factors found for location: ${location}`);
    }

    const currentAdjustment = await this.calculateGeographicPriceAdjustment(100, location, energyType || 'solar');
    const historicalData = await this.getLocationHistoricalData(location, energyType || 'solar');

    const trends = this.analyzeGeographicTrends(historicalData);
    const recommendations = this.generateGeographicRecommendations(factors, trends, currentAdjustment);
    const riskFactors = this.identifyRiskFactors(factors);
    const opportunities = this.identifyOpportunities(factors, historicalData);

    return {
      currentAdjustment,
      trends,
      recommendations,
      riskFactors,
      opportunities,
    };
  }

  private analyzeGeographicTrends(historicalData: PriceHistory[]): {
    priceTrend: 'increasing' | 'decreasing' | 'stable';
    demandTrend: 'increasing' | 'decreasing' | 'stable';
    competitivenessTrend: 'improving' | 'declining' | 'stable';
  } {
    if (historicalData.length < 10) {
      return {
        priceTrend: 'stable',
        demandTrend: 'stable',
        competitivenessTrend: 'stable',
      };
    }

    const prices = historicalData.map(d => d.finalPrice);
    const demands = historicalData.map(d => d.demand);
    
    // Price trend
    const recentPrices = prices.slice(-10);
    const olderPrices = prices.slice(-20, -10);
    const priceTrend = this.calculateTrend(recentPrices, olderPrices);

    // Demand trend
    const recentDemands = demands.slice(-10);
    const olderDemands = demands.slice(-20, -10);
    const demandTrend = this.calculateTrend(recentDemands, olderDemands);

    // Competitiveness trend (based on price stability)
    const priceVolatility = this.calculateVolatility(prices);
    const competitivenessTrend = priceVolatility < 0.1 ? 'improving' : 
                               priceVolatility > 0.3 ? 'declining' : 'stable';

    return {
      priceTrend,
      demandTrend,
      competitivenessTrend,
    };
  }

  private calculateTrend(
    recent: number[],
    older: number[],
  ): 'increasing' | 'decreasing' | 'stable' {
    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance) / mean;
  }

  private generateGeographicRecommendations(
    factors: GeographicPricingFactors,
    trends: any,
    adjustment: GeographicPriceAdjustment,
  ): string[] {
    const recommendations: string[] = [];

    if (trends.priceTrend === 'increasing' && adjustment.adjustmentFactor > 1.1) {
      recommendations.push('Consider long-term contracts to lock in current prices');
    }

    if (trends.demandTrend === 'increasing' && factors.localDemand > factors.localSupply) {
      recommendations.push('Increase supply capacity to meet growing demand');
    }

    if (factors.infrastructure < 0.8) {
      recommendations.push('Invest in infrastructure improvements to reduce costs');
    }

    if (factors.taxes > 0.2) {
      recommendations.push('Explore tax optimization strategies');
    }

    if (adjustment.confidence < 70) {
      recommendations.push('Gather more market data to improve pricing accuracy');
    }

    return recommendations;
  }

  private identifyRiskFactors(factors: GeographicPricingFactors): string[] {
    const riskFactors: string[] = [];

    if (factors.weatherRisk > 0.4) {
      riskFactors.push('High weather-related risk affecting supply reliability');
    }

    if (factors.politicalRisk > 0.3) {
      riskFactors.push('Political instability may impact market conditions');
    }

    if (factors.importCost > 0.08) {
      riskFactors.push('High import dependency increases cost volatility');
    }

    if (factors.regulations > 0.15) {
      riskFactors.push('Complex regulatory environment increases compliance costs');
    }

    if (factors.localSupply < factors.localDemand * 0.8) {
      riskFactors.push('Supply deficit may lead to price spikes');
    }

    return riskFactors;
  }

  updateGeographicFactors(location: string, updates: Partial<GeographicPricingFactors>): void {
    const existing = this.geographicFactors.get(location);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.geographicFactors.set(location, updated);
      this.logger.log(`Updated geographic factors for ${location}`);
    }
  }

  getGeographicFactors(location: string): GeographicPricingFactors | undefined {
    return this.geographicFactors.get(location);
  }

  getAllGeographicFactors(): GeographicPricingFactors[] {
    return Array.from(this.geographicFactors.values());
  }

  getPriceAdjustment(location: string): GeographicPriceAdjustment | undefined {
    return this.priceAdjustments.get(location);
  }
}

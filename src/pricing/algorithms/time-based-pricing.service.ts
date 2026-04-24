import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';

export interface TimeBasedPricingFactors {
  hourOfDay: number;
  dayOfWeek: number;
  dayOfMonth: number;
  month: number;
  season: string;
  isWeekend: boolean;
  isHoliday: boolean;
  isPeakHour: boolean;
  isOffPeakHour: boolean;
  demandPattern: 'morning_peak' | 'evening_peak' | 'base_load' | 'minimum_load';
  seasonalDemand: number;
  weatherImpact: number;
}

export interface TimeBasedPriceAdjustment {
  timestamp: number;
  basePrice: number;
  adjustedPrice: number;
  timeMultiplier: number;
  peakMultiplier: number;
  seasonalMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
  weatherMultiplier: number;
  demandPatternMultiplier: number;
  confidence: number;
  factors: TimeBasedPricingFactors;
}

export interface PeakPricingSchedule {
  peakHours: Array<{ start: number; end: number; multiplier: number }>;
  offPeakHours: Array<{ start: number; end: number; multiplier: number }>;
  weekendSchedule: Array<{ day: number; multiplier: number }>;
  holidaySchedule: Array<{ date: Date; multiplier: number }>;
  seasonalSchedule: Array<{ season: string; multiplier: number }>;
}

@Injectable()
export class TimeBasedPricingService {
  private readonly logger = new Logger(TimeBasedPricingService.name);
  private peakSchedule: PeakPricingSchedule;
  private historicalPatterns: Map<string, number[]> = new Map();

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {
    this.initializePeakSchedule();
  }

  private initializePeakSchedule(): void {
    this.peakSchedule = {
      peakHours: [
        { start: 7, end: 9, multiplier: 1.3 },   // Morning peak
        { start: 18, end: 21, multiplier: 1.4 }, // Evening peak
      ],
      offPeakHours: [
        { start: 23, end: 6, multiplier: 0.8 },  // Night off-peak
        { start: 10, end: 16, multiplier: 0.95 }, // Day off-peak
      ],
      weekendSchedule: [
        { day: 0, multiplier: 0.9 }, // Sunday
        { day: 6, multiplier: 0.95 }, // Saturday
      ],
      holidaySchedule: [], // Will be populated dynamically
      seasonalSchedule: [
        { season: 'winter', multiplier: 1.4 },  // High heating demand
        { season: 'summer', multiplier: 1.3 },  // High cooling demand
        { season: 'spring', multiplier: 1.0 },  // Normal demand
        { season: 'autumn', multiplier: 1.0 },  // Normal demand
      ],
    };

    this.logger.log('Initialized time-based pricing schedule');
  }

  async calculateTimeBasedPriceAdjustment(
    basePrice: number,
    timestamp: number,
    location: string,
    energyType: string,
  ): Promise<TimeBasedPriceAdjustment> {
    const date = new Date(timestamp);
    const factors = this.extractTimeBasedFactors(date);
    
    // Calculate multipliers
    const timeMultiplier = this.calculateTimeMultiplier(factors);
    const peakMultiplier = this.calculatePeakMultiplier(factors);
    const seasonalMultiplier = this.calculateSeasonalMultiplier(factors);
    const weekendMultiplier = this.calculateWeekendMultiplier(factors);
    const holidayMultiplier = this.calculateHolidayMultiplier(factors);
    const weatherMultiplier = await this.calculateWeatherMultiplier(factors, location, date);
    const demandPatternMultiplier = this.calculateDemandPatternMultiplier(factors);

    // Apply all multipliers
    let totalMultiplier = 1;
    totalMultiplier *= timeMultiplier;
    totalMultiplier *= peakMultiplier;
    totalMultiplier *= seasonalMultiplier;
    totalMultiplier *= weekendMultiplier;
    totalMultiplier *= holidayMultiplier;
    totalMultiplier *= weatherMultiplier;
    totalMultiplier *= demandPatternMultiplier;

    const adjustedPrice = basePrice * totalMultiplier;
    const confidence = await this.calculateTimeBasedConfidence(factors, location, energyType);

    return {
      timestamp,
      basePrice,
      adjustedPrice,
      timeMultiplier,
      peakMultiplier,
      seasonalMultiplier,
      weekendMultiplier,
      holidayMultiplier,
      weatherMultiplier,
      demandPatternMultiplier,
      confidence,
      factors,
    };
  }

  private extractTimeBasedFactors(date: Date): TimeBasedPricingFactors {
    const hourOfDay = date.getHours();
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayOfMonth = date.getDate();
    const month = date.getMonth(); // 0 = January, 11 = December
    const season = this.getSeason(month);
    
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = this.isHoliday(date);
    const isPeakHour = this.isPeakHour(hourOfDay);
    const isOffPeakHour = this.isOffPeakHour(hourOfDay);
    const demandPattern = this.getDemandPattern(hourOfDay, isWeekend);
    const seasonalDemand = this.getSeasonalDemand(season);
    const weatherImpact = this.getWeatherImpact(month, season);

    return {
      hourOfDay,
      dayOfWeek,
      dayOfMonth,
      month,
      season,
      isWeekend,
      isHoliday,
      isPeakHour,
      isOffPeakHour,
      demandPattern,
      seasonalDemand,
      weatherImpact,
    };
  }

  private getSeason(month: number): string {
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    return 'winter';
  }

  private isHoliday(date: Date): boolean {
    const month = date.getMonth();
    const day = date.getDate();
    const dayOfWeek = date.getDay();

    // Major holidays (simplified list)
    const holidays = [
      { month: 0, day: 1 },   // New Year's Day
      { month: 11, day: 25 },  // Christmas Day
      { month: 6, day: 4 },    // Independence Day (US)
      { month: 11, day: 24, dayOfWeek: 4 }, // Thanksgiving (US, 4th Thursday)
    ];

    return holidays.some(holiday => {
      if (holiday.dayOfWeek !== undefined) {
        return month === holiday.month && 
               day >= holiday.day - 6 && 
               day <= holiday.day + 1 && 
               dayOfWeek === holiday.dayOfWeek;
      }
      return month === holiday.month && day === holiday.day;
    });
  }

  private isPeakHour(hour: number): boolean {
    return this.peakSchedule.peakHours.some(peak => 
      hour >= peak.start && (hour < peak.end || peak.end < peak.start)
    );
  }

  private isOffPeakHour(hour: number): boolean {
    return this.peakSchedule.offPeakHours.some(offPeak => 
      hour >= offPeak.start && (hour < offPeak.end || offPeak.end < offPeak.start)
    );
  }

  private getDemandPattern(hour: number, isWeekend: boolean): 'morning_peak' | 'evening_peak' | 'base_load' | 'minimum_load' {
    if (isWeekend) {
      if (hour >= 8 && hour <= 22) return 'base_load';
      return 'minimum_load';
    }

    if (hour >= 6 && hour <= 9) return 'morning_peak';
    if (hour >= 18 && hour <= 22) return 'evening_peak';
    if (hour >= 0 && hour <= 5) return 'minimum_load';
    return 'base_load';
  }

  private getSeasonalDemand(season: string): number {
    const demandFactors = {
      winter: 1.4,  // High heating demand
      summer: 1.3,  // High cooling demand
      spring: 1.0,  // Moderate demand
      autumn: 1.0,  // Moderate demand
    };
    return demandFactors[season] || 1.0;
  }

  private getWeatherImpact(month: number, season: string): number {
    // Weather impact varies by season and location
    const weatherFactors = {
      winter: { impact: 0.8, volatility: 0.3 },  // High impact, high volatility
      summer: { impact: 0.7, volatility: 0.25 }, // High impact, medium volatility
      spring: { impact: 0.4, volatility: 0.15 }, // Medium impact, low volatility
      autumn: { impact: 0.3, volatility: 0.1 },  // Low impact, low volatility
    };

    return weatherFactors[season]?.impact || 0.5;
  }

  private calculateTimeMultiplier(factors: TimeBasedPricingFactors): number {
    // Base time multiplier based on hour of day
    const hourMultipliers = {
      0: 0.8, 1: 0.8, 2: 0.8, 3: 0.8, 4: 0.8, 5: 0.9, 6: 1.0,
      7: 1.2, 8: 1.3, 9: 1.2, 10: 1.0, 11: 1.0, 12: 1.0, 13: 1.0,
      14: 1.0, 15: 1.0, 16: 1.0, 17: 1.1, 18: 1.3, 19: 1.4, 20: 1.3,
      21: 1.2, 22: 1.0, 23: 0.9,
    };

    return hourMultipliers[factors.hourOfDay] || 1.0;
  }

  private calculatePeakMultiplier(factors: TimeBasedPricingFactors): number {
    if (factors.isPeakHour) {
      const peakHour = this.peakSchedule.peakHours.find(peak => 
        factors.hourOfDay >= peak.start && 
        (factors.hourOfDay < peak.end || peak.end < peak.start)
      );
      return peakHour?.multiplier || 1.3;
    }
    
    if (factors.isOffPeakHour) {
      const offPeakHour = this.peakSchedule.offPeakHours.find(offPeak => 
        factors.hourOfDay >= offPeak.start && 
        (factors.hourOfDay < offPeak.end || offPeak.end < offPeak.start)
      );
      return offPeakHour?.multiplier || 0.9;
    }
    
    return 1.0;
  }

  private calculateSeasonalMultiplier(factors: TimeBasedPricingFactors): number {
    const seasonal = this.peakSchedule.seasonalSchedule.find(s => s.season === factors.season);
    return seasonal?.multiplier || 1.0;
  }

  private calculateWeekendMultiplier(factors: TimeBasedPricingFactors): number {
    if (!factors.isWeekend) return 1.0;
    
    const weekend = this.peakSchedule.weekendSchedule.find(w => w.day === factors.dayOfWeek);
    return weekend?.multiplier || 0.9;
  }

  private calculateHolidayMultiplier(factors: TimeBasedPricingFactors): number {
    if (!factors.isHoliday) return 1.0;
    
    // Check if specific date has holiday multiplier
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    
    const holiday = this.peakSchedule.holidaySchedule.find(h => 
      h.date.getTime() === date.getTime()
    );
    
    return holiday?.multiplier || 0.85;
  }

  private async calculateWeatherMultiplier(
    factors: TimeBasedPricingFactors,
    location: string,
    date: Date,
  ): Promise<number> {
    // Simulate weather impact (in real implementation, would call weather API)
    const baseWeatherMultiplier = 1.0;
    const weatherVariation = (Math.random() - 0.5) * factors.weatherImpact * 0.2;
    
    return Math.max(0.8, Math.min(1.2, baseWeatherMultiplier + weatherVariation));
  }

  private calculateDemandPatternMultiplier(factors: TimeBasedPricingFactors): number {
    const patternMultipliers = {
      morning_peak: 1.2,
      evening_peak: 1.3,
      base_load: 1.0,
      minimum_load: 0.8,
    };

    return patternMultipliers[factors.demandPattern] || 1.0;
  }

  private async calculateTimeBasedConfidence(
    factors: TimeBasedPricingFactors,
    location: string,
    energyType: string,
  ): Promise<number> {
    let confidence = 70; // Base confidence

    // More predictable patterns have higher confidence
    if (factors.demandPattern === 'base_load') confidence += 10;
    if (factors.demandPattern === 'minimum_load') confidence += 5;

    // Weekday patterns are more predictable
    if (!factors.isWeekend) confidence += 5;

    // Non-holiday periods are more predictable
    if (!factors.isHoliday) confidence += 5;

    // Get historical data for this time pattern
    const patternKey = `${factors.hourOfDay}-${factors.dayOfWeek}-${factors.season}`;
    const historicalData = await this.getHistoricalDataForPattern(location, energyType, patternKey);
    
    if (historicalData.length > 10) confidence += 10;
    if (historicalData.length > 50) confidence += 10;

    return Math.min(95, confidence);
  }

  private async getHistoricalDataForPattern(
    location: string,
    energyType: string,
    patternKey: string,
  ): Promise<PriceHistory[]> {
    return this.priceHistoryRepository.find({
      where: { location, energyType },
      order: { timestamp: 'DESC' },
      take: 100,
    });
  }

  async generateTimeBasedPricingForecast(
    basePrice: number,
    startDate: Date,
    hoursAhead: number,
    location: string,
    energyType: string,
  ): Promise<TimeBasedPriceAdjustment[]> {
    const forecasts: TimeBasedPriceAdjustment[] = [];
    
    for (let hour = 0; hour < hoursAhead; hour++) {
      const timestamp = startDate.getTime() + (hour * 60 * 60 * 1000);
      const adjustment = await this.calculateTimeBasedPriceAdjustment(
        basePrice,
        timestamp,
        location,
        energyType,
      );
      
      forecasts.push(adjustment);
    }

    return forecasts;
  }

  async optimizePeakSchedule(location: string, energyType: string): Promise<PeakPricingSchedule> {
    // Analyze historical data to optimize peak hours
    const historicalData = await this.priceHistoryRepository.find({
      where: { location, energyType },
      order: { timestamp: 'DESC' },
      take: 1000,
    });

    if (historicalData.length < 100) {
      this.logger.warn('Insufficient data for peak schedule optimization');
      return this.peakSchedule;
    }

    // Analyze hourly patterns
    const hourlyAnalysis = this.analyzeHourlyPatterns(historicalData);
    
    // Identify optimal peak hours
    const optimizedPeaks = this.identifyOptimalPeakHours(hourlyAnalysis);
    
    // Update schedule
    this.peakSchedule.peakHours = optimizedPeaks;
    
    this.logger.log(`Optimized peak schedule for ${location} - ${energyType}`);
    return this.peakSchedule;
  }

  private analyzeHourlyPatterns(data: PriceHistory[]): Array<{ hour: number; avgPrice: number; volume: number }> {
    const hourlyData = new Map<number, { prices: number[]; volumes: number[] }>();
    
    for (const record of data) {
      const hour = record.timestamp.getHours();
      
      if (!hourlyData.has(hour)) {
        hourlyData.set(hour, { prices: [], volumes: [] });
      }
      
      const hourData = hourlyData.get(hour)!;
      hourData.prices.push(record.finalPrice);
      hourData.volumes.push(record.supply + record.demand);
    }
    
    const analysis = [];
    for (const [hour, data] of hourlyData.entries()) {
      const avgPrice = data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length;
      const volume = data.volumes.reduce((sum, vol) => sum + vol, 0) / data.volumes.length;
      
      analysis.push({ hour, avgPrice, volume });
    }
    
    return analysis.sort((a, b) => a.hour - b.hour);
  }

  private identifyOptimalPeakHours(
    hourlyAnalysis: Array<{ hour: number; avgPrice: number; volume: number }>,
  ): Array<{ start: number; end: number; multiplier: number }> {
    const avgPrice = hourlyAnalysis.reduce((sum, h) => sum + h.avgPrice, 0) / hourlyAnalysis.length;
    const avgVolume = hourlyAnalysis.reduce((sum, h) => sum + h.volume, 0) / hourlyAnalysis.length;
    
    // Identify hours with significantly higher prices and volumes
    const peakHours = hourlyAnalysis.filter(h => 
      h.avgPrice > avgPrice * 1.1 && h.volume > avgVolume * 1.1
    );
    
    // Group consecutive peak hours
    const peakGroups = this.groupConsecutiveHours(peakHours);
    
    // Convert to schedule format
    return peakGroups.map(group => ({
      start: group[0],
      end: group[group.length - 1] + 1,
      multiplier: 1.3 + (group.length * 0.05), // Longer peaks get higher multipliers
    }));
  }

  private groupConsecutiveHours(peakHours: Array<{ hour: number; avgPrice: number; volume: number }>): number[][] {
    if (peakHours.length === 0) return [];
    
    const groups: number[][] = [];
    let currentGroup: number[] = [peakHours[0].hour];
    
    for (let i = 1; i < peakHours.length; i++) {
      if (peakHours[i].hour === peakHours[i - 1].hour + 1) {
        currentGroup.push(peakHours[i].hour);
      } else {
        groups.push(currentGroup);
        currentGroup = [peakHours[i].hour];
      }
    }
    
    groups.push(currentGroup);
    return groups;
  }

  async getTimeBasedPricingInsights(
    location: string,
    energyType: string,
  ): Promise<{
    currentSchedule: PeakPricingSchedule;
    peakHourAnalysis: Array<{ hour: number; avgPrice: number; premium: number }>;
    offPeakOpportunities: Array<{ hour: number; savings: number }>;
    seasonalTrends: Array<{ season: string; avgPrice: number; trend: string }>;
    recommendations: string[];
  }> {
    const historicalData = await this.priceHistoryRepository.find({
      where: { location, energyType },
      order: { timestamp: 'DESC' },
      take: 2000,
    });

    const peakHourAnalysis = this.analyzePeakHourPremiums(historicalData);
    const offPeakOpportunities = this.identifyOffPeakOpportunities(historicalData);
    const seasonalTrends = this.analyzeSeasonalTrends(historicalData);
    const recommendations = this.generateTimeBasedRecommendations(peakHourAnalysis, offPeakOpportunities);

    return {
      currentSchedule: this.peakSchedule,
      peakHourAnalysis,
      offPeakOpportunities,
      seasonalTrends,
      recommendations,
    };
  }

  private analyzePeakHourPremiums(
    data: PriceHistory[],
  ): Array<{ hour: number; avgPrice: number; premium: number }> {
    const hourlyData = this.analyzeHourlyPatterns(data);
    const avgPrice = hourlyData.reduce((sum, h) => sum + h.avgPrice, 0) / hourlyData.length;
    
    return hourlyData.map(h => ({
      hour: h.hour,
      avgPrice: h.avgPrice,
      premium: ((h.avgPrice - avgPrice) / avgPrice) * 100,
    }));
  }

  private identifyOffPeakOpportunities(
    data: PriceHistory[],
  ): Array<{ hour: number; savings: number }> {
    const hourlyData = this.analyzeHourlyPatterns(data);
    const avgPrice = hourlyData.reduce((sum, h) => sum + h.avgPrice, 0) / hourlyData.length;
    
    return hourlyData
      .filter(h => h.avgPrice < avgPrice * 0.95) // Off-peak hours
      .map(h => ({
        hour: h.hour,
        savings: ((avgPrice - h.avgPrice) / avgPrice) * 100,
      }))
      .sort((a, b) => b.savings - a.savings);
  }

  private analyzeSeasonalTrends(
    data: PriceHistory[],
  ): Array<{ season: string; avgPrice: number; trend: string }> {
    const seasonalData = new Map<string, number[]>();
    
    for (const record of data) {
      const month = record.timestamp.getMonth();
      const season = this.getSeason(month);
      
      if (!seasonalData.has(season)) {
        seasonalData.set(season, []);
      }
      
      seasonalData.get(season)!.push(record.finalPrice);
    }
    
    const trends = [];
    for (const [season, prices] of seasonalData.entries()) {
      const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const recentPrices = prices.slice(-10);
      const olderPrices = prices.slice(0, 10);
      
      let trend = 'stable';
      if (recentPrices.length > 0 && olderPrices.length > 0) {
        const recentAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
        
        if (recentAvg > olderAvg * 1.05) trend = 'increasing';
        else if (recentAvg < olderAvg * 0.95) trend = 'decreasing';
      }
      
      trends.push({ season, avgPrice, trend });
    }
    
    return trends;
  }

  private generateTimeBasedRecommendations(
    peakAnalysis: Array<{ hour: number; avgPrice: number; premium: number }>,
    offPeakOpportunities: Array<{ hour: number; savings: number }>,
  ): string[] {
    const recommendations: string[] = [];
    
    // Peak hour recommendations
    const highestPremium = peakAnalysis.reduce((max, current) => 
      current.premium > max.premium ? current : max
    );
    
    if (highestPremium.premium > 20) {
      recommendations.push(`Consider demand response programs during ${highestPremium.hour}:00 to reduce peak loads`);
    }
    
    // Off-peak recommendations
    if (offPeakOpportunities.length > 0) {
      const bestOpportunity = offPeakOpportunities[0];
      recommendations.push(`Shift flexible loads to ${bestOpportunity.hour}:00 for ${bestOpportunity.savings.toFixed(1)}% savings`);
    }
    
    // General recommendations
    recommendations.push('Implement time-of-use pricing to incentivize load shifting');
    recommendations.push('Consider energy storage solutions to arbitrage price differences');
    
    return recommendations;
  }

  updatePeakSchedule(updates: Partial<PeakPricingSchedule>): void {
    this.peakSchedule = { ...this.peakSchedule, ...updates };
    this.logger.log('Updated peak pricing schedule');
  }

  getPeakSchedule(): PeakPricingSchedule {
    return this.peakSchedule;
  }

  addHoliday(date: Date, multiplier: number): void {
    this.peakSchedule.holidaySchedule.push({ date, multiplier });
    this.logger.log(`Added holiday pricing for ${date.toDateString()}`);
  }

  removeHoliday(date: Date): void {
    this.peakSchedule.holidaySchedule = this.peakSchedule.holidaySchedule.filter(
      holiday => holiday.date.getTime() !== date.getTime()
    );
    this.logger.log(`Removed holiday pricing for ${date.toDateString()}`);
  }
}

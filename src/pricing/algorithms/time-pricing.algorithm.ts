import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TimePricingAlgorithm {
  private readonly logger = new Logger(TimePricingAlgorithm.name);

  calculateTimeMultiplier(timestamp: number): number {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    const hourlyMultiplier = this.calculateHourlyMultiplier(hour);
    const dailyMultiplier = this.calculateDailyMultiplier(dayOfWeek);
    const seasonalMultiplier = this.calculateSeasonalMultiplier(date);

    const finalMultiplier =
      hourlyMultiplier * dailyMultiplier * seasonalMultiplier;

    return Math.round(finalMultiplier * 100) / 100;
  }

  private calculateHourlyMultiplier(hour: number): number {
    if (hour >= 6 && hour < 9) {
      return 1.4;
    } else if (hour >= 9 && hour < 12) {
      return 1.2;
    } else if (hour >= 12 && hour < 15) {
      return 1.3;
    } else if (hour >= 15 && hour < 18) {
      return 1.5;
    } else if (hour >= 18 && hour < 22) {
      return 1.3;
    } else if (hour >= 22 || hour < 6) {
      return 0.7;
    }

    return 1.0;
  }

  private calculateDailyMultiplier(dayOfWeek: number): number {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.9;
    } else if (dayOfWeek === 1) {
      return 1.1;
    } else if (dayOfWeek === 5) {
      return 1.05;
    }

    return 1.0;
  }

  private calculateSeasonalMultiplier(date: Date): number {
    const month = date.getMonth();
    const day = date.getDate();

    if (month === 11 && day >= 20) {
      return 1.2;
    } else if (month === 0 && day <= 5) {
      return 1.15;
    } else if (month === 6 || month === 7) {
      return 1.1;
    } else if (month === 0 || month === 1 || month === 2) {
      return 1.05;
    } else if (month === 4 || month === 5 || month === 9 || month === 10) {
      return 0.95;
    }

    return 1.0;
  }

  isPeakHour(timestamp: number): boolean {
    const date = new Date(timestamp);
    const hour = date.getHours();
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }

    return (hour >= 7 && hour < 10) || (hour >= 17 && hour < 20);
  }

  isOffPeakHour(timestamp: number): boolean {
    const date = new Date(timestamp);
    const hour = date.getHours();

    return hour >= 22 || hour < 6;
  }

  calculateTimeBasedDemandForecast(
    timestamp: number,
    baseDemand: number,
  ): number {
    const timeMultiplier = this.calculateTimeMultiplier(timestamp);
    const seasonalAdjustment = this.getSeasonalDemandAdjustment(timestamp);

    return baseDemand * timeMultiplier * seasonalAdjustment;
  }

  private getSeasonalDemandAdjustment(timestamp: number): number {
    const date = new Date(timestamp);
    const month = date.getMonth();

    const seasonalFactors = {
      0: 1.1,
      1: 1.05,
      2: 0.95,
      3: 0.9,
      4: 0.85,
      5: 0.9,
      6: 1.15,
      7: 1.2,
      8: 1.1,
      9: 0.95,
      10: 0.9,
      11: 1.05,
    };

    return seasonalFactors[month] || 1.0;
  }

  getPeakHoursForDay(timestamp: number): { start: number; end: number }[] {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return [
        { start: 8, end: 11 },
        { start: 17, end: 20 },
      ];
    }

    return [
      { start: 6, end: 9 },
      { start: 17, end: 20 },
    ];
  }

  calculateDurationBasedMultiplier(
    startTimestamp: number,
    endTimestamp: number,
  ): number {
    const duration = endTimestamp - startTimestamp;
    const hours = duration / (1000 * 60 * 60);

    if (hours <= 1) return 1.2;
    if (hours <= 4) return 1.1;
    if (hours <= 8) return 1.0;
    if (hours <= 24) return 0.95;
    return 0.9;
  }
}

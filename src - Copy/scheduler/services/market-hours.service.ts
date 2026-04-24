import { Injectable, Logger } from '@nestjs/common';

export interface MarketHours {
  open: string; // HH:MM format
  close: string; // HH:MM format
  timezone: string;
  weekdays: number[]; // 0 = Sunday, 6 = Saturday
  holidays: string[]; // ISO date strings
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen: Date;
  nextClose: Date;
  currentSession: 'pre_market' | 'open' | 'after_hours' | 'closed';
  timeUntilOpen: number; // minutes
  timeUntilClose: number; // minutes
  timeZone: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'market_holiday' | 'early_close';
  earlyCloseTime?: string;
}

@Injectable()
export class MarketHoursService {
  private readonly logger = new Logger(MarketHoursService.name);

  private readonly marketHours: Map<string, MarketHours> = new Map([
    [
      'US',
      {
        open: '09:30',
        close: '16:00',
        timezone: 'America/New_York',
        weekdays: [1, 2, 3, 4, 5], // Monday-Friday
        holidays: [
          '2024-01-01', // New Year's Day
          '2024-01-15', // Martin Luther King Jr. Day
          '2024-02-19', // Presidents' Day
          '2024-04-15', // Good Friday
          '2024-05-27', // Memorial Day
          '2024-07-04', // Independence Day
          '2024-09-02', // Labor Day
          '2024-11-28', // Thanksgiving Day
          '2024-12-25', // Christmas Day
        ],
      },
    ],
    [
      'EU',
      {
        open: '09:00',
        close: '17:30',
        timezone: 'Europe/London',
        weekdays: [1, 2, 3, 4, 5],
        holidays: [
          '2024-01-01', // New Year's Day
          '2024-04-01', // Easter Monday
          '2024-05-01', // Labor Day
          '2024-12-25', // Christmas Day
          '2024-12-26', // Boxing Day
        ],
      },
    ],
    [
      'ASIA',
      {
        open: '09:00',
        close: '15:00',
        timezone: 'Asia/Tokyo',
        weekdays: [1, 2, 3, 4, 5],
        holidays: [
          '2024-01-01', // New Year's Day
          '2024-01-02', // New Year's Holiday
          '2024-02-11', // National Foundation Day
          '2024-02-12', // Emperor's Birthday
          '2024-03-20', // Spring Equinox
          '2024-04-29', // Showa Day
          '2024-05-03', // Constitution Memorial Day
          '2024-05-04', // Greenery Day
          '2024-05-05', // Children's Day
          '2024-08-11', // Mountain Day
          '2024-09-16', // Respect for the Aged Day
          '2024-09-22', // Autumn Equinox
          '2024-10-14', // Sports Day
          '2024-11-03', // Culture Day
          '2024-11-23', // Labor Thanksgiving Day
        ],
      },
    ],
  ]);

  async getMarketStatus(market: string = 'US'): Promise<MarketStatus> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    const now = new Date();
    const marketTime = this.convertToMarketTime(now, marketConfig.timezone);

    const isOpen = this.isMarketOpen(marketTime, marketConfig);
    const nextOpen = this.getNextMarketOpen(marketTime, marketConfig);
    const nextClose = this.getNextMarketClose(marketTime, marketConfig);

    const currentSession = this.getCurrentSession(marketTime, marketConfig);
    const timeUntilOpen = this.getMinutesUntil(nextOpen, marketTime);
    const timeUntilClose = this.getMinutesUntil(nextClose, marketTime);

    return {
      isOpen,
      nextOpen,
      nextClose,
      currentSession,
      timeUntilOpen,
      timeUntilClose,
      timeZone: marketConfig.timezone,
    };
  }

  async isMarketOpen(market: string = 'US'): Promise<boolean> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    const now = new Date();
    const marketTime = this.convertToMarketTime(now, marketConfig.timezone);

    return this.isMarketOpen(marketTime, marketConfig);
  }

  async getNextMarketOpen(market: string = 'US'): Promise<Date> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    const now = new Date();
    const marketTime = this.convertToMarketTime(now, marketConfig.timezone);

    return this.getNextMarketOpen(marketTime, marketConfig);
  }

  async getNextMarketClose(market: string = 'US'): Promise<Date> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    const now = new Date();
    const marketTime = this.convertToMarketTime(now, marketConfig.timezone);

    return this.getNextMarketClose(marketTime, marketConfig);
  }

  async getMarketHours(market: string = 'US'): Promise<MarketHours> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    return marketConfig;
  }

  async getAllMarketStatuses(): Promise<Record<string, MarketStatus>> {
    const statuses: Record<string, MarketStatus> = {};

    for (const market of this.marketHours.keys()) {
      try {
        statuses[market] = await this.getMarketStatus(market);
      } catch (error) {
        this.logger.error(`Error getting status for market ${market}`, error);
      }
    }

    return statuses;
  }

  async isGloballyOpen(): Promise<boolean> {
    const statuses = await this.getAllMarketStatuses();
    return Object.values(statuses).some((status) => status.isOpen);
  }

  async getActiveMarkets(): Promise<string[]> {
    const statuses = await this.getAllMarketStatuses();
    return Object.entries(statuses)
      .filter(([_, status]) => status.isOpen)
      .map(([market, _]) => market);
  }

  async validateExecutionTime(
    market: string,
    executionTime: Date,
  ): Promise<{
    valid: boolean;
    reason?: string;
    suggestedTime?: Date;
  }> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      return { valid: false, reason: `Market ${market} not supported` };
    }

    const marketTime = this.convertToMarketTime(
      executionTime,
      marketConfig.timezone,
    );

    if (!this.isWeekday(marketTime, marketConfig.weekdays)) {
      const nextOpen = this.getNextMarketOpen(marketTime, marketConfig);
      return {
        valid: false,
        reason: 'Execution time is on a weekend',
        suggestedTime: nextOpen,
      };
    }

    if (this.isHoliday(marketTime, marketConfig.holidays)) {
      const nextOpen = this.getNextMarketOpen(marketTime, marketConfig);
      return {
        valid: false,
        reason: 'Execution time is on a market holiday',
        suggestedTime: nextOpen,
      };
    }

    const [openHour, openMinute] = marketConfig.open.split(':').map(Number);
    const [closeHour, closeMinute] = marketConfig.close.split(':').map(Number);
    const executionHour = marketTime.getHours();
    const executionMinute = marketTime.getMinutes();

    const executionMinutes = executionHour * 60 + executionMinute;
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (executionMinutes < openMinutes) {
      const suggestedTime = new Date(marketTime);
      suggestedTime.setHours(openHour, openMinute, 0, 0);
      return {
        valid: false,
        reason: 'Execution time is before market open',
        suggestedTime,
      };
    }

    if (executionMinutes > closeMinutes) {
      const nextOpen = this.getNextMarketOpen(marketTime, marketConfig);
      return {
        valid: false,
        reason: 'Execution time is after market close',
        suggestedTime: nextOpen,
      };
    }

    return { valid: true };
  }

  async adjustForMarketHours(
    market: string,
    executionTime: Date,
  ): Promise<Date> {
    const validation = await this.validateExecutionTime(market, executionTime);

    if (validation.valid) {
      return executionTime;
    }

    return validation.suggestedTime || executionTime;
  }

  private convertToMarketTime(date: Date, timeZone: string): Date {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };

      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(date);

      const year = parseInt(
        parts.find((part) => part.type === 'year')?.value || '0',
      );
      const month =
        parseInt(parts.find((part) => part.type === 'month')?.value || '0') - 1;
      const day = parseInt(
        parts.find((part) => part.type === 'day')?.value || '0',
      );
      const hour = parseInt(
        parts.find((part) => part.type === 'hour')?.value || '0',
      );
      const minute = parseInt(
        parts.find((part) => part.type === 'minute')?.value || '0',
      );
      const second = parseInt(
        parts.find((part) => part.type === 'second')?.value || '0',
      );

      return new Date(year, month, day, hour, minute, second);
    } catch (error) {
      this.logger.error(`Error converting time to timezone ${timeZone}`, error);
      return date;
    }
  }

  private isMarketOpen(marketTime: Date, config: MarketHours): boolean {
    if (!this.isWeekday(marketTime, config.weekdays)) {
      return false;
    }

    if (this.isHoliday(marketTime, config.holidays)) {
      return false;
    }

    const [openHour, openMinute] = config.open.split(':').map(Number);
    const [closeHour, closeMinute] = config.close.split(':').map(Number);

    const currentMinutes = marketTime.getHours() * 60 + marketTime.getMinutes();
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  }

  private isWeekday(date: Date, weekdays: number[]): boolean {
    const day = date.getDay();
    return weekdays.includes(day);
  }

  private isHoliday(date: Date, holidays: string[]): boolean {
    const dateString = date.toISOString().split('T')[0];
    return holidays.includes(dateString);
  }

  private getCurrentSession(
    marketTime: Date,
    config: MarketHours,
  ): 'pre_market' | 'open' | 'after_hours' | 'closed' {
    if (
      !this.isWeekday(marketTime, config.weekdays) ||
      this.isHoliday(marketTime, config.holidays)
    ) {
      return 'closed';
    }

    const [openHour, openMinute] = config.open.split(':').map(Number);
    const [closeHour, closeMinute] = config.close.split(':').map(Number);

    const currentMinutes = marketTime.getHours() * 60 + marketTime.getMinutes();
    const openMinutes = openHour * 60 + openMinute;
    const closeMinutes = closeHour * 60 + closeMinute;

    if (currentMinutes < openMinutes - 30) {
      return 'pre_market';
    } else if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return 'open';
    } else if (
      currentMinutes >= closeMinutes &&
      currentMinutes < closeMinutes + 120
    ) {
      return 'after_hours';
    } else {
      return 'closed';
    }
  }

  private getNextMarketOpen(marketTime: Date, config: MarketHours): Date {
    const nextOpen = new Date(marketTime);

    // Move to next day
    nextOpen.setDate(nextOpen.getDate() + 1);

    // Find next valid weekday
    while (
      !this.isWeekday(nextOpen, config.weekdays) ||
      this.isHoliday(nextOpen, config.holidays)
    ) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }

    // Set market open time
    const [openHour, openMinute] = config.open.split(':').map(Number);
    nextOpen.setHours(openHour, openMinute, 0, 0);

    return nextOpen;
  }

  private getNextMarketClose(marketTime: Date, config: MarketHours): Date {
    const [closeHour, closeMinute] = config.close.split(':').map(Number);

    let nextClose = new Date(marketTime);
    nextClose.setHours(closeHour, closeMinute, 0, 0);

    // If today's close time has passed, move to next trading day
    if (
      nextClose <= marketTime ||
      !this.isWeekday(nextClose, config.weekdays) ||
      this.isHoliday(nextClose, config.holidays)
    ) {
      nextClose = this.getNextMarketOpen(marketTime, config);
      nextClose.setHours(closeHour, closeMinute, 0, 0);
    }

    return nextClose;
  }

  private getMinutesUntil(targetDate: Date, currentTime: Date): number {
    return Math.floor(
      (targetDate.getTime() - currentTime.getTime()) / (1000 * 60),
    );
  }

  async addHoliday(market: string, holiday: Holiday): Promise<void> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    if (!marketConfig.holidays.includes(holiday.date)) {
      marketConfig.holidays.push(holiday.date);
      this.logger.log(
        `Added holiday ${holiday.name} (${holiday.date}) to market ${market}`,
      );
    }
  }

  async removeHoliday(market: string, date: string): Promise<void> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    const index = marketConfig.holidays.indexOf(date);
    if (index > -1) {
      marketConfig.holidays.splice(index, 1);
      this.logger.log(`Removed holiday ${date} from market ${market}`);
    }
  }

  async getHolidays(market: string, year?: number): Promise<string[]> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    if (year) {
      return marketConfig.holidays.filter((date) =>
        date.startsWith(year.toString()),
      );
    }

    return marketConfig.holidays;
  }

  async updateMarketHours(
    market: string,
    hours: Partial<MarketHours>,
  ): Promise<void> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    Object.assign(marketConfig, hours);
    this.logger.log(`Updated market hours for ${market}`);
  }

  async getTradingCalendar(
    market: string,
    year: number,
  ): Promise<{
    holidays: Holiday[];
    earlyCloses: Holiday[];
    regularSchedule: MarketHours;
  }> {
    const marketConfig = this.marketHours.get(market);
    if (!marketConfig) {
      throw new Error(`Market ${market} not supported`);
    }

    const holidays: Holiday[] = [];
    const earlyCloses: Holiday[] = [];

    for (const holidayDate of marketConfig.holidays) {
      if (holidayDate.startsWith(year.toString())) {
        holidays.push({
          date: holidayDate,
          name: this.getHolidayName(holidayDate),
          type: 'market_holiday',
        });
      }
    }

    return {
      holidays,
      earlyCloses,
      regularSchedule: marketConfig,
    };
  }

  private getHolidayName(date: string): string {
    const holidayNames: Record<string, string> = {
      '2024-01-01': "New Year's Day",
      '2024-01-15': 'Martin Luther King Jr. Day',
      '2024-02-19': "Presidents' Day",
      '2024-04-15': 'Good Friday',
      '2024-05-27': 'Memorial Day',
      '2024-07-04': 'Independence Day',
      '2024-09-02': 'Labor Day',
      '2024-11-28': 'Thanksgiving Day',
      '2024-12-25': 'Christmas Day',
    };

    return holidayNames[date] || 'Holiday';
  }
}

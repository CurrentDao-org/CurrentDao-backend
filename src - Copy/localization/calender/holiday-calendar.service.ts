import { Injectable } from '@nestjs/common';

interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  country: string;
}

@Injectable()
export class HolidayCalendarService {
  // Minimal built-in holiday data — extend or connect to an external API in production
  private readonly holidays: Holiday[] = [
    { date: '2025-01-01', name: "New Year's Day", country: 'US' },
    { date: '2025-07-04', name: 'Independence Day', country: 'US' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'US' },
    { date: '2025-01-01', name: "New Year's Day", country: 'NG' },
    { date: '2025-10-01', name: 'Independence Day', country: 'NG' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'NG' },
    { date: '2025-01-01', name: "New Year's Day", country: 'GB' },
    { date: '2025-12-25', name: 'Christmas Day', country: 'GB' },
  ];

  getHolidays(country: string, year: number): Holiday[] {
    return this.holidays.filter(
      h => h.country === country.toUpperCase() && h.date.startsWith(String(year)),
    );
  }

  isHoliday(date: Date, country: string): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return this.holidays.some(h => h.date === dateStr && h.country === country.toUpperCase());
  }

  isBusinessDay(date: Date, country: string): boolean {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // Weekend
    return !this.isHoliday(date, country);
  }
}
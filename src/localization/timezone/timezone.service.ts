import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TimezoneService {
  private readonly logger = new Logger(TimezoneService.name);

  convert(date: Date, fromTz: string, toTz: string): Record<string, any> {
    // Use Intl API — no external dependency needed
    const fromFormatter = new Intl.DateTimeFormat('en-US', { timeZone: fromTz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const toFormatter = new Intl.DateTimeFormat('en-US', { timeZone: toTz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      original: { datetime: fromFormatter.format(date), timezone: fromTz },
      converted: { datetime: toFormatter.format(date), timezone: toTz },
      utc: date.toISOString(),
    };
  }

  detect(offsetMinutes: number): string {
    // Basic offset-to-timezone mapping (extend as needed)
    const map: Record<number, string> = {
      0: 'UTC', 60: 'Europe/London', 120: 'Europe/Paris',
      330: 'Asia/Kolkata', 480: 'Asia/Shanghai', 540: 'Asia/Tokyo',
      [-300]: 'America/New_York', [-360]: 'America/Chicago',
      [-420]: 'America/Denver', [-480]: 'America/Los_Angeles',
    };
    return map[offsetMinutes] || 'UTC';
  }

  getOffset(timezone: string): number {
    const now = new Date();
    const utcMs = now.getTime();
    const tzMs = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
    return Math.round((tzMs - utcMs) / 60000);
  }
}
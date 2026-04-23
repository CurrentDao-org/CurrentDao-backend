import { Injectable } from '@nestjs/common';
import { TimezoneService } from './timezone/timezone.service';
import { LocalizedFormattingService } from './formatting/localized-formatting.service';
import { GlobalSchedulerService } from './scheduling/global-scheduler.service';
import { HolidayCalendarService } from './calendar/holiday-calendar.service';

@Injectable()
export class LocalizationService {
  constructor(
    private readonly timezone: TimezoneService,
    private readonly formatting: LocalizedFormattingService,
    private readonly scheduler: GlobalSchedulerService,
    private readonly calendar: HolidayCalendarService,
  ) {}

  convertTime(datetime: string, from: string, to: string) {
    return this.timezone.convert(new Date(datetime), from, to);
  }

  formatDate(date: string, locale: string) {
    return this.formatting.formatDate(new Date(date), locale);
  }

  scheduleTask(task: { datetime: string; timezone: string; task: string }) {
    return this.scheduler.schedule(task);
  }

  getHolidays(country: string, year: number) {
    return this.calendar.getHolidays(country, year);
  }
}
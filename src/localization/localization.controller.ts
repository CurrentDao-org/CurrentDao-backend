import { Module } from '@nestjs/common';
import { LocalizationController } from './localization.controller';
import { LocalizationService } from './localization.service';
import { TimezoneService } from './timezone/timezone.service';
import { LocalizedFormattingService } from './formatting/localized-formatting.service';
import { CulturalAdaptationService } from './cultural/cultural-adaptation.service';
import { GlobalSchedulerService } from './scheduling/global-scheduler.service';
import { HolidayCalendarService } from './calendar/holiday-calendar.service';

@Module({
  controllers: [LocalizationController],
  providers: [
    LocalizationService,
    TimezoneService,
    LocalizedFormattingService,
    CulturalAdaptationService,
    GlobalSchedulerService,
    HolidayCalendarService,
  ],
  exports: [LocalizationService, TimezoneService, HolidayCalendarService],
})
export class LocalizationModule {}
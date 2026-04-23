import { Injectable } from '@nestjs/common';

interface CulturalProfile {
  locale: string;
  dateFormat: string;
  firstDayOfWeek: 0 | 1 | 6; // 0=Sun, 1=Mon, 6=Sat
  timeFormat: '12h' | '24h';
  currencyPosition: 'before' | 'after';
  decimalSeparator: '.' | ',';
}

@Injectable()
export class CulturalAdaptationService {
  private readonly profiles: Record<string, CulturalProfile> = {
    'en-US': { locale: 'en-US', dateFormat: 'MM/DD/YYYY', firstDayOfWeek: 0, timeFormat: '12h', currencyPosition: 'before', decimalSeparator: '.' },
    'de-DE': { locale: 'de-DE', dateFormat: 'DD.MM.YYYY', firstDayOfWeek: 1, timeFormat: '24h', currencyPosition: 'after', decimalSeparator: ',' },
    'ja-JP': { locale: 'ja-JP', dateFormat: 'YYYY/MM/DD', firstDayOfWeek: 0, timeFormat: '24h', currencyPosition: 'before', decimalSeparator: '.' },
    'ar-SA': { locale: 'ar-SA', dateFormat: 'DD/MM/YYYY', firstDayOfWeek: 6, timeFormat: '12h', currencyPosition: 'after', decimalSeparator: '.' },
  };

  getProfile(locale: string): CulturalProfile {
    return this.profiles[locale] || this.profiles['en-US'];
  }

  getSupportedLocales(): string[] {
    return Object.keys(this.profiles);
  }
}
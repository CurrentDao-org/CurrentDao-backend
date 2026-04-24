import { Injectable } from '@nestjs/common';

@Injectable()
export class LocalizedFormattingService {
  formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  formatCurrency(amount: number, locale: string, currency: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  }

  formatNumber(value: number, locale: string): string {
    return new Intl.NumberFormat(locale).format(value);
  }

  getRelativeTime(date: Date, locale: string): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffMs = date.getTime() - Date.now();
    const diffDays = Math.round(diffMs / 86400000);
    return rtf.format(diffDays, 'day');
  }
}
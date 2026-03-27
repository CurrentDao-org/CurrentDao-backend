export interface MarketHours {
    open: string;
    close: string;
    timezone: string;
    weekdays: number[];
    holidays: string[];
}
export interface MarketStatus {
    isOpen: boolean;
    nextOpen: Date;
    nextClose: Date;
    currentSession: 'pre_market' | 'open' | 'after_hours' | 'closed';
    timeUntilOpen: number;
    timeUntilClose: number;
    timeZone: string;
}
export interface Holiday {
    date: string;
    name: string;
    type: 'market_holiday' | 'early_close';
    earlyCloseTime?: string;
}
export declare class MarketHoursService {
    private readonly logger;
    private readonly marketHours;
    getMarketStatus(market?: string): Promise<MarketStatus>;
    getMarketHours(market?: string): Promise<MarketHours>;
    getAllMarketStatuses(): Promise<Record<string, MarketStatus>>;
    isGloballyOpen(): Promise<boolean>;
    getActiveMarkets(): Promise<string[]>;
    validateExecutionTime(market: string, executionTime: Date): Promise<{
        valid: boolean;
        reason?: string;
        suggestedTime?: Date;
    }>;
    adjustForMarketHours(market: string, executionTime: Date): Promise<Date>;
    private convertToMarketTime;
    private isWeekday;
    private isHoliday;
    private getCurrentSession;
    private getMinutesUntil;
    addHoliday(market: string, holiday: Holiday): Promise<void>;
    removeHoliday(market: string, date: string): Promise<void>;
    getHolidays(market: string, year?: number): Promise<string[]>;
    updateMarketHours(market: string, hours: Partial<MarketHours>): Promise<void>;
    getTradingCalendar(market: string, year: number): Promise<{
        holidays: Holiday[];
        earlyCloses: Holiday[];
        regularSchedule: MarketHours;
    }>;
    private getHolidayName;
}

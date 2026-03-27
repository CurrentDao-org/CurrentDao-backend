"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MarketHoursService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketHoursService = void 0;
const common_1 = require("@nestjs/common");
let MarketHoursService = MarketHoursService_1 = class MarketHoursService {
    constructor() {
        this.logger = new common_1.Logger(MarketHoursService_1.name);
        this.marketHours = new Map([
            ['US', {
                    open: '09:30',
                    close: '16:00',
                    timezone: 'America/New_York',
                    weekdays: [1, 2, 3, 4, 5],
                    holidays: [
                        '2024-01-01',
                        '2024-01-15',
                        '2024-02-19',
                        '2024-04-15',
                        '2024-05-27',
                        '2024-07-04',
                        '2024-09-02',
                        '2024-11-28',
                        '2024-12-25',
                    ],
                }],
            ['EU', {
                    open: '09:00',
                    close: '17:30',
                    timezone: 'Europe/London',
                    weekdays: [1, 2, 3, 4, 5],
                    holidays: [
                        '2024-01-01',
                        '2024-04-01',
                        '2024-05-01',
                        '2024-12-25',
                        '2024-12-26',
                    ],
                }],
            ['ASIA', {
                    open: '09:00',
                    close: '15:00',
                    timezone: 'Asia/Tokyo',
                    weekdays: [1, 2, 3, 4, 5],
                    holidays: [
                        '2024-01-01',
                        '2024-01-02',
                        '2024-02-11',
                        '2024-02-12',
                        '2024-03-20',
                        '2024-04-29',
                        '2024-05-03',
                        '2024-05-04',
                        '2024-05-05',
                        '2024-08-11',
                        '2024-09-16',
                        '2024-09-22',
                        '2024-10-14',
                        '2024-11-03',
                        '2024-11-23',
                    ],
                }],
        ]);
    }
    async getMarketStatus(market = 'US') {
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
    async isMarketOpen(market = 'US') {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        const now = new Date();
        const marketTime = this.convertToMarketTime(now, marketConfig.timezone);
        return this.isMarketOpen(marketTime, marketConfig);
    }
    async getNextMarketOpen(market = 'US') {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        const now = new Date();
        const marketTime = this.convertToMarketTime(now, marketConfig.timezone);
        return this.getNextMarketOpen(marketTime, marketConfig);
    }
    async getNextMarketClose(market = 'US') {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        const now = new Date();
        const marketTime = this.convertToMarketTime(now, marketConfig.timezone);
        return this.getNextMarketClose(marketTime, marketConfig);
    }
    async getMarketHours(market = 'US') {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        return marketConfig;
    }
    async getAllMarketStatuses() {
        const statuses = {};
        for (const market of this.marketHours.keys()) {
            try {
                statuses[market] = await this.getMarketStatus(market);
            }
            catch (error) {
                this.logger.error(`Error getting status for market ${market}`, error);
            }
        }
        return statuses;
    }
    async isGloballyOpen() {
        const statuses = await this.getAllMarketStatuses();
        return Object.values(statuses).some(status => status.isOpen);
    }
    async getActiveMarkets() {
        const statuses = await this.getAllMarketStatuses();
        return Object.entries(statuses)
            .filter(([_, status]) => status.isOpen)
            .map(([market, _]) => market);
    }
    async validateExecutionTime(market, executionTime) {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            return { valid: false, reason: `Market ${market} not supported` };
        }
        const marketTime = this.convertToMarketTime(executionTime, marketConfig.timezone);
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
    async adjustForMarketHours(market, executionTime) {
        const validation = await this.validateExecutionTime(market, executionTime);
        if (validation.valid) {
            return executionTime;
        }
        return validation.suggestedTime || executionTime;
    }
    convertToMarketTime(date, timeZone) {
        try {
            const options = {
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
            const year = parseInt(parts.find(part => part.type === 'year')?.value || '0');
            const month = parseInt(parts.find(part => part.type === 'month')?.value || '0') - 1;
            const day = parseInt(parts.find(part => part.type === 'day')?.value || '0');
            const hour = parseInt(parts.find(part => part.type === 'hour')?.value || '0');
            const minute = parseInt(parts.find(part => part.type === 'minute')?.value || '0');
            const second = parseInt(parts.find(part => part.type === 'second')?.value || '0');
            return new Date(year, month, day, hour, minute, second);
        }
        catch (error) {
            this.logger.error(`Error converting time to timezone ${timeZone}`, error);
            return date;
        }
    }
    isMarketOpen(marketTime, config) {
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
    isWeekday(date, weekdays) {
        const day = date.getDay();
        return weekdays.includes(day);
    }
    isHoliday(date, holidays) {
        const dateString = date.toISOString().split('T')[0];
        return holidays.includes(dateString);
    }
    getCurrentSession(marketTime, config) {
        if (!this.isWeekday(marketTime, config.weekdays) || this.isHoliday(marketTime, config.holidays)) {
            return 'closed';
        }
        const [openHour, openMinute] = config.open.split(':').map(Number);
        const [closeHour, closeMinute] = config.close.split(':').map(Number);
        const currentMinutes = marketTime.getHours() * 60 + marketTime.getMinutes();
        const openMinutes = openHour * 60 + openMinute;
        const closeMinutes = closeHour * 60 + closeMinute;
        if (currentMinutes < openMinutes - 30) {
            return 'pre_market';
        }
        else if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
            return 'open';
        }
        else if (currentMinutes >= closeMinutes && currentMinutes < closeMinutes + 120) {
            return 'after_hours';
        }
        else {
            return 'closed';
        }
    }
    getNextMarketOpen(marketTime, config) {
        let nextOpen = new Date(marketTime);
        nextOpen.setDate(nextOpen.getDate() + 1);
        while (!this.isWeekday(nextOpen, config.weekdays) || this.isHoliday(nextOpen, config.holidays)) {
            nextOpen.setDate(nextOpen.getDate() + 1);
        }
        const [openHour, openMinute] = config.open.split(':').map(Number);
        nextOpen.setHours(openHour, openMinute, 0, 0);
        return nextOpen;
    }
    getNextMarketClose(marketTime, config) {
        const [closeHour, closeMinute] = config.close.split(':').map(Number);
        let nextClose = new Date(marketTime);
        nextClose.setHours(closeHour, closeMinute, 0, 0);
        if (nextClose <= marketTime || !this.isWeekday(nextClose, config.weekdays) || this.isHoliday(nextClose, config.holidays)) {
            nextClose = this.getNextMarketOpen(marketTime, config);
            nextClose.setHours(closeHour, closeMinute, 0, 0);
        }
        return nextClose;
    }
    getMinutesUntil(targetDate, currentTime) {
        return Math.floor((targetDate.getTime() - currentTime.getTime()) / (1000 * 60));
    }
    async addHoliday(market, holiday) {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        if (!marketConfig.holidays.includes(holiday.date)) {
            marketConfig.holidays.push(holiday.date);
            this.logger.log(`Added holiday ${holiday.name} (${holiday.date}) to market ${market}`);
        }
    }
    async removeHoliday(market, date) {
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
    async getHolidays(market, year) {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        if (year) {
            return marketConfig.holidays.filter(date => date.startsWith(year.toString()));
        }
        return marketConfig.holidays;
    }
    async updateMarketHours(market, hours) {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        Object.assign(marketConfig, hours);
        this.logger.log(`Updated market hours for ${market}`);
    }
    async getTradingCalendar(market, year) {
        const marketConfig = this.marketHours.get(market);
        if (!marketConfig) {
            throw new Error(`Market ${market} not supported`);
        }
        const holidays = [];
        const earlyCloses = [];
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
    getHolidayName(date) {
        const holidayNames = {
            '2024-01-01': 'New Year\'s Day',
            '2024-01-15': 'Martin Luther King Jr. Day',
            '2024-02-19': 'Presidents\' Day',
            '2024-04-15': 'Good Friday',
            '2024-05-27': 'Memorial Day',
            '2024-07-04': 'Independence Day',
            '2024-09-02': 'Labor Day',
            '2024-11-28': 'Thanksgiving Day',
            '2024-12-25': 'Christmas Day',
        };
        return holidayNames[date] || 'Holiday';
    }
};
exports.MarketHoursService = MarketHoursService;
exports.MarketHoursService = MarketHoursService = MarketHoursService_1 = __decorate([
    (0, common_1.Injectable)()
], MarketHoursService);
//# sourceMappingURL=market-hours.service.js.map
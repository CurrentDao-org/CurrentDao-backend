import { Injectable } from '@nestjs/common';

@Injectable()
export class GlobalExchangeService {
  private readonly exchanges = new Map<string, any>();
  private readonly supportedExchanges = [
    'NYSE', 'NASDAQ', 'LSE', 'TSE', 'SSE', 'HKEX', 'SGX', 'ASX', 'BSE', 'NSE',
    'TSX', 'EURONEXT', 'SWX', 'BOURSA', 'JSE', 'BVL', 'BME', 'OMX', 'WSE', 'PX'
  ];

  constructor() {
    this.initializeExchanges();
  }

  private initializeExchanges() {
    this.exchanges.set('NYSE', {
      name: 'New York Stock Exchange',
      country: 'US',
      currency: 'USD',
      tradingHours: { open: '09:30', close: '16:00', timezone: 'EST' },
      fees: { maker: 0.0001, taker: 0.0002 },
      supportedAssets: ['stocks', 'etfs', 'bonds'],
      apiEndpoint: 'https://api.nyse.com',
      status: 'active',
    });

    this.exchanges.set('NASDAQ', {
      name: 'NASDAQ',
      country: 'US',
      currency: 'USD',
      tradingHours: { open: '09:30', close: '16:00', timezone: 'EST' },
      fees: { maker: 0.0001, taker: 0.0002 },
      supportedAssets: ['stocks', 'etfs'],
      apiEndpoint: 'https://api.nasdaq.com',
      status: 'active',
    });

    this.exchanges.set('LSE', {
      name: 'London Stock Exchange',
      country: 'UK',
      currency: 'GBP',
      tradingHours: { open: '08:00', close: '16:30', timezone: 'GMT' },
      fees: { maker: 0.0002, taker: 0.0003 },
      supportedAssets: ['stocks', 'etfs', 'bonds'],
      apiEndpoint: 'https://api.londonstockexchange.com',
      status: 'active',
    });

    this.exchanges.set('TSE', {
      name: 'Tokyo Stock Exchange',
      country: 'JP',
      currency: 'JPY',
      tradingHours: { open: '09:00', close: '15:00', timezone: 'JST' },
      fees: { maker: 0.00015, taker: 0.00025 },
      supportedAssets: ['stocks', 'etfs'],
      apiEndpoint: 'https://api.tse.or.jp',
      status: 'active',
    });

    this.exchanges.set('SSE', {
      name: 'Shanghai Stock Exchange',
      country: 'CN',
      currency: 'CNY',
      tradingHours: { open: '09:30', close: '15:00', timezone: 'CST' },
      fees: { maker: 0.0003, taker: 0.0004 },
      supportedAssets: ['stocks', 'bonds'],
      apiEndpoint: 'https://api.sse.com.cn',
      status: 'active',
    });

    this.exchanges.set('HKEX', {
      name: 'Hong Kong Stock Exchange',
      country: 'HK',
      currency: 'HKD',
      tradingHours: { open: '09:30', close: '16:00', timezone: 'HKT' },
      fees: { maker: 0.0002, taker: 0.0003 },
      supportedAssets: ['stocks', 'etfs'],
      apiEndpoint: 'https://api.hkex.com.hk',
      status: 'active',
    });

    this.exchanges.set('SGX', {
      name: 'Singapore Exchange',
      country: 'SG',
      currency: 'SGD',
      tradingHours: { open: '09:00', close: '17:00', timezone: 'SGT' },
      fees: { maker: 0.00015, taker: 0.00025 },
      supportedAssets: ['stocks', 'etfs', 'futures'],
      apiEndpoint: 'https://api.sgx.com',
      status: 'active',
    });

    this.exchanges.set('ASX', {
      name: 'Australian Securities Exchange',
      country: 'AU',
      currency: 'AUD',
      tradingHours: { open: '10:00', close: '16:00', timezone: 'AEST' },
      fees: { maker: 0.0002, taker: 0.0003 },
      supportedAssets: ['stocks', 'etfs'],
      apiEndpoint: 'https://api.asx.com.au',
      status: 'active',
    });

    this.exchanges.set('BSE', {
      name: 'Bombay Stock Exchange',
      country: 'IN',
      currency: 'INR',
      tradingHours: { open: '09:15', close: '15:30', timezone: 'IST' },
      fees: { maker: 0.0003, taker: 0.0004 },
      supportedAssets: ['stocks', 'etfs'],
      apiEndpoint: 'https://api.bseindia.com',
      status: 'active',
    });

    this.exchanges.set('NSE', {
      name: 'National Stock Exchange of India',
      country: 'IN',
      currency: 'INR',
      tradingHours: { open: '09:15', close: '15:30', timezone: 'IST' },
      fees: { maker: 0.00025, taker: 0.00035 },
      supportedAssets: ['stocks', 'etfs', 'futures'],
      apiEndpoint: 'https://api.nseindia.com',
      status: 'active',
    });
  }

  async executeTrade(exchangeId: string, tradeData: any): Promise<any> {
    const exchange = this.exchanges.get(exchangeId);
    
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    if (exchange.status !== 'active') {
      throw new Error(`Exchange ${exchangeId} is not currently active`);
    }

    // Check if asset is supported
    if (!exchange.supportedAssets.includes(tradeData.assetType)) {
      throw new Error(`Asset type ${tradeData.assetType} not supported on ${exchangeId}`);
    }

    // Check trading hours
    const isOpen = await this.isExchangeOpen(exchangeId);
    if (!isOpen) {
      throw new Error(`Exchange ${exchangeId} is currently closed`);
    }

    // Generate trade ID and execute
    const tradeId = `trade_${exchangeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate fees
    const fees = this.calculateTradingFees(tradeData.amount, tradeData.type, exchange.fees);

    // Simulate trade execution
    const execution = {
      tradeId,
      exchangeId,
      symbol: tradeData.symbol,
      amount: tradeData.amount,
      price: tradeData.price,
      type: tradeData.type,
      status: 'executed',
      executedAt: new Date(),
      fees,
      currency: exchange.currency,
      settlementDate: this.calculateSettlementDate(exchangeId),
    };

    return execution;
  }

  async getAvailableExchanges(): Promise<any[]> {
    return Array.from(this.exchanges.values()).map(exchange => ({
      id: exchange.name.replace(/\s+/g, '').toUpperCase(),
      name: exchange.name,
      country: exchange.country,
      currency: exchange.currency,
      status: exchange.status,
      supportedAssets: exchange.supportedAssets,
      tradingHours: exchange.tradingHours,
    }));
  }

  async getExchangeStatus(exchangeId: string): Promise<any> {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    return {
      id: exchangeId,
      name: exchange.name,
      status: exchange.status,
      isOpen: await this.isExchangeOpen(exchangeId),
      currentTime: new Date(),
      tradingHours: exchange.tradingHours,
    };
  }

  async getExchangeFees(exchangeId: string): Promise<any> {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange ${exchangeId} not found`);
    }

    return exchange.fees;
  }

  private async isExchangeOpen(exchangeId: string): Promise<boolean> {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) return false;

    const now = new Date();
    const exchangeTime = this.getExchangeTime(now, exchange.tradingHours.timezone);
    
    const currentTime = exchangeTime.getHours() * 60 + exchangeTime.getMinutes();
    const openTime = this.parseTime(exchange.tradingHours.open);
    const closeTime = this.parseTime(exchange.tradingHours.close);

    // Check if it's a weekday (Monday-Friday)
    const dayOfWeek = exchangeTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend

    return currentTime >= openTime && currentTime <= closeTime;
  }

  private getExchangeTime(date: Date, timezone: string): Date {
    // Simplified timezone handling - in real implementation, use proper timezone library
    const offsets: { [key: string]: number } = {
      'EST': -5,
      'GMT': 0,
      'JST': 9,
      'CST': 8,
      'HKT': 8,
      'SGT': 8,
      'AEST': 10,
      'IST': 5.5,
    };

    const offset = offsets[timezone] || 0;
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * offset));
  }

  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateTradingFees(amount: number, tradeType: string, feeStructure: any): number {
    const feeRate = tradeType === 'market' ? feeStructure.taker : feeStructure.maker;
    return amount * feeRate;
  }

  private calculateSettlementDate(exchangeId: string): Date {
    const settlementPeriods: { [key: string]: number } = {
      'NYSE': 2, // T+2
      'NASDAQ': 2,
      'LSE': 2,
      'TSE': 2,
      'SSE': 1, // T+1
      'HKEX': 2,
      'SGX': 2,
      'ASX': 2,
      'BSE': 1,
      'NSE': 1,
    };

    const days = settlementPeriods[exchangeId] || 2;
    const settlementDate = new Date();
    settlementDate.setDate(settlementDate.getDate() + days);
    
    return settlementDate;
  }
}

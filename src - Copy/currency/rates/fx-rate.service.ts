import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FxRate } from '../entities/fx-rate.entity';
import { Currency } from '../entities/currency.entity';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FxRateService implements OnModuleInit {
  private readonly logger = new Logger(FxRateService.name);
  private readonly rateCache = new Map<string, { rate: number; timestamp: Date; source: string }>();
  private readonly cacheExpiry = 300000; // 5 minutes

  constructor(
    @InjectRepository(FxRate)
    private readonly fxRateRepository: Repository<FxRate>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    private readonly httpService: HttpService,
  ) {}

  async onModuleInit() {
    await this.initializeRates();
    await this.startRealTimeUpdates();
  }

  private async initializeRates() {
    this.logger.log('Initializing FX rates...');
    const activeCurrencies = await this.currencyRepository.find({ where: { isActive: true } });
    
    for (const fromCurrency of activeCurrencies) {
      for (const toCurrency of activeCurrencies) {
        if (fromCurrency.code !== toCurrency.code) {
          await this.fetchAndUpdateRate(fromCurrency.code, toCurrency.code);
        }
      }
    }
    
    this.logger.log(`Initialized ${activeCurrencies.length * (activeCurrencies.length - 1)} currency pairs`);
  }

  private async startRealTimeUpdates() {
    // WebSocket connections for real-time updates would be implemented here
    // For now, we'll use scheduled updates
    this.logger.log('Starting real-time FX rate updates...');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async updateRates() {
    const activeCurrencies = await this.currencyRepository.find({ where: { isActive: true } });
    const majorPairs = this.getMajorCurrencyPairs(activeCurrencies);
    
    const updatePromises = majorPairs.map(async ([from, to]) => {
      try {
        await this.fetchAndUpdateRate(from, to);
      } catch (error) {
        this.logger.error(`Failed to update ${from}/${to} rate:`, error);
      }
    });

    await Promise.allSettled(updatePromises);
  }

  private getMajorCurrencyPairs(currencies: Currency[]): [string, string][] {
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD'];
    const pairs: [string, string][] = [];
    
    currencies.forEach(currency => {
      if (majorCurrencies.includes(currency.code)) {
        currencies.forEach(otherCurrency => {
          if (currency.code !== otherCurrency.code) {
            pairs.push([currency.code, otherCurrency.code]);
          }
        });
      }
    });
    
    return pairs;
  }

  async getRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number; timestamp: Date; source: string }> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.rateCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheExpiry) {
      return cached;
    }

    const latestRate = await this.fxRateRepository.findOne({
      where: {
        fromCurrency,
        toCurrency,
      },
      order: { timestamp: 'DESC' },
    });

    if (!latestRate) {
      return await this.fetchAndUpdateRate(fromCurrency, toCurrency);
    }

    const rateData = {
      rate: latestRate.rate,
      timestamp: latestRate.timestamp,
      source: latestRate.source,
    };

    this.rateCache.set(cacheKey, rateData);
    return rateData;
  }

  private async fetchAndUpdateRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number; timestamp: Date; source: string }> {
    const rateData = await this.fetchRateFromProviders(fromCurrency, toCurrency);
    
    const fxRate = this.fxRateRepository.create({
      id: crypto.randomUUID(),
      fromCurrency,
      toCurrency,
      rate: rateData.rate,
      bidPrice: rateData.bidPrice,
      askPrice: rateData.askPrice,
      spread: rateData.spread,
      timestamp: rateData.timestamp,
      source: rateData.source,
      confidence: rateData.confidence,
      metadata: rateData.metadata,
    });

    await this.fxRateRepository.save(fxRate);

    const cacheKey = `${fromCurrency}-${toCurrency}`;
    this.rateCache.set(cacheKey, {
      rate: rateData.rate,
      timestamp: rateData.timestamp,
      source: rateData.source,
    });

    return {
      rate: rateData.rate,
      timestamp: rateData.timestamp,
      source: rateData.source,
    };
  }

  private async fetchRateFromProviders(fromCurrency: string, toCurrency: string) {
    const providers = [
      () => this.fetchFromOpenExchangeRates(fromCurrency, toCurrency),
      () => this.fetchFromCurrencyLayer(fromCurrency, toCurrency),
      () => this.fetchFromFixer(fromCurrency, toCurrency),
    ];

    for (const provider of providers) {
      try {
        const rateData = await provider();
        if (rateData && this.validateRate(rateData.rate)) {
          return rateData;
        }
      } catch (error) {
        this.logger.warn(`Provider failed for ${fromCurrency}/${toCurrency}:`, error.message);
      }
    }

    throw new Error(`Unable to fetch rate for ${fromCurrency}/${toCurrency} from any provider`);
  }

  private async fetchFromOpenExchangeRates(fromCurrency: string, toCurrency: string) {
    const apiKey = process.env.OPENEXCHANGERATES_API_KEY;
    if (!apiKey) throw new Error('OpenExchangeRates API key not configured');

    const url = `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${fromCurrency}&symbols=${toCurrency}`;
    const response = await firstValueFrom(this.httpService.get(url));
    
    const rate = response.data.rates[toCurrency];
    if (!rate) throw new Error(`Rate not found for ${toCurrency}`);

    return {
      rate,
      bidPrice: rate * 0.999,
      askPrice: rate * 1.001,
      spread: 0.001,
      timestamp: new Date(response.data.timestamp * 1000),
      source: 'openexchangerates',
      confidence: 0.95,
      metadata: {
        provider: 'OpenExchangeRates',
        latency: Date.now() - Date.now(),
      },
    };
  }

  private async fetchFromCurrencyLayer(fromCurrency: string, toCurrency: string) {
    const apiKey = process.env.CURRENCYLAYER_API_KEY;
    if (!apiKey) throw new Error('CurrencyLayer API key not configured');

    const url = `http://api.currencylayer.com/live?access_key=${apiKey}&currencies=${toCurrency}&source=${fromCurrency}`;
    const response = await firstValueFrom(this.httpService.get(url));
    
    const quoteKey = `${fromCurrency}${toCurrency}`;
    const rate = response.data.quotes[quoteKey];
    if (!rate) throw new Error(`Rate not found for ${quoteKey}`);

    return {
      rate,
      bidPrice: rate * 0.998,
      askPrice: rate * 1.002,
      spread: 0.002,
      timestamp: new Date(),
      source: 'currencylayer',
      confidence: 0.92,
      metadata: {
        provider: 'CurrencyLayer',
        latency: Date.now() - Date.now(),
      },
    };
  }

  private async fetchFromFixer(fromCurrency: string, toCurrency: string) {
    const apiKey = process.env.FIXER_API_KEY;
    if (!apiKey) throw new Error('Fixer API key not configured');

    const url = `http://data.fixer.io/api/latest?access_key=${apiKey}&base=${fromCurrency}&symbols=${toCurrency}`;
    const response = await firstValueFrom(this.httpService.get(url));
    
    const rate = response.data.rates[toCurrency];
    if (!rate) throw new Error(`Rate not found for ${toCurrency}`);

    return {
      rate,
      bidPrice: rate * 0.997,
      askPrice: rate * 1.003,
      spread: 0.003,
      timestamp: new Date(response.data.timestamp * 1000),
      source: 'fixer',
      confidence: 0.90,
      metadata: {
        provider: 'Fixer',
        latency: Date.now() - Date.now(),
      },
    };
  }

  private validateRate(rate: number): boolean {
    return rate > 0 && rate < 1000000 && !isNaN(rate) && isFinite(rate);
  }

  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date,
  ): Promise<FxRate[]> {
    return this.fxRateRepository.find({
      where: {
        fromCurrency,
        toCurrency,
        timestamp: Between(startDate, endDate),
      },
      order: { timestamp: 'ASC' },
    });
  }

  async getRateHistory(
    fromCurrency: string,
    toCurrency: string,
    hours: number = 24,
  ): Promise<FxRate[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.getHistoricalRates(fromCurrency, toCurrency, startDate, new Date());
  }

  async calculateVolatility(currencyPair: string, period: number = 30): Promise<number> {
    const [fromCurrency, toCurrency] = currencyPair.split('/');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - period * 24 * 60 * 60 * 1000);

    const rates = await this.getHistoricalRates(fromCurrency, toCurrency, startDate, endDate);
    
    if (rates.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < rates.length; i++) {
      const returnRate = (rates[i].rate - rates[i - 1].rate) / rates[i - 1].rate;
      returns.push(returnRate);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  async getLatestRates(): Promise<Map<string, { rate: number; timestamp: Date; source: string }>> {
    const latestRates = await this.fxRateRepository
      .createQueryBuilder('rate')
      .distinctOn(['rate.fromCurrency', 'rate.toCurrency'])
      .orderBy('rate.fromCurrency')
      .addOrderBy('rate.toCurrency')
      .addOrderBy('rate.timestamp', 'DESC')
      .getMany();

    const rateMap = new Map();
    latestRates.forEach(rate => {
      const key = `${rate.fromCurrency}/${rate.toCurrency}`;
      rateMap.set(key, {
        rate: rate.rate,
        timestamp: rate.timestamp,
        source: rate.source,
      });
    });

    return rateMap;
  }

  async getRateStatistics(fromCurrency: string, toCurrency: string, days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const rates = await this.getHistoricalRates(fromCurrency, toCurrency, startDate, endDate);
    
    if (rates.length === 0) return null;

    const rateValues = rates.map(r => r.rate);
    const min = Math.min(...rateValues);
    const max = Math.max(...rateValues);
    const avg = rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length;
    const latest = rateValues[rateValues.length - 1];

    return {
      current: latest,
      average: avg,
      minimum: min,
      maximum: max,
      change: ((latest - rateValues[0]) / rateValues[0]) * 100,
      volatility: await this.calculateVolatility(`${fromCurrency}/${toCurrency}`, days),
      samples: rates.length,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  exchangeRate: number;
  fee: number;
  totalAmount: number;
  timestamp: Date;
}

export interface SupportedCurrency {
  code: string;
  name: string;
  symbol: string;
  decimalPlaces: number;
  isActive: boolean;
  region: string[];
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);
  private readonly exchangeRates: Map<string, CurrencyRate> = new Map();
  private readonly supportedCurrencies: Map<string, SupportedCurrency> =
    new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {
    this.initializeSupportedCurrencies();
    this.startExchangeRateUpdates();
  }

  private initializeSupportedCurrencies(): void {
    const currencies: SupportedCurrency[] = [
      {
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        decimalPlaces: 2,
        isActive: true,
        region: ['US', 'Global'],
      },
      {
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        decimalPlaces: 2,
        isActive: true,
        region: ['EU'],
      },
      {
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        decimalPlaces: 2,
        isActive: true,
        region: ['GB'],
      },
      {
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        decimalPlaces: 0,
        isActive: true,
        region: ['JP'],
      },
      {
        code: 'CNY',
        name: 'Chinese Yuan',
        symbol: '¥',
        decimalPlaces: 2,
        isActive: true,
        region: ['CN'],
      },
      {
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        decimalPlaces: 2,
        isActive: true,
        region: ['IN'],
      },
      {
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        decimalPlaces: 2,
        isActive: true,
        region: ['AU'],
      },
      {
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        decimalPlaces: 2,
        isActive: true,
        region: ['CA'],
      },
      {
        code: 'CHF',
        name: 'Swiss Franc',
        symbol: 'Fr',
        decimalPlaces: 2,
        isActive: true,
        region: ['CH'],
      },
      {
        code: 'SEK',
        name: 'Swedish Krona',
        symbol: 'kr',
        decimalPlaces: 2,
        isActive: true,
        region: ['SE'],
      },
      {
        code: 'NOK',
        name: 'Norwegian Krone',
        symbol: 'kr',
        decimalPlaces: 2,
        isActive: true,
        region: ['NO'],
      },
      {
        code: 'DKK',
        name: 'Danish Krone',
        symbol: 'kr',
        decimalPlaces: 2,
        isActive: true,
        region: ['DK'],
      },
      {
        code: 'SGD',
        name: 'Singapore Dollar',
        symbol: 'S$',
        decimalPlaces: 2,
        isActive: true,
        region: ['SG'],
      },
      {
        code: 'HKD',
        name: 'Hong Kong Dollar',
        symbol: 'HK$',
        decimalPlaces: 2,
        isActive: true,
        region: ['HK'],
      },
      {
        code: 'NZD',
        name: 'New Zealand Dollar',
        symbol: 'NZ$',
        decimalPlaces: 2,
        isActive: true,
        region: ['NZ'],
      },
      {
        code: 'KRW',
        name: 'South Korean Won',
        symbol: '₩',
        decimalPlaces: 0,
        isActive: true,
        region: ['KR'],
      },
      {
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: '$',
        decimalPlaces: 2,
        isActive: true,
        region: ['MX'],
      },
      {
        code: 'BRL',
        name: 'Brazilian Real',
        symbol: 'R$',
        decimalPlaces: 2,
        isActive: true,
        region: ['BR'],
      },
      {
        code: 'RUB',
        name: 'Russian Ruble',
        symbol: '₽',
        decimalPlaces: 2,
        isActive: true,
        region: ['RU'],
      },
      {
        code: 'ZAR',
        name: 'South African Rand',
        symbol: 'R',
        decimalPlaces: 2,
        isActive: true,
        region: ['ZA'],
      },
    ];

    currencies.forEach((currency) => {
      this.supportedCurrencies.set(currency.code, currency);
    });

    this.logger.log(`Initialized ${currencies.length} supported currencies`);
  }

  private startExchangeRateUpdates(): void {
    this.updateExchangeRates();
    setInterval(() => {
      this.updateExchangeRates();
    }, this.cacheTimeout);
  }

  private async updateExchangeRates(): Promise<void> {
    try {
      const baseCurrency = 'USD';
      const apiKey = this.configService.get<string>('EXCHANGE_RATE_API_KEY');

      if (apiKey) {
        const response = await axios.get(
          `https://open.er-api.com/v6/latest/${baseCurrency}?apikey=${apiKey}`,
        );
        const rates = response.data.rates;

        for (const [currency, rate] of Object.entries(rates)) {
          if (this.supportedCurrencies.has(currency)) {
            const rateData: CurrencyRate = {
              from: baseCurrency,
              to: currency,
              rate: rate as number,
              timestamp: new Date(),
              source: 'ER-API',
            };
            this.exchangeRates.set(`${baseCurrency}-${currency}`, rateData);
          }
        }
      } else {
        this.generateMockExchangeRates();
      }

      this.logger.log('Updated exchange rates successfully');
    } catch (error) {
      this.logger.warn(
        'Failed to update exchange rates, using mock data',
        error,
      );
      this.generateMockExchangeRates();
    }
  }

  private generateMockExchangeRates(): void {
    const baseRates: Record<string, number> = {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.24,
      INR: 83.12,
      AUD: 1.53,
      CAD: 1.36,
      CHF: 0.88,
      SEK: 10.67,
      NOK: 10.47,
      DKK: 6.88,
      SGD: 1.35,
      HKD: 7.82,
      NZD: 1.61,
      KRW: 1318.5,
      MXN: 17.15,
      BRL: 4.97,
      RUB: 89.75,
      ZAR: 18.93,
    };

    for (const [currency, rate] of Object.entries(baseRates)) {
      const rateData: CurrencyRate = {
        from: 'USD',
        to: currency,
        rate: rate * (0.98 + Math.random() * 0.04), // ±2% variation
        timestamp: new Date(),
        source: 'Mock',
      };
      this.exchangeRates.set(`USD-${currency}`, rateData);
    }
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ConversionResult> {
    if (!this.supportedCurrencies.has(fromCurrency)) {
      throw new Error(`Unsupported source currency: ${fromCurrency}`);
    }

    if (!this.supportedCurrencies.has(toCurrency)) {
      throw new Error(`Unsupported target currency: ${toCurrency}`);
    }

    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: amount,
        targetCurrency: toCurrency,
        exchangeRate: 1,
        fee: 0,
        totalAmount: amount,
        timestamp: new Date(),
      };
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const fee = this.calculateConversionFee(amount, fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate;
    const totalAmount = convertedAmount + fee;

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      targetCurrency: toCurrency,
      exchangeRate,
      fee,
      totalAmount,
      timestamp: new Date(),
    };
  }

  private async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<number> {
    const directKey = `${fromCurrency}-${toCurrency}`;
    const reverseKey = `${toCurrency}-${fromCurrency}`;
    const usdFromKey = `USD-${fromCurrency}`;
    const usdToKey = `USD-${toCurrency}`;

    if (this.exchangeRates.has(directKey)) {
      return this.exchangeRates.get(directKey)!.rate;
    }

    if (this.exchangeRates.has(reverseKey)) {
      const reverseRate = this.exchangeRates.get(reverseKey)!.rate;
      return 1 / reverseRate;
    }

    if (
      this.exchangeRates.has(usdFromKey) &&
      this.exchangeRates.has(usdToKey)
    ) {
      const fromRate = this.exchangeRates.get(usdFromKey)!.rate;
      const toRate = this.exchangeRates.get(usdToKey)!.rate;
      return toRate / fromRate;
    }

    throw new Error(
      `Exchange rate not available for ${fromCurrency} to ${toCurrency}`,
    );
  }

  private calculateConversionFee(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): number {
    const baseFeeRate = 0.0025; // 0.25% base fee
    const crossBorderFee =
      fromCurrency !== 'USD' && toCurrency !== 'USD' ? 0.0015 : 0; // Additional 0.15% for non-USD pairs
    const totalFeeRate = baseFeeRate + crossBorderFee;

    return Math.max(amount * totalFeeRate, 1); // Minimum fee of 1 unit
  }

  getSupportedCurrencies(): SupportedCurrency[] {
    return Array.from(this.supportedCurrencies.values()).filter(
      (currency) => currency.isActive,
    );
  }

  getCurrencyByCode(code: string): SupportedCurrency | undefined {
    return this.supportedCurrencies.get(code);
  }

  getExchangeRateHistory(
    fromCurrency: string,
    toCurrency: string,
  ): CurrencyRate[] {
    const rates: CurrencyRate[] = [];
    const key = `${fromCurrency}-${toCurrency}`;

    if (this.exchangeRates.has(key)) {
      rates.push(this.exchangeRates.get(key)!);
    }

    return rates;
  }

  calculateCrossBorderFee(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): number {
    const baseFee = 5; // Base cross-border fee
    const percentageFee = amount * 0.001; // 0.1% percentage fee
    const currencyFee = fromCurrency !== 'USD' && toCurrency !== 'USD' ? 10 : 0; // Additional fee for non-USD pairs

    return baseFee + percentageFee + currencyFee;
  }

  formatCurrency(amount: number, currency: string): string {
    const currencyInfo = this.supportedCurrencies.get(currency);
    if (!currencyInfo) {
      return amount.toString();
    }

    const formattedAmount = amount.toFixed(currencyInfo.decimalPlaces);
    return `${currencyInfo.symbol}${formattedAmount}`;
  }

  validateCurrencyCode(code: string): boolean {
    return (
      this.supportedCurrencies.has(code) &&
      this.supportedCurrencies.get(code)!.isActive
    );
  }

  getCurrenciesByRegion(region: string): SupportedCurrency[] {
    return Array.from(this.supportedCurrencies.values()).filter(
      (currency) => currency.isActive && currency.region.includes(region),
    );
  }
}

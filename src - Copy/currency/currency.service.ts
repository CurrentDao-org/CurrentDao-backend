import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Currency } from './entities/currency.entity';
import { CurrencyAccount } from './entities/currency-account.entity';
import { CurrencyTransaction } from './entities/currency-transaction.entity';
import { FxRateService } from './rates/fx-rate.service';
import { CurrencyConversionService, ConversionRequest } from './conversion/currency-conversion.service';
import { CurrencyRiskService } from './risk/currency-risk.service';
import { MultiCurrencyReportService } from './reporting/multi-currency-report.service';
import { PaymentProcessorService } from './integration/payment-processor.service';

export interface CreateAccountRequest {
  userId: string;
  currencyCode: string;
  initialBalance?: number;
  metadata?: any;
}

export interface AccountDetails {
  id: string;
  userId: string;
  currencyCode: string;
  accountNumber: string;
  balance: number;
  availableBalance: number;
  frozenBalance: number;
  pendingBalance: number;
  creditLimit?: number;
  isActive: boolean;
  isVerified: boolean;
  limits?: any;
  compliance?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurrencyPortfolio {
  userId: string;
  baseCurrency: string;
  totalValue: number;
  accounts: AccountDetails[];
  currencyDistribution: Array<{
    currency: string;
    balance: number;
    value: number;
    percentage: number;
  }>;
  performanceMetrics: {
    totalReturn: number;
    totalReturnPercent: number;
    currencyReturns: Array<{
      currency: string;
      return: number;
      returnPercent: number;
    }>;
  };
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    @InjectRepository(CurrencyAccount)
    private readonly accountRepository: Repository<CurrencyAccount>,
    @InjectRepository(CurrencyTransaction)
    private readonly transactionRepository: Repository<CurrencyTransaction>,
    private readonly fxRateService: FxRateService,
    private readonly conversionService: CurrencyConversionService,
    private readonly riskService: CurrencyRiskService,
    private readonly reportService: MultiCurrencyReportService,
    private readonly paymentService: PaymentProcessorService,
    private readonly dataSource: DataSource,
  ) {}

  async initializeCurrencies(): Promise<void> {
    this.logger.log('Initializing currency system...');

    const currencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
      { code: 'EUR', name: 'Euro', symbol: 'â¬', decimalPlaces: 2 },
      { code: 'GBP', name: 'British Pound', symbol: 'Â£', decimalPlaces: 2 },
      { code: 'JPY', name: 'Japanese Yen', symbol: 'Â¥', decimalPlaces: 0 },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimalPlaces: 2 },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
      { code: 'CNY', name: 'Chinese Yuan', symbol: 'Â¥', decimalPlaces: 2 },
      { code: 'INR', name: 'Indian Rupee', symbol: 'â¹', decimalPlaces: 2 },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', decimalPlaces: 2 },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2 },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R', decimalPlaces: 2 },
      { code: 'TRY', name: 'Turkish Lira', symbol: 'âº', decimalPlaces: 2 },
      { code: 'RUB', name: 'Russian Ruble', symbol: 'â½', decimalPlaces: 2 },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', decimalPlaces: 2 },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', decimalPlaces: 2 },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr', decimalPlaces: 2 },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zÅ', decimalPlaces: 2 },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'KÄ', decimalPlaces: 2 },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', decimalPlaces: 2 },
    ];

    for (const currencyData of currencies) {
      const existingCurrency = await this.currencyRepository.findOne({
        where: { code: currencyData.code },
      });

      if (!existingCurrency) {
        const currency = this.currencyRepository.create({
          ...currencyData,
          isActive: true,
          isCrypto: false,
          exchangeRate: 1.0,
          minTransactionAmount: 0.01,
          maxTransactionAmount: 1000000,
          metadata: {
            country: this.getCountryForCurrency(currencyData.code),
            region: this.getRegionForCurrency(currencyData.code),
            supportedPaymentProcessors: this.getSupportedProcessors(currencyData.code),
          },
        });
        await this.currencyRepository.save(currency);
      }
    }

    this.logger.log(`Initialized ${currencies.length} currencies`);
  }

  async createCurrencyAccount(request: CreateAccountRequest): Promise<AccountDetails> {
    this.logger.log(`Creating currency account for user ${request.userId} in ${request.currencyCode}`);

    // Validate currency
    const currency = await this.currencyRepository.findOne({
      where: { code: request.currencyCode, isActive: true },
    });

    if (!currency) {
      throw new BadRequestException(`Currency ${request.currencyCode} not supported`);
    }

    // Check if account already exists
    const existingAccount = await this.accountRepository.findOne({
      where: {
        userId: request.userId,
        currencyCode: request.currencyCode,
      },
    });

    if (existingAccount) {
      throw new BadRequestException(`Account for ${request.currencyCode} already exists`);
    }

    // Create account
    const account = this.accountRepository.create({
      id: crypto.randomUUID(),
      userId: request.userId,
      currencyCode: request.currencyCode,
      accountNumber: this.generateAccountNumber(request.userId, request.currencyCode),
      balance: request.initialBalance || 0,
      availableBalance: request.initialBalance || 0,
      isActive: true,
      isVerified: false,
      limits: {
        daily: currency.maxTransactionAmount,
        monthly: currency.maxTransactionAmount * 10,
        transaction: currency.maxTransactionAmount,
      },
      compliance: {
        kycLevel: 'basic',
        riskScore: 0.1,
        restrictions: [],
        lastAudit: new Date(),
      },
    });

    const savedAccount = await this.accountRepository.save(account);

    // If initial balance provided, create a funding transaction
    if (request.initialBalance && request.initialBalance > 0) {
      await this.createFundingTransaction(savedAccount, request.initialBalance, request.metadata);
    }

    return this.mapAccountToDetails(savedAccount);
  }

  async getUserAccounts(userId: string): Promise<AccountDetails[]> {
    const accounts = await this.accountRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'ASC' },
    });

    return accounts.map(account => this.mapAccountToDetails(account));
  }

  async getAccountDetails(accountId: string, userId: string): Promise<AccountDetails> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    return this.mapAccountToDetails(account);
  }

  async getUserPortfolio(userId: string, baseCurrency: string = 'USD'): Promise<CurrencyPortfolio> {
    const accounts = await this.getUserAccounts(userId);
    
    if (accounts.length === 0) {
      return {
        userId,
        baseCurrency,
        totalValue: 0,
        accounts: [],
        currencyDistribution: [],
        performanceMetrics: {
          totalReturn: 0,
          totalReturnPercent: 0,
          currencyReturns: [],
        },
      };
    }

    // Calculate total portfolio value in base currency
    let totalValue = 0;
    const currencyDistribution = [];

    for (const account of accounts) {
      let value = account.balance;
      
      if (account.currencyCode !== baseCurrency) {
        try {
          const rateData = await this.fxRateService.getRate(account.currencyCode, baseCurrency);
          value = account.balance * rateData.rate;
        } catch (error) {
          this.logger.warn(`Could not convert ${account.currencyCode} to ${baseCurrency}`);
        }
      }

      totalValue += value;
      currencyDistribution.push({
        currency: account.currencyCode,
        balance: account.balance,
        value,
        percentage: 0, // Will be calculated after total is known
      });
    }

    // Calculate percentages
    currencyDistribution.forEach(dist => {
      dist.percentage = totalValue > 0 ? (dist.value / totalValue) * 100 : 0;
    });

    // Calculate performance metrics
    const performanceMetrics = await this.calculatePortfolioPerformance(userId, accounts, baseCurrency);

    return {
      userId,
      baseCurrency,
      totalValue,
      accounts,
      currencyDistribution,
      performanceMetrics,
    };
  }

  async convertCurrency(request: ConversionRequest) {
    return this.conversionService.convertCurrency(request);
  }

  async estimateConversion(
    fromCurrency: string,
    toCurrency: string,
    amount: number,
  ) {
    return this.conversionService.estimateConversion(fromCurrency, toCurrency, amount);
  }

  async getConversionHistory(userId: string, options?: any) {
    return this.conversionService.getConversionHistory(userId, options);
  }

  async getRiskReport(userId: string) {
    return this.riskService.getRiskReport(userId);
  }

  async assessUserRisk(userId: string) {
    return this.riskService.assessUserRisk(userId);
  }

  async generateReport(
    reportType: 'currency' | 'balance' | 'compliance',
    parameters: any,
  ) {
    return this.reportService.generateCurrencyReport(
      parameters.startDate,
      parameters.endDate,
      parameters.options,
    );
  }

  async exportReport(
    reportType: 'currency' | 'balance' | 'compliance',
    format: 'json' | 'csv' | 'pdf',
    parameters: any,
  ) {
    return this.reportService.exportReport(reportType, format, parameters);
  }

  async getSupportedCurrencies(): Promise<Currency[]> {
    return this.currencyRepository.find({
      where: { isActive: true },
      order: { code: 'ASC' },
    });
  }

  async getCurrencyDetails(currencyCode: string): Promise<Currency> {
    const currency = await this.currencyRepository.findOne({
      where: { code: currencyCode, isActive: true },
    });

    if (!currency) {
      throw new NotFoundException(`Currency ${currencyCode} not found`);
    }

    return currency;
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string) {
    return this.fxRateService.getRate(fromCurrency, toCurrency);
  }

  async getRateHistory(fromCurrency: string, toCurrency: string, hours: number = 24) {
    return this.fxRateService.getRateHistory(fromCurrency, toCurrency, hours);
  }

  async getRateStatistics(fromCurrency: string, toCurrency: string, days: number = 30) {
    return this.fxRateService.getRateStatistics(fromCurrency, toCurrency, days);
  }

  async getSupportedPaymentProcessors() {
    return this.paymentService.getSupportedProcessors();
  }

  async processPayment(request: any) {
    return this.paymentService.processPayment(request);
  }

  async getPaymentStatus(processorName: string, processorTransactionId: string) {
    return this.paymentService.getPaymentStatus(processorName, processorTransactionId);
  }

  async updateAccountLimits(
    accountId: string,
    userId: string,
    limits: {
      daily?: number;
      monthly?: number;
      transaction?: number;
    },
  ): Promise<AccountDetails> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    if (account.limits) {
      Object.assign(account.limits, limits);
    } else {
      account.limits = limits;
    }

    await this.accountRepository.save(account);

    return this.mapAccountToDetails(account);
  }

  async freezeAccount(accountId: string, userId: string, reason: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    // Move available balance to frozen balance
    account.frozenBalance += account.availableBalance;
    account.availableBalance = 0;

    await this.accountRepository.save(account);

    this.logger.log(`Account ${accountId} frozen for user ${userId}. Reason: ${reason}`);
  }

  async unfreezeAccount(accountId: string, userId: string): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, userId, isActive: true },
    });

    if (!account) {
      throw new NotFoundException(`Account ${accountId} not found`);
    }

    // Move frozen balance back to available balance
    account.availableBalance += account.frozenBalance;
    account.frozenBalance = 0;

    await this.accountRepository.save(account);

    this.logger.log(`Account ${accountId} unfrozen for user ${userId}`);
  }

  private async createFundingTransaction(
    account: CurrencyAccount,
    amount: number,
    metadata?: any,
  ): Promise<void> {
    const transaction = this.transactionRepository.create({
      id: crypto.randomUUID(),
      userId: account.userId,
      fromCurrency: account.currencyCode,
      toCurrency: account.currencyCode,
      fromAmount: amount,
      toAmount: amount,
      exchangeRate: 1,
      fee: 0,
      feeAmount: 0,
      transactionType: 'funding',
      status: 'completed',
      completedAt: new Date(),
      metadata: {
        ...metadata,
        fundingType: 'initial_deposit',
      },
    });

    await this.transactionRepository.save(transaction);
  }

  private generateAccountNumber(userId: string, currencyCode: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${currencyCode}${timestamp}${random}`.toUpperCase();
  }

  private mapAccountToDetails(account: CurrencyAccount): AccountDetails {
    return {
      id: account.id,
      userId: account.userId,
      currencyCode: account.currencyCode,
      accountNumber: account.accountNumber,
      balance: account.balance,
      availableBalance: account.availableBalance,
      frozenBalance: account.frozenBalance,
      pendingBalance: account.pendingBalance,
      creditLimit: account.creditLimit,
      isActive: account.isActive,
      isVerified: account.isVerified,
      limits: account.limits,
      compliance: account.compliance,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  private async calculatePortfolioPerformance(
    userId: string,
    accounts: AccountDetails[],
    baseCurrency: string,
  ) {
    // Simplified performance calculation
    const currencyReturns = [];

    for (const account of accounts) {
      // In a real implementation, you'd calculate historical performance
      const returnAmount = account.balance * 0.05; // 5% return for demo
      const returnPercent = 5.0;

      currencyReturns.push({
        currency: account.currencyCode,
        return: returnAmount,
        returnPercent,
      });
    }

    const totalReturn = currencyReturns.reduce((sum, ret) => sum + ret.return, 0);
    const totalValue = accounts.reduce((sum, account) => {
      let value = account.balance;
      if (account.currencyCode !== baseCurrency) {
        // Simplified conversion
        value = account.balance * 1.1; // Assume 10% conversion rate
      }
      return sum + value;
    }, 0);

    const totalReturnPercent = totalValue > 0 ? (totalReturn / totalValue) * 100 : 0;

    return {
      totalReturn,
      totalReturnPercent,
      currencyReturns,
    };
  }

  private getCountryForCurrency(currencyCode: string): string {
    const countryMap: Record<string, string> = {
      USD: 'United States',
      EUR: 'Eurozone',
      GBP: 'United Kingdom',
      JPY: 'Japan',
      CHF: 'Switzerland',
      CAD: 'Canada',
      AUD: 'Australia',
      CNY: 'China',
      INR: 'India',
      BRL: 'Brazil',
      MXN: 'Mexico',
      ZAR: 'South Africa',
      TRY: 'Turkey',
      RUB: 'Russia',
      SEK: 'Sweden',
      NOK: 'Norway',
      DKK: 'Denmark',
      PLN: 'Poland',
      CZK: 'Czech Republic',
      HUF: 'Hungary',
    };
    return countryMap[currencyCode] || 'Unknown';
  }

  private getRegionForCurrency(currencyCode: string): string {
    const regionMap: Record<string, string> = {
      USD: 'North America',
      CAD: 'North America',
      MXN: 'North America',
      BRL: 'South America',
      EUR: 'Europe',
      GBP: 'Europe',
      CHF: 'Europe',
      SEK: 'Europe',
      NOK: 'Europe',
      DKK: 'Europe',
      PLN: 'Europe',
      CZK: 'Europe',
      HUF: 'Europe',
      RUB: 'Europe',
      JPY: 'Asia',
      CNY: 'Asia',
      INR: 'Asia',
      AUD: 'Oceania',
      ZAR: 'Africa',
      TRY: 'Middle East',
    };
    return regionMap[currencyCode] || 'Global';
  }

  private getSupportedProcessors(currencyCode: string): string[] {
    // All major processors support major currencies
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    const allProcessors = ['stripe', 'paypal', 'wise', 'square', 'adyen'];
    
    if (majorCurrencies.includes(currencyCode)) {
      return allProcessors;
    }
    
    // Limited support for other currencies
    return ['wise', 'paypal'];
  }

  async getSystemStatistics(): Promise<{
    totalAccounts: number;
    totalCurrencies: number;
    totalTransactions: number;
    totalVolume: number;
    activeUsers: number;
    averageRiskScore: number;
    hedgeEffectiveness: number;
  }> {
    const [totalAccounts, totalCurrencies, totalTransactions, activeUsers] = await Promise.all([
      this.accountRepository.count({ where: { isActive: true } }),
      this.currencyRepository.count({ where: { isActive: true } }),
      this.transactionRepository.count(),
      this.accountRepository
        .createQueryBuilder('account')
        .select('COUNT(DISTINCT account.userId)')
        .where('account.isActive = :isActive', { isActive: true })
        .getRawOne()
        .then(result => result.count),
    ]);

    const volumeResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.fromAmount)', 'total')
      .where('transaction.status = :status', { status: 'completed' })
      .getRawOne();

    const totalVolume = parseFloat(volumeResult.total) || 0;

    // Simplified risk and hedge metrics
    const averageRiskScore = 0.25; // Would calculate from actual risk data
    const hedgeEffectiveness = 78.5; // Would calculate from actual hedge data

    return {
      totalAccounts,
      totalCurrencies,
      totalTransactions,
      totalVolume,
      activeUsers,
      averageRiskScore,
      hedgeEffectiveness,
    };
  }
}

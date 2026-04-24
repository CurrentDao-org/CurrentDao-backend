import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CurrencyTransaction } from '../entities/currency-transaction.entity';
import { CurrencyAccount } from '../entities/currency-account.entity';
import { FxRateService } from '../rates/fx-rate.service';
import { CurrencyRiskService } from '../risk/currency-risk.service';

export interface ConversionRequest {
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  reference?: string;
  metadata?: any;
}

export interface ConversionResult {
  transactionId: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  fee: number;
  feeAmount: number;
  estimatedCompletion: Date;
}

@Injectable()
export class CurrencyConversionService {
  private readonly logger = new Logger(CurrencyConversionService.name);
  private readonly conversionFee = 0.001; // 0.1% base fee
  private readonly minimumFee = 0.01;
  private readonly maximumFee = 100;

  constructor(
    @InjectRepository(CurrencyTransaction)
    private readonly transactionRepository: Repository<CurrencyTransaction>,
    @InjectRepository(CurrencyAccount)
    private readonly accountRepository: Repository<CurrencyAccount>,
    private readonly fxRateService: FxRateService,
    private readonly currencyRiskService: CurrencyRiskService,
    private readonly dataSource: DataSource,
  ) {}

  async convertCurrency(request: ConversionRequest): Promise<ConversionResult> {
    this.logger.log(`Processing currency conversion: ${request.amount} ${request.fromCurrency} to ${request.toCurrency}`);

    // Validate request
    await this.validateConversionRequest(request);

    // Get current exchange rate
    const rateData = await this.fxRateService.getRate(request.fromCurrency, request.toCurrency);
    
    // Calculate conversion details
    const conversionDetails = this.calculateConversionDetails(request.amount, rateData.rate);
    
    // Check user's account balance
    await this.validateAccountBalance(request.userId, request.fromCurrency, request.amount + conversionDetails.feeAmount);
    
    // Assess currency risk
    const riskAssessment = await this.currencyRiskService.assessConversionRisk(request);

    // Execute conversion in a transaction
    const result = await this.dataSource.transaction(async manager => {
      // Create transaction record
      const transaction = manager.create(CurrencyTransaction, {
        id: crypto.randomUUID(),
        userId: request.userId,
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        fromAmount: request.amount,
        toAmount: conversionDetails.toAmount,
        exchangeRate: rateData.rate,
        fee: conversionDetails.fee,
        feeAmount: conversionDetails.feeAmount,
        transactionType: 'conversion',
        status: 'processing',
        reference: request.reference,
        metadata: {
          ...request.metadata,
          riskAssessment,
          rateSource: rateData.source,
          rateTimestamp: rateData.timestamp,
        },
      });

      const savedTransaction = await manager.save(transaction);

      // Update source account (debit)
      await this.updateAccountBalance(manager, request.userId, request.fromCurrency, -request.amount, 'debit');

      // Update destination account (credit)
      await this.updateAccountBalance(manager, request.userId, request.toCurrency, conversionDetails.toAmount, 'credit');

      // Update transaction status
      savedTransaction.status = 'completed';
      savedTransaction.completedAt = new Date();
      await manager.save(savedTransaction);

      return {
        transactionId: savedTransaction.id,
        fromAmount: request.amount,
        toAmount: conversionDetails.toAmount,
        exchangeRate: rateData.rate,
        fee: conversionDetails.fee,
        feeAmount: conversionDetails.feeAmount,
        estimatedCompletion: new Date(Date.now() + 5000), // 5 seconds
      };
    });

    this.logger.log(`Currency conversion completed: ${result.transactionId}`);
    return result;
  }

  async estimateConversion(fromCurrency: string, toCurrency: string, amount: number): Promise<{
    estimatedAmount: number;
    exchangeRate: number;
    fee: number;
    feeAmount: number;
    totalCost: number;
    estimatedTime: number;
  }> {
    const rateData = await this.fxRateService.getRate(fromCurrency, toCurrency);
    const conversionDetails = this.calculateConversionDetails(amount, rateData.rate);

    return {
      estimatedAmount: conversionDetails.toAmount,
      exchangeRate: rateData.rate,
      fee: conversionDetails.fee,
      feeAmount: conversionDetails.feeAmount,
      totalCost: amount + conversionDetails.feeAmount,
      estimatedTime: 5000, // 5 seconds
    };
  }

  async getConversionHistory(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      fromCurrency?: string;
      toCurrency?: string;
      startDate?: Date;
      endDate?: Date;
      status?: string;
    } = {},
  ): Promise<{
    transactions: CurrencyTransaction[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId })
      .andWhere('transaction.transactionType = :type', { type: 'conversion' });

    if (options.fromCurrency) {
      queryBuilder.andWhere('transaction.fromCurrency = :fromCurrency', { fromCurrency: options.fromCurrency });
    }

    if (options.toCurrency) {
      queryBuilder.andWhere('transaction.toCurrency = :toCurrency', { toCurrency: options.toCurrency });
    }

    if (options.status) {
      queryBuilder.andWhere('transaction.status = :status', { status: options.status });
    }

    if (options.startDate) {
      queryBuilder.andWhere('transaction.createdAt >= :startDate', { startDate: options.startDate });
    }

    if (options.endDate) {
      queryBuilder.andWhere('transaction.createdAt <= :endDate', { endDate: options.endDate });
    }

    const total = await queryBuilder.getCount();
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    const transactions = await queryBuilder
      .orderBy('transaction.createdAt', 'DESC')
      .limit(limit)
      .offset(offset)
      .getMany();

    return {
      transactions,
      total,
      page,
      totalPages,
    };
  }

  async getTransactionDetails(transactionId: string, userId: string): Promise<CurrencyTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    return transaction;
  }

  async cancelConversion(transactionId: string, userId: string): Promise<void> {
    this.logger.log(`Cancelling conversion transaction: ${transactionId}`);

    const transaction = await this.getTransactionDetails(transactionId, userId);

    if (transaction.status !== 'pending' && transaction.status !== 'processing') {
      throw new BadRequestException(`Cannot cancel transaction with status: ${transaction.status}`);
    }

    await this.dataSource.transaction(async manager => {
      // Update transaction status
      transaction.status = 'cancelled';
      transaction.failedAt = new Date();
      transaction.failureReason = 'User requested cancellation';
      await manager.save(transaction);

      // Reverse the account balance changes
      await this.updateAccountBalance(manager, userId, transaction.fromCurrency, transaction.fromAmount, 'credit');
      await this.updateAccountBalance(manager, userId, transaction.toCurrency, -transaction.toAmount, 'debit');
    });

    this.logger.log(`Conversion transaction cancelled: ${transactionId}`);
  }

  async retryFailedConversion(transactionId: string, userId: string): Promise<ConversionResult> {
    this.logger.log(`Retrying failed conversion transaction: ${transactionId}`);

    const transaction = await this.getTransactionDetails(transactionId, userId);

    if (transaction.status !== 'failed') {
      throw new BadRequestException(`Cannot retry transaction with status: ${transaction.status}`);
    }

    // Create a new conversion request based on the failed transaction
    const retryRequest: ConversionRequest = {
      userId,
      fromCurrency: transaction.fromCurrency,
      toCurrency: transaction.toCurrency,
      amount: transaction.fromAmount,
      reference: `retry-${transactionId}`,
      metadata: transaction.metadata,
    };

    return this.convertCurrency(retryRequest);
  }

  private async validateConversionRequest(request: ConversionRequest): Promise<void> {
    if (!request.userId || !request.fromCurrency || !request.toCurrency || !request.amount) {
      throw new BadRequestException('Missing required fields');
    }

    if (request.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (request.fromCurrency === request.toCurrency) {
      throw new BadRequestException('Source and target currencies must be different');
    }

    // Validate currency codes
    const supportedCurrencies = await this.fxRateService.getLatestRates();
    const hasFromRate = Array.from(supportedCurrencies.keys()).some(key => key.startsWith(request.fromCurrency + '/'));
    const hasToRate = Array.from(supportedCurrencies.keys()).some(key => key.endsWith('/' + request.toCurrency));

    if (!hasFromRate || !hasToRate) {
      throw new BadRequestException(`Currency pair ${request.fromCurrency}/${request.toCurrency} not supported`);
    }
  }

  private calculateConversionDetails(amount: number, exchangeRate: number): {
    toAmount: number;
    fee: number;
    feeAmount: number;
  } {
    const feeAmount = Math.max(
      this.minimumFee,
      Math.min(this.maximumFee, amount * this.conversionFee)
    );
    const fee = feeAmount / amount;
    const toAmount = (amount - feeAmount) * exchangeRate;

    return {
      toAmount,
      fee,
      feeAmount,
    };
  }

  private async validateAccountBalance(userId: string, currencyCode: string, requiredAmount: number): Promise<void> {
    const account = await this.accountRepository.findOne({
      where: {
        userId,
        currencyCode,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Currency account for ${currencyCode} not found`);
    }

    if (account.availableBalance < requiredAmount) {
      throw new BadRequestException(`Insufficient balance. Available: ${account.availableBalance} ${currencyCode}, Required: ${requiredAmount} ${currencyCode}`);
    }
  }

  private async updateAccountBalance(
    manager: any,
    userId: string,
    currencyCode: string,
    amount: number,
    type: 'debit' | 'credit',
  ): Promise<void> {
    const account = await manager.findOne(CurrencyAccount, {
      where: {
        userId,
        currencyCode,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException(`Currency account for ${currencyCode} not found`);
    }

    if (type === 'debit') {
      account.balance -= amount;
      account.availableBalance -= amount;
    } else {
      account.balance += amount;
      account.availableBalance += amount;
    }

    await manager.save(account);
  }

  async getConversionStatistics(userId: string, period: number = 30): Promise<{
    totalConversions: number;
    totalVolume: number;
    averageAmount: number;
    mostConvertedPairs: Array<{ pair: string; count: number; volume: number }>;
    successRate: number;
    averageFee: number;
  }> {
    const startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000);
    
    const transactions = await this.transactionRepository.find({
      where: {
        userId,
        transactionType: 'conversion',
        createdAt: { $gte: startDate },
      },
    });

    const successfulTransactions = transactions.filter(t => t.status === 'completed');
    const totalVolume = successfulTransactions.reduce((sum, t) => sum + t.fromAmount, 0);
    const averageAmount = successfulTransactions.length > 0 ? totalVolume / successfulTransactions.length : 0;
    const successRate = transactions.length > 0 ? (successfulTransactions.length / transactions.length) * 100 : 0;
    const averageFee = successfulTransactions.length > 0 
      ? successfulTransactions.reduce((sum, t) => sum + t.feeAmount, 0) / successfulTransactions.length 
      : 0;

    // Group by currency pairs
    const pairStats = new Map();
    successfulTransactions.forEach(t => {
      const pair = `${t.fromCurrency}/${t.toCurrency}`;
      if (!pairStats.has(pair)) {
        pairStats.set(pair, { count: 0, volume: 0 });
      }
      const stats = pairStats.get(pair);
      stats.count++;
      stats.volume += t.fromAmount;
    });

    const mostConvertedPairs = Array.from(pairStats.entries())
      .map(([pair, stats]) => ({ pair, ...stats }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    return {
      totalConversions: successfulTransactions.length,
      totalVolume,
      averageAmount,
      mostConvertedPairs,
      successRate,
      averageFee,
    };
  }
}

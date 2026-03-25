import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import {
  CrossBorderTransaction,
  TransactionStatus,
  ComplianceStatus,
} from '../entities/cross-border-transaction.entity';
import {
  RegulationService,
  ComplianceResult,
} from '../compliance/regulation-service';
import {
  CurrencyService,
  ConversionResult,
} from '../currency/currency-service';
import { CustomsService } from '../tariffs/customs-service';
import { CreateInternationalTradeDto } from '../dto/international-trade.dto';

export interface ProcessingResult {
  success: boolean;
  transaction: CrossBorderTransaction;
  complianceResult?: ComplianceResult;
  conversionResult?: ConversionResult | null;
  customsResult?: any;
  errors?: string[];
  processingTime: number;
}

export interface TransactionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  complianceRate: number;
  currencyConversions: number;
  customsClearances: number;
}

@Injectable()
export class TransactionProcessorService {
  private readonly logger = new Logger(TransactionProcessorService.name);
  private readonly processingMetrics: TransactionMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageProcessingTime: 0,
    complianceRate: 0,
    currencyConversions: 0,
    customsClearances: 0,
  };

  constructor(
    @InjectRepository(CrossBorderTransaction)
    private readonly transactionRepository: Repository<CrossBorderTransaction>,
    private readonly regulationService: RegulationService,
    private readonly currencyService: CurrencyService,
    private readonly customsService: CustomsService,
  ) {}

  async processTransaction(
    transactionData: CreateInternationalTradeDto,
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    this.logger.log(
      `Processing cross-border transaction: ${transactionData.transactionId}`,
    );

    try {
      const transaction = this.createTransactionEntity(transactionData);
      transaction.status = TransactionStatus.PROCESSING;

      const savedTransaction =
        await this.transactionRepository.save(transaction);

      const [complianceResult, conversionResult, customsResult] =
        await Promise.all([
          this.performComplianceCheck(transactionData),
          this.performCurrencyConversion(transactionData),
          this.performCustomsClearance(transactionData),
        ]);

      const errors: string[] = [];

      if (complianceResult.overallStatus === 'non_compliant') {
        errors.push('Transaction failed compliance check');
      }

      if (customsResult && !customsResult.approved) {
        errors.push('Customs clearance failed');
      }

      savedTransaction.complianceStatus = this.mapComplianceStatus(
        complianceResult.overallStatus,
      );
      savedTransaction.regulatoryData = complianceResult;
      savedTransaction.convertedAmount = conversionResult?.convertedAmount;
      savedTransaction.targetCurrency = conversionResult?.targetCurrency;
      savedTransaction.exchangeRate = conversionResult?.exchangeRate;
      savedTransaction.customsData = customsResult;
      savedTransaction.customsTariff = customsResult?.tariff;
      savedTransaction.regulatoryFees = customsResult?.regulatoryFees;
      savedTransaction.totalAmount = this.calculateTotalAmount(
        transactionData,
        conversionResult,
        customsResult,
      );

      if (errors.length > 0) {
        savedTransaction.status = TransactionStatus.FAILED;
        savedTransaction.failureReason = errors.join('; ');
        this.processingMetrics.failedTransactions++;
      } else {
        savedTransaction.status = TransactionStatus.COMPLETED;
        savedTransaction.processedAt = new Date();
        savedTransaction.completedAt = new Date();
        this.processingMetrics.successfulTransactions++;
      }

      const finalTransaction =
        await this.transactionRepository.save(savedTransaction);
      const processingTime = Date.now() - startTime;

      this.updateMetrics(processingTime, errors.length === 0);

      return {
        success: errors.length === 0,
        transaction: finalTransaction,
        complianceResult,
        conversionResult,
        customsResult,
        errors: errors.length > 0 ? errors : undefined,
        processingTime,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process transaction ${transactionData.transactionId}:`,
        error,
      );
      this.processingMetrics.failedTransactions++;

      return {
        success: false,
        transaction: null as any,
        errors: [error.message],
        processingTime: Date.now() - startTime,
      };
    }
  }

  private createTransactionEntity(
    data: CreateInternationalTradeDto,
  ): CrossBorderTransaction {
    const transaction = new CrossBorderTransaction();
    transaction.transactionId = data.transactionId;
    transaction.transactionType = data.transactionType;
    transaction.sourceCountry = data.sourceCountry;
    transaction.targetCountry = data.targetCountry;
    transaction.amount = data.amount;
    transaction.currency = data.currency;
    transaction.notes = data.notes;

    return transaction;
  }

  private async performComplianceCheck(
    data: CreateInternationalTradeDto,
  ): Promise<ComplianceResult> {
    return this.regulationService.checkCompliance(
      data.sourceCountry,
      data.targetCountry,
      data.energyType || 'electricity',
      data.amount,
      data.transactionType,
    );
  }

  private async performCurrencyConversion(
    data: CreateInternationalTradeDto,
  ): Promise<ConversionResult | null> {
    if (
      !data.currencyConversion ||
      data.currency === data.currencyConversion.targetCurrency
    ) {
      return null;
    }

    return this.currencyService.convertCurrency(
      data.amount,
      data.currency,
      data.currencyConversion.targetCurrency,
    );
  }

  private async performCustomsClearance(
    data: CreateInternationalTradeDto,
  ): Promise<any> {
    return this.customsService.calculateCustomsAndTariffs(
      data.sourceCountry,
      data.targetCountry,
      data.amount,
      data.currency,
      data.energyType || 'electricity',
      data.customsTariff,
    );
  }

  private calculateTotalAmount(
    transactionData: CreateInternationalTradeDto,
    conversionResult: ConversionResult | null,
    customsResult: any,
  ): number {
    let total = conversionResult?.totalAmount || transactionData.amount;

    if (customsResult) {
      total += customsResult.tariff || 0;
      total += customsResult.regulatoryFees || 0;
    }

    return total;
  }

  private mapComplianceStatus(complianceStatus: string): ComplianceStatus {
    switch (complianceStatus) {
      case 'compliant':
        return ComplianceStatus.COMPLIANT;
      case 'non_compliant':
        return ComplianceStatus.NON_COMPLIANT;
      case 'pending_review':
        return ComplianceStatus.PENDING_REVIEW;
      default:
        return ComplianceStatus.PENDING_REVIEW;
    }
  }

  private updateMetrics(processingTime: number, success: boolean): void {
    this.processingMetrics.totalTransactions++;

    const totalTime =
      this.processingMetrics.averageProcessingTime *
        (this.processingMetrics.totalTransactions - 1) +
      processingTime;
    this.processingMetrics.averageProcessingTime =
      totalTime / this.processingMetrics.totalTransactions;

    this.processingMetrics.complianceRate =
      (this.processingMetrics.successfulTransactions /
        this.processingMetrics.totalTransactions) *
      100;
  }

  async getTransactionById(
    transactionId: string,
  ): Promise<CrossBorderTransaction | null> {
    return this.transactionRepository.findOne({ where: { transactionId } });
  }

  async getTransactionsByStatus(
    status: TransactionStatus,
  ): Promise<CrossBorderTransaction[]> {
    return this.transactionRepository.find({ where: { status } });
  }

  async getTransactionsByCountries(
    sourceCountry: string,
    targetCountry: string,
  ): Promise<CrossBorderTransaction[]> {
    return this.transactionRepository.find({
      where: { sourceCountry, targetCountry },
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionMetrics(): Promise<TransactionMetrics> {
    return { ...this.processingMetrics };
  }

  async retryFailedTransaction(
    transactionId: string,
  ): Promise<ProcessingResult> {
    const transaction = await this.getTransactionById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== TransactionStatus.FAILED) {
      throw new Error(`Transaction ${transactionId} is not in failed status`);
    }

    const retryData: CreateInternationalTradeDto = {
      transactionId: transaction.transactionId,
      transactionType: transaction.transactionType,
      sourceCountry: transaction.sourceCountry,
      targetCountry: transaction.targetCountry,
      amount: transaction.amount,
      currency: transaction.currency,
      notes: transaction.notes,
    };

    return this.processTransaction(retryData);
  }

  async cancelTransaction(
    transactionId: string,
    reason?: string,
  ): Promise<CrossBorderTransaction> {
    const transaction = await this.getTransactionById(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (
      [TransactionStatus.COMPLETED, TransactionStatus.CANCELLED].includes(
        transaction.status,
      )
    ) {
      throw new Error(
        `Cannot cancel transaction in ${transaction.status} status`,
      );
    }

    transaction.status = TransactionStatus.CANCELLED;
    transaction.notes = reason
      ? `${transaction.notes || ''} - Cancelled: ${reason}`
      : transaction.notes;

    return this.transactionRepository.save(transaction);
  }

  async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<CrossBorderTransaction[]> {
    return this.transactionRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getHighValueTransactions(
    threshold: number,
  ): Promise<CrossBorderTransaction[]> {
    return this.transactionRepository.find({
      where: {
        amount: MoreThanOrEqual(threshold),
      },
      order: { amount: 'DESC' },
    });
  }

  async getPendingComplianceTransactions(): Promise<CrossBorderTransaction[]> {
    return this.transactionRepository.find({
      where: {
        complianceStatus: ComplianceStatus.PENDING_REVIEW,
      },
    });
  }

  async processBatchTransactions(
    transactions: CreateInternationalTradeDto[],
  ): Promise<ProcessingResult[]> {
    this.logger.log(`Processing batch of ${transactions.length} transactions`);

    const results = await Promise.allSettled(
      transactions.map((transaction) => this.processTransaction(transaction)),
    );

    return results.map((result) =>
      result.status === 'fulfilled'
        ? result.value
        : {
            success: false,
            transaction: null as any,
            errors: [result.reason.message],
            processingTime: 0,
          },
    );
  }
}

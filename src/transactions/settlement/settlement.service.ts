import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Cron, Timeout } from '@nestjs/schedule';
import { SettlementRecord } from '../entities/settlement-record.entity';
import { Transaction } from '../entities/transaction.entity';
import { SettlementStatus } from '../enums/transaction.enum';

export interface SettlementResult {
  success: boolean;
  settlementId: string;
  transactionId: string;
  status: SettlementStatus;
  processingTime: number;
  settlementMethod: string;
  blockchainHash?: string;
  externalReference?: string;
  errors?: string[];
}

export interface SettlementMetrics {
  totalSettlements: number;
  successfulSettlements: number;
  failedSettlements: number;
  averageSettlementTime: number;
  settlementRate: number;
  settlementMethods: Record<string, number>;
  dailyVolume: number;
  successRate: number;
}

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);
  private readonly settlementMetrics: SettlementMetrics = {
    totalSettlements: 0,
    successfulSettlements: 0,
    failedSettlements: 0,
    averageSettlementTime: 0,
    settlementRate: 0,
    settlementMethods: {},
    dailyVolume: 0,
    successRate: 0,
  };

  // Settlement performance targets
  private readonly SETTLEMENT_TARGETS = {
    MAX_PROCESSING_TIME: 2000, // 2 seconds
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    BATCH_SIZE: 100,
    CONCURRENT_SETTLEMENTS: 50,
  };

  // Payment method configurations
  private readonly PAYMENT_METHODS = {
    STELLAR: 'stellar',
    BANK_TRANSFER: 'bank_transfer',
    CRYPTO: 'crypto',
    ESCROW: 'escrow',
    INSTANT: 'instant',
    DEFERRED: 'deferred',
  };

  constructor(
    @InjectRepository(SettlementRecord)
    private readonly settlementRepository: Repository<SettlementRecord>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  async settleTransaction(transactionId: string, method?: string): Promise<SettlementResult> {
    const startTime = Date.now();
    const settlementId = `settlement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`Initiating settlement for transaction: ${transactionId}, settlement: ${settlementId}`);

    try {
      // Get transaction details
      const transaction = await this.transactionRepository.findOne({
        where: { transactionId }
      });

      if (!transaction) {
        throw new Error(`Transaction ${transactionId} not found`);
      }

      if (transaction.status !== 'completed') {
        throw new Error(`Transaction ${transactionId} is not in completed status`);
      }

      // Create settlement record
      const settlementRecord = this.createSettlementRecord(transaction, settlementId, method);
      await this.settlementRepository.save(settlementRecord);

      // Process settlement based on method
      const result = await this.processSettlement(transaction, settlementRecord, startTime);

      // Update metrics
      this.updateSettlementMetrics(result.processingTime, result.success, method);

      this.logger.log(
        `Settlement ${settlementId} completed in ${result.processingTime}ms. ` +
        `Success: ${result.success}, Method: ${result.settlementMethod}`
      );

      return result;
    } catch (error) {
      this.logger.error(`Settlement failed for transaction ${transactionId}:`, error);
      const processingTime = Date.now() - startTime;
      
      // Update failed metrics
      this.updateSettlementMetrics(processingTime, false, method);

      return {
        success: false,
        settlementId,
        transactionId,
        status: SettlementStatus.FAILED,
        processingTime,
        settlementMethod: method || 'unknown',
        errors: [error.message],
      };
    }
  }

  private createSettlementRecord(
    transaction: Transaction,
    settlementId: string,
    method?: string
  ): SettlementRecord {
    const settlement = new SettlementRecord();
    settlement.settlementId = settlementId;
    settlement.transactionId = transaction.transactionId;
    settlement.amount = transaction.amount;
    settlement.currency = transaction.currency;
    settlement.settlementMethod = method || this.determineOptimalSettlementMethod(transaction);
    settlement.sourceAccount = transaction.sourcePublicKey;
    settlement.targetAccount = transaction.targetPublicKey;
    settlement.fee = transaction.fee;
    settlement.exchangeRate = transaction.exchangeRate;
    settlement.status = SettlementStatus.PENDING;

    return settlement;
  }

  private determineOptimalSettlementMethod(transaction: Transaction): string {
    // Determine optimal settlement method based on transaction characteristics
    if (transaction.amount < 1000) {
      return this.PAYMENT_METHODS.INSTANT;
    } else if (transaction.amount < 10000) {
      return this.PAYMENT_METHODS.STELLAR;
    } else if (transaction.sourceCountry !== transaction.targetCountry) {
      return this.PAYMENT_METHODS.ESCROW;
    } else {
      return this.PAYMENT_METHODS.BANK_TRANSFER;
    }
  }

  private async processSettlement(
    transaction: Transaction,
    settlementRecord: SettlementRecord,
    startTime: number
  ): Promise<SettlementResult> {
    const method = settlementRecord.settlementMethod;
    let result: SettlementResult;

    switch (method) {
      case this.PAYMENT_METHODS.STELLAR:
        result = await this.processStellarSettlement(transaction, settlementRecord);
        break;
      case this.PAYMENT_METHODS.INSTANT:
        result = await this.processInstantSettlement(transaction, settlementRecord);
        break;
      case this.PAYMENT_METHODS.BANK_TRANSFER:
        result = await this.processBankTransferSettlement(transaction, settlementRecord);
        break;
      case this.PAYMENT_METHODS.ESCROW:
        result = await this.processEscrowSettlement(transaction, settlementRecord);
        break;
      default:
        result = await this.processDefaultSettlement(transaction, settlementRecord);
        break;
    }

    // Update settlement record
    await this.updateSettlementRecord(settlementRecord.settlementId, result);

    result.processingTime = Date.now() - startTime;

    // Check if we met the 2-second target
    if (result.processingTime > this.SETTLEMENT_TARGETS.MAX_PROCESSING_TIME) {
      this.logger.warn(
        `Settlement ${settlementRecord.settlementId} exceeded 2-second target: ${result.processingTime}ms`
      );
    }

    return result;
  }

  private async processStellarSettlement(
    transaction: Transaction,
    settlementRecord: SettlementRecord
  ): Promise<SettlementResult> {
    try {
      // Simulate Stellar blockchain settlement
      this.logger.log(`Processing Stellar settlement for ${transaction.transactionId}`);

      // In a real implementation, this would interact with Stellar SDK
      const stellarTxHash = `stellar_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;

      // Simulate processing time (should be under 2 seconds)
      await this.simulateProcessingTime(500, 1500);

      return {
        success: true,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.COMPLETED,
        processingTime: 0, // Will be set by caller
        settlementMethod: this.PAYMENT_METHODS.STELLAR,
        blockchainHash: stellarTxHash,
      };
    } catch (error) {
      return {
        success: false,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.FAILED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.STELLAR,
        errors: [error.message],
      };
    }
  }

  private async processInstantSettlement(
    transaction: Transaction,
    settlementRecord: SettlementRecord
  ): Promise<SettlementResult> {
    try {
      this.logger.log(`Processing instant settlement for ${transaction.transactionId}`);

      // Instant settlements should complete in under 500ms
      await this.simulateProcessingTime(100, 400);

      const externalRef = `instant_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      return {
        success: true,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.COMPLETED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.INSTANT,
        externalReference: externalRef,
      };
    } catch (error) {
      return {
        success: false,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.FAILED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.INSTANT,
        errors: [error.message],
      };
    }
  }

  private async processBankTransferSettlement(
    transaction: Transaction,
    settlementRecord: SettlementRecord
  ): Promise<SettlementResult> {
    try {
      this.logger.log(`Processing bank transfer settlement for ${transaction.transactionId}`);

      // Bank transfers take longer but should still complete in under 2 seconds for internal processing
      await this.simulateProcessingTime(800, 1800);

      const externalRef = `bank_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      return {
        success: true,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.COMPLETED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.BANK_TRANSFER,
        externalReference: externalRef,
      };
    } catch (error) {
      return {
        success: false,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.FAILED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.BANK_TRANSFER,
        errors: [error.message],
      };
    }
  }

  private async processEscrowSettlement(
    transaction: Transaction,
    settlementRecord: SettlementRecord
  ): Promise<SettlementResult> {
    try {
      this.logger.log(`Processing escrow settlement for ${transaction.transactionId}`);

      // Escrow settlements involve additional verification steps
      await this.simulateProcessingTime(1000, 1900);

      const escrowRef = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      return {
        success: true,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.COMPLETED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.ESCROW,
        externalReference: escrowRef,
      };
    } catch (error) {
      return {
        success: false,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.FAILED,
        processingTime: 0,
        settlementMethod: this.PAYMENT_METHODS.ESCROW,
        errors: [error.message],
      };
    }
  }

  private async processDefaultSettlement(
    transaction: Transaction,
    settlementRecord: SettlementRecord
  ): Promise<SettlementResult> {
    try {
      this.logger.log(`Processing default settlement for ${transaction.transactionId}`);

      await this.simulateProcessingTime(300, 1200);

      return {
        success: true,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.COMPLETED,
        processingTime: 0,
        settlementMethod: 'default',
      };
    } catch (error) {
      return {
        success: false,
        settlementId: settlementRecord.settlementId,
        transactionId: transaction.transactionId,
        status: SettlementStatus.FAILED,
        processingTime: 0,
        settlementMethod: 'default',
        errors: [error.message],
      };
    }
  }

  private async simulateProcessingTime(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private async updateSettlementRecord(settlementId: string, result: SettlementResult): Promise<void> {
    await this.settlementRepository.update(
      { settlementId },
      {
        status: result.status,
        blockchainTransactionHash: result.blockchainHash,
        externalReference: result.externalReference,
        processedAt: new Date(),
        completedAt: result.success ? new Date() : null,
        failedAt: result.success ? null : new Date(),
        failureReason: result.errors?.join('; '),
        metadata: {
          processingTime: result.processingTime,
        },
      }
    );
  }

  private updateSettlementMetrics(processingTime: number, success: boolean, method?: string): void {
    this.settlementMetrics.totalSettlements++;

    if (success) {
      this.settlementMetrics.successfulSettlements++;
    } else {
      this.settlementMetrics.failedSettlements++;
    }

    // Update average processing time
    const totalTime = this.settlementMetrics.averageSettlementTime * (this.settlementMetrics.totalSettlements - 1) + processingTime;
    this.settlementMetrics.averageSettlementTime = totalTime / this.settlementMetrics.totalSettlements;

    // Update success rate
    this.settlementMetrics.successRate = (this.settlementMetrics.successfulSettlements / this.settlementMetrics.totalSettlements) * 100;

    // Update settlement method counts
    if (method) {
      this.settlementMetrics.settlementMethods[method] = (this.settlementMetrics.settlementMethods[method] || 0) + 1;
    }
  }

  async settleBatchTransactions(transactionIds: string[], method?: string): Promise<SettlementResult[]> {
    this.logger.log(`Processing batch settlement for ${transactionIds.length} transactions`);

    // Process settlements concurrently for high performance
    const batchSize = Math.min(transactionIds.length, this.SETTLEMENT_TARGETS.CONCURRENT_SETTLEMENTS);
    const results: SettlementResult[] = [];

    for (let i = 0; i < transactionIds.length; i += batchSize) {
      const batch = transactionIds.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(transactionId => this.settleTransaction(transactionId, method))
      );

      results.push(...batchResults.map(result =>
        result.status === 'fulfilled'
          ? result.value
          : {
              success: false,
              settlementId: '',
              transactionId: '',
              status: SettlementStatus.FAILED,
              processingTime: 0,
              settlementMethod: method || 'unknown',
              errors: [result.reason.message],
            }
      ));
    }

    return results;
  }

  async retryFailedSettlement(settlementId: string): Promise<SettlementResult> {
    const settlement = await this.settlementRepository.findOne({
      where: { settlementId }
    });

    if (!settlement) {
      throw new Error(`Settlement ${settlementId} not found`);
    }

    if (settlement.status !== SettlementStatus.FAILED) {
      throw new Error(`Settlement ${settlementId} is not in failed status`);
    }

    // Reset settlement status and retry
    await this.settlementRepository.update(
      { settlementId },
      { 
        status: SettlementStatus.PENDING,
        metadata: {
          ...settlement.metadata,
          retryCount: (settlement.metadata?.retryCount || 0) + 1,
          lastRetryAt: new Date(),
        }
      }
    );

    return this.settleTransaction(settlement.transactionId, settlement.settlementMethod);
  }

  async getSettlementMetrics(): Promise<SettlementMetrics> {
    return { ...this.settlementMetrics };
  }

  async getSettlementById(settlementId: string): Promise<SettlementRecord | null> {
    return this.settlementRepository.findOne({ where: { settlementId } });
  }

  async getSettlementsByTransaction(transactionId: string): Promise<SettlementRecord[]> {
    return this.settlementRepository.find({ 
      where: { transactionId },
      order: { createdAt: 'DESC' }
    });
  }

  // Scheduled task to process pending settlements
  @Cron('*/5 * * * * *') // Every 5 seconds
  async processPendingSettlements(): Promise<void> {
    const pendingSettlements = await this.settlementRepository.find({
      where: { status: SettlementStatus.PENDING },
      take: this.SETTLEMENT_TARGETS.BATCH_SIZE,
    });

    if (pendingSettlements.length > 0) {
      this.logger.log(`Processing ${pendingSettlements.length} pending settlements`);
      
      await Promise.allSettled(
        pendingSettlements.map(settlement => 
          this.settleTransaction(settlement.transactionId, settlement.settlementMethod)
        )
      );
    }
  }

  // Daily metrics reset
  @Cron('0 0 * * *') // Midnight every day
  async resetDailyMetrics(): Promise<void> {
    this.settlementMetrics.dailyVolume = 0;
    this.logger.log('Daily settlement metrics reset');
  }
}

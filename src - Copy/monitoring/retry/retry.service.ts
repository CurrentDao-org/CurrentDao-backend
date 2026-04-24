import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TransactionStatusEntity,
  TransactionStatus,
  TransactionPriority,
} from '../entities/transaction-status.entity';
import { RetryTransactionDto } from '../dto/transaction-status.dto';

const StellarSdk = require('stellar-sdk');

export interface RetryStrategy {
  calculateDelay(attempt: number, priority: TransactionPriority): number;
  shouldRetry(error: any, attempt: number, maxRetries: number): boolean;
}

export class ExponentialBackoffStrategy implements RetryStrategy {
  calculateDelay(attempt: number, priority: TransactionPriority): number {
    const baseDelay = this.getBaseDelay(priority);
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000;
    return Math.min(exponentialDelay + jitter, 30000);
  }

  shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    if (attempt >= maxRetries) {
      return false;
    }

    const nonRetryableErrors = [
      'tx_insufficient_fee',
      'tx_no_source_account',
      'tx_bad_auth',
      'tx_bad_auth_extra',
      'tx_internal_error',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';

    return !nonRetryableErrors.some((nonRetryableError) =>
      errorMessage.includes(nonRetryableError),
    );
  }

  private getBaseDelay(priority: TransactionPriority): number {
    switch (priority) {
      case TransactionPriority.CRITICAL:
        return 1000;
      case TransactionPriority.HIGH:
        return 2000;
      case TransactionPriority.MEDIUM:
        return 5000;
      case TransactionPriority.LOW:
        return 10000;
      default:
        return 5000;
    }
  }
}

export class LinearBackoffStrategy implements RetryStrategy {
  calculateDelay(attempt: number, priority: TransactionPriority): number {
    const baseDelay = this.getBaseDelay(priority);
    return baseDelay * attempt;
  }

  shouldRetry(error: any, attempt: number, maxRetries: number): boolean {
    return attempt < maxRetries && this.isTransientError(error);
  }

  private isTransientError(error: any): boolean {
    const transientErrors = [
      'timeout',
      'network',
      'connection',
      'rate_limit',
      'server_error',
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    return transientErrors.some((transientError) =>
      errorMessage.includes(transientError),
    );
  }

  private getBaseDelay(priority: TransactionPriority): number {
    switch (priority) {
      case TransactionPriority.CRITICAL:
        return 500;
      case TransactionPriority.HIGH:
        return 1000;
      case TransactionPriority.MEDIUM:
        return 2000;
      case TransactionPriority.LOW:
        return 5000;
      default:
        return 2000;
    }
  }
}

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);
  private readonly retryQueue = new Map<string, NodeJS.Timeout>();
  private readonly activeRetries = new Set<string>();
  private readonly strategies: Map<string, RetryStrategy> = new Map();

  constructor(
    @InjectRepository(TransactionStatusEntity)
    private readonly transactionStatusRepository: Repository<TransactionStatusEntity>,
  ) {
    this.strategies.set('exponential', new ExponentialBackoffStrategy());
    this.strategies.set('linear', new LinearBackoffStrategy());
    this.strategies.set('default', new ExponentialBackoffStrategy());
  }

  async scheduleRetry(
    transaction: TransactionStatusEntity,
    strategy: string = 'exponential',
  ): Promise<void> {
    if (this.activeRetries.has(transaction.transactionHash)) {
      this.logger.warn(
        `Retry already in progress for transaction ${transaction.transactionHash}`,
      );
      return;
    }

    const retryStrategy =
      this.strategies.get(strategy) || this.strategies.get('default');

    if (
      !retryStrategy.shouldRetry(
        { message: transaction.errorMessage },
        transaction.retryCount,
        transaction.maxRetries,
      )
    ) {
      this.logger.log(
        `Transaction ${transaction.transactionHash} should not be retried`,
      );
      return;
    }

    const delay = retryStrategy.calculateDelay(
      transaction.retryCount + 1,
      transaction.priority,
    );

    this.activeRetries.add(transaction.transactionHash);

    const retryTimeout = setTimeout(async () => {
      try {
        await this.executeRetry(transaction);
      } catch (error) {
        this.logger.error(
          `Retry failed for transaction ${transaction.transactionHash}:`,
          error,
        );
      } finally {
        this.activeRetries.delete(transaction.transactionHash);
        this.retryQueue.delete(transaction.transactionHash);
      }
    }, delay);

    this.retryQueue.set(transaction.transactionHash, retryTimeout);

    await this.updateTransactionForRetry(transaction);

    this.logger.log(
      `Scheduled retry for transaction ${transaction.transactionHash} in ${delay}ms (attempt ${transaction.retryCount + 1}/${transaction.maxRetries})`,
    );
  }

  async manualRetry(
    retryDto: RetryTransactionDto,
  ): Promise<TransactionStatusEntity> {
    const transaction = await this.transactionStatusRepository.findOne({
      where: { id: retryDto.transactionId },
    });

    if (!transaction) {
      throw new Error(
        `Transaction with ID ${retryDto.transactionId} not found`,
      );
    }

    if (
      transaction.status !== TransactionStatus.FAILED &&
      transaction.status !== TransactionStatus.TIMEOUT
    ) {
      throw new Error(
        `Cannot retry transaction with status ${transaction.status}`,
      );
    }

    if (retryDto.priority) {
      transaction.priority = retryDto.priority;
    }

    if (retryDto.maxRetries) {
      transaction.maxRetries = retryDto.maxRetries;
    }

    await this.cancelRetry(transaction.transactionHash);

    await this.scheduleRetry(transaction);

    return transaction;
  }

  async executeRetry(transaction: TransactionStatusEntity): Promise<void> {
    this.logger.log(
      `Executing retry for transaction ${transaction.transactionHash}`,
    );

    try {
      const transactionStatus = await this.checkTransactionOnNetwork(
        transaction.transactionHash,
      );

      if (transactionStatus.successful) {
        await this.transactionStatusRepository.update(
          { transactionHash: transaction.transactionHash },
          {
            status: TransactionStatus.CONFIRMED,
            confirmedAt: new Date(),
            ledgerSequence: transactionStatus.ledger,
            errorMessage: undefined,
          },
        );

        this.logger.log(
          `Transaction ${transaction.transactionHash} was confirmed during retry check`,
        );
        return;
      }

      if (!transactionStatus.successful) {
        throw new Error(
          `Transaction failed on network: ${transactionStatus.result_xdr}`,
        );
      }
    } catch (error: any) {
      const retryStrategy = this.strategies.get('exponential');

      transaction.retryCount++;
      transaction.errorMessage = error.message;
      transaction.lastRetryAt = new Date();

      if (transaction.retryCount >= transaction.maxRetries) {
        transaction.status = TransactionStatus.FAILED;
        await this.transactionStatusRepository.save(transaction);

        this.logger.error(
          `Transaction ${transaction.transactionHash} failed after ${transaction.maxRetries} retries`,
        );

        throw new Error(
          `Transaction failed after maximum retries: ${error.message}`,
        );
      }

      if (
        retryStrategy.shouldRetry(
          error,
          transaction.retryCount,
          transaction.maxRetries,
        )
      ) {
        transaction.status = TransactionStatus.RETRYING;
        await this.transactionStatusRepository.save(transaction);

        await this.scheduleRetry(transaction);
      } else {
        transaction.status = TransactionStatus.FAILED;
        await this.transactionStatusRepository.save(transaction);

        this.logger.error(
          `Transaction ${transaction.transactionHash} marked as failed due to non-retryable error: ${error.message}`,
        );

        throw new Error(`Non-retryable error: ${error.message}`);
      }
    }
  }

  private async checkTransactionOnNetwork(
    transactionHash: string,
  ): Promise<any> {
    const StellarSdk = require('stellar-sdk');
    const server = new StellarSdk.Horizon.Server(
      process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    );

    try {
      return await server.transactions().transaction(transactionHash).call();
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Transaction not found on network');
      }
      throw error;
    }
  }

  private async updateTransactionForRetry(
    transaction: TransactionStatusEntity,
  ): Promise<void> {
    await this.transactionStatusRepository.update(
      { transactionHash: transaction.transactionHash },
      {
        status: TransactionStatus.RETRYING,
        retryCount: transaction.retryCount + 1,
        lastRetryAt: new Date(),
      },
    );
  }

  async cancelRetry(transactionHash: string): Promise<void> {
    const retryTimeout = this.retryQueue.get(transactionHash);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      this.retryQueue.delete(transactionHash);
      this.activeRetries.delete(transactionHash);

      await this.transactionStatusRepository.update(
        { transactionHash },
        { status: TransactionStatus.FAILED },
      );

      this.logger.log(`Cancelled retry for transaction ${transactionHash}`);
    }
  }

  async cancelAllRetries(): Promise<void> {
    const retryHashes = Array.from(this.retryQueue.keys());

    for (const hash of retryHashes) {
      await this.cancelRetry(hash);
    }

    this.logger.log(`Cancelled ${retryHashes.length} pending retries`);
  }

  getRetryStats(): {
    activeRetries: number;
    queuedRetries: number;
    retryStrategies: string[];
  } {
    return {
      activeRetries: this.activeRetries.size,
      queuedRetries: this.retryQueue.size,
      retryStrategies: Array.from(this.strategies.keys()),
    };
  }

  async getRetryHistory(transactionHash: string): Promise<{
    transactionHash: string;
    retryCount: number;
    maxRetries: number;
    lastRetryAt?: Date;
    retryHistory: Array<{
      attempt: number;
      timestamp: Date;
      error?: string;
      delay: number;
    }>;
  }> {
    const transaction = await this.transactionStatusRepository.findOne({
      where: { transactionHash },
    });

    if (!transaction) {
      throw new Error(`Transaction ${transactionHash} not found`);
    }

    const retryHistory: Array<{
      attempt: number;
      timestamp: Date;
      error?: string;
      delay: number;
    }> = [];

    for (let i = 1; i <= transaction.retryCount; i++) {
      const strategy = this.strategies.get('exponential');
      const delay = strategy.calculateDelay(i, transaction.priority);

      retryHistory.push({
        attempt: i,
        timestamp: new Date(transaction.createdAt.getTime() + delay * i),
        delay,
      });
    }

    return {
      transactionHash: transaction.transactionHash,
      retryCount: transaction.retryCount,
      maxRetries: transaction.maxRetries,
      lastRetryAt: transaction.lastRetryAt,
      retryHistory,
    };
  }

  async prioritizeRetries(): Promise<void> {
    const retryingTransactions = await this.transactionStatusRepository.find({
      where: { status: TransactionStatus.RETRYING },
      order: [{ priority: 'DESC' }, { lastRetryAt: 'ASC' }] as any,
    });

    for (const transaction of retryingTransactions) {
      if (!this.activeRetries.has(transaction.transactionHash)) {
        await this.scheduleRetry(transaction, 'exponential');
      }
    }

    this.logger.log(
      `Reprioritized ${retryingTransactions.length} retrying transactions`,
    );
  }

  registerRetryStrategy(name: string, strategy: RetryStrategy): void {
    this.strategies.set(name, strategy);
    this.logger.log(`Registered retry strategy: ${name}`);
  }

  getRetryStrategy(name: string): RetryStrategy | undefined {
    return this.strategies.get(name);
  }

  async onModuleDestroy(): Promise<void> {
    await this.cancelAllRetries();
  }
}

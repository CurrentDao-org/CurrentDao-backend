import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  TransactionStatusEntity,
  TransactionStatus,
  TransactionPriority,
} from './entities/transaction-status.entity';
import {
  CreateTransactionStatusDto,
  TransactionStatusQueryDto,
  TransactionAnalyticsDto,
} from './dto/transaction-status.dto';
import { RetryService } from './retry/retry.service';
import { AlertService } from './alerts/alert.service';

const StellarSdk = require('stellar-sdk');

@Injectable()
export class TransactionMonitorService implements OnModuleInit {
  private readonly logger = new Logger(TransactionMonitorService.name);
  private readonly server: any;
  private readonly monitoredTransactions = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectRepository(TransactionStatusEntity)
    private readonly transactionStatusRepository: Repository<TransactionStatusEntity>,
    private readonly retryService: RetryService,
    private readonly alertService: AlertService,
  ) {
    this.server = new StellarSdk.Horizon.Server(
      process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    );
  }

  async onModuleInit() {
    this.logger.log('Transaction Monitor Service initialized');
    await this.loadPendingTransactions();
  }

  async createTransaction(
    createDto: CreateTransactionStatusDto,
  ): Promise<TransactionStatusEntity> {
    const transaction = this.transactionStatusRepository.create({
      ...createDto,
      status: TransactionStatus.PENDING,
      retryCount: 0,
      maxRetries: createDto.maxRetries || 3,
    });

    const savedTransaction =
      await this.transactionStatusRepository.save(transaction);

    this.startMonitoring(savedTransaction.transactionHash);

    this.logger.log(
      `Created transaction monitor for ${savedTransaction.transactionHash}`,
    );
    return savedTransaction;
  }

  async getTransaction(
    transactionHash: string,
  ): Promise<TransactionStatusEntity | null> {
    return this.transactionStatusRepository.findOne({
      where: { transactionHash },
    });
  }

  async getTransactions(query: TransactionStatusQueryDto): Promise<{
    transactions: TransactionStatusEntity[];
    total: number;
  }> {
    const {
      status,
      priority,
      sourceAccount,
      destinationAccount,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (sourceAccount) where.sourceAccount = sourceAccount;
    if (destinationAccount) where.destinationAccount = destinationAccount;
    if (minAmount !== undefined) where.amount = MoreThan(minAmount);
    if (maxAmount !== undefined)
      where.amount = { ...where.amount, LessThan: maxAmount };
    if (startDate && endDate) {
      where.createdAt = Between(new Date(startDate), new Date(endDate));
    } else if (startDate) {
      where.createdAt = MoreThan(new Date(startDate));
    } else if (endDate) {
      where.createdAt = LessThan(new Date(endDate));
    }

    const [transactions, total] =
      await this.transactionStatusRepository.findAndCount({
        where,
        order: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      });

    return { transactions, total };
  }

  async updateTransactionStatus(
    transactionHash: string,
    status: TransactionStatus,
    errorMessage?: string,
  ): Promise<TransactionStatusEntity | null> {
    const transaction = await this.getTransaction(transactionHash);
    if (!transaction) {
      this.logger.warn(`Transaction ${transactionHash} not found`);
      return null;
    }

    const oldStatus = transaction.status;
    transaction.status = status;
    transaction.updatedAt = new Date();

    if (status === TransactionStatus.CONFIRMED) {
      transaction.confirmedAt = new Date();
      this.stopMonitoring(transactionHash);
      this.logger.log(`Transaction ${transactionHash} confirmed`);
    } else if (status === TransactionStatus.FAILED) {
      transaction.errorMessage = errorMessage || undefined;
      this.stopMonitoring(transactionHash);

      if (transaction.retryCount < transaction.maxRetries) {
        await this.retryService.scheduleRetry(transaction);
      } else {
        await this.alertService.sendCriticalAlert(
          `Transaction ${transactionHash} failed after ${transaction.maxRetries} retries`,
          { transactionHash, errorMessage, retryCount: transaction.retryCount },
        );
      }
    }

    await this.transactionStatusRepository.save(transaction);

    if (oldStatus !== status) {
      await this.alertService.sendStatusChangeAlert(
        transaction,
        oldStatus,
        status,
      );
    }

    return transaction;
  }

  private async loadPendingTransactions(): Promise<void> {
    const pendingTransactions = await this.transactionStatusRepository.find({
      where: { status: TransactionStatus.PENDING },
    });

    this.logger.log(
      `Loading ${pendingTransactions.length} pending transactions for monitoring`,
    );

    for (const transaction of pendingTransactions) {
      this.startMonitoring(transaction.transactionHash);
    }
  }

  private startMonitoring(transactionHash: string): void {
    if (this.monitoredTransactions.has(transactionHash)) {
      return;
    }

    const monitorInterval = setInterval(async () => {
      await this.checkTransactionStatus(transactionHash);
    }, 5000);

    this.monitoredTransactions.set(transactionHash, monitorInterval);
  }

  private stopMonitoring(transactionHash: string): void {
    const monitorInterval = this.monitoredTransactions.get(transactionHash);
    if (monitorInterval) {
      clearInterval(monitorInterval);
      this.monitoredTransactions.delete(transactionHash);
    }
  }

  private async checkTransactionStatus(transactionHash: string): Promise<void> {
    try {
      const transaction = await this.getTransaction(transactionHash);
      if (!transaction || transaction.status !== TransactionStatus.PENDING) {
        this.stopMonitoring(transactionHash);
        return;
      }

      const stellarTransaction = await this.server
        .transactions()
        .transaction(transactionHash)
        .call();

      if (stellarTransaction.successful) {
        await this.updateTransactionStatus(
          transactionHash,
          TransactionStatus.CONFIRMED,
        );

        await this.transactionStatusRepository.update(
          { transactionHash },
          { ledgerSequence: stellarTransaction.ledger },
        );
      } else {
        await this.updateTransactionStatus(
          transactionHash,
          TransactionStatus.FAILED,
          stellarTransaction.result_xdr ||
            'Transaction failed on Stellar network',
        );
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        return;
      }

      this.logger.error(
        `Error checking transaction ${transactionHash}:`,
        error,
      );

      const transaction = await this.getTransaction(transactionHash);
      if (transaction) {
        const now = new Date();
        const timeoutDuration = 5 * 60 * 1000;

        if (now.getTime() - transaction.createdAt.getTime() > timeoutDuration) {
          await this.updateTransactionStatus(
            transactionHash,
            TransactionStatus.TIMEOUT,
            'Transaction timed out',
          );
        }
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleTimeoutTransactions(): Promise<void> {
    const timeoutThreshold = new Date(Date.now() - 5 * 60 * 1000);

    const timeoutTransactions = await this.transactionStatusRepository.find({
      where: {
        status: TransactionStatus.PENDING,
        createdAt: LessThan(timeoutThreshold),
      },
    });

    for (const transaction of timeoutTransactions) {
      await this.updateTransactionStatus(
        transaction.transactionHash,
        TransactionStatus.TIMEOUT,
        'Transaction timed out after 5 minutes',
      );
    }
  }

  async getTransactionAnalytics(
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
  ): Promise<TransactionAnalyticsDto> {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const transactions = await this.transactionStatusRepository.find({
      where: {
        createdAt: MoreThan(startDate),
      },
    });

    const totalTransactions = transactions.length;
    const pendingTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.PENDING,
    ).length;
    const confirmedTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.CONFIRMED,
    ).length;
    const failedTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.FAILED,
    ).length;
    const retryingTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.RETRYING,
    ).length;
    const timeoutTransactions = transactions.filter(
      (t) => t.status === TransactionStatus.TIMEOUT,
    ).length;

    const successRate =
      totalTransactions > 0
        ? (confirmedTransactions / totalTransactions) * 100
        : 0;

    const confirmedTx = transactions.filter(
      (t) => t.status === TransactionStatus.CONFIRMED && t.confirmedAt,
    );
    const averageConfirmationTime =
      confirmedTx.length > 0
        ? confirmedTx.reduce((sum, tx) => {
            const time = tx.confirmedAt.getTime() - tx.createdAt.getTime();
            return sum + time;
          }, 0) /
          confirmedTx.length /
          1000
        : 0;

    const averageRetryCount =
      transactions.length > 0
        ? transactions.reduce((sum, tx) => sum + tx.retryCount, 0) /
          transactions.length
        : 0;

    const statusBreakdown = transactions.reduce(
      (acc, tx) => {
        acc[tx.status] = (acc[tx.status] || 0) + 1;
        return acc;
      },
      {} as Record<TransactionStatus, number>,
    );

    const priorityBreakdown = transactions.reduce(
      (acc, tx) => {
        acc[tx.priority] = (acc[tx.priority] || 0) + 1;
        return acc;
      },
      {} as Record<TransactionPriority, number>,
    );

    const hourlyStats = this.calculateHourlyStats(transactions, startDate, now);

    return {
      totalTransactions,
      pendingTransactions,
      confirmedTransactions,
      failedTransactions,
      retryingTransactions,
      timeoutTransactions,
      successRate,
      averageConfirmationTime,
      averageRetryCount,
      statusBreakdown,
      priorityBreakdown,
      hourlyStats,
    };
  }

  private calculateHourlyStats(
    transactions: TransactionStatusEntity[],
    startDate: Date,
    endDate: Date,
  ): Record<
    string,
    { count: number; successRate: number; averageTime: number }
  > {
    const hourlyStats: Record<
      string,
      { count: number; successRate: number; averageTime: number }
    > = {};
    const hours = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (60 * 60 * 1000),
    );

    for (let i = 0; i < hours; i++) {
      const hourStart = new Date(startDate.getTime() + i * 60 * 60 * 1000);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      const hourKey = hourStart.toISOString().substring(0, 13);

      const hourTransactions = transactions.filter(
        (tx) => tx.createdAt >= hourStart && tx.createdAt < hourEnd,
      );

      const confirmedInHour = hourTransactions.filter(
        (tx) => tx.status === TransactionStatus.CONFIRMED,
      );
      const successRate =
        hourTransactions.length > 0
          ? (confirmedInHour.length / hourTransactions.length) * 100
          : 0;

      const avgTime =
        confirmedInHour.length > 0
          ? confirmedInHour.reduce((sum, tx) => {
              if (tx.confirmedAt) {
                return (
                  sum +
                  (tx.confirmedAt.getTime() - tx.createdAt.getTime()) / 1000
                );
              }
              return sum;
            }, 0) / confirmedInHour.length
          : 0;

      hourlyStats[hourKey] = {
        count: hourTransactions.length,
        successRate,
        averageTime: avgTime,
      };
    }

    return hourlyStats;
  }

  async archiveOldTransactions(): Promise<void> {
    const archiveThreshold = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    const oldTransactions = await this.transactionStatusRepository.find({
      where: {
        createdAt: LessThan(archiveThreshold),
        isArchived: false,
      },
    });

    for (const transaction of oldTransactions) {
      transaction.isArchived = true;
      await this.transactionStatusRepository.save(transaction);
    }

    this.logger.log(`Archived ${oldTransactions.length} old transactions`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async performDailyMaintenance(): Promise<void> {
    await this.archiveOldTransactions();
    await this.cleanupExpiredTransactions();
  }

  private async cleanupExpiredTransactions(): Promise<void> {
    const expiredTransactions = await this.transactionStatusRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
        status: TransactionStatus.PENDING,
      },
    });

    for (const transaction of expiredTransactions) {
      await this.updateTransactionStatus(
        transaction.transactionHash,
        TransactionStatus.FAILED,
        'Transaction expired',
      );
    }

    this.logger.log(
      `Cleaned up ${expiredTransactions.length} expired transactions`,
    );
  }

  getMonitoringStats(): {
    activeMonitors: number;
    totalTransactions: number;
    pendingTransactions: number;
  } {
    return {
      activeMonitors: this.monitoredTransactions.size,
      totalTransactions: 0,
      pendingTransactions: 0,
    };
  }
}

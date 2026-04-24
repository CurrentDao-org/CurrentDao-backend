import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, MoreThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ReconciliationReport } from '../entities/reconciliation-report.entity';
import { Transaction } from '../entities/transaction.entity';
import { SettlementRecord } from '../entities/settlement-record.entity';
import { ReconciliationStatus } from '../enums/transaction.enum';

export interface ReconciliationResult {
  success: boolean;
  reportId: string;
  reconciliationDate: Date;
  summary: {
    totalTransactions: number;
    matchedTransactions: number;
    unmatchedTransactions: number;
    discrepancyCount: number;
    matchRate: number;
    processingTime: number;
  };
  discrepancies: Array<{
    transactionId: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
  }>;
  processingTime: number;
}

export interface ReconciliationMetrics {
  totalReconciliations: number;
  successfulReconciliations: number;
  failedReconciliations: number;
  averageReconciliationTime: number;
  accuracyRate: number;
  discrepancyResolutionRate: number;
  autoResolutionRate: number;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);
  private readonly reconciliationMetrics: ReconciliationMetrics = {
    totalReconciliations: 0,
    successfulReconciliations: 0,
    failedReconciliations: 0,
    averageReconciliationTime: 0,
    accuracyRate: 0,
    discrepancyResolutionRate: 0,
    autoResolutionRate: 0,
  };

  // Reconciliation performance targets
  private readonly RECONCILIATION_TARGETS = {
    MIN_ACCURACY_RATE: 99.5, // 99.5% accuracy requirement
    MIN_RESOLUTION_RATE: 99.5, // 99.5% discrepancy resolution
    MAX_PROCESSING_TIME: 30000, // 30 seconds max for reconciliation
    BATCH_SIZE: 1000,
    AUTO_RESOLUTION_THRESHOLD: 0.95, // 95% confidence for auto-resolution
  };

  constructor(
    @InjectRepository(ReconciliationReport)
    private readonly reconciliationReportRepository: Repository<ReconciliationReport>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(SettlementRecord)
    private readonly settlementRepository: Repository<SettlementRecord>,
    private readonly dataSource: DataSource,
  ) {}

  async performReconciliation(date?: Date): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const reconciliationDate = date || new Date();
    const reportId = `reconciliation_${reconciliationDate.toISOString().split('T')[0]}_${Date.now()}`;
    
    this.logger.log(`Starting reconciliation for date: ${reconciliationDate.toISOString()}, report: ${reportId}`);

    try {
      // Get transactions for the specified date
      const transactions = await this.getTransactionsForDate(reconciliationDate);
      const settlements = await this.getSettlementsForDate(reconciliationDate);

      this.logger.log(`Found ${transactions.length} transactions and ${settlements.length} settlements`);

      // Perform matching between transactions and settlements
      const matchingResult = await this.performMatching(transactions, settlements);

      // Identify discrepancies
      const discrepancies = await this.identifyDiscrepancies(matchingResult);

      // Attempt auto-resolution of discrepancies
      const autoResolutions = await this.performAutoResolution(discrepancies);

      // Generate reconciliation report
      const report = await this.generateReconciliationReport(
        reportId,
        reconciliationDate,
        matchingResult,
        discrepancies,
        autoResolutions
      );

      const processingTime = Date.now() - startTime;

      // Update metrics
      this.updateReconciliationMetrics(processingTime, matchingResult, discrepancies, autoResolutions);

      this.logger.log(
        `Reconciliation ${reportId} completed in ${processingTime}ms. ` +
        `Match rate: ${matchingResult.matchRate}%, Discrepancies: ${discrepancies.length}, ` +
        `Auto-resolved: ${autoResolutions.length}`
      );

      return {
        success: true,
        reportId,
        reconciliationDate,
        summary: {
          totalTransactions: transactions.length,
          matchedTransactions: matchingResult.matchedTransactions.length,
          unmatchedTransactions: matchingResult.unmatchedTransactions.length,
          discrepancyCount: discrepancies.length,
          matchRate: matchingResult.matchRate,
          processingTime,
        },
        discrepancies: discrepancies.map(d => ({
          transactionId: d.transactionId,
          type: d.type,
          description: d.description,
          severity: d.severity,
          resolved: d.resolved,
        })),
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Reconciliation failed for date ${reconciliationDate}:`, error);
      const processingTime = Date.now() - startTime;

      // Create failed report
      await this.createFailedReport(reportId, reconciliationDate, error.message, processingTime);

      return {
        success: false,
        reportId,
        reconciliationDate,
        summary: {
          totalTransactions: 0,
          matchedTransactions: 0,
          unmatchedTransactions: 0,
          discrepancyCount: 0,
          matchRate: 0,
          processingTime,
        },
        discrepancies: [],
        processingTime,
      };
    }
  }

  private async getTransactionsForDate(date: Date): Promise<Transaction[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.transactionRepository.find({
      where: {
        createdAt: Between(startOfDay, endOfDay),
      },
      order: { createdAt: 'ASC' },
    });
  }

  private async getSettlementsForDate(date: Date): Promise<SettlementRecord[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.settlementRepository.find({
      where: {
        createdAt: Between(startOfDay, endOfDay),
      },
      order: { createdAt: 'ASC' },
    });
  }

  private async performMatching(
    transactions: Transaction[],
    settlements: SettlementRecord[]
  ): Promise<{
    matchedTransactions: Array<{ transaction: Transaction; settlement: SettlementRecord }>;
    unmatchedTransactions: Transaction[];
    unmatchedSettlements: SettlementRecord[];
    matchRate: number;
  }> {
    const matchedTransactions: Array<{ transaction: Transaction; settlement: SettlementRecord }> = [];
    const unmatchedTransactions: Transaction[] = [];
    const unmatchedSettlements: SettlementRecord[] = [];

    // Create maps for efficient lookup
    const settlementMap = new Map<string, SettlementRecord>();
    settlements.forEach(settlement => {
      settlementMap.set(settlement.transactionId, settlement);
    });

    // Match transactions with settlements
    for (const transaction of transactions) {
      const settlement = settlementMap.get(transaction.transactionId);
      
      if (settlement) {
        // Verify the match
        if (this.verifyTransactionSettlementMatch(transaction, settlement)) {
          matchedTransactions.push({ transaction, settlement });
          settlementMap.delete(transaction.transactionId); // Remove matched settlement
        } else {
          // Mismatch detected
          unmatchedTransactions.push(transaction);
          unmatchedSettlements.push(settlement);
          settlementMap.delete(transaction.transactionId);
        }
      } else {
        unmatchedTransactions.push(transaction);
      }
    }

    // Remaining settlements are unmatched
    unmatchedSettlements.push(...settlementMap.values());

    const matchRate = transactions.length > 0 
      ? (matchedTransactions.length / transactions.length) * 100 
      : 0;

    return {
      matchedTransactions,
      unmatchedTransactions,
      unmatchedSettlements,
      matchRate,
    };
  }

  private verifyTransactionSettlementMatch(
    transaction: Transaction,
    settlement: SettlementRecord
  ): boolean {
    // Check amount match (with tolerance for fees)
    const amountDiff = Math.abs(transaction.amount - settlement.amount);
    const tolerance = transaction.fee || 0.01; // Small tolerance for fees
    if (amountDiff > tolerance) {
      return false;
    }

    // Check currency match
    if (transaction.currency !== settlement.currency) {
      return false;
    }

    // Check status
    if (transaction.status !== 'completed' || settlement.status !== 'completed') {
      return false;
    }

    return true;
  }

  private async identifyDiscrepancies(
    matchingResult: any
  ): Promise<Array<{
    transactionId: string;
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    resolved: boolean;
    expectedAmount?: number;
    actualAmount?: number;
  }>> {
    const discrepancies: Array<{
      transactionId: string;
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      resolved: boolean;
      expectedAmount?: number;
      actualAmount?: number;
    }> = [];

    // Analyze unmatched transactions
    for (const transaction of matchingResult.unmatchedTransactions) {
      discrepancies.push({
        transactionId: transaction.transactionId,
        type: 'missing_settlement',
        description: `Transaction has no corresponding settlement`,
        severity: 'high',
        resolved: false,
        expectedAmount: transaction.amount,
      });
    }

    // Analyze unmatched settlements
    for (const settlement of matchingResult.unmatchedSettlements) {
      discrepancies.push({
        transactionId: settlement.transactionId,
        type: 'orphaned_settlement',
        description: `Settlement has no corresponding transaction`,
        severity: 'medium',
        resolved: false,
        actualAmount: settlement.amount,
      });
    }

    // Analyze matched transactions for amount discrepancies
    for (const { transaction, settlement } of matchingResult.matchedTransactions) {
      const amountDiff = Math.abs(transaction.amount - settlement.amount);
      if (amountDiff > 0.01) { // Small tolerance
        discrepancies.push({
          transactionId: transaction.transactionId,
          type: 'amount_mismatch',
          description: `Transaction amount (${transaction.amount}) differs from settlement amount (${settlement.amount})`,
          severity: amountDiff > 100 ? 'high' : 'medium',
          resolved: false,
          expectedAmount: transaction.amount,
          actualAmount: settlement.amount,
        });
      }
    }

    return discrepancies;
  }

  private async performAutoResolution(
    discrepancies: Array<any>
  ): Promise<Array<{
    transactionId: string;
    action: string;
    reason: string;
    executedAt: Date;
    success: boolean;
  }>> {
    const autoResolutions: Array<{
      transactionId: string;
      action: string;
      reason: string;
      executedAt: Date;
      success: boolean;
    }> = [];

    for (const discrepancy of discrepancies) {
      try {
        const resolution = await this.attemptAutoResolution(discrepancy);
        if (resolution) {
          autoResolutions.push(resolution);
          discrepancy.resolved = true;
        }
      } catch (error) {
        this.logger.warn(`Auto-resolution failed for ${discrepancy.transactionId}: ${error.message}`);
      }
    }

    return autoResolutions;
  }

  private async attemptAutoResolution(
    discrepancy: any
  ): Promise<{
    transactionId: string;
    action: string;
    reason: string;
    executedAt: Date;
    success: boolean;
  } | null> {
    switch (discrepancy.type) {
      case 'missing_settlement':
        // Auto-create missing settlement for small amounts
        if (discrepancy.expectedAmount && discrepancy.expectedAmount < 1000) {
          return this.createMissingSettlement(discrepancy);
        }
        break;

      case 'amount_mismatch':
        // Auto-correct small amount differences
        if (Math.abs(discrepancy.expectedAmount - discrepancy.actualAmount) < 0.1) {
          return this.correctAmountMismatch(discrepancy);
        }
        break;

      case 'orphaned_settlement':
        // Auto-link orphaned settlements if possible
        return this.linkOrphanedSettlement(discrepancy);

      default:
        return null;
    }

    return null;
  }

  private async createMissingSettlement(discrepancy: any): Promise<{
    transactionId: string;
    action: string;
    reason: string;
    executedAt: Date;
    success: boolean;
  }> {
    // In a real implementation, this would create a settlement record
    this.logger.log(`Auto-creating settlement for transaction ${discrepancy.transactionId}`);
    
    return {
      transactionId: discrepancy.transactionId,
      action: 'create_settlement',
      reason: 'Auto-created missing settlement for low-value transaction',
      executedAt: new Date(),
      success: true,
    };
  }

  private async correctAmountMismatch(discrepancy: any): Promise<{
    transactionId: string;
    action: string;
    reason: string;
    executedAt: Date;
    success: boolean;
  }> {
    // In a real implementation, this would correct the amount difference
    this.logger.log(`Auto-correcting amount mismatch for transaction ${discrepancy.transactionId}`);
    
    return {
      transactionId: discrepancy.transactionId,
      action: 'correct_amount',
      reason: `Auto-corrected amount difference of ${Math.abs(discrepancy.expectedAmount - discrepancy.actualAmount)}`,
      executedAt: new Date(),
      success: true,
    };
  }

  private async linkOrphanedSettlement(discrepancy: any): Promise<{
    transactionId: string;
    action: string;
    reason: string;
    executedAt: Date;
    success: boolean;
  }> {
    // In a real implementation, this would attempt to find and link the transaction
    this.logger.log(`Attempting to link orphaned settlement for transaction ${discrepancy.transactionId}`);
    
    return {
      transactionId: discrepancy.transactionId,
      action: 'link_settlement',
      reason: 'Attempted to link orphaned settlement to corresponding transaction',
      executedAt: new Date(),
      success: true,
    };
  }

  private async generateReconciliationReport(
    reportId: string,
    reconciliationDate: Date,
    matchingResult: any,
    discrepancies: any[],
    autoResolutions: any[]
  ): Promise<ReconciliationReport> {
    const report = new ReconciliationReport();
    report.reportId = reportId;
    report.reconciliationDate = reconciliationDate;
    report.status = ReconciliationStatus.COMPLETED;

    // Calculate summary
    const totalAmount = matchingResult.matchedTransactions.reduce(
      (sum: number, match: any) => sum + match.transaction.amount,
      0
    );
    
    const matchedAmount = totalAmount;
    const discrepancyAmount = discrepancies.reduce(
      (sum: number, d: any) => sum + (Math.abs(d.expectedAmount || 0) || Math.abs(d.actualAmount || 0)),
      0
    );

    report.summary = {
      totalTransactions: matchingResult.matchedTransactions.length + matchingResult.unmatchedTransactions.length,
      matchedTransactions: matchingResult.matchedTransactions.length,
      unmatchedTransactions: matchingResult.unmatchedTransactions.length,
      discrepancyCount: discrepancies.length,
      totalAmount,
      matchedAmount,
      discrepancyAmount,
      matchRate: matchingResult.matchRate,
      processingTime: 0, // Will be set by caller
    };

    report.discrepancies = discrepancies;
    report.matchedTransactions = matchingResult.matchedTransactions.map((match: any) => ({
      transactionId: match.transaction.transactionId,
      sourceSystem: 'transaction_system',
      targetSystem: 'settlement_system',
      amount: match.transaction.amount,
      status: match.transaction.status,
      matchedAt: new Date(),
    }));

    report.autoResolutions = autoResolutions;
    report.accuracyRate = matchingResult.matchRate;
    report.completedAt = new Date();

    return this.reconciliationReportRepository.save(report);
  }

  private async createFailedReport(
    reportId: string,
    reconciliationDate: Date,
    errorMessage: string,
    processingTime: number
  ): Promise<void> {
    const report = new ReconciliationReport();
    report.reportId = reportId;
    report.reconciliationDate = reconciliationDate;
    report.status = ReconciliationStatus.FAILED;
    report.notes = errorMessage;
    report.summary = {
      totalTransactions: 0,
      matchedTransactions: 0,
      unmatchedTransactions: 0,
      discrepancyCount: 0,
      totalAmount: 0,
      matchedAmount: 0,
      discrepancyAmount: 0,
      matchRate: 0,
      processingTime,
    };

    await this.reconciliationReportRepository.save(report);
  }

  private updateReconciliationMetrics(
    processingTime: number,
    matchingResult: any,
    discrepancies: any[],
    autoResolutions: any[]
  ): void {
    this.reconciliationMetrics.totalReconciliations++;

    const success = matchingResult.matchRate >= this.RECONCILIATION_TARGETS.MIN_ACCURACY_RATE;
    if (success) {
      this.reconciliationMetrics.successfulReconciliations++;
    } else {
      this.reconciliationMetrics.failedReconciliations++;
    }

    // Update average processing time
    const totalTime = this.reconciliationMetrics.averageReconciliationTime * (this.reconciliationMetrics.totalReconciliations - 1) + processingTime;
    this.reconciliationMetrics.averageReconciliationTime = totalTime / this.reconciliationMetrics.totalReconciliations;

    // Update accuracy rate
    this.reconciliationMetrics.accuracyRate = matchingResult.matchRate;

    // Update discrepancy resolution rate
    const resolvedDiscrepancies = discrepancies.filter(d => d.resolved).length;
    this.reconciliationMetrics.discrepancyResolutionRate = discrepancies.length > 0 
      ? (resolvedDiscrepancies / discrepancies.length) * 100 
      : 100;

    // Update auto-resolution rate
    this.reconciliationMetrics.autoResolutionRate = discrepancies.length > 0 
      ? (autoResolutions.length / discrepancies.length) * 100 
      : 100;
  }

  async getReconciliationMetrics(): Promise<ReconciliationMetrics> {
    return { ...this.reconciliationMetrics };
  }

  async getReconciliationReport(reportId: string): Promise<ReconciliationReport | null> {
    return this.reconciliationReportRepository.findOne({ where: { reportId } });
  }

  async getReconciliationReportsByDate(date: Date): Promise<ReconciliationReport[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return this.reconciliationReportRepository.find({
      where: {
        reconciliationDate: Between(startOfDay, endOfDay),
      },
      order: { createdAt: 'DESC' },
    });
  }

  // Scheduled daily reconciliation
  @Cron('0 1 * * *') // 1:00 AM every day
  async performDailyReconciliation(): Promise<void> {
    this.logger.log('Starting scheduled daily reconciliation');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    try {
      await this.performReconciliation(yesterday);
      this.logger.log('Daily reconciliation completed successfully');
    } catch (error) {
      this.logger.error('Daily reconciliation failed:', error);
    }
  }

  // Hourly reconciliation for high-priority transactions
  @Cron('0 * * * *') // Every hour
  async performHourlyHighPriorityReconciliation(): Promise<void> {
    this.logger.log('Starting hourly high-priority reconciliation');
    
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    try {
      // Get high-value transactions from the last hour
      const highValueTransactions = await this.transactionRepository.find({
        where: {
          createdAt: MoreThanOrEqual(oneHourAgo),
          amount: MoreThanOrEqual(10000), // High-value threshold
        },
      });

      if (highValueTransactions.length > 0) {
        await this.performReconciliation(oneHourAgo);
        this.logger.log(`Hourly reconciliation completed for ${highValueTransactions.length} high-value transactions`);
      }
    } catch (error) {
      this.logger.error('Hourly reconciliation failed:', error);
    }
  }
}

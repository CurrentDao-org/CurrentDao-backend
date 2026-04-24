import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { TransactionAuditLog, AuditAction } from './entities/transaction-audit-log.entity';
import { CreateTransactionDto, BatchTransactionDto } from './dto/create-transaction.dto';
import { TransactionStatus, TransactionType } from './enums/transaction.enum';
import { TransactionValidatorService, ValidationResult } from './validation/transaction-validator.service';
import { SettlementService, SettlementResult } from './settlement/settlement.service';
import { ReconciliationService, ReconciliationResult } from './reconciliation/reconciliation.service';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { RegulatoryComplianceService } from './compliance/regulatory-compliance.service';

export interface TransactionProcessingResult {
  success: boolean;
  transaction: Transaction;
  validationResult?: ValidationResult;
  settlementResult?: SettlementResult;
  processingTime: number;
  errors?: string[];
}

export interface BatchProcessingResult {
  success: boolean;
  batchId: string;
  results: TransactionProcessingResult[];
  totalProcessingTime: number;
  throughput: number; // transactions per second
  errors?: string[];
}

export interface TransactionMetrics {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageProcessingTime: number;
  throughput: number;
  validationAccuracy: number;
  settlementSuccessRate: number;
  reconciliationAccuracy: number;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly transactionMetrics: TransactionMetrics = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    averageProcessingTime: 0,
    throughput: 0,
    validationAccuracy: 0,
    settlementSuccessRate: 0,
    reconciliationAccuracy: 0,
  };

  // High-volume processing targets
  private readonly PERFORMANCE_TARGETS = {
    MAX_PROCESSING_TIME: 100, // 100ms target
    MIN_THROUGHPUT: 100000, // 100k transactions/second
    MIN_VALIDATION_ACCURACY: 99.9, // 99.9% validation accuracy
    MIN_SETTLEMENT_SUCCESS_RATE: 99.5, // 99.5% settlement success rate
    MIN_RECONCILIATION_ACCURACY: 99.5, // 99.5% reconciliation accuracy
  };

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(TransactionAuditLog)
    private readonly auditLogRepository: Repository<TransactionAuditLog>,
    private readonly validatorService: TransactionValidatorService,
    private readonly settlementService: SettlementService,
    private readonly reconciliationService: ReconciliationService,
    private readonly performanceMonitor: PerformanceMonitorService,
    private readonly complianceService: RegulatoryComplianceService,
  ) {}

  async processTransaction(transactionData: CreateTransactionDto): Promise<TransactionProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing transaction: ${transactionData.transactionId}`);

    try {
      // Step 1: Validate transaction
      const validationResult = await this.validatorService.validateTransaction(transactionData);
      
      if (!validationResult.isValid) {
        await this.createAuditLog(transactionData.transactionId, AuditAction.FAILED, null, null, 'Validation failed');
        this.performanceMonitor.recordTransactionMetrics(transactionData.transactionId, Date.now() - startTime, false);
        
        return {
          success: false,
          transaction: null as any,
          validationResult,
          processingTime: Date.now() - startTime,
          errors: validationResult.errors,
        };
      }

      // Step 2: Create transaction entity
      const transaction = await this.createTransactionEntity(transactionData, validationResult);
      
      // Step 3: Save transaction
      const savedTransaction = await this.transactionRepository.save(transaction);
      
      // Step 4: Create audit log for creation
      await this.createAuditLog(
        savedTransaction.transactionId,
        AuditAction.CREATED,
        null,
        savedTransaction,
        'Transaction created successfully'
      );

      // Step 5: Process settlement (async for high-volume processing)
      let settlementResult: SettlementResult | undefined;
      try {
        settlementResult = await this.settlementService.settleTransaction(savedTransaction.transactionId);
        await this.createAuditLog(
          savedTransaction.transactionId,
          settlementResult.success ? AuditAction.SETTLED : AuditAction.FAILED,
          null,
          savedTransaction,
          settlementResult.success ? 'Settlement completed' : 'Settlement failed'
        );
      } catch (settlementError) {
        this.logger.error(`Settlement failed for transaction ${savedTransaction.transactionId}:`, settlementError);
        settlementResult = {
          success: false,
          settlementId: '',
          transactionId: savedTransaction.transactionId,
          status: 'failed' as any,
          processingTime: 0,
          settlementMethod: 'unknown',
          errors: [settlementError.message],
        };
      }

      // Step 6: Update transaction status
      const finalStatus = settlementResult?.success ? TransactionStatus.COMPLETED : TransactionStatus.FAILED;
      await this.transactionRepository.update(
        { transactionId: savedTransaction.transactionId },
        {
          status: finalStatus,
          processedAt: new Date(),
          completedAt: settlementResult?.success ? new Date() : null,
          failureReason: settlementResult?.success ? null : settlementResult?.errors?.join('; '),
        }
      );

      const processingTime = Date.now() - startTime;
      
      // Step 7: Record performance metrics
      this.performanceMonitor.recordTransactionMetrics(
        savedTransaction.transactionId,
        processingTime,
        settlementResult?.success || false
      );

      // Step 8: Update service metrics
      this.updateTransactionMetrics(processingTime, settlementResult?.success || false, validationResult);

      this.logger.log(
        `Transaction ${savedTransaction.transactionId} processed in ${processingTime}ms. ` +
        `Status: ${finalStatus}, Settlement: ${settlementResult?.success || false}`
      );

      return {
        success: settlementResult?.success || false,
        transaction: savedTransaction,
        validationResult,
        settlementResult,
        processingTime,
      };
    } catch (error) {
      this.logger.error(`Failed to process transaction ${transactionData.transactionId}:`, error);
      const processingTime = Date.now() - startTime;
      
      this.performanceMonitor.recordTransactionMetrics(transactionData.transactionId, processingTime, false);
      
      return {
        success: false,
        transaction: null as any,
        processingTime,
        errors: [error.message],
      };
    }
  }

  async processBatchTransactions(batchData: BatchTransactionDto): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const batchId = batchData.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.logger.log(`Processing batch ${batchId} with ${batchData.transactions.length} transactions`);

    try {
      const results: TransactionProcessingResult[] = [];
      
      // Process transactions concurrently for high throughput
      const concurrencyLimit = batchData.parallel ? 50 : 10;
      const chunks = this.chunkArray(batchData.transactions, concurrencyLimit);
      
      for (const chunk of chunks) {
        const chunkResults = await Promise.allSettled(
          chunk.map(transaction => this.processTransaction(transaction))
        );
        
        results.push(...chunkResults.map(result =>
          result.status === 'fulfilled'
            ? result.value
            : {
                success: false,
                transaction: null as any,
                processingTime: 0,
                errors: [result.reason.message],
              }
        ));
      }

      const totalProcessingTime = Date.now() - startTime;
      const throughput = batchData.transactions.length / (totalProcessingTime / 1000); // transactions per second
      const successCount = results.filter(r => r.success).length;

      this.logger.log(
        `Batch ${batchId} completed in ${totalProcessingTime}ms. ` +
        `Success: ${successCount}/${batchData.transactions.length}, ` +
        `Throughput: ${throughput.toFixed(2)} tx/s`
      );

      return {
        success: successCount === batchData.transactions.length,
        batchId,
        results,
        totalProcessingTime,
        throughput,
      };
    } catch (error) {
      this.logger.error(`Batch processing failed for batch ${batchId}:`, error);
      
      return {
        success: false,
        batchId,
        results: [],
        totalProcessingTime: Date.now() - startTime,
        throughput: 0,
        errors: [error.message],
      };
    }
  }

  private async createTransactionEntity(
    transactionData: CreateTransactionDto,
    validationResult: ValidationResult
  ): Promise<Transaction> {
    const transaction = new Transaction();
    transaction.transactionId = transactionData.transactionId;
    transaction.transactionType = transactionData.transactionType;
    transaction.status = TransactionStatus.PROCESSING;
    transaction.amount = transactionData.amount;
    transaction.currency = transactionData.currency;
    transaction.sourcePublicKey = transactionData.sourcePublicKey;
    transaction.targetPublicKey = transactionData.targetPublicKey;
    transaction.sourceCountry = transactionData.sourceCountry;
    transaction.targetCountry = transactionData.targetCountry;
    transaction.energyData = transactionData.energyData;
    transaction.fee = transactionData.fee;
    transaction.exchangeRate = transactionData.currencyConversion?.exchangeRate;
    transaction.notes = transactionData.notes;
    transaction.complianceData = {
      isCompliant: validationResult.complianceScore >= 80,
      complianceScore: validationResult.complianceScore,
      regulatoryChecks: ['basic_validation'],
      flags: validationResult.errors.length > 0 ? validationResult.errors : [],
    };

    return transaction;
  }

  private async createAuditLog(
    transactionId: string,
    action: AuditAction,
    previousState: any,
    newState: any,
    reason?: string
  ): Promise<void> {
    const auditLog = new TransactionAuditLog();
    auditLog.transactionId = transactionId;
    auditLog.action = action;
    auditLog.previousState = previousState;
    auditLog.newState = newState;
    auditLog.reason = reason;
    auditLog.metadata = {
      timestamp: new Date(),
    };

    await this.auditLogRepository.save(auditLog);
  }

  private updateTransactionMetrics(
    processingTime: number,
    success: boolean,
    validationResult: ValidationResult
  ): void {
    this.transactionMetrics.totalTransactions++;

    if (success) {
      this.transactionMetrics.successfulTransactions++;
    } else {
      this.transactionMetrics.failedTransactions++;
    }

    // Update average processing time
    const totalTime = this.transactionMetrics.averageProcessingTime * (this.transactionMetrics.totalTransactions - 1) + processingTime;
    this.transactionMetrics.averageProcessingTime = totalTime / this.transactionMetrics.totalTransactions;

    // Update validation accuracy
    if (validationResult) {
      const validationSuccess = validationResult.isValid;
      this.transactionMetrics.validationAccuracy = 
        ((this.transactionMetrics.validationAccuracy * (this.transactionMetrics.totalTransactions - 1)) + 
         (validationSuccess ? 100 : 0)) / this.transactionMetrics.totalTransactions;
    }

    // Update throughput (simplified - would be calculated over time windows)
    this.transactionMetrics.throughput = 1000 / this.transactionMetrics.averageProcessingTime;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    return this.transactionRepository.findOne({ where: { transactionId } });
  }

  async getTransactionsByStatus(status: TransactionStatus): Promise<Transaction[]> {
    return this.transactionRepository.find({ where: { status } });
  }

  async getTransactionsByDateRange(startDate: Date, endDate: Date): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: {
        createdAt: { $gte: startDate, $lte: endDate } as any,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getTransactionMetrics(): Promise<TransactionMetrics> {
    return { ...this.transactionMetrics };
  }

  async retryFailedTransaction(transactionId: string): Promise<TransactionProcessingResult> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== TransactionStatus.FAILED) {
      throw new Error(`Transaction ${transactionId} is not in failed status`);
    }

    // Create transaction data from existing transaction
    const transactionData: CreateTransactionDto = {
      transactionId: transaction.transactionId,
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      currency: transaction.currency,
      sourcePublicKey: transaction.sourcePublicKey,
      targetPublicKey: transaction.targetPublicKey,
      sourceCountry: transaction.sourceCountry,
      targetCountry: transaction.targetCountry,
      energyData: transaction.energyData,
      fee: transaction.fee,
      notes: transaction.notes,
    };

    // Reset transaction status
    await this.transactionRepository.update(
      { transactionId },
      { status: TransactionStatus.PENDING, failureReason: null }
    );

    // Create audit log for retry
    await this.createAuditLog(
      transactionId,
      AuditAction.UPDATED,
      { status: TransactionStatus.FAILED },
      { status: TransactionStatus.PENDING },
      'Transaction retry initiated'
    );

    return this.processTransaction(transactionData);
  }

  async cancelTransaction(transactionId: string, reason?: string): Promise<Transaction> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if ([TransactionStatus.COMPLETED, TransactionStatus.CANCELLED].includes(transaction.status)) {
      throw new Error(`Cannot cancel transaction in ${transaction.status} status`);
    }

    await this.transactionRepository.update(
      { transactionId },
      {
        status: TransactionStatus.CANCELLED,
        notes: reason ? `${transaction.notes || ''} - Cancelled: ${reason}` : transaction.notes,
      }
    );

    await this.createAuditLog(
      transactionId,
      AuditAction.CANCELLED,
      { status: transaction.status },
      { status: TransactionStatus.CANCELLED },
      reason || 'Transaction cancelled'
    );

    return this.getTransaction(transactionId) as Promise<Transaction>;
  }

  async performSystemHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    metrics: TransactionMetrics;
    alerts: string[];
    recommendations: string[];
  }> {
    const metrics = await this.getTransactionMetrics();
    const alerts: string[] = [];
    const recommendations: string[] = [];
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    // Check processing time
    if (metrics.averageProcessingTime > this.PERFORMANCE_TARGETS.MAX_PROCESSING_TIME) {
      alerts.push(`Average processing time (${metrics.averageProcessingTime.toFixed(2)}ms) exceeds target (${this.PERFORMANCE_TARGETS.MAX_PROCESSING_TIME}ms)`);
      status = 'degraded';
      recommendations.push('Optimize transaction processing logic and database queries');
    }

    // Check throughput
    if (metrics.throughput < this.PERFORMANCE_TARGETS.MIN_THROUGHPUT) {
      alerts.push(`Throughput (${metrics.throughput.toFixed(2)} tx/s) below target (${this.PERFORMANCE_TARGETS.MIN_THROUGHPUT} tx/s)`);
      status = 'critical';
      recommendations.push('Scale horizontally and optimize resource allocation');
    }

    // Check validation accuracy
    if (metrics.validationAccuracy < this.PERFORMANCE_TARGETS.MIN_VALIDATION_ACCURACY) {
      alerts.push(`Validation accuracy (${metrics.validationAccuracy.toFixed(2)}%) below target (${this.PERFORMANCE_TARGETS.MIN_VALIDATION_ACCURACY}%)`);
      status = 'critical';
      recommendations.push('Review and enhance validation rules');
    }

    // Check error rate
    const errorRate = (metrics.failedTransactions / metrics.totalTransactions) * 100;
    if (errorRate > 1) {
      alerts.push(`Error rate (${errorRate.toFixed(2)}%) exceeds acceptable threshold`);
      status = 'critical';
      recommendations.push('Investigate and address root causes of transaction failures');
    }

    return {
      status,
      metrics,
      alerts,
      recommendations,
    };
  }

  async getSystemPerformanceReport(): Promise<{
    overview: TransactionMetrics;
    performance: any;
    compliance: any;
    reconciliation: any;
    health: any;
  }> {
    const [overview, performance, compliance, reconciliation, health] = await Promise.all([
      this.getTransactionMetrics(),
      this.performanceMonitor.getPerformanceMetrics(),
      this.complianceService.getComplianceMetrics(),
      this.reconciliationService.getReconciliationMetrics(),
      this.performSystemHealthCheck(),
    ]);

    return {
      overview,
      performance,
      compliance,
      reconciliation,
      health,
    };
  }
}

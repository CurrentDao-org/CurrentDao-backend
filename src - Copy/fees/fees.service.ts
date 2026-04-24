/**
 * Fees Service
 * 
 * Main service for fee management, calculation, and settlement.
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FeeStructure, FeeType, FeeCategory } from '../entities/fee-structure.entity';
import { FeeTransaction, FeeStatus, FeeCollectionMethod, FeeBreakdown } from '../entities/fee-transaction.entity';
import { CalculateFeeDto } from '../dto/calculate-fee.dto';
import { FeeCalculatorService } from '../calculators/fee-calculator.service';

@Injectable()
export class FeesService {
  private readonly logger = new Logger(FeesService.name);
  
  // In-memory storage (replace with database in production)
  private feeStructures: Map<string, FeeStructure> = new Map();
  private feeTransactions: Map<string, FeeTransaction> = new Map();

  constructor(private readonly feeCalculator: FeeCalculatorService) {
    this.initializeDefaultFeeStructures();
  }

  /**
   * Initialize default fee structures
   */
  private initializeDefaultFeeStructures(): void {
    // Standard trading fee (percentage-based)
    const standardTradingFee: FeeStructure = {
      id: 'fee-standard-trading',
      name: 'Standard Trading Fee',
      description: 'Standard percentage-based fee for trading transactions',
      feeType: FeeType.PERCENTAGE,
      category: FeeCategory.TRADING,
      percentageRate: 0.5, // 0.5%
      minimumFee: 1,
      maximumFee: 100,
      currency: 'USD',
      isActive: true,
      volumeThreshold: 10000,
      volumeDiscountRate: 20, // 20% discount for high volume
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Fixed withdrawal fee
    const withdrawalFee: FeeStructure = {
      id: 'fee-withdrawal',
      name: 'Withdrawal Fee',
      description: 'Fixed fee for withdrawals',
      feeType: FeeType.FIXED,
      category: FeeCategory.WITHDRAWAL,
      fixedAmount: 5,
      currency: 'USD',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Tiered fee for large transactions
    const tieredFee: FeeStructure = {
      id: 'fee-tiered',
      name: 'Tiered Transaction Fee',
      description: 'Tiered fee structure based on transaction amount',
      feeType: FeeType.TIERED,
      category: FeeCategory.TRANSACTION,
      tiers: [
        { min: 0, max: 100, feeRate: 1.0 }, // 1% for first $100
        { min: 100, max: 1000, feeRate: 0.75 }, // 0.75% for $100-$1000
        { min: 1000, max: 10000, feeRate: 0.5 }, // 0.5% for $1000-$10000
        { min: 10000, feeRate: 0.25 }, // 0.25% above $10000
      ],
      currency: 'USD',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.feeStructures.set(standardTradingFee.id, standardTradingFee);
    this.feeStructures.set(withdrawalFee.id, withdrawalFee);
    this.feeStructures.set(tieredFee.id, tieredFee);

    this.logger.log('Initialized default fee structures');
  }

  /**
   * Calculate fee for a transaction
   */
  async calculateFee(dto: CalculateFeeDto): Promise<{
    transactionId: string;
    feeAmount: number;
    breakdown: FeeBreakdown;
    feeStructure: FeeStructure;
    timestamp: Date;
  }> {
    this.logger.debug(`Calculating fee for transaction: ${dto.transactionId}`);

    // Get appropriate fee structure
    const feeStructure = await this.getFeeStructure(dto.category, dto.feeType);

    if (!feeStructure) {
      throw new NotFoundException('No applicable fee structure found');
    }

    // Calculate fee using calculator service
    const { fee, breakdown } = this.feeCalculator.calculate(
      dto.amount,
      feeStructure,
      dto.userVolume,
    );

    this.logger.log(`Calculated fee: ${fee} for transaction: ${dto.transactionId}`);

    return {
      transactionId: dto.transactionId,
      feeAmount: fee,
      breakdown,
      feeStructure,
      timestamp: new Date(),
    };
  }

  /**
   * Record a fee transaction
   */
  async recordFeeTransaction(
    calculationResult: any,
    userId: string,
    collectionMethod: FeeCollectionMethod = FeeCollectionMethod.AUTOMATIC,
  ): Promise<FeeTransaction> {
    const transaction: FeeTransaction = {
      id: `fee-tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      transactionId: calculationResult.transactionId,
      transactionType: 'TRADING',
      userId,
      amount: calculationResult.amount,
      feeAmount: calculationResult.feeAmount,
      feeStructureId: calculationResult.feeStructure.id,
      breakdown: calculationResult.breakdown,
      currency: calculationResult.feeStructure.currency,
      status: FeeStatus.CALCULATED,
      collectionMethod,
      isPromotional: false,
      calculatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.feeTransactions.set(transaction.id, transaction);
    this.logger.debug(`Recorded fee transaction: ${transaction.id}`);

    return transaction;
  }

  /**
   * Get fee structure by category and type
   */
  async getFeeStructure(category?: FeeCategory, feeType?: FeeType): Promise<FeeStructure | null> {
    const structures = Array.from(this.feeStructures.values());

    const matching = structures.find(
      (s) =>
        s.isActive &&
        (!category || s.category === category) &&
        (!feeType || s.feeType === feeType) &&
        this.feeCalculator.isValidPeriod(s),
    );

    return matching || null;
  }

  /**
   * Get all fee structures
   */
  getAllFeeStructures(): FeeStructure[] {
    return Array.from(this.feeStructures.values());
  }

  /**
   * Get fee transaction by ID
   */
  getFeeTransaction(id: string): FeeTransaction | null {
    return this.feeTransactions.get(id) || null;
  }

  /**
   * Update fee transaction status
   */
  updateTransactionStatus(id: string, status: FeeStatus): FeeTransaction | null {
    const transaction = this.feeTransactions.get(id);
    
    if (!transaction) {
      return null;
    }

    transaction.status = status;
    transaction.updatedAt = new Date();

    if (status === FeeStatus.COLLECTED) {
      transaction.collectedAt = new Date();
    } else if (status === FeeStatus.SETTLED) {
      transaction.settledAt = new Date();
    }

    this.feeTransactions.set(id, transaction);
    this.logger.debug(`Updated transaction ${id} status to ${status}`);

    return transaction;
  }

  /**
   * Get fee analytics
   */
  getFeeAnalytics(period: { start: Date; end: Date }): {
    totalFees: number;
    transactionCount: number;
    averageFee: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const transactions = Array.from(this.feeTransactions.values()).filter(
      (tx) => tx.calculatedAt >= period.start && tx.calculatedAt <= period.end,
    );

    const totalFees = transactions.reduce((sum, tx) => sum + tx.feeAmount, 0);
    const transactionCount = transactions.length;
    const averageFee = transactionCount > 0 ? totalFees / transactionCount : 0;

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    transactions.forEach((tx) => {
      byCategory[tx.transactionType] = (byCategory[tx.transactionType] || 0) + tx.feeAmount;
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
    });

    return {
      totalFees,
      transactionCount,
      averageFee,
      byCategory,
      byStatus,
    };
  }
}

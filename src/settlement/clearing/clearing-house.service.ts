import { Injectable, Logger } from '@nestjs/common';
import { Transaction, Party } from '../dto/settlement.dto';

export interface ClearingSession {
  sessionId: string;
  status: 'INITIATED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  transactions: Transaction[];
  parties: Party[];
  startTime: Date;
  endTime?: Date;
  processedTransactions: number;
  failedTransactions: number;
  totalAmount: number;
}

export interface ClearingResult {
  sessionId: string;
  success: boolean;
  processedTransactions: Transaction[];
  failedTransactions: Transaction[];
  settlementAmounts: Record<string, number>;
  processingTimeMs: number;
  errors?: string[];
}

@Injectable()
export class ClearingHouseService {
  private readonly logger = new Logger(ClearingHouseService.name);
  private readonly clearingSessions = new Map<string, ClearingSession>();
  private readonly processingCapacity = 10000; // transactions per hour

  async processSettlement(
    settlementId: string,
    transactions: Transaction[],
    parties: Party[],
  ): Promise<ClearingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing settlement ${settlementId} with ${transactions.length} transactions`);

    try {
      // Create clearing session
      const sessionId = this.generateSessionId();
      const session: ClearingSession = {
        sessionId,
        status: 'INITIATED',
        transactions,
        parties,
        startTime: new Date(),
        processedTransactions: 0,
        failedTransactions: 0,
        totalAmount: this.calculateTotalAmount(transactions),
      };

      this.clearingSessions.set(sessionId, session);

      // Validate parties and transactions
      await this.validateSettlementData(transactions, parties);

      // Update session status
      session.status = 'PROCESSING';

      // Process transactions in batches
      const batchSize = 100;
      const processedTransactions: Transaction[] = [];
      const failedTransactions: Transaction[] = [];
      const settlementAmounts: Record<string, number> = {};

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const batchResult = await this.processBatch(batch, parties);

        processedTransactions.push(...batchResult.processed);
        failedTransactions.push(...batchResult.failed);

        // Update settlement amounts
        this.updateSettlementAmounts(settlementAmounts, batchResult.processed);

        // Update session progress
        session.processedTransactions = processedTransactions.length;
        session.failedTransactions = failedTransactions.length;

        // Simulate processing delay for realistic timing
        await this.simulateProcessingDelay(batch.length);
      }

      // Finalize settlement
      const finalSettlementAmounts = await this.finalizeSettlement(settlementAmounts, parties);

      const processingTime = Date.now() - startTime;
      const success = failedTransactions.length === 0;

      // Update session
      session.status = success ? 'COMPLETED' : 'FAILED';
      session.endTime = new Date();

      const result: ClearingResult = {
        sessionId,
        success,
        processedTransactions,
        failedTransactions,
        settlementAmounts: finalSettlementAmounts,
        processingTimeMs: processingTime,
        errors: failedTransactions.length > 0 ? ['Some transactions failed to process'] : undefined,
      };

      this.logger.log(`Settlement processing completed in ${processingTime}ms with ${failedTransactions.length} failures`);
      return result;

    } catch (error) {
      this.logger.error(`Settlement processing failed: ${error.message}`);
      throw error;
    }
  }

  async getClearingSession(sessionId: string): Promise<ClearingSession> {
    const session = this.clearingSessions.get(sessionId);
    if (!session) {
      throw new Error(`Clearing session ${sessionId} not found`);
    }
    return session;
  }

  async getClearingMetrics(timeRange?: string): Promise<any> {
    const sessions = Array.from(this.clearingSessions.values());
    const filteredSessions = this.filterSessionsByTimeRange(sessions, timeRange);

    const completedSessions = filteredSessions.filter(s => s.status === 'COMPLETED');
    const failedSessions = filteredSessions.filter(s => s.status === 'FAILED');

    const totalTransactions = filteredSessions.reduce((sum, s) => sum + s.transactions.length, 0);
    const totalAmount = filteredSessions.reduce((sum, s) => sum + s.totalAmount, 0);
    const averageProcessingTime = this.calculateAverageProcessingTime(completedSessions);

    return {
      totalSessions: filteredSessions.length,
      completedSessions: completedSessions.length,
      failedSessions: failedSessions.length,
      successRate: completedSessions.length / filteredSessions.length * 100,
      totalTransactions,
      totalAmount,
      averageProcessingTime,
      throughput: this.calculateThroughput(filteredSessions),
      processingCapacity: this.processingCapacity,
      capacityUtilization: (totalTransactions / this.processingCapacity) * 100,
      timestamp: new Date().toISOString(),
    };
  }

  async optimizeProcesses(optimizationRequest: any): Promise<any> {
    this.logger.log('Optimizing clearing house processes');

    // Simulate process optimization
    const optimization = {
      currentThroughput: 8500, // transactions per hour
      optimizedThroughput: 10500, // transactions per hour
      improvement: 23.5,
      optimizations: [
        {
          area: 'Batch Processing',
          current: 100,
          optimized: 250,
          improvement: 150,
        },
        {
          area: 'Validation',
          current: 50,
          optimized: 25,
          improvement: 50,
        },
        {
          area: 'Settlement Calculation',
          current: 200,
          optimized: 120,
          improvement: 40,
        },
      ],
      recommendations: [
        'Implement parallel transaction processing',
        'Optimize database queries for faster validation',
        'Add real-time monitoring and alerting',
        'Implement automated failover mechanisms',
      ],
      expectedBenefits: {
        reducedProcessingTime: 35,
        increasedCapacity: 23.5,
        improvedReliability: 15,
      },
    };

    return {
      optimization,
      timestamp: new Date().toISOString(),
    };
  }

  async validatePartyEligibility(partyId: string): Promise<any> {
    // Simulate party eligibility validation
    const eligibility = {
      partyId,
      eligible: Math.random() > 0.05, // 95% eligibility rate
      checks: {
        kycCompleted: true,
        creditRating: 'A+',
        regulatoryCompliance: true,
        marginSufficient: true,
        technicalIntegration: true,
      },
      lastValidated: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    return eligibility;
  }

  private async validateSettlementData(transactions: Transaction[], parties: Party[]): Promise<void> {
    // Validate all parties exist
    const partyIds = new Set(parties.map(p => p.id));
    
    for (const transaction of transactions) {
      if (!partyIds.has(transaction.fromPartyId)) {
        throw new Error(`Party ${transaction.fromPartyId} not found in settlement parties`);
      }
      if (!partyIds.has(transaction.toPartyId)) {
        throw new Error(`Party ${transaction.toPartyId} not found in settlement parties`);
      }
      
      if (transaction.amount <= 0) {
        throw new Error(`Invalid transaction amount: ${transaction.amount}`);
      }
    }
  }

  private async processBatch(transactions: Transaction[], parties: Party[]): Promise<{ processed: Transaction[], failed: Transaction[] }> {
    const processed: Transaction[] = [];
    const failed: Transaction[] = [];

    for (const transaction of transactions) {
      try {
        // Validate individual transaction
        await this.validateTransaction(transaction, parties);
        
        // Process transaction (simulated)
        await this.processIndividualTransaction(transaction);
        
        processed.push(transaction);
      } catch (error) {
        this.logger.error(`Transaction ${transaction.id} failed: ${error.message}`);
        failed.push(transaction);
      }
    }

    return { processed, failed };
  }

  private async validateTransaction(transaction: Transaction, parties: Party[]): Promise<void> {
    const fromParty = parties.find(p => p.id === transaction.fromPartyId);
    const toParty = parties.find(p => p.id === transaction.toPartyId);

    if (!fromParty || !toParty) {
      throw new Error('Invalid party in transaction');
    }

    // Check if from party has sufficient funds/collateral
    if (fromParty.collateralBalance < transaction.amount) {
      throw new Error(`Insufficient collateral for party ${fromParty.id}`);
    }
  }

  private async processIndividualTransaction(transaction: Transaction): Promise<void> {
    // Simulate transaction processing
    await new Promise(resolve => setTimeout(resolve, 1)); // 1ms processing time
  }

  private updateSettlementAmounts(settlementAmounts: Record<string, number>, transactions: Transaction[]): void {
    for (const transaction of transactions) {
      // Update from party (debit)
      settlementAmounts[transaction.fromPartyId] = 
        (settlementAmounts[transaction.fromPartyId] || 0) - transaction.amount;
      
      // Update to party (credit)
      settlementAmounts[transaction.toPartyId] = 
        (settlementAmounts[transaction.toPartyId] || 0) + transaction.amount;
    }
  }

  private async finalizeSettlement(settlementAmounts: Record<string, number>, parties: Party[]): Promise<Record<string, number>> {
    // Apply any final settlement logic or adjustments
    const finalAmounts = { ...settlementAmounts };

    // Apply settlement fees (0.1%)
    for (const [partyId, amount] of Object.entries(finalAmounts)) {
      const fee = Math.abs(amount) * 0.001;
      finalAmounts[partyId] = amount - fee;
    }

    return finalAmounts;
  }

  private calculateTotalAmount(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  private simulateProcessingDelay(transactionCount: number): Promise<void> {
    // Simulate realistic processing delay based on transaction count
    const delay = Math.min(transactionCount * 2, 100); // Max 100ms per batch
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private filterSessionsByTimeRange(sessions: ClearingSession[], timeRange?: string): ClearingSession[] {
    if (!timeRange) {
      // Default to last 24 hours
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return sessions.filter(s => s.startTime >= cutoff);
    }

    const hours = parseInt(timeRange.replace('h', ''));
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return sessions.filter(s => s.startTime >= cutoff);
  }

  private calculateAverageProcessingTime(sessions: ClearingSession[]): number {
    if (sessions.length === 0) return 0;

    const totalTime = sessions.reduce((sum, s) => {
      if (s.endTime) {
        return sum + (s.endTime.getTime() - s.startTime.getTime());
      }
      return sum;
    }, 0);

    return totalTime / sessions.length;
  }

  private calculateThroughput(sessions: ClearingSession[]): number {
    const totalTransactions = sessions.reduce((sum, s) => sum + s.processedTransactions, 0);
    const totalHours = sessions.reduce((sum, s) => {
      const duration = (s.endTime || new Date()).getTime() - s.startTime.getTime();
      return sum + (duration / (60 * 60 * 1000));
    }, 0);

    return totalHours > 0 ? totalTransactions / totalHours : 0;
  }

  private generateSessionId(): string {
    return `CS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

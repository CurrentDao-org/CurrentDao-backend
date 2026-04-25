import { Injectable, Logger } from '@nestjs/common';
import { NettingRequestDto, Transaction, TransactionType } from '../dto/settlement.dto';

export interface NettingResult {
  nettedTransactions: Transaction[];
  efficiency: number;
  originalVolume: number;
  nettedVolume: number;
  processingTimeMs: number;
}

@Injectable()
export class NettingEngineService {
  private readonly logger = new Logger(NettingEngineService.name);

  async performNetting(nettingRequest: NettingRequestDto): Promise<NettingResult> {
    const startTime = Date.now();
    this.logger.log(`Starting netting for ${nettingRequest.transactions.length} transactions`);

    try {
      const originalVolume = this.calculateTotalVolume(nettingRequest.transactions);
      
      // Apply multilateral netting algorithm
      const nettedTransactions = await this.applyMultilateralNetting(nettingRequest.transactions);
      
      const nettedVolume = this.calculateTotalVolume(nettedTransactions);
      const efficiency = this.calculateNettingEfficiency(originalVolume, nettedVolume);
      
      const processingTime = Date.now() - startTime;

      this.logger.log(`Netting completed with ${efficiency}% efficiency in ${processingTime}ms`);

      return {
        nettedTransactions,
        efficiency,
        originalVolume,
        nettedVolume,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      this.logger.error(`Netting failed: ${error.message}`);
      throw error;
    }
  }

  async optimizeAlgorithms(optimizationRequest: any): Promise<any> {
    this.logger.log('Optimizing netting algorithms');

    // Simulate algorithm optimization
    const optimizations = {
      multilateralNetting: {
        currentEfficiency: 65,
        optimizedEfficiency: 72,
        improvement: 10.8,
      },
      bilateralNetting: {
        currentEfficiency: 45,
        optimizedEfficiency: 52,
        improvement: 15.6,
      },
      cycleNetting: {
        currentEfficiency: 78,
        optimizedEfficiency: 85,
        improvement: 9.0,
      },
    };

    return {
      optimizations,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Implement enhanced cycle detection for better netting efficiency',
        'Optimize transaction grouping algorithms',
        'Add real-time netting capabilities',
      ],
    };
  }

  private async applyMultilateralNetting(transactions: Transaction[]): Promise<Transaction[]> {
    // Group transactions by currency and settlement cycle
    const currencyGroups = this.groupTransactionsByCurrency(transactions);
    const nettedTransactions: Transaction[] = [];

    for (const [currency, currencyTransactions] of Object.entries(currencyGroups)) {
      // Create party position matrix
      const positionMatrix = this.createPositionMatrix(currencyTransactions);
      
      // Apply netting algorithm
      const nettedPositions = this.calculateNettedPositions(positionMatrix);
      
      // Convert netted positions back to transactions
      const nettedCurrencyTransactions = this.convertPositionsToTransactions(
        nettedPositions,
        currency,
        currencyTransactions[0]?.timestamp || new Date(),
      );
      
      nettedTransactions.push(...nettedCurrencyTransactions);
    }

    return nettedTransactions;
  }

  private groupTransactionsByCurrency(transactions: Transaction[]): Record<string, Transaction[]> {
    const groups: Record<string, Transaction[]> = {};
    
    for (const transaction of transactions) {
      if (!groups[transaction.currency]) {
        groups[transaction.currency] = [];
      }
      groups[transaction.currency].push(transaction);
    }
    
    return groups;
  }

  private createPositionMatrix(transactions: Transaction[]): Record<string, Record<string, number>> {
    const positionMatrix: Record<string, Record<string, number>> = {};

    for (const transaction of transactions) {
      if (!positionMatrix[transaction.fromPartyId]) {
        positionMatrix[transaction.fromPartyId] = {};
      }
      if (!positionMatrix[transaction.toPartyId]) {
        positionMatrix[transaction.toPartyId] = {};
      }

      // Add debit position
      positionMatrix[transaction.fromPartyId][transaction.toPartyId] = 
        (positionMatrix[transaction.fromPartyId][transaction.toPartyId] || 0) - transaction.amount;
      
      // Add credit position
      positionMatrix[transaction.toPartyId][transaction.fromPartyId] = 
        (positionMatrix[transaction.toPartyId][transaction.fromPartyId] || 0) + transaction.amount;
    }

    return positionMatrix;
  }

  private calculateNettedPositions(positionMatrix: Record<string, Record<string, number>>): Record<string, Record<string, number>> {
    const nettedPositions: Record<string, Record<string, number>> = {};
    const parties = Object.keys(positionMatrix);

    for (const fromParty of parties) {
      nettedPositions[fromParty] = {};
      
      for (const toParty of parties) {
        if (fromParty === toParty) continue;
        
        const position = positionMatrix[fromParty][toParty] || 0;
        const reversePosition = positionMatrix[toParty][fromParty] || 0;
        
        // Net the positions
        const nettedPosition = position + reversePosition;
        
        if (Math.abs(nettedPosition) > 0.01) { // Only keep non-zero positions
          nettedPositions[fromParty][toParty] = nettedPosition;
        }
      }
    }

    return nettedPositions;
  }

  private convertPositionsToTransactions(
    nettedPositions: Record<string, Record<string, number>>,
    currency: string,
    timestamp: Date,
  ): Transaction[] {
    const transactions: Transaction[] = [];
    let transactionCounter = 1;

    for (const [fromParty, positions] of Object.entries(nettedPositions)) {
      for (const [toParty, amount] of Object.entries(positions)) {
        if (amount < 0) {
          // Negative amount means fromParty owes toParty
          transactions.push({
            id: `NETTED_${transactionCounter++}`,
            fromPartyId: fromParty,
            toPartyId: toParty,
            amount: Math.abs(amount),
            currency,
            transactionType: TransactionType.TRANSFER,
            timestamp,
            metadata: {
              netted: true,
              originalTransactions: 'multiple',
            },
          });
        }
      }
    }

    return transactions;
  }

  private calculateTotalVolume(transactions: Transaction[]): number {
    return transactions.reduce((sum, tx) => sum + tx.amount, 0);
  }

  private calculateNettingEfficiency(originalVolume: number, nettedVolume: number): number {
    if (originalVolume === 0) return 0;
    return Math.round(((originalVolume - nettedVolume) / originalVolume) * 100 * 100) / 100;
  }

  async getNettingMetrics(timeRange?: string): Promise<any> {
    // Simulate netting metrics
    return {
      totalTransactionsProcessed: 15420,
      averageNettingEfficiency: 67.5,
      volumeReduction: 62.3,
      processingTime: {
        average: 1250, // ms
        p95: 2100,
        p99: 3500,
      },
      algorithmPerformance: {
        multilateral: 72.3,
        bilateral: 48.7,
        cycle: 81.2,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

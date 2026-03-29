import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Horizon } from '@stellar/stellar-sdk';
import { SyncState, SyncStatus } from '../entities/sync-state.entity';

export interface Conflict {
  type:
    | 'double_spend'
    | 'state_mismatch'
    | 'sequence_conflict'
    | 'balance_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  onChainData: any;
  offChainData: any;
  affectedAccounts: string[];
  resolutionStrategy?: ConflictResolutionStrategy;
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolution: any;
  timestamp: Date;
  resolvedBy: 'automatic' | 'manual';
}

export enum ConflictResolutionStrategy {
  PREFER_ON_CHAIN = 'prefer_on_chain',
  PREFER_OFF_CHAIN = 'prefer_off_chain',
  MERGE = 'merge',
  MANUAL_REVIEW = 'manual_review',
  ROLLBACK = 'rollback',
  IGNORE = 'ignore',
}

@Injectable()
export class ConflictResolver {
  private readonly logger = new Logger(ConflictResolver.name);
  private conflictCache = new Map<string, Conflict>();
  private resolutionHistory = new Map<string, ConflictResolution>();

  constructor(
    @InjectRepository(SyncState)
    private syncStateRepository: Repository<SyncState>,
    private dataSource: DataSource,
  ) {}

  async detectConflict(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
  ): Promise<Conflict | null> {
    try {
      const txHash = transaction.hash;

      // Check cache first
      if (this.conflictCache.has(txHash)) {
        return this.conflictCache.get(txHash);
      }

      // Detect different types of conflicts
      const conflicts = await Promise.all([
        this.detectDoubleSpend(transaction),
        this.detectStateMismatch(transaction),
        this.detectSequenceConflict(transaction),
        this.detectBalanceMismatch(transaction),
      ]);

      const conflict = conflicts.find((c) => c !== null);

      if (conflict) {
        this.conflictCache.set(txHash, conflict);
        await this.logConflict(conflict);
      }

      return conflict;
    } catch (error) {
      this.logger.error(
        `Error detecting conflict for transaction ${transaction.hash}`,
        error,
      );
      return null;
    }
  }

  private async detectDoubleSpend(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
  ): Promise<Conflict | null> {
    const operations = transaction.operations;

    for (const op of operations) {
      if (op.type === 'payment' || op.type === 'path_payment') {
        const sourceAccount = op.source || transaction.source_account;

        // Check if this account has other unconfirmed transactions
        const pendingTxs = await this.findPendingTransactions(sourceAccount);

        for (const pendingTx of pendingTxs) {
          if (this.hasOverlappingOperations(op, pendingTx.operations)) {
            return {
              type: 'double_spend',
              severity: 'critical',
              description: `Double spend detected between transactions ${transaction.hash} and ${pendingTx.hash}`,
              onChainData: {
                hash: transaction.hash,
                operations: operations.length,
              },
              offChainData: {
                hash: pendingTx.hash,
                operations: pendingTx.operations.length,
              },
              affectedAccounts: [sourceAccount],
              resolutionStrategy: ConflictResolutionStrategy.PREFER_ON_CHAIN,
            };
          }
        }
      }
    }

    return null;
  }

  private async detectStateMismatch(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
  ): Promise<Conflict | null> {
    try {
      // Check if the on-chain state matches our off-chain state
      const sourceAccount = transaction.source_account;

      const onChainAccount = await this.getOnChainAccount(sourceAccount);
      const offChainAccount = await this.getOffChainAccount(sourceAccount);

      if (onChainAccount && offChainAccount) {
        const balanceMismatch =
          Math.abs(
            parseFloat(onChainAccount.balance) -
              parseFloat(offChainAccount.balance),
          ) > 0.0000001; // Account for Stellar precision

        if (balanceMismatch) {
          return {
            type: 'state_mismatch',
            severity: 'high',
            description: `Balance mismatch for account ${sourceAccount}: on-chain=${onChainAccount.balance}, off-chain=${offChainAccount.balance}`,
            onChainData: {
              balance: onChainAccount.balance,
              sequence: onChainAccount.sequence,
            },
            offChainData: {
              balance: offChainAccount.balance,
              sequence: offChainAccount.sequence,
            },
            affectedAccounts: [sourceAccount],
            resolutionStrategy: ConflictResolutionStrategy.PREFER_ON_CHAIN,
          };
        }
      }
    } catch (error) {
      this.logger.error('Error detecting state mismatch', error);
    }

    return null;
  }

  private async detectSequenceConflict(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
  ): Promise<Conflict | null> {
    try {
      const sourceAccount = transaction.source_account;
      const txSequence = transaction.source_account_sequence;

      const onChainAccount = await this.getOnChainAccount(sourceAccount);
      const offChainAccount = await this.getOffChainAccount(sourceAccount);

      if (onChainAccount && offChainAccount) {
        const onChainSequence = parseInt(onChainAccount.sequence);
        const offChainSequence = parseInt(offChainAccount.sequence);

        // Check if transaction sequence is out of order
        if (txSequence !== onChainSequence + 1) {
          return {
            type: 'sequence_conflict',
            severity: 'medium',
            description: `Sequence conflict for account ${sourceAccount}: tx=${txSequence}, expected=${onChainSequence + 1}`,
            onChainData: { sequence: onChainSequence },
            offChainData: { sequence: offChainSequence },
            affectedAccounts: [sourceAccount],
            resolutionStrategy: ConflictResolutionStrategy.PREFER_ON_CHAIN,
          };
        }
      }
    } catch (error) {
      this.logger.error('Error detecting sequence conflict', error);
    }

    return null;
  }

  private async detectBalanceMismatch(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
  ): Promise<Conflict | null> {
    try {
      const operations = transaction.operations;

      for (const op of operations) {
        if (op.type === 'payment') {
          const destination = op.destination;
          const amount = parseFloat(op.amount);

          // Verify the payment can be processed
          const onChainAccount = await this.getOnChainAccount(
            transaction.source_account,
          );
          if (onChainAccount) {
            const availableBalance =
              parseFloat(onChainAccount.balance) -
              parseFloat(onChainAccount.selling_liabilities);

            if (availableBalance < amount) {
              return {
                type: 'balance_mismatch',
                severity: 'high',
                description: `Insufficient balance for payment: available=${availableBalance}, required=${amount}`,
                onChainData: {
                  balance: onChainAccount.balance,
                  liabilities: onChainAccount.selling_liabilities,
                },
                offChainData: { payment_amount: amount },
                affectedAccounts: [transaction.source_account, destination],
                resolutionStrategy: ConflictResolutionStrategy.IGNORE,
              };
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Error detecting balance mismatch', error);
    }

    return null;
  }

  async resolveConflict(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    const resolutionId = `${transaction.hash}_${Date.now()}`;

    try {
      let resolution: any;
      let resolvedBy: 'automatic' | 'manual' = 'automatic';

      switch (conflict.resolutionStrategy) {
        case ConflictResolutionStrategy.PREFER_ON_CHAIN:
          resolution = await this.resolvePreferOnChain(transaction, conflict);
          break;

        case ConflictResolutionStrategy.PREFER_OFF_CHAIN:
          resolution = await this.resolvePreferOffChain(transaction, conflict);
          break;

        case ConflictResolutionStrategy.MERGE:
          resolution = await this.resolveMerge(transaction, conflict);
          break;

        case ConflictResolutionStrategy.ROLLBACK:
          resolution = await this.resolveRollback(transaction, conflict);
          break;

        case ConflictResolutionStrategy.IGNORE:
          resolution = await this.resolveIgnore(transaction, conflict);
          break;

        case ConflictResolutionStrategy.MANUAL_REVIEW:
          resolution = await this.resolveManualReview(transaction, conflict);
          resolvedBy = 'manual';
          break;

        default:
          throw new Error(
            `Unknown resolution strategy: ${conflict.resolutionStrategy}`,
          );
      }

      const conflictResolution: ConflictResolution = {
        conflictId: resolutionId,
        strategy: conflict.resolutionStrategy,
        resolution,
        timestamp: new Date(),
        resolvedBy,
      };

      this.resolutionHistory.set(resolutionId, conflictResolution);
      await this.logResolution(conflictResolution);

      // Clear from cache
      this.conflictCache.delete(transaction.hash);

      return resolution;
    } catch (error) {
      this.logger.error(
        `Error resolving conflict for transaction ${transaction.hash}`,
        error,
      );
      throw error;
    }
  }

  private async resolvePreferOnChain(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    // Update off-chain state to match on-chain state
    for (const account of conflict.affectedAccounts) {
      const onChainAccount = await this.getOnChainAccount(account);
      if (onChainAccount) {
        await this.updateOffChainAccount(account, {
          balance: onChainAccount.balance,
          sequence: onChainAccount.sequence,
        });
      }
    }

    return {
      action: 'updated_off_chain_state',
      accountsUpdated: conflict.affectedAccounts.length,
      transaction: transaction.hash,
    };
  }

  private async resolvePreferOffChain(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    // In this case, we might need to create a corrective transaction
    // For now, we'll just log and continue with off-chain state
    return {
      action: 'maintained_off_chain_state',
      transaction: transaction.hash,
      note: 'Off-chain state preserved, on-chain transaction ignored',
    };
  }

  private async resolveMerge(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    // Attempt to merge states by applying only non-conflicting operations
    const validOperations = [];

    for (const op of transaction.operations) {
      if (await this.isOperationValid(op, conflict)) {
        validOperations.push(op);
      }
    }

    return {
      action: 'merged_operations',
      validOperations: validOperations.length,
      totalOperations: transaction.operations.length,
      transaction: transaction.hash,
    };
  }

  private async resolveRollback(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    // Rollback any changes made by this transaction
    return {
      action: 'rolled_back',
      transaction: transaction.hash,
      reason: 'Critical conflict detected',
    };
  }

  private async resolveIgnore(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    // Simply ignore the conflict and continue
    return {
      action: 'ignored',
      transaction: transaction.hash,
      reason: conflict.description,
    };
  }

  private async resolveManualReview(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<any> {
    // Flag for manual review
    await this.flagForManualReview(transaction, conflict);

    return {
      action: 'flagged_for_manual_review',
      transaction: transaction.hash,
      conflictType: conflict.type,
      severity: conflict.severity,
    };
  }

  private async isOperationValid(
    operation: any,
    conflict: Conflict,
  ): Promise<boolean> {
    // Check if operation doesn't conflict with current state
    if (conflict.type === 'balance_mismatch' && operation.type === 'payment') {
      return false;
    }

    return true;
  }

  private async findPendingTransactions(accountId: string): Promise<any[]> {
    // Find unconfirmed transactions for this account
    // This would query your pending transactions table
    return [];
  }

  private hasOverlappingOperations(op1: any, ops2: any[]): boolean {
    // Check if operations overlap (e.g., same source account)
    for (const op2 of ops2) {
      if (
        (op1.source || op1.source_account) ===
        (op2.source || op2.source_account)
      ) {
        return true;
      }
    }
    return false;
  }

  private async getOnChainAccount(accountId: string): Promise<any> {
    try {
      // This would use the Stellar SDK to get account info
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }

  private async getOffChainAccount(accountId: string): Promise<any> {
    try {
      // This would query your database for account info
      return null; // Placeholder
    } catch (error) {
      return null;
    }
  }

  private async updateOffChainAccount(
    accountId: string,
    updates: any,
  ): Promise<void> {
    // Update account in your database
    // Implementation depends on your schema
  }

  private async logConflict(conflict: Conflict): Promise<void> {
    // Log conflict for monitoring and analysis
    this.logger.warn(
      `Conflict detected: ${conflict.type} - ${conflict.description}`,
    );
  }

  private async logResolution(resolution: ConflictResolution): Promise<void> {
    // Log resolution for monitoring and analysis
    this.logger.log(
      `Conflict resolved: ${resolution.conflictId} using ${resolution.strategy}`,
    );
  }

  private async flagForManualReview(
    transaction: Horizon.BaseResponse<Horizon.TransactionResponse>,
    conflict: Conflict,
  ): Promise<void> {
    // Flag transaction for manual review
    // This could create a ticket, send notification, etc.
  }

  // Public API methods
  getConflictStatistics() {
    return {
      totalConflicts: this.conflictCache.size,
      resolvedConflicts: this.resolutionHistory.size,
      conflictsByType: this.getConflictsByType(),
      resolutionsByStrategy: this.getResolutionsByStrategy(),
    };
  }

  private getConflictsByType() {
    const stats = {};
    for (const conflict of this.conflictCache.values()) {
      stats[conflict.type] = (stats[conflict.type] || 0) + 1;
    }
    return stats;
  }

  private getResolutionsByStrategy() {
    const stats = {};
    for (const resolution of this.resolutionHistory.values()) {
      stats[resolution.strategy] = (stats[resolution.strategy] || 0) + 1;
    }
    return stats;
  }

  clearCache() {
    this.conflictCache.clear();
    this.logger.log('Conflict cache cleared');
  }
}

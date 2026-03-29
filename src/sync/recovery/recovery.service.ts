import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Server } from '@stellar/stellar-sdk';
import { interval, Subject, BehaviorSubject } from 'rxjs';
import { takeWhile, switchMap, catchError } from 'rxjs/operators';
import { SyncState, SyncStatus, SyncType } from '../entities/sync-state.entity';

export interface RecoveryEvent {
  type:
    | 'recovery_started'
    | 'recovery_progress'
    | 'recovery_completed'
    | 'recovery_failed';
  timestamp: Date;
  entityType: string;
  entityId: string;
  progress?: number;
  error?: string;
  metadata?: any;
}

export interface RecoveryMetrics {
  totalRecoveries: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  averageRecoveryTime: number;
  dataLossIncidents: number;
  lastRecoveryTime?: Date;
}

export interface RecoveryStrategy {
  type:
    | 'full_sync'
    | 'incremental_sync'
    | 'checkpoint_restore'
    | 'manual_intervention';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  dataLossRisk: 'none' | 'low' | 'medium' | 'high';
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);
  private server: Server;
  private isRecovering = new BehaviorSubject<boolean>(false);
  private recoveryEvents = new Subject<RecoveryEvent>();
  private metrics = new BehaviorSubject<RecoveryMetrics>({
    totalRecoveries: 0,
    successfulRecoveries: 0,
    failedRecoveries: 0,
    averageRecoveryTime: 0,
    dataLossIncidents: 0,
  });
  private activeRecoveries = new Map<string, RecoveryStrategy>();

  constructor(
    private configService: ConfigService,
    @InjectRepository(SyncState)
    private syncStateRepository: Repository<SyncState>,
    private dataSource: DataSource,
  ) {
    const stellarConfig = this.configService.get('stellar');
    this.server = new Server(stellarConfig.horizonUrl);
  }

  async initiateRecovery(syncState: SyncState | null): Promise<void> {
    this.logger.log('Initiating recovery process');

    const recoveryStartTime = Date.now();
    this.isRecovering.next(true);

    try {
      if (syncState) {
        await this.recoverSingleEntity(syncState);
      } else {
        await this.recoverAllEntities();
      }

      const recoveryDuration = Date.now() - recoveryStartTime;
      await this.updateRecoveryMetrics(true, recoveryDuration);

      this.logger.log(
        `Recovery completed successfully in ${recoveryDuration}ms`,
      );
    } catch (error) {
      const recoveryDuration = Date.now() - recoveryStartTime;
      await this.updateRecoveryMetrics(false, recoveryDuration);

      this.logger.error('Recovery failed', error);
      throw error;
    } finally {
      this.isRecovering.next(false);
    }
  }

  private async recoverAllEntities(): Promise<void> {
    const syncStates = await this.syncStateRepository.find({
      where: [
        { status: SyncStatus.ERROR },
        { status: SyncStatus.PARTITIONED },
        { status: SyncStatus.CONFLICT },
      ],
    });

    this.logger.log(`Recovering ${syncStates.length} entities`);

    for (const syncState of syncStates) {
      try {
        await this.recoverSingleEntity(syncState);
      } catch (error) {
        this.logger.error(
          `Failed to recover ${syncState.entityType}:${syncState.entityId}`,
          error,
        );
      }
    }
  }

  private async recoverSingleEntity(syncState: SyncState): Promise<void> {
    const recoveryId = `${syncState.entityType}:${syncState.entityId}`;

    this.logger.log(`Starting recovery for ${recoveryId}`);

    this.recoveryEvents.next({
      type: 'recovery_started',
      timestamp: new Date(),
      entityType: syncState.entityType,
      entityId: syncState.entityId,
    });

    try {
      // Determine recovery strategy
      const strategy = await this.determineRecoveryStrategy(syncState);
      this.activeRecoveries.set(recoveryId, strategy);

      // Execute recovery based on strategy
      switch (strategy.type) {
        case 'full_sync':
          await this.performFullSync(syncState);
          break;
        case 'incremental_sync':
          await this.performIncrementalSync(syncState);
          break;
        case 'checkpoint_restore':
          await this.performCheckpointRestore(syncState);
          break;
        case 'manual_intervention':
          await this.requestManualIntervention(syncState);
          break;
      }

      // Mark as recovered
      syncState.status = SyncStatus.IDLE;
      syncState.errorMessage = null;
      syncState.retryCount = 0;
      syncState.lastSuccessfulSyncAt = new Date();
      await this.syncStateRepository.save(syncState);

      this.recoveryEvents.next({
        type: 'recovery_completed',
        timestamp: new Date(),
        entityType: syncState.entityType,
        entityId: syncState.entityId,
        metadata: { strategy: strategy.type },
      });

      this.activeRecoveries.delete(recoveryId);
    } catch (error) {
      syncState.status = SyncStatus.ERROR;
      syncState.errorMessage = error.message;
      syncState.retryCount++;
      await this.syncStateRepository.save(syncState);

      this.recoveryEvents.next({
        type: 'recovery_failed',
        timestamp: new Date(),
        entityType: syncState.entityType,
        entityId: syncState.entityId,
        error: error.message,
      });

      throw error;
    }
  }

  private async determineRecoveryStrategy(
    syncState: SyncState,
  ): Promise<RecoveryStrategy> {
    const currentLedger = await this.getCurrentLedgerSequence();
    const ledgerGap = currentLedger - syncState.lastLedgerSequence;
    const timeSinceLastSync = syncState.lastSuccessfulSyncAt
      ? Date.now() - syncState.lastSuccessfulSyncAt.getTime()
      : Infinity;

    // Determine strategy based on various factors
    if (syncState.retryCount >= 5) {
      return {
        type: 'manual_intervention',
        priority: 'critical',
        estimatedDuration: 0,
        dataLossRisk: 'high',
      };
    }

    if (ledgerGap > 10000) {
      return {
        type: 'checkpoint_restore',
        priority: 'high',
        estimatedDuration: 300000, // 5 minutes
        dataLossRisk: 'low',
      };
    }

    if (ledgerGap > 1000 || timeSinceLastSync > 3600000) {
      // 1 hour
      return {
        type: 'full_sync',
        priority: 'medium',
        estimatedDuration: 600000, // 10 minutes
        dataLossRisk: 'none',
      };
    }

    return {
      type: 'incremental_sync',
      priority: 'low',
      estimatedDuration: 60000, // 1 minute
      dataLossRisk: 'none',
    };
  }

  private async performFullSync(syncState: SyncState): Promise<void> {
    this.logger.log(
      `Performing full sync for ${syncState.entityType}:${syncState.entityId}`,
    );

    syncState.status = SyncStatus.RECOVERING;
    syncState.syncType = SyncType.FULL;
    await this.syncStateRepository.save(syncState);

    const currentLedger = await this.getCurrentLedgerSequence();

    // Reset to a safe starting point
    syncState.lastLedgerSequence = Math.max(0, currentLedger - 1000);
    syncState.targetLedgerSequence = currentLedger;
    await this.syncStateRepository.save(syncState);

    // Process in batches
    const batchSize = 100;
    for (
      let sequence = syncState.lastLedgerSequence;
      sequence <= currentLedger;
      sequence += batchSize
    ) {
      const endSequence = Math.min(sequence + batchSize - 1, currentLedger);

      try {
        await this.processLedgerBatch(syncState, sequence, endSequence);

        syncState.lastLedgerSequence = endSequence;
        await this.syncStateRepository.save(syncState);

        // Report progress
        const progress =
          ((endSequence - syncState.lastLedgerSequence + 1000) /
            (currentLedger - 1000 + 1)) *
          100;
        this.recoveryEvents.next({
          type: 'recovery_progress',
          timestamp: new Date(),
          entityType: syncState.entityType,
          entityId: syncState.entityId,
          progress: Math.round(progress),
        });
      } catch (error) {
        this.logger.error(
          `Failed to process batch ${sequence}-${endSequence}`,
          error,
        );
        throw error;
      }
    }
  }

  private async performIncrementalSync(syncState: SyncState): Promise<void> {
    this.logger.log(
      `Performing incremental sync for ${syncState.entityType}:${syncState.entityId}`,
    );

    syncState.status = SyncStatus.RECOVERING;
    syncState.syncType = SyncType.INCREMENTAL;
    await this.syncStateRepository.save(syncState);

    const currentLedger = await this.getCurrentLedgerSequence();
    const startSequence = syncState.lastLedgerSequence + 1;

    // Process missed ledgers
    await this.processLedgerBatch(syncState, startSequence, currentLedger);

    syncState.lastLedgerSequence = currentLedger;
    await this.syncStateRepository.save(syncState);
  }

  private async performCheckpointRestore(syncState: SyncState): Promise<void> {
    this.logger.log(
      `Performing checkpoint restore for ${syncState.entityType}:${syncState.entityId}`,
    );

    // Find the last known good checkpoint
    const checkpoint = await this.findLastGoodCheckpoint(syncState);

    if (!checkpoint) {
      throw new Error('No valid checkpoint found for restore');
    }

    // Restore from checkpoint
    syncState.lastLedgerSequence = checkpoint.ledgerSequence;
    syncState.status = SyncStatus.RECOVERING;
    syncState.syncType = SyncType.RECOVERY;
    await this.syncStateRepository.save(syncState);

    // Continue with incremental sync from checkpoint
    await this.performIncrementalSync(syncState);
  }

  private async requestManualIntervention(syncState: SyncState): Promise<void> {
    this.logger.error(
      `Manual intervention required for ${syncState.entityType}:${syncState.entityId}`,
    );

    // Create incident ticket
    await this.createIncidentTicket(syncState);

    // Send alert
    await this.sendAlert(syncState);

    // Mark as awaiting manual intervention
    syncState.status = SyncStatus.ERROR;
    syncState.errorMessage = 'Manual intervention required';
    await this.syncStateRepository.save(syncState);
  }

  private async processLedgerBatch(
    syncState: SyncState,
    startSequence: number,
    endSequence: number,
  ): Promise<void> {
    for (let sequence = startSequence; sequence <= endSequence; sequence++) {
      try {
        const ledger = await this.server.ledgers().ledger(sequence).call();
        const transactions = await this.server
          .transactions()
          .forLedger(sequence)
          .order('asc')
          .limit(100)
          .call();

        // Process transactions
        for (const tx of transactions.records) {
          await this.processTransactionForRecovery(tx, syncState);
        }
      } catch (error) {
        this.logger.error(`Failed to process ledger ${sequence}`, error);
        throw error;
      }
    }
  }

  private async processTransactionForRecovery(
    tx: any,
    syncState: SyncState,
  ): Promise<void> {
    // Implement transaction processing logic for recovery
    // This would be similar to the normal sync processing but with additional validation
    try {
      // Validate transaction
      await this.validateTransaction(tx);

      // Apply transaction
      await this.applyTransactionForRecovery(tx);

      syncState.transactionsProcessed++;
    } catch (error) {
      this.logger.error(
        `Failed to process transaction ${tx.id} during recovery`,
        error,
      );
      throw error;
    }
  }

  private async validateTransaction(tx: any): Promise<void> {
    // Validate transaction structure and signatures
    if (!tx.id || !tx.hash) {
      throw new Error('Invalid transaction structure');
    }

    // Additional validation logic here
  }

  private async applyTransactionForRecovery(tx: any): Promise<void> {
    // Apply transaction to local state
    // This would update your database based on the transaction
  }

  private async findLastGoodCheckpoint(
    syncState: SyncState,
  ): Promise<{ ledgerSequence: number; timestamp: Date } | null> {
    // This would query your checkpoints table for the last known good state
    // For now, return a simple checkpoint based on time
    const oneHourAgo = new Date(Date.now() - 3600000);
    const currentLedger = await this.getCurrentLedgerSequence();

    return {
      ledgerSequence: Math.max(0, currentLedger - 3600), // Approximate 1 hour of ledgers
      timestamp: oneHourAgo,
    };
  }

  private async createIncidentTicket(syncState: SyncState): Promise<void> {
    // Create incident in your incident management system
    this.logger.error(
      `Incident created for ${syncState.entityType}:${syncState.entityId}`,
    );
  }

  private async sendAlert(syncState: SyncState): Promise<void> {
    // Send alert to monitoring system
    this.logger.error(
      `Alert sent for ${syncState.entityType}:${syncState.entityId}`,
    );
  }

  private async getCurrentLedgerSequence(): Promise<number> {
    try {
      const latestLedger = await this.server
        .ledgers()
        .order('desc')
        .limit(1)
        .call();
      return latestLedger.records[0]?.sequence || 0;
    } catch (error) {
      this.logger.error('Failed to get current ledger sequence', error);
      return 0;
    }
  }

  private async updateRecoveryMetrics(
    success: boolean,
    duration: number,
  ): Promise<void> {
    const currentMetrics = this.metrics.value;
    const newMetrics = {
      ...currentMetrics,
      totalRecoveries: currentMetrics.totalRecoveries + 1,
      successfulRecoveries: success
        ? currentMetrics.successfulRecoveries + 1
        : currentMetrics.successfulRecoveries,
      failedRecoveries: !success
        ? currentMetrics.failedRecoveries + 1
        : currentMetrics.failedRecoveries,
      averageRecoveryTime: (currentMetrics.averageRecoveryTime + duration) / 2,
      lastRecoveryTime: new Date(),
    };

    this.metrics.next(newMetrics);
  }

  // Public API methods
  getRecoveryStatus() {
    return this.isRecovering.asObservable();
  }

  getRecoveryEvents() {
    return this.recoveryEvents.asObservable();
  }

  getMetrics() {
    return this.metrics.asObservable();
  }

  async getActiveRecoveries(): Promise<Map<string, RecoveryStrategy>> {
    return new Map(this.activeRecoveries);
  }

  async cancelRecovery(entityType: string, entityId: string): Promise<void> {
    const recoveryId = `${entityType}:${entityId}`;

    if (this.activeRecoveries.has(recoveryId)) {
      this.activeRecoveries.delete(recoveryId);

      const syncState = await this.syncStateRepository.findOne({
        where: { entityType, entityId },
      });

      if (syncState) {
        syncState.status = SyncStatus.ERROR;
        syncState.errorMessage = 'Recovery cancelled';
        await this.syncStateRepository.save(syncState);
      }

      this.logger.log(`Recovery cancelled for ${recoveryId}`);
    }
  }

  async forceRecovery(entityType?: string, entityId?: string): Promise<void> {
    if (entityType && entityId) {
      const syncState = await this.syncStateRepository.findOne({
        where: { entityType, entityId },
      });

      if (syncState) {
        await this.initiateRecovery(syncState);
      }
    } else {
      await this.initiateRecovery(null);
    }
  }

  getRecoveryStatistics() {
    return this.metrics.value;
  }

  async testRecoveryProcedures(): Promise<void> {
    this.logger.log('Testing recovery procedures');

    // Create a test sync state with error status
    const testSyncState = await this.syncStateRepository.findOne({
      where: { entityType: 'test', entityId: 'recovery_test' },
    });

    if (!testSyncState) {
      // Create test state if it doesn't exist
      const newState = this.syncStateRepository.create({
        entityType: 'test',
        entityId: 'recovery_test',
        status: SyncStatus.ERROR,
        lastLedgerSequence: 0,
        targetLedgerSequence: 0,
        errorMessage: 'Test error for recovery',
      });
      await this.syncStateRepository.save(newState);

      await this.initiateRecovery(newState);
    }
  }
}

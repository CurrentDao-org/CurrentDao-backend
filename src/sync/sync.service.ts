import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StellarSdk, Server, Horizon } from '@stellar/stellar-sdk';
import { Subject, BehaviorSubject, interval, from, lastValueFrom } from 'rxjs';
import {
  switchMap,
  takeWhile,
  catchError,
  retry,
  debounceTime,
} from 'rxjs/operators';
import { SyncState, SyncStatus, SyncType } from '../entities/sync-state.entity';
import { ConflictResolver } from '../resolvers/conflict.resolver';
import { PartitionHandler } from '../handlers/partition.handler';
import { PerformanceOptimizer } from '../optimizers/performance.optimizer';
import { RecoveryService } from '../recovery/recovery.service';

export interface SyncMetrics {
  totalTransactions: number;
  processedTransactions: number;
  conflicts: number;
  errors: number;
  averageLatency: number;
  throughput: number;
}

export interface SyncEvent {
  type: 'transaction' | 'ledger' | 'conflict' | 'error' | 'partition';
  data: any;
  timestamp: Date;
  ledgerSequence?: number;
}

@Injectable()
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private server: Server;
  private isSyncing = new BehaviorSubject<boolean>(false);
  private syncEvents = new Subject<SyncEvent>();
  private metrics = new BehaviorSubject<SyncMetrics>({
    totalTransactions: 0,
    processedTransactions: 0,
    conflicts: 0,
    errors: 0,
    averageLatency: 0,
    throughput: 0,
  });

  constructor(
    private configService: ConfigService,
    @InjectRepository(SyncState)
    private syncStateRepository: Repository<SyncState>,
    private dataSource: DataSource,
    private conflictResolver: ConflictResolver,
    private partitionHandler: PartitionHandler,
    private performanceOptimizer: PerformanceOptimizer,
    private recoveryService: RecoveryService,
  ) {}

  async onModuleInit() {
    const stellarConfig = this.configService.get('stellar');
    this.server = new Server(stellarConfig.horizonUrl);

    await this.initializeSyncStates();
    await this.startRealTimeSync();

    this.logger.log('Sync service initialized');
  }

  private async initializeSyncStates() {
    const entities = [
      { type: 'asset', id: 'global' },
      { type: 'contract', id: 'global' },
      { type: 'transaction', id: 'global' },
      { type: 'governance', id: 'global' },
    ];

    for (const entity of entities) {
      const existingState = await this.syncStateRepository.findOne({
        where: { entityType: entity.type, entityId: entity.id },
      });

      if (!existingState) {
        const syncState = this.syncStateRepository.create({
          entityType: entity.type,
          entityId: entity.id,
          status: SyncStatus.IDLE,
          lastLedgerSequence: await this.getCurrentLedgerSequence(),
          targetLedgerSequence: 0,
        });
        await this.syncStateRepository.save(syncState);
      }
    }
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

  async startRealTimeSync() {
    this.logger.log('Starting real-time synchronization');

    interval(5000) // Poll every 5 seconds for sub-5s latency
      .pipe(
        switchMap(() => from(this.syncLedger())),
        retry(3),
        catchError((error) => {
          this.logger.error('Sync error, initiating recovery', error);
          return from(this.handleSyncError(error));
        }),
      )
      .subscribe();

    // Monitor for network partitions
    interval(30000) // Check every 30 seconds
      .pipe(
        switchMap(() => from(this.detectNetworkPartition())),
        debounceTime(5000),
      )
      .subscribe((isPartitioned) => {
        if (isPartitioned) {
          this.handleNetworkPartition();
        }
      });
  }

  private async syncLedger(): Promise<void> {
    if (this.isSyncing.value) {
      return;
    }

    this.isSyncing.next(true);
    const startTime = Date.now();

    try {
      const currentLedger = await this.getCurrentLedgerSequence();
      const syncStates = await this.syncStateRepository.find({
        where: { status: SyncStatus.IDLE },
      });

      for (const syncState of syncStates) {
        if (syncState.lastLedgerSequence < currentLedger) {
          await this.processLedgerRange(
            syncState,
            syncState.lastLedgerSequence + 1,
            currentLedger,
          );
        }
      }

      const latency = Date.now() - startTime;
      this.updateMetrics(latency);
    } catch (error) {
      this.logger.error('Ledger sync failed', error);
      throw error;
    } finally {
      this.isSyncing.next(false);
    }
  }

  private async processLedgerRange(
    syncState: SyncState,
    startSequence: number,
    endSequence: number,
  ) {
    syncState.status = SyncStatus.SYNCING;
    syncState.syncType =
      startSequence === syncState.lastLedgerSequence + 1
        ? SyncType.INCREMENTAL
        : SyncType.FULL;
    await this.syncStateRepository.save(syncState);

    const batchSize = this.performanceOptimizer.calculateOptimalBatchSize(
      endSequence - startSequence,
    );
    const batches = this.createBatches(startSequence, endSequence, batchSize);

    for (const batch of batches) {
      try {
        await this.processBatch(syncState, batch.start, batch.end);

        syncState.lastLedgerSequence = batch.end;
        syncState.lastSyncAt = new Date();
        syncState.transactionsProcessed += batch.end - batch.start + 1;
        await this.syncStateRepository.save(syncState);

        this.syncEvents.next({
          type: 'ledger',
          data: { start: batch.start, end: batch.end },
          timestamp: new Date(),
          ledgerSequence: batch.end,
        });
      } catch (error) {
        await this.handleBatchError(syncState, error, batch);
      }
    }

    syncState.status = SyncStatus.IDLE;
    syncState.lastSuccessfulSyncAt = new Date();
    await this.syncStateRepository.save(syncState);
  }

  private createBatches(start: number, end: number, batchSize: number) {
    const batches = [];
    for (let i = start; i <= end; i += batchSize) {
      batches.push({
        start: i,
        end: Math.min(i + batchSize - 1, end),
      });
    }
    return batches;
  }

  private async processBatch(
    syncState: SyncState,
    startSequence: number,
    endSequence: number,
  ) {
    const transactions = [];

    for (let sequence = startSequence; sequence <= endSequence; sequence++) {
      try {
        const ledger = await this.server.ledgers().ledger(sequence).call();
        const txs = await this.server
          .transactions()
          .forLedger(sequence)
          .order('asc')
          .limit(100)
          .call();

        for (const tx of txs.records) {
          const processedTx = await this.processTransaction(tx, syncState);
          if (processedTx) {
            transactions.push(processedTx);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to process ledger ${sequence}`, error);
        throw error;
      }
    }

    // Apply performance optimizations
    await this.performanceOptimizer.optimizeBatchProcessing(transactions);
  }

  private async processTransaction(
    tx: Horizon.BaseResponse<Horizon.TransactionResponse>,
    syncState: SyncState,
  ) {
    try {
      // Check for conflicts
      const conflict = await this.conflictResolver.detectConflict(tx);
      if (conflict) {
        syncState.conflictCount++;
        await this.syncStateRepository.save(syncState);

        this.syncEvents.next({
          type: 'conflict',
          data: { transaction: tx.id, conflict },
          timestamp: new Date(),
        });

        return await this.conflictResolver.resolveConflict(tx, conflict);
      }

      // Process the transaction based on its type
      const processedTx = await this.applyTransaction(tx);

      this.syncEvents.next({
        type: 'transaction',
        data: processedTx,
        timestamp: new Date(),
      });

      return processedTx;
    } catch (error) {
      this.logger.error(`Failed to process transaction ${tx.id}`, error);
      syncState.retryCount++;
      await this.syncStateRepository.save(syncState);
      throw error;
    }
  }

  private async applyTransaction(
    tx: Horizon.BaseResponse<Horizon.TransactionResponse>,
  ) {
    // Implementation would depend on specific business logic
    // This is a placeholder for transaction processing
    return {
      id: tx.id,
      ledger: tx.ledger,
      operationCount: tx.operations.length,
      processedAt: new Date(),
    };
  }

  private async handleBatchError(
    syncState: SyncState,
    error: any,
    batch: { start: number; end: number },
  ) {
    syncState.status = SyncStatus.ERROR;
    syncState.errorMessage = error.message;
    syncState.retryCount++;
    await this.syncStateRepository.save(syncState);

    this.syncEvents.next({
      type: 'error',
      data: { error: error.message, batch },
      timestamp: new Date(),
    });

    // If retry count exceeds threshold, initiate recovery
    if (syncState.retryCount > 3) {
      await this.recoveryService.initiateRecovery(syncState);
    }
  }

  private async detectNetworkPartition(): Promise<boolean> {
    try {
      const currentLedger = await this.getCurrentLedgerSequence();
      const syncStates = await this.syncStateRepository.find();

      for (const syncState of syncStates) {
        const ledgerGap = currentLedger - syncState.lastLedgerSequence;
        if (ledgerGap > 100) {
          // Consider partitioned if gap > 100 ledgers
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Failed to detect network partition', error);
      return true; // Assume partition on error
    }
  }

  private async handleNetworkPartition() {
    this.logger.warn('Network partition detected');

    const syncStates = await this.syncStateRepository.find();
    for (const syncState of syncStates) {
      syncState.status = SyncStatus.PARTITIONED;
      syncState.partitionStartTime = Date.now();
      await this.syncStateRepository.save(syncState);
    }

    await this.partitionHandler.handlePartition();
  }

  private async handleSyncError(error: any) {
    this.logger.error('Sync error occurred', error);
    await this.recoveryService.initiateRecovery(null);
  }

  private updateMetrics(latency: number) {
    const currentMetrics = this.metrics.value;
    const newMetrics = {
      ...currentMetrics,
      averageLatency: (currentMetrics.averageLatency + latency) / 2,
      throughput:
        currentMetrics.processedTransactions > 0
          ? (currentMetrics.processedTransactions * 1000) / latency
          : 0,
    };
    this.metrics.next(newMetrics);
  }

  // Public API methods
  getSyncStatus() {
    return this.isSyncing.asObservable();
  }

  getSyncEvents() {
    return this.syncEvents.asObservable();
  }

  getMetrics() {
    return this.metrics.asObservable();
  }

  async getSyncState(entityType: string, entityId: string) {
    return this.syncStateRepository.findOne({
      where: { entityType, entityId },
    });
  }

  async triggerFullSync(entityType?: string, entityId?: string) {
    const whereClause = entityType && entityId ? { entityType, entityId } : {};

    const syncStates = await this.syncStateRepository.find({
      where: whereClause,
    });

    for (const syncState of syncStates) {
      syncState.status = SyncStatus.IDLE;
      syncState.lastLedgerSequence = 0; // Force full sync
      await this.syncStateRepository.save(syncState);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldStates() {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 24);

    await this.syncStateRepository.delete({
      updatedAt: LessThan(cutoffDate),
      status: SyncStatus.IDLE,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Server } from '@stellar/stellar-sdk';
import { interval, Subject, BehaviorSubject } from 'rxjs';
import { takeWhile, switchMap, catchError } from 'rxjs/operators';
import { SyncState, SyncStatus } from '../entities/sync-state.entity';

export interface PartitionEvent {
  type:
    | 'partition_detected'
    | 'partition_resolved'
    | 'recovery_started'
    | 'recovery_completed';
  timestamp: Date;
  duration?: number;
  affectedEntities: string[];
  metadata?: any;
}

export interface PartitionMetrics {
  partitionCount: number;
  totalPartitionTime: number;
  averageRecoveryTime: number;
  entitiesAffected: number;
  dataLoss: boolean;
}

@Injectable()
export class PartitionHandler {
  private readonly logger = new Logger(PartitionHandler.name);
  private server: Server;
  private isPartitioned = new BehaviorSubject<boolean>(false);
  private partitionEvents = new Subject<PartitionEvent>();
  private metrics = new BehaviorSubject<PartitionMetrics>({
    partitionCount: 0,
    totalPartitionTime: 0,
    averageRecoveryTime: 0,
    entitiesAffected: 0,
    dataLoss: false,
  });
  private partitionStartTime: number = 0;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 5;

  constructor(
    private configService: ConfigService,
    @InjectRepository(SyncState)
    private syncStateRepository: Repository<SyncState>,
    private dataSource: DataSource,
  ) {
    const stellarConfig = this.configService.get('stellar');
    this.server = new Server(stellarConfig.horizonUrl);
  }

  async handlePartition(): Promise<void> {
    this.logger.warn('Handling network partition');
    this.partitionStartTime = Date.now();
    this.isPartitioned.next(true);

    // Log partition event
    this.partitionEvents.next({
      type: 'partition_detected',
      timestamp: new Date(),
      affectedEntities: await this.getAffectedEntities(),
    });

    try {
      // Step 1: Pause all sync operations
      await this.pauseSyncOperations();

      // Step 2: Enter quarantine mode
      await this.enterQuarantineMode();

      // Step 3: Start recovery monitoring
      await this.startRecoveryMonitoring();

      // Step 4: Begin graceful degradation
      await this.enableGracefulDegradation();

      this.logger.log('Partition handling initialized');
    } catch (error) {
      this.logger.error('Error during partition handling', error);
      throw error;
    }
  }

  private async pauseSyncOperations(): Promise<void> {
    const syncStates = await this.syncStateRepository.find({
      where: { status: SyncStatus.SYNCING },
    });

    for (const syncState of syncStates) {
      syncState.status = SyncStatus.PARTITIONED;
      syncState.partitionStartTime = this.partitionStartTime;
      await this.syncStateRepository.save(syncState);
    }

    this.logger.log(`Paused ${syncStates.length} sync operations`);
  }

  private async enterQuarantineMode(): Promise<void> {
    // Implement quarantine mode logic
    // This might include:
    // - Read-only mode for affected services
    // - Cache-only operations
    // - Limited functionality

    this.logger.log('Entered quarantine mode');
  }

  private async startRecoveryMonitoring(): Promise<void> {
    this.recoveryAttempts = 0;

    interval(10000) // Check every 10 seconds
      .pipe(
        takeWhile(() => this.isPartitioned.value),
        switchMap(() => this.checkNetworkRecovery()),
        catchError((error) => {
          this.logger.error('Error during recovery monitoring', error);
          return [];
        }),
      )
      .subscribe((isRecovered) => {
        if (isRecovered) {
          this.initiateRecovery();
        } else {
          this.recoveryAttempts++;
          if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            this.logger.error('Max recovery attempts reached, escalating');
            this.escalatePartition();
          }
        }
      });
  }

  private async checkNetworkRecovery(): Promise<boolean> {
    try {
      // Check if we can reach the Stellar network
      const latestLedger = await this.server
        .ledgers()
        .order('desc')
        .limit(1)
        .call();

      if (!latestLedger.records || latestLedger.records.length === 0) {
        return false;
      }

      // Check if ledger progression is normal
      const currentLedger = latestLedger.records[0].sequence;
      const syncStates = await this.syncStateRepository.find();

      let maxGap = 0;
      for (const syncState of syncStates) {
        const gap = currentLedger - syncState.lastLedgerSequence;
        maxGap = Math.max(maxGap, gap);
      }

      // Consider network recovered if gap is less than 10 ledgers
      return maxGap < 10;
    } catch (error) {
      this.logger.debug('Network not yet recovered', error);
      return false;
    }
  }

  private async initiateRecovery(): Promise<void> {
    this.logger.log('Network recovered, initiating recovery process');

    this.partitionEvents.next({
      type: 'recovery_started',
      timestamp: new Date(),
      affectedEntities: await this.getAffectedEntities(),
    });

    const recoveryStartTime = Date.now();

    try {
      // Step 1: Validate data integrity
      await this.validateDataIntegrity();

      // Step 2: Resume sync operations
      await this.resumeSyncOperations();

      // Step 3: Catch up on missed ledgers
      await this.catchUpMissedLedgers();

      // Step 4: Exit quarantine mode
      await this.exitQuarantineMode();

      // Step 5: Update metrics
      await this.updateRecoveryMetrics(recoveryStartTime);

      this.isPartitioned.next(false);
      this.recoveryAttempts = 0;

      this.partitionEvents.next({
        type: 'recovery_completed',
        timestamp: new Date(),
        duration: Date.now() - recoveryStartTime,
        affectedEntities: await this.getAffectedEntities(),
      });

      this.logger.log('Recovery completed successfully');
    } catch (error) {
      this.logger.error('Recovery failed', error);
      await this.handleRecoveryFailure(error);
    }
  }

  private async validateDataIntegrity(): Promise<void> {
    this.logger.log('Validating data integrity after partition');

    const syncStates = await this.syncStateRepository.find();

    for (const syncState of syncStates) {
      try {
        // Validate that the last synced ledger is still valid
        const ledger = await this.server
          .ledgers()
          .ledger(syncState.lastLedgerSequence)
          .call();

        if (!ledger) {
          this.logger.warn(
            `Invalid ledger sequence ${syncState.lastLedgerSequence} for ${syncState.entityType}`,
          );
          syncState.lastLedgerSequence = await this.getSafeStartingPoint();
          await this.syncStateRepository.save(syncState);
        }
      } catch (error) {
        this.logger.error(
          `Error validating integrity for ${syncState.entityType}`,
          error,
        );
        syncState.lastLedgerSequence = await this.getSafeStartingPoint();
        await this.syncStateRepository.save(syncState);
      }
    }
  }

  private async resumeSyncOperations(): Promise<void> {
    const syncStates = await this.syncStateRepository.find({
      where: { status: SyncStatus.PARTITIONED },
    });

    for (const syncState of syncStates) {
      syncState.status = SyncStatus.IDLE;
      syncState.partitionStartTime = null;
      await this.syncStateRepository.save(syncState);
    }

    this.logger.log(`Resumed ${syncStates.length} sync operations`);
  }

  private async catchUpMissedLedgers(): Promise<void> {
    const currentLedger = await this.getCurrentLedgerSequence();
    const syncStates = await this.syncStateRepository.find();

    for (const syncState of syncStates) {
      const missedLedgers = currentLedger - syncState.lastLedgerSequence;

      if (missedLedgers > 0) {
        this.logger.log(
          `Catching up ${missedLedgers} missed ledgers for ${syncState.entityType}`,
        );

        // Update target ledger to trigger catch-up sync
        syncState.targetLedgerSequence = currentLedger;
        syncState.status = SyncStatus.RECOVERING;
        await this.syncStateRepository.save(syncState);
      }
    }
  }

  private async exitQuarantineMode(): Promise<void> {
    // Restore full functionality
    this.logger.log('Exited quarantine mode');
  }

  private async updateRecoveryMetrics(
    recoveryStartTime: number,
  ): Promise<void> {
    const recoveryDuration = Date.now() - recoveryStartTime;
    const partitionDuration = recoveryStartTime - this.partitionStartTime;

    const currentMetrics = this.metrics.value;
    const newMetrics = {
      ...currentMetrics,
      partitionCount: currentMetrics.partitionCount + 1,
      totalPartitionTime: currentMetrics.totalPartitionTime + partitionDuration,
      averageRecoveryTime:
        (currentMetrics.averageRecoveryTime + recoveryDuration) / 2,
      entitiesAffected: await this.getAffectedEntityCount(),
    };

    this.metrics.next(newMetrics);
  }

  private async handleRecoveryFailure(error: any): Promise<void> {
    this.logger.error('Recovery failed, implementing fallback strategy', error);

    // Fallback strategy: reset to a known good state
    const safeStartingPoint = await this.getSafeStartingPoint();
    const syncStates = await this.syncStateRepository.find();

    for (const syncState of syncStates) {
      syncState.lastLedgerSequence = safeStartingPoint;
      syncState.status = SyncStatus.RECOVERING;
      syncState.retryCount++;
      await this.syncStateRepository.save(syncState);
    }

    // If retry count is too high, mark as data loss scenario
    const hasHighRetryCount = syncStates.some((state) => state.retryCount > 3);
    if (hasHighRetryCount) {
      const currentMetrics = this.metrics.value;
      this.metrics.next({
        ...currentMetrics,
        dataLoss: true,
      });

      this.logger.error(
        'Data loss scenario detected, manual intervention required',
      );
    }
  }

  private async escalatePartition(): Promise<void> {
    this.logger.error(
      'Partition escalation triggered - manual intervention required',
    );

    // Send alerts, create tickets, etc.
    // This would integrate with your monitoring/alerting system
  }

  private async enableGracefulDegradation(): Promise<void> {
    // Implement graceful degradation logic
    // This might include:
    // - Serving cached data
    // - Limited write operations
    // - Read-only mode for non-critical functions

    this.logger.log('Enabled graceful degradation mode');
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

  private async getSafeStartingPoint(): Promise<number> {
    try {
      // Get a ledger from a few minutes ago to ensure it's stable
      const currentLedger = await this.getCurrentLedgerSequence();
      return Math.max(0, currentLedger - 100); // Go back 100 ledgers as safety margin
    } catch (error) {
      this.logger.error('Failed to get safe starting point', error);
      return 0;
    }
  }

  private async getAffectedEntities(): Promise<string[]> {
    const syncStates = await this.syncStateRepository.find({
      where: { status: SyncStatus.PARTITIONED },
    });

    return syncStates.map((state) => `${state.entityType}:${state.entityId}`);
  }

  private async getAffectedEntityCount(): Promise<number> {
    const syncStates = await this.syncStateRepository.find({
      where: { status: SyncStatus.PARTITIONED },
    });

    return syncStates.length;
  }

  // Public API methods
  getPartitionStatus() {
    return this.isPartitioned.asObservable();
  }

  getPartitionEvents() {
    return this.partitionEvents.asObservable();
  }

  getMetrics() {
    return this.metrics.asObservable();
  }

  async forceRecovery(): Promise<void> {
    if (this.isPartitioned.value) {
      await this.initiateRecovery();
    }
  }

  async isInPartition(): Promise<boolean> {
    return this.isPartitioned.value;
  }

  getPartitionStatistics() {
    return this.metrics.value;
  }

  async testPartitionRecovery(): Promise<void> {
    this.logger.log('Testing partition recovery procedures');

    // Simulate partition detection and recovery
    await this.handlePartition();

    // Wait a bit then simulate recovery
    setTimeout(async () => {
      await this.initiateRecovery();
    }, 5000);
  }
}

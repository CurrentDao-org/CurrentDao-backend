import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { SyncState } from './entities/sync-state.entity';
import { SyncService } from './sync.service';
import { ConflictResolver } from './resolvers/conflict.resolver';
import { PartitionHandler } from './handlers/partition.handler';
import { PerformanceOptimizer } from './optimizers/performance.optimizer';
import { RecoveryService } from './recovery/recovery.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncState]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    SyncService,
    ConflictResolver,
    PartitionHandler,
    PerformanceOptimizer,
    RecoveryService,
  ],
  exports: [
    SyncService,
    ConflictResolver,
    PartitionHandler,
    PerformanceOptimizer,
    RecoveryService,
  ],
  controllers: [],
})
export class SyncModule {}

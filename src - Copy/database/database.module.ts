import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { MigrationService } from './migrations/migration.service';
import { QueryOptimizerService } from './optimization/query-optimizer.service';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { BackupService } from './backup/backup.service';
import { QueryCacheService } from './caching/query-cache.service';
import { IndexingStrategy } from './strategies/indexing.strategy';

@Global()
@Module({
  imports: [
    // TypeORM is already configured in app.module.ts
  ],
  providers: [
    DatabaseService,
    MigrationService,
    QueryOptimizerService,
    PerformanceMonitorService,
    BackupService,
    QueryCacheService,
    IndexingStrategy,
  ],
  exports: [
    DatabaseService,
    MigrationService,
    QueryOptimizerService,
    PerformanceMonitorService,
    BackupService,
    QueryCacheService,
    IndexingStrategy,
  ],
})
export class DatabaseModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';
import { TransactionValidatorService } from './validation/transaction-validator.service';
import { SettlementService } from './settlement/settlement.service';
import { ReconciliationService } from './reconciliation/reconciliation.service';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { RegulatoryComplianceService } from './compliance/regulatory-compliance.service';
import { Transaction } from './entities/transaction.entity';
import { TransactionAuditLog } from './entities/transaction-audit-log.entity';
import { SettlementRecord } from './entities/settlement-record.entity';
import { ReconciliationReport } from './entities/reconciliation-report.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Transaction,
      TransactionAuditLog,
      SettlementRecord,
      ReconciliationReport,
    ]),
    CacheModule.register(),
    ScheduleModule.forRoot(),
  ],
  controllers: [TransactionController],
  providers: [
    TransactionService,
    TransactionValidatorService,
    SettlementService,
    ReconciliationService,
    PerformanceMonitorService,
    RegulatoryComplianceService,
  ],
  exports: [
    TransactionService,
    TransactionValidatorService,
    SettlementService,
    ReconciliationService,
    PerformanceMonitorService,
    RegulatoryComplianceService,
  ],
})
export class TransactionModule {}

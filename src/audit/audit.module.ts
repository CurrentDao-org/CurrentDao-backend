import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './entities/audit-log.entity';
import { TransactionLog } from './entities/transaction-log.entity';
import { ComplianceReport } from './reports/compliance.report';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, TransactionLog])],
  providers: [AuditService, ComplianceReport],
  exports: [AuditService, ComplianceReport],
})
export class AuditModule {}

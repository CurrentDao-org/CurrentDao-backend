import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { TransactionStatusEntity } from './entities/transaction-status.entity';
import { TransactionMonitorService } from './transaction-monitor.service';
import { RetryService } from './retry/retry.service';
import { AlertService } from './alerts/alert.service';
import { TransactionWorkflowService } from './workflows/transaction.workflow';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionStatusEntity]),
    ScheduleModule,
  ],
  controllers: [MonitoringController],
  providers: [
    TransactionMonitorService,
    RetryService,
    AlertService,
    TransactionWorkflowService,
  ],
  exports: [
    TransactionMonitorService,
    RetryService,
    AlertService,
    TransactionWorkflowService,
  ],
})
export class MonitoringModule {}

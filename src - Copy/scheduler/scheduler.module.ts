import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { ScheduledJob } from './entities/scheduled-job.entity';
import { TradeExecutionJob } from './jobs/trade-execution.job';
import { SettlementJob } from './jobs/settlement.job';
import { MaintenanceJob } from './jobs/maintenance.job';
import { MarketHoursService } from './services/market-hours.service';
import { SchedulerController } from './controllers/scheduler.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduledJob]),
    SchedulerModule.forRoot(),
  ],
  controllers: [SchedulerController],
  providers: [
    SchedulerService,
    TradeExecutionJob,
    SettlementJob,
    MaintenanceJob,
    MarketHoursService,
  ],
  exports: [SchedulerService, MarketHoursService],
})
export class SchedulerModule {}

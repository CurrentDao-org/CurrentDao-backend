import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskDataEntity } from './entities/risk-data.entity';
import { RiskAssessorService } from './assessment/risk-assessor.service';
import { RealTimeMonitorService } from './monitoring/real-time-monitor.service';
import { HedgingStrategyService } from './hedging/hedging-strategy.service';
import { VarCalculatorService } from './calculations/var-calculator.service';
import { StressTestService } from './testing/stress-test.service';
import { RiskManagementController } from './controller/risk-management.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RiskDataEntity])],
  controllers: [RiskManagementController],
  providers: [
    RiskAssessorService,
    RealTimeMonitorService,
    HedgingStrategyService,
    VarCalculatorService,
    StressTestService,
  ],
  exports: [
    RiskAssessorService,
    RealTimeMonitorService,
    HedgingStrategyService,
    VarCalculatorService,
    StressTestService,
  ],
})
export class RiskManagementModule {}

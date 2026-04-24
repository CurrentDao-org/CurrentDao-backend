import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PerformanceService } from './analytics/performance.service';
import { RiskAssessmentService } from './risk/risk-assessment.service';
import { PortfolioOptimizerService } from './optimization/portfolio-optimizer.service';
import { PositionTrackerService } from './tracking/position-tracker.service';
import { TradingIntegrationService } from './integration/trading-integration.service';
import { PortfolioEntity } from './entities/portfolio.entity';
import { PositionEntity } from './entities/position.entity';
import { AssetEntity } from './entities/asset.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { PortfolioPerformanceEntity } from './entities/portfolio-performance.entity';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PortfolioEntity,
      PositionEntity,
      AssetEntity,
      TransactionEntity,
      PortfolioPerformanceEntity,
    ]),
    ScheduleModule,
  ],
  controllers: [PortfolioController],
  providers: [
    PortfolioService,
    PerformanceService,
    RiskAssessmentService,
    PortfolioOptimizerService,
    PositionTrackerService,
    TradingIntegrationService,
  ],
  exports: [
    PortfolioService,
    PerformanceService,
    RiskAssessmentService,
    PortfolioOptimizerService,
    PositionTrackerService,
    TradingIntegrationService,
  ],
})
export class PortfolioModule {}

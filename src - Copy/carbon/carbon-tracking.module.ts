import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CarbonData } from './entities/carbon-data.entity';
import { EmissionCalculatorService } from './calculations/emission-calculator.service';
import { RealTimeTrackerService } from './tracking/real-time-tracker.service';
import { SustainabilityReportService } from './reporting/sustainability-report.service';
import { CarbonOffsetService } from './offsets/carbon-offset.service';
import { ReductionAnalyticsService } from './analytics/reduction-analytics.service';
import { CarbonController } from './carbon.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CarbonData])],
  controllers: [CarbonController],
  providers: [
    EmissionCalculatorService,
    RealTimeTrackerService,
    SustainabilityReportService,
    CarbonOffsetService,
    ReductionAnalyticsService,
  ],
  exports: [
    EmissionCalculatorService,
    RealTimeTrackerService,
    SustainabilityReportService,
    CarbonOffsetService,
    ReductionAnalyticsService,
  ],
})
export class CarbonTrackingModule {}

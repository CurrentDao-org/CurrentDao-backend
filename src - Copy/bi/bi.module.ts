import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

// Entities
import { Dashboard } from './entities/dashboard.entity';
import { Report } from './entities/report.entity';
import { ReportTemplate } from './entities/report-template.entity';
import { KPI } from './entities/kpi.entity';
import { KPIValue } from './entities/kpi-value.entity';

// Services
import { BIService } from './bi.service';
import { AdvancedAnalyticsService } from './analytics/advanced-analytics.service';
import { CustomReportsService } from './reports/custom-reports.service';
import { KPITrackingService } from './kpi/kpi-tracking.service';
import { ExecutiveInsightsService } from './insights/executive-insights.service';
import { DataVizService } from './visualization/data-viz.service';

// Controller
import { BIController } from './bi.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Dashboard,
      Report,
      ReportTemplate,
      KPI,
      KPIValue,
    ]),
    HttpModule,
    ScheduleModule,
    ConfigModule,
  ],
  controllers: [BIController],
  providers: [
    BIService,
    AdvancedAnalyticsService,
    CustomReportsService,
    KPITrackingService,
    ExecutiveInsightsService,
    DataVizService,
  ],
  exports: [
    BIService,
    AdvancedAnalyticsService,
    CustomReportsService,
    KPITrackingService,
    ExecutiveInsightsService,
    DataVizService,
  ],
})
export class BIModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { StreamProcessorService } from './streaming/stream-processor.service';
import { LiveAggregationService } from './aggregation/live-aggregation.service';
import { DashboardDataService } from './dashboard/dashboard-data.service';
import { PerformanceMonitorService } from './monitoring/performance-monitor.service';
import { TradingIntegrationService } from './integration/trading-integration.service';
import { AnalyticsData } from './entities/analytics-data.entity';
import { TradingVolumeReport } from './reports/trading-volume.report';
import { PriceTrendsReport } from './reports/price-trends.report';
import { UserPerformanceReport } from './reports/user-performance.report';
import { MarketEfficiencyReport } from './reports/market-efficiency.report';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsData])],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    StreamProcessorService,
    LiveAggregationService,
    DashboardDataService,
    PerformanceMonitorService,
    TradingIntegrationService,
    TradingVolumeReport,
    PriceTrendsReport,
    UserPerformanceReport,
    MarketEfficiencyReport,
  ],
  exports: [
    AnalyticsService,
    StreamProcessorService,
    LiveAggregationService,
    DashboardDataService,
    PerformanceMonitorService,
    TradingIntegrationService,
  ],
})
export class AnalyticsModule {}

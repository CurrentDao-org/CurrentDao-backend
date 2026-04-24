import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { AnalyticsData } from './entities/analytics-data.entity';
import { TradingVolumeReport } from './reports/trading-volume.report';
import { PriceTrendsReport } from './reports/price-trends.report';
import { UserPerformanceReport } from './reports/user-performance.report';
import { MarketEfficiencyReport } from './reports/market-efficiency.report';

@Module({
  imports: [TypeOrmModule.forFeature([AnalyticsData])],
  providers: [
    AnalyticsService,
    TradingVolumeReport,
    PriceTrendsReport,
    UserPerformanceReport,
    MarketEfficiencyReport,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

import { Module, Global } from '@nestjs/common';
import { MetricsCollectorService } from './metrics/metrics-collector.service';
import { DashboardService } from './dashboard/dashboard.service';
import { AlertService } from './alerts/alert-service';
import { PerformanceAnalyticsService } from './analytics/performance-analytics.service';
import { OptimizationService } from './optimization/optimization-service';

@Global()
@Module({
  providers: [
    MetricsCollectorService,
    DashboardService,
    AlertService,
    PerformanceAnalyticsService,
    OptimizationService,
  ],
  exports: [MetricsCollectorService, DashboardService, AlertService, PerformanceAnalyticsService, OptimizationService],
})
export class ApmModule {}

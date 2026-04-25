import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { AutoScalingService } from './auto-scaling/auto-scaling.service';
import { ResourceManagerService } from './resource-management/resource-manager.service';
import { PerformanceProfilerService } from './profiling/performance-profiler.service';
import { QueryOptimizerService } from './optimization/query-optimizer.service';
import { CachingOptimizerService } from './caching/caching-optimizer.service';
import { LoadBalancerService } from './load-balancing/load-balancer.service';
import { ResourceAnalyticsService } from './analytics/resource-analytics.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    AutoScalingService,
    ResourceManagerService,
    PerformanceProfilerService,
    QueryOptimizerService,
    CachingOptimizerService,
    LoadBalancerService,
    ResourceAnalyticsService,
  ],
  exports: [
    PerformanceService,
    AutoScalingService,
    ResourceManagerService,
    PerformanceProfilerService,
    QueryOptimizerService,
    CachingOptimizerService,
    LoadBalancerService,
    ResourceAnalyticsService,
  ],
})
export class PerformanceModule {}

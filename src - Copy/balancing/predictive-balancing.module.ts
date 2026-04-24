import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemandForecastService } from './forecasting/demand-forecast.service';
import { PredictiveBalancerService } from './algorithms/predictive-balancer.service';
import { SupplyAdjusterService } from './adjustment/supply-adjuster.service';
import { StabilityMonitorService } from './monitoring/stability-monitor.service';
import { PriceOptimizerService } from './optimization/price-optimizer.service';
import { BalancingData } from './entities/balancing-data.entity';
import { BalancingCommand } from './dto/balancing-command.dto';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([BalancingData]),
    ScheduleModule.forRoot(),
    ConfigModule,
  ],
  providers: [
    DemandForecastService,
    PredictiveBalancerService,
    SupplyAdjusterService,
    StabilityMonitorService,
    PriceOptimizerService,
  ],
  exports: [
    DemandForecastService,
    PredictiveBalancerService,
    SupplyAdjusterService,
    StabilityMonitorService,
    PriceOptimizerService,
  ],
  controllers: [],
})
export class PredictiveBalancingModule {}

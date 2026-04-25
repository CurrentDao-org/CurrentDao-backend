import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { ForecastingController } from './forecasting.controller';
import { ForecastingService } from './forecasting.service';
import { DemandForecastService } from './demand/demand-forecast.service';
import { SupplyForecastService } from './supply/supply-forecast.service';
import { WeatherIntegrationService } from './weather/weather-integration.service';
import { AccuracyTrackingService } from './accuracy/accuracy-tracking.service';
import { TradingIntegrationService } from './integration/trading-integration.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [ForecastingController],
  providers: [
    ForecastingService,
    DemandForecastService,
    SupplyForecastService,
    WeatherIntegrationService,
    AccuracyTrackingService,
    TradingIntegrationService,
  ],
  exports: [
    ForecastingService,
    DemandForecastService,
    SupplyForecastService,
    WeatherIntegrationService,
    AccuracyTrackingService,
    TradingIntegrationService,
  ],
})
export class ForecastingModule {}

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from '../config/database.config';
import { ForecastData } from './entities/forecast-data.entity';
import { TimeSeriesService } from './models/time-series.service';
import { WeatherDataService } from './integrations/weather-data.service';
import { EconomicIndicatorService } from './analysis/economic-indicator.service';
import { TrendPredictionService } from './prediction/trend-prediction.service';
import { EnsembleMethodsService } from './ensemble/ensemble-methods.service';
import { MarketForecastingController } from './market-forecasting.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule.forFeature(databaseConfig),
    TypeOrmModule.forFeature([ForecastData]),
  ],
  controllers: [MarketForecastingController],
  providers: [
    TimeSeriesService,
    WeatherDataService,
    EconomicIndicatorService,
    TrendPredictionService,
    EnsembleMethodsService,
  ],
  exports: [
    TimeSeriesService,
    WeatherDataService,
    EconomicIndicatorService,
    TrendPredictionService,
    EnsembleMethodsService,
  ],
})
export class MarketForecastingModule {}

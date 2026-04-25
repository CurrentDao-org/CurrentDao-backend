import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PredictiveController } from './predictive.controller';
import { PredictiveService } from './predictive.service';
import { ModelTrainerService } from './ml-models/model-trainer.service';
import { TimeSeriesService } from './forecasting/time-series.service';
import { InsightsGeneratorService } from './insights/insights-generator.service';
import { ModelMonitorService } from './monitoring/model-monitor.service';
import { PredictionEndpointsService } from './api/prediction-endpoints.service';

@Module({
  imports: [
    TypeOrmModule.forRoot(),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [PredictiveController],
  providers: [
    PredictiveService,
    ModelTrainerService,
    TimeSeriesService,
    InsightsGeneratorService,
    ModelMonitorService,
    PredictionEndpointsService,
  ],
  exports: [
    PredictiveService,
    ModelTrainerService,
    TimeSeriesService,
    InsightsGeneratorService,
    ModelMonitorService,
    PredictionEndpointsService,
  ],
})
export class PredictiveModule {}

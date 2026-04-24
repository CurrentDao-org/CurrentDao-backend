import { Module } from '@nestjs/common';
import { AdvancedAnalyticsController } from './advanced-analytics.controller';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { BigDataProcessorService } from './bigdata/big-data-processor.service';
import { StreamProcessorService } from './streaming/stream-processor.service';
import { DataVizService } from './visualization/data-viz.service';
import { PredictiveAnalyticsService } from './predictive/predictive-analytics.service';
import { DataWarehouseService } from './warehouse/data-warehouse.service';
import { QueryOptimizerService } from './optimization/query-optimizer.service';
import { MlPipelineService } from './ml-pipeline/ml-pipeline.service';

@Module({
  controllers: [AdvancedAnalyticsController],
  providers: [
    AdvancedAnalyticsService,
    BigDataProcessorService,
    StreamProcessorService,
    DataVizService,
    PredictiveAnalyticsService,
    DataWarehouseService,
    QueryOptimizerService,
    MlPipelineService,
  ],
  exports: [
    AdvancedAnalyticsService,
    BigDataProcessorService,
    StreamProcessorService,
    DataVizService,
    PredictiveAnalyticsService,
    DataWarehouseService,
    QueryOptimizerService,
    MlPipelineService,
  ],
})
export class AdvancedAnalyticsModule {}

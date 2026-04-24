import { Module } from '@nestjs/common';
import { AdvancedPredictiveController } from './advanced-predictive.controller';
import { AdvancedPredictiveService } from './advanced-predictive.service';
import { DeepLearningService } from './deep-learning/deep-learning.service';
import { EnsembleService } from './ensemble/ensemble.service';
import { ModelTrainingService } from './training/model-training.service';
import { ModelInferenceService } from './inference/model-inference.service';
import { ExplainabilityService } from './explainability/explainability.service';
import { FeatureEngineeringService } from './feature-engineering/feature-engineering.service';
import { ModelMonitoringService } from './monitoring/model-monitoring.service';

@Module({
  controllers: [AdvancedPredictiveController],
  providers: [
    AdvancedPredictiveService,
    DeepLearningService,
    EnsembleService,
    ModelTrainingService,
    ModelInferenceService,
    ExplainabilityService,
    FeatureEngineeringService,
    ModelMonitoringService,
  ],
  exports: [
    AdvancedPredictiveService,
    DeepLearningService,
    EnsembleService,
    ModelTrainingService,
    ModelInferenceService,
    ExplainabilityService,
    FeatureEngineeringService,
    ModelMonitoringService,
  ],
})
export class AdvancedPredictiveModule {}

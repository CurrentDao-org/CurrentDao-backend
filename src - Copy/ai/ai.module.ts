import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ModelServingService } from './models/model-serving.service';
import { AiServiceIntegration } from './services/ai-service-integration.service';
import { ModelVersioningService } from './versioning/model-versioning.service';
import { InferenceEngineService } from './inference/inference-engine.service';
import { ModelMonitorService } from './monitoring/model-monitor.service';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    ModelServingService,
    AiServiceIntegration,
    ModelVersioningService,
    InferenceEngineService,
    ModelMonitorService,
  ],
  exports: [AiService, InferenceEngineService],
})
export class AiModule {}
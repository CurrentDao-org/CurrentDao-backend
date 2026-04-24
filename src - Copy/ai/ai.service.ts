import { Injectable, Logger } from '@nestjs/common';
import { ModelServingService } from './models/model-serving.service';
import { InferenceEngineService } from './inference/inference-engine.service';
import { ModelVersioningService } from './versioning/model-versioning.service';
import { ModelMonitorService } from './monitoring/model-monitor.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly modelServing: ModelServingService,
    private readonly inferenceEngine: InferenceEngineService,
    private readonly versioning: ModelVersioningService,
    private readonly monitor: ModelMonitorService,
  ) {}

  async infer(modelId: string, input: any): Promise<any> {
    const model = await this.modelServing.getModel(modelId);
    const result = await this.inferenceEngine.run(model, input);
    this.monitor.record(modelId, result.latencyMs);
    return result;
  }

  async listModels() {
    return this.modelServing.listModels();
  }

  async getModelVersions(modelId: string) {
    return this.versioning.getVersions(modelId);
  }

  async getMetrics() {
    return this.monitor.getMetrics();
  }
}
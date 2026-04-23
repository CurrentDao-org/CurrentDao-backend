import { Injectable, Logger } from '@nestjs/common';

interface ModelDefinition {
  id: string;
  name: string;
  version: string;
  type: 'classification' | 'regression' | 'nlp' | 'custom';
  endpoint?: string;
}

@Injectable()
export class ModelServingService {
  private readonly logger = new Logger(ModelServingService.name);
  private readonly registry = new Map<string, ModelDefinition>([
    ['fraud-v1', { id: 'fraud-v1', name: 'Fraud Detector', version: '1.0.0', type: 'classification' }],
    ['sentiment-v1', { id: 'sentiment-v1', name: 'Sentiment Analyzer', version: '1.0.0', type: 'nlp' }],
  ]);

  async getModel(id: string): Promise<ModelDefinition> {
    const model = this.registry.get(id);
    if (!model) throw new Error(`Model ${id} not found`);
    return model;
  }

  async listModels(): Promise<ModelDefinition[]> {
    return Array.from(this.registry.values());
  }

  async registerModel(model: ModelDefinition): Promise<void> {
    this.registry.set(model.id, model);
    this.logger.log(`Model registered: ${model.id} v${model.version}`);
  }
}
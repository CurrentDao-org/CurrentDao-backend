import { Injectable, Logger } from '@nestjs/common';

interface ModelMetrics {
  modelId: string;
  callCount: number;
  totalLatencyMs: number;
  avgLatencyMs: number;
  errorCount: number;
}

@Injectable()
export class ModelMonitorService {
  private readonly logger = new Logger(ModelMonitorService.name);
  private readonly metrics = new Map<string, ModelMetrics>();

  record(modelId: string, latencyMs: number, error = false): void {
    const m = this.metrics.get(modelId) || { modelId, callCount: 0, totalLatencyMs: 0, avgLatencyMs: 0, errorCount: 0 };
    m.callCount++;
    m.totalLatencyMs += latencyMs;
    m.avgLatencyMs = m.totalLatencyMs / m.callCount;
    if (error) m.errorCount++;
    this.metrics.set(modelId, m);
  }

  getMetrics(): ModelMetrics[] {
    return Array.from(this.metrics.values());
  }

  getModelMetrics(modelId: string): ModelMetrics | null {
    return this.metrics.get(modelId) || null;
  }
}
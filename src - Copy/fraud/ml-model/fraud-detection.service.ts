import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FraudDetectionService {
  private readonly logger = new Logger(FraudDetectionService.name);
  private totalScored = 0;
  private fraudDetected = 0;

  /**
   * Returns a fraud probability score 0–1.
   * In production, replace with actual ML model inference (TensorFlow, ONNX, etc.)
   */
  async score(transaction: Record<string, any>): Promise<number> {
    const start = Date.now();
    this.totalScored++;

    const riskFactors = [
      transaction.amount > 10000 ? 0.4 : 0,
      transaction.unusualLocation ? 0.3 : 0,
      transaction.newDevice ? 0.2 : 0,
      transaction.rapidSuccession ? 0.3 : 0,
    ];

    const score = Math.min(riskFactors.reduce((a, b) => a + b, 0), 1);
    if (score > 0.85) this.fraudDetected++;

    const latency = Date.now() - start;
    if (latency > 50) this.logger.warn(`Inference latency ${latency}ms exceeded 50ms target`);

    return score;
  }

  async getMetrics() {
    return {
      totalScored: this.totalScored,
      fraudDetected: this.fraudDetected,
      detectionRate: this.totalScored > 0 ? (this.fraudDetected / this.totalScored) * 100 : 0,
    };
  }
}
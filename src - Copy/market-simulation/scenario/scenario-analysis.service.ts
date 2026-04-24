import { Injectable } from '@nestjs/common';

@Injectable()
export class ScenarioAnalysisService {
  private readonly scenarios: Array<{ name: string; createdAt: string }> = [];

  async runScenario(name: string, factors: Record<string, unknown>) {
    const simulationId = `scenario-${Date.now()}`;
    this.scenarios.push({ name, createdAt: new Date().toISOString() });
    return {
      simulationId,
      name,
      factors,
      result: {
        priceShiftPercent: (Math.random() - 0.5) * 10,
        volatilityIndex: Number((Math.random() * 1.5).toFixed(2)),
      },
      executedAt: new Date().toISOString(),
    };
  }

  async listScenarios() {
    return this.scenarios.slice(-10);
  }
}

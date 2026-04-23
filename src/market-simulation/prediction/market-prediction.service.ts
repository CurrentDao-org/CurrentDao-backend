import { Injectable } from '@nestjs/common';

@Injectable()
export class MarketPredictionService {
  async predictMarketTrajectory(horizonDays: number, marketSignals: Record<string, unknown>) {
    return {
      horizonDays,
      trend: horizonDays > 30 ? 'STABLE' : 'DYNAMIC',
      confidence: Number((Math.random() * 0.2 + 0.8).toFixed(2)),
      estimates: Array.from({ length: Math.min(horizonDays, 7) }, (_, index) => ({
        day: index + 1,
        expectedPriceChangePercent: Number(((Math.random() - 0.5) * 3).toFixed(2)),
      })),
      generatedAt: new Date().toISOString(),
    };
  }
}

import { Module } from '@nestjs/common';
import { MarketSimulationController } from './market-simulation.controller';
import { MarketModelingService } from './modeling/market-modeling.service';
import { ScenarioAnalysisService } from './scenario/scenario-analysis.service';
import { StressTestingService } from './stress/stress-testing.service';
import { MarketPredictionService } from './prediction/market-prediction.service';
import { HistoricalReplayService } from './replay/historical-replay.service';
import { AgentBasedModelingService } from './agent/agent-based-modeling.service';
import { TradingIntegrationService } from './integration/trading-integration.service';

@Module({
  controllers: [MarketSimulationController],
  providers: [
    MarketModelingService,
    ScenarioAnalysisService,
    StressTestingService,
    MarketPredictionService,
    HistoricalReplayService,
    AgentBasedModelingService,
    TradingIntegrationService,
  ],
})
export class MarketSimulationModule {}

import { Body, Controller, Get, Post } from '@nestjs/common';
import { MarketModelingService } from './modeling/market-modeling.service';
import { ScenarioAnalysisService } from './scenario/scenario-analysis.service';
import { StressTestingService } from './stress/stress-testing.service';
import { MarketPredictionService } from './prediction/market-prediction.service';
import { HistoricalReplayService } from './replay/historical-replay.service';
import { AgentBasedModelingService } from './agent/agent-based-modeling.service';
import { TradingIntegrationService } from './integration/trading-integration.service';

@Controller('market-simulation')
export class MarketSimulationController {
  constructor(
    private readonly modeling: MarketModelingService,
    private readonly scenario: ScenarioAnalysisService,
    private readonly stress: StressTestingService,
    private readonly prediction: MarketPredictionService,
    private readonly replay: HistoricalReplayService,
    private readonly agents: AgentBasedModelingService,
    private readonly trading: TradingIntegrationService,
  ) {}

  @Get('overview')
  async getOverview() {
    return {
      modelStatus: await this.modeling.getModelStatus(),
      activeScenarios: await this.scenario.listScenarios(),
      agentCapacity: await this.agents.getActiveAgentCount(),
    };
  }

  @Post('forecast')
  async forecast(@Body() payload: { horizonDays: number; marketSignals: Record<string, unknown> }) {
    return this.prediction.predictMarketTrajectory(payload.horizonDays, payload.marketSignals);
  }

  @Post('scenario')
  async analyzeScenario(@Body() payload: { name: string; factors: Record<string, unknown> }) {
    return this.scenario.runScenario(payload.name, payload.factors);
  }

  @Post('stress')
  async stressTest(@Body() payload: { scenario: string; depth: number }) {
    return this.stress.runStressTest(payload.scenario, payload.depth);
  }

  @Post('replay')
  async replay(@Body() payload: { period: string }) {
    return this.replay.replayPeriod(payload.period);
  }

  @Post('agents')
  async simulateAgents(@Body() payload: { participants: number; behavior: string }) {
    return this.agents.simulateAgents(payload.participants, payload.behavior);
  }

  @Post('integration')
  async integrateTrading(@Body() payload: { strategyName: string; marketChannel: string }) {
    return this.trading.integrateStrategy(payload.strategyName, payload.marketChannel);
  }
}

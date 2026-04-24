import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskDataEntity } from '../entities/risk-data.entity';
import { StressTestDto } from '../dto/risk-assessment.dto';

@Injectable()
export class StressTestService {
  private readonly logger = new Logger(StressTestService.name);

  constructor(
    @InjectRepository(RiskDataEntity)
    private readonly riskDataRepository: Repository<RiskDataEntity>,
  ) {}

  async runStressTest(stressTestDto: StressTestDto): Promise<object> {
    this.logger.log(
      `Running stress test for portfolio: ${stressTestDto.portfolioId}`,
    );

    const results: {
      portfolioId: string;
      scenarios: Record<string, any>;
      summary: Record<string, any>;
      recommendations: string[];
      timestamp: Date;
    } = {
      portfolioId: stressTestDto.portfolioId,
      scenarios: {},
      summary: {},
      recommendations: [],
      timestamp: new Date(),
    };

    // Run predefined scenarios
    for (const scenario of stressTestDto.scenarios) {
      results.scenarios[scenario] = await this.runScenario(
        stressTestDto.portfolioId,
        scenario,
        stressTestDto.shockMagnitude,
      );
    }

    // Run custom scenario if provided
    if (stressTestDto.customScenario) {
      results.scenarios['custom'] = await this.runCustomScenario(
        stressTestDto.portfolioId,
        stressTestDto.customScenario,
      );
    }

    // Generate summary and recommendations
    results.summary = await this.generateStressTestSummary(results.scenarios);
    results.recommendations = await this.generateStressTestRecommendations(
      results.scenarios,
    );

    // Update risk data with stress test results
    await this.updateRiskDataWithStressTest(stressTestDto.portfolioId, results);

    this.logger.log(
      `Stress test completed for portfolio: ${stressTestDto.portfolioId}, Scenarios: ${stressTestDto.scenarios.length}`,
    );

    return results;
  }

  private async runScenario(
    portfolioId: string,
    scenario: string,
    shockMagnitude?: number,
  ): Promise<object> {
    const portfolioValue = await this.getPortfolioValue(portfolioId);
    const baseRisk = await this.getBaseRiskMetrics(portfolioId);

    let scenarioResult;

    switch (scenario) {
      case 'market_crash':
        scenarioResult = await this.simulateMarketCrash(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'interest_rate_shock':
        scenarioResult = await this.simulateInterestRateShock(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'currency_crisis':
        scenarioResult = await this.simulateCurrencyCrisis(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'commodity_price_shock':
        scenarioResult = await this.simulateCommodityPriceShock(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'credit_crisis':
        scenarioResult = await this.simulateCreditCrisis(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'liquidity_crisis':
        scenarioResult = await this.simulateLiquidityCrisis(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'operational_failure':
        scenarioResult = await this.simulateOperationalFailure(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'regulatory_change':
        scenarioResult = await this.simulateRegulatoryChange(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'geopolitical_crisis':
        scenarioResult = await this.simulateGeopoliticalCrisis(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      case 'pandemic':
        scenarioResult = await this.simulatePandemic(
          portfolioValue,
          baseRisk,
          shockMagnitude,
        );
        break;
      default:
        scenarioResult = await this.simulateGenericShock(
          portfolioValue,
          baseRisk,
          scenario,
          shockMagnitude,
        );
    }

    return {
      scenario,
      ...scenarioResult,
      severity: this.calculateScenarioSeverity(scenarioResult),
      recoveryTime: this.estimateRecoveryTime(scenarioResult),
    };
  }

  private async runCustomScenario(
    portfolioId: string,
    customScenario: object,
  ): Promise<object> {
    const portfolioValue = await this.getPortfolioValue(portfolioId);
    const baseRisk = await this.getBaseRiskMetrics(portfolioId);

    // Apply custom shocks
    const marketShock = customScenario['marketShock'] || 0;
    const interestRateShock = customScenario['interestRateShock'] || 0;
    const currencyShock = customScenario['currencyShock'] || 0;
    const commodityShock = customScenario['commodityShock'] || 0;
    const creditShock = customScenario['creditShock'] || 0;

    const totalImpact = this.calculateTotalImpact(portfolioValue, {
      marketShock,
      interestRateShock,
      currencyShock,
      commodityShock,
      creditShock,
    });

    return {
      scenario: 'custom',
      portfolioImpact: totalImpact,
      riskIncrease: this.calculateRiskIncrease(baseRisk, totalImpact),
      customParameters: customScenario,
      severity: this.calculateScenarioSeverity({
        portfolioImpact: totalImpact,
      }),
      recoveryTime: this.estimateRecoveryTime({ portfolioImpact: totalImpact }),
    };
  }

  private async simulateMarketCrash(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || -30; // Default 30% market drop
    const portfolioImpact = portfolioValue * (magnitude / 100);

    // Calculate sector-specific impacts
    const sectorImpacts = {
      energy: portfolioValue * 0.4 * (magnitude / 100) * 1.2, // Energy more volatile
      technology: portfolioValue * 0.3 * (magnitude / 100) * 1.5, // Tech more volatile
      utilities: portfolioValue * 0.2 * (magnitude / 100) * 0.8, // Utilities less volatile
      other: portfolioValue * 0.1 * (magnitude / 100),
    };

    return {
      portfolioImpact,
      sectorImpacts,
      riskIncrease: Math.abs(magnitude) / 10, // Risk increases with crash severity
      correlationIncrease: 0.3, // Correlations increase during crashes
      liquidityDecrease: Math.abs(magnitude) / 20, // Liquidity decreases
    };
  }

  private async simulateInterestRateShock(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || 200; // Default 200 bps increase
    const duration = 5; // Portfolio duration in years

    // Calculate bond price impact
    const bondImpact = -duration * (magnitude / 10000) * portfolioValue * 0.6;

    // Calculate equity impact
    const equityImpact = portfolioValue * 0.4 * (magnitude / 10000) * -2; // Equities negatively impacted

    const portfolioImpact = bondImpact + equityImpact;

    return {
      portfolioImpact,
      bondImpact,
      equityImpact,
      riskIncrease: Math.abs(magnitude) / 100,
      yieldCurveShift: magnitude,
      durationImpact: bondImpact,
    };
  }

  private async simulateCurrencyCrisis(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || -20; // Default 20% currency devaluation
    const currencyExposure = portfolioValue * 0.3; // 30% currency exposure

    const portfolioImpact = currencyExposure * (magnitude / 100);

    // Calculate impact by currency
    const currencyImpacts = {
      EUR: currencyExposure * 0.4 * (magnitude / 100),
      GBP: currencyExposure * 0.3 * (magnitude / 100) * 1.1,
      JPY: currencyExposure * 0.2 * (magnitude / 100) * 0.9,
      other: currencyExposure * 0.1 * (magnitude / 100),
    };

    return {
      portfolioImpact,
      currencyImpacts,
      riskIncrease: Math.abs(magnitude) / 15,
      hedgeEffectiveness: 0.7, // Hedges are 70% effective during crisis
    };
  }

  private async simulateCommodityPriceShock(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || -40; // Default 40% commodity price drop
    const commodityExposure = portfolioValue * 0.25; // 25% commodity exposure

    const portfolioImpact = commodityExposure * (magnitude / 100);

    // Calculate impact by commodity
    const commodityImpacts = {
      oil: commodityExposure * 0.5 * (magnitude / 100),
      gas: commodityExposure * 0.3 * (magnitude / 100) * 1.2,
      renewables: commodityExposure * 0.2 * (magnitude / 100) * -0.5, // Renewables benefit
    };

    return {
      portfolioImpact,
      commodityImpacts,
      riskIncrease: Math.abs(magnitude) / 12,
      correlationWithEnergy: 0.8,
    };
  }

  private async simulateCreditCrisis(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || 300; // Default 300 bps credit spread widening
    const creditExposure = portfolioValue * 0.35; // 35% credit exposure

    const portfolioImpact = creditExposure * (magnitude / 10000);

    // Calculate impact by credit quality
    const creditImpacts = {
      aaa: creditExposure * 0.2 * (magnitude / 10000) * 0.5,
      aa: creditExposure * 0.3 * (magnitude / 10000) * 0.7,
      a: creditExposure * 0.3 * (magnitude / 10000) * 1.0,
      bbb: creditExposure * 0.2 * (magnitude / 10000) * 1.5,
    };

    return {
      portfolioImpact,
      creditImpacts,
      riskIncrease: Math.abs(magnitude) / 150,
      defaultRateIncrease: magnitude / 500,
      liquidityImpact: magnitude / 200,
    };
  }

  private async simulateLiquidityCrisis(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || 50; // Default 50% liquidity reduction
    const illiquidAssets = portfolioValue * 0.4; // 40% illiquid assets

    const portfolioImpact = illiquidAssets * (magnitude / 100) * 0.3; // 30% price impact

    return {
      portfolioImpact,
      liquidityReduction: magnitude,
      fireSaleDiscount: magnitude / 2,
      fundingCostIncrease: magnitude / 10,
      riskIncrease: magnitude / 25,
    };
  }

  private async simulateOperationalFailure(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || 10; // Default 10% operational impact
    const operationalRisk = portfolioValue * 0.05; // 5% operational risk capital

    const portfolioImpact = operationalRisk * (magnitude / 100);

    return {
      portfolioImpact,
      systemDowntime: magnitude * 24, // hours
      remediationCost: portfolioImpact * 0.5,
      regulatoryFines: portfolioImpact * 0.2,
      reputationalImpact: portfolioImpact * 0.3,
      riskIncrease: magnitude / 20,
    };
  }

  private async simulateRegulatoryChange(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || 15; // Default 15% regulatory impact
    const regulatoryCapital = portfolioValue * 0.08; // 8% regulatory capital

    const portfolioImpact = regulatoryCapital * (magnitude / 100);

    return {
      portfolioImpact,
      capitalRequirementIncrease: magnitude,
      complianceCost: portfolioImpact * 0.6,
      businessRestriction: portfolioImpact * 0.4,
      riskIncrease: magnitude / 30,
    };
  }

  private async simulateGeopoliticalCrisis(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || -25; // Default 25% market impact
    const portfolioImpact = portfolioValue * (magnitude / 100);

    return {
      portfolioImpact,
      regionalImpacts: {
        europe: portfolioValue * 0.3 * (magnitude / 100) * 1.2,
        asia: portfolioValue * 0.4 * (magnitude / 100) * 0.8,
        americas: portfolioValue * 0.3 * (magnitude / 100) * 1.0,
      },
      riskIncrease: Math.abs(magnitude) / 10,
      volatilityIncrease: Math.abs(magnitude) / 5,
    };
  }

  private async simulatePandemic(
    portfolioValue: number,
    baseRisk: object,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || -35; // Default 35% economic impact
    const portfolioImpact = portfolioValue * (magnitude / 100);

    return {
      portfolioImpact,
      sectorImpacts: {
        energy: portfolioValue * 0.2 * (magnitude / 100) * 1.5,
        travel: portfolioValue * 0.1 * (magnitude / 100) * 2.0,
        technology: portfolioValue * 0.3 * (magnitude / 100) * -0.5,
        healthcare: portfolioValue * 0.2 * (magnitude / 100) * -0.8,
        utilities: portfolioValue * 0.2 * (magnitude / 100) * 0.3,
      },
      riskIncrease: Math.abs(magnitude) / 8,
      supplyChainDisruption: magnitude / 2,
    };
  }

  private async simulateGenericShock(
    portfolioValue: number,
    baseRisk: object,
    scenario: string,
    shockMagnitude?: number,
  ): Promise<object> {
    const magnitude = shockMagnitude || -20;
    const portfolioImpact = portfolioValue * (magnitude / 100);

    return {
      portfolioImpact,
      scenario,
      riskIncrease: Math.abs(magnitude) / 10,
      customScenario: true,
    };
  }

  private calculateTotalImpact(portfolioValue: number, shocks: object): number {
    let totalImpact = 0;

    for (const [key, value] of Object.entries(shocks)) {
      if (typeof value === 'number') {
        totalImpact += Math.abs(portfolioValue * (value / 100));
      }
    }

    return totalImpact;
  }

  private calculateRiskIncrease(
    baseRisk: object,
    portfolioImpact: number,
  ): number {
    const baseRiskLevel = baseRisk['riskLevel'] || 2;
    const riskIncrease = Math.abs(portfolioImpact) / 100000; // Scale by $100k
    return Math.min(4, baseRiskLevel + riskIncrease);
  }

  private calculateScenarioSeverity(scenarioResult: object): string {
    const impact = Math.abs(scenarioResult['portfolioImpact'] || 0);

    if (impact > 500000) return 'critical';
    if (impact > 200000) return 'high';
    if (impact > 100000) return 'medium';
    return 'low';
  }

  private estimateRecoveryTime(scenarioResult: object): string {
    const severity = this.calculateScenarioSeverity(scenarioResult);

    const recoveryTimes = {
      critical: '12-24 months',
      high: '6-12 months',
      medium: '3-6 months',
      low: '1-3 months',
    };

    return recoveryTimes[severity] || '3-6 months';
  }

  private async generateStressTestSummary(scenarios: object): Promise<object> {
    const scenarioResults = Object.values(scenarios);
    const impacts = scenarioResults.map((s) =>
      Math.abs(s['portfolioImpact'] || 0),
    );
    const riskIncreases = scenarioResults.map((s) => s['riskIncrease'] || 0);

    return {
      worstCaseScenario: Math.max(...impacts),
      averageImpact:
        impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length,
      maxRiskIncrease: Math.max(...riskIncreases),
      scenariosTested: scenarioResults.length,
      criticalScenarios: scenarioResults.filter(
        (s) => this.calculateScenarioSeverity(s) === 'critical',
      ).length,
      highScenarios: scenarioResults.filter(
        (s) => this.calculateScenarioSeverity(s) === 'high',
      ).length,
      overallResilience: this.calculateOverallResilience(impacts),
    };
  }

  private calculateOverallResilience(impacts: number[]): number {
    const maxImpact = Math.max(...impacts);
    const avgImpact =
      impacts.reduce((sum, impact) => sum + impact, 0) / impacts.length;

    // Resilience score (0-100, higher is better)
    const resilienceScore = Math.max(
      0,
      100 - maxImpact / 10000 - avgImpact / 20000,
    );
    return Math.round(resilienceScore);
  }

  private async generateStressTestRecommendations(
    scenarios: object,
  ): Promise<string[]> {
    const recommendations: string[] = [];
    const scenarioResults = Object.entries(scenarios);

    // Analyze scenarios and generate recommendations
    const criticalScenarios = scenarioResults.filter(
      ([, result]) => this.calculateScenarioSeverity(result) === 'critical',
    );

    if (criticalScenarios.length > 0) {
      recommendations.push(
        'Implement immediate risk mitigation for critical scenarios',
      );
      recommendations.push(
        'Increase capital reserves to cover worst-case losses',
      );
    }

    const highScenarios = scenarioResults.filter(
      ([, result]) => this.calculateScenarioSeverity(result) === 'high',
    );

    if (highScenarios.length > 2) {
      recommendations.push('Diversify portfolio to reduce concentration risk');
      recommendations.push(
        'Enhance hedging strategies for high-impact scenarios',
      );
    }

    // Check for specific risk types
    const hasMarketRisk = scenarioResults.some(
      ([name]) => name.includes('market') || name.includes('crash'),
    );
    const hasCreditRisk = scenarioResults.some(([name]) =>
      name.includes('credit'),
    );
    const hasLiquidityRisk = scenarioResults.some(([name]) =>
      name.includes('liquidity'),
    );

    if (hasMarketRisk) {
      recommendations.push('Consider market-neutral strategies');
      recommendations.push('Implement dynamic asset allocation');
    }

    if (hasCreditRisk) {
      recommendations.push('Enhance credit quality monitoring');
      recommendations.push('Increase credit diversification');
    }

    if (hasLiquidityRisk) {
      recommendations.push('Maintain higher liquidity buffers');
      recommendations.push('Establish contingency funding lines');
    }

    return recommendations;
  }

  private async getPortfolioValue(portfolioId: string): Promise<number> {
    // Get current portfolio value
    // In production, this would query actual portfolio data
    return 1000000; // $1M default portfolio value
  }

  private async getBaseRiskMetrics(portfolioId: string): Promise<object> {
    // Get base risk metrics for the portfolio
    return {
      riskLevel: 2,
      volatility: 0.2,
      var: 50000,
      beta: 1.0,
    };
  }

  private async updateRiskDataWithStressTest(
    portfolioId: string,
    stressTestResults: object,
  ): Promise<void> {
    const latestRiskData = await this.riskDataRepository.findOne({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
    });

    if (!latestRiskData) {
      return;
    }

    await this.riskDataRepository.update(latestRiskData.id, {
      stressTestResult: stressTestResults,
    });
  }

  async getStressTestLibrary(): Promise<object> {
    return {
      predefinedScenarios: [
        {
          name: 'market_crash',
          description: 'Sudden market decline of 30% or more',
          parameters: { magnitude: -30 },
          frequency: 'rare',
        },
        {
          name: 'interest_rate_shock',
          description: 'Rapid interest rate changes of 200+ bps',
          parameters: { magnitude: 200 },
          frequency: 'occasional',
        },
        {
          name: 'currency_crisis',
          description: 'Major currency devaluation of 20%+',
          parameters: { magnitude: -20 },
          frequency: 'rare',
        },
        {
          name: 'commodity_price_shock',
          description: 'Commodity price volatility of 40%+',
          parameters: { magnitude: -40 },
          frequency: 'occasional',
        },
        {
          name: 'credit_crisis',
          description: 'Credit spread widening of 300+ bps',
          parameters: { magnitude: 300 },
          frequency: 'rare',
        },
        {
          name: 'liquidity_crisis',
          description: 'Market liquidity reduction of 50%+',
          parameters: { magnitude: 50 },
          frequency: 'occasional',
        },
        {
          name: 'operational_failure',
          description: 'System or operational breakdown',
          parameters: { magnitude: 10 },
          frequency: 'possible',
        },
        {
          name: 'regulatory_change',
          description: 'Significant regulatory changes',
          parameters: { magnitude: 15 },
          frequency: 'occasional',
        },
        {
          name: 'geopolitical_crisis',
          description: 'Geopolitical events affecting markets',
          parameters: { magnitude: -25 },
          frequency: 'rare',
        },
        {
          name: 'pandemic',
          description: 'Global health crisis',
          parameters: { magnitude: -35 },
          frequency: 'very rare',
        },
      ],
      customScenarios: {
        description: 'Create custom stress scenarios with specific parameters',
        parameters: [
          'marketShock',
          'interestRateShock',
          'currencyShock',
          'commodityShock',
          'creditShock',
        ],
      },
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiskDataEntity } from '../entities/risk-data.entity';
import { VarCalculationDto } from '../dto/risk-assessment.dto';

@Injectable()
export class VarCalculatorService {
  private readonly logger = new Logger(VarCalculatorService.name);

  constructor(
    @InjectRepository(RiskDataEntity)
    private readonly riskDataRepository: Repository<RiskDataEntity>,
  ) {}

  async calculateVar(varDto: VarCalculationDto): Promise<object> {
    this.logger.log(
      `Calculating VaR for portfolio: ${varDto.portfolioId}, Method: ${varDto.method}`,
    );

    const startTime = Date.now();

    let varResult;
    switch (varDto.method) {
      case 'historical':
        varResult = await this.calculateHistoricalVaR(varDto);
        break;
      case 'parametric':
        varResult = await this.calculateParametricVaR(varDto);
        break;
      case 'monte_carlo':
        varResult = await this.calculateMonteCarloVaR(varDto);
        break;
      default:
        throw new Error(`Unsupported VaR method: ${varDto.method}`);
    }

    const processingTime = Date.now() - startTime;

    // Ensure calculation is under 200ms as per requirements
    if (processingTime > 200) {
      this.logger.warn(
        `VaR calculation exceeded 200ms threshold: ${processingTime}ms`,
      );
    }

    // Update risk data with VaR results
    await this.updateRiskDataWithVar(varDto.portfolioId, varResult);

    this.logger.log(
      `VaR calculation completed for ${varDto.portfolioId}: ${varResult.varValue} (${varDto.confidence * 100}% confidence)`,
    );

    return {
      ...varResult,
      processingTime,
      accuracy: await this.calculateVarAccuracy(varDto.portfolioId, varResult),
    };
  }

  private async calculateHistoricalVaR(
    varDto: VarCalculationDto,
  ): Promise<object> {
    const { portfolioId, confidence, timeHorizon } = varDto;

    // Get historical returns for the portfolio
    const historicalReturns = await this.getHistoricalReturns(portfolioId);

    // Calculate returns for the time horizon
    const horizonReturns = this.calculateHorizonReturns(
      historicalReturns,
      timeHorizon,
    );

    // Sort returns to find percentile
    horizonReturns.sort((a, b) => a - b);

    // Calculate VaR at the specified confidence level
    const percentileIndex = Math.floor(
      (1 - confidence) * horizonReturns.length,
    );
    const varReturn = horizonReturns[percentileIndex];

    // Get current portfolio value
    const portfolioValue = await this.getPortfolioValue(portfolioId);
    const varValue = Math.abs(varReturn * portfolioValue);

    return {
      method: 'historical',
      varValue,
      varReturn,
      confidence,
      timeHorizon,
      dataPoints: historicalReturns.length,
      assumptions: {
        distribution: 'empirical',
        stationarity: true,
        sufficientHistory: historicalReturns.length >= 252, // 1 year of trading days
      },
      metrics: {
        mean: this.calculateMean(historicalReturns),
        volatility: this.calculateVolatility(historicalReturns),
        skewness: this.calculateSkewness(historicalReturns),
        kurtosis: this.calculateKurtosis(historicalReturns),
      },
    };
  }

  private async calculateParametricVaR(
    varDto: VarCalculationDto,
  ): Promise<object> {
    const { portfolioId, confidence, timeHorizon } = varDto;

    // Get portfolio statistics
    const returns = await this.getHistoricalReturns(portfolioId);
    const mean = this.calculateMean(returns);
    const volatility = this.calculateVolatility(returns);

    // Calculate z-score for the confidence level
    const zScore = this.getZScore(confidence);

    // Calculate parametric VaR
    const timeAdjustedVolatility = volatility * Math.sqrt(timeHorizon);
    const timeAdjustedMean = mean * timeHorizon;
    const varReturn = timeAdjustedMean - zScore * timeAdjustedVolatility;

    const portfolioValue = await this.getPortfolioValue(portfolioId);
    const varValue = Math.abs(varReturn * portfolioValue);

    return {
      method: 'parametric',
      varValue,
      varReturn,
      confidence,
      timeHorizon,
      parameters: {
        mean,
        volatility,
        zScore,
        timeAdjustedVolatility,
        timeAdjustedMean,
      },
      assumptions: {
        distribution: 'normal',
        iidReturns: true,
        constantParameters: true,
      },
      metrics: {
        mean,
        volatility,
        sharpeRatio: mean / volatility,
        maxDrawdown: this.calculateMaxDrawdown(returns),
      },
    };
  }

  private async calculateMonteCarloVaR(
    varDto: VarCalculationDto,
  ): Promise<object> {
    const {
      portfolioId,
      confidence,
      timeHorizon,
      simulations = 10000,
    } = varDto;

    // Get portfolio parameters
    const returns = await this.getHistoricalReturns(portfolioId);
    const mean = this.calculateMean(returns);
    const volatility = this.calculateVolatility(returns);

    // Generate Monte Carlo simulations
    const simulatedReturns = this.runMonteCarloSimulation(
      mean,
      volatility,
      timeHorizon,
      simulations,
    );

    // Sort simulated returns
    simulatedReturns.sort((a, b) => a - b);

    // Calculate VaR at the specified confidence level
    const percentileIndex = Math.floor(
      (1 - confidence) * simulatedReturns.length,
    );
    const varReturn = simulatedReturns[percentileIndex];

    const portfolioValue = await this.getPortfolioValue(portfolioId);
    const varValue = Math.abs(varReturn * portfolioValue);

    return {
      method: 'monte_carlo',
      varValue,
      varReturn,
      confidence,
      timeHorizon,
      simulations,
      parameters: {
        mean,
        volatility,
        simulationCount: simulations,
        randomSeed: Date.now(),
      },
      assumptions: {
        distribution: 'normal',
        geometricBrownianMotion: true,
        riskNeutral: false,
      },
      metrics: {
        mean: this.calculateMean(simulatedReturns),
        volatility: this.calculateVolatility(simulatedReturns),
        percentiles: this.calculatePercentiles(simulatedReturns),
        convergence: this.checkConvergence(simulatedReturns),
      },
    };
  }

  private async getHistoricalReturns(portfolioId: string): Promise<number[]> {
    // Get historical returns for the portfolio
    // In production, this would query actual historical data
    const returns: number[] = [];

    // Generate sample historical returns (252 trading days = 1 year)
    for (let i = 0; i < 252; i++) {
      returns.push(this.generateRandomReturn(0.0005, 0.02)); // 0.05% daily return, 2% daily volatility
    }

    return returns;
  }

  private generateRandomReturn(mean: number, volatility: number): number {
    // Generate random return using normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + volatility * z;
  }

  private calculateHorizonReturns(
    returns: number[],
    timeHorizon: number,
  ): number[] {
    // Calculate compounded returns over the time horizon
    const horizonReturns: number[] = [];

    for (let i = 0; i <= returns.length - timeHorizon; i++) {
      let horizonReturn = 0;
      for (let j = 0; j < timeHorizon; j++) {
        horizonReturn += returns[i + j];
      }
      horizonReturns.push(horizonReturn);
    }

    return horizonReturns;
  }

  private getZScore(confidence: number): number {
    // Get z-score for normal distribution
    const zScores = {
      0.9: 1.282,
      0.95: 1.645,
      0.96: 1.751,
      0.97: 1.881,
      0.98: 2.054,
      0.99: 2.326,
      0.995: 2.576,
    };
    return zScores[confidence] || 1.645;
  }

  private runMonteCarloSimulation(
    mean: number,
    volatility: number,
    timeHorizon: number,
    simulations: number,
  ): number[] {
    const simulatedReturns: number[] = [];

    for (let i = 0; i < simulations; i++) {
      let totalReturn = 0;

      for (let j = 0; j < timeHorizon; j++) {
        totalReturn += this.generateRandomReturn(mean, volatility);
      }

      simulatedReturns.push(totalReturn);
    }

    return simulatedReturns;
  }

  private async getPortfolioValue(portfolioId: string): Promise<number> {
    // Get current portfolio value
    // In production, this would query actual portfolio data
    return 1000000; // $1M default portfolio value
  }

  private calculateMean(returns: number[]): number {
    return returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  }

  private calculateVolatility(returns: number[]): number {
    const mean = this.calculateMean(returns);
    const squaredDiffs = returns.map((ret) => Math.pow(ret - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateSkewness(returns: number[]): number {
    const mean = this.calculateMean(returns);
    const volatility = this.calculateVolatility(returns);
    const cubedDiffs = returns.map((ret) =>
      Math.pow((ret - mean) / volatility, 3),
    );
    return cubedDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
  }

  private calculateKurtosis(returns: number[]): number {
    const mean = this.calculateMean(returns);
    const volatility = this.calculateVolatility(returns);
    const fourthPowerDiffs = returns.map((ret) =>
      Math.pow((ret - mean) / volatility, 4),
    );
    return (
      fourthPowerDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length
    );
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let cumulativeReturn = 0;

    for (const ret of returns) {
      cumulativeReturn += ret;
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = peak - cumulativeReturn;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculatePercentiles(returns: number[]): object {
    const sortedReturns = [...returns].sort((a, b) => a - b);
    return {
      p1: sortedReturns[Math.floor(0.01 * sortedReturns.length)],
      p5: sortedReturns[Math.floor(0.05 * sortedReturns.length)],
      p25: sortedReturns[Math.floor(0.25 * sortedReturns.length)],
      p50: sortedReturns[Math.floor(0.5 * sortedReturns.length)],
      p75: sortedReturns[Math.floor(0.75 * sortedReturns.length)],
      p95: sortedReturns[Math.floor(0.95 * sortedReturns.length)],
      p99: sortedReturns[Math.floor(0.99 * sortedReturns.length)],
    };
  }

  private checkConvergence(returns: number[]): boolean {
    // Check if Monte Carlo simulation has converged
    const sampleSize = Math.min(1000, returns.length);
    const firstHalf = returns.slice(0, sampleSize / 2);
    const secondHalf = returns.slice(sampleSize / 2, sampleSize);

    const firstMean = this.calculateMean(firstHalf);
    const secondMean = this.calculateMean(secondHalf);

    // Check if means are within 5% of each other
    const difference = Math.abs(firstMean - secondMean);
    const average = (firstMean + secondMean) / 2;

    return difference / Math.abs(average) < 0.05;
  }

  private async calculateVarAccuracy(
    portfolioId: string,
    varResult: Record<string, any>,
  ): Promise<number> {
    // Calculate VaR accuracy by backtesting
    const backtestResults = await this.backtestVar(portfolioId, varResult);

    // Accuracy is 1 minus the breach rate difference from expected
    const expectedBreachRate = 1 - varResult['confidence'];
    const actualBreachRate = backtestResults.breachRate;

    return Math.max(0, 1 - Math.abs(expectedBreachRate - actualBreachRate));
  }

  private async backtestVar(
    portfolioId: string,
    varResult: Record<string, any>,
  ): Promise<Record<string, any>> {
    // Backtest VaR model against historical data
    const historicalReturns = await this.getHistoricalReturns(portfolioId);
    const varThreshold = varResult['varReturn'];

    let breaches = 0;
    for (const ret of historicalReturns) {
      if (ret < varThreshold) {
        breaches++;
      }
    }

    const breachRate = breaches / historicalReturns.length;

    return {
      breaches,
      totalObservations: historicalReturns.length,
      breachRate,
      expectedBreachRate: 1 - varResult['confidence'],
      kupiecPValue: this.calculateKupiecPValue(
        breaches,
        historicalReturns.length,
        1 - varResult['confidence'],
      ),
    };
  }

  private calculateKupiecPValue(
    breaches: number,
    observations: number,
    expectedBreachRate: number,
  ): number {
    // Calculate Kupiec test p-value for VaR model validation
    const actualBreachRate = breaches / observations;

    if (breaches === 0) return 1;

    // Likelihood ratio test statistic
    const lr =
      2 *
      (breaches * Math.log(actualBreachRate / expectedBreachRate) +
        (observations - breaches) *
          Math.log((1 - actualBreachRate) / (1 - expectedBreachRate)));

    // Chi-square distribution with 1 degree of freedom
    return 1 - this.chiSquareCDF(lr, 1);
  }

  private chiSquareCDF(x: number, df: number): number {
    // Simplified chi-square CDF calculation
    // In production, use a proper statistical library
    return Math.min(1, x / (df + Math.sqrt(2 * df)));
  }

  private async updateRiskDataWithVar(
    portfolioId: string,
    varResult: Record<string, any>,
  ): Promise<void> {
    const latestRiskData = await this.riskDataRepository.findOne({
      where: { portfolioId },
      order: { createdAt: 'DESC' },
    });

    if (!latestRiskData) {
      return;
    }

    await this.riskDataRepository.update(latestRiskData.id, {
      varValue: varResult['varValue'],
      varConfidence: varResult['confidence'],
    });
  }

  async compareVarMethods(
    portfolioId: string,
    confidence: number,
    timeHorizon: number,
  ): Promise<Record<string, any>> {
    this.logger.log(`Comparing VaR methods for portfolio: ${portfolioId}`);

    const methods = ['historical', 'parametric', 'monte_carlo'] as const;
    const results: Record<string, any> = {};

    for (const method of methods) {
      const varDto: VarCalculationDto = {
        portfolioId,
        confidence,
        timeHorizon,
        method,
        simulations: method === 'monte_carlo' ? 10000 : undefined,
      };

      results[method] = await this.calculateVar(varDto);
    }

    return {
      portfolioId,
      confidence,
      timeHorizon,
      results,
      comparison: {
        lowestVar: Math.min(...Object.values(results).map((r) => r.varValue)),
        highestVar: Math.max(...Object.values(results).map((r) => r.varValue)),
        variance: this.calculateVariance(
          Object.values(results).map((r) => r.varValue),
        ),
        recommendation: this.getVarRecommendation(results),
      },
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  private getVarRecommendation(results: Record<string, any>): string {
    const historical = results['historical'];
    const parametric = results['parametric'];
    const monteCarlo = results['monte_carlo'];

    // Recommend method based on accuracy and stability
    const accuracyScores = {
      historical: historical.accuracy,
      parametric: parametric.accuracy,
      monte_carlo: monteCarlo.accuracy,
    };

    const bestMethod = Object.entries(accuracyScores).sort(
      ([, a], [, b]) => b - a,
    )[0][0];

    return `Use ${bestMethod} method - highest accuracy: ${accuracyScores[bestMethod]}`;
  }
}

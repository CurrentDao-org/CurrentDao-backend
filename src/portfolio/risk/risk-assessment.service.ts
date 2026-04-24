import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { AssetEntity } from '../entities/asset.entity';
import { RiskAnalysisDto } from '../dto/analytics.dto';

@Injectable()
export class RiskAssessmentService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PositionEntity)
    private positionRepository: Repository<PositionEntity>,
    @InjectRepository(AssetEntity)
    private assetRepository: Repository<AssetEntity>,
  ) {}

  async analyzeRisk(portfolioId: string, riskAnalysisDto: RiskAnalysisDto): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    const {
      confidenceLevel = 0.95,
      timeHorizon = 10,
      includeStressTest = true,
      scenarios = ['market_crash', 'interest_rate_shock', 'currency_crisis'],
    } = riskAnalysisDto;

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const riskMetrics = await this.calculateRiskMetrics(
      positions,
      confidenceLevel,
      timeHorizon,
    );

    const result: any = {
      portfolioId,
      analysisDate: new Date(),
      confidenceLevel,
      timeHorizon,
      riskMetrics,
      portfolioValue: portfolio.totalValue,
    };

    if (includeStressTest) {
      result.stressTest = await this.performStressTest(positions, scenarios);
    }

    result.riskScore = this.calculateOverallRiskScore(riskMetrics);
    result.recommendations = this.generateRiskRecommendations(riskMetrics, portfolio.riskTolerance);

    return result;
  }

  async getCurrentRiskMetrics(portfolioId: string): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    return this.calculateRiskMetrics(positions, 0.95, 10);
  }

  async calculateRiskMetrics(
    positions: PositionEntity[],
    confidenceLevel: number,
    timeHorizon: number,
  ): Promise<any> {
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    // Calculate portfolio volatility
    const portfolioVolatility = await this.calculatePortfolioVolatility(positions);

    // Calculate Value at Risk (VaR)
    const varValue = this.calculateVaR(totalValue, portfolioVolatility, confidenceLevel, timeHorizon);

    // Calculate Expected Shortfall (ES)
    const expectedShortfall = this.calculateExpectedShortfall(
      totalValue,
      portfolioVolatility,
      confidenceLevel,
      timeHorizon,
    );

    // Calculate beta
    const beta = await this.calculatePortfolioBeta(positions);

    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(positions, totalValue);

    // Calculate currency risk
    const currencyRisk = await this.calculateCurrencyRisk(positions);

    // Calculate sector risk
    const sectorRisk = await this.calculateSectorRisk(positions);

    // Calculate liquidity risk
    const liquidityRisk = await this.calculateLiquidityRisk(positions);

    // Calculate credit risk
    const creditRisk = await this.calculateCreditRisk(positions);

    return {
      totalValue,
      volatility: portfolioVolatility,
      var: varValue,
      expectedShortfall,
      beta,
      concentrationRisk,
      currencyRisk,
      sectorRisk,
      liquidityRisk,
      creditRisk,
      riskDecomposition: {
        marketRisk: portfolioVolatility * 0.6,
        concentrationRisk: concentrationRisk * 0.2,
        currencyRisk: currencyRisk * 0.1,
        liquidityRisk: liquidityRisk * 0.05,
        creditRisk: creditRisk * 0.05,
      },
    };
  }

  async performStressTest(positions: PositionEntity[], scenarios: string[]): Promise<any> {
    const stressTestResults = {};

    for (const scenario of scenarios) {
      stressTestResults[scenario] = await this.runStressScenario(positions, scenario);
    }

    return {
      scenarios: stressTestResults,
      worstCaseScenario: this.findWorstCaseScenario(stressTestResults),
      resilience: this.calculateResilienceScore(stressTestResults),
    };
  }

  private async calculatePortfolioVolatility(positions: PositionEntity[]): Promise<number> {
    // Simplified portfolio volatility calculation
    // In practice, you would use covariance matrix of asset returns
    let portfolioVariance = 0;
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      const assetVolatility = position.asset.volatility || 0.2; // Default 20% annual volatility
      portfolioVariance += Math.pow(weight * assetVolatility, 2);
    }

    return Math.sqrt(portfolioVariance);
  }

  private calculateVaR(
    portfolioValue: number,
    volatility: number,
    confidenceLevel: number,
    timeHorizon: number,
  ): number {
    // Parametric VaR calculation
    const zScore = this.getZScore(confidenceLevel);
    const timeAdjustedVolatility = volatility * Math.sqrt(timeHorizon / 252); // Assuming 252 trading days
    return portfolioValue * zScore * timeAdjustedVolatility;
  }

  private calculateExpectedShortfall(
    portfolioValue: number,
    volatility: number,
    confidenceLevel: number,
    timeHorizon: number,
  ): number {
    // Expected Shortfall (Conditional VaR) calculation
    const zScore = this.getZScore(confidenceLevel);
    const timeAdjustedVolatility = volatility * Math.sqrt(timeHorizon / 252);
    const phi = this.standardNormalPDF(zScore);
    const oneMinusConfidence = 1 - confidenceLevel;

    return portfolioValue * (phi / oneMinusConfidence) * timeAdjustedVolatility;
  }

  private async calculatePortfolioBeta(positions: PositionEntity[]): Promise<number> {
    let portfolioBeta = 0;
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      const assetBeta = position.asset.beta || 1.0; // Default beta of 1.0
      portfolioBeta += weight * assetBeta;
    }

    return portfolioBeta;
  }

  private calculateConcentrationRisk(positions: PositionEntity[], totalValue: number): number {
    // Herfindahl-Hirschman Index (HHI) for concentration
    let hhi = 0;

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      hhi += Math.pow(weight, 2);
    }

    // Normalize HHI (0 = perfectly diversified, 1 = concentrated)
    const maxHHI = 1 / positions.length; // Maximum HHI for equal weights
    const concentration = (hhi - maxHHI) / (1 - maxHHI);

    return concentration;
  }

  private async calculateCurrencyRisk(positions: PositionEntity[]): Promise<number> {
    // Calculate currency exposure and risk
    const currencyExposure = {};
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const currency = position.asset.currency;
      if (!currencyExposure[currency]) {
        currencyExposure[currency] = 0;
      }
      currencyExposure[currency] += position.marketValue;
    }

    // Calculate currency concentration risk
    let maxCurrencyExposure = 0;
    for (const exposure of Object.values(currencyExposure)) {
      maxCurrencyExposure = Math.max(maxCurrencyExposure, exposure as number);
    }

    return maxCurrencyExposure / totalValue;
  }

  private async calculateSectorRisk(positions: PositionEntity[]): Promise<number> {
    // Calculate sector concentration risk
    const sectorExposure = {};
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const sector = position.asset.sector || 'Unknown';
      if (!sectorExposure[sector]) {
        sectorExposure[sector] = 0;
      }
      sectorExposure[sector] += position.marketValue;
    }

    // Calculate sector concentration using HHI
    let hhi = 0;
    for (const exposure of Object.values(sectorExposure)) {
      const weight = (exposure as number) / totalValue;
      hhi += Math.pow(weight, 2);
    }

    return hhi;
  }

  private async calculateLiquidityRisk(positions: PositionEntity[]): Promise<number> {
    // Calculate liquidity risk based on asset volume and market cap
    let liquidityScore = 0;
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      const assetVolume = position.asset.volume || 0;
      const marketCap = position.asset.marketCap || 0;

      // Liquidity score based on volume and market cap
      let assetLiquidity = 0;
      if (assetVolume > 1000000) assetLiquidity = 1; // High liquidity
      else if (assetVolume > 100000) assetLiquidity = 0.7; // Medium liquidity
      else assetLiquidity = 0.3; // Low liquidity

      liquidityScore += weight * (1 - assetLiquidity); // Invert for risk measure
    }

    return liquidityScore;
  }

  private async calculateCreditRisk(positions: PositionEntity[]): Promise<number> {
    // Calculate credit risk based on asset type and quality
    let creditRisk = 0;
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      let assetCreditRisk = 0;

      switch (position.asset.assetType) {
        case 'STOCK':
          assetCreditRisk = 0.1; // Low credit risk
          break;
        case 'BOND':
          assetCreditRisk = 0.3; // Moderate credit risk
          break;
        case 'CRYPTO':
          assetCreditRisk = 0.8; // High credit risk
          break;
        default:
          assetCreditRisk = 0.2; // Default credit risk
      }

      creditRisk += weight * assetCreditRisk;
    }

    return creditRisk;
  }

  private async runStressScenario(positions: PositionEntity[], scenario: string): Promise<any> {
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    let stressedValue = 0;

    for (const position of positions) {
      const shock = this.getScenarioShock(position.asset, scenario);
      const stressedPositionValue = position.marketValue * (1 + shock);
      stressedValue += stressedPositionValue;
    }

    const portfolioLoss = totalValue - stressedValue;
    const lossPercentage = (portfolioLoss / totalValue) * 100;

    return {
      scenario,
      originalValue: totalValue,
      stressedValue,
      portfolioLoss,
      lossPercentage,
      positionImpacts: positions.map(pos => ({
        assetId: pos.asset.id,
        symbol: pos.asset.symbol,
        originalValue: pos.marketValue,
        shockedValue: pos.marketValue * (1 + this.getScenarioShock(pos.asset, scenario)),
        shock: this.getScenarioShock(pos.asset, scenario),
      })),
    };
  }

  private getScenarioShock(asset: AssetEntity, scenario: string): number {
    // Simplified shock scenarios
    switch (scenario) {
      case 'market_crash':
        switch (asset.assetType) {
          case 'STOCK': return -0.25; // 25% drop
          case 'BOND': return -0.05; // 5% drop
          case 'CRYPTO': return -0.40; // 40% drop
          default: return -0.15;
        }
      case 'interest_rate_shock':
        switch (asset.assetType) {
          case 'BOND': return -0.15; // 15% drop
          case 'STOCK': return -0.10; // 10% drop
          default: return -0.05;
        }
      case 'currency_crisis':
        if (asset.currency !== 'USD') return -0.20; // 20% drop for non-USD
        return -0.05; // 5% drop for USD
      default:
        return -0.10;
    }
  }

  private findWorstCaseScenario(stressTestResults: any): any {
    let worstScenario = null;
    let maxLoss = 0;

    for (const [scenario, result] of Object.entries(stressTestResults)) {
      if (result.lossPercentage > maxLoss) {
        maxLoss = result.lossPercentage;
        worstScenario = { scenario, ...result };
      }
    }

    return worstScenario;
  }

  private calculateResilienceScore(stressTestResults: any): number {
    const losses = Object.values(stressTestResults).map((result: any) => result.lossPercentage);
    const averageLoss = losses.reduce((sum, loss) => sum + loss, 0) / losses.length;
    
    // Resilience score (higher is better)
    return Math.max(0, 100 - averageLoss);
  }

  private calculateOverallRiskScore(riskMetrics: any): number {
    // Weighted risk score calculation
    const weights = {
      volatility: 0.3,
      var: 0.25,
      concentrationRisk: 0.2,
      currencyRisk: 0.1,
      liquidityRisk: 0.1,
      creditRisk: 0.05,
    };

    let riskScore = 0;
    for (const [metric, weight] of Object.entries(weights)) {
      const value = riskMetrics[metric];
      // Normalize values to 0-1 scale
      let normalizedValue = 0;
      
      switch (metric) {
        case 'volatility':
          normalizedValue = Math.min(value / 0.5, 1); // Normalize to 50% max volatility
          break;
        case 'var':
          normalizedValue = Math.min(value / (riskMetrics.totalValue * 0.2), 1); // Normalize to 20% of portfolio value
          break;
        default:
          normalizedValue = Math.min(value, 1);
      }
      
      riskScore += normalizedValue * weight;
    }

    return riskScore * 100; // Convert to 0-100 scale
  }

  private generateRiskRecommendations(riskMetrics: any, riskTolerance: string): string[] {
    const recommendations = [];

    if (riskMetrics.volatility > 0.3) {
      recommendations.push('Consider reducing portfolio volatility through diversification or lower-volatility assets');
    }

    if (riskMetrics.concentrationRisk > 0.5) {
      recommendations.push('Portfolio is highly concentrated. Consider diversifying across more assets');
    }

    if (riskMetrics.currencyRisk > 0.7) {
      recommendations.push('High currency exposure detected. Consider currency hedging or diversification');
    }

    if (riskMetrics.liquidityRisk > 0.5) {
      recommendations.push('Portfolio contains illiquid assets. Consider increasing liquidity allocation');
    }

    if (riskMetrics.var > riskMetrics.totalValue * 0.15) {
      recommendations.push('Value at Risk is high. Consider reducing position sizes or adding hedges');
    }

    if (riskTolerance === 'LOW' && riskMetrics.riskDecomposition.marketRisk > 0.4) {
      recommendations.push('Risk tolerance is low but market risk is high. Consider defensive assets');
    }

    if (riskTolerance === 'HIGH' && riskMetrics.riskDecomposition.marketRisk < 0.3) {
      recommendations.push('Risk tolerance is high but market risk is low. Consider increasing growth assets');
    }

    if (recommendations.length === 0) {
      recommendations.push('Risk profile appears appropriate for your risk tolerance');
    }

    return recommendations;
  }

  private getZScore(confidenceLevel: number): number {
    // Approximate z-scores for common confidence levels
    const zScores: { [key: number]: number } = {
      0.90: 1.28,
      0.95: 1.65,
      0.99: 2.33,
    };

    return zScores[confidenceLevel] || 1.65; // Default to 95%
  }

  private standardNormalPDF(z: number): number {
    // Standard normal probability density function
    return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  }
}

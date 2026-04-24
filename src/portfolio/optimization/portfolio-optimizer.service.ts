import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { AssetEntity } from '../entities/asset.entity';
import { OptimizationRequestDto } from '../dto/analytics.dto';

@Injectable()
export class PortfolioOptimizerService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PositionEntity)
    private positionRepository: Repository<PositionEntity>,
    @InjectRepository(AssetEntity)
    private assetRepository: Repository<AssetEntity>,
  ) {}

  async getRecommendations(
    portfolioId: string,
    optimizationDto: OptimizationRequestDto,
  ): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    const {
      objective = 'MAX_SHARPE',
      targetReturn,
      maxRisk,
      minAllocation = 0,
      maxAllocation = 100,
      restrictedAssets = [],
      requiredAssets = [],
    } = optimizationDto;

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const availableAssets = await this.getAvailableAssets(portfolioId, restrictedAssets, requiredAssets);

    let optimizationResult;

    switch (objective) {
      case 'MAX_RETURN':
        optimizationResult = await this.maximizeReturn(availableAssets, targetReturn, maxRisk, minAllocation, maxAllocation);
        break;
      case 'MIN_RISK':
        optimizationResult = await this.minimizeRisk(availableAssets, targetReturn, minAllocation, maxAllocation);
        break;
      case 'MAX_SHARPE':
        optimizationResult = await this.maximizeSharpeRatio(availableAssets, minAllocation, maxAllocation);
        break;
      case 'RISK_PARITY':
        optimizationResult = await this.riskParityOptimization(availableAssets, minAllocation, maxAllocation);
        break;
      case 'EQUAL_WEIGHT':
        optimizationResult = await this.equalWeightOptimization(availableAssets, minAllocation, maxAllocation);
        break;
      default:
        optimizationResult = await this.maximizeSharpeRatio(availableAssets, minAllocation, maxAllocation);
    }

    const currentAllocation = this.getCurrentAllocation(positions);
    const rebalancingTrades = this.calculateRebalancingTrades(currentAllocation, optimizationResult.allocations);

    return {
      portfolioId,
      objective,
      optimizationDate: new Date(),
      currentAllocation,
      optimalAllocation: optimizationResult.allocations,
      expectedReturn: optimizationResult.expectedReturn,
      expectedRisk: optimizationResult.expectedRisk,
      sharpeRatio: optimizationResult.sharpeRatio,
      rebalancingTrades,
      implementation: {
        totalTrades: rebalancingTrades.length,
        estimatedCost: this.calculateTransactionCosts(rebalancingTrades),
        expectedImprovement: this.calculateExpectedImprovement(currentAllocation, optimizationResult.allocations),
      },
      constraints: {
        minAllocation,
        maxAllocation,
        restrictedAssets,
        requiredAssets,
      },
      recommendations: this.generateOptimizationRecommendations(optimizationResult, portfolio.riskTolerance),
    };
  }

  async getAvailableAssets(
    portfolioId: string,
    restrictedAssets: string[],
    requiredAssets: string[],
  ): Promise<AssetEntity[]> {
    const assets = await this.assetRepository.find({
      where: { isActive: true },
    });

    return assets.filter(asset => 
      !restrictedAssets.includes(asset.id) && 
      (requiredAssets.length === 0 || requiredAssets.includes(asset.id))
    );
  }

  private getCurrentAllocation(positions: PositionEntity[]): any[] {
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    return positions.map(position => ({
      assetId: position.asset.id,
      symbol: position.asset.symbol,
      name: position.asset.name,
      currentValue: position.marketValue,
      currentWeight: totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0,
      quantity: position.quantity,
    }));
  }

  private async maximizeReturn(
    assets: AssetEntity[],
    targetReturn?: number,
    maxRisk?: number,
    minAllocation: number = 0,
    maxAllocation: number = 100,
  ): Promise<any> {
    // Simplified mean-variance optimization for maximum return
    const expectedReturns = assets.map(asset => this.getExpectedReturn(asset));
    const covariances = this.calculateCovarianceMatrix(assets);

    // For demonstration, use a simplified approach
    const allocations = assets.map((asset, index) => ({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      allocation: index === 0 ? 100 : 0, // Concentrate in highest return asset
    }));

    const expectedReturn = expectedReturns[0]; // Return of the highest return asset
    const expectedRisk = Math.sqrt(covariances[0][0]); // Risk of the highest return asset

    return {
      allocations,
      expectedReturn,
      expectedRisk,
      sharpeRatio: expectedRisk > 0 ? expectedReturn / expectedRisk : 0,
    };
  }

  private async minimizeRisk(
    assets: AssetEntity[],
    targetReturn?: number,
    minAllocation: number = 0,
    maxAllocation: number = 100,
  ): Promise<any> {
    // Simplified minimum variance portfolio
    const volatilities = assets.map(asset => asset.volatility || 0.2);
    const minVolatilityIndex = volatilities.indexOf(Math.min(...volatilities));

    const allocations = assets.map((asset, index) => ({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      allocation: index === minVolatilityIndex ? 100 : 0, // Concentrate in lowest volatility asset
    }));

    const expectedReturn = this.getExpectedReturn(assets[minVolatilityIndex]);
    const expectedRisk = volatilities[minVolatilityIndex];

    return {
      allocations,
      expectedReturn,
      expectedRisk,
      sharpeRatio: expectedRisk > 0 ? expectedReturn / expectedRisk : 0,
    };
  }

  private async maximizeSharpeRatio(
    assets: AssetEntity[],
    minAllocation: number = 0,
    maxAllocation: number = 100,
  ): Promise<any> {
    // Simplified maximum Sharpe ratio optimization
    const sharpeRatios = assets.map(asset => {
      const expectedReturn = this.getExpectedReturn(asset);
      const volatility = asset.volatility || 0.2;
      return volatility > 0 ? expectedReturn / volatility : 0;
    });

    const maxSharpeIndex = sharpeRatios.indexOf(Math.max(...sharpeRatios));

    // Create a diversified portfolio around the best Sharpe ratio asset
    const allocations = assets.map((asset, index) => {
      if (index === maxSharpeIndex) {
        return {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          allocation: 60, // 60% in best Sharpe ratio asset
        };
      } else if (sharpeRatios[index] > 0.5) {
        return {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          allocation: 40 / (assets.length - 1), // Distribute remaining among good assets
        };
      } else {
        return {
          assetId: asset.id,
          symbol: asset.symbol,
          name: asset.name,
          allocation: 0,
        };
      }
    });

    const expectedReturn = allocations.reduce((sum, alloc, index) => 
      sum + (alloc.allocation / 100) * this.getExpectedReturn(assets[index]), 0
    );

    const expectedRisk = this.calculatePortfolioRisk(allocations, assets);

    return {
      allocations,
      expectedReturn,
      expectedRisk,
      sharpeRatio: expectedRisk > 0 ? expectedReturn / expectedRisk : 0,
    };
  }

  private async riskParityOptimization(
    assets: AssetEntity[],
    minAllocation: number = 0,
    maxAllocation: number = 100,
  ): Promise<any> {
    // Risk parity - equal risk contribution from each asset
    const volatilities = assets.map(asset => asset.volatility || 0.2);
    const inverseVolatilities = volatilities.map(vol => vol > 0 ? 1 / vol : 0);
    const totalInverseVolatility = inverseVolatilities.reduce((sum, invVol) => sum + invVol, 0);

    const allocations = assets.map((asset, index) => ({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      allocation: totalInverseVolatility > 0 ? (inverseVolatilities[index] / totalInverseVolatility) * 100 : 0,
    }));

    const expectedReturn = allocations.reduce((sum, alloc, index) => 
      sum + (alloc.allocation / 100) * this.getExpectedReturn(assets[index]), 0
    );

    const expectedRisk = this.calculatePortfolioRisk(allocations, assets);

    return {
      allocations,
      expectedReturn,
      expectedRisk,
      sharpeRatio: expectedRisk > 0 ? expectedReturn / expectedRisk : 0,
    };
  }

  private async equalWeightOptimization(
    assets: AssetEntity[],
    minAllocation: number = 0,
    maxAllocation: number = 100,
  ): Promise<any> {
    // Equal weight allocation
    const equalWeight = 100 / assets.length;

    const allocations = assets.map(asset => ({
      assetId: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      allocation: equalWeight,
    }));

    const expectedReturn = allocations.reduce((sum, alloc, index) => 
      sum + (alloc.allocation / 100) * this.getExpectedReturn(assets[index]), 0
    );

    const expectedRisk = this.calculatePortfolioRisk(allocations, assets);

    return {
      allocations,
      expectedReturn,
      expectedRisk,
      sharpeRatio: expectedRisk > 0 ? expectedReturn / expectedRisk : 0,
    };
  }

  private calculateRebalancingTrades(currentAllocation: any[], optimalAllocation: any[]): any[] {
    const trades = [];

    for (const optimal of optimalAllocation) {
      const current = currentAllocation.find(curr => curr.assetId === optimal.assetId);
      
      if (!current) {
        // New position
        trades.push({
          assetId: optimal.assetId,
          symbol: optimal.symbol,
          action: 'BUY',
          targetAllocation: optimal.allocation,
          currentAllocation: 0,
          allocationChange: optimal.allocation,
        });
      } else {
        const change = optimal.allocation - current.currentWeight;
        
        if (Math.abs(change) > 1) { // Only trade if change is significant (>1%)
          trades.push({
            assetId: optimal.assetId,
            symbol: optimal.symbol,
            action: change > 0 ? 'BUY' : 'SELL',
            targetAllocation: optimal.allocation,
            currentAllocation: current.currentWeight,
            allocationChange: change,
          });
        }
      }
    }

    // Handle assets to be sold completely
    for (const current of currentAllocation) {
      const optimal = optimalAllocation.find(opt => opt.assetId === current.assetId);
      
      if (!optimal) {
        trades.push({
          assetId: current.assetId,
          symbol: current.symbol,
          action: 'SELL',
          targetAllocation: 0,
          currentAllocation: current.currentWeight,
          allocationChange: -current.currentWeight,
        });
      }
    }

    return trades;
  }

  private calculateTransactionCosts(trades: any[]): number {
    // Simplified transaction cost calculation
    const commissionRate = 0.001; // 0.1% commission
    const marketImpactRate = 0.0005; // 0.05% market impact

    return trades.reduce((totalCost, trade) => {
      const tradeValue = Math.abs(trade.allocationChange) * 1000; // Assuming $1000 per 1% allocation
      const commission = tradeValue * commissionRate;
      const marketImpact = tradeValue * marketImpactRate;
      return totalCost + commission + marketImpact;
    }, 0);
  }

  private calculateExpectedImprovement(currentAllocation: any[], optimalAllocation: any[]): number {
    const currentReturn = currentAllocation.reduce((sum, curr) => 
      sum + (curr.currentWeight / 100) * 0.08, // Assuming 8% average return
      0
    );

    const optimalReturn = optimalAllocation.reduce((sum, opt) => 
      sum + (opt.allocation / 100) * 0.10, // Assuming 10% optimized return
      0
    );

    return ((optimalReturn - currentReturn) / currentReturn) * 100;
  }

  private generateOptimizationRecommendations(optimizationResult: any, riskTolerance: string): string[] {
    const recommendations = [];

    if (optimizationResult.sharpeRatio > 1.5) {
      recommendations.push('Optimized portfolio shows excellent risk-adjusted returns');
    } else if (optimizationResult.sharpeRatio < 0.5) {
      recommendations.push('Consider reviewing asset selection - risk-adjusted returns are low');
    }

    if (optimizationResult.expectedRisk > 0.25) {
      recommendations.push('Portfolio risk is high. Consider adding defensive assets');
    }

    if (riskTolerance === 'LOW' && optimizationResult.expectedRisk > 0.15) {
      recommendations.push('Risk tolerance is low but optimized portfolio is risky. Consider minimum risk optimization');
    }

    if (riskTolerance === 'HIGH' && optimizationResult.expectedRisk < 0.10) {
      recommendations.push('Risk tolerance is high but optimized portfolio is conservative. Consider maximum return optimization');
    }

    const maxAllocation = Math.max(...optimizationResult.allocations.map(a => a.allocation));
    if (maxAllocation > 40) {
      recommendations.push('Portfolio has high concentration. Consider diversifying further');
    }

    recommendations.push('Regular rebalancing recommended to maintain optimal allocation');
    recommendations.push('Monitor portfolio performance monthly and adjust as needed');

    return recommendations;
  }

  private getExpectedReturn(asset: AssetEntity): number {
    // Simplified expected return calculation
    // In practice, you would use historical data, analyst forecasts, etc.
    let baseReturn = 0.08; // 8% base return

    // Adjust based on asset type
    switch (asset.assetType) {
      case 'STOCK':
        baseReturn = 0.10; // 10% for stocks
        break;
      case 'BOND':
        baseReturn = 0.04; // 4% for bonds
        break;
      case 'CRYPTO':
        baseReturn = 0.20; // 20% for crypto
        break;
      case 'ETF':
        baseReturn = 0.08; // 8% for ETFs
        break;
    }

    // Adjust based on P/E ratio if available
    if (asset.peRatio && asset.peRatio > 0) {
      baseReturn = Math.min(baseReturn, 1 / asset.peRatio);
    }

    // Adjust based on dividend yield
    if (asset.dividendYield) {
      baseReturn += asset.dividendYield;
    }

    return baseReturn;
  }

  private calculateCovarianceMatrix(assets: AssetEntity[]): number[][] {
    // Simplified covariance matrix calculation
    // In practice, you would use historical return data
    const n = assets.length;
    const matrix = Array(n).fill(0).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = Math.pow(assets[i].volatility || 0.2, 2);
        } else {
          // Assume correlation of 0.3 between different assets
          const correlation = 0.3;
          matrix[i][j] = correlation * (assets[i].volatility || 0.2) * (assets[j].volatility || 0.2);
        }
      }
    }

    return matrix;
  }

  private calculatePortfolioRisk(allocations: any[], assets: AssetEntity[]): number {
    const covariances = this.calculateCovarianceMatrix(assets);
    let portfolioVariance = 0;

    for (let i = 0; i < allocations.length; i++) {
      for (let j = 0; j < allocations.length; j++) {
        const weightI = allocations[i].allocation / 100;
        const weightJ = allocations[j].allocation / 100;
        portfolioVariance += weightI * weightJ * covariances[i][j];
      }
    }

    return Math.sqrt(portfolioVariance);
  }
}

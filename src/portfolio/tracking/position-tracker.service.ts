import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { AssetEntity } from '../entities/asset.entity';
import { PortfolioPerformanceEntity } from '../entities/portfolio-performance.entity';
import { Cron, Interval } from '@nestjs/schedule';

@Injectable()
export class PositionTrackerService {
  private readonly logger = new Logger(PositionTrackerService.name);
  private activeTrackingSessions = new Map<string, any>();
  private priceUpdateQueue = new Map<string, any>();

  constructor(
    @InjectRepository(PortfolioEntity)
    private portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PositionEntity)
    private positionRepository: Repository<PositionEntity>,
    @InjectRepository(AssetEntity)
    private assetRepository: Repository<AssetEntity>,
    @InjectRepository(PortfolioPerformanceEntity)
    private performanceRepository: Repository<PortfolioPerformanceEntity>,
  ) {}

  async startTracking(portfolioId: string): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    if (this.activeTrackingSessions.has(portfolioId)) {
      return {
        portfolioId,
        status: 'ALREADY_TRACKING',
        message: 'Real-time tracking is already active for this portfolio',
      };
    }

    const trackingSession = {
      portfolioId,
      startTime: new Date(),
      lastUpdate: new Date(),
      updateCount: 0,
      status: 'ACTIVE',
      latency: 0,
    };

    this.activeTrackingSessions.set(portfolioId, trackingSession);

    // Initialize price updates for all positions
    await this.initializePriceUpdates(portfolioId);

    this.logger.log(`Started real-time tracking for portfolio ${portfolioId}`);

    return {
      portfolioId,
      status: 'TRACKING_STARTED',
      startTime: trackingSession.startTime,
      message: 'Real-time tracking has been initiated',
    };
  }

  async stopTracking(portfolioId: string): Promise<any> {
    const trackingSession = this.activeTrackingSessions.get(portfolioId);

    if (!trackingSession) {
      return {
        portfolioId,
        status: 'NOT_TRACKING',
        message: 'No active tracking session found for this portfolio',
      };
    }

    trackingSession.status = 'STOPPED';
    trackingSession.endTime = new Date();

    const duration = trackingSession.endTime.getTime() - trackingSession.startTime.getTime();

    this.activeTrackingSessions.delete(portfolioId);

    this.logger.log(`Stopped real-time tracking for portfolio ${portfolioId}`);

    return {
      portfolioId,
      status: 'TRACKING_STOPPED',
      duration,
      updateCount: trackingSession.updateCount,
      averageLatency: trackingSession.latency,
      message: 'Real-time tracking has been stopped',
    };
  }

  async getTrackingStatus(portfolioId: string): Promise<any> {
    const trackingSession = this.activeTrackingSessions.get(portfolioId);

    if (!trackingSession) {
      return {
        portfolioId,
        status: 'NOT_TRACKING',
        message: 'No active tracking session',
      };
    }

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    return {
      portfolioId,
      status: trackingSession.status,
      startTime: trackingSession.startTime,
      lastUpdate: trackingSession.lastUpdate,
      updateCount: trackingSession.updateCount,
      averageLatency: trackingSession.latency,
      trackedPositions: positions.length,
      lastPriceUpdates: positions.map(pos => ({
        assetId: pos.asset.id,
        symbol: pos.asset.symbol,
        lastPrice: pos.currentPrice,
        lastUpdate: pos.lastPriceUpdate,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnl,
        unrealizedPnLPercent: pos.unrealizedPnlPercent,
      })),
    };
  }

  async updatePositionPrices(portfolioId: string): Promise<any> {
    const startTime = Date.now();
    const trackingSession = this.activeTrackingSessions.get(portfolioId);

    if (!trackingSession) {
      throw new NotFoundException(`No active tracking session for portfolio ${portfolioId}`);
    }

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const updateResults = [];

    for (const position of positions) {
      const updateResult = await this.updateSinglePositionPrice(position);
      updateResults.push(updateResult);
    }

    // Update portfolio total value
    await this.updatePortfolioValue(portfolioId);

    // Update tracking session metrics
    const endTime = Date.now();
    trackingSession.lastUpdate = new Date();
    trackingSession.updateCount++;
    trackingSession.latency = (trackingSession.latency * (trackingSession.updateCount - 1) + (endTime - startTime)) / trackingSession.updateCount;

    // Record performance snapshot
    await this.recordPerformanceSnapshot(portfolioId);

    return {
      portfolioId,
      updateTimestamp: new Date(),
      latency: endTime - startTime,
      updatedPositions: updateResults.length,
      results: updateResults,
    };
  }

  async initializePriceUpdates(portfolioId: string): Promise<void> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    for (const position of positions) {
      // Queue initial price update
      this.priceUpdateQueue.set(position.asset.id, {
        assetId: position.asset.id,
        lastUpdate: new Date(),
        priority: 'HIGH',
      });
    }

    // Process initial updates
    await this.processPriceUpdateQueue(portfolioId);
  }

  private async updateSinglePositionPrice(position: PositionEntity): Promise<any> {
    try {
      const currentPrice = await this.fetchCurrentPrice(position.asset);
      const previousPrice = position.currentPrice;
      const priceChange = currentPrice - previousPrice;
      const priceChangePercent = previousPrice > 0 ? (priceChange / previousPrice) * 100 : 0;

      const newMarketValue = position.quantity * currentPrice;
      const newUnrealizedPnL = newMarketValue - (position.quantity * position.averageCost);
      const newUnrealizedPnLPercent = position.averageCost > 0 ? (newUnrealizedPnL / (position.quantity * position.averageCost)) * 100 : 0;

      // Update position
      await this.positionRepository.update(position.id, {
        currentPrice,
        marketValue: newMarketValue,
        unrealizedPnL: newUnrealizedPnL,
        unrealizedPnLPercent: newUnrealizedPnLPercent,
        lastPriceUpdate: new Date(),
      });

      // Update asset price
      await this.assetRepository.update(position.asset.id, {
        currentPrice,
        lastPriceUpdate: new Date(),
      });

      return {
        positionId: position.id,
        assetId: position.asset.id,
        symbol: position.asset.symbol,
        previousPrice,
        currentPrice,
        priceChange,
        priceChangePercent,
        newMarketValue,
        newUnrealizedPnL,
        newUnrealizedPnLPercent,
        updateTimestamp: new Date(),
        status: 'SUCCESS',
      };
    } catch (error) {
      this.logger.error(`Failed to update price for position ${position.id}: ${error.message}`);
      return {
        positionId: position.id,
        assetId: position.asset.id,
        error: error.message,
        status: 'ERROR',
      };
    }
  }

  private async fetchCurrentPrice(asset: AssetEntity): Promise<number> {
    // Simulate real-time price fetching
    // In practice, this would integrate with market data providers
    const basePrice = asset.currentPrice || 100;
    const volatility = asset.volatility || 0.2;
    const randomChange = (Math.random() - 0.5) * 2 * volatility * basePrice / 100;
    
    return Math.max(basePrice + randomChange, 0.01); // Ensure price doesn't go negative
  }

  private async updatePortfolioValue(portfolioId: string): Promise<void> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
    });

    const totalValue = positions.reduce((sum, position) => sum + position.marketValue, 0);

    await this.portfolioRepository.update(portfolioId, {
      totalValue,
    });
  }

  private async recordPerformanceSnapshot(portfolioId: string): Promise<void> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) return;

    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const totalValue = portfolio.totalValue;
    const dailyReturn = this.calculateDailyReturn(portfolioId, totalValue);
    const dailyReturnPercent = (dailyReturn / (totalValue - dailyReturn)) * 100;
    const totalReturn = totalValue - portfolio.initialValue;
    const totalReturnPercent = portfolio.initialValue > 0 ? (totalReturn / portfolio.initialValue) * 100 : 0;

    // Calculate additional metrics
    const volatility = await this.calculatePortfolioVolatility(positions);
    const sharpeRatio = this.calculateSharpeRatio(totalReturnPercent, volatility);
    const maxDrawdown = await this.calculateMaxDrawdown(portfolioId);
    const var95 = this.calculateVaR(totalValue, volatility, 0.95);
    const beta = this.calculatePortfolioBeta(positions);
    const alpha = this.calculateAlpha(totalReturnPercent, beta);

    // Create performance snapshot
    const performanceSnapshot = this.performanceRepository.create({
      portfolioId,
      date: new Date(),
      totalValue,
      dailyReturn,
      dailyReturnPercent,
      totalReturn,
      totalReturnPercent,
      volatility,
      sharpeRatio,
      maxDrawdown,
      var95,
      beta,
      alpha,
      allocationData: this.getAllocationData(positions, totalValue),
      riskMetrics: {
        concentration: this.calculateConcentrationRisk(positions, totalValue),
        currencyExposure: this.calculateCurrencyExposure(positions),
        sectorExposure: this.calculateSectorExposure(positions),
      },
    });

    await this.performanceRepository.save(performanceSnapshot);
  }

  private async processPriceUpdateQueue(portfolioId: string): Promise<void> {
    const queue = Array.from(this.priceUpdateQueue.values());
    
    // Sort by priority
    queue.sort((a, b) => {
      if (a.priority === 'HIGH' && b.priority !== 'HIGH') return -1;
      if (a.priority !== 'HIGH' && b.priority === 'HIGH') return 1;
      return 0;
    });

    // Process updates
    for (const update of queue) {
      try {
        const asset = await this.assetRepository.findOne({
          where: { id: update.assetId },
        });

        if (asset) {
          const newPrice = await this.fetchCurrentPrice(asset);
          await this.assetRepository.update(update.assetId, {
            currentPrice: newPrice,
            lastPriceUpdate: new Date(),
          });
        }
      } catch (error) {
        this.logger.error(`Failed to process price update for asset ${update.assetId}: ${error.message}`);
      }
    }

    // Clear queue
    this.priceUpdateQueue.clear();
  }

  // Scheduled updates for all active tracking sessions
  @Interval(5000) // Update every 5 seconds for real-time tracking
  async handleScheduledUpdates(): Promise<void> {
    const activePortfolioIds = Array.from(this.activeTrackingSessions.keys());

    for (const portfolioId of activePortfolioIds) {
      try {
        await this.updatePositionPrices(portfolioId);
      } catch (error) {
        this.logger.error(`Scheduled update failed for portfolio ${portfolioId}: ${error.message}`);
      }
    }
  }

  // Cleanup old tracking sessions
  @Cron('0 */6 * * *') // Every 6 hours
  async cleanupOldSessions(): Promise<void> {
    const now = new Date();
    const sessionsToRemove = [];

    for (const [portfolioId, session] of this.activeTrackingSessions.entries()) {
      const sessionAge = now.getTime() - session.startTime.getTime();
      
      // Remove sessions older than 24 hours
      if (sessionAge > 24 * 60 * 60 * 1000) {
        sessionsToRemove.push(portfolioId);
      }
    }

    for (const portfolioId of sessionsToRemove) {
      await this.stopTracking(portfolioId);
      this.logger.log(`Cleaned up old tracking session for portfolio ${portfolioId}`);
    }
  }

  // Helper methods for performance calculations
  private calculateDailyReturn(portfolioId: string, currentValue: number): number {
    // In practice, you would fetch previous day's value
    // For now, return a small random change
    return (Math.random() - 0.5) * currentValue * 0.02; // ±2% daily change
  }

  private async calculatePortfolioVolatility(positions: PositionEntity[]): Promise<number> {
    // Simplified volatility calculation
    let portfolioVariance = 0;
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      const assetVolatility = position.asset.volatility || 0.2;
      portfolioVariance += Math.pow(weight * assetVolatility, 2);
    }

    return Math.sqrt(portfolioVariance);
  }

  private calculateSharpeRatio(returnPercent: number, volatility: number): number {
    const riskFreeRate = 0.02; // 2% risk-free rate
    return volatility > 0 ? (returnPercent / 100 - riskFreeRate) / volatility : 0;
  }

  private async calculateMaxDrawdown(portfolioId: string): Promise<number> {
    // Simplified max drawdown calculation
    // In practice, you would analyze historical performance data
    return Math.random() * 0.15; // Random drawdown up to 15%
  }

  private calculateVaR(portfolioValue: number, volatility: number, confidenceLevel: number): number {
    const zScore = confidenceLevel === 0.95 ? 1.65 : 2.33; // 95% or 99% confidence
    return portfolioValue * zScore * volatility;
  }

  private calculatePortfolioBeta(positions: PositionEntity[]): number {
    let portfolioBeta = 0;
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      const assetBeta = position.asset.beta || 1.0;
      portfolioBeta += weight * assetBeta;
    }

    return portfolioBeta;
  }

  private calculateAlpha(returnPercent: number, beta: number): number {
    const marketReturn = 0.08; // 8% market return
    const riskFreeRate = 0.02; // 2% risk-free rate
    return returnPercent / 100 - (riskFreeRate + beta * (marketReturn - riskFreeRate));
  }

  private getAllocationData(positions: PositionEntity[], totalValue: number): any {
    return positions.map(position => ({
      assetId: position.asset.id,
      symbol: position.asset.symbol,
      value: position.marketValue,
      percentage: totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0,
    }));
  }

  private calculateConcentrationRisk(positions: PositionEntity[], totalValue: number): number {
    let hhi = 0;
    for (const position of positions) {
      const weight = position.marketValue / totalValue;
      hhi += Math.pow(weight, 2);
    }
    return hhi;
  }

  private calculateCurrencyExposure(positions: PositionEntity[]): any {
    const exposure = {};
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const currency = position.asset.currency;
      if (!exposure[currency]) {
        exposure[currency] = 0;
      }
      exposure[currency] += position.marketValue;
    }

    // Convert to percentages
    for (const currency in exposure) {
      exposure[currency] = totalValue > 0 ? (exposure[currency] / totalValue) * 100 : 0;
    }

    return exposure;
  }

  private calculateSectorExposure(positions: PositionEntity[]): any {
    const exposure = {};
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    for (const position of positions) {
      const sector = position.asset.sector || 'Unknown';
      if (!exposure[sector]) {
        exposure[sector] = 0;
      }
      exposure[sector] += position.marketValue;
    }

    // Convert to percentages
    for (const sector in exposure) {
      exposure[sector] = totalValue > 0 ? (exposure[sector] / totalValue) * 100 : 0;
    }

    return exposure;
  }
}

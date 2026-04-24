import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PortfolioEntity } from './entities/portfolio.entity';
import { PositionEntity } from './entities/position.entity';
import { AssetEntity } from './entities/asset.entity';
import { TransactionEntity } from './entities/transaction.entity';
import { PortfolioPerformanceEntity } from './entities/portfolio-performance.entity';
import {
  CreatePortfolioDto,
  UpdatePortfolioDto,
  PortfolioQueryDto,
} from './dto/portfolio.dto';
import {
  CreatePositionDto,
  UpdatePositionDto,
  PositionQueryDto,
} from './dto/position.dto';
import {
  CreateTransactionDto,
  TransactionQueryDto,
} from './dto/transaction.dto';
import { RebalanceRequestDto, PortfolioSnapshotDto } from './dto/analytics.dto';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(PortfolioEntity)
    private portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PositionEntity)
    private positionRepository: Repository<PositionEntity>,
    @InjectRepository(AssetEntity)
    private assetRepository: Repository<AssetEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
    @InjectRepository(PortfolioPerformanceEntity)
    private performanceRepository: Repository<PortfolioPerformanceEntity>,
    private dataSource: DataSource,
  ) {}

  // Portfolio Management Methods
  async createPortfolio(createPortfolioDto: CreatePortfolioDto): Promise<PortfolioEntity> {
    const portfolio = this.portfolioRepository.create(createPortfolioDto);
    return this.portfolioRepository.save(portfolio);
  }

  async getPortfolios(query: PortfolioQueryDto): Promise<{ portfolios: PortfolioEntity[]; total: number }> {
    const { userId, status, riskTolerance, page = 1, limit = 10 } = query;
    
    const queryBuilder = this.portfolioRepository
      .createQueryBuilder('portfolio')
      .leftJoinAndSelect('portfolio.positions', 'positions')
      .leftJoinAndSelect('positions.asset', 'asset');

    if (userId) {
      queryBuilder.andWhere('portfolio.userId = :userId', { userId });
    }
    if (status) {
      queryBuilder.andWhere('portfolio.status = :status', { status });
    }
    if (riskTolerance) {
      queryBuilder.andWhere('portfolio.riskTolerance = :riskTolerance', { riskTolerance });
    }

    const [portfolios, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { portfolios, total };
  }

  async getPortfolio(id: string): Promise<PortfolioEntity> {
    const portfolio = await this.portfolioRepository
      .createQueryBuilder('portfolio')
      .leftJoinAndSelect('portfolio.positions', 'positions')
      .leftJoinAndSelect('positions.asset', 'asset')
      .where('portfolio.id = :id', { id })
      .getOne();

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${id} not found`);
    }

    return portfolio;
  }

  async updatePortfolio(id: string, updatePortfolioDto: UpdatePortfolioDto): Promise<PortfolioEntity> {
    await this.portfolioRepository.update(id, updatePortfolioDto);
    return this.getPortfolio(id);
  }

  async deletePortfolio(id: string): Promise<void> {
    const result = await this.portfolioRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Portfolio with ID ${id} not found`);
    }
  }

  // Position Management Methods
  async addPosition(portfolioId: string, createPositionDto: CreatePositionDto): Promise<PositionEntity> {
    const portfolio = await this.getPortfolio(portfolioId);
    const asset = await this.assetRepository.findOne({ where: { id: createPositionDto.assetId } });
    
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${createPositionDto.assetId} not found`);
    }

    const position = this.positionRepository.create({
      ...createPositionDto,
      portfolioId,
      currentPrice: asset.currentPrice || 0,
      marketValue: createPositionDto.quantity * (asset.currentPrice || 0),
      lastPriceUpdate: new Date(),
    });

    await this.positionRepository.save(position);
    await this.updatePortfolioValue(portfolioId);
    
    return position;
  }

  async getPositions(portfolioId: string, query: PositionQueryDto): Promise<{ positions: PositionEntity[]; total: number }> {
    const { assetId, status, page = 1, limit = 10 } = query;
    
    const queryBuilder = this.positionRepository
      .createQueryBuilder('position')
      .leftJoinAndSelect('position.asset', 'asset')
      .where('position.portfolioId = :portfolioId', { portfolioId });

    if (assetId) {
      queryBuilder.andWhere('position.assetId = :assetId', { assetId });
    }
    if (status) {
      queryBuilder.andWhere('position.status = :status', { status });
    }

    const [positions, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { positions, total };
  }

  async updatePosition(
    portfolioId: string,
    positionId: string,
    updatePositionDto: UpdatePositionDto,
  ): Promise<PositionEntity> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId, portfolioId },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${positionId} not found`);
    }

    await this.positionRepository.update(positionId, updatePositionDto);
    
    const updatedPosition = await this.positionRepository.findOne({
      where: { id: positionId },
      relations: ['asset'],
    });

    await this.updatePortfolioValue(portfolioId);
    
    return updatedPosition;
  }

  async removePosition(portfolioId: string, positionId: string): Promise<void> {
    const position = await this.positionRepository.findOne({
      where: { id: positionId, portfolioId },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${positionId} not found`);
    }

    await this.positionRepository.delete(positionId);
    await this.updatePortfolioValue(portfolioId);
  }

  // Transaction Management Methods
  async createTransaction(
    portfolioId: string,
    createTransactionDto: CreateTransactionDto,
  ): Promise<TransactionEntity> {
    const transaction = this.transactionRepository.create({
      ...createTransactionDto,
      portfolioId,
      netAmount: createTransactionDto.totalAmount - (createTransactionDto.fees || 0) - (createTransactionDto.taxes || 0),
    });

    const savedTransaction = await this.transactionRepository.save(transaction);
    
    // Update position based on transaction
    await this.updatePositionFromTransaction(portfolioId, savedTransaction);
    
    return savedTransaction;
  }

  async getTransactions(
    portfolioId: string,
    query: TransactionQueryDto,
  ): Promise<{ transactions: TransactionEntity[]; total: number }> {
    const { assetId, transactionType, startDate, endDate, page = 1, limit = 10 } = query;
    
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.asset', 'asset')
      .where('transaction.portfolioId = :portfolioId', { portfolioId });

    if (assetId) {
      queryBuilder.andWhere('transaction.assetId = :assetId', { assetId });
    }
    if (transactionType) {
      queryBuilder.andWhere('transaction.transactionType = :transactionType', { transactionType });
    }
    if (startDate) {
      queryBuilder.andWhere('transaction.date >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('transaction.date <= :endDate', { endDate });
    }

    const [transactions, total] = await queryBuilder
      .orderBy('transaction.date', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { transactions, total };
  }

  // Portfolio Rebalancing
  async rebalancePortfolio(
    portfolioId: string,
    rebalanceDto: RebalanceRequestDto,
  ): Promise<{ rebalancedPositions: PositionEntity[]; trades: any[] }> {
    const portfolio = await this.getPortfolio(portfolioId);
    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const targetAllocations = rebalanceDto.targetAllocations || [];
    const threshold = rebalanceDto.threshold || 5.0;

    const trades = [];
    const rebalancedPositions = [];

    for (const position of positions) {
      const currentValue = position.marketValue;
      const totalValue = portfolio.totalValue;
      const currentAllocation = (currentValue / totalValue) * 100;

      const targetAllocation = targetAllocations.find(
        target => target.assetId === position.assetId,
      )?.targetPercentage || currentAllocation;

      const allocationDiff = Math.abs(currentAllocation - targetAllocation);

      if (allocationDiff > threshold) {
        const targetValue = (targetAllocation / 100) * totalValue;
        const tradeValue = targetValue - currentValue;
        const tradeQuantity = tradeValue / position.currentPrice;

        if (tradeQuantity > 0) {
          trades.push({
            assetId: position.assetId,
            type: 'BUY',
            quantity: tradeQuantity,
            price: position.currentPrice,
          });
        } else if (tradeQuantity < 0) {
          trades.push({
            assetId: position.assetId,
            type: 'SELL',
            quantity: Math.abs(tradeQuantity),
            price: position.currentPrice,
          });
        }
      }

      rebalancedPositions.push(position);
    }

    // Execute trades if requested
    if (rebalanceDto.executeTrades && trades.length > 0) {
      // This would integrate with the trading service
      // For now, we'll just return the trades
    }

    return { rebalancedPositions, trades };
  }

  // Portfolio Snapshot
  async getPortfolioSnapshot(
    portfolioId: string,
    snapshotDto: PortfolioSnapshotDto,
  ): Promise<any> {
    const portfolio = await this.getPortfolio(portfolioId);
    const snapshot: any = { portfolio };

    if (snapshotDto.includePositions !== false) {
      const positions = await this.positionRepository.find({
        where: { portfolioId },
        relations: ['asset'],
      });
      snapshot.positions = positions;
    }

    if (snapshotDto.includePerformance !== false) {
      const performance = await this.getRecentPerformance(portfolioId);
      snapshot.performance = performance;
    }

    if (snapshotDto.includeAllocation !== false) {
      const allocation = await this.getAllocationData(portfolioId);
      snapshot.allocation = allocation;
    }

    snapshot.timestamp = new Date();
    return snapshot;
  }

  // Dashboard Data
  async getDashboardData(portfolioId: string): Promise<any> {
    const portfolio = await this.getPortfolio(portfolioId);
    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const totalValue = portfolio.totalValue;
    const totalReturn = totalValue - portfolio.initialValue;
    const totalReturnPercent = portfolio.initialValue > 0 ? (totalReturn / portfolio.initialValue) * 100 : 0;

    const topPerformers = positions
      .filter(p => p.unrealizedPnlPercent > 0)
      .sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent)
      .slice(0, 5);

    const worstPerformers = positions
      .filter(p => p.unrealizedPnlPercent < 0)
      .sort((a, b) => a.unrealizedPnlPercent - b.unrealizedPnlPercent)
      .slice(0, 5);

    return {
      portfolio: {
        id: portfolio.id,
        name: portfolio.name,
        totalValue,
        totalReturn,
        totalReturnPercent,
        currency: portfolio.currency,
        lastUpdated: portfolio.updatedAt,
      },
      summary: {
        totalPositions: positions.length,
        profitablePositions: positions.filter(p => p.unrealizedPnl > 0).length,
        losingPositions: positions.filter(p => p.unrealizedPnl < 0).length,
        topPerformers,
        worstPerformers,
      },
      allocation: await this.getAllocationData(portfolioId),
      recentTransactions: await this.getRecentTransactions(portfolioId, 5),
    };
  }

  // Private Helper Methods
  private async updatePortfolioValue(portfolioId: string): Promise<void> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
    });

    const totalValue = positions.reduce((sum, position) => sum + position.marketValue, 0);

    await this.portfolioRepository.update(portfolioId, { totalValue });
  }

  private async updatePositionFromTransaction(
    portfolioId: string,
    transaction: TransactionEntity,
  ): Promise<void> {
    const position = await this.positionRepository.findOne({
      where: { portfolioId, assetId: transaction.assetId },
    });

    if (position) {
      // Update existing position
      const newQuantity = transaction.transactionType === 'BUY' 
        ? position.quantity + transaction.quantity
        : position.quantity - transaction.quantity;

      const newTotalCost = position.averageCost * position.quantity + transaction.netAmount;
      const newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;

      await this.positionRepository.update(position.id, {
        quantity: newQuantity,
        averageCost: newAverageCost,
        status: newQuantity > 0 ? 'ACTIVE' : 'CLOSED',
      });
    } else if (transaction.transactionType === 'BUY') {
      // Create new position
      const averageCost = transaction.netAmount / transaction.quantity;
      await this.addPosition(portfolioId, {
        portfolioId,
        assetId: transaction.assetId,
        quantity: transaction.quantity,
        averageCost,
      });
    }

    await this.updatePortfolioValue(portfolioId);
  }

  private async getRecentPerformance(portfolioId: string): Promise<any> {
    const performance = await this.performanceRepository.find({
      where: { portfolioId },
      order: { date: 'DESC' },
      take: 30,
    });

    return performance;
  }

  private async getAllocationData(portfolioId: string): Promise<any> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const totalValue = positions.reduce((sum, position) => sum + position.marketValue, 0);

    const allocation = positions.map(position => ({
      assetId: position.asset.id,
      symbol: position.asset.symbol,
      name: position.asset.name,
      assetType: position.asset.assetType,
      value: position.marketValue,
      percentage: totalValue > 0 ? (position.marketValue / totalValue) * 100 : 0,
      quantity: position.quantity,
    }));

    return {
      totalValue,
      allocation,
      byAssetType: this.groupByAssetType(allocation),
    };
  }

  private groupByAssetType(allocation: any[]): any {
    return allocation.reduce((acc, item) => {
      const { assetType, value, percentage } = item;
      if (!acc[assetType]) {
        acc[assetType] = { value: 0, percentage: 0, count: 0 };
      }
      acc[assetType].value += value;
      acc[assetType].percentage += percentage;
      acc[assetType].count += 1;
      return acc;
    }, {});
  }

  private async getRecentTransactions(portfolioId: string, limit: number): Promise<TransactionEntity[]> {
    return this.transactionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
      order: { date: 'DESC' },
      take: limit,
    });
  }
}

import { Injectable, NotFoundException, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortfolioEntity } from '../entities/portfolio.entity';
import { PositionEntity } from '../entities/position.entity';
import { AssetEntity } from '../entities/asset.entity';
import { TransactionEntity } from '../entities/transaction.entity';

@Injectable()
export class TradingIntegrationService {
  private readonly logger = new Logger(TradingIntegrationService.name);
  private activeOrders = new Map<string, any>();
  private orderQueue = new Map<string, any[]>();

  constructor(
    @InjectRepository(PortfolioEntity)
    private portfolioRepository: Repository<PortfolioEntity>,
    @InjectRepository(PositionEntity)
    private positionRepository: Repository<PositionEntity>,
    @InjectRepository(AssetEntity)
    private assetRepository: Repository<AssetEntity>,
    @InjectRepository(TransactionEntity)
    private transactionRepository: Repository<TransactionEntity>,
  ) {}

  async executeTrades(portfolioId: string, trades: any[]): Promise<any> {
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    const executionResults = [];
    let totalExecutionCost = 0;
    let successfulTrades = 0;
    let failedTrades = 0;

    for (const trade of trades) {
      try {
        const result = await this.executeSingleTrade(portfolioId, trade);
        executionResults.push(result);
        
        if (result.status === 'SUCCESS') {
          successfulTrades++;
          totalExecutionCost += result.executionCost;
        } else {
          failedTrades++;
        }
      } catch (error) {
        this.logger.error(`Trade execution failed: ${error.message}`);
        executionResults.push({
          tradeId: trade.id || 'unknown',
          status: 'FAILED',
          error: error.message,
        });
        failedTrades++;
      }
    }

    // Update portfolio value after all trades
    await this.updatePortfolioValue(portfolioId);

    return {
      portfolioId,
      executionDate: new Date(),
      totalTrades: trades.length,
      successfulTrades,
      failedTrades,
      totalExecutionCost,
      averageExecutionTime: this.calculateAverageExecutionTime(executionResults),
      results: executionResults,
      summary: {
        successRate: (successfulTrades / trades.length) * 100,
        totalValue: executionResults.reduce((sum, r) => sum + (r.executedValue || 0), 0),
        totalShares: executionResults.reduce((sum, r) => sum + (r.executedShares || 0), 0),
      },
    };
  }

  async getOrders(portfolioId: string, query: any = {}): Promise<any> {
    const { status, startDate, endDate, page = 1, limit = 50 } = query;

    // Get orders from active orders and transaction history
    const activeOrders = Array.from(this.activeOrders.values())
      .filter(order => order.portfolioId === portfolioId);

    const transactions = await this.transactionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
      order: { date: 'DESC' },
    });

    // Combine and filter results
    let allOrders = [...activeOrders, ...transactions];

    if (status) {
      allOrders = allOrders.filter(order => 
        (order.status && order.status.toUpperCase() === status.toUpperCase()) ||
        (order.transactionType && order.transactionType === status.toUpperCase())
      );
    }

    if (startDate) {
      allOrders = allOrders.filter(order => 
        new Date(order.date || order.createdAt) >= new Date(startDate)
      );
    }

    if (endDate) {
      allOrders = allOrders.filter(order => 
        new Date(order.date || order.createdAt) <= new Date(endDate)
      );
    }

    // Pagination
    const startIndex = (page - 1) * limit;
    const paginatedOrders = allOrders.slice(startIndex, startIndex + limit);

    return {
      portfolioId,
      orders: paginatedOrders,
      pagination: {
        page,
        limit,
        total: allOrders.length,
        pages: Math.ceil(allOrders.length / limit),
      },
    };
  }

  async cancelOrder(portfolioId: string, orderId: string): Promise<any> {
    const order = this.activeOrders.get(orderId);

    if (!order || order.portfolioId !== portfolioId) {
      throw new NotFoundException(`Order ${orderId} not found for portfolio ${portfolioId}`);
    }

    if (order.status === 'FILLED' || order.status === 'CANCELLED') {
      throw new HttpException(
        `Cannot cancel order in ${order.status} status`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Cancel the order
    order.status = 'CANCELLED';
    order.cancelledAt = new Date();
    order.cancelReason = 'User requested cancellation';

    this.activeOrders.delete(orderId);

    this.logger.log(`Cancelled order ${orderId} for portfolio ${portfolioId}`);

    return {
      orderId,
      portfolioId,
      status: 'CANCELLED',
      cancelledAt: order.cancelledAt,
      message: 'Order successfully cancelled',
    };
  }

  async getExecutionStatus(portfolioId: string, executionId: string): Promise<any> {
    // Find the execution in active orders or transaction history
    let execution = this.activeOrders.get(executionId);

    if (!execution) {
      execution = await this.transactionRepository.findOne({
        where: { id: executionId, portfolioId },
        relations: ['asset'],
      });
    }

    if (!execution) {
      throw new NotFoundException(`Execution ${executionId} not found`);
    }

    return {
      executionId,
      portfolioId,
      status: execution.status,
      createdAt: execution.createdAt || execution.date,
      updatedAt: execution.updatedAt,
      details: execution,
    };
  }

  private async executeSingleTrade(portfolioId: string, trade: any): Promise<any> {
    const startTime = Date.now();
    
    // Validate trade
    await this.validateTrade(portfolioId, trade);

    // Get asset information
    const asset = await this.assetRepository.findOne({
      where: { id: trade.assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${trade.assetId} not found`);
    }

    // Create order
    const orderId = this.generateOrderId();
    const order = {
      id: orderId,
      portfolioId,
      assetId: trade.assetId,
      symbol: asset.symbol,
      type: trade.type || 'MARKET', // MARKET, LIMIT, STOP
      side: trade.action, // BUY, SELL
      quantity: trade.quantity,
      price: trade.price || 0,
      status: 'PENDING',
      createdAt: new Date(),
      estimatedCost: this.calculateEstimatedCost(trade, asset),
    };

    this.activeOrders.set(orderId, order);

    try {
      // Execute the trade
      const executionResult = await this.executeOrder(order, asset);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Create transaction record
      const transaction = this.transactionRepository.create({
        portfolioId,
        assetId: trade.assetId,
        transactionType: trade.action,
        quantity: executionResult.executedQuantity,
        price: executionResult.executedPrice,
        totalAmount: executionResult.executedValue,
        fees: executionResult.fees,
        taxes: executionResult.taxes,
        netAmount: executionResult.netValue,
        date: new Date(),
        orderId,
        status: 'COMPLETED',
      });

      await this.transactionRepository.save(transaction);

      // Update position
      await this.updatePositionFromTrade(portfolioId, trade, executionResult);

      // Update order status
      order.status = 'FILLED';
      order.filledAt = new Date();
      order.executedQuantity = executionResult.executedQuantity;
      order.executedPrice = executionResult.executedPrice;
      order.executedValue = executionResult.executedValue;
      order.executionTime = executionTime;

      this.activeOrders.set(orderId, order);

      return {
        tradeId: trade.id || orderId,
        orderId,
        status: 'SUCCESS',
        executedQuantity: executionResult.executedQuantity,
        executedPrice: executionResult.executedPrice,
        executedValue: executionResult.executedValue,
        executionTime,
        executionCost: executionResult.fees + executionResult.taxes,
        fees: executionResult.fees,
        taxes: executionResult.taxes,
      };

    } catch (error) {
      // Update order status to failed
      order.status = 'FAILED';
      order.failedAt = new Date();
      order.error = error.message;

      this.activeOrders.set(orderId, order);

      throw error;
    }
  }

  private async validateTrade(portfolioId: string, trade: any): Promise<void> {
    if (!trade.assetId || !trade.action || !trade.quantity) {
      throw new HttpException('Missing required trade fields', HttpStatus.BAD_REQUEST);
    }

    if (!['BUY', 'SELL'].includes(trade.action)) {
      throw new HttpException('Invalid trade action', HttpStatus.BAD_REQUEST);
    }

    if (trade.quantity <= 0) {
      throw new HttpException('Trade quantity must be positive', HttpStatus.BAD_REQUEST);
    }

    // For sell orders, check if position exists
    if (trade.action === 'SELL') {
      const position = await this.positionRepository.findOne({
        where: { portfolioId, assetId: trade.assetId },
      });

      if (!position || position.quantity < trade.quantity) {
        throw new HttpException('Insufficient position for sell order', HttpStatus.BAD_REQUEST);
      }
    }

    // Check portfolio value for buy orders
    if (trade.action === 'BUY') {
      const portfolio = await this.portfolioRepository.findOne({
        where: { id: portfolioId },
      });

      const asset = await this.assetRepository.findOne({
        where: { id: trade.assetId },
      });

      const estimatedCost = this.calculateEstimatedCost(trade, asset);
      
      if (portfolio.totalValue < estimatedCost) {
        throw new HttpException('Insufficient portfolio value for buy order', HttpStatus.BAD_REQUEST);
      }
    }
  }

  private async executeOrder(order: any, asset: AssetEntity): Promise<any> {
    // Simulate order execution
    // In practice, this would integrate with actual trading APIs
    
    const marketPrice = await this.getCurrentMarketPrice(asset);
    const executedPrice = order.type === 'MARKET' ? marketPrice : order.price;
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50)); // 50-150ms

    // Calculate execution details
    const executedQuantity = order.quantity;
    const executedValue = executedQuantity * executedPrice;
    const fees = this.calculateFees(executedValue, asset);
    const taxes = this.calculateTaxes(executedValue, order.side, asset);
    const netValue = executedValue - fees - taxes;

    // Simulate partial fills for large orders
    const fillRate = executedQuantity > 1000 ? 0.95 : 1.0; // 95% fill for large orders
    const finalExecutedQuantity = executedQuantity * fillRate;
    const finalExecutedValue = finalExecutedQuantity * executedPrice;

    return {
      executedQuantity: finalExecutedQuantity,
      executedPrice,
      executedValue: finalExecutedValue,
      fees,
      taxes,
      netValue: finalExecutedValue - fees - taxes,
      fillRate,
    };
  }

  private async getCurrentMarketPrice(asset: AssetEntity): Promise<number> {
    // Simulate getting current market price
    // In practice, this would fetch from market data provider
    return asset.currentPrice || 100 + (Math.random() - 0.5) * 10;
  }

  private calculateEstimatedCost(trade: any, asset: AssetEntity): number {
    const price = trade.price || asset.currentPrice || 100;
    return trade.quantity * price * 1.01; // Add 1% buffer for fees and slippage
  }

  private calculateFees(executedValue: number, asset: AssetEntity): number {
    // Calculate trading fees based on asset type and exchange
    let feeRate = 0.001; // 0.1% base fee

    switch (asset.assetType) {
      case 'CRYPTO':
        feeRate = 0.002; // 0.2% for crypto
        break;
      case 'FOREX':
        feeRate = 0.0005; // 0.05% for forex
        break;
      default:
        feeRate = 0.001; // 0.1% for stocks/ETFs
    }

    return Math.max(executedValue * feeRate, 1); // Minimum $1 fee
  }

  private calculateTaxes(executedValue: number, side: string, asset: AssetEntity): number {
    // Simplified tax calculation
    // In practice, this would be more complex based on jurisdiction
    if (side === 'SELL' && asset.assetType === 'STOCK') {
      return executedValue * 0.0001; // 0.01% tax on stock sales
    }
    return 0;
  }

  private async updatePositionFromTrade(portfolioId: string, trade: any, executionResult: any): Promise<void> {
    const position = await this.positionRepository.findOne({
      where: { portfolioId, assetId: trade.assetId },
    });

    if (position) {
      // Update existing position
      const newQuantity = trade.action === 'BUY' 
        ? position.quantity + executionResult.executedQuantity
        : position.quantity - executionResult.executedQuantity;

      const newTotalCost = position.averageCost * position.quantity + 
        (trade.action === 'BUY' ? executionResult.netValue : 0);
      const newAverageCost = newQuantity > 0 ? newTotalCost / newQuantity : 0;

      await this.positionRepository.update(position.id, {
        quantity: newQuantity,
        averageCost: newAverageCost,
        status: newQuantity > 0 ? 'ACTIVE' : 'CLOSED',
      });
    } else if (trade.action === 'BUY') {
      // Create new position
      const averageCost = executionResult.netValue / executionResult.executedQuantity;
      await this.positionRepository.save({
        portfolioId,
        assetId: trade.assetId,
        quantity: executionResult.executedQuantity,
        averageCost,
        currentPrice: executionResult.executedPrice,
        marketValue: executionResult.executedValue,
        unrealizedPnl: 0,
        unrealizedPnlPercent: 0,
        lastPriceUpdate: new Date(),
        status: 'ACTIVE',
      });
    }
  }

  private async updatePortfolioValue(portfolioId: string): Promise<void> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
    });

    const totalValue = positions.reduce((sum, position) => sum + position.marketValue, 0);

    await this.portfolioRepository.update(portfolioId, { totalValue });
  }

  private generateOrderId(): string {
    return `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }

  private calculateAverageExecutionTime(executionResults: any[]): number {
    const successfulResults = executionResults.filter(r => r.status === 'SUCCESS' && r.executionTime);
    
    if (successfulResults.length === 0) return 0;
    
    const totalTime = successfulResults.reduce((sum, r) => sum + r.executionTime, 0);
    return totalTime / successfulResults.length;
  }

  // Market data integration methods
  async getMarketData(assetId: string): Promise<any> {
    const asset = await this.assetRepository.findOne({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    // Simulate market data
    return {
      assetId,
      symbol: asset.symbol,
      currentPrice: asset.currentPrice || 100,
      bidPrice: (asset.currentPrice || 100) * 0.999,
      askPrice: (asset.currentPrice || 100) * 1.001,
      volume: asset.volume || 1000000,
      marketCap: asset.marketCap || 1000000000,
      lastUpdate: new Date(),
      spread: (asset.currentPrice || 100) * 0.002, // 0.2% spread
    };
  }

  async getPortfolioExposure(portfolioId: string): Promise<any> {
    const positions = await this.positionRepository.find({
      where: { portfolioId },
      relations: ['asset'],
    });

    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

    return {
      portfolioId,
      totalValue,
      exposure: {
        byAsset: positions.map(pos => ({
          assetId: pos.asset.id,
          symbol: pos.asset.symbol,
          value: pos.marketValue,
          percentage: totalValue > 0 ? (pos.marketValue / totalValue) * 100 : 0,
          quantity: pos.quantity,
        })),
        byAssetType: this.groupByAssetType(positions, totalValue),
        bySector: this.groupBySector(positions, totalValue),
        byCurrency: this.groupByCurrency(positions, totalValue),
      },
      lastUpdate: new Date(),
    };
  }

  private groupByAssetType(positions: PositionEntity[], totalValue: number): any {
    const grouped = {};
    
    for (const position of positions) {
      const assetType = position.asset.assetType;
      if (!grouped[assetType]) {
        grouped[assetType] = { value: 0, percentage: 0, count: 0 };
      }
      grouped[assetType].value += position.marketValue;
      grouped[assetType].count += 1;
    }

    for (const assetType in grouped) {
      grouped[assetType].percentage = totalValue > 0 ? (grouped[assetType].value / totalValue) * 100 : 0;
    }

    return grouped;
  }

  private groupBySector(positions: PositionEntity[], totalValue: number): any {
    const grouped = {};
    
    for (const position of positions) {
      const sector = position.asset.sector || 'Unknown';
      if (!grouped[sector]) {
        grouped[sector] = { value: 0, percentage: 0, count: 0 };
      }
      grouped[sector].value += position.marketValue;
      grouped[sector].count += 1;
    }

    for (const sector in grouped) {
      grouped[sector].percentage = totalValue > 0 ? (grouped[sector].value / totalValue) * 100 : 0;
    }

    return grouped;
  }

  private groupByCurrency(positions: PositionEntity[], totalValue: number): any {
    const grouped = {};
    
    for (const position of positions) {
      const currency = position.asset.currency;
      if (!grouped[currency]) {
        grouped[currency] = { value: 0, percentage: 0, count: 0 };
      }
      grouped[currency].value += position.marketValue;
      grouped[currency].count += 1;
    }

    for (const currency in grouped) {
      grouped[currency].percentage = totalValue > 0 ? (grouped[currency].value / totalValue) * 100 : 0;
    }

    return grouped;
  }
}

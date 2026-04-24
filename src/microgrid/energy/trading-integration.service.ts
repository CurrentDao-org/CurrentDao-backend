import { Injectable, Logger } from '@nestjs/common';
import { Cron, Interval } from '@nestjs/schedule';
import { MicrogridNode, GridStatus } from '../microgrid.service';

export interface EnergyMarket {
  id: string;
  name: string;
  type: 'day_ahead' | 'real_time' | 'ancillary' | 'capacity';
  status: 'open' | 'closed' | 'suspended';
  clearingPrice: number;
  volume: number;
  timestamp: Date;
}

export interface TradingOrder {
  id: string;
  marketId: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  duration: number;
  flexibility: 'firm' | 'interruptible' | 'curtailable';
  status: 'pending' | 'matched' | 'executed' | 'cancelled';
  timestamp: Date;
  executionTime?: Date;
  settlementPrice?: number;
}

export interface MarketForecast {
  marketId: string;
  timestamp: Date;
  predictedPrice: number;
  confidence: number;
  demandForecast: number;
  supplyForecast: number;
  volatilityIndex: number;
}

export interface TradingMetrics {
  totalOrders: number;
  executedOrders: number;
  successRate: number;
  averagePrice: number;
  totalVolume: number;
  revenue: number;
  savings: number;
  marketParticipation: number;
  timestamp: Date;
}

export interface BiddingStrategy {
  name: string;
  description: string;
  riskTolerance: 'low' | 'medium' | 'high';
  expectedReturn: number;
  implementation: string[];
}

@Injectable()
export class TradingIntegrationService {
  private readonly logger = new Logger(TradingIntegrationService.name);
  private readonly markets = new Map<string, EnergyMarket>();
  private readonly orders = new Map<string, TradingOrder>();
  private readonly forecasts = new Map<string, MarketForecast[]>();
  private readonly tradingStrategies = new Map<string, BiddingStrategy>();
  private readonly marketData = new Map<string, {
    priceHistory: number[];
    volumeHistory: number[];
    timestamps: Date[];
  }>();

  constructor() {
    this.initializeMarkets();
    this.initializeTradingStrategies();
  }

  async participateInEnergyMarket(
    marketId: string,
    quantity: number,
    strategy: string = 'optimal'
  ): Promise<{
    orderId: string;
    expectedPrice: number;
    riskAssessment: string;
  }> {
    const market = this.markets.get(marketId);
    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }

    if (market.status !== 'open') {
      throw new Error(`Market ${marketId} is not open for trading`);
    }

    const tradingStrategy = this.tradingStrategies.get(strategy);
    if (!tradingStrategy) {
      throw new Error(`Trading strategy ${strategy} not found`);
    }

    // Calculate optimal bid price
    const optimalPrice = await this.calculateOptimalBidPrice(marketId, quantity, tradingStrategy);
    const riskAssessment = await this.assessTradingRisk(marketId, quantity, optimalPrice);

    // Create trading order
    const order: TradingOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      marketId,
      type: quantity > 0 ? 'sell' : 'buy',
      quantity: Math.abs(quantity),
      price: optimalPrice,
      duration: 60, // 1 hour default
      flexibility: 'firm',
      status: 'pending',
      timestamp: new Date(),
    };

    this.orders.set(order.id, order);

    // Submit order to market
    await this.submitOrderToMarket(order);

    this.logger.log(`Submitted order to market ${marketId}: ${order.quantity}MWh at $${optimalPrice}/MWh`);

    return {
      orderId: order.id,
      expectedPrice: optimalPrice,
      riskAssessment,
    };
  }

  async optimizeMarketParticipation(): Promise<{
    recommendations: TradingOrder[];
    expectedRevenue: number;
    riskLevel: string;
  }> {
    const recommendations: TradingOrder[] = [];
    let expectedRevenue = 0;
    let riskLevel = 'medium';

    // Analyze all available markets
    for (const [marketId, market] of this.markets) {
      if (market.status !== 'open') continue;

      const forecast = await this.getMarketForecast(marketId);
      const strategy = await this.selectOptimalStrategy(marketId, forecast);
      
      const recommendation = await this.generateTradingRecommendation(marketId, strategy, forecast);
      
      if (recommendation) {
        recommendations.push(recommendation);
        expectedRevenue += recommendation.quantity * recommendation.price * 0.001; // Convert to appropriate units
      }
    }

    // Assess overall risk level
    const totalRisk = await this.calculatePortfolioRisk(recommendations);
    if (totalRisk < 0.3) riskLevel = 'low';
    else if (totalRisk > 0.7) riskLevel = 'high';

    return {
      recommendations,
      expectedRevenue,
      riskLevel,
    };
  }

  async executeTradingStrategy(
    strategyName: string,
    budget: number,
    durationHours: number = 24
  ): Promise<{
    executedOrders: TradingOrder[];
    totalCost: number;
    expectedReturn: number;
    performanceMetrics: any;
  }> {
    const strategy = this.tradingStrategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Trading strategy ${strategyName} not found`);
    }

    const executedOrders: TradingOrder[] = [];
    let totalCost = 0;
    let expectedReturn = 0;

    // Execute strategy across multiple markets
    for (const [marketId, market] of this.markets) {
      if (market.status !== 'open') continue;

      const orderSize = await this.calculateOptimalOrderSize(marketId, strategy, budget, durationHours);
      if (orderSize <= 0) continue;

      const order = await this.participateInEnergyMarket(marketId, orderSize, strategyName);
      executedOrders.push(order);
      
      totalCost += orderSize * order.price * 0.001;
      expectedReturn += orderSize * market.clearingPrice * 0.001;
    }

    const performanceMetrics = await this.calculateStrategyPerformance(strategyName, executedOrders);

    return {
      executedOrders,
      totalCost,
      expectedReturn,
      performanceMetrics,
    };
  }

  async getTradingMetrics(): Promise<TradingMetrics> {
    const allOrders = Array.from(this.orders.values());
    const executedOrders = allOrders.filter(order => order.status === 'executed');
    
    const totalOrders = allOrders.length;
    const successRate = totalOrders > 0 ? executedOrders.length / totalOrders : 0;
    
    const averagePrice = executedOrders.length > 0 ? 
      executedOrders.reduce((sum, order) => sum + (order.settlementPrice || order.price), 0) / executedOrders.length : 0;
    
    const totalVolume = executedOrders.reduce((sum, order) => sum + order.quantity, 0);
    
    const revenue = executedOrders.reduce((sum, order) => {
      const settlementPrice = order.settlementPrice || order.price;
      return sum + (order.quantity * settlementPrice * 0.001);
    }, 0);

    const savings = await this.calculateTradingSavings(executedOrders);
    const marketParticipation = await this.calculateMarketParticipationRate();

    return {
      totalOrders,
      executedOrders,
      successRate,
      averagePrice,
      totalVolume,
      revenue,
      savings,
      marketParticipation,
      timestamp: new Date(),
    };
  }

  async getMarketForecast(marketId: string, hours: number = 24): Promise<MarketForecast[]> {
    const forecasts: MarketForecast[] = [];
    const currentTime = new Date();
    const market = this.markets.get(marketId);
    
    if (!market) {
      throw new Error(`Market ${marketId} not found`);
    }

    for (let i = 1; i <= hours; i++) {
      const forecastTime = new Date(currentTime.getTime() + i * 60 * 60 * 1000);
      
      const predictedPrice = await this.predictMarketPrice(marketId, forecastTime);
      const demandForecast = await this.predictDemand(marketId, forecastTime);
      const supplyForecast = await this.predictSupply(marketId, forecastTime);
      const volatilityIndex = await this.calculateVolatilityIndex(marketId, forecastTime);
      
      const confidence = 0.8 + Math.random() * 0.2; // Simulate confidence

      forecasts.push({
        marketId,
        timestamp: forecastTime,
        predictedPrice,
        confidence,
        demandForecast,
        supplyForecast,
        volatilityIndex,
      });
    }

    // Store forecasts
    if (!this.forecasts.has(marketId)) {
      this.forecasts.set(marketId, []);
    }
    this.forecasts.get(marketId)!.push(...forecasts);

    return forecasts;
  }

  private initializeMarkets(): void {
    const markets: EnergyMarket[] = [
      {
        id: 'day_ahead_dam',
        name: 'Day-Ahead Market',
        type: 'day_ahead',
        status: 'open',
        clearingPrice: 45.50,
        volume: 1250.5,
        timestamp: new Date(),
      },
      {
        id: 'real_time_rtm',
        name: 'Real-Time Market',
        type: 'real_time',
        status: 'open',
        clearingPrice: 47.25,
        volume: 890.2,
        timestamp: new Date(),
      },
      {
        id: 'ancillary_sr',
        name: 'Ancillary Services',
        type: 'ancillary',
        status: 'open',
        clearingPrice: 12.75,
        volume: 450.8,
        timestamp: new Date(),
      },
      {
        id: 'capacity_cm',
        name: 'Capacity Market',
        type: 'capacity',
        status: 'open',
        clearingPrice: 5.50,
        volume: 320.1,
        timestamp: new Date(),
      },
    ];

    markets.forEach(market => this.markets.set(market.id, market));
    this.logger.log(`Initialized ${markets.length} energy markets`);
  }

  private initializeTradingStrategies(): void {
    const strategies: BiddingStrategy[] = [
      {
        name: 'conservative',
        description: 'Low risk, steady returns strategy',
        riskTolerance: 'low',
        expectedReturn: 0.05,
        implementation: [
          'Bid below market forecast',
          'Limit exposure to 20% of capacity',
          'Use firm contracts only',
        ],
      },
      {
        name: 'balanced',
        description: 'Moderate risk and return strategy',
        riskTolerance: 'medium',
        expectedReturn: 0.12,
        implementation: [
          'Bid at market forecast',
          'Diversify across markets',
          'Mix firm and flexible contracts',
        ],
      },
      {
        name: 'aggressive',
        description: 'High risk, high return strategy',
        riskTolerance: 'high',
        expectedReturn: 0.20,
        implementation: [
          'Bid above market forecast',
          'Maximize market participation',
          'Use flexible and interruptible contracts',
        ],
      },
      {
        name: 'optimal',
        description: 'AI-driven optimal bidding strategy',
        riskTolerance: 'medium',
        expectedReturn: 0.15,
        implementation: [
          'Machine learning price prediction',
          'Dynamic risk adjustment',
          'Multi-market optimization',
        ],
      },
    ];

    strategies.forEach(strategy => this.tradingStrategies.set(strategy.name, strategy));
    this.logger.log(`Initialized ${strategies.length} trading strategies`);
  }

  private async calculateOptimalBidPrice(
    marketId: string,
    quantity: number,
    strategy: BiddingStrategy
  ): Promise<number> {
    const market = this.markets.get(marketId);
    const forecast = await this.getMarketForecast(marketId, 1);
    const basePrice = forecast[0]?.predictedPrice || market.clearingPrice;

    let priceAdjustment = 0;

    switch (strategy.riskTolerance) {
      case 'low':
        priceAdjustment = -0.05; // 5% below forecast
        break;
      case 'medium':
        priceAdjustment = 0; // At forecast
        break;
      case 'high':
        priceAdjustment = 0.08; // 8% above forecast
        break;
    }

    // Apply market-specific adjustments
    const marketMultiplier = this.getMarketMultiplier(market.type);
    
    return basePrice * (1 + priceAdjustment) * marketMultiplier;
  }

  private getMarketMultiplier(marketType: string): number {
    switch (marketType) {
      case 'day_ahead': return 1.0;
      case 'real_time': return 1.05;
      case 'ancillary': return 0.85;
      case 'capacity': return 0.75;
      default: return 1.0;
    }
  }

  private async assessTradingRisk(
    marketId: string,
    quantity: number,
    price: number
  ): Promise<string> {
    const market = this.markets.get(marketId);
    const volatility = await this.calculateVolatilityIndex(marketId, new Date());
    
    // Simple risk assessment
    const priceRisk = Math.abs(price - market.clearingPrice) / market.clearingPrice;
    const volumeRisk = Math.abs(quantity) / market.volume;
    
    const totalRisk = priceRisk + volumeRisk + volatility;
    
    if (totalRisk < 0.2) return 'low';
    if (totalRisk < 0.5) return 'medium';
    return 'high';
  }

  private async submitOrderToMarket(order: TradingOrder): Promise<void> {
    // Simulate order submission
    const market = this.markets.get(order.marketId);
    if (!market) return;

    // Simulate order matching
    setTimeout(async () => {
      const isMatched = Math.random() > 0.2; // 80% chance of matching
      
      if (isMatched) {
        order.status = 'matched';
        order.executionTime = new Date();
        
        // Simulate settlement
        setTimeout(() => {
          order.status = 'executed';
          order.settlementPrice = market.clearingPrice + (Math.random() - 0.5) * 5;
          this.logger.log(`Order executed: ${order.id} at $${order.settlementPrice}/MWh`);
        }, 5000);
      } else {
        order.status = 'cancelled';
        this.logger.log(`Order cancelled: ${order.id}`);
      }
    }, Math.random() * 10000 + 5000);
  }

  private async selectOptimalStrategy(
    marketId: string,
    forecast: MarketForecast[]
  ): Promise<string> {
    // Simple strategy selection based on market conditions
    const latestForecast = forecast[0];
    if (!latestForecast) return 'balanced';

    if (latestForecast.volatilityIndex > 0.7) {
      return 'conservative';
    } else if (latestForecast.volatilityIndex < 0.3) {
      return 'aggressive';
    } else {
      return 'optimal';
    }
  }

  private async generateTradingRecommendation(
    marketId: string,
    strategy: BiddingStrategy,
    forecast: MarketForecast[]
  ): Promise<TradingOrder | null> {
    const latestForecast = forecast[0];
    if (!latestForecast) return null;

    const market = this.markets.get(marketId);
    if (!market) return null;

    // Calculate recommended quantity based on forecast
    const demandSupplyRatio = latestForecast.demandForecast / latestForecast.supplyForecast;
    let recommendedQuantity = 0;
    let orderType: 'buy' | 'sell' = 'sell';

    if (demandSupplyRatio > 1.1) {
      // High demand - sell energy
      recommendedQuantity = Math.min(100, (demandSupplyRatio - 1) * 500);
      orderType = 'sell';
    } else if (demandSupplyRatio < 0.9) {
      // Low demand - buy energy (for storage)
      recommendedQuantity = Math.min(50, (1 - demandSupplyRatio) * 300);
      orderType = 'buy';
    } else {
      return null; // No trading recommendation
    }

    const price = await this.calculateOptimalBidPrice(marketId, recommendedQuantity, strategy);

    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      marketId,
      type: orderType,
      quantity: recommendedQuantity,
      price,
      duration: 60,
      flexibility: strategy.riskTolerance === 'low' ? 'firm' : 'interruptible',
      status: 'pending',
      timestamp: new Date(),
    };
  }

  private async calculatePortfolioRisk(orders: TradingOrder[]): Promise<number> {
    if (orders.length === 0) return 0;

    let totalRisk = 0;
    
    for (const order of orders) {
      const market = this.markets.get(order.marketId);
      if (!market) continue;

      const priceRisk = Math.abs(order.price - market.clearingPrice) / market.clearingPrice;
      const concentrationRisk = order.quantity / market.volume;
      
      totalRisk += priceRisk * 0.6 + concentrationRisk * 0.4;
    }

    return totalRisk / orders.length;
  }

  private async calculateOptimalOrderSize(
    marketId: string,
    strategy: BiddingStrategy,
    budget: number,
    durationHours: number
  ): Promise<number> {
    const market = this.markets.get(marketId);
    if (!market) return 0;

    const forecast = await this.getMarketForecast(marketId, 1);
    const expectedPrice = forecast[0]?.predictedPrice || market.clearingPrice;

    // Calculate order size based on strategy and budget
    let orderSize = 0;
    
    switch (strategy.riskTolerance) {
      case 'low':
        orderSize = Math.min(budget / expectedPrice, market.volume * 0.1);
        break;
      case 'medium':
        orderSize = Math.min(budget / expectedPrice, market.volume * 0.25);
        break;
      case 'high':
        orderSize = Math.min(budget / expectedPrice, market.volume * 0.4);
        break;
    }

    return Math.max(0, orderSize);
  }

  private async calculateStrategyPerformance(
    strategyName: string,
    orders: TradingOrder[]
  ): Promise<any> {
    const executedOrders = orders.filter(order => order.status === 'executed');
    
    if (executedOrders.length === 0) {
      return {
        totalReturn: 0,
        averagePrice: 0,
        successRate: 0,
        riskAdjustedReturn: 0,
      };
    }

    const totalReturn = executedOrders.reduce((sum, order) => {
      const settlementPrice = order.settlementPrice || order.price;
      return sum + (order.quantity * settlementPrice * 0.001);
    }, 0);

    const averagePrice = executedOrders.reduce((sum, order) => sum + (order.settlementPrice || order.price), 0) / executedOrders.length;
    const successRate = executedOrders.length / orders.length;
    
    // Calculate risk-adjusted return (simplified Sharpe ratio)
    const returns = executedOrders.map(order => {
      const settlementPrice = order.settlementPrice || order.price;
      return (settlementPrice - order.price) / order.price;
    });
    const averageReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const returnVariance = returns.reduce((sum, r) => sum + Math.pow(r - averageReturn, 2), 0) / returns.length;
    const riskAdjustedReturn = averageReturn / (Math.sqrt(returnVariance) || 0.01);

    return {
      totalReturn,
      averagePrice,
      successRate,
      riskAdjustedReturn,
    };
  }

  private async calculateTradingSavings(executedOrders: TradingOrder[]): Promise<number> {
    // Calculate savings compared to baseline market price
    const baselinePrice = 50.0; // Baseline market price
    let totalSavings = 0;

    for (const order of executedOrders) {
      const settlementPrice = order.settlementPrice || order.price;
      const savings = (baselinePrice - settlementPrice) * order.quantity * 0.001;
      totalSavings += Math.max(0, savings);
    }

    return totalSavings;
  }

  private async calculateMarketParticipationRate(): Promise<number> {
    const totalMarkets = this.markets.size;
    const activeMarkets = Array.from(this.markets.values())
      .filter(market => market.status === 'open').length;
    
    return totalMarkets > 0 ? activeMarkets / totalMarkets : 0;
  }

  private async predictMarketPrice(marketId: string, timestamp: Date): Promise<number> {
    const market = this.markets.get(marketId);
    if (!market) return market.clearingPrice;

    // Simple price prediction based on time and historical patterns
    const hour = timestamp.getHours();
    const basePrice = market.clearingPrice;
    
    // Add time-based adjustments
    let timeMultiplier = 1.0;
    if (hour >= 18 && hour <= 22) timeMultiplier = 1.2; // Peak hours
    else if (hour >= 6 && hour <= 10) timeMultiplier = 1.1; // Morning peak
    else if (hour >= 0 && hour <= 5) timeMultiplier = 0.8; // Off-peak
    
    // Add some randomness for simulation
    const randomFactor = 0.95 + Math.random() * 0.1;
    
    return basePrice * timeMultiplier * randomFactor;
  }

  private async predictDemand(marketId: string, timestamp: Date): Promise<number> {
    const hour = timestamp.getHours();
    const baseDemand = 1000;
    
    if (hour >= 18 && hour <= 22) return baseDemand * 1.4;
    if (hour >= 6 && hour <= 10) return baseDemand * 1.2;
    if (hour >= 0 && hour <= 5) return baseDemand * 0.6;
    
    return baseDemand;
  }

  private async predictSupply(marketId: string, timestamp: Date): Promise<number> {
    const hour = timestamp.getHours();
    const baseSupply = 1200;
    
    if (hour >= 10 && hour <= 15) return baseSupply * 1.3; // Solar peak
    if (hour >= 0 && hour <= 5) return baseSupply * 0.4;
    
    return baseSupply;
  }

  private async calculateVolatilityIndex(marketId: string, timestamp: Date): Promise<number> {
    // Simulate volatility calculation
    const hour = timestamp.getHours();
    const baseVolatility = 0.3;
    
    // Higher volatility during peak hours
    if (hour >= 17 && hour <= 21) return baseVolatility * 1.5;
    if (hour >= 6 && hour <= 9) return baseVolatility * 1.2;
    
    return baseVolatility;
  }

  @Interval(30000)
  async updateMarketData(): Promise<void> {
    for (const [marketId, market] of this.markets) {
      // Update market prices and volumes
      const priceChange = (Math.random() - 0.5) * 2;
      const volumeChange = (Math.random() - 0.5) * 50;
      
      market.clearingPrice = Math.max(1, market.clearingPrice + priceChange);
      market.volume = Math.max(0, market.volume + volumeChange);
      market.timestamp = new Date();
      
      // Store historical data
      if (!this.marketData.has(marketId)) {
        this.marketData.set(marketId, {
          priceHistory: [],
          volumeHistory: [],
          timestamps: [],
        });
      }
      
      const data = this.marketData.get(marketId)!;
      data.priceHistory.push(market.clearingPrice);
      data.volumeHistory.push(market.volume);
      data.timestamps.push(new Date());
      
      // Keep only last 1000 data points
      if (data.priceHistory.length > 1000) {
        data.priceHistory.shift();
        data.volumeHistory.shift();
        data.timestamps.shift();
      }
    }
  }

  @Cron('*/5 * * * *')
  async processPendingOrders(): Promise<void> {
    const pendingOrders = Array.from(this.orders.values())
      .filter(order => order.status === 'pending');
    
    for (const order of pendingOrders) {
      // Simulate order processing
      const processingTime = Math.random() * 30000 + 10000; // 10-40 seconds
      
      setTimeout(async () => {
        const isMatched = Math.random() > 0.15; // 85% chance of matching
        
        if (isMatched) {
          order.status = 'matched';
          order.executionTime = new Date();
          
          // Execute after 5 seconds
          setTimeout(() => {
            order.status = 'executed';
            const market = this.markets.get(order.marketId);
            order.settlementPrice = market?.clearingPrice || order.price;
            
            this.logger.log(`Order executed: ${order.id} - ${order.quantity}MWh at $${order.settlementPrice}/MWh`);
          }, 5000);
        } else {
          order.status = 'cancelled';
          this.logger.log(`Order cancelled: ${order.id}`);
        }
      }, processingTime);
    }
  }

  @Cron('0 0 * * *')
  async generateDailyTradingReport(): Promise<void> {
    const metrics = await this.getTradingMetrics();
    
    this.logger.log(`Daily Trading Report:
    - Total Orders: ${metrics.totalOrders}
    - Executed Orders: ${metrics.executedOrders}
    - Success Rate: ${(metrics.successRate * 100).toFixed(1)}%
    - Average Price: $${metrics.averagePrice.toFixed(2)}/MWh
    - Total Volume: ${metrics.totalVolume.toFixed(1)} MWh
    - Total Revenue: $${metrics.revenue.toFixed(2)}
    - Total Savings: $${metrics.savings.toFixed(2)}
    - Market Participation: ${(metrics.marketParticipation * 100).toFixed(1)}%
    `);
  }
}

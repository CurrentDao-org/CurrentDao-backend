import { Injectable } from '@nestjs/common';
import { CombinedForecast, ForecastData } from '../forecasting.service';

export interface TradingSignal {
  id: string;
  type: 'buy' | 'sell' | 'hold';
  confidence: number;
  timestamp: string;
  horizon: number;
  price: number;
  quantity: number;
  reason: string;
  risk: 'low' | 'medium' | 'high';
  expectedReturn: number;
  stopLoss: number;
  takeProfit: number;
  metadata: {
    forecastAccuracy: number;
    marketConditions: string;
    weatherImpact: number;
  };
}

export interface TradingStrategy {
  name: string;
  description: string;
  signals: TradingSignal[];
  performance: {
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
  parameters: Record<string, any>;
}

@Injectable()
export class TradingIntegrationService {
  private readonly strategies: Map<string, TradingStrategy> = new Map();
  private readonly signalHistory: TradingSignal[] = [];

  constructor() {
    this.initializeStrategies();
  }

  async generateSignals(forecast: CombinedForecast, minConfidence: number): Promise<TradingSignal[]> {
    const signals: TradingSignal[] = [];
    
    // Analyze supply-demand balance
    const balanceSignals = this.analyzeBalanceSignals(forecast, minConfidence);
    signals.push(...balanceSignals);
    
    // Analyze weather-based opportunities
    const weatherSignals = this.analyzeWeatherSignals(forecast, minConfidence);
    signals.push(...weatherSignals);
    
    // Analyze price arbitrage opportunities
    const arbitrageSignals = this.analyzeArbitrageSignals(forecast, minConfidence);
    signals.push(...arbitrageSignals);
    
    // Filter by confidence threshold
    const filteredSignals = signals.filter(signal => signal.confidence >= minConfidence);
    
    // Store signals for tracking
    this.signalHistory.push(...filteredSignals);
    
    // Keep only last 1000 signals
    if (this.signalHistory.length > 1000) {
      this.signalHistory.splice(0, 200);
    }
    
    return filteredSignals;
  }

  async executeSignal(signal: TradingSignal): Promise<any> {
    try {
      // In a real implementation, this would integrate with trading APIs
      const execution = {
        signalId: signal.id,
        status: 'executed',
        timestamp: new Date().toISOString(),
        price: signal.price,
        quantity: signal.quantity,
        type: signal.type,
        expectedCost: signal.price * signal.quantity,
        risk: signal.risk,
      };
      
      return execution;
    } catch (error) {
      throw new Error(`Failed to execute trading signal: ${error.message}`);
    }
  }

  async getSignalPerformance(signalId: string): Promise<any> {
    const signal = this.signalHistory.find(s => s.id === signalId);
    if (!signal) {
      throw new Error('Signal not found');
    }
    
    // Simulate performance calculation
    const currentPrice = this.getCurrentPrice();
    const priceChange = (currentPrice - signal.price) / signal.price;
    const returnValue = signal.quantity * signal.price * priceChange;
    
    return {
      signalId,
      currentPrice,
      priceChange: Math.round(priceChange * 10000) / 100, // As percentage
      returnValue: Math.round(returnValue * 100) / 100,
      performance: returnValue > 0 ? 'profit' : 'loss',
      timestamp: new Date().toISOString(),
    };
  }

  async getStrategyPerformance(strategyName?: string): Promise<TradingStrategy[]> {
    if (strategyName) {
      const strategy = this.strategies.get(strategyName);
      return strategy ? [strategy] : [];
    }
    
    return Array.from(this.strategies.values());
  }

  async createCustomStrategy(parameters: Record<string, any>): Promise<TradingStrategy> {
    const strategy: TradingStrategy = {
      name: `custom_${Date.now()}`,
      description: 'Custom trading strategy',
      signals: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      },
      parameters,
    };
    
    this.strategies.set(strategy.name, strategy);
    return strategy;
  }

  private analyzeBalanceSignals(forecast: CombinedForecast, minConfidence: number): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    for (let i = 0; i < forecast.balance.length; i++) {
      const balance = forecast.balance[i];
      const nextBalance = forecast.balance[i + 1];
      
      if (!nextBalance) continue;
      
      // Detect supply shortage (negative balance)
      if (balance.value < -50 && nextBalance.value < balance.value) {
        signals.push(this.createSignal({
          type: 'buy',
          confidence: Math.min(0.95, forecast.confidence + 0.1),
          reason: 'Supply shortage detected - prices likely to rise',
          risk: 'medium',
          expectedReturn: 0.08, // 8% expected return
          timestamp: balance.timestamp,
          horizon: 4, // 4 hours
          price: this.getCurrentPrice() * 1.02, // 2% premium
          quantity: Math.abs(balance.value) / 10, // Scale with shortage
          forecastAccuracy: forecast.confidence,
          marketConditions: 'supply_constrained',
          weatherImpact: forecast.demand.weatherImpact,
        }));
      }
      
      // Detect supply surplus (positive balance)
      if (balance.value > 50 && nextBalance.value > balance.value) {
        signals.push(this.createSignal({
          type: 'sell',
          confidence: Math.min(0.95, forecast.confidence + 0.1),
          reason: 'Supply surplus detected - prices likely to fall',
          risk: 'medium',
          expectedReturn: 0.06, // 6% expected return
          timestamp: balance.timestamp,
          horizon: 4, // 4 hours
          price: this.getCurrentPrice() * 0.98, // 2% discount
          quantity: balance.value / 10, // Scale with surplus
          forecastAccuracy: forecast.confidence,
          marketConditions: 'supply_excess',
          weatherImpact: forecast.demand.weatherImpact,
        }));
      }
    }
    
    return signals.filter(s => s.confidence >= minConfidence);
  }

  private analyzeWeatherSignals(forecast: CombinedForecast, minConfidence: number): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    // High weather impact creates trading opportunities
    if (forecast.demand.weatherImpact > 0.3) {
      signals.push(this.createSignal({
        type: 'buy',
        confidence: forecast.confidence * 0.8,
        reason: 'High weather impact expected - increased demand volatility',
        risk: 'high',
        expectedReturn: 0.12, // 12% expected return
        timestamp: forecast.demand.forecasts[0]?.timestamp || new Date().toISOString(),
        horizon: 6, // 6 hours
        price: this.getCurrentPrice() * 1.03, // 3% premium
        quantity: 100, // Standard quantity
        forecastAccuracy: forecast.confidence,
        marketConditions: 'weather_driven',
        weatherImpact: forecast.demand.weatherImpact,
      }));
    }
    
    // Low weather impact - stable conditions
    if (forecast.demand.weatherImpact < 0.1 && forecast.confidence > 0.9) {
      signals.push(this.createSignal({
        type: 'hold',
        confidence: forecast.confidence,
        reason: 'Stable weather conditions - low volatility expected',
        risk: 'low',
        expectedReturn: 0.02, // 2% expected return
        timestamp: forecast.demand.forecasts[0]?.timestamp || new Date().toISOString(),
        horizon: 12, // 12 hours
        price: this.getCurrentPrice(),
        quantity: 50, // Smaller quantity for hold strategy
        forecastAccuracy: forecast.confidence,
        marketConditions: 'stable',
        weatherImpact: forecast.demand.weatherImpact,
      }));
    }
    
    return signals.filter(s => s.confidence >= minConfidence);
  }

  private analyzeArbitrageSignals(forecast: CombinedForecast, minConfidence: number): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    // Look for arbitrage opportunities between different supply sources
    const renewableSupply = forecast.supply.filter(s => ['solar', 'wind'].includes(s.source));
    const baseloadSupply = forecast.supply.filter(s => ['nuclear', 'fossil'].includes(s.source));
    
    if (renewableSupply.length > 0 && baseloadSupply.length > 0) {
      const avgRenewable = renewableSupply.reduce((sum, s) => sum + s.forecasts[0]?.value || 0, 0) / renewableSupply.length;
      const avgBaseload = baseloadSupply.reduce((sum, s) => sum + s.forecasts[0]?.value || 0, 0) / baseloadSupply.length;
      
      // If renewable supply is significantly higher than baseload
      if (avgRenewable > avgBaseload * 1.2) {
        signals.push(this.createSignal({
          type: 'sell',
          confidence: forecast.confidence * 0.9,
          reason: 'Renewable supply surplus - arbitrage opportunity',
          risk: 'low',
          expectedReturn: 0.04, // 4% expected return
          timestamp: forecast.demand.forecasts[0]?.timestamp || new Date().toISOString(),
          horizon: 3, // 3 hours
          price: this.getCurrentPrice() * 0.99, // 1% discount
          quantity: Math.abs(avgRenewable - avgBaseload) / 20,
          forecastAccuracy: forecast.confidence,
          marketConditions: 'arbitrage',
          weatherImpact: forecast.demand.weatherImpact,
        }));
      }
    }
    
    return signals.filter(s => s.confidence >= minConfidence);
  }

  private createSignal(data: any): TradingSignal {
    return {
      id: this.generateSignalId(),
      type: data.type,
      confidence: data.confidence,
      timestamp: data.timestamp,
      horizon: data.horizon,
      price: data.price,
      quantity: Math.round(data.quantity),
      reason: data.reason,
      risk: data.risk,
      expectedReturn: data.expectedReturn,
      stopLoss: data.price * (data.type === 'buy' ? 0.95 : 1.05), // 5% stop loss
      takeProfit: data.price * (data.type === 'buy' ? 1.10 : 0.90), // 10% take profit
      metadata: {
        forecastAccuracy: data.forecastAccuracy,
        marketConditions: data.marketConditions,
        weatherImpact: data.weatherImpact,
      },
    };
  }

  private getCurrentPrice(): number {
    // Simulate current market price (in $/MWh)
    return 50 + Math.random() * 20; // $50-70 per MWh
  }

  private generateSignalId(): string {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeStrategies(): void {
    // Initialize some default trading strategies
    const strategies = [
      {
        name: 'momentum',
        description: 'Follow market trends based on forecast changes',
        parameters: { lookbackPeriod: 4, threshold: 0.05 },
      },
      {
        name: 'mean_reversion',
        description: 'Bet on price corrections to historical averages',
        parameters: { lookbackPeriod: 24, threshold: 0.1 },
      },
      {
        name: 'weather_based',
        description: 'Trade based on weather forecast impacts',
        parameters: { weatherThreshold: 0.2, confidenceThreshold: 0.8 },
      },
    ];
    
    strategies.forEach(strategy => {
      this.strategies.set(strategy.name, {
        ...strategy,
        signals: [],
        performance: {
          totalReturn: Math.random() * 0.2 - 0.05, // -5% to 15% returns
          winRate: 0.45 + Math.random() * 0.3, // 45-75% win rate
          sharpeRatio: Math.random() * 2, // 0-2 Sharpe ratio
          maxDrawdown: Math.random() * 0.1, // 0-10% max drawdown
        },
      });
    });
  }
}

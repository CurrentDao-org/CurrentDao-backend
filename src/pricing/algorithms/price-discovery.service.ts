import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceHistory } from '../entities/price-history.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface MarketData {
  timestamp: number;
  price: number;
  volume: number;
  bid: number;
  ask: number;
  spread: number;
  liquidity: number;
}

export interface PriceDiscoveryResult {
  discoveredPrice: number;
  confidence: number;
  liquidityScore: number;
  volatilityIndex: number;
  marketDepth: number;
  timestamp: number;
  algorithm: string;
}

@Injectable()
export class PriceDiscoveryService {
  private readonly logger = new Logger(PriceDiscoveryService.name);
  private readonly MAX_LATENCY_MS = 100;
  private marketDataBuffer: MarketData[] = [];
  private readonly BUFFER_SIZE = 1000;

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  async discoverRealTimePrice(
    marketData: MarketData[],
    energyType: string,
    location: string,
  ): Promise<PriceDiscoveryResult> {
    const startTime = Date.now();

    // Add new data to buffer
    this.marketDataBuffer.push(...marketData.slice(-50));
    if (this.marketDataBuffer.length > this.BUFFER_SIZE) {
      this.marketDataBuffer = this.marketDataBuffer.slice(-this.BUFFER_SIZE);
    }

    // Weighted Average Price (VWAP) algorithm
    const vwapResult = this.calculateVWAP();
    
    // Time-Weighted Average Price (TWAP) algorithm
    const twapResult = this.calculateTWAP();
    
    // Order Book Imbalance algorithm
    const orderBookResult = this.calculateOrderBookImbalance();
    
    // Liquidity-Weighted Price algorithm
    const liquidityResult = this.calculateLiquidityWeightedPrice();

    // Ensemble method combining all algorithms
    const finalResult = this.ensemblePriceDiscovery([
      vwapResult,
      twapResult,
      orderBookResult,
      liquidityResult,
    ]);

    // Ensure latency requirement
    const latency = Date.now() - startTime;
    if (latency > this.MAX_LATENCY_MS) {
      this.logger.warn(`Price discovery latency exceeded: ${latency}ms`);
    }

    this.logger.log(
      `Price discovered for ${energyType} in ${location}: $${finalResult.discoveredPrice} (${finalResult.confidence}% confidence)`,
    );

    return finalResult;
  }

  private calculateVWAP(): PriceDiscoveryResult {
    if (this.marketDataBuffer.length === 0) {
      return this.getDefaultResult();
    }

    let totalValue = 0;
    let totalVolume = 0;
    let totalLiquidity = 0;

    for (const data of this.marketDataBuffer) {
      totalValue += data.price * data.volume;
      totalVolume += data.volume;
      totalLiquidity += data.liquidity;
    }

    const vwap = totalValue / totalVolume;
    const avgLiquidity = totalLiquidity / this.marketDataBuffer.length;
    
    return {
      discoveredPrice: vwap,
      confidence: Math.min(95, avgLiquidity * 10),
      liquidityScore: avgLiquidity,
      volatilityIndex: this.calculateVolatility(),
      marketDepth: this.calculateMarketDepth(),
      timestamp: Date.now(),
      algorithm: 'VWAP',
    };
  }

  private calculateTWAP(): PriceDiscoveryResult {
    if (this.marketDataBuffer.length === 0) {
      return this.getDefaultResult();
    }

    let totalPrice = 0;
    let totalLiquidity = 0;

    for (const data of this.marketDataBuffer) {
      totalPrice += data.price;
      totalLiquidity += data.liquidity;
    }

    const twap = totalPrice / this.marketDataBuffer.length;
    const avgLiquidity = totalLiquidity / this.marketDataBuffer.length;

    return {
      discoveredPrice: twap,
      confidence: Math.min(90, avgLiquidity * 8),
      liquidityScore: avgLiquidity,
      volatilityIndex: this.calculateVolatility(),
      marketDepth: this.calculateMarketDepth(),
      timestamp: Date.now(),
      algorithm: 'TWAP',
    };
  }

  private calculateOrderBookImbalance(): PriceDiscoveryResult {
    if (this.marketDataBuffer.length === 0) {
      return this.getDefaultResult();
    }

    let totalBid = 0;
    let totalAsk = 0;
    let totalPrice = 0;
    let count = 0;

    for (const data of this.marketDataBuffer) {
      totalBid += data.bid;
      totalAsk += data.ask;
      totalPrice += (data.bid + data.ask) / 2;
      count++;
    }

    const avgBid = totalBid / count;
    const avgAsk = totalAsk / count;
    const midPrice = totalPrice / count;
    
    // Calculate imbalance
    const imbalance = (avgAsk - avgBid) / midPrice;
    const adjustmentFactor = 1 - (imbalance * 0.1); // Adjust price based on imbalance
    
    const adjustedPrice = midPrice * adjustmentFactor;

    return {
      discoveredPrice: adjustedPrice,
      confidence: Math.min(92, 100 - Math.abs(imbalance) * 500),
      liquidityScore: this.calculateAverageLiquidity(),
      volatilityIndex: this.calculateVolatility(),
      marketDepth: this.calculateMarketDepth(),
      timestamp: Date.now(),
      algorithm: 'OrderBookImbalance',
    };
  }

  private calculateLiquidityWeightedPrice(): PriceDiscoveryResult {
    if (this.marketDataBuffer.length === 0) {
      return this.getDefaultResult();
    }

    let weightedPrice = 0;
    let totalWeight = 0;

    for (const data of this.marketDataBuffer) {
      const weight = data.liquidity * data.volume;
      weightedPrice += data.price * weight;
      totalWeight += weight;
    }

    const liquidityWeightedPrice = weightedPrice / totalWeight;

    return {
      discoveredPrice: liquidityWeightedPrice,
      confidence: Math.min(94, this.calculateAverageLiquidity() * 12),
      liquidityScore: this.calculateAverageLiquidity(),
      volatilityIndex: this.calculateVolatility(),
      marketDepth: this.calculateMarketDepth(),
      timestamp: Date.now(),
      algorithm: 'LiquidityWeighted',
    };
  }

  private ensemblePriceDiscovery(results: PriceDiscoveryResult[]): PriceDiscoveryResult {
    if (results.length === 0) {
      return this.getDefaultResult();
    }

    // Weight by confidence
    let totalWeight = 0;
    let weightedPrice = 0;
    let avgLiquidity = 0;
    let avgVolatility = 0;
    let avgMarketDepth = 0;

    for (const result of results) {
      const weight = result.confidence / 100;
      totalWeight += weight;
      weightedPrice += result.discoveredPrice * weight;
      avgLiquidity += result.liquidityScore;
      avgVolatility += result.volatilityIndex;
      avgMarketDepth += result.marketDepth;
    }

    const finalPrice = weightedPrice / totalWeight;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;

    return {
      discoveredPrice: finalPrice,
      confidence: Math.min(98, avgConfidence * 1.1), // Boost confidence for ensemble
      liquidityScore: avgLiquidity / results.length,
      volatilityIndex: avgVolatility / results.length,
      marketDepth: avgMarketDepth / results.length,
      timestamp: Date.now(),
      algorithm: 'Ensemble',
    };
  }

  private calculateVolatility(): number {
    if (this.marketDataBuffer.length < 2) {
      return 0;
    }

    const prices = this.marketDataBuffer.map(d => d.price);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const variance = prices.reduce((sum, price) => {
      return sum + Math.pow(price - mean, 2);
    }, 0) / prices.length;

    return Math.sqrt(variance);
  }

  private calculateMarketDepth(): number {
    if (this.marketDataBuffer.length === 0) {
      return 0;
    }

    return this.marketDataBuffer.reduce((sum, data) => sum + data.volume, 0);
  }

  private calculateAverageLiquidity(): number {
    if (this.marketDataBuffer.length === 0) {
      return 0;
    }

    return this.marketDataBuffer.reduce((sum, data) => sum + data.liquidity, 0) / this.marketDataBuffer.length;
  }

  private getDefaultResult(): PriceDiscoveryResult {
    return {
      discoveredPrice: 0,
      confidence: 0,
      liquidityScore: 0,
      volatilityIndex: 0,
      marketDepth: 0,
      timestamp: Date.now(),
      algorithm: 'Default',
    };
  }

  // Real-time market data processing
  async processRealTimeMarketData(data: MarketData): Promise<void> {
    this.marketDataBuffer.push(data);
    
    if (this.marketDataBuffer.length > this.BUFFER_SIZE) {
      this.marketDataBuffer.shift();
    }

    // Trigger immediate price discovery if significant price movement
    const recentData = this.marketDataBuffer.slice(-10);
    if (recentData.length >= 2) {
      const priceChange = Math.abs(recentData[recentData.length - 1].price - recentData[0].price) / recentData[0].price;
      
      if (priceChange > 0.02) { // 2% change threshold
        this.logger.log(`Significant price movement detected: ${(priceChange * 100).toFixed(2)}%`);
      }
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async optimizePriceDiscovery(): Promise<void> {
    // Clean old data and optimize algorithms
    if (this.marketDataBuffer.length > this.BUFFER_SIZE * 2) {
      this.marketDataBuffer = this.marketDataBuffer.slice(-this.BUFFER_SIZE);
      this.logger.log('Optimized market data buffer');
    }
  }

  getMarketDataStats(): {
    bufferSize: number;
    avgPrice: number;
    avgVolume: number;
    avgLiquidity: number;
    volatility: number;
  } {
    if (this.marketDataBuffer.length === 0) {
      return {
        bufferSize: 0,
        avgPrice: 0,
        avgVolume: 0,
        avgLiquidity: 0,
        volatility: 0,
      };
    }

    const prices = this.marketDataBuffer.map(d => d.price);
    const volumes = this.marketDataBuffer.map(d => d.volume);
    const liquidities = this.marketDataBuffer.map(d => d.liquidity);

    return {
      bufferSize: this.marketDataBuffer.length,
      avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
      avgVolume: volumes.reduce((sum, v) => sum + v, 0) / volumes.length,
      avgLiquidity: liquidities.reduce((sum, l) => sum + l, 0) / liquidities.length,
      volatility: this.calculateVolatility(),
    };
  }
}

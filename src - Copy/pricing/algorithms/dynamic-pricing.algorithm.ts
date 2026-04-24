import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class DynamicPricingAlgorithm {
  private readonly logger = new Logger(DynamicPricingAlgorithm.name);

  calculateBasePrice(
    supply: number,
    demand: number,
    basePrice?: number,
  ): number {
    if (supply <= 0) {
      this.logger.warn('Supply is zero or negative, using maximum price');
      return 1000;
    }

    if (demand <= 0) {
      this.logger.warn('Demand is zero or negative, using minimum price');
      return 0.01;
    }

    const supplyDemandRatio = supply / demand;

    if (basePrice) {
      return this.applySupplyDemandAdjustment(basePrice, supplyDemandRatio);
    }

    return this.calculateMarketBasedPrice(supplyDemandRatio);
  }

  private applySupplyDemandAdjustment(
    basePrice: number,
    ratio: number,
  ): number {
    if (ratio >= 1.5) {
      return basePrice * 0.7;
    } else if (ratio >= 1.2) {
      return basePrice * 0.85;
    } else if (ratio >= 0.8) {
      return basePrice;
    } else if (ratio >= 0.5) {
      return basePrice * 1.3;
    } else {
      return basePrice * 1.8;
    }
  }

  private calculateMarketBasedPrice(ratio: number): number {
    const marketBasePrice = 50;

    if (ratio >= 2.0) {
      return marketBasePrice * 0.5;
    } else if (ratio >= 1.5) {
      return marketBasePrice * 0.7;
    } else if (ratio >= 1.0) {
      return marketBasePrice;
    } else if (ratio >= 0.7) {
      return marketBasePrice * 1.5;
    } else if (ratio >= 0.4) {
      return marketBasePrice * 2.5;
    } else {
      return marketBasePrice * 4.0;
    }
  }

  calculateVolatilityMultiplier(historicalPrices: number[]): number {
    if (historicalPrices.length < 2) {
      return 1.0;
    }

    const returns = historicalPrices
      .slice(1)
      .map(
        (price, index) =>
          (price - historicalPrices[index]) / historicalPrices[index],
      );

    const meanReturn =
      returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) /
      returns.length;
    const volatility = Math.sqrt(variance);

    return Math.min(Math.max(1.0 + volatility * 10, 0.8), 1.5);
  }

  applyPriceBounds(
    price: number,
    minPrice: number = 0.01,
    maxPrice: number = 1000,
  ): number {
    return Math.max(minPrice, Math.min(maxPrice, price));
  }

  calculateElasticityAdjustment(supply: number, demand: number): number {
    const ratio = supply / demand;

    if (ratio < 0.3) {
      return 1.2;
    } else if (ratio < 0.6) {
      return 1.1;
    } else if (ratio < 0.9) {
      return 1.05;
    } else if (ratio > 1.8) {
      return 0.9;
    } else if (ratio > 1.5) {
      return 0.95;
    } else {
      return 1.0;
    }
  }
}

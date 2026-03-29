import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceHistory } from './entities/price-history.entity';
import {
  CalculatePriceDto,
  PriceHistoryQueryDto,
  PricePredictionDto,
  EnergyType,
} from './dto/calculate-price.dto';
import { DynamicPricingAlgorithm } from './algorithms/dynamic-pricing.algorithm';
import { LocationAdjustmentAlgorithm } from './algorithms/location-adjustment.algorithm';
import { TimePricingAlgorithm } from './algorithms/time-pricing.algorithm';
import { PredictionAlgorithm } from './algorithms/prediction.algorithm';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
    private dynamicPricingAlgorithm: DynamicPricingAlgorithm,
    private locationAdjustmentAlgorithm: LocationAdjustmentAlgorithm,
    private timePricingAlgorithm: TimePricingAlgorithm,
    private predictionAlgorithm: PredictionAlgorithm,
  ) {}

  async calculatePrice(calculatePriceDto: CalculatePriceDto): Promise<{
    basePrice: number;
    finalPrice: number;
    locationMultiplier: number;
    timeMultiplier: number;
    renewablePremium: number;
    supplyDemandRatio: number;
    isPeakHour: boolean;
    predictedPrice?: number;
    predictionAccuracy?: number;
  }> {
    const {
      supply,
      demand,
      location,
      energyType,
      timestamp = Date.now(),
      basePrice,
      includePrediction = false,
      predictionHorizonHours = 1,
    } = calculatePriceDto;

    const supplyDemandRatio = supply / demand;
    const calculatedBasePrice = this.dynamicPricingAlgorithm.calculateBasePrice(
      supply,
      demand,
      basePrice,
    );

    const locationMultiplier =
      this.locationAdjustmentAlgorithm.calculateLocationMultiplier(location);
    const timeMultiplier =
      this.timePricingAlgorithm.calculateTimeMultiplier(timestamp);
    const renewablePremium = this.calculateRenewablePremium(energyType);
    const isPeakHour = this.timePricingAlgorithm.isPeakHour(timestamp);

    let finalPrice = calculatedBasePrice * locationMultiplier * timeMultiplier;

    if (this.isRenewableEnergy(energyType)) {
      finalPrice *= 1 + renewablePremium;
    }

    finalPrice = this.dynamicPricingAlgorithm.applyPriceBounds(finalPrice);

    const result: any = {
      basePrice: Math.round(calculatedBasePrice * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      locationMultiplier: Math.round(locationMultiplier * 100) / 100,
      timeMultiplier: Math.round(timeMultiplier * 100) / 100,
      renewablePremium: Math.round(renewablePremium * 100) / 100,
      supplyDemandRatio: Math.round(supplyDemandRatio * 100) / 100,
      isPeakHour,
    };

    if (includePrediction) {
      const historicalData = await this.getHistoricalData(
        location,
        energyType,
        168,
      );
      const prediction = this.predictionAlgorithm.predictPrice(
        historicalData,
        predictionHorizonHours,
        supply,
        demand,
      );

      result.predictedPrice = Math.round(prediction.predictedPrice * 100) / 100;
      result.predictionAccuracy = Math.round(prediction.confidence * 100);
    }

    await this.savePriceHistory({
      basePrice: calculatedBasePrice,
      finalPrice,
      location,
      energyType,
      supply,
      demand,
      supplyDemandRatio,
      locationMultiplier,
      timeMultiplier,
      renewablePremium,
      predictedPrice: result.predictedPrice,
      predictionAccuracy: result.predictionAccuracy,
      isPeakHour,
      isRenewable: this.isRenewableEnergy(energyType),
      timestamp: new Date(timestamp),
    });

    return result;
  }

  private calculateRenewablePremium(energyType: EnergyType): number {
    const premiums = {
      [EnergyType.SOLAR]: 0.05,
      [EnergyType.WIND]: 0.08,
      [EnergyType.HYDRO]: 0.03,
      [EnergyType.NUCLEAR]: -0.02,
      [EnergyType.FOSSIL]: 0.15,
      [EnergyType.GEOTHERMAL]: 0.04,
    };

    return premiums[energyType] || 0;
  }

  private isRenewableEnergy(energyType: EnergyType): boolean {
    return [
      EnergyType.SOLAR,
      EnergyType.WIND,
      EnergyType.HYDRO,
      EnergyType.GEOTHERMAL,
    ].includes(energyType);
  }

  async predictPrice(predictionDto: PricePredictionDto): Promise<{
    predictedPrice: number;
    confidence: number;
    factors: any;
  }> {
    const { location, energyType, hoursAhead, expectedSupply, expectedDemand } =
      predictionDto;

    const historicalData = await this.getHistoricalData(
      location,
      energyType,
      168,
    );

    const prediction = this.predictionAlgorithm.predictPrice(
      historicalData,
      hoursAhead,
      expectedSupply,
      expectedDemand,
    );

    return {
      predictedPrice: Math.round(prediction.predictedPrice * 100) / 100,
      confidence: Math.round(prediction.confidence * 100) / 100,
      factors: prediction.factors,
    };
  }

  async getPriceHistory(query: PriceHistoryQueryDto): Promise<{
    history: PriceHistory[];
    total: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
  }> {
    const {
      location,
      energyType,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = query;

    const whereClause: any = {};

    if (location) whereClause.location = location;
    if (energyType) whereClause.energyType = energyType;
    if (startDate) whereClause.timestamp = { $gte: new Date(startDate) };
    if (endDate) whereClause.timestamp = { $lte: new Date(endDate) };

    const [history, total] = await this.priceHistoryRepository.findAndCount({
      where: whereClause,
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const prices = history.map((h) => h.finalPrice);
    const averagePrice =
      prices.length > 0
        ? prices.reduce((sum, price) => sum + price, 0) / prices.length
        : 0;
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    return {
      history,
      total,
      averagePrice: Math.round(averagePrice * 100) / 100,
      minPrice: Math.round(minPrice * 100) / 100,
      maxPrice: Math.round(maxPrice * 100) / 100,
    };
  }

  private async getHistoricalData(
    location: string,
    energyType: string,
    hours: number,
  ): Promise<PriceHistory[]> {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    return this.priceHistoryRepository.find({
      where: {
        location,
        energyType,
        timestamp: LessThan(new Date()),
      },
      order: { timestamp: 'DESC' },
      take: 100,
    });
  }

  private async savePriceHistory(
    priceData: Partial<PriceHistory>,
  ): Promise<void> {
    const priceHistory = this.priceHistoryRepository.create(priceData);
    await this.priceHistoryRepository.save(priceHistory);
  }

  async getPricingAnalytics(
    location?: string,
    energyType?: string,
  ): Promise<{
    totalTransactions: number;
    averagePrice: number;
    priceVolatility: number;
    peakHourAverage: number;
    offPeakHourAverage: number;
    renewablePremium: number;
    predictionAccuracy: number;
  }> {
    const whereClause: any = {};
    if (location) whereClause.location = location;
    if (energyType) whereClause.energyType = energyType;

    const history = await this.priceHistoryRepository.find({
      where: whereClause,
      order: { timestamp: 'DESC' },
      take: 1000,
    });

    if (history.length === 0) {
      return {
        totalTransactions: 0,
        averagePrice: 0,
        priceVolatility: 0,
        peakHourAverage: 0,
        offPeakHourAverage: 0,
        renewablePremium: 0,
        predictionAccuracy: 0,
      };
    }

    const prices = history.map((h) => h.finalPrice);
    const averagePrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length;

    const variance =
      prices.reduce(
        (sum, price) => sum + Math.pow(price - averagePrice, 2),
        0,
      ) / prices.length;
    const priceVolatility = Math.sqrt(variance);

    const peakHourPrices = history
      .filter((h) => h.isPeakHour)
      .map((h) => h.finalPrice);
    const offPeakHourPrices = history
      .filter((h) => !h.isPeakHour)
      .map((h) => h.finalPrice);

    const peakHourAverage =
      peakHourPrices.length > 0
        ? peakHourPrices.reduce((sum, price) => sum + price, 0) /
          peakHourPrices.length
        : 0;

    const offPeakHourAverage =
      offPeakHourPrices.length > 0
        ? offPeakHourPrices.reduce((sum, price) => sum + price, 0) /
          offPeakHourPrices.length
        : 0;

    const renewablePrices = history
      .filter((h) => h.isRenewable)
      .map((h) => h.finalPrice);
    const nonRenewablePrices = history
      .filter((h) => !h.isRenewable)
      .map((h) => h.finalPrice);

    const renewableAverage =
      renewablePrices.length > 0
        ? renewablePrices.reduce((sum, price) => sum + price, 0) /
          renewablePrices.length
        : 0;

    const nonRenewableAverage =
      nonRenewablePrices.length > 0
        ? nonRenewablePrices.reduce((sum, price) => sum + price, 0) /
          nonRenewablePrices.length
        : 0;

    const renewablePremium =
      nonRenewableAverage > 0
        ? (renewableAverage - nonRenewableAverage) / nonRenewableAverage
        : 0;

    const predictionsWithAccuracy = history.filter(
      (h) => h.predictionAccuracy !== null,
    );
    const predictionAccuracy =
      predictionsWithAccuracy.length > 0
        ? predictionsWithAccuracy.reduce(
            (sum, h) => sum + h.predictionAccuracy,
            0,
          ) / predictionsWithAccuracy.length
        : 0;

    return {
      totalTransactions: history.length,
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceVolatility: Math.round(priceVolatility * 100) / 100,
      peakHourAverage: Math.round(peakHourAverage * 100) / 100,
      offPeakHourAverage: Math.round(offPeakHourAverage * 100) / 100,
      renewablePremium: Math.round(renewablePremium * 100) / 100,
      predictionAccuracy: Math.round(predictionAccuracy * 100) / 100,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const result = await this.priceHistoryRepository.delete({
      timestamp: LessThan(cutoffDate),
    });

    this.logger.log(`Cleaned up ${result.affected} old price records`);
  }
}

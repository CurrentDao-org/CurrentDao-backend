import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PricingService } from './pricing.service';
import { PriceHistory } from './entities/price-history.entity';
import { DynamicPricingAlgorithm } from './algorithms/dynamic-pricing.algorithm';
import { LocationAdjustmentAlgorithm } from './algorithms/location-adjustment.algorithm';
import { TimePricingAlgorithm } from './algorithms/time-pricing.algorithm';
import { PredictionAlgorithm } from './algorithms/prediction.algorithm';
import { CalculatePriceDto, EnergyType } from './dto/calculate-price.dto';

describe('PricingService', () => {
  let service: PricingService;
  let priceHistoryRepository: Repository<PriceHistory>;
  let dynamicPricingAlgorithm: DynamicPricingAlgorithm;
  let locationAdjustmentAlgorithm: LocationAdjustmentAlgorithm;
  let timePricingAlgorithm: TimePricingAlgorithm;
  let predictionAlgorithm: PredictionAlgorithm;

  const mockPriceHistoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    delete: jest.fn(),
  };

  const mockDynamicPricingAlgorithm = {
    calculateBasePrice: jest.fn(),
    applyPriceBounds: jest.fn(),
  };

  const mockLocationAdjustmentAlgorithm = {
    calculateLocationMultiplier: jest.fn(),
  };

  const mockTimePricingAlgorithm = {
    calculateTimeMultiplier: jest.fn(),
    isPeakHour: jest.fn(),
  };

  const mockPredictionAlgorithm = {
    predictPrice: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        DynamicPricingAlgorithm,
        LocationAdjustmentAlgorithm,
        TimePricingAlgorithm,
        PredictionAlgorithm,
        {
          provide: getRepositoryToken(PriceHistory),
          useValue: mockPriceHistoryRepository,
        },
      ],
    })
      .overrideProvider(DynamicPricingAlgorithm)
      .useValue(mockDynamicPricingAlgorithm)
      .overrideProvider(LocationAdjustmentAlgorithm)
      .useValue(mockLocationAdjustmentAlgorithm)
      .overrideProvider(TimePricingAlgorithm)
      .useValue(mockTimePricingAlgorithm)
      .overrideProvider(PredictionAlgorithm)
      .useValue(mockPredictionAlgorithm)
      .compile();

    service = module.get<PricingService>(PricingService);
    priceHistoryRepository = module.get<Repository<PriceHistory>>(
      getRepositoryToken(PriceHistory),
    );
    dynamicPricingAlgorithm = module.get<DynamicPricingAlgorithm>(
      DynamicPricingAlgorithm,
    );
    locationAdjustmentAlgorithm = module.get<LocationAdjustmentAlgorithm>(
      LocationAdjustmentAlgorithm,
    );
    timePricingAlgorithm =
      module.get<TimePricingAlgorithm>(TimePricingAlgorithm);
    predictionAlgorithm = module.get<PredictionAlgorithm>(PredictionAlgorithm);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePrice', () => {
    it('should calculate price with all factors', async () => {
      const calculatePriceDto: CalculatePriceDto = {
        supply: 1000,
        demand: 800,
        location: 'new-york',
        energyType: EnergyType.SOLAR,
        timestamp: Date.now(),
        includePrediction: false,
      };

      mockDynamicPricingAlgorithm.calculateBasePrice.mockReturnValue(50);
      mockLocationAdjustmentAlgorithm.calculateLocationMultiplier.mockReturnValue(
        1.2,
      );
      mockTimePricingAlgorithm.calculateTimeMultiplier.mockReturnValue(1.1);
      mockTimePricingAlgorithm.isPeakHour.mockReturnValue(false);
      mockDynamicPricingAlgorithm.applyPriceBounds.mockReturnValue(66);

      const result = await service.calculatePrice(calculatePriceDto);

      expect(result).toEqual({
        basePrice: 50,
        finalPrice: 66,
        locationMultiplier: 1.2,
        timeMultiplier: 1.1,
        renewablePremium: 0.05,
        supplyDemandRatio: 1.25,
        isPeakHour: false,
      });

      expect(
        mockDynamicPricingAlgorithm.calculateBasePrice,
      ).toHaveBeenCalledWith(1000, 800, undefined);
      expect(
        mockLocationAdjustmentAlgorithm.calculateLocationMultiplier,
      ).toHaveBeenCalledWith('new-york');
      expect(
        mockTimePricingAlgorithm.calculateTimeMultiplier,
      ).toHaveBeenCalled();
      expect(mockPriceHistoryRepository.create).toHaveBeenCalled();
      expect(mockPriceHistoryRepository.save).toHaveBeenCalled();
    });

    it('should include prediction when requested', async () => {
      const calculatePriceDto: CalculatePriceDto = {
        supply: 1000,
        demand: 800,
        location: 'new-york',
        energyType: EnergyType.SOLAR,
        timestamp: Date.now(),
        includePrediction: true,
        predictionHorizonHours: 2,
      };

      const historicalData = [
        { finalPrice: 60 },
        { finalPrice: 65 },
        { finalPrice: 70 },
      ];

      mockDynamicPricingAlgorithm.calculateBasePrice.mockReturnValue(50);
      mockLocationAdjustmentAlgorithm.calculateLocationMultiplier.mockReturnValue(
        1.2,
      );
      mockTimePricingAlgorithm.calculateTimeMultiplier.mockReturnValue(1.1);
      mockTimePricingAlgorithm.isPeakHour.mockReturnValue(false);
      mockDynamicPricingAlgorithm.applyPriceBounds.mockReturnValue(66);
      mockPriceHistoryRepository.find.mockResolvedValue(historicalData as any);
      mockPredictionAlgorithm.predictPrice.mockReturnValue({
        predictedPrice: 68,
        confidence: 0.85,
        factors: {},
      });

      const result = await service.calculatePrice(calculatePriceDto);

      expect(result.predictedPrice).toBe(68);
      expect(result.predictionAccuracy).toBe(85);
      expect(mockPredictionAlgorithm.predictPrice).toHaveBeenCalledWith(
        historicalData,
        2,
        1000,
        800,
      );
    });
  });

  describe('calculateRenewablePremium', () => {
    it('should return correct premium for solar energy', () => {
      const premium = (service as any).calculateRenewablePremium(
        EnergyType.SOLAR,
      );
      expect(premium).toBe(0.05);
    });

    it('should return correct premium for wind energy', () => {
      const premium = (service as any).calculateRenewablePremium(
        EnergyType.WIND,
      );
      expect(premium).toBe(0.08);
    });

    it('should return negative premium for nuclear energy', () => {
      const premium = (service as any).calculateRenewablePremium(
        EnergyType.NUCLEAR,
      );
      expect(premium).toBe(-0.02);
    });

    it('should return positive premium for fossil fuel', () => {
      const premium = (service as any).calculateRenewablePremium(
        EnergyType.FOSSIL,
      );
      expect(premium).toBe(0.15);
    });
  });

  describe('isRenewableEnergy', () => {
    it('should return true for renewable energy types', () => {
      expect((service as any).isRenewableEnergy(EnergyType.SOLAR)).toBe(true);
      expect((service as any).isRenewableEnergy(EnergyType.WIND)).toBe(true);
      expect((service as any).isRenewableEnergy(EnergyType.HYDRO)).toBe(true);
      expect((service as any).isRenewableEnergy(EnergyType.GEOTHERMAL)).toBe(
        true,
      );
    });

    it('should return false for non-renewable energy types', () => {
      expect((service as any).isRenewableEnergy(EnergyType.NUCLEAR)).toBe(
        false,
      );
      expect((service as any).isRenewableEnergy(EnergyType.FOSSIL)).toBe(false);
    });
  });

  describe('getPriceHistory', () => {
    it('should return price history with statistics', async () => {
      const query = {
        location: 'new-york',
        energyType: EnergyType.SOLAR,
        page: 1,
        limit: 10,
      };

      const history = [
        { finalPrice: 60 },
        { finalPrice: 65 },
        { finalPrice: 70 },
      ];

      mockPriceHistoryRepository.findAndCount.mockResolvedValue([history, 3]);

      const result = await service.getPriceHistory(query);

      expect(result).toEqual({
        history,
        total: 3,
        averagePrice: 65,
        minPrice: 60,
        maxPrice: 70,
      });

      expect(mockPriceHistoryRepository.findAndCount).toHaveBeenCalledWith({
        where: {
          location: 'new-york',
          energyType: EnergyType.SOLAR,
        },
        order: { timestamp: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getPricingAnalytics', () => {
    it('should return pricing analytics', async () => {
      const history = [
        {
          finalPrice: 60,
          isPeakHour: true,
          isRenewable: true,
          predictionAccuracy: 85,
        },
        {
          finalPrice: 65,
          isPeakHour: false,
          isRenewable: false,
          predictionAccuracy: 90,
        },
        {
          finalPrice: 70,
          isPeakHour: true,
          isRenewable: true,
          predictionAccuracy: 80,
        },
      ];

      mockPriceHistoryRepository.find.mockResolvedValue(history as any);

      const result = await service.getPricingAnalytics();

      expect(result.totalTransactions).toBe(3);
      expect(result.averagePrice).toBe(65);
      expect(result.peakHourAverage).toBe(65);
      expect(result.offPeakHourAverage).toBe(65);
      expect(result.predictionAccuracy).toBe(85);
    });

    it('should return zero values when no history exists', async () => {
      mockPriceHistoryRepository.find.mockResolvedValue([]);

      const result = await service.getPricingAnalytics();

      expect(result).toEqual({
        totalTransactions: 0,
        averagePrice: 0,
        priceVolatility: 0,
        peakHourAverage: 0,
        offPeakHourAverage: 0,
        renewablePremium: 0,
        predictionAccuracy: 0,
      });
    });
  });
});

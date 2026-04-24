import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PriceHistory } from './entities/price-history.entity';
import { MarketDataSource } from './entities/market-data-source.entity';
import { PriceForecast } from './entities/price-forecast.entity';

// New Services
import { PriceDiscoveryService } from './algorithms/price-discovery.service';
import { DynamicPricingService } from './algorithms/dynamic-pricing.service';
import { MarketDataService } from './integrations/market-data.service';
import { PricingAnalyticsService } from './analytics/pricing-analytics.service';
import { PriceForecastingService } from './forecasting/price-forecasting.service';
import { GeographicPricingService } from './algorithms/geographic-pricing.service';
import { TimeBasedPricingService } from './algorithms/time-based-pricing.service';
import { TradingEngineService } from './integrations/trading-engine.service';

// Legacy Algorithms (keeping for compatibility)
import { DynamicPricingAlgorithm } from './algorithms/dynamic-pricing.algorithm';
import { LocationAdjustmentAlgorithm } from './algorithms/location-adjustment.algorithm';
import { TimePricingAlgorithm } from './algorithms/time-pricing.algorithm';
import { PredictionAlgorithm } from './algorithms/prediction.algorithm';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceHistory, MarketDataSource, PriceForecast]),
    HttpModule,
    ScheduleModule,
  ],
  controllers: [PricingController],
  providers: [
    // Core Services
    PricingService,
    
    // New Advanced Services
    PriceDiscoveryService,
    DynamicPricingService,
    MarketDataService,
    PricingAnalyticsService,
    PriceForecastingService,
    GeographicPricingService,
    TimeBasedPricingService,
    TradingEngineService,
    
    // Legacy Algorithms (keeping for compatibility)
    DynamicPricingAlgorithm,
    LocationAdjustmentAlgorithm,
    TimePricingAlgorithm,
    PredictionAlgorithm,
  ],
  exports: [
    // Core Services
    PricingService,
    
    // New Advanced Services
    PriceDiscoveryService,
    DynamicPricingService,
    MarketDataService,
    PricingAnalyticsService,
    PriceForecastingService,
    GeographicPricingService,
    TimeBasedPricingService,
    TradingEngineService,
    
    // Legacy Algorithms
    DynamicPricingAlgorithm,
    LocationAdjustmentAlgorithm,
    TimePricingAlgorithm,
    PredictionAlgorithm,
  ],
})
export class PricingModule {}

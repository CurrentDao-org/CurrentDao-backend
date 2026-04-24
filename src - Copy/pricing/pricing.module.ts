import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { PriceHistory } from './entities/price-history.entity';
import { DynamicPricingAlgorithm } from './algorithms/dynamic-pricing.algorithm';
import { LocationAdjustmentAlgorithm } from './algorithms/location-adjustment.algorithm';
import { TimePricingAlgorithm } from './algorithms/time-pricing.algorithm';
import { PredictionAlgorithm } from './algorithms/prediction.algorithm';

@Module({
  imports: [TypeOrmModule.forFeature([PriceHistory])],
  controllers: [PricingController],
  providers: [
    PricingService,
    DynamicPricingAlgorithm,
    LocationAdjustmentAlgorithm,
    TimePricingAlgorithm,
    PredictionAlgorithm,
  ],
  exports: [
    PricingService,
    DynamicPricingAlgorithm,
    LocationAdjustmentAlgorithm,
    TimePricingAlgorithm,
    PredictionAlgorithm,
  ],
})
export class PricingModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { MarketDataEntity } from './entities/market-data.entity';
import { DataSourceService } from './integration/data-source.service';
import { NormalizationService } from './processing/normalization.service';
import { DataQualityService } from './quality/data-quality.service';
import { HistoricalDataService } from './storage/historical-data.service';
import { MarketDataApiService } from './api/market-data-api.service';

@Module({
  imports: [TypeOrmModule.forFeature([MarketDataEntity])],
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    DataSourceService,
    NormalizationService,
    DataQualityService,
    HistoricalDataService,
    MarketDataApiService,
  ],
  exports: [
    MarketDataService,
    DataSourceService,
    NormalizationService,
    DataQualityService,
    HistoricalDataService,
    MarketDataApiService,
  ],
})
export class MarketDataModule {}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { MarketDataEntity } from './entities/market-data.entity';
import { CreateMarketDataDto } from './dto/create-market-data.dto';
import { UpdateMarketDataDto } from './dto/update-market-data.dto';
import { MarketDataQueryDto } from './dto/market-data-query.dto';
import { MarketDataResponseDto } from './dto/market-data-response.dto';
import { DataSourceService } from './integration/data-source.service';
import { NormalizationService } from './processing/normalization.service';
import { DataQualityService } from './quality/data-quality.service';
import { HistoricalDataService } from './storage/historical-data.service';
import { MarketDataApiService } from './api/market-data-api.service';

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);
  private readonly realTimeDataCache = new Map<string, MarketDataResponseDto>();
  private readonly aggregationCache = new Map<string, { data: MarketDataResponseDto[], timestamp: number }>();

  constructor(
    @InjectRepository(MarketDataEntity)
    private readonly marketDataRepository: Repository<MarketDataEntity>,
    private readonly dataSourceService: DataSourceService,
    private readonly normalizationService: NormalizationService,
    private readonly dataQualityService: DataQualityService,
    private readonly historicalDataService: HistoricalDataService,
    private readonly marketDataApiService: MarketDataApiService,
  ) {}

  async onModuleInit() {
    this.logger.log('Market Data Service initialized');
    await this.initializeDataSources();
  }

  private async initializeDataSources() {
    try {
      await this.dataSourceService.initializeAllSources();
      this.logger.log('Data sources initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize data sources:', error);
    }
  }

  async createMarketData(createMarketDataDto: CreateMarketDataDto): Promise<MarketDataResponseDto> {
    try {
      // Normalize incoming data
      const normalizedData = await this.normalizationService.normalizeData(createMarketDataDto);
      
      // Validate data quality
      const qualityResult = await this.dataQualityService.validateData(normalizedData);
      if (!qualityResult.isValid) {
        throw new Error(`Data quality validation failed: ${qualityResult.errors.join(', ')}`);
      }

      // Create entity
      const marketData = this.marketDataRepository.create({
        ...normalizedData,
        qualityScore: qualityResult.score,
        source: createMarketDataDto.source,
        timestamp: new Date(),
      });

      const savedData = await this.marketDataRepository.save(marketData);

      // Update real-time cache
      this.updateRealTimeCache(savedData);

      // Store in historical data
      await this.historicalDataService.storeHistoricalData(savedData);

      this.logger.log(`Market data created for symbol: ${savedData.symbol}`);
      return this.mapToResponseDto(savedData);
    } catch (error) {
      this.logger.error('Error creating market data:', error);
      throw error;
    }
  }

  async getMarketData(query: MarketDataQueryDto): Promise<MarketDataResponseDto[]> {
    try {
      const whereConditions: any = {};

      if (query.symbol) {
        whereConditions.symbol = query.symbol;
      }

      if (query.source) {
        whereConditions.source = query.source;
      }

      if (query.startTime && query.endTime) {
        whereConditions.timestamp = Between(new Date(query.startTime), new Date(query.endTime));
      } else if (query.startTime) {
        whereConditions.timestamp = MoreThan(new Date(query.startTime));
      } else if (query.endTime) {
        whereConditions.timestamp = LessThan(new Date(query.endTime));
      }

      const marketData = await this.marketDataRepository.find({
        where: whereConditions,
        order: { timestamp: 'DESC' },
        take: query.limit || 100,
        skip: query.offset || 0,
      });

      return marketData.map(data => this.mapToResponseDto(data));
    } catch (error) {
      this.logger.error('Error fetching market data:', error);
      throw error;
    }
  }

  async getMarketDataById(id: string): Promise<MarketDataResponseDto> {
    try {
      const marketData = await this.marketDataRepository.findOne({ where: { id } });
      if (!marketData) {
        throw new Error('Market data not found');
      }
      return this.mapToResponseDto(marketData);
    } catch (error) {
      this.logger.error('Error fetching market data by ID:', error);
      throw error;
    }
  }

  async getLatestMarketData(symbol: string): Promise<MarketDataResponseDto> {
    try {
      // Check cache first for real-time data
      const cachedData = this.realTimeDataCache.get(symbol);
      if (cachedData && (Date.now() - cachedData.timestamp.getTime()) < 60000) {
        return cachedData;
      }

      const marketData = await this.marketDataRepository.findOne({
        where: { symbol },
        order: { timestamp: 'DESC' },
      });

      if (!marketData) {
        throw new Error('No market data found for symbol');
      }

      return this.mapToResponseDto(marketData);
    } catch (error) {
      this.logger.error('Error fetching latest market data:', error);
      throw error;
    }
  }

  async getHistoricalMarketData(
    symbol: string,
    period?: string,
    limit?: number,
  ): Promise<MarketDataResponseDto[]> {
    try {
      return this.historicalDataService.getHistoricalData(symbol, period, limit);
    } catch (error) {
      this.logger.error('Error fetching historical market data:', error);
      throw error;
    }
  }

  async updateMarketData(id: string, updateMarketDataDto: UpdateMarketDataDto): Promise<MarketDataResponseDto> {
    try {
      const marketData = await this.marketDataRepository.findOne({ where: { id } });
      if (!marketData) {
        throw new Error('Market data not found');
      }

      // Normalize updated data
      const normalizedData = await this.normalizationService.normalizeData(updateMarketDataDto);
      
      // Validate data quality
      const qualityResult = await this.dataQualityService.validateData(normalizedData);
      if (!qualityResult.isValid) {
        throw new Error(`Data quality validation failed: ${qualityResult.errors.join(', ')}`);
      }

      Object.assign(marketData, normalizedData, {
        qualityScore: qualityResult.score,
        updatedAt: new Date(),
      });

      const updatedData = await this.marketDataRepository.save(marketData);
      this.updateRealTimeCache(updatedData);

      return this.mapToResponseDto(updatedData);
    } catch (error) {
      this.logger.error('Error updating market data:', error);
      throw error;
    }
  }

  async deleteMarketData(id: string): Promise<void> {
    try {
      const result = await this.marketDataRepository.delete(id);
      if (result.affected === 0) {
        throw new Error('Market data not found');
      }
      this.logger.log(`Market data deleted: ${id}`);
    } catch (error) {
      this.logger.error('Error deleting market data:', error);
      throw error;
    }
  }

  async aggregateMarketData(symbols: string[]): Promise<MarketDataResponseDto[]> {
    try {
      const cacheKey = symbols.sort().join(',');
      const cached = this.aggregationCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < 30000) {
        return cached.data;
      }

      const aggregatedData = await this.dataSourceService.aggregateFromMultipleSources(symbols);
      
      // Normalize and validate aggregated data
      const normalizedData = await Promise.all(
        aggregatedData.map(data => this.normalizationService.normalizeData(data))
      );

      const validatedData = await Promise.all(
        normalizedData.map(data => this.dataQualityService.validateData(data))
      );

      const finalData = validatedData
        .filter(result => result.isValid)
        .map(result => this.mapToResponseDto(result.data));

      // Cache the result
      this.aggregationCache.set(cacheKey, {
        data: finalData,
        timestamp: Date.now(),
      });

      return finalData;
    } catch (error) {
      this.logger.error('Error aggregating market data:', error);
      throw error;
    }
  }

  async getQualityReports(): Promise<any> {
    try {
      return this.dataQualityService.generateQualityReports();
    } catch (error) {
      this.logger.error('Error generating quality reports:', error);
      throw error;
    }
  }

  async getDataSourcesStatus(): Promise<any> {
    try {
      return this.dataSourceService.getAllSourcesStatus();
    } catch (error) {
      this.logger.error('Error getting data sources status:', error);
      throw error;
    }
  }

  async triggerRealTimeSync(symbols: string[]): Promise<any> {
    try {
      return this.marketDataApiService.triggerRealTimeSync(symbols);
    } catch (error) {
      this.logger.error('Error triggering real-time sync:', error);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async updateRealTimeData() {
    try {
      const activeSymbols = await this.getActiveSymbols();
      const realTimeData = await this.dataSourceService.fetchRealTimeData(activeSymbols);
      
      for (const data of realTimeData) {
        const normalizedData = await this.normalizationService.normalizeData(data);
        const qualityResult = await this.dataQualityService.validateData(normalizedData);
        
        if (qualityResult.isValid) {
          const marketData = this.marketDataRepository.create({
            ...normalizedData,
            qualityScore: qualityResult.score,
            timestamp: new Date(),
          });

          await this.marketDataRepository.save(marketData);
          this.updateRealTimeCache(marketData);
        }
      }

      this.logger.debug(`Real-time data updated for ${activeSymbols.length} symbols`);
    } catch (error) {
      this.logger.error('Error updating real-time data:', error);
    }
  }

  private updateRealTimeCache(marketData: MarketDataEntity) {
    this.realTimeDataCache.set(marketData.symbol, this.mapToResponseDto(marketData));
  }

  private async getActiveSymbols(): Promise<string[]> {
    const result = await this.marketDataRepository
      .createQueryBuilder('marketData')
      .select('DISTINCT marketData.symbol', 'symbol')
      .getRawMany();
    
    return result.map(row => row.symbol);
  }

  private mapToResponseDto(marketData: MarketDataEntity): MarketDataResponseDto {
    return {
      id: marketData.id,
      symbol: marketData.symbol,
      price: marketData.price,
      volume: marketData.volume,
      timestamp: marketData.timestamp,
      source: marketData.source,
      qualityScore: marketData.qualityScore,
      high: marketData.high,
      low: marketData.low,
      open: marketData.open,
      close: marketData.close,
      bid: marketData.bid,
      ask: marketData.ask,
      spread: marketData.spread,
    };
  }
}

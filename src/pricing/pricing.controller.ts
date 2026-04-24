import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ResponseInterceptor } from '../common/interceptors/response.interceptor';

import { PricingService } from './pricing.service';
import { PriceDiscoveryService } from './algorithms/price-discovery.service';
import { DynamicPricingService } from './algorithms/dynamic-pricing.service';
import { MarketDataService } from './integrations/market-data.service';
import { PricingAnalyticsService } from './analytics/pricing-analytics.service';
import { PriceForecastingService } from './forecasting/price-forecasting.service';
import { GeographicPricingService } from './algorithms/geographic-pricing.service';
import { TimeBasedPricingService } from './algorithms/time-based-pricing.service';
import { TradingEngineService } from './integrations/trading-engine.service';

import {
  CalculatePriceDto,
  PriceHistoryQueryDto,
  PricePredictionDto,
} from './dto/calculate-price.dto';

@ApiTags('pricing')
@Controller('pricing')
@UseGuards(ThrottlerGuard)
@UseInterceptors(ResponseInterceptor)
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly priceDiscoveryService: PriceDiscoveryService,
    private readonly dynamicPricingService: DynamicPricingService,
    private readonly marketDataService: MarketDataService,
    private readonly pricingAnalyticsService: PricingAnalyticsService,
    private readonly priceForecastingService: PriceForecastingService,
    private readonly geographicPricingService: GeographicPricingService,
    private readonly timeBasedPricingService: TimeBasedPricingService,
    private readonly tradingEngineService: TradingEngineService,
  ) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate real-time energy price' })
  @ApiResponse({ status: 200, description: 'Price calculated successfully' })
  async calculatePrice(@Body() calculatePriceDto: CalculatePriceDto) {
    const result = await this.pricingService.calculatePrice(calculatePriceDto);
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('current/:energyType/:location')
  @ApiOperation({ summary: 'Get current price for energy type and location' })
  @ApiParam({ name: 'energyType', description: 'Type of energy' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  async getCurrentPrice(
    @Param('energyType') energyType: string,
    @Param('location') location: string,
  ) {
    const price = await this.tradingEngineService.getCurrentPrice(energyType, location);
    
    return {
      success: true,
      data: {
        energyType,
        location,
        currentPrice: price,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('discover/:energyType/:location')
  @ApiOperation({ summary: 'Discover real-time price using advanced algorithms' })
  @ApiParam({ name: 'energyType', description: 'Type of energy' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  async discoverPrice(
    @Param('energyType') energyType: string,
    @Param('location') location: string,
  ) {
    const marketData = await this.marketDataService.fetchMarketData(energyType, location);
    const discovery = await this.priceDiscoveryService.discoverRealTimePrice(
      marketData.primaryData ? [marketData.primaryData] : [],
      energyType,
      location,
    );
    
    return {
      success: true,
      data: discovery,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('dynamic')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate dynamic price based on supply/demand' })
  async calculateDynamicPrice(@Body() body: {
    energyType: string;
    location: string;
    supply: number;
    demand: number;
    basePrice?: number;
    externalFactors?: any;
  }) {
    const result = await this.dynamicPricingService.calculateDynamicPrice(
      {
        supply: body.supply,
        demand: body.demand,
        timestamp: Date.now(),
        location: body.location,
        energyType: body.energyType,
        externalFactors: body.externalFactors,
      },
      body.basePrice,
    );
    
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('forecast/:energyType/:location')
  @ApiOperation({ summary: 'Generate price forecast' })
  @ApiParam({ name: 'energyType', description: 'Type of energy' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  @ApiQuery({ name: 'hoursAhead', required: false, description: 'Hours to forecast ahead' })
  async generateForecast(
    @Param('energyType') energyType: string,
    @Param('location') location: string,
    @Query('hoursAhead') hoursAhead?: string,
  ) {
    const hours = hoursAhead ? parseInt(hoursAhead) : 24;
    const forecast = await this.priceForecastingService.generatePriceForecast(
      energyType,
      location,
      hours,
    );
    
    return {
      success: true,
      data: forecast,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('predict')
  @ApiOperation({ summary: 'Predict future energy prices' })
  @ApiResponse({
    status: 200,
    description: 'Price prediction generated successfully',
  })
  async predictPrice(@Body() predictionDto: PricePredictionDto) {
    const prediction = await this.pricingService.predictPrice(predictionDto);
    
    return {
      success: true,
      data: prediction,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get price history' })
  @ApiResponse({
    status: 200,
    description: 'Price history retrieved successfully',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    description: 'Filter by location',
  })
  @ApiQuery({
    name: 'energyType',
    required: false,
    description: 'Filter by energy type',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date timestamp',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date timestamp',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPriceHistory(@Query() query: PriceHistoryQueryDto) {
    const history = await this.pricingService.getPriceHistory(query);
    
    return {
      success: true,
      data: history,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('analytics/:energyType/:location')
  @ApiOperation({ summary: 'Get comprehensive pricing analytics' })
  @ApiParam({ name: 'energyType', description: 'Type of energy' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  async getPricingAnalytics(
    @Param('energyType') energyType: string,
    @Param('location') location: string,
  ) {
    const analytics = await this.pricingAnalyticsService.generatePricingAnalytics(
      location,
      energyType,
    );
    
    return {
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('geographic/:location')
  @ApiOperation({ summary: 'Get geographic pricing adjustments' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  @ApiQuery({ name: 'energyType', required: false, description: 'Type of energy' })
  async getGeographicPricing(
    @Param('location') location: string,
    @Query('energyType') energyType?: string,
  ) {
    const insights = await this.geographicPricingService.getGeographicPricingInsights(
      location,
      energyType,
    );
    
    return {
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('regional-comparison')
  @ApiOperation({ summary: 'Compare pricing across regions' })
  @ApiQuery({ name: 'energyType', required: false, description: 'Type of energy' })
  async getRegionalComparison(@Query('energyType') energyType?: string) {
    const comparison = await this.geographicPricingService.getRegionalComparisons(
      energyType,
    );
    
    return {
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('time-based/:energyType/:location')
  @ApiOperation({ summary: 'Get time-based pricing analysis' })
  @ApiParam({ name: 'energyType', description: 'Type of energy' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  async getTimeBasedPricing(
    @Param('energyType') energyType: string,
    @Param('location') location: string,
  ) {
    const insights = await this.timeBasedPricingService.getTimeBasedPricingInsights(
      location,
      energyType,
    );
    
    return {
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('market-data/:energyType/:location')
  @ApiOperation({ summary: 'Get integrated market data' })
  @ApiParam({ name: 'energyType', description: 'Type of energy' })
  @ApiParam({ name: 'location', description: 'Geographic location' })
  async getMarketData(
    @Param('energyType') energyType: string,
    @Param('location') location: string,
  ) {
    const marketData = await this.marketDataService.fetchMarketData(
      energyType,
      location,
    );
    
    return {
      success: true,
      data: marketData,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('market-data/sources')
  @ApiOperation({ summary: 'Get market data sources status' })
  async getMarketDataSources() {
    const status = this.marketDataService.getDataSourcesStatus();
    const quality = this.marketDataService.getDataQualityMetrics();
    
    return {
      success: true,
      data: {
        sources: status,
        quality,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('anomalies')
  @ApiOperation({ summary: 'Detect price anomalies' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'energyType', required: false, description: 'Filter by energy type' })
  async detectAnomalies(
    @Query('location') location?: string,
    @Query('energyType') energyType?: string,
  ) {
    const anomalies = await this.pricingAnalyticsService.detectPriceAnomalies(
      location,
      energyType,
    );
    
    return {
      success: true,
      data: anomalies,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get market insights and recommendations' })
  @ApiQuery({ name: 'location', required: false, description: 'Filter by location' })
  @ApiQuery({ name: 'energyType', required: false, description: 'Filter by energy type' })
  async getMarketInsights(
    @Query('location') location?: string,
    @Query('energyType') energyType?: string,
  ) {
    const insights = await this.pricingAnalyticsService.generateMarketInsights(
      location,
      energyType,
    );
    
    return {
      success: true,
      data: insights,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('trading-status')
  @ApiOperation({ summary: 'Get trading engine status' })
  async getTradingEngineStatus() {
    const status = await this.tradingEngineService.getTradingEngineStatus();
    const cacheStats = this.tradingEngineService.getCacheStatistics();
    
    return {
      success: true,
      data: {
        ...status,
        cache: cacheStats,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for pricing services' })
  async healthCheck() {
    const tradingStatus = await this.tradingEngineService.getTradingEngineStatus();
    const marketDataStatus = this.marketDataService.getDataSourcesStatus();
    const modelStats = this.priceForecastingService.getModelStatistics();
    
    return {
      success: true,
      data: {
        status: 'healthy',
        services: {
          tradingEngine: tradingStatus.isConnected ? 'online' : 'offline',
          marketData: marketDataStatus.active > 0 ? 'online' : 'offline',
          forecasting: modelStats.avgAccuracy > 80 ? 'healthy' : 'degraded',
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  async getPerformanceMetrics() {
    const tradingStatus = await this.tradingEngineService.getTradingEngineStatus();
    const cacheStats = this.tradingEngineService.getCacheStatistics();
    const marketDataQuality = this.marketDataService.getDataQualityMetrics();
    
    return {
      success: true,
      data: {
        latency: {
          tradingEngine: tradingStatus.latency,
          target: 100, // <100ms requirement
          status: tradingStatus.latency <= 100 ? 'within_target' : 'exceeds_target',
        },
        cache: cacheStats,
        marketDataQuality,
        uptime: tradingStatus.isConnected ? 100 : 0,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

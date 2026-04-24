import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MarketDataService } from './market-data.service';
import { CreateMarketDataDto } from './dto/create-market-data.dto';
import { UpdateMarketDataDto } from './dto/update-market-data.dto';
import { MarketDataQueryDto } from './dto/market-data-query.dto';
import { MarketDataResponseDto } from './dto/market-data-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Market Data')
@Controller('market-data')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post()
  @ApiOperation({ summary: 'Create new market data entry' })
  @ApiResponse({ status: 201, description: 'Market data created successfully', type: MarketDataResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createMarketData(@Body() createMarketDataDto: CreateMarketDataDto): Promise<MarketDataResponseDto> {
    return this.marketDataService.createMarketData(createMarketDataDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all market data with filtering' })
  @ApiResponse({ status: 200, description: 'Market data retrieved successfully', type: [MarketDataResponseDto] })
  @ApiQuery({ name: 'symbol', required: false, description: 'Filter by symbol' })
  @ApiQuery({ name: 'source', required: false, description: 'Filter by data source' })
  @ApiQuery({ name: 'startTime', required: false, description: 'Start time filter' })
  @ApiQuery({ name: 'endTime', required: false, description: 'End time filter' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset results' })
  async getMarketData(@Query() query: MarketDataQueryDto): Promise<MarketDataResponseDto[]> {
    return this.marketDataService.getMarketData(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get market data by ID' })
  @ApiResponse({ status: 200, description: 'Market data retrieved successfully', type: MarketDataResponseDto })
  @ApiResponse({ status: 404, description: 'Market data not found' })
  @ApiParam({ name: 'id', description: 'Market data ID' })
  async getMarketDataById(@Param('id') id: string): Promise<MarketDataResponseDto> {
    return this.marketDataService.getMarketDataById(id);
  }

  @Get('symbol/:symbol/latest')
  @ApiOperation({ summary: 'Get latest market data for symbol' })
  @ApiResponse({ status: 200, description: 'Latest market data retrieved successfully', type: MarketDataResponseDto })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  async getLatestMarketData(@Param('symbol') symbol: string): Promise<MarketDataResponseDto> {
    return this.marketDataService.getLatestMarketData(symbol);
  }

  @Get('symbol/:symbol/history')
  @ApiOperation({ summary: 'Get historical market data for symbol' })
  @ApiResponse({ status: 200, description: 'Historical market data retrieved successfully', type: [MarketDataResponseDto] })
  @ApiParam({ name: 'symbol', description: 'Trading symbol' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period (1m, 5m, 1h, 1d)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of records' })
  async getHistoricalMarketData(
    @Param('symbol') symbol: string,
    @Query('period') period?: string,
    @Query('limit') limit?: number,
  ): Promise<MarketDataResponseDto[]> {
    return this.marketDataService.getHistoricalMarketData(symbol, period, limit);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update market data' })
  @ApiResponse({ status: 200, description: 'Market data updated successfully', type: MarketDataResponseDto })
  @ApiResponse({ status: 404, description: 'Market data not found' })
  @ApiParam({ name: 'id', description: 'Market data ID' })
  async updateMarketData(
    @Param('id') id: string,
    @Body() updateMarketDataDto: UpdateMarketDataDto,
  ): Promise<MarketDataResponseDto> {
    return this.marketDataService.updateMarketData(id, updateMarketDataDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete market data' })
  @ApiResponse({ status: 204, description: 'Market data deleted successfully' })
  @ApiResponse({ status: 404, description: 'Market data not found' })
  @ApiParam({ name: 'id', description: 'Market data ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMarketData(@Param('id') id: string): Promise<void> {
    return this.marketDataService.deleteMarketData(id);
  }

  @Post('aggregate')
  @ApiOperation({ summary: 'Aggregate market data from multiple sources' })
  @ApiResponse({ status: 200, description: 'Market data aggregated successfully', type: MarketDataResponseDto })
  async aggregateMarketData(@Body() symbols: string[]): Promise<MarketDataResponseDto[]> {
    return this.marketDataService.aggregateMarketData(symbols);
  }

  @Get('quality/reports')
  @ApiOperation({ summary: 'Get data quality reports' })
  @ApiResponse({ status: 200, description: 'Quality reports retrieved successfully' })
  async getQualityReports(): Promise<any> {
    return this.marketDataService.getQualityReports();
  }

  @Get('sources/status')
  @ApiOperation({ summary: 'Get data sources status' })
  @ApiResponse({ status: 200, description: 'Data sources status retrieved successfully' })
  async getDataSourcesStatus(): Promise<any> {
    return this.marketDataService.getDataSourcesStatus();
  }

  @Post('sync/real-time')
  @ApiOperation({ summary: 'Trigger real-time data synchronization' })
  @ApiResponse({ status: 200, description: 'Real-time sync triggered successfully' })
  async triggerRealTimeSync(@Body() symbols: string[]): Promise<any> {
    return this.marketDataService.triggerRealTimeSync(symbols);
  }
}

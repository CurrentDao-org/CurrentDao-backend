import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import {
  CalculatePriceDto,
  PriceHistoryQueryDto,
  PricePredictionDto,
} from './dto/calculate-price.dto';

@ApiTags('pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  @ApiOperation({ summary: 'Calculate energy price based on various factors' })
  @ApiResponse({ status: 200, description: 'Price calculated successfully' })
  async calculatePrice(@Body() calculatePriceDto: CalculatePriceDto) {
    return this.pricingService.calculatePrice(calculatePriceDto);
  }

  @Post('predict')
  @ApiOperation({ summary: 'Predict future energy prices' })
  @ApiResponse({
    status: 200,
    description: 'Price prediction generated successfully',
  })
  async predictPrice(@Body() predictionDto: PricePredictionDto) {
    return this.pricingService.predictPrice(predictionDto);
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
    return this.pricingService.getPriceHistory(query);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get pricing analytics and statistics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
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
  async getAnalytics(
    @Query('location') location?: string,
    @Query('energyType') energyType?: string,
  ) {
    return this.pricingService.getPricingAnalytics(location, energyType);
  }
}

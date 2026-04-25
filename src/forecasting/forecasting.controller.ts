import { Controller, Get, Post, Body, Query, Param, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { ForecastingService } from './forecasting.service';

@ApiTags('energy-forecasting')
@Controller('forecasting')
export class ForecastingController {
  constructor(private readonly forecastingService: ForecastingService) {}

  @Get('demand')
  @ApiOperation({ summary: 'Get energy demand forecast' })
  @ApiResponse({ status: 200, description: 'Demand forecast retrieved successfully' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Forecast horizon in hours (1-720)' })
  @ApiQuery({ name: 'region', required: false, description: 'Region for forecast' })
  async getDemandForecast(
    @Query('horizon') horizon?: string,
    @Query('region') region?: string,
    @Res() res?: Response,
  ) {
    try {
      const horizonHours = horizon ? parseInt(horizon) : 24;
      const forecast = await this.forecastingService.getDemandForecast(horizonHours, region);
      return res?.status(HttpStatus.OK).json(forecast) || forecast;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('supply')
  @ApiOperation({ summary: 'Get energy supply forecast' })
  @ApiResponse({ status: 200, description: 'Supply forecast retrieved successfully' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Forecast horizon in hours (1-720)' })
  @ApiQuery({ name: 'source', required: false, description: 'Energy source type' })
  async getSupplyForecast(
    @Query('horizon') horizon?: string,
    @Query('source') source?: string,
    @Res() res?: Response,
  ) {
    try {
      const horizonHours = horizon ? parseInt(horizon) : 24;
      const forecast = await this.forecastingService.getSupplyForecast(horizonHours, source);
      return res?.status(HttpStatus.OK).json(forecast) || forecast;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('combined')
  @ApiOperation({ summary: 'Get combined demand and supply forecast' })
  @ApiResponse({ status: 200, description: 'Combined forecast retrieved successfully' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Forecast horizon in hours (1-720)' })
  @ApiQuery({ name: 'region', required: false, description: 'Region for forecast' })
  async getCombinedForecast(
    @Query('horizon') horizon?: string,
    @Query('region') region?: string,
    @Res() res?: Response,
  ) {
    try {
      const horizonHours = horizon ? parseInt(horizon) : 24;
      const forecast = await this.forecastingService.getCombinedForecast(horizonHours, region);
      return res?.status(HttpStatus.OK).json(forecast) || forecast;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('accuracy')
  @ApiOperation({ summary: 'Get forecast accuracy metrics' })
  @ApiResponse({ status: 200, description: 'Accuracy metrics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, description: 'Analysis period in days' })
  @ApiQuery({ name: 'type', required: false, description: 'Forecast type (demand/supply)' })
  async getAccuracyMetrics(
    @Query('period') period?: string,
    @Query('type') type?: string,
    @Res() res?: Response,
  ) {
    try {
      const periodDays = period ? parseInt(period) : 30;
      const metrics = await this.forecastingService.getAccuracyMetrics(periodDays, type);
      return res?.status(HttpStatus.OK).json(metrics) || metrics;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('retrain')
  @ApiOperation({ summary: 'Trigger model retraining' })
  @ApiResponse({ status: 200, description: 'Retraining initiated successfully' })
  @ApiQuery({ name: 'model', required: false, description: 'Model type to retrain' })
  async triggerRetraining(
    @Body() body: { model?: string; force?: boolean },
    @Res() res?: Response,
  ) {
    try {
      const result = await this.forecastingService.triggerRetraining(body.model, body.force);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('weather-impact')
  @ApiOperation({ summary: 'Get weather impact analysis on forecasts' })
  @ApiResponse({ status: 200, description: 'Weather impact analysis retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to analyze' })
  async getWeatherImpact(
    @Query('days') days?: string,
    @Res() res?: Response,
  ) {
    try {
      const analysisDays = days ? parseInt(days) : 7;
      const impact = await this.forecastingService.getWeatherImpact(analysisDays);
      return res?.status(HttpStatus.OK).json(impact) || impact;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('trading-signals')
  @ApiOperation({ summary: 'Get trading signals based on forecasts' })
  @ApiResponse({ status: 200, description: 'Trading signals retrieved successfully' })
  @ApiQuery({ name: 'confidence', required: false, description: 'Minimum confidence threshold' })
  async getTradingSignals(
    @Query('confidence') confidence?: string,
    @Res() res?: Response,
  ) {
    try {
      const minConfidence = confidence ? parseFloat(confidence) : 0.7;
      const signals = await this.forecastingService.getTradingSignals(minConfidence);
      return res?.status(HttpStatus.OK).json(signals) || signals;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('history')
  @ApiOperation({ summary: 'Get historical forecast data' })
  @ApiResponse({ status: 200, description: 'Historical data retrieved successfully' })
  @ApiQuery({ name: 'from', required: true, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'to', required: true, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'type', required: false, description: 'Forecast type' })
  async getHistoricalData(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('type') type?: string,
    @Res() res?: Response,
  ) {
    try {
      const history = await this.forecastingService.getHistoricalData(from, to, type);
      return res?.status(HttpStatus.OK).json(history) || history;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
}

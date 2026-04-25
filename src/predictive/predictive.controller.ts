import { Controller, Get, Post, Put, Body, Query, Param, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { PredictiveService } from './predictive.service';

@ApiTags('predictive-analytics')
@Controller('predictive')
export class PredictiveController {
  constructor(private readonly predictiveService: PredictiveService) {}

  @Get('models')
  @ApiOperation({ summary: 'Get available ML models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async getModels(@Res() res?: Response) {
    try {
      const models = await this.predictiveService.getAvailableModels();
      return res?.status(HttpStatus.OK).json(models) || models;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get predictions from ML models' })
  @ApiResponse({ status: 200, description: 'Predictions retrieved successfully' })
  @ApiQuery({ name: 'model', required: false, description: 'Model name' })
  @ApiQuery({ name: 'horizon', required: false, description: 'Prediction horizon in hours' })
  async getPredictions(
    @Query('model') model?: string,
    @Query('horizon') horizon?: string,
    @Res() res?: Response,
  ) {
    try {
      const horizonHours = horizon ? parseInt(horizon) : 24;
      const predictions = await this.predictiveService.getPredictions(model, horizonHours);
      return res?.status(HttpStatus.OK).json(predictions) || predictions;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('predict')
  @ApiOperation({ summary: 'Make a prediction with specific model' })
  @ApiResponse({ status: 200, description: 'Prediction completed successfully' })
  async makePrediction(@Body() body: { model: string; data: any; options?: any }, @Res() res?: Response) {
    try {
      const prediction = await this.predictiveService.makePrediction(body.model, body.data, body.options);
      return res?.status(HttpStatus.OK).json(prediction) || prediction;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get predictive insights' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Insight type' })
  @ApiQuery({ name: 'period', required: false, description: 'Analysis period in days' })
  async getInsights(
    @Query('type') type?: string,
    @Query('period') period?: string,
    @Res() res?: Response,
  ) {
    try {
      const periodDays = period ? parseInt(period) : 7;
      const insights = await this.predictiveService.getInsights(type, periodDays);
      return res?.status(HttpStatus.OK).json(insights) || insights;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('models/train')
  @ApiOperation({ summary: 'Train ML model' })
  @ApiResponse({ status: 200, description: 'Model training initiated' })
  async trainModel(@Body() body: { model: string; parameters?: any; force?: boolean }, @Res() res?: Response) {
    try {
      const result = await this.predictiveService.trainModel(body.model, body.parameters, body.force);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('models/:id/performance')
  @ApiOperation({ summary: 'Get model performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async getModelPerformance(@Param('id') id: string, @Res() res?: Response) {
    try {
      const performance = await this.predictiveService.getModelPerformance(id);
      return res?.status(HttpStatus.OK).json(performance) || performance;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Put('models/:id/deploy')
  @ApiOperation({ summary: 'Deploy ML model' })
  @ApiResponse({ status: 200, description: 'Model deployed successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async deployModel(@Param('id') id: string, @Body() body: { version?: string }, @Res() res?: Response) {
    try {
      const result = await this.predictiveService.deployModel(id, body.version);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('monitoring')
  @ApiOperation({ summary: 'Get model monitoring status' })
  @ApiResponse({ status: 200, description: 'Monitoring status retrieved successfully' })
  async getMonitoringStatus(@Res() res?: Response) {
    try {
      const status = await this.predictiveService.getMonitoringStatus();
      return res?.status(HttpStatus.OK).json(status) || status;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('time-series')
  @ApiOperation({ summary: 'Get time series forecasting' })
  @ApiResponse({ status: 200, description: 'Time series forecast retrieved successfully' })
  @ApiQuery({ name: 'metric', required: true, description: 'Metric to forecast' })
  @ApiQuery({ name: 'period', required: false, description: 'Forecast period in hours' })
  async getTimeSeriesForecast(
    @Query('metric') metric: string,
    @Query('period') period?: string,
    @Res() res?: Response,
  ) {
    try {
      const forecastPeriod = period ? parseInt(period) : 24;
      const forecast = await this.predictiveService.getTimeSeriesForecast(metric, forecastPeriod);
      return res?.status(HttpStatus.OK).json(forecast) || forecast;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('features')
  @ApiOperation({ summary: 'Get feature engineering results' })
  @ApiResponse({ status: 200, description: 'Feature engineering results retrieved successfully' })
  @ApiQuery({ name: 'model', required: false, description: 'Model name' })
  async getFeatureEngineering(@Query('model') model?: string, @Res() res?: Response) {
    try {
      const features = await this.predictiveService.getFeatureEngineering(model);
      return res?.status(HttpStatus.OK).json(features) || features;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('features/select')
  @ApiOperation({ summary: 'Select features for model' })
  @ApiResponse({ status: 200, description: 'Feature selection completed successfully' })
  async selectFeatures(@Body() body: { model: string; features: string[]; method?: string }, @Res() res?: Response) {
    try {
      const result = await this.predictiveService.selectFeatures(body.model, body.features, body.method);
      return res?.status(HttpStatus.OK).json(result) || result;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('data-quality')
  @ApiOperation({ summary: 'Get data quality assessment' })
  @ApiResponse({ status: 200, description: 'Data quality assessment retrieved successfully' })
  @ApiQuery({ name: 'dataset', required: false, description: 'Dataset name' })
  async getDataQuality(@Query('dataset') dataset?: string, @Res() res?: Response) {
    try {
      const quality = await this.predictiveService.getDataQuality(dataset);
      return res?.status(HttpStatus.OK).json(quality) || quality;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('experiment/:id')
  @ApiOperation({ summary: 'Get experiment results' })
  @ApiResponse({ status: 200, description: 'Experiment results retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Experiment ID' })
  async getExperimentResults(@Param('id') id: string, @Res() res?: Response) {
    try {
      const results = await this.predictiveService.getExperimentResults(id);
      return res?.status(HttpStatus.OK).json(results) || results;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Post('experiment')
  @ApiOperation({ summary: 'Create new experiment' })
  @ApiResponse({ status: 201, description: 'Experiment created successfully' })
  async createExperiment(@Body() body: { name: string; description?: string; parameters?: any }, @Res() res?: Response) {
    try {
      const experiment = await this.predictiveService.createExperiment(body.name, body.description, body.parameters);
      return res?.status(HttpStatus.CREATED).json(experiment) || experiment;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get predictive analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(@Res() res?: Response) {
    try {
      const dashboard = await this.predictiveService.getDashboard();
      return res?.status(HttpStatus.OK).json(dashboard) || dashboard;
    } catch (error) {
      return res?.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  }
}

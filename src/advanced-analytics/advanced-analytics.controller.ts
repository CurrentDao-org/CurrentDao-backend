import { Controller, Get, Post, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdvancedAnalyticsService } from './advanced-analytics.service';
import { BigDataProcessorService } from './bigdata/big-data-processor.service';
import { StreamProcessorService } from './streaming/stream-processor.service';
import { DataVizService } from './visualization/data-viz.service';
import { PredictiveAnalyticsService } from './predictive/predictive-analytics.service';
import { DataWarehouseService } from './warehouse/data-warehouse.service';
import { QueryOptimizerService } from './optimization/query-optimizer.service';
import { MlPipelineService } from './ml-pipeline/ml-pipeline.service';

@ApiTags('Advanced Analytics')
@Controller('advanced-analytics')
export class AdvancedAnalyticsController {
  constructor(
    private readonly advancedAnalyticsService: AdvancedAnalyticsService,
    private readonly bigDataProcessorService: BigDataProcessorService,
    private readonly streamProcessorService: StreamProcessorService,
    private readonly dataVizService: DataVizService,
    private readonly predictiveAnalyticsService: PredictiveAnalyticsService,
    private readonly dataWarehouseService: DataWarehouseService,
    private readonly queryOptimizerService: QueryOptimizerService,
    private readonly mlPipelineService: MlPipelineService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get advanced analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.advancedAnalyticsService.getDashboardData();
  }

  @Post('bigdata/process')
  @ApiOperation({ summary: 'Process big data with Spark/Hadoop' })
  @ApiResponse({ status: 200, description: 'Big data processing initiated' })
  async processBigData(@Body() processData: any) {
    return this.bigDataProcessorService.processData(processData);
  }

  @Get('bigdata/status/:jobId')
  @ApiOperation({ summary: 'Get big data processing status' })
  async getProcessingStatus(@Param('jobId') jobId: string) {
    return this.bigDataProcessorService.getJobStatus(jobId);
  }

  @Post('streaming/process')
  @ApiOperation({ summary: 'Process real-time stream data' })
  async processStream(@Body() streamData: any) {
    return this.streamProcessorService.processStreamData(streamData);
  }

  @Get('streaming/metrics')
  @ApiOperation({ summary: 'Get stream processing metrics' })
  async getStreamMetrics() {
    return this.streamProcessorService.getMetrics();
  }

  @Post('visualization/generate')
  @ApiOperation({ summary: 'Generate data visualization' })
  async generateVisualization(@Body() vizConfig: any) {
    return this.dataVizService.generateVisualization(vizConfig);
  }

  @Get('visualization/charts/:type')
  @ApiOperation({ summary: 'Get chart data by type' })
  async getChartData(@Param('type') type: string, @Query() params: any) {
    return this.dataVizService.getChartData(type, params);
  }

  @Post('predictive/analyze')
  @ApiOperation({ summary: 'Run predictive analytics' })
  async runPredictiveAnalysis(@Body() analysisConfig: any) {
    return this.predictiveAnalyticsService.runAnalysis(analysisConfig);
  }

  @Get('predictive/insights')
  @ApiOperation({ summary: 'Get real-time predictive insights' })
  async getPredictiveInsights(@Query() params: any) {
    return this.predictiveAnalyticsService.getInsights(params);
  }

  @Post('warehouse/query')
  @ApiOperation({ summary: 'Execute data warehouse query' })
  async executeWarehouseQuery(@Body() queryConfig: any) {
    return this.dataWarehouseService.executeQuery(queryConfig);
  }

  @Get('warehouse/schema')
  @ApiOperation({ summary: 'Get data warehouse schema' })
  async getWarehouseSchema() {
    return this.dataWarehouseService.getSchema();
  }

  @Post('optimization/optimize')
  @ApiOperation({ summary: 'Optimize query performance' })
  async optimizeQuery(@Body() queryConfig: any) {
    return this.queryOptimizerService.optimizeQuery(queryConfig);
  }

  @Get('optimization/performance')
  @ApiOperation({ summary: 'Get query performance metrics' })
  async getPerformanceMetrics() {
    return this.queryOptimizerService.getPerformanceMetrics();
  }

  @Post('ml-pipeline/train')
  @ApiOperation({ summary: 'Train ML model' })
  async trainModel(@Body() trainingConfig: any) {
    return this.mlPipelineService.trainModel(trainingConfig);
  }

  @Post('ml-pipeline/predict')
  @ApiOperation({ summary: 'Make predictions with trained model' })
  async makePrediction(@Body() predictionConfig: any) {
    return this.mlPipelineService.predict(predictionConfig);
  }

  @Get('ml-pipeline/models')
  @ApiOperation({ summary: 'Get available ML models' })
  async getModels() {
    return this.mlPipelineService.getModels();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check for advanced analytics' })
  @ApiResponse({ status: 200, description: 'Advanced analytics system is healthy' })
  async healthCheck() {
    return this.advancedAnalyticsService.healthCheck();
  }
}

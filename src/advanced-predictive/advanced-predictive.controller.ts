import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AdvancedPredictiveService } from './advanced-predictive.service';
import { CreateModelDto } from './dto/create-model.dto';
import { UpdateModelDto } from './dto/update-model.dto';
import { ModelQueryDto } from './dto/model-query.dto';
import { TrainingConfigDto } from './dto/training-config.dto';
import { InferenceRequestDto } from './dto/inference-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('Advanced Predictive Analytics')
@Controller('advanced-predictive')
@UseGuards(JwtAuthGuard, ThrottlerGuard)
export class AdvancedPredictiveController {
  constructor(private readonly advancedPredictiveService: AdvancedPredictiveService) {}

  @Post('models')
  @ApiOperation({ summary: 'Create new predictive model' })
  @ApiResponse({ status: 201, description: 'Predictive model created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createModel(@Body() createModelDto: CreateModelDto) {
    return this.advancedPredictiveService.createModel(createModelDto);
  }

  @Get('models')
  @ApiOperation({ summary: 'Get all predictive models' })
  @ApiResponse({ status: 200, description: 'Predictive models retrieved successfully' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by model type' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset results' })
  async getModels(@Query() query: ModelQueryDto) {
    return this.advancedPredictiveService.getModels(query);
  }

  @Get('models/:id')
  @ApiOperation({ summary: 'Get predictive model by ID' })
  @ApiResponse({ status: 200, description: 'Predictive model retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Predictive model not found' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async getModel(@Param('id') id: string) {
    return this.advancedPredictiveService.getModel(id);
  }

  @Put('models/:id')
  @ApiOperation({ summary: 'Update predictive model' })
  @ApiResponse({ status: 200, description: 'Predictive model updated successfully' })
  @ApiResponse({ status: 404, description: 'Predictive model not found' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async updateModel(@Param('id') id: string, @Body() updateModelDto: UpdateModelDto) {
    return this.advancedPredictiveService.updateModel(id, updateModelDto);
  }

  @Delete('models/:id')
  @ApiOperation({ summary: 'Delete predictive model' })
  @ApiResponse({ status: 204, description: 'Predictive model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Predictive model not found' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteModel(@Param('id') id: string) {
    return this.advancedPredictiveService.deleteModel(id);
  }

  @Post('models/:id/train')
  @ApiOperation({ summary: 'Train predictive model' })
  @ApiResponse({ status: 200, description: 'Model training started' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async trainModel(@Param('id') id: string, @Body() trainingConfig: TrainingConfigDto) {
    return this.advancedPredictiveService.trainModel(id, trainingConfig);
  }

  @Get('models/:id/training-status')
  @ApiOperation({ summary: 'Get model training status' })
  @ApiResponse({ status: 200, description: 'Training status retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async getTrainingStatus(@Param('id') id: string) {
    return this.advancedPredictiveService.getTrainingStatus(id);
  }

  @Post('models/:id/predict')
  @ApiOperation({ summary: 'Make predictions with model' })
  @ApiResponse({ status: 200, description: 'Predictions generated successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async predict(@Param('id') id: string, @Body() inferenceRequest: InferenceRequestDto) {
    return this.advancedPredictiveService.predict(id, inferenceRequest);
  }

  @Post('models/:id/batch-predict')
  @ApiOperation({ summary: 'Make batch predictions with model' })
  @ApiResponse({ status: 200, description: 'Batch predictions generated successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async batchPredict(@Param('id') id: string, @Body() batchRequest: { data: any[] }) {
    return this.advancedPredictiveService.batchPredict(id, batchRequest.data);
  }

  @Post('ensemble/create')
  @ApiOperation({ summary: 'Create ensemble model' })
  @ApiResponse({ status: 201, description: 'Ensemble model created successfully' })
  async createEnsemble(@Body() ensembleConfig: any) {
    return this.advancedPredictiveService.createEnsemble(ensembleConfig);
  }

  @Get('ensemble/:id/performance')
  @ApiOperation({ summary: 'Get ensemble model performance' })
  @ApiResponse({ status: 200, description: 'Ensemble performance retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Ensemble ID' })
  async getEnsemblePerformance(@Param('id') id: string) {
    return this.advancedPredictiveService.getEnsemblePerformance(id);
  }

  @Get('deep-learning/models')
  @ApiOperation({ summary: 'Get deep learning models' })
  @ApiResponse({ status: 200, description: 'Deep learning models retrieved successfully' })
  @ApiQuery({ name: 'architecture', required: false, description: 'Filter by architecture' })
  async getDeepLearningModels(@Query() query: any) {
    return this.advancedPredictiveService.getDeepLearningModels(query);
  }

  @Post('deep-learning/models/:id/evaluate')
  @ApiOperation({ summary: 'Evaluate deep learning model' })
  @ApiResponse({ status: 200, description: 'Model evaluation completed' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async evaluateDeepLearningModel(@Param('id') id: string, @Body() evaluationData: any) {
    return this.advancedPredictiveService.evaluateDeepLearningModel(id, evaluationData);
  }

  @Get('feature-engineering/features')
  @ApiOperation({ summary: 'Get engineered features' })
  @ApiResponse({ status: 200, description: 'Engineered features retrieved successfully' })
  @ApiQuery({ name: 'dataset', required: false, description: 'Filter by dataset' })
  async getEngineeredFeatures(@Query() query: any) {
    return this.advancedPredictiveService.getEngineeredFeatures(query);
  }

  @Post('feature-engineering/generate')
  @ApiOperation({ summary: 'Generate new features' })
  @ApiResponse({ status: 201, description: 'Features generated successfully' })
  async generateFeatures(@Body() featureConfig: any) {
    return this.advancedPredictiveService.generateFeatures(featureConfig);
  }

  @Get('explainability/:id/explanations')
  @ApiOperation({ summary: 'Get model explanations' })
  @ApiResponse({ status: 200, description: 'Model explanations retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async getModelExplanations(@Param('id') id: string, @Query() query: any) {
    return this.advancedPredictiveService.getModelExplanations(id, query);
  }

  @Post('explainability/:id/explain')
  @ApiOperation({ summary: 'Explain specific prediction' })
  @ApiResponse({ status: 200, description: 'Prediction explained successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  async explainPrediction(@Param('id') id: string, @Body() explanationRequest: any) {
    return this.advancedPredictiveService.explainPrediction(id, explanationRequest);
  }

  @Get('monitoring/models/:id/metrics')
  @ApiOperation({ summary: 'Get model monitoring metrics' })
  @ApiResponse({ status: 200, description: 'Model metrics retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Model ID' })
  @ApiQuery({ name: 'period', required: false, description: 'Time period' })
  async getModelMetrics(@Param('id') id: string, @Query() query: any) {
    return this.advancedPredictiveService.getModelMetrics(id, query);
  }

  @Get('monitoring/drift-detection')
  @ApiOperation({ summary: 'Get model drift detection results' })
  @ApiResponse({ status: 200, description: 'Drift detection results retrieved successfully' })
  @ApiQuery({ name: 'modelId', required: false, description: 'Filter by model ID' })
  async getDriftDetection(@Query() query: any) {
    return this.advancedPredictiveService.getDriftDetection(query);
  }

  @Post('automated-training/schedule')
  @ApiOperation({ summary: 'Schedule automated model training' })
  @ApiResponse({ status: 201, description: 'Automated training scheduled successfully' })
  async scheduleAutomatedTraining(@Body() scheduleConfig: any) {
    return this.advancedPredictiveService.scheduleAutomatedTraining(scheduleConfig);
  }

  @Get('automated-training/status')
  @ApiOperation({ summary: 'Get automated training status' })
  @ApiResponse({ status: 200, description: 'Automated training status retrieved successfully' })
  async getAutomatedTrainingStatus() {
    return this.advancedPredictiveService.getAutomatedTrainingStatus();
  }

  @Post('ab-testing/create')
  @ApiOperation({ summary: 'Create A/B test for models' })
  @ApiResponse({ status: 201, description: 'A/B test created successfully' })
  async createABTest(@Body() testConfig: any) {
    return this.advancedPredictiveService.createABTest(testConfig);
  }

  @Get('ab-testing/:id/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  @ApiResponse({ status: 200, description: 'A/B test results retrieved successfully' })
  @ApiParam({ name: 'id', description: 'Test ID' })
  async getABTestResults(@Param('id') id: string) {
    return this.advancedPredictiveService.getABTestResults(id);
  }

  @Get('performance/leaderboard')
  @ApiOperation({ summary: 'Get model performance leaderboard' })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved successfully' })
  @ApiQuery({ name: 'metric', required: false, description: 'Sort by metric' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results' })
  async getPerformanceLeaderboard(@Query() query: any) {
    return this.advancedPredictiveService.getPerformanceLeaderboard(query);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get predictive analytics platform status' })
  @ApiResponse({ status: 200, description: 'Platform status retrieved successfully' })
  async getPlatformStatus() {
    return this.advancedPredictiveService.getPlatformStatus();
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get predictive analytics statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getPlatformStatistics() {
    return this.advancedPredictiveService.getPlatformStatistics();
  }
}

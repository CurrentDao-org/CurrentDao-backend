import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecommendationEngineService } from './recommendation-engine.service';
import { MlModelService } from './ml-model.service';
import { UserBehaviorService } from './user-behavior.service';
import { AbTestingService } from './ab-testing.service';

@ApiTags('AI Recommendations')
@Controller('ai/recommendations')
export class AiRecommendationsController {
  constructor(
    private readonly recommendationEngine: RecommendationEngineService,
    private readonly mlModelService: MlModelService,
    private readonly userBehaviorService: UserBehaviorService,
    private readonly abTestService: AbTestingService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get personalized recommendations for user' })
  @ApiResponse({
    status: 200,
    description: 'Returns AI-powered recommendations',
  })
  async getRecommendations(
    @Query('userId') userId: string,
    @Query('asset') asset?: string,
  ): Promise<any> {
    return this.recommendationEngine.generateRecommendations(userId, asset);
  }

  @Get(':userId/behavior')
  @ApiOperation({ summary: 'Get user behavior analysis' })
  @ApiResponse({ status: 200, description: 'Returns user behavior profile' })
  async getUserBehavior(@Param('userId') userId: string): Promise<any> {
    return this.userBehaviorService.analyzeUserBehavior(userId);
  }

  @Post(':recommendationId/accept')
  @ApiOperation({ summary: 'Accept a recommendation' })
  @ApiResponse({ status: 200, description: 'Recommendation accepted' })
  async acceptRecommendation(
    @Param('recommendationId') recommendationId: string,
  ): Promise<void> {
    // Track recommendation acceptance
  }

  @Post(':recommendationId/outcome')
  @ApiOperation({ summary: 'Track recommendation outcome' })
  @ApiResponse({ status: 200, description: 'Outcome tracked' })
  async trackOutcome(
    @Param('recommendationId') recommendationId: string,
    @Body() outcomeData: any,
  ): Promise<void> {
    await this.userBehaviorService.trackRecommendationOutcome(
      recommendationId,
      outcomeData.outcome,
      outcomeData.return,
    );
  }

  @Get('model/performance')
  @ApiOperation({ summary: 'Get ML model performance metrics' })
  @ApiResponse({
    status: 200,
    description: 'Returns model accuracy and metrics',
  })
  async getModelPerformance(): Promise<any> {
    return this.mlModelService.getModelPerformance();
  }

  @Post('model/train')
  @ApiOperation({ summary: 'Trigger model training' })
  @ApiResponse({ status: 200, description: 'Training started' })
  async trainModel(@Body() trainingData: any[]): Promise<void> {
    await this.mlModelService.trainModel(trainingData);
  }

  @Get('ab-tests/:testId/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  @ApiResponse({ status: 200, description: 'Returns A/B test analysis' })
  async getAbTestResults(@Param('testId') testId: string): Promise<any> {
    return this.abTestService.analyzeTestResults(testId);
  }
}

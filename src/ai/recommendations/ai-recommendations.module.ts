import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recommendation } from './entities/recommendation.entity';
import { MlModelService } from './ml-model.service';
import { UserBehaviorService } from './user-behavior.service';
import { MarketPatternService } from './market-pattern.service';
import { RecommendationEngineService } from './recommendation-engine.service';
import { AbTestingService } from './ab-testing.service';
import { AiRecommendationsController } from './ai-recommendations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Recommendation])],
  controllers: [AiRecommendationsController],
  providers: [
    MlModelService,
    UserBehaviorService,
    MarketPatternService,
    RecommendationEngineService,
    AbTestingService,
  ],
  exports: [
    MlModelService,
    UserBehaviorService,
    MarketPatternService,
    RecommendationEngineService,
    AbTestingService,
  ],
})
export class AiRecommendationsModule {}

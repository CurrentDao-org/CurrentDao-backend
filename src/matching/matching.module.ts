import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { Match } from './entities/match.entity';
import { MatchingRule } from './entities/matching-rule.entity';
import { PriorityMatchingAlgorithm } from './algorithms/priority-matching.algorithm';
import { GeographicMatchingAlgorithm } from './algorithms/geographic-matching.algorithm';
import { PartialFulfillmentAlgorithm } from './algorithms/partial-fulfillment.algorithm';
import { FIFOAlgorithmService } from './algorithms/fifo-algorithm.service';
import { ProRataAlgorithmService } from './algorithms/pro-rata-algorithm.service';
import { LiquidityOptimizerService } from './liquidity/liquidity-optimizer.service';
import { PriorityQueueService } from './queues/priority-queue.service';
import { MatchingAnalyticsService } from './monitoring/matching-analytics.service';
import { AuditService } from './audit/audit.service';
import { MatchingEventsService } from './events/matching-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchingRule])],
  controllers: [MatchingController],
  providers: [
    MatchingService,
    // High-frequency matching algorithms
    FIFOAlgorithmService,
    ProRataAlgorithmService,
    // Legacy algorithms
    PriorityMatchingAlgorithm,
    GeographicMatchingAlgorithm,
    PartialFulfillmentAlgorithm,
    // High-frequency services
    LiquidityOptimizerService,
    PriorityQueueService,
    MatchingAnalyticsService,
    // Existing services
    AuditService,
    MatchingEventsService,
  ],
  exports: [
    MatchingService,
    FIFOAlgorithmService,
    ProRataAlgorithmService,
    LiquidityOptimizerService,
    PriorityQueueService,
    MatchingAnalyticsService,
    AuditService,
    MatchingEventsService,
  ],
})
export class MatchingModule {}

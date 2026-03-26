import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingService } from './matching.service';
import { Match } from './entities/match.entity';
import { MatchingRule } from './entities/matching-rule.entity';
import { PriorityMatchingAlgorithm } from './algorithms/priority-matching.algorithm';
import { GeographicMatchingAlgorithm } from './algorithms/geographic-matching.algorithm';
import { PartialFulfillmentAlgorithm } from './algorithms/partial-fulfillment.algorithm';
import { AuditService } from './audit/audit.service';
import { MatchingEventsService } from './events/matching-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match, MatchingRule])],
  providers: [
    MatchingService,
    PriorityMatchingAlgorithm,
    GeographicMatchingAlgorithm,
    PartialFulfillmentAlgorithm,
    AuditService,
    MatchingEventsService,
  ],
  exports: [MatchingService, AuditService, MatchingEventsService],
})
export class MatchingModule { }

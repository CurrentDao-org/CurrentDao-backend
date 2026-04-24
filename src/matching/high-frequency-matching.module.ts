import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchingController } from './matching.controller';
import { HighFrequencyMatchingService } from './high-frequency-matching.service';
import { FifoAlgorithmService } from './algorithms/fifo-algorithm.service';
import { ProRataAlgorithmService } from './algorithms/pro-rata-algorithm.service';
import { LiquidityOptimizerService } from './liquidity/liquidity-optimizer.service';
import { PriorityQueueService } from './queues/priority-queue.service';
import { MatchingAnalyticsService } from './monitoring/matching-analytics.service';
import { Order } from './entities/order.entity';
import { Trade } from './entities/trade.entity';
import { OrderBook } from './entities/order-book.entity';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Trade, OrderBook]),
    PricingModule
  ],
  controllers: [MatchingController],
  providers: [
    HighFrequencyMatchingService,
    FifoAlgorithmService,
    ProRataAlgorithmService,
    LiquidityOptimizerService,
    PriorityQueueService,
    MatchingAnalyticsService
  ],
  exports: [
    HighFrequencyMatchingService,
    FifoAlgorithmService,
    ProRataAlgorithmService,
    LiquidityOptimizerService,
    PriorityQueueService,
    MatchingAnalyticsService
  ]
})
export class HighFrequencyMatchingModule {}

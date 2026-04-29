import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { OrderService } from './order-management/order.service';
import { OrderBookService } from './order-book/order-book.service';
import { MatchingEngineService } from './matching/matching-engine.service';
import { SettlementService } from './settlement/settlement.service';
import { StellarIntegrationService } from './integration/stellar-integration.service';
// Import entities if needed
// import { Order } from './entities/order.entity';
// import { Trade } from './entities/trade.entity';

@Module({
  imports: [
    // TypeOrmModule.forFeature([Order, Trade]),
  ],
  controllers: [TradingController],
  providers: [
    TradingService,
    OrderService,
    OrderBookService,
    MatchingEngineService,
    SettlementService,
    StellarIntegrationService,
  ],
  exports: [TradingService],
})
export class TradingModule {}
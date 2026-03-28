import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BridgeService } from './bridge.service';
import { BridgeController } from './bridge.controller';
import { BridgeValidator } from './validators/bridge.validator';
import { LiquidityManager } from './liquidity/liquidity.manager';
import { TransactionRouter } from './routers/transaction.router';

@Module({
  imports: [
    // EventEmitter is typically registered at root; re-export here for isolation
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  controllers: [BridgeController],
  providers: [
    BridgeService,
    BridgeValidator,
    LiquidityManager,
    TransactionRouter,
  ],
  exports: [BridgeService, LiquidityManager],
})
export class BridgeModule {}
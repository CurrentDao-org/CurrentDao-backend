import { Module } from '@nestjs/common';
import { RateLimitController } from './rate-limit.controller';
import { RateLimitService } from './rate-limit.service';
import { SlidingWindowStrategy } from './strategies/sliding-window.strategy';
import { TieredLimitsStrategy } from './strategies/tiered-limits.strategy';
import { DDoSProtectionUtil } from './utils/ddos-protection';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [CacheModule],
  controllers: [RateLimitController],
  providers: [
    RateLimitService,
    SlidingWindowStrategy,
    TieredLimitsStrategy,
    DDoSProtectionUtil,
  ],
  exports: [RateLimitService, SlidingWindowStrategy, TieredLimitsStrategy],
})
export class RateLimitModule {}

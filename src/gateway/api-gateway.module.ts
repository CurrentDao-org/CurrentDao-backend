import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AdvancedRateLimiterService } from './rate-limiting/advanced-rate-limiter.service';
import { RequestTransformerService } from './transformation/request-transformer.service';
import { GatewayAuthService } from './auth/gateway-auth.service';
import { GatewayMonitorService } from './monitoring/gateway-monitor.service';
import { CircuitBreakerService } from './circuit-breaker/circuit-breaker.service';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  providers: [
    AdvancedRateLimiterService,
    RequestTransformerService,
    GatewayAuthService,
    GatewayMonitorService,
    CircuitBreakerService,
  ],
  exports: [
    AdvancedRateLimiterService,
    RequestTransformerService,
    GatewayAuthService,
    GatewayMonitorService,
    CircuitBreakerService,
  ],
})
export class ApiGatewayModule {}

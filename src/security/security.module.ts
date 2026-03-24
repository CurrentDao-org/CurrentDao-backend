import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityHeadersService } from './headers/security-headers.service';
import { WafService } from './waf/waf.service';
import { DdosProtectionService } from './ddos/ddos-protection.service';
import { SecurityMonitorService } from './monitoring/security-monitor.service';
import { SecurityMiddleware } from './middleware/security.middleware';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useClass: DdosProtectionService,
    }),
  ],
  providers: [
    SecurityHeadersService,
    WafService,
    DdosProtectionService,
    SecurityMonitorService,
    SecurityMiddleware,
  ],
  exports: [SecurityHeadersService, WafService, DdosProtectionService, SecurityMonitorService],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}

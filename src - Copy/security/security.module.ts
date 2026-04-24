import { Module, Global, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityHeadersService } from './headers/security-headers.service';
import { WafService } from './waf/waf.service';
import { DdosProtectionService } from './ddos/ddos-protection.service';
import { SecurityMonitorService } from './monitoring/security-monitor.service';
import { SecurityMiddleware } from './middleware/security.middleware';
import { AnomalyDetectorService } from './detectors/anomaly.detector';
import { FraudDetectorService } from './detectors/fraud.detector';
import { SecurityAlertService } from './alerts/security-alert.service';
import { IncidentResponseService } from './response/incident-response.service';
import { SecurityEvent } from './entities/security-event.entity';
import { SecurityController } from './security.controller';

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useClass: DdosProtectionService,
    }),
    TypeOrmModule.forFeature([SecurityEvent]),
  ],
  controllers: [SecurityController],
  providers: [
    SecurityHeadersService,
    WafService,
    DdosProtectionService,
    SecurityMonitorService,
    SecurityMiddleware,
    AnomalyDetectorService,
    FraudDetectorService,
    SecurityAlertService,
    IncidentResponseService,
  ],
  exports: [
    SecurityHeadersService,
    WafService,
    DdosProtectionService,
    SecurityMonitorService,
    AnomalyDetectorService,
    FraudDetectorService,
    SecurityAlertService,
    IncidentResponseService,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityMiddleware).forRoutes('*');
  }
}

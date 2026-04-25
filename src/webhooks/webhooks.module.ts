import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { WebhookService } from './webhook.service';
import { WebhookController } from './webhook.controller';
import { Webhook } from './entities/webhook.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { HmacAuthService } from './auth/hmac.auth';
import { EventFilterService } from './filters/event.filter';
import { WebhookManagerService } from './management/webhook-manager.service';
import { DeliveryService } from './delivery/delivery-service';
import { WebhookAuthService } from './security/webhook-auth.service';
import { WebhookMonitorService } from './monitoring/webhook-monitor.service';
import { WebhookTesterService } from './testing/webhook-tester.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery]),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhookController],
  providers: [
    WebhookService,
    HmacAuthService,
    EventFilterService,
    WebhookManagerService,
    DeliveryService,
    WebhookAuthService,
    WebhookMonitorService,
    WebhookTesterService,
  ],
  exports: [
    WebhookService,
    HmacAuthService,
    EventFilterService,
    WebhookManagerService,
    DeliveryService,
    WebhookAuthService,
    WebhookMonitorService,
    WebhookTesterService,
  ],
})
export class WebhooksModule {}

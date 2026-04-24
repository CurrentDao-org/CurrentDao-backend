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

@Module({
  imports: [
    TypeOrmModule.forFeature([Webhook, WebhookDelivery]),
    HttpModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [WebhookController],
  providers: [WebhookService, HmacAuthService, EventFilterService],
  exports: [WebhookService, HmacAuthService, EventFilterService],
})
export class WebhooksModule {}

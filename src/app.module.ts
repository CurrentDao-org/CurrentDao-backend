import { AssetModule } from './assets/asset.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import stellarConfig from './config/stellar.config';
import { AppController } from './app.controller';
import { HealthController } from './health.controller';
import { AppService } from './app.service';
import { MarketForecastingModule } from './forecasting/market-forecasting.module';
import { RiskManagementModule } from './risk/risk-management.module';
import { CrossBorderModule } from './cross-border/cross-border.module';
import { SecurityModule } from './security/security.module';
import { ApmModule } from './apm/apm.module';
import { TracingModule } from './tracing/tracing.module';
import { ShardingModule } from './database/sharding/sharding.module';
import { ContractsModule } from './contracts/contracts.module';
import { ApiGatewayModule } from './gateway/api-gateway.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { SentimentModule } from './sentiment/sentiment.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { FraudDetectionModule } from './fraud/fraud-detection.module';
import { SyncModule } from './sync/sync.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [
    AssetModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, stellarConfig],
    }),
    SecurityModule,
    ApmModule,
    TracingModule,
    ShardingModule,
    MarketForecastingModule,
    RiskManagementModule,
    CrossBorderModule,
    ContractsModule,
    ApiGatewayModule,
    MonitoringModule,
    SentimentModule,
    FraudDetectionModule,
    SyncModule,
    LoggingModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    ResponseInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule { }

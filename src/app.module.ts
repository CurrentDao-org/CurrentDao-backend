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
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    AssetModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, stellarConfig],
    }),
    ConfigModule.forFeature(databaseConfig),
    ConfigModule.forFeature(stellarConfig),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY],
      useFactory: (config: ConfigType<typeof databaseConfig>) => ({
        ...config,
      }),
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
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    ResponseInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule { }

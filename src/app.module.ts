import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';

// Import the new high-frequency matching module
import { HighFrequencyMatchingModule } from './matching/high-frequency-matching.module';

// Import new settlement and auth modules
import { SettlementModule } from './settlement/settlement.module';
import { AuthModule } from './auth/auth.module';

// Import existing modules
import { PricingModule } from './pricing/pricing.module';
import { SecurityHeadersService } from './security/headers/security-headers.service';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { HealthController } from './health.controller';

// Import entities for the matching system
import { Order } from './matching/entities/order.entity';
import { Trade } from './matching/entities/trade.entity';
import { OrderBook } from './matching/entities/order-book.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'currentdao',
      entities: [Order, Trade, OrderBook],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    
    TypeOrmModule.forFeature([Order, Trade, OrderBook]),
    
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    
    ScheduleModule.forRoot(),
    
    TerminusModule,
    
    // Import the new high-frequency matching module
    HighFrequencyMatchingModule,
    
    // Import new settlement and auth modules
    SettlementModule,
    AuthModule,
    
    // Import existing pricing module for integration
    PricingModule,
    
    // Other existing modules can be imported here as needed
  ],
  controllers: [HealthController],
  providers: [
    SecurityHeadersService,
    ResponseInterceptor,
    HttpExceptionFilter,
  ],
  exports: [
    HighFrequencyMatchingModule,
    SecurityHeadersService,
    ResponseInterceptor,
    HttpExceptionFilter,
  ],
})
export class AppModule {}

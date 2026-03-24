import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrossBorderModule } from './cross-border/cross-border.module';
import { CrossBorderTransaction } from './cross-border/entities/cross-border-transaction.entity';
import { RiskManagementModule } from './risk/risk-management.module';
import { RiskDataEntity } from './risk/entities/risk-data.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [CrossBorderTransaction, RiskDataEntity],
      synchronize: true,
    }),
    CrossBorderModule,
    RiskManagementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

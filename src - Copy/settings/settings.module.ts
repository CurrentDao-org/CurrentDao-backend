import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketSetting } from './entities/market-setting.entity';
import { UserPreference } from './entities/user-preference.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketSetting, UserPreference]),
    LoggingModule,
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}

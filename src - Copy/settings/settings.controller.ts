import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import {
  CreateMarketSettingDto,
  UpdateMarketSettingDto,
} from './dto/market-setting.dto';
import {
  CreateUserPreferenceDto,
  UpdateUserPreferenceDto,
} from './dto/user-preference.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('market')
  async getMarketSettings(@Query('key') key = 'global') {
    return this.settingsService.getActiveMarketSettings(key);
  }

  @Post('market')
  async createMarketSettings(@Body() dto: CreateMarketSettingDto) {
    return this.settingsService.createInitialMarketSettings(dto);
  }

  @Put('market')
  async updateMarketSettings(
    @Body() dto: UpdateMarketSettingDto,
    @Query('updatedBy') updatedBy: string,
  ) {
    return this.settingsService.updateMarketSettings(dto, updatedBy);
  }

  @Put('market/rollback/:version')
  async rollbackMarketSettings(
    @Param('version') version: number,
    @Query('key') key = 'global',
    @Query('updatedBy') updatedBy: string,
  ) {
    return this.settingsService.rollbackMarketSettings(version, key, updatedBy);
  }

  @Get('user/:userId')
  async getUserPreferences(@Param('userId') userId: string) {
    return this.settingsService.getUserPreferences(userId);
  }

  @Post('user')
  async createUserPreferences(@Body() dto: CreateUserPreferenceDto) {
    return this.settingsService.createUserPreferences(dto);
  }

  @Put('user/:userId')
  async updateUserPreferences(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserPreferenceDto,
    @Query('updatedBy') updatedBy: string,
  ) {
    return this.settingsService.updateUserPreferences(userId, dto, updatedBy);
  }

  @Put('user/:userId/rollback/:version')
  async rollbackUserPreferences(
    @Param('userId') userId: string,
    @Param('version') version: number,
    @Query('updatedBy') updatedBy: string,
  ) {
    return this.settingsService.rollbackUserPreferences(
      userId,
      version,
      updatedBy,
    );
  }

  @Get('backup')
  async backupSettings() {
    const json = await this.settingsService.backupSettings();
    return { backup: json };
  }

  @Post('restore')
  async restoreSettings(
    @Body() body: { backup: string },
    @Query('restoredBy') restoredBy: string,
  ) {
    await this.settingsService.restoreSettings(body.backup, restoredBy);
    return { message: 'Settings restored successfully' };
  }
}

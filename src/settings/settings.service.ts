import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketSetting } from './entities/market-setting.entity';
import { UserPreference } from './entities/user-preference.entity';
import {
  CreateMarketSettingDto,
  UpdateMarketSettingDto,
} from './dto/market-setting.dto';
import {
  CreateUserPreferenceDto,
  UpdateUserPreferenceDto,
} from './dto/user-preference.dto';
import { LoggingService } from '../logging/logging.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private marketSettingsCache: MarketSetting | null = null;
  private userPreferencesCache = new Map<string, UserPreference>();

  constructor(
    @InjectRepository(MarketSetting)
    private marketSettingRepository: Repository<MarketSetting>,
    @InjectRepository(UserPreference)
    private userPreferenceRepository: Repository<UserPreference>,
    private loggingService: LoggingService,
  ) {}

  async getActiveMarketSettings(settingKey = 'global'): Promise<MarketSetting> {
    if (
      this.marketSettingsCache &&
      this.marketSettingsCache.settingKey === settingKey &&
      this.marketSettingsCache.isActive
    ) {
      return this.marketSettingsCache;
    }
    const setting = await this.marketSettingRepository.findOne({
      where: { settingKey, isActive: true },
    });
    if (!setting) {
      throw new NotFoundException('Active market settings not found');
    }
    this.marketSettingsCache = setting;
    return setting;
  }

  async updateMarketSettings(
    dto: UpdateMarketSettingDto,
    updatedBy: string,
  ): Promise<MarketSetting> {
    const current = await this.getActiveMarketSettings(
      dto.settingKey || 'global',
    );
    // Validate
    const min = dto.minTradeAmount ?? current.minTradeAmount;
    const max = dto.maxTradeAmount ?? current.maxTradeAmount;
    if (min >= max) {
      throw new BadRequestException(
        'minTradeAmount must be less than maxTradeAmount',
      );
    }
    // Deactivate current
    await this.marketSettingRepository.update(
      { id: current.id },
      { isActive: false, updatedBy, updatedAt: new Date() },
    );
    // Create new version
    const newVersion = current.version + 1;
    const newSetting = this.marketSettingRepository.create({
      ...current,
      ...dto,
      version: newVersion,
      isActive: true,
      updatedBy,
      createdBy: updatedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.marketSettingRepository.save(newSetting);
    this.marketSettingsCache = saved;
    // Log change
    await this.loggingService.info('Market settings updated', {
      oldVersion: current.version,
      newVersion,
      updatedBy,
      changes: dto,
    }, {
      context: { component: 'settings', function: 'updateMarketSettings' },
    });
    return saved;
  }

  async createInitialMarketSettings(
    dto: CreateMarketSettingDto,
  ): Promise<MarketSetting> {
    // Check if exists
    const existing = await this.marketSettingRepository.findOne({
      where: { settingKey: dto.settingKey || 'global', isActive: true },
    });
    if (existing) {
      throw new BadRequestException('Active market settings already exist');
    }
    if (dto.minTradeAmount >= dto.maxTradeAmount) {
      throw new BadRequestException(
        'minTradeAmount must be less than maxTradeAmount',
      );
    }
    const setting = this.marketSettingRepository.create(dto);
    const saved = await this.marketSettingRepository.save(setting);
    this.marketSettingsCache = saved;
    return saved;
  }

  async rollbackMarketSettings(
    version: number,
    settingKey = 'global',
    updatedBy: string,
  ): Promise<MarketSetting> {
    const target = await this.marketSettingRepository.findOne({
      where: { settingKey, version, isActive: false },
    });
    if (!target) {
      throw new NotFoundException(`Version ${version} not found for rollback`);
    }
    // Deactivate current
    await this.marketSettingRepository.update(
      { settingKey, isActive: true },
      { isActive: false, updatedBy, updatedAt: new Date() },
    );
    // Activate target
    await this.marketSettingRepository.update(
      { id: target.id },
      { isActive: true, updatedBy, updatedAt: new Date() },
    );
    this.marketSettingsCache = null; // clear cache
    const updated = await this.getActiveMarketSettings(settingKey);
    await this.loggingService.warn('Market settings rolled back', {
      rolledBackToVersion: version,
      updatedBy,
    }, {
      context: { component: 'settings', function: 'rollbackMarketSettings' },
    });
    return updated;
  }

  async getUserPreferences(userId: string): Promise<UserPreference> {
    if (this.userPreferencesCache.has(userId)) {
      const cached = this.userPreferencesCache.get(userId);
      if (cached.isActive) return cached;
    }
    const pref = await this.userPreferenceRepository.findOne({
      where: { userId, isActive: true },
    });
    if (!pref) {
      throw new NotFoundException('User preferences not found');
    }
    this.userPreferencesCache.set(userId, pref);
    return pref;
  }

  async updateUserPreferences(
    userId: string,
    dto: UpdateUserPreferenceDto,
    updatedBy: string,
  ): Promise<UserPreference> {
    const current = await this.getUserPreferences(userId);
    // Deactivate current
    await this.userPreferenceRepository.update(
      { id: current.id },
      { isActive: false, updatedBy, updatedAt: new Date() },
    );
    // Create new version
    const newVersion = current.version + 1;
    const newPref = this.userPreferenceRepository.create({
      ...current,
      ...dto,
      version: newVersion,
      isActive: true,
      updatedBy,
      createdBy: updatedBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.userPreferenceRepository.save(newPref);
    this.userPreferencesCache.set(userId, saved);
    await this.loggingService.info('User preferences updated', {
      userId,
      oldVersion: current.version,
      newVersion,
      updatedBy,
      changes: dto,
    }, {
      context: { component: 'settings', function: 'updateUserPreferences' },
    });
    return saved;
  }

  async createUserPreferences(
    dto: CreateUserPreferenceDto,
  ): Promise<UserPreference> {
    const existing = await this.userPreferenceRepository.findOne({
      where: { userId: dto.userId, isActive: true },
    });
    if (existing) {
      throw new BadRequestException('Active user preferences already exist');
    }
    const pref = this.userPreferenceRepository.create(dto);
    const saved = await this.userPreferenceRepository.save(pref);
    this.userPreferencesCache.set(dto.userId, saved);
    return saved;
  }

  async rollbackUserPreferences(
    userId: string,
    version: number,
    updatedBy: string,
  ): Promise<UserPreference> {
    const target = await this.userPreferenceRepository.findOne({
      where: { userId, version, isActive: false },
    });
    if (!target) {
      throw new NotFoundException(
        `Version ${version} not found for user ${userId}`,
      );
    }
    // Deactivate current
    await this.userPreferenceRepository.update(
      { userId, isActive: true },
      { isActive: false, updatedBy, updatedAt: new Date() },
    );
    // Activate target
    await this.userPreferenceRepository.update(
      { id: target.id },
      { isActive: true, updatedBy, updatedAt: new Date() },
    );
    this.userPreferencesCache.delete(userId);
    const updated = await this.getUserPreferences(userId);
    await this.loggingService.warn('User preferences rolled back', {
      userId,
      rolledBackToVersion: version,
      updatedBy,
    }, {
      context: { component: 'settings', function: 'rollbackUserPreferences' },
    });
    return updated;
  }

  async backupSettings(): Promise<string> {
    const marketSettings = await this.marketSettingRepository.find();
    const userPreferences = await this.userPreferenceRepository.find();
    const backup = {
      marketSettings,
      userPreferences,
      timestamp: new Date().toISOString(),
    };
    return JSON.stringify(backup, null, 2);
  }

  async restoreSettings(backupJson: string, restoredBy: string): Promise<void> {
    try {
      const backup = JSON.parse(backupJson);
      // For restore, deactivate all current active
      await this.marketSettingRepository.update(
        {},
        { isActive: false, updatedBy: restoredBy, updatedAt: new Date() },
      );
      await this.userPreferenceRepository.update(
        {},
        { isActive: false, updatedBy: restoredBy, updatedAt: new Date() },
      );
      // Insert restored as new versions
      for (const setting of backup.marketSettings) {
        const newSetting = {
          ...setting,
          id: undefined,
          version: setting.version + 1000, // to distinguish restored
          isActive: setting.isActive,
          createdBy: restoredBy,
          updatedBy: restoredBy,
          createdAt: new Date(setting.createdAt),
          updatedAt: new Date(),
        };
        await this.marketSettingRepository.save(newSetting);
      }
      for (const pref of backup.userPreferences) {
        const newPref = {
          ...pref,
          id: undefined,
          version: pref.version + 1000,
          isActive: pref.isActive,
          createdBy: restoredBy,
          updatedBy: restoredBy,
          createdAt: new Date(pref.createdAt),
          updatedAt: new Date(),
        };
        await this.userPreferenceRepository.save(newPref);
      }
      // Clear caches
      this.marketSettingsCache = null;
      this.userPreferencesCache.clear();
      await this.loggingService.info('Settings restored from backup', {
        restoredBy,
        timestamp: backup.timestamp,
      }, {
        context: { component: 'settings', function: 'restoreSettings' },
      });
      });
    } catch (error) {
      throw new BadRequestException('Invalid backup JSON');
    }
  }
}

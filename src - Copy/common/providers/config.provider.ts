/**
 * Config Provider
 *
 * Custom provider for configuration management with validation,
 * environment-specific overrides, and type safety.
 */

import {
  Provider,
  Injectable,
  OnModuleInit,
  Logger,
  Optional,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  validateSync,
  ValidationError,
} from 'class-validator';
import { plainToClass, Transform } from 'class-transformer';

/**
 * Environment enum
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production',
  TEST = 'test',
}

/**
 * Application configuration
 */
@Injectable()
export class AppConfig {
  @IsEnum(Environment)
  @Transform(({ value }) => value || Environment.DEVELOPMENT)
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10) || 3000)
  PORT: number = 3000;

  @IsString()
  @Transform(({ value }) => value || 'http://localhost:3000')
  APP_URL: string = 'http://localhost:3000';

  @IsString()
  @Transform(({ value }) => value || 'currentdao')
  APP_NAME: string = 'currentdao';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_SWAGGER: boolean = true;

  @IsString()
  @Transform(({ value }) => value || '*')
  CORS_ORIGIN: string = '*';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10) || 1000)
  CORS_MAX_AGE: number = 1000;
}

/**
 * Database configuration
 */
@Injectable()
export class DatabaseConfig {
  @IsString()
  @Transform(({ value }) => value || 'localhost')
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10) || 3306)
  DB_PORT: number = 3306;

  @IsString()
  @Transform(({ value }) => value || 'root')
  DB_USERNAME: string = 'root';

  @IsString()
  @Transform(({ value }) => value || '')
  DB_PASSWORD: string = '';

  @IsString()
  @Transform(({ value }) => value || 'currentdao')
  DB_DATABASE: string = 'currentdao';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10) || 10)
  DB_POOL_SIZE: number = 10;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DB_SYNCHRONIZE: boolean = true;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DB_LOGGING: boolean = false;
}

/**
 * External API configurations
 */
@Injectable()
export class ExternalApiConfig {
  @IsString()
  @Transform(({ value }) => value || '')
  WEATHER_API_KEY: string = '';

  @IsString()
  @Transform(({ value }) => value || '')
  WEATHER_API_URL: string = 'https://api.openweathermap.org/data/2.5';

  @IsString()
  @Transform(({ value }) => value || '')
  FRED_API_KEY: string = '';

  @IsString()
  @Transform(({ value }) => value || 'https://api.stlouisfed.org/fred')
  FRED_API_URL: string = 'https://api.stlouisfed.org/fred';

  @IsString()
  @Transform(({ value }) => value || '')
  ALPHA_VANTAGE_API_KEY: string = '';

  @IsString()
  @Transform(({ value }) => value || 'https://www.alphavantage.co/query')
  ALPHA_VANTAGE_API_URL: string = 'https://www.alphavantage.co/query';
}

/**
 * Configuration provider options
 */
export interface ConfigProviderOptions {
  /** Validate configuration */
  validate?: boolean;
  /** Throw on validation error */
  throwOnError?: boolean;
}

/**
 * Config provider token
 */
export const CONFIG_PROVIDER = 'CONFIG_PROVIDER';

/**
 * Custom configuration provider with validation
 */
@Injectable()
export class ConfigProvider implements OnModuleInit {
  private readonly logger = new Logger(ConfigProvider.name);
  private readonly options: ConfigProviderOptions;

  constructor(
    private readonly configService: ConfigService,
    @Optional() options?: ConfigProviderOptions,
  ) {
    this.options = {
      validate: true,
      throwOnError: true,
      ...options,
    };
  }

  /**
   * Initialize and validate configuration
   */
  async onModuleInit(): Promise<void> {
    if (this.options.validate) {
      await this.validateConfiguration();
    }
  }

  /**
   * Validate all configuration
   */
  async validateConfiguration(): Promise<void> {
    const errors: ValidationError[] = [];

    // Validate AppConfig
    const appConfigErrors = this.validateConfig(
      AppConfig,
      this.configService,
      'app',
    );
    errors.push(...appConfigErrors);

    // Validate DatabaseConfig
    const dbConfigErrors = this.validateConfig(
      DatabaseConfig,
      this.configService,
      'database',
    );
    errors.push(...dbConfigErrors);

    // Validate ExternalApiConfig
    const apiConfigErrors = this.validateConfig(
      ExternalApiConfig,
      this.configService,
      'api',
    );
    errors.push(...apiConfigErrors);

    if (errors.length > 0) {
      const errorMessage = errors
        .map(
          (e) =>
            `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`,
        )
        .join('; ');

      this.logger.error(`Configuration validation failed: ${errorMessage}`);

      if (this.options.throwOnError) {
        throw new Error(`Configuration validation failed: ${errorMessage}`);
      }
    } else {
      this.logger.log('Configuration validated successfully');
    }
  }

  /**
   * Validate specific config class
   */
  private validateConfig<T>(
    configClass: new () => T,
    configService: ConfigService,
    prefix: string,
  ): ValidationError[] {
    const config = plainToClass(configClass, {
      ...process.env,
    });

    const errors = validateSync(config, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.logger.warn(
        `${prefix} configuration has ${errors.length} validation errors`,
      );
    }

    return errors;
  }

  /**
   * Get typed configuration value
   */
  get<T>(key: string, defaultValue?: T): T {
    const value = this.configService.get<T>(key);
    return value ?? defaultValue;
  }

  /**
   * Get environment
   */
  getEnvironment(): string {
    return this.configService.get('NODE_ENV') || 'development';
  }

  /**
   * Check if in production
   */
  isProduction(): boolean {
    return this.getEnvironment() === Environment.PRODUCTION;
  }

  /**
   * Check if in development
   */
  isDevelopment(): boolean {
    return this.getEnvironment() === Environment.DEVELOPMENT;
  }

  /**
   * Check if in test
   */
  isTest(): boolean {
    return this.getEnvironment() === Environment.TEST;
  }

  /**
   * Get all config as object
   */
  getAll(): Record<string, any> {
    return process.env;
  }
}

/**
 * Factory function to create config provider
 */
export const createConfigProvider = (): Provider => {
  return {
    provide: CONFIG_PROVIDER,
    useFactory: (configService: ConfigService) =>
      new ConfigProvider(configService),
    inject: [ConfigService],
  };
};

/**
 * Inject config provider
 */
export const InjectConfigProvider = () => {
  return {
    provide: CONFIG_PROVIDER,
    useFactory: (configService: ConfigService) =>
      new ConfigProvider(configService),
    inject: [ConfigService],
  };
};

/**
 * Token for app configuration
 */
export const APP_CONFIG = 'APP_CONFIG';

/**
 * Token for database configuration
 */
export const DB_CONFIG = 'DB_CONFIG';

/**
 * Token for external API configuration
 */
export const API_CONFIG = 'API_CONFIG';

/**
 * Create app config provider
 */
export const createAppConfigProvider = () => {
  return {
    provide: APP_CONFIG,
    useFactory: () => new AppConfig(),
  };
};

/**
 * Create database config provider
 */
export const createDatabaseConfigProvider = () => {
  return {
    provide: DB_CONFIG,
    useFactory: () => new DatabaseConfig(),
  };
};

/**
 * Create external API config provider
 */
export const createApiConfigProvider = () => {
  return {
    provide: API_CONFIG,
    useFactory: () => new ExternalApiConfig(),
  };
};

/**
 * Configuration helper for typed access
 */
export const getConfig = (
  configService: ConfigService,
  key: string,
  defaultValue?: any,
): any => {
  return configService.get(key) ?? defaultValue;
};

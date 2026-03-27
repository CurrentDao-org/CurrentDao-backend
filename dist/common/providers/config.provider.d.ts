import { Provider, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare enum Environment {
    DEVELOPMENT = "development",
    STAGING = "staging",
    PRODUCTION = "production",
    TEST = "test"
}
export declare class AppConfig {
    NODE_ENV: Environment;
    PORT: number;
    APP_URL: string;
    APP_NAME: string;
    ENABLE_SWAGGER: boolean;
    CORS_ORIGIN: string;
    CORS_MAX_AGE: number;
}
export declare class DatabaseConfig {
    DB_HOST: string;
    DB_PORT: number;
    DB_USERNAME: string;
    DB_PASSWORD: string;
    DB_DATABASE: string;
    DB_POOL_SIZE: number;
    DB_SYNCHRONIZE: boolean;
    DB_LOGGING: boolean;
}
export declare class ExternalApiConfig {
    WEATHER_API_KEY: string;
    WEATHER_API_URL: string;
    FRED_API_KEY: string;
    FRED_API_URL: string;
    ALPHA_VANTAGE_API_KEY: string;
    ALPHA_VANTAGE_API_URL: string;
}
export interface ConfigProviderOptions {
    validate?: boolean;
    throwOnError?: boolean;
}
export declare const CONFIG_PROVIDER = "CONFIG_PROVIDER";
export declare class ConfigProvider implements OnModuleInit {
    private readonly configService;
    private readonly logger;
    private readonly options;
    constructor(configService: ConfigService, options?: ConfigProviderOptions);
    onModuleInit(): Promise<void>;
    validateConfiguration(): Promise<void>;
    private validateConfig;
    get<T>(key: string, defaultValue?: T): T;
    getEnvironment(): string;
    isProduction(): boolean;
    isDevelopment(): boolean;
    isTest(): boolean;
    getAll(): Record<string, any>;
}
export declare const createConfigProvider: () => Provider;
export declare const InjectConfigProvider: () => {
    provide: string;
    useFactory: (configService: ConfigService) => ConfigProvider;
    inject: (typeof ConfigService)[];
};
export declare const APP_CONFIG = "APP_CONFIG";
export declare const DB_CONFIG = "DB_CONFIG";
export declare const API_CONFIG = "API_CONFIG";
export declare const createAppConfigProvider: () => {
    provide: string;
    useFactory: () => AppConfig;
};
export declare const createDatabaseConfigProvider: () => {
    provide: string;
    useFactory: () => DatabaseConfig;
};
export declare const createApiConfigProvider: () => {
    provide: string;
    useFactory: () => ExternalApiConfig;
};
export declare const getConfig: (configService: ConfigService, key: string, defaultValue?: any) => any;

"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ConfigProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.createApiConfigProvider = exports.createDatabaseConfigProvider = exports.createAppConfigProvider = exports.API_CONFIG = exports.DB_CONFIG = exports.APP_CONFIG = exports.InjectConfigProvider = exports.createConfigProvider = exports.ConfigProvider = exports.CONFIG_PROVIDER = exports.ExternalApiConfig = exports.DatabaseConfig = exports.AppConfig = exports.Environment = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
var Environment;
(function (Environment) {
    Environment["DEVELOPMENT"] = "development";
    Environment["STAGING"] = "staging";
    Environment["PRODUCTION"] = "production";
    Environment["TEST"] = "test";
})(Environment || (exports.Environment = Environment = {}));
let AppConfig = class AppConfig {
    constructor() {
        this.NODE_ENV = Environment.DEVELOPMENT;
        this.PORT = 3000;
        this.APP_URL = 'http://localhost:3000';
        this.APP_NAME = 'currentdao';
        this.ENABLE_SWAGGER = true;
        this.CORS_ORIGIN = '*';
        this.CORS_MAX_AGE = 1000;
    }
};
exports.AppConfig = AppConfig;
__decorate([
    (0, class_validator_1.IsEnum)(Environment),
    (0, class_transformer_1.Transform)(({ value }) => value || Environment.DEVELOPMENT),
    __metadata("design:type", String)
], AppConfig.prototype, "NODE_ENV", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10) || 3000),
    __metadata("design:type", Number)
], AppConfig.prototype, "PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'http://localhost:3000'),
    __metadata("design:type", String)
], AppConfig.prototype, "APP_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'currentdao'),
    __metadata("design:type", String)
], AppConfig.prototype, "APP_NAME", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], AppConfig.prototype, "ENABLE_SWAGGER", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || '*'),
    __metadata("design:type", String)
], AppConfig.prototype, "CORS_ORIGIN", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10) || 1000),
    __metadata("design:type", Number)
], AppConfig.prototype, "CORS_MAX_AGE", void 0);
exports.AppConfig = AppConfig = __decorate([
    (0, common_1.Injectable)()
], AppConfig);
let DatabaseConfig = class DatabaseConfig {
    constructor() {
        this.DB_HOST = 'localhost';
        this.DB_PORT = 3306;
        this.DB_USERNAME = 'root';
        this.DB_PASSWORD = '';
        this.DB_DATABASE = 'currentdao';
        this.DB_POOL_SIZE = 10;
        this.DB_SYNCHRONIZE = true;
        this.DB_LOGGING = false;
    }
};
exports.DatabaseConfig = DatabaseConfig;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'localhost'),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "DB_HOST", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10) || 3306),
    __metadata("design:type", Number)
], DatabaseConfig.prototype, "DB_PORT", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'root'),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "DB_USERNAME", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || ''),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "DB_PASSWORD", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'currentdao'),
    __metadata("design:type", String)
], DatabaseConfig.prototype, "DB_DATABASE", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_transformer_1.Transform)(({ value }) => parseInt(value, 10) || 10),
    __metadata("design:type", Number)
], DatabaseConfig.prototype, "DB_POOL_SIZE", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], DatabaseConfig.prototype, "DB_SYNCHRONIZE", void 0);
__decorate([
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true'),
    __metadata("design:type", Boolean)
], DatabaseConfig.prototype, "DB_LOGGING", void 0);
exports.DatabaseConfig = DatabaseConfig = __decorate([
    (0, common_1.Injectable)()
], DatabaseConfig);
let ExternalApiConfig = class ExternalApiConfig {
    constructor() {
        this.WEATHER_API_KEY = '';
        this.WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';
        this.FRED_API_KEY = '';
        this.FRED_API_URL = 'https://api.stlouisfed.org/fred';
        this.ALPHA_VANTAGE_API_KEY = '';
        this.ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';
    }
};
exports.ExternalApiConfig = ExternalApiConfig;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || ''),
    __metadata("design:type", String)
], ExternalApiConfig.prototype, "WEATHER_API_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || ''),
    __metadata("design:type", String)
], ExternalApiConfig.prototype, "WEATHER_API_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || ''),
    __metadata("design:type", String)
], ExternalApiConfig.prototype, "FRED_API_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'https://api.stlouisfed.org/fred'),
    __metadata("design:type", String)
], ExternalApiConfig.prototype, "FRED_API_URL", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || ''),
    __metadata("design:type", String)
], ExternalApiConfig.prototype, "ALPHA_VANTAGE_API_KEY", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value || 'https://www.alphavantage.co/query'),
    __metadata("design:type", String)
], ExternalApiConfig.prototype, "ALPHA_VANTAGE_API_URL", void 0);
exports.ExternalApiConfig = ExternalApiConfig = __decorate([
    (0, common_1.Injectable)()
], ExternalApiConfig);
exports.CONFIG_PROVIDER = 'CONFIG_PROVIDER';
let ConfigProvider = ConfigProvider_1 = class ConfigProvider {
    constructor(configService, options) {
        this.configService = configService;
        this.logger = new common_1.Logger(ConfigProvider_1.name);
        this.options = {
            validate: true,
            throwOnError: true,
            ...options,
        };
    }
    async onModuleInit() {
        if (this.options.validate) {
            await this.validateConfiguration();
        }
    }
    async validateConfiguration() {
        const errors = [];
        const appConfigErrors = this.validateConfig(AppConfig, this.configService, 'app');
        errors.push(...appConfigErrors);
        const dbConfigErrors = this.validateConfig(DatabaseConfig, this.configService, 'database');
        errors.push(...dbConfigErrors);
        const apiConfigErrors = this.validateConfig(ExternalApiConfig, this.configService, 'api');
        errors.push(...apiConfigErrors);
        if (errors.length > 0) {
            const errorMessage = errors
                .map(e => `${e.property}: ${Object.values(e.constraints || {}).join(', ')}`)
                .join('; ');
            this.logger.error(`Configuration validation failed: ${errorMessage}`);
            if (this.options.throwOnError) {
                throw new Error(`Configuration validation failed: ${errorMessage}`);
            }
        }
        else {
            this.logger.log('Configuration validated successfully');
        }
    }
    validateConfig(configClass, configService, prefix) {
        const config = (0, class_transformer_1.plainToClass)(configClass, {
            ...process.env,
        });
        const errors = (0, class_validator_1.validateSync)(config, {
            whitelist: true,
            forbidNonWhitelisted: true,
        });
        if (errors.length > 0) {
            this.logger.warn(`${prefix} configuration has ${errors.length} validation errors`);
        }
        return errors;
    }
    get(key, defaultValue) {
        const value = this.configService.get(key);
        return value ?? defaultValue;
    }
    getEnvironment() {
        return this.configService.get('NODE_ENV') || 'development';
    }
    isProduction() {
        return this.getEnvironment() === Environment.PRODUCTION;
    }
    isDevelopment() {
        return this.getEnvironment() === Environment.DEVELOPMENT;
    }
    isTest() {
        return this.getEnvironment() === Environment.TEST;
    }
    getAll() {
        return process.env;
    }
};
exports.ConfigProvider = ConfigProvider;
exports.ConfigProvider = ConfigProvider = ConfigProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], ConfigProvider);
const createConfigProvider = () => {
    return {
        provide: exports.CONFIG_PROVIDER,
        useFactory: (configService) => new ConfigProvider(configService),
        inject: [config_1.ConfigService],
    };
};
exports.createConfigProvider = createConfigProvider;
const InjectConfigProvider = () => {
    return {
        provide: exports.CONFIG_PROVIDER,
        useFactory: (configService) => new ConfigProvider(configService),
        inject: [config_1.ConfigService],
    };
};
exports.InjectConfigProvider = InjectConfigProvider;
exports.APP_CONFIG = 'APP_CONFIG';
exports.DB_CONFIG = 'DB_CONFIG';
exports.API_CONFIG = 'API_CONFIG';
const createAppConfigProvider = () => {
    return {
        provide: exports.APP_CONFIG,
        useFactory: () => new AppConfig(),
    };
};
exports.createAppConfigProvider = createAppConfigProvider;
const createDatabaseConfigProvider = () => {
    return {
        provide: exports.DB_CONFIG,
        useFactory: () => new DatabaseConfig(),
    };
};
exports.createDatabaseConfigProvider = createDatabaseConfigProvider;
const createApiConfigProvider = () => {
    return {
        provide: exports.API_CONFIG,
        useFactory: () => new ExternalApiConfig(),
    };
};
exports.createApiConfigProvider = createApiConfigProvider;
const getConfig = (configService, key, defaultValue) => {
    return configService.get(key) ?? defaultValue;
};
exports.getConfig = getConfig;
//# sourceMappingURL=config.provider.js.map
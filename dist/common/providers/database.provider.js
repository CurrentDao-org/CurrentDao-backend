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
var DatabaseProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseConfigProvider = exports.DATABASE_CONFIG_TOKEN = exports.InjectDatabaseProvider = exports.createDatabaseProvider = exports.DatabaseProvider = exports.DATABASE_PROVIDER = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const DEFAULT_OPTIONS = {
    logQueries: process.env.NODE_ENV === 'development',
    poolSize: 10,
    connectionTimeout: 30000,
};
exports.DATABASE_PROVIDER = 'DATABASE_PROVIDER';
let DatabaseProvider = DatabaseProvider_1 = class DatabaseProvider {
    constructor(dataSource, options) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(DatabaseProvider_1.name);
        this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    async onModuleInit() {
        this.logger.log('Initializing database provider...');
        const isConnected = await this.isConnected();
        if (!isConnected) {
            this.logger.error('Database connection not established');
            throw new Error('Database connection failed');
        }
        this.logger.log('Database provider initialized successfully');
    }
    async onModuleDestroy() {
        this.logger.log('Closing database connections...');
        await this.dataSource.destroy();
        this.logger.log('Database connections closed');
    }
    getDataSource() {
        return this.dataSource;
    }
    getManager() {
        return this.dataSource.manager;
    }
    async isConnected() {
        try {
            await this.dataSource.query('SELECT 1');
            return true;
        }
        catch {
            return false;
        }
    }
    async getHealth() {
        const isConnected = await this.isConnected();
        return {
            connected: isConnected,
            type: this.dataSource.options.type,
            database: this.dataSource.options.database,
            timestamp: new Date().toISOString(),
        };
    }
    async executeTransaction(callback) {
        return this.dataSource.transaction(callback);
    }
    async query(sql, params) {
        return this.dataSource.query(sql, params);
    }
};
exports.DatabaseProvider = DatabaseProvider;
exports.DatabaseProvider = DatabaseProvider = DatabaseProvider_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource, Object])
], DatabaseProvider);
const createDatabaseProvider = (dataSource, options) => {
    return {
        provide: exports.DATABASE_PROVIDER,
        useFactory: () => new DatabaseProvider(dataSource, options),
        inject: [typeorm_1.InjectDataSource],
    };
};
exports.createDatabaseProvider = createDatabaseProvider;
const InjectDatabaseProvider = () => {
    return {
        provide: exports.DATABASE_PROVIDER,
        useFactory: (dataSource) => new DatabaseProvider(dataSource),
        inject: [typeorm_1.InjectDataSource],
    };
};
exports.InjectDatabaseProvider = InjectDatabaseProvider;
exports.DATABASE_CONFIG_TOKEN = 'DATABASE_CONFIG';
const createDatabaseConfigProvider = () => {
    return {
        provide: exports.DATABASE_CONFIG_TOKEN,
        useFactory: () => ({
            type: 'mysql',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3306', 10),
            username: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'currentdao',
            synchronize: process.env.NODE_ENV !== 'production',
            logging: process.env.NODE_ENV === 'development',
            autoLoadEntities: true,
            poolSize: 10,
        }),
    };
};
exports.createDatabaseConfigProvider = createDatabaseConfigProvider;
//# sourceMappingURL=database.provider.js.map
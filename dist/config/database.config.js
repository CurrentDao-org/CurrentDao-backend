"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
const forecast_data_entity_1 = require("../forecasting/entities/forecast-data.entity");
exports.default = (0, config_1.registerAs)('database', () => ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'currentdao',
    entities: [forecast_data_entity_1.ForecastData],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
    autoLoadEntities: true,
}));
//# sourceMappingURL=database.config.js.map